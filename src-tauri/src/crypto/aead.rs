//! AES-256-GCM authenticated encryption (NIST SP 800-38D).
//!
//! - 256-bit keys only
//! - 96-bit random nonces (never reused under a key)
//! - AAD always required for domain separation
//! - Ciphertext includes GCM tag (integrity + authenticity)

use crate::error::{AppError, AppResult};
use aes_gcm::aead::{Aead, KeyInit};
use aes_gcm::{Aes256Gcm, Nonce};
use getrandom::getrandom;
use zeroize::Zeroize;

pub const NONCE_LEN: usize = 12;
pub const KEY_LEN: usize = 32;
pub const TAG_LEN: usize = 16;

/// CSPRNG bytes via OS entropy (getrandom).
pub fn random_bytes(len: usize) -> AppResult<Vec<u8>> {
    let mut buf = vec![0u8; len];
    getrandom(&mut buf).map_err(|e| AppError::crypto(format!("entropy failed: {e}")))?;
    Ok(buf)
}

pub fn random_key() -> AppResult<[u8; KEY_LEN]> {
    let mut k = [0u8; KEY_LEN];
    getrandom(&mut k).map_err(|e| AppError::crypto(format!("entropy failed: {e}")))?;
    Ok(k)
}

/// Encrypt: returns (nonce_12, ciphertext||tag).
pub fn seal(key: &[u8; KEY_LEN], plaintext: &[u8], aad: &[u8]) -> AppResult<(Vec<u8>, Vec<u8>)> {
    if aad.is_empty() {
        return Err(AppError::crypto("AAD required"));
    }
    let cipher = Aes256Gcm::new_from_slice(key).map_err(|e| AppError::crypto(e))?;
    let mut nonce_bytes = [0u8; NONCE_LEN];
    getrandom(&mut nonce_bytes).map_err(|e| AppError::crypto(format!("nonce entropy: {e}")))?;
    let nonce = Nonce::from_slice(&nonce_bytes);
    let ct = cipher
        .encrypt(
            nonce,
            aes_gcm::aead::Payload {
                msg: plaintext,
                aad,
            },
        )
        .map_err(|_| AppError::crypto("encrypt failed"))?;
    Ok((nonce_bytes.to_vec(), ct))
}

/// Decrypt and authenticate. Fails closed on any tag/nonce/AAD mismatch.
pub fn open(key: &[u8; KEY_LEN], nonce: &[u8], ciphertext: &[u8], aad: &[u8]) -> AppResult<Vec<u8>> {
    if nonce.len() != NONCE_LEN {
        return Err(AppError::crypto("invalid nonce length"));
    }
    if aad.is_empty() {
        return Err(AppError::crypto("AAD required"));
    }
    if ciphertext.len() < TAG_LEN {
        return Err(AppError::crypto("ciphertext too short"));
    }
    let cipher = Aes256Gcm::new_from_slice(key).map_err(|e| AppError::crypto(e))?;
    let nonce = Nonce::from_slice(nonce);
    cipher
        .decrypt(
            nonce,
            aes_gcm::aead::Payload {
                msg: ciphertext,
                aad,
            },
        )
        .map_err(|_| AppError::crypto("decrypt failed (auth)"))
}

/// Constant-time-ish wipe of a key buffer after use.
pub fn wipe_key(key: &mut [u8; KEY_LEN]) {
    key.zeroize();
}

pub fn key_from_slice(bytes: &[u8]) -> AppResult<[u8; KEY_LEN]> {
    if bytes.len() != KEY_LEN {
        return Err(AppError::crypto("key must be 32 bytes"));
    }
    let mut k = [0u8; KEY_LEN];
    k.copy_from_slice(bytes);
    Ok(k)
}
