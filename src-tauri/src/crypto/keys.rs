//! Master keys, recovery keys, Argon2id KDF, HKDF domain separation.

use crate::crypto::aead::KEY_LEN;
use crate::error::{AppError, AppResult};
use argon2::{Algorithm, Argon2, Params, Version};
use data_encoding::BASE32_NOPAD;
use getrandom::getrandom;
use hkdf::Hkdf;
use sha2::Sha256;
use zeroize::{Zeroize, ZeroizeOnDrop};

/// OWASP / high-security Argon2id profile (format v2).
/// m=128 MiB, t=3, p=1 — strong against GPU/ASIC offline attacks.
/// Params are stored in vault header so old vaults remain unlockable.
pub const ARGON2_M_KIB: u32 = 128 * 1024; // 128 MiB
pub const ARGON2_T: u32 = 3;
pub const ARGON2_P: u32 = 1;
pub const SALT_LEN: usize = 32;

/// HKDF info labels (domain separation — never reuse across purposes).
pub const HKDF_INFO_PW_WRAP: &[u8] = b"doctool/v2/password-wrap-key";
pub const HKDF_INFO_RK_WRAP: &[u8] = b"doctool/v2/recovery-wrap-key";
pub const HKDF_INFO_LOCAL: &[u8] = b"doctool/v2/local-device-key";
pub const HKDF_INFO_NOTE: &[u8] = b"doctool/v2/note-field-key";

#[derive(Zeroize, ZeroizeOnDrop)]
pub struct MasterKey(pub [u8; KEY_LEN]);

impl Clone for MasterKey {
    fn clone(&self) -> Self {
        Self(self.0)
    }
}

impl MasterKey {
    pub fn random() -> AppResult<Self> {
        let mut k = [0u8; KEY_LEN];
        getrandom(&mut k).map_err(|e| AppError::crypto(format!("mk entropy: {e}")))?;
        Ok(Self(k))
    }

    pub fn from_bytes(b: [u8; KEY_LEN]) -> Self {
        Self(b)
    }
}

/// 256-bit recovery key, displayed as grouped Base32 (user-held offline secret).
pub fn generate_recovery_key() -> AppResult<(String, [u8; KEY_LEN])> {
    let mut raw = [0u8; KEY_LEN];
    getrandom(&mut raw).map_err(|e| AppError::crypto(format!("rk entropy: {e}")))?;
    let encoded = BASE32_NOPAD.encode(&raw);
    let grouped = encoded
        .as_bytes()
        .chunks(4)
        .map(|c| std::str::from_utf8(c).unwrap_or(""))
        .collect::<Vec<_>>()
        .join("-");
    Ok((grouped, raw))
}

pub fn parse_recovery_key(s: &str) -> AppResult<[u8; KEY_LEN]> {
    let clean: String = s
        .chars()
        .filter(|c| *c != '-' && !c.is_whitespace())
        .collect();
    let upper = clean.to_uppercase();
    let decoded = BASE32_NOPAD
        .decode(upper.as_bytes())
        .map_err(|_| AppError::crypto("invalid recovery key encoding"))?;
    if decoded.len() != KEY_LEN {
        return Err(AppError::crypto("invalid recovery key length"));
    }
    let mut out = [0u8; KEY_LEN];
    out.copy_from_slice(&decoded);
    Ok(out)
}

/// Argon2id → 32-byte raw key material (then run through HKDF for use keys).
pub fn derive_password_raw(
    password: &str,
    salt: &[u8],
    m_kib: u32,
    t: u32,
    p: u32,
) -> AppResult<[u8; KEY_LEN]> {
    if salt.len() < 16 {
        return Err(AppError::crypto("salt too short"));
    }
    // Clamp absurd params that would OOM
    let m_kib = m_kib.clamp(8 * 1024, 512 * 1024);
    let t = t.clamp(1, 10);
    let p = p.clamp(1, 4);
    let params = Params::new(m_kib, t, p, Some(KEY_LEN)).map_err(|e| AppError::crypto(e))?;
    let argon = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);
    let mut out = [0u8; KEY_LEN];
    argon
        .hash_password_into(password.as_bytes(), salt, &mut out)
        .map_err(|e| AppError::crypto(e))?;
    Ok(out)
}

/// HKDF-SHA256 extract-and-expand with explicit info string.
pub fn hkdf_expand(ikm: &[u8], info: &[u8]) -> AppResult<[u8; KEY_LEN]> {
    let hk = Hkdf::<Sha256>::new(None, ikm);
    let mut okm = [0u8; KEY_LEN];
    hk.expand(info, &mut okm)
        .map_err(|_| AppError::crypto("hkdf expand failed"))?;
    Ok(okm)
}

/// Password → wrap key (never use raw Argon2 output as AES key without HKDF).
pub fn password_wrap_key(
    password: &str,
    salt: &[u8],
    m_kib: u32,
    t: u32,
    p: u32,
) -> AppResult<[u8; KEY_LEN]> {
    let mut raw = derive_password_raw(password, salt, m_kib, t, p)?;
    let key = hkdf_expand(&raw, HKDF_INFO_PW_WRAP)?;
    raw.zeroize();
    Ok(key)
}

/// Recovery key bytes → wrap key via HKDF (domain-separated from password path).
pub fn recovery_wrap_key(recovery_raw: &[u8; KEY_LEN]) -> AppResult<[u8; KEY_LEN]> {
    hkdf_expand(recovery_raw, HKDF_INFO_RK_WRAP)
}

/// Minimum password policy for vault creation.
pub fn validate_password_strength(password: &str) -> AppResult<()> {
    if password.len() < 12 {
        return Err(AppError::validation(
            "password must be at least 12 characters",
        ));
    }
    if password.chars().count() < 12 {
        return Err(AppError::validation(
            "password must be at least 12 characters",
        ));
    }
    // Reject trivial passwords
    let lower = password.to_lowercase();
    for bad in ["password", "12345678", "qwerty", "doctool", "aaaaaaaa"] {
        if lower.contains(bad) {
            return Err(AppError::validation("password is too common or weak"));
        }
    }
    let has_letter = password.chars().any(|c| c.is_alphabetic());
    let has_digit = password.chars().any(|c| c.is_ascii_digit());
    if !has_letter || !has_digit {
        return Err(AppError::validation(
            "password must include letters and digits",
        ));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn recovery_roundtrip() {
        let (disp, raw) = generate_recovery_key().unwrap();
        let parsed = parse_recovery_key(&disp).unwrap();
        assert_eq!(raw, parsed);
    }

    #[test]
    fn hkdf_domain_separation() {
        let ikm = [7u8; 32];
        let a = hkdf_expand(&ikm, HKDF_INFO_PW_WRAP).unwrap();
        let b = hkdf_expand(&ikm, HKDF_INFO_RK_WRAP).unwrap();
        assert_ne!(a, b);
    }

    #[test]
    fn password_policy() {
        assert!(validate_password_strength("short").is_err());
        assert!(validate_password_strength("password12345").is_err());
        assert!(validate_password_strength("CorrectHorseBattery9").is_ok());
    }
}
