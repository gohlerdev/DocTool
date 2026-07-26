use crate::crypto::local_secrets::{is_sealed, open_secret, seal_secret};
use crate::db::{now_iso, Db};
use crate::error::{AppError, AppResult};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::path::Path;
use ulid::Ulid;

const BODY_PURPOSE: &str = "note.body";

fn seal_body(data_dir: &Path, note_id: &str, plaintext: &str) -> AppResult<String> {
    seal_secret(data_dir, &format!("{BODY_PURPOSE}.{note_id}"), plaintext)
}

fn open_body(data_dir: &Path, note_id: &str, stored: &str) -> AppResult<String> {
    if is_sealed(stored) {
        open_secret(data_dir, &format!("{BODY_PURPOSE}.{note_id}"), stored)
    } else {
        // Legacy plaintext migration path
        Ok(stored.to_string())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Note {
    pub id: String,
    pub title: String,
    pub body: serde_json::Value,
    pub color: String,
    pub pinned: bool,
    pub archived: bool,
    pub deleted_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub content_hash: Option<String>,
    pub remote_object_id: Option<String>,
    pub sync_status: String,
    pub labels: Vec<String>,
    pub last_error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteSummary {
    pub id: String,
    pub title: String,
    pub snippet: String,
    pub color: String,
    pub pinned: bool,
    pub archived: bool,
    pub updated_at: String,
    pub labels: Vec<String>,
    pub sync_status: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteUpsert {
    pub id: Option<String>,
    pub title: String,
    pub body: serde_json::Value,
    pub color: Option<String>,
    pub pinned: Option<bool>,
    pub archived: Option<bool>,
    pub labels: Option<Vec<String>>,
}

fn body_text(body: &serde_json::Value) -> String {
    fn walk(v: &serde_json::Value, out: &mut String) {
        match v {
            serde_json::Value::Object(map) => {
                if let Some(serde_json::Value::String(t)) = map.get("text") {
                    if !out.is_empty() {
                        out.push(' ');
                    }
                    out.push_str(t);
                }
                for val in map.values() {
                    walk(val, out);
                }
            }
            serde_json::Value::Array(arr) => {
                for item in arr {
                    walk(item, out);
                }
            }
            _ => {}
        }
    }
    let mut s = String::new();
    walk(body, &mut s);
    s
}

fn content_hash(title: &str, body: &serde_json::Value) -> String {
    let payload = serde_json::json!({"title": title, "body": body});
    let bytes = serde_json::to_vec(&payload).unwrap_or_default();
    let mut hasher = Sha256::new();
    hasher.update(&bytes);
    hex::encode(hasher.finalize())
}

fn snippet(text: &str) -> String {
    let t = text.trim();
    if t.chars().count() <= 120 {
        t.to_string()
    } else {
        t.chars().take(120).collect::<String>() + "…"
    }
}

fn labels_for(db: &Db, note_id: &str) -> AppResult<Vec<String>> {
    let mut stmt = db
        .conn()
        .prepare("SELECT label FROM note_labels WHERE note_id = ?1 ORDER BY label")?;
    let rows = stmt.query_map(params![note_id], |r| r.get(0))?;
    let mut labels = Vec::new();
    for row in rows {
        labels.push(row?);
    }
    Ok(labels)
}

fn set_labels(db: &Db, note_id: &str, labels: &[String]) -> AppResult<()> {
    db.conn()
        .execute("DELETE FROM note_labels WHERE note_id = ?1", params![note_id])?;
    for label in labels {
        let l = label.trim();
        if l.is_empty() {
            continue;
        }
        db.conn().execute(
            "INSERT OR IGNORE INTO note_labels(note_id, label) VALUES(?1, ?2)",
            params![note_id, l],
        )?;
    }
    Ok(())
}

fn row_to_note(_db: &Db, row: &rusqlite::Row<'_>) -> rusqlite::Result<Note> {
    let id: String = row.get(0)?;
    let body_json: String = row.get(2)?;
    let body: serde_json::Value =
        serde_json::from_str(&body_json).unwrap_or(serde_json::json!({"type":"doc","content":[]}));
    // labels filled later
    Ok(Note {
        id,
        title: row.get(1)?,
        body,
        color: row.get(4)?,
        pinned: row.get::<_, i64>(5)? != 0,
        archived: row.get::<_, i64>(6)? != 0,
        deleted_at: row.get(7)?,
        created_at: row.get(8)?,
        updated_at: row.get(9)?,
        content_hash: row.get(10)?,
        remote_object_id: row.get(11)?,
        sync_status: row.get(13)?,
        labels: vec![],
        last_error: row.get(15)?,
    })
}

const NOTE_COLS: &str = "id, title, body_json, body_text, color, pinned, archived, deleted_at, created_at, updated_at, content_hash, remote_object_id, remote_updated_at, sync_status, last_synced_at, last_error";

pub fn list_notes(
    db: &Db,
    query: Option<&str>,
    label: Option<&str>,
    archived: Option<bool>,
    include_deleted: bool,
) -> AppResult<Vec<NoteSummary>> {
    let mut sql = format!(
        "SELECT n.id, n.title, n.body_text, n.color, n.pinned, n.archived, n.updated_at, n.sync_status
         FROM notes n WHERE 1=1"
    );
    if !include_deleted {
        sql.push_str(" AND n.deleted_at IS NULL");
    }
    if let Some(a) = archived {
        sql.push_str(if a {
            " AND n.archived = 1"
        } else {
            " AND n.archived = 0"
        });
    }
    if label.is_some() {
        sql.push_str(" AND EXISTS (SELECT 1 FROM note_labels l WHERE l.note_id = n.id AND l.label = ?1)");
    }
    if query.map(|q| !q.trim().is_empty()).unwrap_or(false) {
        // simple LIKE search for reliability across fts setups
        sql.push_str(" AND (n.title LIKE ?2 OR n.body_text LIKE ?2)");
    }
    sql.push_str(" ORDER BY n.pinned DESC, n.updated_at DESC LIMIT 500");

    let mut stmt = db.conn().prepare(&sql)?;
    let qpat = query.map(|q| format!("%{}%", q.trim())).unwrap_or_default();

    let map_row = |r: &rusqlite::Row<'_>| {
        Ok((
            r.get::<_, String>(0)?,
            r.get::<_, String>(1)?,
            r.get::<_, String>(2)?,
            r.get::<_, String>(3)?,
            r.get::<_, i64>(4)? != 0,
            r.get::<_, i64>(5)? != 0,
            r.get::<_, String>(6)?,
            r.get::<_, String>(7)?,
        ))
    };

    let rows: Vec<_> = if label.is_some() && !qpat.is_empty() {
        let mapped = stmt.query_map(params![label.unwrap(), qpat], map_row)?;
        mapped.collect::<Result<Vec<_>, _>>()?
    } else if label.is_some() {
        let mapped = stmt.query_map(params![label.unwrap()], map_row)?;
        mapped.collect::<Result<Vec<_>, _>>()?
    } else if !qpat.is_empty() {
        let mut stmt2 = db.conn().prepare(
            "SELECT n.id, n.title, n.body_text, n.color, n.pinned, n.archived, n.updated_at, n.sync_status
             FROM notes n WHERE n.deleted_at IS NULL
             AND (n.title LIKE ?1 OR n.body_text LIKE ?1)
             ORDER BY n.pinned DESC, n.updated_at DESC LIMIT 500",
        )?;
        let mapped = stmt2.query_map(params![qpat], map_row)?;
        mapped.collect::<Result<Vec<_>, _>>()?
    } else {
        let mapped = stmt.query_map([], map_row)?;
        mapped.collect::<Result<Vec<_>, _>>()?
    };

    let mut out = Vec::new();
    for (id, title, body_text, color, pinned, archived, updated_at, sync_status) in rows {
        let labels = labels_for(db, &id)?;
        out.push(NoteSummary {
            id,
            title,
            snippet: snippet(&body_text),
            color,
            pinned,
            archived,
            updated_at,
            labels,
            sync_status,
        });
    }
    Ok(out)
}

pub fn get_note(db: &Db, data_dir: &Path, id: &str) -> AppResult<Note> {
    let mut stmt = db.conn().prepare(&format!(
        "SELECT {} FROM notes WHERE id = ?1",
        NOTE_COLS
    ))?;
    let mut note = stmt
        .query_row(params![id], |r| row_to_note(db, r))
        .map_err(|_| AppError::NotFound)?;
    // Decrypt body_json at rest
    if let Ok(serde_json::Value::String(s)) = serde_json::to_value(&note.body) {
        // body is already parsed Value — re-read raw from stored if needed
        let _ = s;
    }
    // Re-fetch raw body_json for decryption
    let raw: String = db.conn().query_row(
        "SELECT body_json FROM notes WHERE id=?1",
        params![id],
        |r| r.get(0),
    )?;
    let plain = open_body(data_dir, id, &raw)?;
    note.body = serde_json::from_str(&plain)
        .unwrap_or(serde_json::json!({"type":"doc","content":[]}));
    note.labels = labels_for(db, id)?;
    Ok(note)
}

pub fn upsert_note(db: &Db, data_dir: &Path, input: NoteUpsert) -> AppResult<Note> {
    let now = now_iso();
    let id = input.id.clone().unwrap_or_else(|| Ulid::new().to_string());
    let color = input.color.unwrap_or_else(|| "default".into());
    let pinned = input.pinned.unwrap_or(false);
    let archived = input.archived.unwrap_or(false);
    let labels = input.labels.unwrap_or_default();
    let body_plain =
        serde_json::to_string(&input.body).unwrap_or_else(|_| "{\"type\":\"doc\",\"content\":[]}".into());
    // Full body sealed at rest (AES-256-GCM device key)
    let body_json = seal_body(data_dir, &id, &body_plain)?;
    // Snippet index only (not full content) for list/search UX
    let mut btext = body_text(&input.body);
    if btext.chars().count() > 240 {
        btext = btext.chars().take(240).collect::<String>() + "…";
    }
    let chash = content_hash(&input.title, &input.body);

    let exists: bool = db
        .conn()
        .query_row(
            "SELECT COUNT(1) FROM notes WHERE id = ?1",
            params![id],
            |r| r.get::<_, i64>(0),
        )
        .map(|c| c > 0)?;

    if exists {
        db.conn().execute(
            "UPDATE notes SET title=?2, body_json=?3, body_text=?4, color=?5, pinned=?6, archived=?7,
             updated_at=?8, content_hash=?9, sync_status=CASE WHEN sync_status='synced' THEN 'pending_upload' ELSE sync_status END
             WHERE id=?1",
            params![
                id,
                input.title,
                body_json,
                btext,
                color,
                pinned as i64,
                archived as i64,
                now,
                chash
            ],
        )?;
    } else {
        db.conn().execute(
            "INSERT INTO notes (id, title, body_json, body_text, color, pinned, archived, created_at, updated_at, content_hash, sync_status)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?8,?9,'local_only')",
            params![
                id,
                input.title,
                body_json,
                btext,
                color,
                pinned as i64,
                archived as i64,
                now,
                chash
            ],
        )?;
    }
    set_labels(db, &id, &labels)?;

    // refresh fts
    let _ = db.conn().execute(
        "INSERT INTO notes_fts(notes_fts) VALUES('rebuild')",
        [],
    );

    // queue sync if vault was previously syncing
    let _ = db.conn().execute(
        "INSERT INTO sync_queue(id, entity_type, entity_id, op, created_at)
         VALUES(?1,'note',?2,'upsert',?3)
         ON CONFLICT(entity_type, entity_id, op) DO UPDATE SET created_at=excluded.created_at, attempts=0",
        params![Ulid::new().to_string(), id, now],
    );

    get_note(db, data_dir, &id)
}

pub fn delete_note(db: &Db, id: &str, hard: bool) -> AppResult<()> {
    if hard {
        db.conn()
            .execute("DELETE FROM notes WHERE id = ?1", params![id])?;
    } else {
        let now = now_iso();
        db.conn().execute(
            "UPDATE notes SET deleted_at=?2, updated_at=?2, sync_status='pending_delete' WHERE id=?1",
            params![id, now],
        )?;
        let _ = db.conn().execute(
            "INSERT INTO sync_queue(id, entity_type, entity_id, op, created_at)
             VALUES(?1,'note',?2,'delete',?3)
             ON CONFLICT(entity_type, entity_id, op) DO UPDATE SET created_at=excluded.created_at",
            params![Ulid::new().to_string(), id, now],
        );
    }
    Ok(())
}

pub fn note_payload_bytes(note: &Note) -> Vec<u8> {
    let v = serde_json::json!({
        "schema": 1,
        "id": note.id,
        "title": note.title,
        "body": note.body,
        "color": note.color,
        "pinned": note.pinned,
        "labels": note.labels,
        "archived": note.archived,
        "deleted_at": note.deleted_at,
        "created_at": note.created_at,
        "updated_at": note.updated_at,
    });
    serde_json::to_vec(&v).unwrap_or_default()
}

pub fn list_pending_sync(db: &Db) -> AppResult<Vec<String>> {
    let mut stmt = db.conn().prepare(
        "SELECT entity_id FROM sync_queue WHERE entity_type='note' ORDER BY created_at LIMIT 100",
    )?;
    let rows = stmt.query_map([], |r| r.get(0))?;
    let mut ids = Vec::new();
    for r in rows {
        ids.push(r?);
    }
    Ok(ids)
}

pub fn mark_synced(db: &Db, id: &str, object_id: &str) -> AppResult<()> {
    let now = now_iso();
    db.conn().execute(
        "UPDATE notes SET sync_status='synced', remote_object_id=?2, last_synced_at=?3, last_error=NULL WHERE id=?1",
        params![id, object_id, now],
    )?;
    db.conn().execute(
        "DELETE FROM sync_queue WHERE entity_type='note' AND entity_id=?1",
        params![id],
    )?;
    Ok(())
}

pub fn import_note_from_payload_dir(db: &Db, data_dir: &Path, payload: &[u8]) -> AppResult<Note> {
    let v: serde_json::Value =
        serde_json::from_slice(payload).map_err(|e| AppError::validation(e))?;
    let id = v
        .get("id")
        .and_then(|x| x.as_str())
        .ok_or_else(|| AppError::validation("missing id"))?
        .to_string();
    let title = v
        .get("title")
        .and_then(|x| x.as_str())
        .unwrap_or("")
        .to_string();
    let body = v
        .get("body")
        .cloned()
        .unwrap_or(serde_json::json!({"type":"doc","content":[]}));
    let color = v
        .get("color")
        .and_then(|x| x.as_str())
        .unwrap_or("default")
        .to_string();
    let pinned = v.get("pinned").and_then(|x| x.as_bool()).unwrap_or(false);
    let archived = v.get("archived").and_then(|x| x.as_bool()).unwrap_or(false);
    let labels: Vec<String> = v
        .get("labels")
        .and_then(|x| x.as_array())
        .map(|a| {
            a.iter()
                .filter_map(|x| x.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();
    let created = v
        .get("created_at")
        .and_then(|x| x.as_str())
        .unwrap_or(&now_iso())
        .to_string();
    let updated = v
        .get("updated_at")
        .and_then(|x| x.as_str())
        .unwrap_or(&created)
        .to_string();

    let existing = get_note(db, data_dir, &id).ok();
    if let Some(local) = existing {
        if local.updated_at >= updated && local.sync_status != "pending_upload" {
            return Ok(local);
        }
        if local.sync_status == "pending_upload" && local.updated_at > updated {
            let conflict = NoteUpsert {
                id: None,
                title: format!("{} (conflict)", title),
                body,
                color: Some(color),
                pinned: Some(false),
                archived: Some(archived),
                labels: Some({
                    let mut l = labels;
                    l.push("conflict".into());
                    l
                }),
            };
            return upsert_note(db, data_dir, conflict);
        }
    }

    upsert_note(
        db,
        data_dir,
        NoteUpsert {
            id: Some(id.clone()),
            title,
            body,
            color: Some(color),
            pinned: Some(pinned),
            archived: Some(archived),
            labels: Some(labels),
        },
    )?;
    db.conn().execute(
        "UPDATE notes SET created_at=?2, updated_at=?3, sync_status='synced' WHERE id=?1",
        params![id, created, updated],
    )?;
    get_note(db, data_dir, &id)
}

// ── Gap-closure helpers (Phase 8) ───────────────────────

pub fn list_all_labels(db: &Db) -> AppResult<Vec<String>> {
    let mut stmt = db.conn().prepare(
        "SELECT DISTINCT label FROM note_labels ORDER BY label COLLATE NOCASE",
    )?;
    let rows = stmt.query_map([], |r| r.get(0))?;
    let mut out = Vec::new();
    for r in rows {
        out.push(r?);
    }
    Ok(out)
}

pub fn restore_note(db: &Db, id: &str) -> AppResult<()> {
    let now = now_iso();
    let n = db.conn().execute(
        "UPDATE notes SET deleted_at=NULL, updated_at=?2, sync_status='pending_upload' WHERE id=?1 AND deleted_at IS NOT NULL",
        params![id, now],
    )?;
    if n == 0 {
        return Err(AppError::NotFound);
    }
    Ok(())
}

pub fn bulk_update(
    db: &Db,
    ids: &[String],
    pinned: Option<bool>,
    archived: Option<bool>,
    color: Option<&str>,
    delete: bool,
) -> AppResult<u32> {
    let mut count = 0u32;
    for id in ids {
        if delete {
            delete_note(db, id, false)?;
            count += 1;
            continue;
        }
        let now = now_iso();
        if let Some(p) = pinned {
            db.conn().execute(
                "UPDATE notes SET pinned=?2, updated_at=?3 WHERE id=?1 AND deleted_at IS NULL",
                params![id, p as i64, now],
            )?;
        }
        if let Some(a) = archived {
            db.conn().execute(
                "UPDATE notes SET archived=?2, updated_at=?3 WHERE id=?1 AND deleted_at IS NULL",
                params![id, a as i64, now],
            )?;
        }
        if let Some(c) = color {
            db.conn().execute(
                "UPDATE notes SET color=?2, updated_at=?3 WHERE id=?1 AND deleted_at IS NULL",
                params![id, c, now],
            )?;
        }
        count += 1;
    }
    Ok(count)
}

/// Soft-deleted notes (trash).
pub fn list_trash(db: &Db) -> AppResult<Vec<NoteSummary>> {
    let mut stmt = db.conn().prepare(
        "SELECT n.id, n.title, n.body_text, n.color, n.pinned, n.archived, n.updated_at, n.sync_status
         FROM notes n WHERE n.deleted_at IS NOT NULL
         ORDER BY n.updated_at DESC LIMIT 200",
    )?;
    let rows = stmt.query_map([], |r| {
        Ok((
            r.get::<_, String>(0)?,
            r.get::<_, String>(1)?,
            r.get::<_, String>(2)?,
            r.get::<_, String>(3)?,
            r.get::<_, i64>(4)? != 0,
            r.get::<_, i64>(5)? != 0,
            r.get::<_, String>(6)?,
            r.get::<_, String>(7)?,
        ))
    })?;
    let mut out = Vec::new();
    for row in rows {
        let (id, title, body_text, color, pinned, archived, updated_at, sync_status) = row?;
        let labels = labels_for(db, &id)?;
        out.push(NoteSummary {
            id,
            title,
            snippet: snippet(&body_text),
            color,
            pinned,
            archived,
            updated_at,
            labels,
            sync_status,
        });
    }
    Ok(out)
}

pub fn purge_old_trash(db: &Db, days: i64) -> AppResult<u32> {
    // ISO compare approximate: delete rows older than cutoff by updated_at when deleted
    let cutoff = chrono::Utc::now() - chrono::Duration::days(days);
    let cutoff_s = cutoff.to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
    let n = db.conn().execute(
        "DELETE FROM notes WHERE deleted_at IS NOT NULL AND deleted_at < ?1",
        params![cutoff_s],
    )?;
    Ok(n as u32)
}

/// Ranked search: title hits first, then body; optional highlight markers in snippet.
pub fn search_ranked(db: &Db, query: &str) -> AppResult<Vec<NoteSummary>> {
    let q = query.trim();
    if q.is_empty() {
        return list_notes(db, None, None, Some(false), false);
    }
    let like = format!("%{q}%");
    let mut stmt = db.conn().prepare(
        "SELECT n.id, n.title, n.body_text, n.color, n.pinned, n.archived, n.updated_at, n.sync_status,
                CASE
                  WHEN lower(n.title) = lower(?1) THEN 0
                  WHEN n.title LIKE ?2 THEN 1
                  WHEN n.body_text LIKE ?2 THEN 2
                  ELSE 3
                END AS rank
         FROM notes n
         WHERE n.deleted_at IS NULL AND n.archived = 0
           AND (n.title LIKE ?2 OR n.body_text LIKE ?2)
         ORDER BY rank ASC, n.pinned DESC, n.updated_at DESC
         LIMIT 200",
    )?;
    let rows = stmt.query_map(params![q, like], |r| {
        Ok((
            r.get::<_, String>(0)?,
            r.get::<_, String>(1)?,
            r.get::<_, String>(2)?,
            r.get::<_, String>(3)?,
            r.get::<_, i64>(4)? != 0,
            r.get::<_, i64>(5)? != 0,
            r.get::<_, String>(6)?,
            r.get::<_, String>(7)?,
        ))
    })?;
    let mut out = Vec::new();
    for row in rows {
        let (id, title, body_text, color, pinned, archived, updated_at, sync_status) = row?;
        let labels = labels_for(db, &id)?;
        let sn = highlight_snippet(&body_text, q);
        out.push(NoteSummary {
            id,
            title,
            snippet: sn,
            color,
            pinned,
            archived,
            updated_at,
            labels,
            sync_status,
        });
    }
    Ok(out)
}

fn highlight_snippet(text: &str, query: &str) -> String {
    let lower = text.to_lowercase();
    let q = query.to_lowercase();
    if let Some(pos) = lower.find(&q) {
        let start = pos.saturating_sub(40);
        let end = (pos + q.len() + 40).min(text.len());
        // char-boundary safe-ish for ASCII queries
        let slice: String = text.chars().skip(start).take(end.saturating_sub(start)).collect();
        let re = regex_lite_replace(&slice, query);
        return if start > 0 { format!("…{re}") } else { re };
    }
    snippet(text)
}

fn regex_lite_replace(hay: &str, query: &str) -> String {
    // Case-insensitive mark wrap without full regex crate
    let mut out = String::new();
    let mut rest = hay;
    let q_lower = query.to_lowercase();
    while let Some(pos) = rest.to_lowercase().find(&q_lower) {
        out.push_str(&rest[..pos]);
        let end = pos + query.len().min(rest.len() - pos);
        // match length by chars of query
        let matched: String = rest.chars().skip(pos).take(query.chars().count()).collect();
        out.push_str("«");
        out.push_str(&matched);
        out.push_str("»");
        rest = &rest[pos + matched.len()..];
    }
    out.push_str(rest);
    out
}

pub fn note_to_markdown(note: &Note) -> String {
    let mut md = String::new();
    if !note.title.is_empty() {
        md.push_str("# ");
        md.push_str(&note.title);
        md.push_str("\n\n");
    }
    if !note.labels.is_empty() {
        md.push_str(&format!("labels: {}\n\n", note.labels.join(", ")));
    }
    md.push_str(&body_text(&note.body));
    md.push('\n');
    md
}

pub fn save_version_snapshot(db: &Db, note_id: &str, title: &str, body_json: &str) -> AppResult<()> {
    // Ensure table
    db.conn().execute_batch(
        "CREATE TABLE IF NOT EXISTS note_versions (
           id TEXT PRIMARY KEY NOT NULL,
           note_id TEXT NOT NULL,
           title TEXT NOT NULL,
           body_json TEXT NOT NULL,
           created_at TEXT NOT NULL
         );
         CREATE INDEX IF NOT EXISTS idx_note_versions_note ON note_versions(note_id, created_at DESC);",
    )?;
    let id = Ulid::new().to_string();
    db.conn().execute(
        "INSERT INTO note_versions(id, note_id, title, body_json, created_at) VALUES(?1,?2,?3,?4,?5)",
        params![id, note_id, title, body_json, now_iso()],
    )?;
    // Keep last 10
    db.conn().execute(
        "DELETE FROM note_versions WHERE note_id=?1 AND id NOT IN (
           SELECT id FROM note_versions WHERE note_id=?1 ORDER BY created_at DESC LIMIT 10
         )",
        params![note_id],
    )?;
    Ok(())
}
