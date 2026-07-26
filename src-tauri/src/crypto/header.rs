//! Vault header + object blob format (v2 — strongest defaults).
//!
//! Local vault objects and Drive blobs use the **same** encrypt_blob format so
//! cloud storage never sees plaintext.

use crate::crypto::aead::{
    key_from_slice, open, random_bytes, random_key, seal, wipe_key, KEY_LEN, NONCE_LEN,
};
use crate::crypto::keys::{
    generate_recovery_key, parse_recovery_key, password_wrap_key, recovery_wrap_key,
    validate_password_strength, MasterKey, ARGON2_M_KIB, ARGON2_P, ARGON2_T, SALT_LEN,
};
use crate::error::{AppError, AppResult};
use base64::{engine::general_purpose::STANDARD as B64, Engine};
use serde::{Deserialize, Serialize};
use zeroize::Zeroize;

pub const MAGIC: &str = "DOCTOOL_VAULT";
pub const FORMAT_VERSION: u32 = 2;
pub const AAD_CONTEXT: &str = "doctool-vault-v2";
pub const VERIFY_PLAIN: &[u8] = b"DOCTOOL_VAULT_OK_V2";

// Blob object version
const BLOB_VERSION: u8 = 2;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultHeader {
    pub magic: String,
    pub format_version: u32,
    pub created_at: String,
    pub kdf: KdfParams,
    pub wrap: WrapParams,
    pub verify: VerifyBlob,
    pub aad_context: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KdfParams {
    pub alg: String,
    pub salt_b64: String,
    pub m_kib: u32,
    pub t: u32,
    pub p: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WrapParams {
    pub alg: String,
    /// How wrap keys are derived: "hkdf-sha256+argon2id" (v2) or legacy "direct" (v1)
    #[serde(default = "default_kdf_mode")]
    pub kdf_mode: String,
    pub mk_wrap_password_b64: String,
    pub mk_wrap_password_nonce_b64: String,
    pub mk_wrap_recovery_b64: String,
    pub mk_wrap_recovery_nonce_b64: String,
}

fn default_kdf_mode() -> String {
    "hkdf-sha256+argon2id".into()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerifyBlob {
    pub alg: String,
    pub nonce_b64: String,
    pub ciphertext_b64: String,
}

pub struct CreatedVault {
    pub header: VaultHeader,
    pub master_key: MasterKey,
    pub recovery_key_display: String,
}

fn aad_header() -> Vec<u8> {
    format!("{MAGIC}|{FORMAT_VERSION}|{AAD_CONTEXT}|header").into_bytes()
}

fn aad_wrap_pw() -> Vec<u8> {
    format!("{MAGIC}|{FORMAT_VERSION}|{AAD_CONTEXT}|wrap-password").into_bytes()
}

fn aad_wrap_rk() -> Vec<u8> {
    format!("{MAGIC}|{FORMAT_VERSION}|{AAD_CONTEXT}|wrap-recovery").into_bytes()
}

fn aad_verify() -> Vec<u8> {
    format!("{MAGIC}|{FORMAT_VERSION}|{AAD_CONTEXT}|verify").into_bytes()
}

fn aad_blob(purpose: &str) -> Vec<u8> {
    format!("{MAGIC}|{FORMAT_VERSION}|{AAD_CONTEXT}|blob|{purpose}").into_bytes()
}

pub fn create_vault(password: &str) -> AppResult<CreatedVault> {
    validate_password_strength(password)?;
    let mk = MasterKey::random()?;
    let salt = random_bytes(SALT_LEN)?;

    let mut pw_key = password_wrap_key(password, &salt, ARGON2_M_KIB, ARGON2_T, ARGON2_P)?;
    let (pw_nonce, pw_ct) = seal(&pw_key, &mk.0, &aad_wrap_pw())?;
    wipe_key(&mut pw_key);

    let (recovery_display, recovery_raw) = generate_recovery_key()?;
    let mut rk_key = recovery_wrap_key(&recovery_raw)?;
    let (rk_nonce, rk_ct) = seal(&rk_key, &mk.0, &aad_wrap_rk())?;
    wipe_key(&mut rk_key);
    // recovery_raw zeroized by dropping array — explicit:
    let mut recovery_raw = recovery_raw;
    recovery_raw.zeroize();

    let (v_nonce, v_ct) = seal(&mk.0, VERIFY_PLAIN, &aad_verify())?;

    let header = VaultHeader {
        magic: MAGIC.into(),
        format_version: FORMAT_VERSION,
        created_at: chrono::Utc::now().to_rfc3339(),
        kdf: KdfParams {
            alg: "argon2id".into(),
            salt_b64: B64.encode(&salt),
            m_kib: ARGON2_M_KIB,
            t: ARGON2_T,
            p: ARGON2_P,
        },
        wrap: WrapParams {
            alg: "aes-256-gcm".into(),
            kdf_mode: "hkdf-sha256+argon2id".into(),
            mk_wrap_password_b64: B64.encode(&pw_ct),
            mk_wrap_password_nonce_b64: B64.encode(&pw_nonce),
            mk_wrap_recovery_b64: B64.encode(&rk_ct),
            mk_wrap_recovery_nonce_b64: B64.encode(&rk_nonce),
        },
        verify: VerifyBlob {
            alg: "aes-256-gcm".into(),
            nonce_b64: B64.encode(&v_nonce),
            ciphertext_b64: B64.encode(&v_ct),
        },
        aad_context: AAD_CONTEXT.into(),
    };

    // Bind header existence (aad_header used for future sealed headers)
    let _ = aad_header();

    Ok(CreatedVault {
        header,
        master_key: mk,
        recovery_key_display: recovery_display,
    })
}


/// Re-wrap master key under a new password (recovery wrap unchanged).
pub fn rewrap_password(header: &VaultHeader, master_key: &MasterKey, new_password: &str) -> AppResult<VaultHeader> {
    validate_password_strength(new_password)?;
    let salt = B64
        .decode(header.kdf.salt_b64.as_bytes())
        .map_err(|_| AppError::crypto("bad salt"))?;
    let mut pw_key = password_wrap_key(
        new_password,
        &salt,
        header.kdf.m_kib,
        header.kdf.t,
        header.kdf.p,
    )?;
    let (pw_nonce, pw_ct) = seal(&pw_key, &master_key.0, &aad_wrap_pw())?;
    wipe_key(&mut pw_key);
    let mut next = header.clone();
    next.wrap.mk_wrap_password_b64 = B64.encode(&pw_ct);
    next.wrap.mk_wrap_password_nonce_b64 = B64.encode(&pw_nonce);
    Ok(next)
}

fn is_v1(header: &VaultHeader) -> bool {
    header.format_version <= 1
        || header.wrap.kdf_mode == "direct"
        || header.aad_context.contains("v1")
}

pub fn unlock_with_password(header: &VaultHeader, password: &str) -> AppResult<MasterKey> {
    if header.magic != MAGIC && header.magic != "DOCTOOL_VAULT" {
        return Err(AppError::crypto("invalid vault magic"));
    }
    let salt = B64
        .decode(header.kdf.salt_b64.as_bytes())
        .map_err(|_| AppError::crypto("bad salt"))?;
    let mut pw_key = if is_v1(header) {
        // Legacy v1: Argon2 output used directly as AES key
        crate::crypto::keys::derive_password_raw(
            password,
            &salt,
            header.kdf.m_kib,
            header.kdf.t,
            header.kdf.p,
        )?
    } else {
        password_wrap_key(
            password,
            &salt,
            header.kdf.m_kib,
            header.kdf.t,
            header.kdf.p,
        )?
    };
    let nonce = B64
        .decode(header.wrap.mk_wrap_password_nonce_b64.as_bytes())
        .map_err(|_| AppError::crypto("bad nonce"))?;
    let ct = B64
        .decode(header.wrap.mk_wrap_password_b64.as_bytes())
        .map_err(|_| AppError::crypto("bad wrap"))?;
    let aad = if is_v1(header) {
        b"doctool-vault-v1".to_vec()
    } else {
        aad_wrap_pw()
    };
    let mk_bytes = open(&pw_key, &nonce, &ct, &aad)?;
    wipe_key(&mut pw_key);
    let mk = MasterKey::from_bytes(key_from_slice(&mk_bytes)?);
    verify_mk(header, &mk)?;
    Ok(mk)
}

pub fn unlock_with_recovery(header: &VaultHeader, recovery_key: &str) -> AppResult<MasterKey> {
    let mut recovery_raw = parse_recovery_key(recovery_key)?;
    let mut rk_key = if is_v1(header) {
        recovery_raw
    } else {
        recovery_wrap_key(&recovery_raw)?
    };
    let nonce = B64
        .decode(header.wrap.mk_wrap_recovery_nonce_b64.as_bytes())
        .map_err(|_| AppError::crypto("bad nonce"))?;
    let ct = B64
        .decode(header.wrap.mk_wrap_recovery_b64.as_bytes())
        .map_err(|_| AppError::crypto("bad wrap"))?;
    let aad = if is_v1(header) {
        b"doctool-vault-v1".to_vec()
    } else {
        aad_wrap_rk()
    };
    let mk_bytes = open(&rk_key, &nonce, &ct, &aad)?;
    wipe_key(&mut rk_key);
    recovery_raw.zeroize();
    let mk = MasterKey::from_bytes(key_from_slice(&mk_bytes)?);
    verify_mk(header, &mk)?;
    Ok(mk)
}

fn verify_mk(header: &VaultHeader, mk: &MasterKey) -> AppResult<()> {
    let nonce = B64
        .decode(header.verify.nonce_b64.as_bytes())
        .map_err(|_| AppError::crypto("bad verify nonce"))?;
    let ct = B64
        .decode(header.verify.ciphertext_b64.as_bytes())
        .map_err(|_| AppError::crypto("bad verify ct"))?;
    let (aad, expected): (Vec<u8>, &[u8]) = if is_v1(header) {
        (b"doctool-vault-v1".to_vec(), b"DOCTOOL_VAULT_OK")
    } else {
        (aad_verify(), VERIFY_PLAIN)
    };
    let plain = open(&mk.0, &nonce, &ct, &aad)?;
    if plain.as_slice() != expected {
        return Err(AppError::crypto("vault verification failed"));
    }
    Ok(())
}

/// Encrypt arbitrary payload for local vault store **or** Drive upload (identical format).
///
/// Layout v2:
/// ```text
/// version:u8=2 | purpose_len:u8 | purpose | n_wrap:12 | wrap_len:u32be | wrap | n_data:12 | ct||tag
/// ```
/// Per-object random DEK; DEK wrapped under MK with purpose-bound AAD.
pub fn encrypt_blob(mk: &MasterKey, plaintext: &[u8]) -> AppResult<Vec<u8>> {
    encrypt_blob_purpose(mk, plaintext, "object")
}

pub fn encrypt_blob_purpose(mk: &MasterKey, plaintext: &[u8], purpose: &str) -> AppResult<Vec<u8>> {
    let mut dek = random_key()?;
    let aad_data = aad_blob(purpose);
    let aad_wrap = aad_blob(&format!("dek-wrap|{purpose}"));
    let (n1, ct) = seal(&dek, plaintext, &aad_data)?;
    let (n2, wrapped) = seal(&mk.0, &dek, &aad_wrap)?;
    wipe_key(&mut dek);

    let purpose_bytes = purpose.as_bytes();
    if purpose_bytes.len() > 255 {
        return Err(AppError::crypto("purpose too long"));
    }
    let mut out = Vec::with_capacity(1 + 1 + purpose_bytes.len() + NONCE_LEN + 4 + wrapped.len() + NONCE_LEN + ct.len());
    out.push(BLOB_VERSION);
    out.push(purpose_bytes.len() as u8);
    out.extend_from_slice(purpose_bytes);
    out.extend_from_slice(&n2);
    out.extend_from_slice(&(wrapped.len() as u32).to_be_bytes());
    out.extend_from_slice(&wrapped);
    out.extend_from_slice(&n1);
    out.extend_from_slice(&ct);
    Ok(out)
}

pub fn decrypt_blob(mk: &MasterKey, blob: &[u8]) -> AppResult<Vec<u8>> {
    if blob.is_empty() {
        return Err(AppError::crypto("empty blob"));
    }
    // v1 legacy: version | n2_len | n2 | wrap_len | wrap | n1_len | n1 | ct
    if blob[0] == 1 {
        return decrypt_blob_v1(mk, blob);
    }
    if blob[0] != BLOB_VERSION {
        return Err(AppError::crypto("unsupported blob version"));
    }
    let mut i = 1usize;
    if i >= blob.len() {
        return Err(AppError::crypto("truncated blob"));
    }
    let plen = blob[i] as usize;
    i += 1;
    if i + plen + NONCE_LEN + 4 + NONCE_LEN > blob.len() {
        return Err(AppError::crypto("truncated blob"));
    }
    let purpose = std::str::from_utf8(&blob[i..i + plen]).map_err(|_| AppError::crypto("bad purpose"))?;
    i += plen;
    let n2 = &blob[i..i + NONCE_LEN];
    i += NONCE_LEN;
    let wl = u32::from_be_bytes(blob[i..i + 4].try_into().unwrap()) as usize;
    i += 4;
    if i + wl + NONCE_LEN > blob.len() {
        return Err(AppError::crypto("truncated blob"));
    }
    let wrapped = &blob[i..i + wl];
    i += wl;
    let n1 = &blob[i..i + NONCE_LEN];
    i += NONCE_LEN;
    let ct = &blob[i..];

    let aad_wrap = aad_blob(&format!("dek-wrap|{purpose}"));
    let aad_data = aad_blob(purpose);
    let mut dek_bytes = open(&mk.0, n2, wrapped, &aad_wrap)?;
    let mut dek = key_from_slice(&dek_bytes)?;
    dek_bytes.zeroize();
    let plain = open(&dek, n1, ct, &aad_data)?;
    wipe_key(&mut dek);
    Ok(plain)
}

fn decrypt_blob_v1(mk: &MasterKey, blob: &[u8]) -> AppResult<Vec<u8>> {
    if blob.len() < 20 || blob[0] != 1 {
        return Err(AppError::crypto("bad v1 blob"));
    }
    let mut i = 1usize;
    let n2_len = blob[i] as usize;
    i += 1;
    let n2 = &blob[i..i + n2_len];
    i += n2_len;
    let wl = u32::from_be_bytes(blob[i..i + 4].try_into().unwrap()) as usize;
    i += 4;
    let wrapped = &blob[i..i + wl];
    i += wl;
    let n1_len = blob[i] as usize;
    i += 1;
    let n1 = &blob[i..i + n1_len];
    i += n1_len;
    let ct = &blob[i..];
    let aad = b"doctool-vault-v1";
    let mut dek_bytes = open(&mk.0, n2, wrapped, aad)?;
    let mut dek = key_from_slice(&dek_bytes)?;
    dek_bytes.zeroize();
    let plain = open(&dek, n1, ct, aad)?;
    wipe_key(&mut dek);
    Ok(plain)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn create_unlock_password_and_recovery() {
        let created = create_vault("CorrectHorseBattery9").unwrap();
        let h = &created.header;
        assert_eq!(h.format_version, 2);
        assert_eq!(h.kdf.m_kib, ARGON2_M_KIB);
        let mk1 = unlock_with_password(h, "CorrectHorseBattery9").unwrap();
        assert_eq!(mk1.0, created.master_key.0);
        let mk2 = unlock_with_recovery(h, &created.recovery_key_display).unwrap();
        assert_eq!(mk2.0, created.master_key.0);
        assert!(unlock_with_password(h, "WrongPassword99").is_err());
    }

    #[test]
    fn blob_roundtrip_and_purpose() {
        let mk = MasterKey::random().unwrap();
        let data = b"hello vault notes strongest";
        let enc = encrypt_blob(&mk, data).unwrap();
        assert_eq!(enc[0], 2);
        let dec = decrypt_blob(&mk, &enc).unwrap();
        assert_eq!(dec, data);
        // Tamper
        let mut bad = enc.clone();
        let last = bad.len() - 1;
        bad[last] ^= 0xff;
        assert!(decrypt_blob(&mk, &bad).is_err());
    }
}
