use crate::error::{AppError, AppResult};
use crate::fs_ops::DirEntry;
use async_trait::async_trait;
use parking_lot::Mutex;
use russh::client::Handle;
use russh_keys::key::PublicKey;
use russh_sftp::client::SftpSession;
use serde::Serialize;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::runtime::Runtime;

pub struct LiveSession {
    pub _handle: Handle<ClientHandler>,
    pub sftp: SftpSession,
    pub fingerprint: String,
}

pub struct ClientHandler {
    pub seen: Arc<Mutex<Option<String>>>,
}

#[async_trait]
impl russh::client::Handler for ClientHandler {
    type Error = russh::Error;

    async fn check_server_key(
        &mut self,
        server_public_key: &PublicKey,
    ) -> Result<bool, Self::Error> {
        *self.seen.lock() = Some(server_public_key.fingerprint());
        Ok(true)
    }
}

pub struct SftpManager {
    rt: Runtime,
    sessions: Mutex<HashMap<String, Arc<LiveSession>>>,
}

#[derive(Debug, Serialize)]
#[serde(tag = "status", rename_all = "camelCase")]
pub enum ConnectResult {
    Ready { fingerprint: String },
    HostKeyRequired { fingerprint: String },
}

impl SftpManager {
    pub fn new() -> Self {
        Self {
            rt: Runtime::new().expect("tokio runtime"),
            sessions: Mutex::new(HashMap::new()),
        }
    }

    pub fn connect_with_tofu(
        &self,
        profile_id: &str,
        host: &str,
        port: u16,
        username: &str,
        password: Option<&str>,
        private_key_pem: Option<&str>,
        passphrase: Option<&str>,
        expected_fp: Option<&str>,
        trust_fp: Option<&str>,
    ) -> AppResult<ConnectResult> {
        let host = host.to_string();
        let username = username.to_string();
        let password = password.map(|s| s.to_string());
        let private_key_pem = private_key_pem.map(|s| s.to_string());
        let passphrase = passphrase.map(|s| s.to_string());
        let profile_id = profile_id.to_string();
        let expected_fp = expected_fp.map(|s| s.to_string());
        let trust_fp = trust_fp.map(|s| s.to_string());

        self.rt.block_on(async {
            let seen = Arc::new(Mutex::new(None));
            let config = Arc::new(russh::client::Config::default());
            let mut handle = russh::client::connect(
                config,
                (host.as_str(), port),
                ClientHandler { seen: seen.clone() },
            )
            .await
            .map_err(|e| AppError::network(e))?;

            let fp = seen.lock().clone().unwrap_or_else(|| "unknown".into());

            if let Some(ref exp) = expected_fp {
                if exp != &fp {
                    return Err(AppError::HostKeyMismatch);
                }
            } else if trust_fp.is_none() {
                return Ok(ConnectResult::HostKeyRequired { fingerprint: fp });
            } else if trust_fp.as_ref() != Some(&fp) {
                return Err(AppError::HostKeyMismatch);
            }

            let auth_ok = if let Some(ref pem) = private_key_pem {
                let key = russh_keys::decode_secret_key(pem, passphrase.as_deref())
                    .map_err(|_| AppError::AuthFailed)?;
                handle
                    .authenticate_publickey(&username, Arc::new(key))
                    .await
                    .map_err(|_| AppError::AuthFailed)?
            } else if let Some(ref pw) = password {
                handle
                    .authenticate_password(&username, pw)
                    .await
                    .map_err(|_| AppError::AuthFailed)?
            } else {
                return Err(AppError::validation("password or private key required"));
            };

            if !auth_ok {
                return Err(AppError::AuthFailed);
            }

            let channel = handle
                .channel_open_session()
                .await
                .map_err(|e| AppError::network(e))?;
            channel
                .request_subsystem(true, "sftp")
                .await
                .map_err(|e| AppError::network(e))?;
            let sftp = SftpSession::new(channel.into_stream())
                .await
                .map_err(|e| AppError::network(e))?;

            let session = Arc::new(LiveSession {
                _handle: handle,
                sftp,
                fingerprint: fp.clone(),
            });
            self.sessions.lock().insert(profile_id, session);
            Ok(ConnectResult::Ready { fingerprint: fp })
        })
    }

    pub fn disconnect(&self, profile_id: &str) {
        self.sessions.lock().remove(profile_id);
    }

    pub fn list(&self, profile_id: &str, path: &str) -> AppResult<Vec<DirEntry>> {
        let session = self
            .sessions
            .lock()
            .get(profile_id)
            .cloned()
            .ok_or_else(|| AppError::validation("not connected"))?;
        let path = path.to_string();
        self.rt.block_on(async {
            let entries = session
                .sftp
                .read_dir(&path)
                .await
                .map_err(|e| AppError::io(e))?;
            let mut out = Vec::new();
            for e in entries {
                let name = e.file_name();
                if name == "." || name == ".." {
                    continue;
                }
                let meta = e.metadata();
                let is_dir = meta.file_type().is_dir();
                let full = if path == "/" {
                    format!("/{name}")
                } else if path.ends_with('/') {
                    format!("{path}{name}")
                } else {
                    format!("{path}/{name}")
                };
                out.push(DirEntry {
                    name,
                    path: full,
                    is_dir,
                    size: if is_dir { None } else { meta.size },
                    mtime: meta.mtime.map(|m| m.to_string()),
                });
            }
            out.sort_by(|a, b| match (a.is_dir, b.is_dir) {
                (true, false) => std::cmp::Ordering::Less,
                (false, true) => std::cmp::Ordering::Greater,
                _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
            });
            Ok(out)
        })
    }

    pub fn read(&self, profile_id: &str, path: &str) -> AppResult<Vec<u8>> {
        let session = self
            .sessions
            .lock()
            .get(profile_id)
            .cloned()
            .ok_or_else(|| AppError::validation("not connected"))?;
        let path = path.to_string();
        self.rt.block_on(async {
            let mut file = session
                .sftp
                .open(&path)
                .await
                .map_err(|e| AppError::io(e))?;
            let mut buf = Vec::new();
            file.read_to_end(&mut buf)
                .await
                .map_err(|e| AppError::io(e))?;
            Ok(buf)
        })
    }

    pub fn write_file(&self, profile_id: &str, path: &str, data: &[u8]) -> AppResult<()> {
        let session = self
            .sessions
            .lock()
            .get(profile_id)
            .cloned()
            .ok_or_else(|| AppError::validation("not connected"))?;
        let path = path.to_string();
        let data = data.to_vec();
        self.rt.block_on(async {
            let mut file = session
                .sftp
                .create(&path)
                .await
                .map_err(|e| AppError::io(e))?;
            file.write_all(&data).await.map_err(|e| AppError::io(e))?;
            file.shutdown().await.ok();
            Ok(())
        })
    }

    pub fn mkdir(&self, profile_id: &str, path: &str) -> AppResult<()> {
        let session = self
            .sessions
            .lock()
            .get(profile_id)
            .cloned()
            .ok_or_else(|| AppError::validation("not connected"))?;
        let path = path.to_string();
        self.rt.block_on(async {
            session
                .sftp
                .create_dir(&path)
                .await
                .map_err(|e| AppError::io(e))?;
            Ok(())
        })
    }

    pub fn remove(&self, profile_id: &str, path: &str) -> AppResult<()> {
        let session = self
            .sessions
            .lock()
            .get(profile_id)
            .cloned()
            .ok_or_else(|| AppError::validation("not connected"))?;
        let path = path.to_string();
        self.rt.block_on(async {
            if session.sftp.remove_file(&path).await.is_err() {
                session
                    .sftp
                    .remove_dir(&path)
                    .await
                    .map_err(|e| AppError::io(e))?;
            }
            Ok(())
        })
    }
}
