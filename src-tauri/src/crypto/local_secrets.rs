//! Local-at-rest encryption for secrets stored in SQLite (SFTP passwords/keys).
//!
//! Device key is a 256-bit random key on disk under the app data dir (OS sandbox).
//! Secrets are sealed with AES-256-GCM + purpose-bound AAD — never plaintext or bare base64.

use crate::crypto::aead::{open, random_key, seal, wipe_key, KEY_LEN};
use crate::crypto::keys::hkdf_expand;
use crate::error::{AppError, AppResult};
use base64::{engine::general_purpose::STANDARD as B64, Engine};
use std::fs;
use std::path::{Path, PathBuf};
use zeroize::Zeroize;

const DEVICE_KEY_FILE: &str = "device_master.key";
const MAGIC_PREFIX: &str = "DTSEC1:";

fn device_key_path(data_dir: &Path) -> PathBuf {
    data_dir.join(DEVICE_KEY_FILE)
}

fn load_or_create_device_key(data_dir: &Path) -> AppResult<[u8; KEY_LEN]> {
    fs::create_dir_all(data_dir)?;
    let path = device_key_path(data_dir);
    if path.exists() {
        let bytes = fs::read(&path).map_err(AppError::io)?;
        if bytes.len() != KEY_LEN {
            return Err(AppError::crypto("corrupt device key"));
        }
        let mut k = [0u8; KEY_LEN];
        k.copy_from_slice(&bytes);
        return Ok(k);
    }
    let k = random_key()?;
    // Best-effort restrictive perms on Unix
    fs::write(&path, k).map_err(AppError::io)?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = fs::set_permissions(&path, fs::Permissions::from_mode(0o600));
    }
    Ok(k)
}

fn purpose_key(device_key: &[u8; KEY_LEN], purpose: &str) -> AppResult<[u8; KEY_LEN]> {
    let info = format!("doctool/v2/local-secret|{purpose}");
    hkdf_expand(device_key, info.as_bytes())
}

fn aad(purpose: &str) -> Vec<u8> {
    format!("doctool-local-secret-v1|{purpose}").into_bytes()
}

/// Seal a secret string for storage in SQLite. Output is `DTSEC1:` + base64(blob).
pub fn seal_secret(data_dir: &Path, purpose: &str, plaintext: &str) -> AppResult<String> {
    let mut device = load_or_create_device_key(data_dir)?;
    let mut key = purpose_key(&device, purpose)?;
    wipe_key(&mut device);
    let (nonce, ct) = seal(&key, plaintext.as_bytes(), &aad(purpose))?;
    wipe_key(&mut key);
    // blob: nonce(12) || ct
    let mut blob = Vec::with_capacity(nonce.len() + ct.len());
    blob.extend_from_slice(&nonce);
    blob.extend_from_slice(&ct);
    Ok(format!("{MAGIC_PREFIX}{}", B64.encode(&blob)))
}

/// Open a sealed secret. Also accepts legacy bare base64 (pre-encryption) for migration.
pub fn open_secret(data_dir: &Path, purpose: &str, stored: &str) -> AppResult<String> {
    if let Some(rest) = stored.strip_prefix(MAGIC_PREFIX) {
        let blob = B64
            .decode(rest.as_bytes())
            .map_err(|_| AppError::crypto("bad secret encoding"))?;
        if blob.len() < 12 + 16 {
            return Err(AppError::crypto("secret blob too short"));
        }
        let (nonce, ct) = blob.split_at(12);
        let mut device = load_or_create_device_key(data_dir)?;
        let mut key = purpose_key(&device, purpose)?;
        wipe_key(&mut device);
        let plain = open(&key, nonce, ct, &aad(purpose))?;
        wipe_key(&mut key);
        String::from_utf8(plain).map_err(|_| AppError::crypto("secret utf8"))
    } else {
        // Legacy: raw base64 of plaintext — migrate caller should re-seal
        let bytes = B64
            .decode(stored.as_bytes())
            .map_err(|_| AppError::crypto("legacy secret decode"))?;
        String::from_utf8(bytes).map_err(|_| AppError::crypto("legacy secret utf8"))
    }
}

pub fn is_sealed(stored: &str) -> bool {
    stored.starts_with(MAGIC_PREFIX)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    #[test]
    fn seal_open_roundtrip() {
        let dir = env::temp_dir().join(format!("doctool-sec-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        let sealed = seal_secret(&dir, "sftp.password", "s3cret-value!").unwrap();
        assert!(is_sealed(&sealed));
        let open = open_secret(&dir, "sftp.password", &sealed).unwrap();
        assert_eq!(open, "s3cret-value!");
        // wrong purpose fails
        assert!(open_secret(&dir, "sftp.key", &sealed).is_err());
        let _ = fs::remove_dir_all(&dir);
    }
}
