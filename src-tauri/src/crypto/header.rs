use crate::crypto::aead::{open, random_bytes, seal};
use crate::crypto::keys::{derive_password_key, generate_recovery_key, parse_recovery_key, MasterKey};
use crate::error::{AppError, AppResult};
use base64::{engine::general_purpose::STANDARD as B64, Engine};
use serde::{Deserialize, Serialize};

pub const AAD_CONTEXT: &[u8] = b"doctool-vault-v1";
pub const VERIFY_PLAIN: &[u8] = b"DOCTOOL_VAULT_OK";

// Mobile-friendly Argon2 defaults (can raise later)
pub const DEFAULT_M_KIB: u32 = 32 * 1024; // 32 MiB
pub const DEFAULT_T: u32 = 2;
pub const DEFAULT_P: u32 = 1;

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
    pub mk_wrap_password_b64: String,
    pub mk_wrap_password_nonce_b64: String,
    pub mk_wrap_recovery_b64: String,
    pub mk_wrap_recovery_nonce_b64: String,
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

pub fn create_vault(password: &str) -> AppResult<CreatedVault> {
    if password.len() < 8 {
        return Err(AppError::validation("password must be at least 8 characters"));
    }
    let mk = MasterKey::random();
    let salt = random_bytes(16);
    let pw_key = derive_password_key(password, &salt, DEFAULT_M_KIB, DEFAULT_T, DEFAULT_P)?;
    let (pw_nonce, pw_ct) = seal(&pw_key, &mk.0, AAD_CONTEXT)?;

    let (recovery_display, recovery_raw) = generate_recovery_key();
    let (rk_nonce, rk_ct) = seal(&recovery_raw, &mk.0, AAD_CONTEXT)?;

    let (v_nonce, v_ct) = seal(&mk.0, VERIFY_PLAIN, AAD_CONTEXT)?;

    let header = VaultHeader {
        magic: "DOCTOOL_VAULT".into(),
        format_version: 1,
        created_at: chrono::Utc::now().to_rfc3339(),
        kdf: KdfParams {
            alg: "argon2id".into(),
            salt_b64: B64.encode(&salt),
            m_kib: DEFAULT_M_KIB,
            t: DEFAULT_T,
            p: DEFAULT_P,
        },
        wrap: WrapParams {
            alg: "aes-256-gcm".into(),
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
        aad_context: "doctool-vault-v1".into(),
    };

    Ok(CreatedVault {
        header,
        master_key: mk,
        recovery_key_display: recovery_display,
    })
}

pub fn unlock_with_password(header: &VaultHeader, password: &str) -> AppResult<MasterKey> {
    let salt = B64
        .decode(header.kdf.salt_b64.as_bytes())
        .map_err(|_| AppError::crypto("bad salt"))?;
    let pw_key = derive_password_key(
        password,
        &salt,
        header.kdf.m_kib,
        header.kdf.t,
        header.kdf.p,
    )?;
    let nonce = B64
        .decode(header.wrap.mk_wrap_password_nonce_b64.as_bytes())
        .map_err(|_| AppError::crypto("bad nonce"))?;
    let ct = B64
        .decode(header.wrap.mk_wrap_password_b64.as_bytes())
        .map_err(|_| AppError::crypto("bad wrap"))?;
    let mk_bytes = open(&pw_key, &nonce, &ct, AAD_CONTEXT)?;
    let mk = MasterKey::from_bytes(key32(&mk_bytes)?);
    verify_mk(header, &mk)?;
    Ok(mk)
}

pub fn unlock_with_recovery(header: &VaultHeader, recovery_key: &str) -> AppResult<MasterKey> {
    let rk = parse_recovery_key(recovery_key)?;
    let nonce = B64
        .decode(header.wrap.mk_wrap_recovery_nonce_b64.as_bytes())
        .map_err(|_| AppError::crypto("bad nonce"))?;
    let ct = B64
        .decode(header.wrap.mk_wrap_recovery_b64.as_bytes())
        .map_err(|_| AppError::crypto("bad wrap"))?;
    let mk_bytes = open(&rk, &nonce, &ct, AAD_CONTEXT)?;
    let mk = MasterKey::from_bytes(key32(&mk_bytes)?);
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
    let plain = open(&mk.0, &nonce, &ct, AAD_CONTEXT)?;
    if plain != VERIFY_PLAIN {
        return Err(AppError::crypto("vault verification failed"));
    }
    Ok(())
}

fn key32(b: &[u8]) -> AppResult<[u8; 32]> {
    if b.len() != 32 {
        return Err(AppError::crypto("bad key length"));
    }
    let mut a = [0u8; 32];
    a.copy_from_slice(b);
    Ok(a)
}

pub fn encrypt_blob(mk: &MasterKey, plaintext: &[u8]) -> AppResult<Vec<u8>> {
    let dek = {
        let mut d = [0u8; 32];
        rand::RngCore::fill_bytes(&mut rand::thread_rng(), &mut d);
        d
    };
    let (n1, ct) = seal(&dek, plaintext, AAD_CONTEXT)?;
    let (n2, wrapped) = seal(&mk.0, &dek, AAD_CONTEXT)?;
    // format: version(1) | n2_len(1)=12 | n2 | wrap_len(u32be) | wrap | n1 | ct
    let mut out = Vec::new();
    out.push(1u8);
    out.push(12u8);
    out.extend_from_slice(&n2);
    let wl = (wrapped.len() as u32).to_be_bytes();
    out.extend_from_slice(&wl);
    out.extend_from_slice(&wrapped);
    out.push(12u8);
    out.extend_from_slice(&n1);
    out.extend_from_slice(&ct);
    Ok(out)
}

pub fn decrypt_blob(mk: &MasterKey, blob: &[u8]) -> AppResult<Vec<u8>> {
    if blob.len() < 20 || blob[0] != 1 {
        return Err(AppError::crypto("bad blob"));
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
    let dek_bytes = open(&mk.0, n2, wrapped, AAD_CONTEXT)?;
    let dek = key32(&dek_bytes)?;
    open(&dek, n1, ct, AAD_CONTEXT)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn create_unlock_password_and_recovery() {
        let created = create_vault("test-password-ok").unwrap();
        let h = &created.header;
        let mk1 = unlock_with_password(h, "test-password-ok").unwrap();
        assert_eq!(mk1.0, created.master_key.0);
        let mk2 = unlock_with_recovery(h, &created.recovery_key_display).unwrap();
        assert_eq!(mk2.0, created.master_key.0);
        assert!(unlock_with_password(h, "wrong-password").is_err());
    }

    #[test]
    fn blob_roundtrip() {
        let mk = MasterKey::random();
        let data = b"hello vault notes";
        let enc = encrypt_blob(&mk, data).unwrap();
        let dec = decrypt_blob(&mk, &enc).unwrap();
        assert_eq!(dec, data);
    }
}
