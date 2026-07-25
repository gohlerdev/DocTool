use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("{message}")]
    Io { message: String },
    #[error("not found")]
    NotFound,
    #[error("permission denied")]
    PermissionDenied,
    #[error("authentication failed")]
    AuthFailed,
    #[error("host key mismatch")]
    HostKeyMismatch,
    #[error("host key required")]
    HostKeyRequired { fingerprint: String },
    #[error("crypto error: {message}")]
    CryptoFailed { message: String },
    #[error("network error: {message}")]
    Network { message: String },
    #[error("conflict: {message}")]
    Conflict { message: String },
    #[error("validation: {message}")]
    Validation { message: String },
    #[error("vault locked")]
    VaultLocked,
    #[error("vault not configured")]
    VaultNotConfigured,
    #[error("{message}")]
    Internal { message: String },
}

impl AppError {
    pub fn code(&self) -> &'static str {
        match self {
            Self::Io { .. } => "Io",
            Self::NotFound => "NotFound",
            Self::PermissionDenied => "PermissionDenied",
            Self::AuthFailed => "AuthFailed",
            Self::HostKeyMismatch => "HostKeyMismatch",
            Self::HostKeyRequired { .. } => "HostKeyRequired",
            Self::CryptoFailed { .. } => "CryptoFailed",
            Self::Network { .. } => "Network",
            Self::Conflict { .. } => "Conflict",
            Self::Validation { .. } => "Validation",
            Self::VaultLocked => "VaultLocked",
            Self::VaultNotConfigured => "VaultNotConfigured",
            Self::Internal { .. } => "Internal",
        }
    }

    pub fn io(e: impl ToString) -> Self {
        Self::Io {
            message: e.to_string(),
        }
    }

    pub fn internal(e: impl ToString) -> Self {
        Self::Internal {
            message: e.to_string(),
        }
    }

    pub fn crypto(e: impl ToString) -> Self {
        Self::CryptoFailed {
            message: e.to_string(),
        }
    }

    pub fn validation(e: impl ToString) -> Self {
        Self::Validation {
            message: e.to_string(),
        }
    }

    pub fn network(e: impl ToString) -> Self {
        Self::Network {
            message: e.to_string(),
        }
    }
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        use serde::ser::SerializeMap;
        let mut map = serializer.serialize_map(Some(3))?;
        map.serialize_entry("code", self.code())?;
        map.serialize_entry("message", &self.to_string())?;
        if let Self::HostKeyRequired { fingerprint } = self {
            map.serialize_entry("details", &serde_json::json!({ "fingerprint": fingerprint }))?;
        }
        map.end()
    }
}

impl From<rusqlite::Error> for AppError {
    fn from(e: rusqlite::Error) -> Self {
        Self::internal(e)
    }
}

impl From<std::io::Error> for AppError {
    fn from(e: std::io::Error) -> Self {
        Self::io(e)
    }
}

pub type AppResult<T> = Result<T, AppError>;
