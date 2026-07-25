use crate::crypto::session::VaultSession;
use crate::db::Db;
use crate::sftp::SftpManager;
use parking_lot::Mutex;
use std::path::PathBuf;
use std::sync::Arc;

pub struct AppState {
    pub db: Mutex<Db>,
    pub data_dir: PathBuf,
    pub vault: Mutex<Option<VaultSession>>,
    pub sftp: Arc<SftpManager>,
}

impl AppState {
    pub fn new(data_dir: PathBuf) -> crate::error::AppResult<Self> {
        std::fs::create_dir_all(&data_dir)?;
        std::fs::create_dir_all(data_dir.join("cache"))?;
        std::fs::create_dir_all(data_dir.join("vault_objects"))?;
        let db_path = data_dir.join("doctool.sqlite3");
        let db = Db::open(&db_path)?;
        Ok(Self {
            db: Mutex::new(db),
            data_dir,
            vault: Mutex::new(None),
            sftp: Arc::new(SftpManager::new()),
        })
    }
}
