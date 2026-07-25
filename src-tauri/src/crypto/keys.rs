use crate::error::{AppError, AppResult};
use argon2::{Algorithm, Argon2, Params, Version};
use data_encoding::BASE32_NOPAD;
use rand::RngCore;
use zeroize::{Zeroize, ZeroizeOnDrop};

#[derive(Zeroize, ZeroizeOnDrop)]
pub struct MasterKey(pub [u8; 32]);

impl Clone for MasterKey {
    fn clone(&self) -> Self {
        Self(self.0)
    }
}

impl MasterKey {
    pub fn random() -> Self {
        let mut k = [0u8; 32];
        rand::thread_rng().fill_bytes(&mut k);
        Self(k)
    }

    pub fn from_bytes(b: [u8; 32]) -> Self {
        Self(b)
    }
}

pub fn generate_recovery_key() -> (String, [u8; 32]) {
    let mut raw = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut raw);
    let encoded = BASE32_NOPAD.encode(&raw);
    // group for readability
    let grouped = encoded
        .as_bytes()
        .chunks(4)
        .map(|c| std::str::from_utf8(c).unwrap_or(""))
        .collect::<Vec<_>>()
        .join("-");
    (grouped, raw)
}

pub fn parse_recovery_key(s: &str) -> AppResult<[u8; 32]> {
    let clean: String = s.chars().filter(|c| *c != '-' && !c.is_whitespace()).collect();
    let upper = clean.to_uppercase();
    let decoded = BASE32_NOPAD
        .decode(upper.as_bytes())
        .map_err(|_| AppError::crypto("invalid recovery key"))?;
    if decoded.len() != 32 {
        return Err(AppError::crypto("invalid recovery key length"));
    }
    let mut out = [0u8; 32];
    out.copy_from_slice(&decoded);
    Ok(out)
}

pub fn derive_password_key(password: &str, salt: &[u8], m_kib: u32, t: u32, p: u32) -> AppResult<[u8; 32]> {
    let params = Params::new(m_kib, t, p, Some(32)).map_err(|e| AppError::crypto(e))?;
    let argon = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);
    let mut out = [0u8; 32];
    argon
        .hash_password_into(password.as_bytes(), salt, &mut out)
        .map_err(|e| AppError::crypto(e))?;
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn recovery_roundtrip() {
        let (disp, raw) = generate_recovery_key();
        let parsed = parse_recovery_key(&disp).unwrap();
        assert_eq!(raw, parsed);
    }
}
