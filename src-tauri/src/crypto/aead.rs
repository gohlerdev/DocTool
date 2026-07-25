use crate::error::{AppError, AppResult};
use aes_gcm::aead::{Aead, KeyInit};
use aes_gcm::{Aes256Gcm, Nonce};
use rand::RngCore;

pub fn random_bytes(len: usize) -> Vec<u8> {
    let mut buf = vec![0u8; len];
    rand::thread_rng().fill_bytes(&mut buf);
    buf
}

pub fn seal(key: &[u8; 32], plaintext: &[u8], aad: &[u8]) -> AppResult<(Vec<u8>, Vec<u8>)> {
    let cipher = Aes256Gcm::new_from_slice(key).map_err(|e| AppError::crypto(e))?;
    let mut nonce_bytes = [0u8; 12];
    rand::thread_rng().fill_bytes(&mut nonce_bytes);
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

pub fn open(key: &[u8; 32], nonce: &[u8], ciphertext: &[u8], aad: &[u8]) -> AppResult<Vec<u8>> {
    if nonce.len() != 12 {
        return Err(AppError::crypto("invalid nonce length"));
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
        .map_err(|_| AppError::crypto("decrypt failed"))
}

pub fn key_from_slice(bytes: &[u8]) -> AppResult<[u8; 32]> {
    if bytes.len() != 32 {
        return Err(AppError::crypto("key must be 32 bytes"));
    }
    let mut k = [0u8; 32];
    k.copy_from_slice(bytes);
    Ok(k)
}
