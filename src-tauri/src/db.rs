use crate::error::{AppError, AppResult};
use rusqlite::{params, Connection};
use std::path::Path;
use ulid::Ulid;

pub struct Db {
    conn: Connection,
}

impl Db {
    pub fn open(path: &Path) -> AppResult<Self> {
        let conn = Connection::open(path)?;
        conn.execute_batch(
            "PRAGMA journal_mode=WAL;
             PRAGMA foreign_keys=ON;",
        )?;
        let db = Self { conn };
        db.migrate()?;
        db.ensure_device_id()?;
        Ok(db)
    }

    fn migrate(&self) -> AppResult<()> {
        self.conn.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS app_meta (
              key TEXT PRIMARY KEY NOT NULL,
              value TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS notes (
              id TEXT PRIMARY KEY NOT NULL,
              title TEXT NOT NULL DEFAULT '',
              body_json TEXT NOT NULL,
              body_text TEXT NOT NULL DEFAULT '',
              color TEXT NOT NULL DEFAULT 'default',
              pinned INTEGER NOT NULL DEFAULT 0,
              archived INTEGER NOT NULL DEFAULT 0,
              deleted_at TEXT,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              content_hash TEXT,
              remote_object_id TEXT,
              remote_updated_at TEXT,
              sync_status TEXT NOT NULL DEFAULT 'local_only',
              last_synced_at TEXT,
              last_error TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updated_at DESC);
            CREATE INDEX IF NOT EXISTS idx_notes_pinned ON notes(pinned DESC, updated_at DESC);
            CREATE INDEX IF NOT EXISTS idx_notes_sync ON notes(sync_status);

            CREATE TABLE IF NOT EXISTS note_labels (
              note_id TEXT NOT NULL,
              label TEXT NOT NULL,
              PRIMARY KEY (note_id, label),
              FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
            );

            CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
              title, body_text, content='notes', content_rowid='rowid'
            );

            CREATE TABLE IF NOT EXISTS sftp_profiles (
              id TEXT PRIMARY KEY NOT NULL,
              name TEXT NOT NULL,
              host TEXT NOT NULL,
              port INTEGER NOT NULL DEFAULT 22,
              username TEXT NOT NULL,
              auth_type TEXT NOT NULL,
              password_enc TEXT,
              private_key_enc TEXT,
              passphrase_enc TEXT,
              default_path TEXT,
              color TEXT,
              host_key_fingerprint TEXT,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS recents (
              uri TEXT PRIMARY KEY NOT NULL,
              title TEXT,
              opened_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS sync_queue (
              id TEXT PRIMARY KEY NOT NULL,
              entity_type TEXT NOT NULL,
              entity_id TEXT NOT NULL,
              op TEXT NOT NULL,
              attempts INTEGER NOT NULL DEFAULT 0,
              last_error TEXT,
              next_attempt_at TEXT,
              created_at TEXT NOT NULL,
              UNIQUE (entity_type, entity_id, op)
            );

            CREATE TABLE IF NOT EXISTS vault_state (
              id INTEGER PRIMARY KEY CHECK (id = 1),
              configured INTEGER NOT NULL DEFAULT 0,
              drive_linked INTEGER NOT NULL DEFAULT 0,
              header_json TEXT,
              last_unlock_at TEXT,
              last_sync_at TEXT,
              last_error TEXT
            );

            INSERT OR IGNORE INTO vault_state (id) VALUES (1);

            CREATE TABLE IF NOT EXISTS vault_secrets (
              id INTEGER PRIMARY KEY CHECK (id = 1),
              header_json TEXT,
              manifest_enc TEXT,
              mk_wrap_local TEXT
            );
            INSERT OR IGNORE INTO vault_secrets (id) VALUES (1);
            "#,
        )?;
        Ok(())
    }

    fn ensure_device_id(&self) -> AppResult<()> {
        let existing: Option<String> = self
            .conn
            .query_row(
                "SELECT value FROM app_meta WHERE key = 'device_id'",
                [],
                |r| r.get(0),
            )
            .ok();
        if existing.is_none() {
            self.set_meta("device_id", &Ulid::new().to_string())?;
        }
        Ok(())
    }

    pub fn get_meta(&self, key: &str) -> AppResult<Option<String>> {
        let res = self.conn.query_row(
            "SELECT value FROM app_meta WHERE key = ?1",
            params![key],
            |r| r.get(0),
        );
        match res {
            Ok(v) => Ok(Some(v)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    pub fn set_meta(&self, key: &str, value: &str) -> AppResult<()> {
        self.conn.execute(
            "INSERT INTO app_meta(key, value) VALUES(?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![key, value],
        )?;
        Ok(())
    }

    pub fn conn(&self) -> &Connection {
        &self.conn
    }

    pub fn conn_mut(&mut self) -> &mut Connection {
        &mut self.conn
    }
}

pub fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true)
}

pub fn map_db_err(e: rusqlite::Error) -> AppError {
    e.into()
}
