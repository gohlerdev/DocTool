# DocTool — Data Model & SQLite Schema

**DB file:** `{app_data}/db/doctool.sqlite3`  
**Migrations:** `src-tauri/migrations/NNN_name.sql`  
**Journal mode:** WAL  

---

## 1. Principles

1. No secrets in SQLite (passwords, private keys, MK, DEKs).  
2. All primary keys ULID strings (sortable, distributed).  
3. Timestamps ISO-8601 UTC with millisecond precision.  
4. Migrations strictly append-only.  
5. FTS for notes search.

---

## 2. ER overview

```
notes 1──* note_labels
notes 1──* sync_queue (entity)
sftp_profiles (standalone metadata)
recents, bookmarks
vault_state (singleton)
app_meta (kv)
devices (optional singleton per install)
```

---

## 3. Schema v1

### 3.1 `app_meta`

```sql
CREATE TABLE app_meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
```

Keys:

| key | value example |
|-----|----------------|
| `schema_user_version` | mirrored |
| `theme` | `dark` \| `light` \| `system` |
| `autosave_seconds` | `30` |
| `onboarding_complete` | `1` |
| `device_id` | ULID |
| `idle_lock_minutes` | `15` |

### 3.2 `notes`

```sql
CREATE TABLE notes (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  body_json TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'default',
  pinned INTEGER NOT NULL DEFAULT 0 CHECK (pinned IN (0, 1)),
  archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1)),
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

CREATE INDEX idx_notes_updated ON notes(updated_at DESC);
CREATE INDEX idx_notes_pinned ON notes(pinned DESC, updated_at DESC);
CREATE INDEX idx_notes_sync ON notes(sync_status);
CREATE INDEX idx_notes_deleted ON notes(deleted_at);
```

`sync_status` enum (app-enforced):

`local_only` | `pending_upload` | `synced` | `pending_delete` | `conflict` | `error`

### 3.3 FTS

```sql
CREATE VIRTUAL TABLE notes_fts USING fts5(
  title,
  body_text,
  content='',
  tokenize='porter unicode61'
);

-- Maintain via triggers or app-level rebuild on upsert:
-- body_text = plain text extracted from Tiptap JSON
```

**v1 approach:** application updates `notes_fts` on each upsert/delete (simpler than triggers across platforms).

```sql
-- Example upsert FTS
INSERT INTO notes_fts(rowid, title, body_text) VALUES (...);
-- Use note id mapping table if needed:

CREATE TABLE notes_fts_map (
  note_id TEXT PRIMARY KEY,
  fts_rowid INTEGER NOT NULL
);
```

Simpler alternative: store `body_text` column on `notes` and:

```sql
CREATE VIRTUAL TABLE notes_fts USING fts5(
  title, body_text,
  content='notes',
  content_rowid='rowid'
);
```

Requires `notes` to have integer `rowid` (default) + external content sync triggers.

**Chosen for implementers:** add `body_text TEXT NOT NULL DEFAULT ''` column on `notes` + fts5 external content with triggers in migration `002_notes_fts.sql`.

### 3.4 `note_labels`

```sql
CREATE TABLE note_labels (
  note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  PRIMARY KEY (note_id, label)
);

CREATE INDEX idx_note_labels_label ON note_labels(label);
```

Labels normalized: trim, lower-case for uniqueness? **v1:** case-sensitive display; store as user typed; search case-insensitive in app.

### 3.5 `sftp_profiles`

```sql
CREATE TABLE sftp_profiles (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  host TEXT NOT NULL,
  port INTEGER NOT NULL DEFAULT 22,
  username TEXT NOT NULL,
  auth_type TEXT NOT NULL CHECK (auth_type IN ('password', 'key')),
  keychain_ref TEXT,
  private_key_ref TEXT,
  default_path TEXT,
  color TEXT,
  host_key_fingerprint TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### 3.6 `recents`

```sql
CREATE TABLE recents (
  uri TEXT PRIMARY KEY NOT NULL,
  title TEXT,
  opened_at TEXT NOT NULL
);

CREATE INDEX idx_recents_opened ON recents(opened_at DESC);
```

Keep last 100; prune on insert.

### 3.7 `bookmarks`

```sql
CREATE TABLE bookmarks (
  id TEXT PRIMARY KEY NOT NULL,
  uri TEXT NOT NULL,
  title TEXT,
  created_at TEXT NOT NULL
);
```

### 3.8 `sync_queue`

```sql
CREATE TABLE sync_queue (
  id TEXT PRIMARY KEY NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  op TEXT NOT NULL CHECK (op IN ('upsert', 'delete')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  next_attempt_at TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (entity_type, entity_id, op)
);
```

### 3.9 `vault_state` (singleton)

```sql
CREATE TABLE vault_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  configured INTEGER NOT NULL DEFAULT 0,
  drive_linked INTEGER NOT NULL DEFAULT 0,
  header_json TEXT,
  last_unlock_at TEXT,
  last_sync_at TEXT,
  last_error TEXT
);

INSERT INTO vault_state (id) VALUES (1);
```

`header_json` may cache last seen public header (not secret).

### 3.10 `transfers` (optional P1)

```sql
CREATE TABLE transfers (
  id TEXT PRIMARY KEY,
  direction TEXT NOT NULL, -- upload|download
  src_uri TEXT NOT NULL,
  dst_uri TEXT NOT NULL,
  status TEXT NOT NULL,
  bytes_done INTEGER NOT NULL DEFAULT 0,
  bytes_total INTEGER,
  error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

---

## 4. Migrations plan

| # | Name | Content |
|---|------|---------|
| 001 | init | all core tables |
| 002 | notes_fts | FTS + body_text |
| 003 | transfers | optional |

`PRAGMA user_version` set after each migration.

---

## 5. Domain types (TypeScript)

```ts
export type SyncStatus =
  | "local_only"
  | "pending_upload"
  | "synced"
  | "pending_delete"
  | "conflict"
  | "error";

export interface Note {
  id: string;
  title: string;
  body: unknown; // Tiptap JSON
  color: string;
  pinned: boolean;
  archived: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  contentHash?: string;
  remoteObjectId?: string;
  syncStatus: SyncStatus;
  labels: string[];
}

export interface DirEntry {
  name: string;
  path: string;
  isDir: boolean;
  size?: number;
  mtime?: string;
}
```

---

## 6. Backup / export (local)

P1: export all notes as zip of markdown + `notes.json` for disaster recovery **without** Drive. User-triggered; plaintext file user chooses — warn.

---

## 7. Integrity

- Nightly optional `PRAGMA integrity_check` on desktop idle (P2).  
- On migration failure: refuse start; show path to DB for support.
