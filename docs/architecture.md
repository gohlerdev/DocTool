# DocTool — System Architecture

**Version:** 1.0 · **Status:** Design complete · **Implements:** ADR-001, ADR-002

---

## 1. Goals of the architecture

1. One **shared Rust core** for crypto, SFTP, Drive I/O, SQLite on all platforms.  
2. One **React UI** with adaptive layouts (desktop vs mobile).  
3. **Strict boundaries**: UI cannot touch private keys, raw SSH, or plaintext vault keys.  
4. **URI-addressable resources** so editors do not care which backend holds bytes.  
5. **Offline-first notes**; vault is encrypted replica.  
6. **Extensible format adapters** without rewriting the shell.

---

## 2. Context diagram

```
                 ┌─────────────┐     ┌──────────────┐
                 │ Local disk  │     │ SFTP servers  │
                 │ (sandbox on │     │ (user hosts)  │
                 │  mobile)    │     └──────▲───────┘
                 └──────▲──────┘            │ SSH/SFTP
                        │                   │
┌──────────┐     ┌──────┴───────────────────┴──────┐     ┌─────────────┐
│  User    │────▶│           DocTool App            │────▶│ Google Drive│
│          │     │  UI (React)  │  Core (Rust)      │     │ (ciphertext)│
└──────────┘     └─────────────────────────────────┘     └─────────────┘
```

DocTool is a **client-only** system. No DocTool server in v1.

---

## 3. Container view

| Container | Technology | Responsibility |
|-----------|------------|----------------|
| UI process / WebView | React 19, TS, Vite | Presentation, editors, navigation |
| Core library | Rust, Tokio | Commands, domain logic, I/O |
| SQLite file | rusqlite | Notes, profiles metadata, sync queue |
| OS keychain | platform APIs | Passwords, keys, OAuth tokens, wrapped MK |
| Google Drive API | HTTPS OAuth | Blob storage only |
| SFTP endpoint | SSH | Remote files |

---

## 4. Layered core

```
commands/          ← IPC boundary (validate, map errors)
    ↓
domain/            ← pure-ish services (NotesService, VaultService, SourceRouter)
    ↓
infra/             ← SQLite, russh, reqwest Drive, local fs, keychain
    ↓
crypto/            ← ONLY place for KDF/AEAD/zeroize
```

### 4.1 Dependency rule

- `crypto` depends on nothing domain-specific.  
- `domain` may call `crypto` and traits, not raw `reqwest`.  
- `commands` call `domain` only.  
- Frontend calls `commands` only via `invoke`.

---

## 5. Source abstraction

Every readable/writable path is a **DocUri**:

| Scheme | Example | Backend |
|--------|---------|---------|
| `local` | `local:///home/dev/x.md` | LocalFsSource |
| `sftp` | `sftp://{profileId}/etc/hosts` | SftpSource |
| `vault` | `vault://objects/{objectId}` | VaultSource |
| `notes` | `notes://{noteId}` | Notes virtual (not raw bytes file) |

### 5.1 FileSource trait

```rust
#[async_trait]
pub trait FileSource: Send + Sync {
    async fn list(&self, path: &str) -> Result<Vec<DirEntry>, AppError>;
    async fn read(&self, path: &str) -> Result<Vec<u8>, AppError>;
    async fn write(&self, path: &str, data: &[u8]) -> Result<(), AppError>;
    async fn remove(&self, path: &str) -> Result<(), AppError>;
    async fn mkdir(&self, path: &str) -> Result<(), AppError>;
    async fn rename(&self, from: &str, to: &str) -> Result<(), AppError>;
    async fn stat(&self, path: &str) -> Result<FileStat, AppError>;
}
```

### 5.2 SourceRouter

Parses URI → dispatches to backend. Editors only call `SourceRouter::read/write(uri)`.

---

## 6. Document pipeline

```
Open URI
  → SourceRouter.read
  → sniff extension / MIME / magic
  → FormatRegistry.pick(adapter)
  → adapter.open(bytes) → EditorSession
  → user edits
  → session.getBytes()
  → SourceRouter.write
```

### 6.1 EditorSession contract

- Owns React view component (or handle).  
- Tracks dirty flag.  
- Serializes canonical bytes for the format.  
- `dispose()` releases PDF workers, CM instances, etc.

### 6.2 Large files

- Threshold `LARGE_FILE_BYTES` (default 8 MiB): stream to temp file under app cache; pass path to adapter; never hold full PDF twice in WASM/JS if avoidable.  
- SFTP: prefer ranged reads only if server supports; else full download to temp.

---

## 7. Frontend structure

```
src/
  app/
    AppShell.tsx          # desktop sidebar vs mobile tabs
    routes.tsx
    platform.ts           # detect tauri OS
  features/
    notes/
    files/
    editors/
      markdown/
      code/
      pdf/
      rich-note/
    vault/
    sftp/
    settings/
  shared/
    ui/
    hooks/
    lib/invoke.ts         # typed wrappers
    types/
  stores/
    workspace.ts          # open tabs
    ui.ts                 # theme, sidebar
```

### 7.1 State ownership

| State | Owner |
|-------|--------|
| Open tabs, active uri | Zustand `workspace` |
| Note list cache | TanStack Query `['notes', filter]` |
| Dir listing | TanStack Query `['fs', uri]` |
| Vault locked/unlocked | Query `['vault','status']` + events |
| Theme | Zustand + localStorage / SQLite pref |

### 7.2 Adaptive shell algorithm

```
if platform in (ios, android) OR width < 900:
  render MobileShell (bottom nav)
else:
  render DesktopShell (sidebar + tabs + optional inspector)
```

---

## 8. Cross-cutting: errors

```rust
pub enum AppError {
  Io { message: String },
  NotFound,
  PermissionDenied,
  AuthFailed,
  CryptoFailed,
  Network { message: String },
  Conflict { message: String },
  Validation { message: String },
  Internal { message: String },
}
```

Serialized to frontend as `{ code, message, details? }`.  
**Never** put key material, passwords, or full remote paths with credentials in `message`.

---

## 9. Events (core → UI)

| Event | Payload | When |
|-------|---------|------|
| `notes://changed` | `{ id? }` | note upsert/delete |
| `vault://locked` | `{}` | lock |
| `vault://unlocked` | `{}` | unlock |
| `sync://progress` | `{ pending, error? }` | queue tick |
| `sftp://transfer` | `{ id, frac, done }` | transfer |
| `sftp://host-key` | `{ profileId, fingerprint }` | TOFU needed |

---

## 10. Startup sequence

1. Init tracing (filter secrets).  
2. Resolve app data dir (platform-specific).  
3. Open SQLite; run migrations.  
4. Load preferences.  
5. Register plugins (opener, etc.).  
6. Emit ready; UI mounts.  
7. If biometric re-unlock enabled and wrapped MK present → optional prompt.  
8. Background: process sync_queue if vault session alive (usually not until unlock).

---

## 11. App data directories

| Platform | App data root (typical) |
|----------|-------------------------|
| Linux | `~/.local/share/com.doctool.app/` |
| macOS | `~/Library/Application Support/com.doctool.app/` |
| Android | app internal storage |
| iOS | app container |

Contents:

```
db/doctool.sqlite3
cache/tmp/
cache/sftp/
logs/                   # optional, rotated, no secrets
```

Vault ciphertext lives on **Drive**, not necessarily mirrored full local (optional local encrypted cache P2).

---

## 12. Security architecture (summary)

See [threat-model.md](./threat-model.md) and [vault-format.md](./vault-format.md).

Hard rules:

1. MK only in core process memory while unlocked; zeroize on lock.  
2. Optional: store **wrapped** MK in keychain for biometric unlock.  
3. SFTP private keys only in keychain.  
4. WebView CSP tightened before release.  
5. Capabilities: deny arbitrary shell; scope fs paths.

---

## 13. Extension points (post-v1)

- WebDAV / Nextcloud source  
- Cryptomator import  
- Windows target  
- CRDT collab  
- Plugin format adapters (WASM)  

---

## 14. Sequence: open remote markdown and save

```
UI                Commands           SourceRouter      SftpSource       Adapter
│ notes open file │                  │                 │                │
│──fs_read(uri)──▶│                  │                 │                │
│                 │──read───────────▶│──read──────────▶│                │
│                 │◀──── bytes ──────│◀──── bytes ─────│                │
│◀── bytes ───────│                  │                 │                │
│──open adapter───────────────────────────────────────────────────────▶│
│  edit...                                                             │
│──fs_write(uri, bytes)──▶│          │                 │                │
│                 │──write──────────▶│──write─────────▶│                │
│                 │◀──── ok ─────────│◀──── ok ────────│                │
│◀── ok ──────────│                  │                 │                │
```

---

## 15. Sequence: create note with dual-write

```
UI → notes_upsert → SQLite commit → enqueue sync_queue
                         │
                         ▼ (async worker, vault unlocked)
                  serialize note JSON → encrypt object → Drive upload
                         → update manifest → mark note Synced
```

Details: [notes-sync.md](./notes-sync.md).
