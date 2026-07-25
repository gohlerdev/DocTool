use crate::crypto::header::{
    create_vault, decrypt_blob, encrypt_blob, unlock_with_password, unlock_with_recovery,
    VaultHeader,
};
use crate::crypto::session::{ManifestEntry, VaultSession};
use crate::db::now_iso;
use crate::error::{AppError, AppResult};
use crate::fs_ops::{self, DirEntry, FileStat};
use crate::notes::{self, Note, NoteSummary, NoteUpsert};
use crate::sftp::ConnectResult;
use crate::state::AppState;
use base64::{engine::general_purpose::STANDARD as B64, Engine};
use rusqlite::params;
use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use tauri::State;
use ulid::Ulid;

// ── System ──────────────────────────────────────────────

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    pub version: String,
    pub os: String,
    pub device_id: String,
    pub data_dir: String,
}

#[tauri::command]
pub fn app_info(state: State<'_, AppState>) -> AppResult<AppInfo> {
    let db = state.db.lock();
    let device_id = db
        .get_meta("device_id")?
        .unwrap_or_else(|| "unknown".into());
    Ok(AppInfo {
        version: env!("CARGO_PKG_VERSION").into(),
        os: std::env::consts::OS.into(),
        device_id,
        data_dir: state.data_dir.to_string_lossy().into(),
    })
}

#[tauri::command]
pub fn settings_get(state: State<'_, AppState>, key: String) -> AppResult<Option<String>> {
    state.db.lock().get_meta(&key)
}

#[tauri::command]
pub fn settings_set(state: State<'_, AppState>, key: String, value: String) -> AppResult<()> {
    state.db.lock().set_meta(&key, &value)
}

#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {name}! Welcome to DocTool.")
}

// ── Notes ───────────────────────────────────────────────

#[tauri::command]
pub fn notes_list(
    state: State<'_, AppState>,
    query: Option<String>,
    label: Option<String>,
    archived: Option<bool>,
    include_deleted: Option<bool>,
) -> AppResult<Vec<NoteSummary>> {
    let db = state.db.lock();
    notes::list_notes(
        &db,
        query.as_deref(),
        label.as_deref(),
        archived,
        include_deleted.unwrap_or(false),
    )
}

#[tauri::command]
pub fn notes_get(state: State<'_, AppState>, id: String) -> AppResult<Note> {
    notes::get_note(&state.db.lock(), &id)
}

#[tauri::command]
pub fn notes_upsert(state: State<'_, AppState>, input: NoteUpsert) -> AppResult<Note> {
    let note = {
        let db = state.db.lock();
        notes::upsert_note(&db, input)?
    };
    // try dual-write if vault unlocked
    let _ = sync_note_to_vault(&state, &note);
    Ok(note)
}

#[tauri::command]
pub fn notes_delete(state: State<'_, AppState>, id: String, hard: Option<bool>) -> AppResult<()> {
    notes::delete_note(&state.db.lock(), &id, hard.unwrap_or(false))
}

#[tauri::command]
pub fn notes_search(state: State<'_, AppState>, query: String) -> AppResult<Vec<NoteSummary>> {
    notes::list_notes(&state.db.lock(), Some(&query), None, Some(false), false)
}

// ── Files ───────────────────────────────────────────────

#[tauri::command]
pub fn fs_default_root() -> AppResult<String> {
    Ok(fs_ops::default_docs_dir().to_string_lossy().into())
}

#[tauri::command]
pub fn fs_list(path: String) -> AppResult<Vec<DirEntry>> {
    fs_ops::list_dir(&path)
}

#[tauri::command]
pub fn fs_read(path: String) -> AppResult<String> {
    let bytes = fs_ops::read_file(&path)?;
    Ok(B64.encode(bytes))
}

#[tauri::command]
pub fn fs_write(path: String, data_base64: String) -> AppResult<u64> {
    let data = B64
        .decode(data_base64.as_bytes())
        .map_err(|e| AppError::validation(e))?;
    fs_ops::write_file(&path, &data)?;
    Ok(data.len() as u64)
}

#[tauri::command]
pub fn fs_mkdir(path: String) -> AppResult<()> {
    fs_ops::mkdir(&path)
}

#[tauri::command]
pub fn fs_remove(path: String) -> AppResult<()> {
    fs_ops::remove_path(&path)
}

#[tauri::command]
pub fn fs_rename(from: String, to: String) -> AppResult<()> {
    fs_ops::rename_path(&from, &to)
}

#[tauri::command]
pub fn fs_stat(path: String) -> AppResult<FileStat> {
    fs_ops::stat_path(&path)
}

#[tauri::command]
pub fn recents_list(state: State<'_, AppState>) -> AppResult<Vec<serde_json::Value>> {
    let db = state.db.lock();
    let mut stmt = db
        .conn()
        .prepare("SELECT uri, title, opened_at FROM recents ORDER BY opened_at DESC LIMIT 50")?;
    let rows = stmt.query_map([], |r| {
        Ok(serde_json::json!({
            "uri": r.get::<_, String>(0)?,
            "title": r.get::<_, Option<String>>(1)?,
            "openedAt": r.get::<_, String>(2)?,
        }))
    })?;
    let mut out = Vec::new();
    for r in rows {
        out.push(r?);
    }
    Ok(out)
}

#[tauri::command]
pub fn recents_add(state: State<'_, AppState>, uri: String, title: Option<String>) -> AppResult<()> {
    let db = state.db.lock();
    let now = now_iso();
    db.conn().execute(
        "INSERT INTO recents(uri, title, opened_at) VALUES(?1,?2,?3)
         ON CONFLICT(uri) DO UPDATE SET title=excluded.title, opened_at=excluded.opened_at",
        params![uri, title, now],
    )?;
    Ok(())
}

// ── SFTP ────────────────────────────────────────────────

#[tauri::command]
pub fn sftp_profiles_list(state: State<'_, AppState>) -> AppResult<Vec<serde_json::Value>> {
    let db = state.db.lock();
    let mut stmt = db.conn().prepare(
        "SELECT id, name, host, port, username, auth_type, default_path, color, host_key_fingerprint,
                created_at, updated_at, password_enc, private_key_enc
         FROM sftp_profiles ORDER BY name",
    )?;
    let rows = stmt.query_map([], |r| {
        Ok(serde_json::json!({
            "id": r.get::<_, String>(0)?,
            "name": r.get::<_, String>(1)?,
            "host": r.get::<_, String>(2)?,
            "port": r.get::<_, i64>(3)?,
            "username": r.get::<_, String>(4)?,
            "authType": r.get::<_, String>(5)?,
            "defaultPath": r.get::<_, Option<String>>(6)?,
            "color": r.get::<_, Option<String>>(7)?,
            "hostKeyFingerprint": r.get::<_, Option<String>>(8)?,
            "createdAt": r.get::<_, String>(9)?,
            "updatedAt": r.get::<_, String>(10)?,
            "hasPassword": r.get::<_, Option<String>>(11)?.is_some(),
            "hasPrivateKey": r.get::<_, Option<String>>(12)?.is_some(),
        }))
    })?;
    let mut out = Vec::new();
    for r in rows {
        out.push(r?);
    }
    Ok(out)
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SftpProfileSave {
    pub id: Option<String>,
    pub name: String,
    pub host: String,
    pub port: Option<u16>,
    pub username: String,
    pub auth_type: String,
    pub password: Option<String>,
    pub private_key_pem: Option<String>,
    pub passphrase: Option<String>,
    pub default_path: Option<String>,
    pub color: Option<String>,
}

#[tauri::command]
pub fn sftp_profile_save(state: State<'_, AppState>, input: SftpProfileSave) -> AppResult<String> {
    let db = state.db.lock();
    let id = input.id.unwrap_or_else(|| Ulid::new().to_string());
    let now = now_iso();
    let port = input.port.unwrap_or(22) as i64;
    // store secrets base64 in DB encrypted-at-rest would be better; for mobile we use app-private DB
    let pw = input.password.map(|p| B64.encode(p.as_bytes()));
    let key = input.private_key_pem.map(|p| B64.encode(p.as_bytes()));
    let pp = input.passphrase.map(|p| B64.encode(p.as_bytes()));

    let exists: bool = db.conn().query_row(
        "SELECT COUNT(1) FROM sftp_profiles WHERE id=?1",
        params![id],
        |r| r.get::<_, i64>(0),
    )? > 0;

    if exists {
        db.conn().execute(
            "UPDATE sftp_profiles SET name=?2, host=?3, port=?4, username=?5, auth_type=?6,
             default_path=?7, color=?8, updated_at=?9,
             password_enc=COALESCE(?10, password_enc),
             private_key_enc=COALESCE(?11, private_key_enc),
             passphrase_enc=COALESCE(?12, passphrase_enc)
             WHERE id=?1",
            params![id, input.name, input.host, port, input.username, input.auth_type,
                input.default_path, input.color, now, pw, key, pp],
        )?;
    } else {
        db.conn().execute(
            "INSERT INTO sftp_profiles(id,name,host,port,username,auth_type,password_enc,private_key_enc,passphrase_enc,default_path,color,created_at,updated_at)
             VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?12)",
            params![id, input.name, input.host, port, input.username, input.auth_type, pw, key, pp,
                input.default_path, input.color, now],
        )?;
    }
    Ok(id)
}

#[tauri::command]
pub fn sftp_profile_delete(state: State<'_, AppState>, id: String) -> AppResult<()> {
    state.sftp.disconnect(&id);
    state
        .db
        .lock()
        .conn()
        .execute("DELETE FROM sftp_profiles WHERE id=?1", params![id])?;
    Ok(())
}

#[tauri::command]
pub fn sftp_connect(
    state: State<'_, AppState>,
    id: String,
    trust_fingerprint: Option<String>,
) -> AppResult<ConnectResult> {
    let (host, port, username, auth_type, pw, key, pp, fp, default_path) = {
        let db = state.db.lock();
        db.conn().query_row(
            "SELECT host, port, username, auth_type, password_enc, private_key_enc, passphrase_enc, host_key_fingerprint, default_path
             FROM sftp_profiles WHERE id=?1",
            params![id],
            |r| {
                Ok((
                    r.get::<_, String>(0)?,
                    r.get::<_, i64>(1)? as u16,
                    r.get::<_, String>(2)?,
                    r.get::<_, String>(3)?,
                    r.get::<_, Option<String>>(4)?,
                    r.get::<_, Option<String>>(5)?,
                    r.get::<_, Option<String>>(6)?,
                    r.get::<_, Option<String>>(7)?,
                    r.get::<_, Option<String>>(8)?,
                ))
            },
        ).map_err(|_| AppError::NotFound)?
    };

    let password = pw.and_then(|p| {
        B64.decode(p.as_bytes())
            .ok()
            .and_then(|b| String::from_utf8(b).ok())
    });
    let private_key = key.and_then(|p| {
        B64.decode(p.as_bytes())
            .ok()
            .and_then(|b| String::from_utf8(b).ok())
    });
    let passphrase = pp.and_then(|p| {
        B64.decode(p.as_bytes())
            .ok()
            .and_then(|b| String::from_utf8(b).ok())
    });

    let _ = auth_type;
    let _ = default_path;

    let result = state.sftp.connect_with_tofu(
        &id,
        &host,
        port,
        &username,
        password.as_deref(),
        private_key.as_deref(),
        passphrase.as_deref(),
        fp.as_deref(),
        trust_fingerprint.as_deref(),
    )?;

    if let ConnectResult::Ready { fingerprint } = &result {
        let db = state.db.lock();
        db.conn().execute(
            "UPDATE sftp_profiles SET host_key_fingerprint=?2 WHERE id=?1",
            params![id, fingerprint],
        )?;
    }
    Ok(result)
}

#[tauri::command]
pub fn sftp_disconnect(state: State<'_, AppState>, id: String) -> AppResult<()> {
    state.sftp.disconnect(&id);
    Ok(())
}

#[tauri::command]
pub fn sftp_list(state: State<'_, AppState>, id: String, path: String) -> AppResult<Vec<DirEntry>> {
    state.sftp.list(&id, &path)
}

#[tauri::command]
pub fn sftp_read(state: State<'_, AppState>, id: String, path: String) -> AppResult<String> {
    let bytes = state.sftp.read(&id, &path)?;
    Ok(B64.encode(bytes))
}

#[tauri::command]
pub fn sftp_write(
    state: State<'_, AppState>,
    id: String,
    path: String,
    data_base64: String,
) -> AppResult<()> {
    let data = B64
        .decode(data_base64.as_bytes())
        .map_err(|e| AppError::validation(e))?;
    state.sftp.write_file(&id, &path, &data)
}

#[tauri::command]
pub fn sftp_mkdir(state: State<'_, AppState>, id: String, path: String) -> AppResult<()> {
    state.sftp.mkdir(&id, &path)
}

#[tauri::command]
pub fn sftp_remove(state: State<'_, AppState>, id: String, path: String) -> AppResult<()> {
    state.sftp.remove(&id, &path)
}

#[tauri::command]
pub fn sftp_reset_host_key(state: State<'_, AppState>, id: String) -> AppResult<()> {
    state.db.lock().conn().execute(
        "UPDATE sftp_profiles SET host_key_fingerprint=NULL WHERE id=?1",
        params![id],
    )?;
    Ok(())
}

// ── Vault ───────────────────────────────────────────────

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultStatus {
    pub configured: bool,
    pub unlocked: bool,
    pub drive_linked: bool,
    pub last_sync_at: Option<String>,
    pub pending_jobs: i64,
    pub entry_count: usize,
}

#[tauri::command]
pub fn vault_status(state: State<'_, AppState>) -> AppResult<VaultStatus> {
    let db = state.db.lock();
    let configured: i64 = db
        .conn()
        .query_row("SELECT configured FROM vault_state WHERE id=1", [], |r| {
            r.get::<_, i64>(0)
        })
        .unwrap_or(0);
    let drive_linked: i64 = db
        .conn()
        .query_row("SELECT drive_linked FROM vault_state WHERE id=1", [], |r| {
            r.get::<_, i64>(0)
        })
        .unwrap_or(0);
    let last_sync_at: Option<String> = db
        .conn()
        .query_row(
            "SELECT last_sync_at FROM vault_state WHERE id=1",
            [],
            |r| r.get::<_, Option<String>>(0),
        )
        .ok()
        .flatten();
    let pending_jobs: i64 = db
        .conn()
        .query_row("SELECT COUNT(1) FROM sync_queue", [], |r| r.get::<_, i64>(0))
        .unwrap_or(0);
    let unlocked = state.vault.lock().is_some();
    let entry_count = state
        .vault
        .lock()
        .as_ref()
        .map(|v| v.manifest.len())
        .unwrap_or(0);
    Ok(VaultStatus {
        configured: configured != 0,
        unlocked,
        drive_linked: drive_linked != 0,
        last_sync_at,
        pending_jobs,
        entry_count,
    })
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultCreateResult {
    pub recovery_key: String,
}

#[tauri::command]
pub fn vault_create(state: State<'_, AppState>, password: String) -> AppResult<VaultCreateResult> {
    let created = create_vault(&password)?;
    let header_json = serde_json::to_string(&created.header).map_err(|e| AppError::internal(e))?;
    {
        let db = state.db.lock();
        db.conn().execute(
            "UPDATE vault_state SET configured=1, header_json=?1 WHERE id=1",
            params![header_json],
        )?;
        db.conn().execute(
            "UPDATE vault_secrets SET header_json=?1, manifest_enc=NULL WHERE id=1",
            params![header_json],
        )?;
    }
    // empty manifest file store
    let manifest_path = state.data_dir.join("vault_manifest.enc");
    let empty = created.master_key.clone();
    let enc = encrypt_blob(&empty, br#"{"v":1,"entries":[]}"#)?;
    fs::write(&manifest_path, &enc)?;

    let mut session = VaultSession::new(created.master_key, created.header);
    session.load_manifest_json(r#"{"v":1,"entries":[]}"#)?;
    *state.vault.lock() = Some(session);

    Ok(VaultCreateResult {
        recovery_key: created.recovery_key_display,
    })
}

#[tauri::command]
pub fn vault_unlock(
    state: State<'_, AppState>,
    password: Option<String>,
    recovery_key: Option<String>,
) -> AppResult<()> {
    let header_json: String = {
        let db = state.db.lock();
        let v: Option<String> = db
            .conn()
            .query_row(
                "SELECT header_json FROM vault_state WHERE id=1",
                [],
                |r| r.get::<_, Option<String>>(0),
            )
            .map_err(|_| AppError::VaultNotConfigured)?;
        v.ok_or(AppError::VaultNotConfigured)?
    };
    let header: VaultHeader =
        serde_json::from_str(&header_json).map_err(|e| AppError::crypto(e))?;
    let mk = if let Some(pw) = password {
        unlock_with_password(&header, &pw)?
    } else if let Some(rk) = recovery_key {
        unlock_with_recovery(&header, &rk)?
    } else {
        return Err(AppError::validation("password or recoveryKey required"));
    };

    let mut session = VaultSession::new(mk, header);
    let manifest_path = state.data_dir.join("vault_manifest.enc");
    if manifest_path.exists() {
        let blob = fs::read(&manifest_path)?;
        if let Ok(plain) = decrypt_blob(&session.master_key, &blob) {
            let json = String::from_utf8_lossy(&plain).to_string();
            session.load_manifest_json(&json)?;
        }
    }
    *state.vault.lock() = Some(session);

    // pull encrypted notes into local
    let _ = pull_vault_notes(&state);

    let db = state.db.lock();
    db.conn().execute(
        "UPDATE vault_state SET last_unlock_at=?1 WHERE id=1",
        params![now_iso()],
    )?;
    Ok(())
}

#[tauri::command]
pub fn vault_lock(state: State<'_, AppState>) -> AppResult<()> {
    *state.vault.lock() = None;
    Ok(())
}

#[tauri::command]
pub fn vault_list(state: State<'_, AppState>) -> AppResult<Vec<ManifestEntry>> {
    let vault = state.vault.lock();
    let session = vault.as_ref().ok_or(AppError::VaultLocked)?;
    Ok(session.manifest.values().cloned().collect())
}

#[tauri::command]
pub fn vault_put_file(
    state: State<'_, AppState>,
    logical_path: String,
    data_base64: String,
    kind: Option<String>,
) -> AppResult<String> {
    let data = B64
        .decode(data_base64.as_bytes())
        .map_err(|e| AppError::validation(e))?;
    put_vault_object(&state, &logical_path, &data, kind.as_deref().unwrap_or("file"))
}

#[tauri::command]
pub fn vault_get_file(state: State<'_, AppState>, logical_path: String) -> AppResult<String> {
    let object_id = {
        let vault = state.vault.lock();
        let session = vault.as_ref().ok_or(AppError::VaultLocked)?;
        session
            .manifest
            .get(&logical_path)
            .ok_or(AppError::NotFound)?
            .object_id
            .clone()
    };
    let path = object_path(&state, &object_id);
    let blob = fs::read(path)?;
    let vault = state.vault.lock();
    let session = vault.as_ref().ok_or(AppError::VaultLocked)?;
    let plain = decrypt_blob(&session.master_key, &blob)?;
    Ok(B64.encode(plain))
}

#[tauri::command]
pub fn notes_sync_now(state: State<'_, AppState>) -> AppResult<serde_json::Value> {
    let mut pushed = 0;
    let mut pulled = 0;
    pulled += pull_vault_notes(&state).unwrap_or(0);
    let ids = notes::list_pending_sync(&state.db.lock())?;
    for id in ids {
        if let Ok(note) = notes::get_note(&state.db.lock(), &id) {
            if sync_note_to_vault(&state, &note).is_ok() {
                pushed += 1;
            }
        }
    }
    Ok(serde_json::json!({"pushed": pushed, "pulled": pulled, "conflicts": 0, "errors": []}))
}

fn object_path(state: &AppState, object_id: &str) -> PathBuf {
    state.data_dir.join("vault_objects").join(format!("{object_id}.bin"))
}

fn persist_manifest(state: &AppState) -> AppResult<()> {
    let (json, mk) = {
        let vault = state.vault.lock();
        let session = vault.as_ref().ok_or(AppError::VaultLocked)?;
        (session.manifest_json(), session.master_key.clone())
    };
    let enc = encrypt_blob(&mk, json.as_bytes())?;
    fs::write(state.data_dir.join("vault_manifest.enc"), enc)?;
    Ok(())
}

fn put_vault_object(
    state: &AppState,
    logical_path: &str,
    data: &[u8],
    kind: &str,
) -> AppResult<String> {
    let object_id = Ulid::new().to_string();
    let (blob, entry) = {
        let mut vault = state.vault.lock();
        let session = vault.as_mut().ok_or(AppError::VaultLocked)?;
        let blob = encrypt_blob(&session.master_key, data)?;
        let entry = ManifestEntry {
            logical_path: logical_path.to_string(),
            object_id: object_id.clone(),
            kind: kind.into(),
            size_plain: data.len() as u64,
            updated_at: now_iso(),
            content_hash: None,
            deleted: false,
        };
        session
            .manifest
            .insert(logical_path.to_string(), entry.clone());
        (blob, entry)
    };
    fs::write(object_path(state, &entry.object_id), blob)?;
    persist_manifest(state)?;
    Ok(object_id)
}

fn sync_note_to_vault(state: &AppState, note: &Note) -> AppResult<()> {
    if state.vault.lock().is_none() {
        return Ok(());
    }
    let payload = notes::note_payload_bytes(note);
    let path = format!("notes/{}.json", note.id);
    let object_id = put_vault_object(state, &path, &payload, "note")?;
    notes::mark_synced(&state.db.lock(), &note.id, &object_id)?;
    Ok(())
}

fn pull_vault_notes(state: &AppState) -> AppResult<i32> {
    let entries: Vec<ManifestEntry> = {
        let vault = state.vault.lock();
        let session = vault.as_ref().ok_or(AppError::VaultLocked)?;
        session
            .manifest
            .values()
            .filter(|e| e.kind == "note" && !e.deleted)
            .cloned()
            .collect()
    };
    let mut count = 0;
    for entry in entries {
        let path = object_path(state, &entry.object_id);
        if !path.exists() {
            continue;
        }
        let blob = fs::read(path)?;
        let plain = {
            let vault = state.vault.lock();
            let session = vault.as_ref().ok_or(AppError::VaultLocked)?;
            decrypt_blob(&session.master_key, &blob)?
        };
        notes::import_note_from_payload(&state.db.lock(), &plain)?;
        count += 1;
    }
    Ok(count)
}
