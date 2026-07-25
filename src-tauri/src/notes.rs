use crate::db::{now_iso, Db};
use crate::error::{AppError, AppResult};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use ulid::Ulid;

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

pub fn get_note(db: &Db, id: &str) -> AppResult<Note> {
    let mut stmt = db.conn().prepare(&format!(
        "SELECT {} FROM notes WHERE id = ?1",
        NOTE_COLS
    ))?;
    let mut note = stmt
        .query_row(params![id], |r| row_to_note(db, r))
        .map_err(|_| AppError::NotFound)?;
    note.labels = labels_for(db, id)?;
    Ok(note)
}

pub fn upsert_note(db: &Db, input: NoteUpsert) -> AppResult<Note> {
    let now = now_iso();
    let id = input.id.clone().unwrap_or_else(|| Ulid::new().to_string());
    let color = input.color.unwrap_or_else(|| "default".into());
    let pinned = input.pinned.unwrap_or(false);
    let archived = input.archived.unwrap_or(false);
    let labels = input.labels.unwrap_or_default();
    let body_json = serde_json::to_string(&input.body).unwrap_or_else(|_| "{\"type\":\"doc\",\"content\":[]}".into());
    let btext = body_text(&input.body);
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

    get_note(db, &id)
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

pub fn import_note_from_payload(db: &Db, payload: &[u8]) -> AppResult<Note> {
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

    let existing = get_note(db, &id).ok();
    if let Some(local) = existing {
        if local.updated_at >= updated && local.sync_status != "pending_upload" {
            return Ok(local);
        }
        if local.sync_status == "pending_upload" && local.updated_at > updated {
            // conflict: keep local, import remote as new
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
            return upsert_note(db, conflict);
        }
    }

    upsert_note(
        db,
        NoteUpsert {
            id: Some(id),
            title,
            body,
            color: Some(color),
            pinned: Some(pinned),
            archived: Some(archived),
            labels: Some(labels),
        },
    )?;
    // preserve timestamps best-effort
    db.conn().execute(
        "UPDATE notes SET created_at=?2, updated_at=?3, sync_status='synced' WHERE id=?1",
        params![
            v.get("id").and_then(|x| x.as_str()).unwrap_or(""),
            created,
            updated
        ],
    )?;
    get_note(db, v.get("id").and_then(|x| x.as_str()).unwrap_or(""))
}
