# DocTool — Extremely Detailed Implementation Plan

**Version:** 1.0  
**Date:** 2026-07-25  
**Repo:** https://github.com/gohlerdev/DocTool  
**License:** MIT  
**Branch:** `main`  
**Status:** Scaffold present; implementation not started beyond Hello World  

This document is the single source of truth for building DocTool. Implementers should follow phases in order. Do not skip security modules. Do not invent alternate crypto without updating §8 and threat model.

---

## Table of contents

1. [Vision & success criteria](#1-vision--success-criteria)  
2. [Locked product decisions](#2-locked-product-decisions)  
3. [Non-goals](#3-non-goals)  
4. [Platform matrix & parity](#4-platform-matrix--parity)  
5. [Competitive context](#5-competitive-context)  
6. [System architecture](#6-system-architecture)  
7. [Module catalog](#7-module-catalog)  
8. [Vault cryptography (WhatsApp-style)](#8-vault-cryptography-whatsapp-style)  
9. [Notes dual-sync](#9-notes-dual-sync)  
10. [SFTP subsystem](#10-sftp-subsystem)  
11. [Document format registry](#11-document-format-registry)  
12. [UI / UX specification](#12-ui--ux-specification)  
13. [Data model](#13-data-model)  
14. [IPC & Tauri command surface](#14-ipc--tauri-command-surface)  
15. [Repository layout (target)](#15-repository-layout-target)  
16. [Dependency plan](#16-dependency-plan)  
17. [Security & threat model](#17-security--threat-model)  
18. [Testing strategy](#18-testing-strategy)  
19. [CI/CD & release](#19-cicd--release)  
20. [Phased roadmap (task-level)](#20-phased-roadmap-task-level)  
21. [Risks, mitigations, open tech choices](#21-risks-mitigations-open-tech-choices)  
22. [Definition of Done (v1.0)](#22-definition-of-done-v10)  
23. [Appendix](#23-appendix)  

---

## 1. Vision & success criteria

### 1.1 One-sentence vision

DocTool is a **privacy-first, multi-platform documents workspace** that unifies local files, SFTP remotes, Keep-style notes, and a **zero-knowledge Google Drive vault**, with real editors for markdown, PDF, and developer document formats.

### 1.2 User personas

| Persona | Needs |
|---------|--------|
| **Dev on laptop** | Edit README/md on SFTP hosts; open YAML/JSON; PDF specs; quick notes |
| **Mobile capture** | Fast Keep-like notes; vault backup; open a remote config when needed |
| **Privacy-conscious** | Drive backup Google cannot read; recovery key offline; no telemetry by default |

### 1.3 v1.0 success criteria (must all pass)

1. App installs and runs on **Linux, macOS, Android, iOS** (dev/TestFlight/internal track OK for mobile).  
2. User creates a colored Keep-style note offline; note appears after restart.  
3. With vault unlocked, same note dual-writes encrypted blob to Google Drive; second device with password/recovery key restores it.  
4. User connects SFTP with key auth, browses, opens `README.md`, edits, saves remote.  
5. User opens a PDF, adds a highlight or text annotation, saves back to source.  
6. User edits local markdown with live preview and YAML front matter intact.  
7. MIT license and copyright notice present; repo public; no secrets in git history.  

---

## 2. Locked product decisions

| ID | Decision | Value |
|----|----------|--------|
| D1 | Platforms day 1 | Linux, macOS, iOS, Android |
| D2 | Shell / stack | Tauri 2 + React + TypeScript + Rust core |
| D3 | License | **MIT**, public repo, free; copyright © gohlerdev |
| D4 | Default branch | **`main`** |
| D5 | Vault recovery | **Password + offline recovery key** (no hosted HSM) |
| D6 | Notes sync | **Dual-write**: local SQLite always + encrypted Drive when vault available |
| D7 | SFTP | **First-class** (not deferred); connection profiles / planned servers |
| D8 | Drive encryption model | Client-side, WhatsApp E2EE-backup *intent*: cloud sees ciphertext only |
| D9 | Windows | Not day-1 requirement; architecture must not block later |
| D10 | Collaboration | Out of scope for v1 (no multi-user OT/CRDT) |

---

## 3. Non-goals (v1)

- Real-time collaborative editing (Google Docs style)  
- Full Microsoft Word / track-changes fidelity  
- Replacing Obsidian graph/PKM plugin ecosystem day one  
- Self-hosted DocTool backend or multi-tenant SaaS  
- Cryptomator vault format compatibility (possible later import)  
- Guaranteed background multi-GB SFTP on iOS  
- Built-in AI assistant (optional later; not blocking architecture)  

---

## 4. Platform matrix & parity

### 4.1 Capability parity

| Capability | Linux | macOS | Android | iOS |
|------------|-------|-------|---------|-----|
| Notes CRUD + search | Full | Full | Full | Full |
| Notes dual-sync vault | Full | Full | Full | Full |
| Markdown + code edit | Full | Full | Full | Full |
| Local filesystem browse | Full home/docs | Full | SAF / app storage | Files app / bookmarks |
| SFTP browse + text open/save | Full | Full | Full (simplified UI) | Full (simplified UI) |
| SFTP bulk transfer queue | Full | Full | Basic | Basic |
| PDF view | Full | Full | Full | Full |
| PDF edit (annotate/page ops) | Full | Full | Light annotate | Light annotate |
| Vault lock + biometric unlock | Password | Touch/Face ID | Biometric | Face/Touch ID |
| OAuth Google Drive | Desktop flow | Desktop flow | Mobile OAuth | ASWebAuthSession |
| Multi-tab workspace | Yes | Yes | Limited (stack) | Limited (stack) |
| Dual-pane file browser | Yes | Yes | No | No |

### 4.2 Adaptive shell

- **Desktop (≥900px width):** left source sidebar, center tabs, optional right inspector.  
- **Mobile:** bottom navigation — **Notes | Files | Vault | Settings**; stack navigation for editors.  
- Shared React components; layout chosen via breakpoint + Tauri platform detect (`iOS`/`android`/`linux`/`macos`).

### 4.3 Mobile constraints (design for them early)

| Constraint | Mitigation |
|------------|------------|
| iOS sandbox | Document picker + security-scoped bookmarks for external folders |
| Android storage | Storage Access Framework; scoped storage |
| Background limits | Explicit transfer screen; no silent multi-hour jobs on iOS |
| Soft keyboard | Editor chrome collapses; toolbar above keyboard |
| App Store crypto export | Use standard AES/Argon2; document in App Privacy; no custom export-restricted crypto |
| Large WebView memory | Virtualize note grids; page PDF; stream SFTP reads |

---

## 5. Competitive context

| Product | Strength | DocTool differentiator |
|---------|----------|------------------------|
| Obsidian | PKM, plugins | SFTP + E2EE Drive + Keep notes + PDF edit in one app |
| Joplin | E2EE sync, open source | Stronger multi-source file browser + PDF + SFTP |
| Google Keep | Mobile notes UX | Privacy vault, files, markdown, SFTP |
| Cryptomator | Zero-knowledge cloud | Integrated editors/notes, not vault-only |
| FileZilla / Cyberduck | SFTP | Documents + notes + vault, not transfer-only |
| Adobe PDF | PDF power | Lightweight annotate + unified workspace |

**Wedge:** multi-source file graph + format-aware editors + Keep notes + zero-knowledge Drive, multi-platform day one.

---

## 6. System architecture

### 6.1 High-level diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                     Adaptive React UI                             │
│  NotesHub · FilesBrowser · Editors · VaultUI · Settings           │
└────────────────────────────┬─────────────────────────────────────┘
                             │  @tauri-apps/api invoke / events
┌────────────────────────────▼─────────────────────────────────────┐
│                     Rust Core (shared all OS)                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │ source   │ │ document │ │ notes    │ │ vault    │ │ crypto  │ │
│  │ hub      │ │ registry │ │ service  │ │ service  │ │ module  │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬────┘ │
│       │            │            │            │            │      │
│  local │ sftp │  adapters    sqlite      drive API     argon2    │
│  fs    │ russh│  md/pdf/…    FTS5        encrypt I/O   aes-gcm   │
└────────┴──────┴─────────────┴────────────┴────────────┴──────────┘
                             │
        platform adapters: keychain · biometrics · OAuth · paths
```

### 6.2 Core design rules

1. **UI never implements crypto, SFTP, or raw Drive upload.** Only Rust.  
2. **All file locations are URIs:**  
   - `local://…`  
   - `sftp://{profileId}/…`  
   - `vault://objects/{id}`  
   - `notes://{noteId}`  
3. **Document adapters** are pure: `bytes in → session → bytes out`.  
4. **Sources** implement a common trait/interface.  
5. **Offline-first notes:** SQLite is source of truth; vault is encrypted replica.  
6. **Capability-based Tauri permissions** — least privilege per command.  

### 6.3 Frontend architecture

```
src/
  app/                 # shell, routing, platform layout
  features/
    notes/
    files/
    editors/
      markdown/
      code/
      pdf/
      rich/
    vault/
    sftp/
    settings/
  shared/
    ui/                # buttons, lists, sheets
    hooks/
    lib/               # invoke wrappers, types
  stores/              # zustand
```

- **Routing:** React Router or TanStack Router; deep links `doctool://` later.  
- **State:** Zustand for UI; TanStack Query for async lists (dir listings, note queries).  
- **Styling:** Tailwind CSS + CSS variables; dark mode default with system follow.  

### 6.4 Backend (Rust) architecture

```
src-tauri/src/
  lib.rs                 # entry, plugin register
  commands/              # thin IPC wrappers
  domain/
    source.rs            # FileSource trait
    document.rs
    note.rs
    vault.rs
  infra/
    local_fs.rs
    sftp.rs
    sqlite.rs
    drive.rs
    keychain.rs
  crypto/
    kdf.rs
    aead.rs
    vault_format.rs
  error.rs
```

---

## 7. Module catalog

### 7.1 SourceHub

**Responsibility:** list/read/write/rename/mkdir/remove across backends.

| Backend | Implementation | Notes |
|---------|----------------|-------|
| Local | `tauri-plugin-fs` + Rust path checks | Desktop full; mobile via pickers + bookmarks |
| SFTP | `russh` + SFTP subsystem | Connection pool per profile |
| Vault | crypto + Drive blob store | Paths are logical; physical = object IDs |

**Interface (conceptual Rust):**

```rust
#[async_trait]
trait FileSource: Send + Sync {
    async fn list(&self, path: &str) -> Result<Vec<DirEntry>>;
    async fn read(&self, path: &str) -> Result<Vec<u8>>;
    async fn write(&self, path: &str, data: &[u8]) -> Result<()>;
    async fn remove(&self, path: &str) -> Result<()>;
    async fn mkdir(&self, path: &str) -> Result<()>;
    async fn rename(&self, from: &str, to: &str) -> Result<()>;
    async fn stat(&self, path: &str) -> Result<FileStat>;
}
```

### 7.2 DocumentHub

**Responsibility:** pick adapter, open session, track dirty state, serialize on save.

| Adapter | View | Edit | Priority |
|---------|------|------|----------|
| Markdown | Preview GFM | CodeMirror 6 source + preview | P0 |
| Plain/Code | Syntax | CodeMirror 6 | P0 |
| Config yaml/json/toml | Syntax | CodeMirror 6 + optional schema | P0 |
| PDF | PDF.js | pdf-lib annotate/page ops | P0 |
| Rich note body | Tiptap | Tiptap | P0 |
| HTML | Sandboxed | Optional source | P1 |
| CSV | Grid | Grid | P1 |
| DOCX | mammoth HTML | Limited / export | P1 |
| ipynb | Cells | Light | P1 |
| Images | Viewer | — | P0 view |
| xlsx/pptx | Text/preview | — | P2 |

### 7.3 NotesHub

- Keep-style cards: title, body (Tiptap JSON), color, pin, labels, checklist, archived, trash.  
- FTS5 search.  
- Dual-sync engine (see §9).  
- Export note → markdown file on any source.  

### 7.4 VaultHub

- Create/unlock/lock vault.  
- Password set/change; recovery key generate/show once/verify.  
- Manifest CRUD; object put/get/delete.  
- Drive OAuth link/unlink.  
- Integrity check / reindex.  

### 7.5 SettingsHub

- Theme, editor fonts, autosave interval.  
- SFTP profiles (planned connections).  
- Vault status, recovery key “I have saved it” attestation.  
- Privacy: no analytics default; optional later.  
- About / license / version.  

---

## 8. Vault cryptography (WhatsApp-style)

### 8.1 Intent (what we copy from WhatsApp E2EE backups)

| Property | DocTool |
|----------|---------|
| Encrypt on device before cloud | Yes |
| Cloud provider cannot read content | Yes (zero-knowledge to Google) |
| User secret | Password **or** recovery key |
| Lose secrets ⇒ data gone | Yes (by design) |
| Hosted HSM key vault | **No** (v1) — offline recovery key only |

### 8.2 Algorithms (v1 fixed; versioned)

| Purpose | Algorithm |
|---------|-----------|
| Password KDF | Argon2id (params versioned in vault header; start: m=64MiB, t=3, p=1 — tune per mobile) |
| File encryption | AES-256-GCM |
| Nonce | 96-bit random unique per encryption |
| Key wrapping | AES-256-GCM or AES-KW for DEKs |
| Filename/path obfuscation | HMAC-SHA256 path IDs + encrypted display name in manifest |
| Manifest | Single encrypted JSON blob (or chunked later) |
| Content hashing | SHA-256 of ciphertext for integrity listing |

### 8.3 Key hierarchy

```
User Password ──Argon2id──► MK (Master Key, 256-bit)
Recovery Key  ──(direct or KDF)──► same MK unwrap capability

MK ──wraps──► Vault Key VK (optional intermediate; can use MK as VK in v1)

Per file:
  random DEK ──AES-GCM──► plaintext file bytes
  DEK wrapped with VK stored in manifest entry
```

**Recovery key format:** 256 bits entropy, displayed as grouped base32 (user-friendly “long key” similar to 64-digit hex). Shown **once** at vault creation; user must confirm storage (checkbox + typed prefix).

### 8.4 On-disk / Drive layout

```
Google Drive (appDataFolder or user-chosen folder DocToolVault/)
  vault.header.json          # public: version, kdf params, salt, mk wrap verification blob
  vault.manifest.enc         # encrypted index
  objects/
    {object_id}.bin          # ciphertext only
  vault.recovery.check       # optional: can verify recovery key without full unlock
```

`vault.header.json` is **not secret** but must not include plaintext paths or DEKs.

### 8.5 Unlock flow

1. User enters password or recovery key.  
2. Derive/load MK.  
3. Verify against header verification blob.  
4. Decrypt manifest into memory.  
5. Keep MK in secure memory / OS keychain session until lock or timeout.  
6. Mobile: optional biometric re-unlock of **wrapped MK** stored in Keychain/Keystore (MK itself not stored unwrapped at rest).  

### 8.6 Lock flow

1. Zeroize MK/VK in memory.  
2. Drop decrypted manifest.  
3. Close open vault:// tabs or mark read-only until re-unlock.  
4. Cancel pending vault uploads (or finish current then lock — prefer finish with timeout).  

### 8.7 Password change

1. Unlock with old password.  
2. Re-wrap VK/MK materials with new password KDF.  
3. Recovery key **unchanged** (still unwraps MK) unless user rotates recovery key explicitly.  

### 8.8 Crypto module boundaries

- Single crate module `crypto/` — no AES elsewhere.  
- Property tests: round-trip, wrong password fails, nonce uniqueness, large file streaming encrypt (chunked AEAD with documented framing if needed).  
- Prefer `ring` or `aes-gcm` + `argon2` crates; audit versions in CI.  

### 8.9 Streaming large files

For files > N MB (e.g. 8MB):

- Chunked encryption frame: `version | chunk_index | nonce | ciphertext+tag`  
- Or encrypt whole file via temp local file then upload (simpler v1; streaming P1).  

**v1 recommendation:** whole-object encrypt via temp file for simplicity; stream later.

---

## 9. Notes dual-sync

### 9.1 Principles

1. **Local SQLite is authoritative for UX latency.**  
2. **Vault holds encrypted replicas** when linked + unlocked.  
3. Never block note create on network.  
4. Sync is **per-note** not full DB dump (privacy + efficiency).  

### 9.2 Per-note payload (before encrypt)

```json
{
  "id": "ulid",
  "schema": 1,
  "title": "...",
  "body": { "type": "doc", "content": [] },
  "color": "default",
  "pinned": false,
  "labels": ["work"],
  "checklist": [],
  "created_at": "ISO-8601",
  "updated_at": "ISO-8601",
  "deleted_at": null,
  "archived": false
}
```

Encrypted as vault object; manifest maps `note:{id}` → object_id, updated_at, content hash.

### 9.3 Sync state machine (per note)

```
LocalOnly
  → PendingUpload (dirty + vault available)
  → Synced
  → PendingUpload (edited again)
  → PendingDelete (trashed + synced before)
  → Tombstoned on vault + local purge after grace
```

### 9.4 Conflict resolution

| Case | Rule |
|------|------|
| Local `updated_at` > remote | Upload local (overwrite remote object) |
| Remote `updated_at` > local | Download decrypt apply local |
| Equal timestamps, different hash | Prefer local; create `title (conflict copy)` from remote |
| Note deleted local, remote newer edit | Keep remote; clear local delete (or offer UI — v1 auto keep remote if remote newer) |

Store `sync_status`, `last_synced_at`, `remote_object_id`, `content_hash` on local row.

### 9.5 Sync triggers

- Vault unlock  
- Note save (debounced 1–2s)  
- App foreground  
- Manual “Sync now”  
- Connectivity restored  

### 9.6 Queue

SQLite table `sync_queue (id, note_id, op, attempts, last_error, next_attempt_at)`.  
Exponential backoff; surface errors in Vault/Notes UI.

### 9.7 Multi-device

Device A and B both dual-write same vault. Manifest is source of remote truth. Optimistic local edits; pull on unlock/foreground.

---

## 10. SFTP subsystem

### 10.1 Profiles (“planned connections”)

```json
{
  "id": "ulid",
  "name": "prod-box",
  "host": "example.com",
  "port": 22,
  "username": "deploy",
  "auth": "key" | "password",
  "key_ref": "keychain:…",
  "default_path": "/var/www",
  "color": "#…",
  "created_at": "…"
}
```

Secrets **only** in OS keychain / Android Keystore / iOS Keychain — never SQLite plaintext.

### 10.2 Features P0

- Add/edit/delete profile  
- Connect / disconnect  
- Host key TOFU (trust on first use) + fingerprint display  
- List directory, breadcrumb, sort, show hidden toggle  
- Open file → DocumentHub  
- Save back (write temp `.doctool.tmp` + rename if server allows; else direct write)  
- Upload / download single file  
- Mkdir, rename, delete with confirm  

### 10.3 Features P1

- Transfer queue multi-file  
- Conflict on mtime  
- Jump hosts (ProxyJump)  
- Keepalive / auto-reconnect  
- Dual-pane desktop  

### 10.4 Implementation

- Crate: `russh` + `russh-sftp` (or equivalent maintained stack).  
- One session manager: `HashMap<ProfileId, Session>`.  
- Idle timeout configurable (default 10 min).  
- Cancelable list/read via async drop.  
- Never log private key material.  

### 10.5 Mobile UX

- Profiles list → path stack → file open full-screen editor.  
- Long-press file actions sheet.  
- Warn on cellular for large downloads.  

---

## 11. Document format registry

### 11.1 Registry API (TS)

```ts
interface DocumentAdapter {
  id: string;
  canHandle(meta: FileMeta): boolean;
  priority: number;
  open(bytes: Uint8Array, meta: FileMeta): Promise<EditorSession>;
}

interface EditorSession {
  render: React.ComponentType;
  isDirty(): boolean;
  getBytes(): Promise<Uint8Array>;
  dispose(): void;
}
```

### 11.2 Markdown (P0) — detailed

- **Editor:** CodeMirror 6 `@codemirror/lang-markdown`  
- **Preview:** `react-markdown` + `remark-gfm` + `rehype-highlight`  
- Modes: split (desktop), tabbed edit/preview (mobile), optional WYSIWYG later  
- Preserve: line endings, front matter, unknown syntax  
- Autosave: interval + on blur + on tab close confirm if dirty  
- Features: task lists, tables, footnotes optional P1  

### 11.3 Code / config (P0)

- Languages: rs, ts/tsx, js, py, go, java, sh, sql, yaml, json, toml, ini, env, xml, html, css, md  
- Extensions map table in registry  
- Line numbers, search, indent detection  

### 11.4 PDF (P0/P1)

**View (P0):** PDF.js render, page nav, zoom, search text if available.  

**Edit (P0 desktop / light mobile):**

- Highlight, sticky note, free-text annotation  
- Rotate page, delete page, reorder (desktop)  
- Merge/split (desktop)  
- Fill AcroForm fields if present  
- Save incremental if possible; else full rewrite via pdf-lib  

**Not v1:** OCR, complex reflow, full desktop publishing.

### 11.5 DOCX (P1)

- View: mammoth.js → HTML sandbox  
- Edit: not round-trip; “Export as markdown” path  

### 11.6 CSV (P1)

- Parse with streaming-aware parser  
- Editable grid; export CSV with original delimiter detection  

---

## 12. UI / UX specification

### 12.1 Navigation

**Desktop**

```
┌────────────┬─────────────────────────────┬──────────┐
│ Sources    │ Tabs                        │ Inspector│
│ · Notes    │ [md] [pdf] [note]           │ meta     │
│ · Local    │                             │ outline  │
│ · SFTP…    │   Editor canvas             │ labels   │
│ · Vault    │                             │ sync     │
│ · Search   │                             │          │
└────────────┴─────────────────────────────┴──────────┘
```

**Mobile**

```
┌─────────────────────────┐
│  Top bar: title · actions│
│                         │
│  Content                │
│                         │
├─────────────────────────┤
│ Notes  Files  Vault  ⚙  │
└─────────────────────────┘
```

### 12.2 Notes (Keep-like)

- Masonry/grid of cards  
- Colors: default, red, orange, yellow, green, teal, blue, purple, gray  
- Pin section at top  
- Labels as chips; filter by label  
- Multi-select → archive / delete / change color  
- FAB “New note”  
- Editor: title field + Tiptap body + checklist toggle  
- Swipe archive (mobile)  

### 12.3 Command palette (desktop P0, mobile P1)

- Ctrl/Cmd+K  
- New note, open recent, connect SFTP profile, lock vault, settings  

### 12.4 Empty states

- No notes: illustration + “Create your first note”  
- No SFTP: “Add a server”  
- Vault locked: unlock form  
- Vault not configured: setup wizard  

### 12.5 Accessibility

- Focus rings, ARIA labels on icon buttons  
- Keyboard: arrows in lists, Esc close, standard editor shortcuts  
- Dynamic type-ish scaling on mobile via rem  

### 12.6 Theming

- Dark default  
- Light + system  
- Accent color setting  
- Respect `prefers-reduced-motion`  

---

## 13. Data model

### 13.1 SQLite schema (v1)

```sql
-- app_meta
CREATE TABLE app_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- notes
CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  body_json TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'default',
  pinned INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  content_hash TEXT,
  remote_object_id TEXT,
  sync_status TEXT NOT NULL DEFAULT 'local_only',
  last_synced_at TEXT
);

CREATE VIRTUAL TABLE notes_fts USING fts5(
  title, body_text, content='notes', content_rowid='rowid'
);

CREATE TABLE note_labels (
  note_id TEXT NOT NULL,
  label TEXT NOT NULL,
  PRIMARY KEY (note_id, label)
);

-- sftp
CREATE TABLE sftp_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  host TEXT NOT NULL,
  port INTEGER NOT NULL DEFAULT 22,
  username TEXT NOT NULL,
  auth_type TEXT NOT NULL,
  keychain_ref TEXT,
  default_path TEXT,
  color TEXT,
  host_key_fingerprint TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- recent & bookmarks
CREATE TABLE recents (
  uri TEXT PRIMARY KEY,
  title TEXT,
  opened_at TEXT NOT NULL
);

CREATE TABLE bookmarks (
  id TEXT PRIMARY KEY,
  uri TEXT NOT NULL,
  title TEXT,
  created_at TEXT NOT NULL
);

-- sync
CREATE TABLE sync_queue (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL, -- 'note'
  entity_id TEXT NOT NULL,
  op TEXT NOT NULL,           -- 'upsert' | 'delete'
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  next_attempt_at TEXT,
  created_at TEXT NOT NULL
);

-- vault local state (no secrets)
CREATE TABLE vault_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  configured INTEGER NOT NULL DEFAULT 0,
  drive_linked INTEGER NOT NULL DEFAULT 0,
  header_json TEXT,
  last_unlock_at TEXT,
  last_sync_at TEXT
);
```

### 13.2 Migrations

- Use versioned SQL migrations in `src-tauri/migrations/`  
- Apply on startup; never delete migration files  

---

## 14. IPC & Tauri command surface

Commands are thin; validation in Rust.

### 14.1 Notes

| Command | Args | Returns |
|---------|------|---------|
| `notes_list` | filter | `NoteSummary[]` |
| `notes_get` | id | `Note` |
| `notes_upsert` | note | `Note` |
| `notes_delete` | id, hard? | ok |
| `notes_search` | query | `NoteSummary[]` |
| `notes_sync_now` | — | `SyncReport` |

### 14.2 Sources / files

| Command | Args | Returns |
|---------|------|---------|
| `fs_list` | uri | `DirEntry[]` |
| `fs_read` | uri | `bytes` (or path to temp for large) |
| `fs_write` | uri, bytes | ok |
| `fs_mkdir` | uri | ok |
| `fs_remove` | uri | ok |
| `fs_rename` | from, to | ok |

### 14.3 SFTP

| Command | Args | Returns |
|---------|------|---------|
| `sftp_profiles_list` | — | profiles (no secrets) |
| `sftp_profile_save` | profile + secret once | id |
| `sftp_profile_delete` | id | ok |
| `sftp_connect` | id | ok / host key prompt |
| `sftp_disconnect` | id | ok |
| `sftp_trust_host_key` | id, fingerprint | ok |

### 14.4 Vault

| Command | Args | Returns |
|---------|------|---------|
| `vault_status` | — | status struct |
| `vault_create` | password | recovery_key (once) |
| `vault_unlock` | password **or** recovery_key | ok |
| `vault_lock` | — | ok |
| `vault_link_drive` | — | oauth start |
| `vault_unlink_drive` | — | ok |
| `vault_change_password` | old, new | ok |
| `vault_rotate_recovery_key` | password | new recovery_key once |

### 14.5 Events (Rust → UI)

- `sync://progress`  
- `sftp://transfer`  
- `vault://locked`  
- `notes://changed`  

---

## 15. Repository layout (target)

```
DocTool/
├── LICENSE
├── README.md
├── package.json
├── index.html
├── vite.config.ts
├── tsconfig.json
├── docs/
│   ├── PLAN.md                 # this file
│   ├── threat-model.md         # expand from §17
│   ├── vault-format.md         # binary/JSON formats
│   ├── ipc.md                  # generated or hand-maintained command docs
│   └── ui/
│       └── wireframes.md
├── src/
│   ├── app/
│   ├── features/
│   ├── shared/
│   ├── stores/
│   ├── main.tsx
│   └── App.tsx
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── capabilities/
│   ├── icons/
│   ├── migrations/
│   └── src/
│       ├── lib.rs
│       ├── main.rs
│       ├── commands/
│       ├── domain/
│       ├── infra/
│       └── crypto/
├── scripts/
│   ├── check.sh
│   └── gen-icons.sh
└── .github/
    └── workflows/
        ├── ci.yml
        └── release.yml
```

---

## 16. Dependency plan

### 16.1 Frontend (add progressively)

| Package | Purpose | Phase |
|---------|---------|-------|
| `tailwindcss` + postcss | styling | 0 |
| `zustand` | UI state | 0 |
| `@tanstack/react-query` | async | 0 |
| `react-router-dom` or TanStack Router | routing | 0 |
| `@tauri-apps/plugin-fs` | FS (where applicable) | 0 |
| `@tauri-apps/plugin-sql` | optional; prefer Rust SQL | 0–1 |
| `@tauri-apps/plugin-stronghold` or keyring via Rust | secrets | 3 |
| `@uiw/react-codemirror` + langs | editors | 1 |
| `react-markdown` `remark-gfm` | preview | 1 |
| `@tiptap/react` + starter-kit | notes rich | 2 |
| `pdfjs-dist` | PDF view | 4 |
| `pdf-lib` | PDF edit | 4 |
| `mammoth` | DOCX view | 6 |
| `date-fns` or `dayjs` | dates | 2 |
| `ulid` / `nanoid` | ids | 1 |
| `clsx` `tailwind-merge` | classnames | 0 |
| `lucide-react` | icons | 0 |

### 16.2 Rust

| Crate | Purpose | Phase |
|-------|---------|-------|
| `tauri` 2 | shell | 0 |
| `serde` `serde_json` | IPC | 0 |
| `thiserror` `anyhow` | errors | 0 |
| `tokio` | async | 0 |
| `rusqlite` or `sqlx` | DB | 1 |
| `argon2` | KDF | 5 |
| `aes-gcm` `rand` | AEAD | 5 |
| `sha2` `hmac` `hkdf` | hashing | 5 |
| `russh` + sftp | SFTP | 3 |
| `reqwest` | Drive HTTP | 5 |
| `keyring` | secrets | 3 |
| `zeroize` | wipe keys | 5 |
| `ulid` | ids | 1 |
| `chrono` | time | 1 |
| `base64` `hex` `data-encoding` | encodings | 5 |
| `tracing` | logs (no secrets) | 0 |

### 16.3 Google Drive

- OAuth 2.0 PKCE  
- Scopes: minimal — `drive.appdata` preferred; or `drive.file` for user-visible folder  
- Tokens in keychain  
- Store client id via config; **never commit client secret** if using confidential client — prefer public native PKCE client  

---

## 17. Security & threat model

### 17.1 Assets

- Note contents, local files opened in app, SFTP file contents, vault plaintext when unlocked, SFTP credentials, Drive OAuth tokens, MK/DEKs  

### 17.2 Adversaries

| Adversary | Goal | Mitigation |
|-----------|------|------------|
| Google / Drive breach | Read backups | Client-side E2EE |
| Network attacker | MITM SFTP/Drive | SSH host keys; TLS |
| Local malware (unlocked) | Read memory | Partial only; document residual risk |
| Local malware (locked) | Read vault | Encrypted at rest; keychain |
| Curious roommate | Open app | Optional app PIN / biometric gate P1 |
| Supply chain | Malicious dep | lockfiles, audit CI |

### 17.3 Explicit non-protections

- Compromised unlocked device  
- User screenshots / notifications showing note titles (minimize titles in notifs)  
- User who loses password **and** recovery key  

### 17.4 Secure coding checklist

- [ ] Path canonicalization; reject `..` escapes on local  
- [ ] SQLite parameterized queries only  
- [ ] No secret logging (`tracing` redaction)  
- [ ] WebView CSP tightened before release  
- [ ] Tauri capabilities least privilege  
- [ ] Host key verification for SSH  
- [ ] Certificate pinning optional P2 for Drive  
- [ ] Memory zeroize for keys  
- [ ] Clipboard clear option for recovery key screen  

---

## 18. Testing strategy

### 18.1 Layers

| Layer | Tools | What |
|-------|-------|------|
| Rust unit | `cargo test` | crypto KAT, path utils, manifest parse |
| Rust integration | testcontainers OpenSSH | SFTP list/read/write |
| TS unit | vitest | pure UI helpers, adapters serialize |
| Component | vitest + testing-library | note card, lists |
| E2E desktop | Playwright + Tauri if available, or manual scripts | open-edit-save |
| Crypto | known vectors | argon2 + aes-gcm roundtrip |
| Sync | simulated clock | conflict matrix §9.4 |

### 18.2 Fixtures

```
testdata/
  markdown/sample.md
  pdf/form.pdf
  crypto/vectors.json
```

### 18.3 Minimum CI gates

- `npm run build` (tsc + vite)  
- `cargo test`  
- `cargo clippy -D warnings`  
- `npm test` once vitest added  
- license header / secret scan  

---

## 19. CI/CD & release

### 19.1 GitHub Actions

**ci.yml:** on PR/push to `main` — install node+rust, build frontend, check/test rust, lint.  

**release.yml:** tags `v*` — build Linux artifacts; macOS/iOS need macOS runners; Android SDK build AAB.  

### 19.2 Versioning

Semver: `0.x` until feature-complete v1.  
App version = package.json = Cargo.toml = tauri.conf.json (script to sync).  

### 19.3 Distribution

| Platform | Channel |
|----------|---------|
| Linux | `.deb` / AppImage / Flathub later |
| macOS | DMG + notarization later |
| Android | Play internal testing / direct APK |
| iOS | TestFlight |

### 19.4 Mobile init (developer machines)

```bash
npm run tauri android init
npm run tauri ios init   # macOS only
```

Document Xcode / Android Studio requirements in README.

---

## 20. Phased roadmap (task-level)

Estimates assume 1 focused engineer. Adjust freely.

---

### Phase 0 — Foundation (complete scaffold → product shell)

**Goal:** Branded multi-platform shell, tooling, docs.

| # | Task | Done when |
|---|------|-----------|
| 0.1 | Public repo, MIT, `main`, README | pushed |
| 0.2 | Rename app DocTool across package/Cargo/tauri | greets as DocTool |
| 0.3 | Tailwind + layout shell desktop/mobile breakpoints | empty adaptive chrome |
| 0.4 | Routing: Notes / Files / Vault / Settings | navigable |
| 0.5 | Zustand + types for Note, Profile, VaultStatus | compiles |
| 0.6 | Rust error type + tracing | commands return structured errors |
| 0.7 | SQLite open + migrations runner | empty DB created on launch |
| 0.8 | CI workflow basic | green on GitHub |
| 0.9 | `docs/threat-model.md` stub from §17 | merged |
| 0.10 | Android/iOS project init scripts documented | README section |

**Exit:** App runs desktop; navigable empty sections; CI green.

---

### Phase 1 — Local files + Markdown/Code editor

| # | Task | Done when |
|---|------|-----------|
| 1.1 | Local `FileSource` + path allowlist | list/read/write home/docs |
| 1.2 | Files browser UI (tree/list) | navigate folders |
| 1.3 | CodeMirror 6 markdown adapter | open/save .md |
| 1.4 | Live preview GFM | split/tab modes |
| 1.5 | Code/config language pack | open .rs .ts .json .yaml .toml |
| 1.6 | Tabs + dirty indicator + close confirm | multi-file |
| 1.7 | Recents table | recents list works |
| 1.8 | Autosave setting | configurable |

**Exit:** Edit local markdown/code end-to-end on Linux/macOS; mobile open via picker.

---

### Phase 2 — Keep-style notes

| # | Task | Done when |
|---|------|-----------|
| 2.1 | Notes schema + FTS | migrations |
| 2.2 | CRUD commands | IPC works |
| 2.3 | Notes grid UI colors pins labels | Keep-like |
| 2.4 | Tiptap editor | rich body |
| 2.5 | Search FTS | query latency OK |
| 2.6 | Archive / trash | recoverable |
| 2.7 | Checklist items in body or structured field | toggle works |
| 2.8 | Export note → markdown file | writes local |

**Exit:** Offline notes fully usable; no Drive yet.

---

### Phase 3 — SFTP first-class

| # | Task | Done when |
|---|------|-----------|
| 3.1 | Profile CRUD + keychain secrets | no plaintext secrets |
| 3.2 | Connect with password | list `/` |
| 3.3 | Connect with private key | list works |
| 3.4 | Host key TOFU UI | fingerprint confirm |
| 3.5 | Browse UX mobile+desktop | open path stack |
| 3.6 | Open remote text → edit → save | e2e |
| 3.7 | Upload/download one file | works |
| 3.8 | Mkdir/rename/delete | confirm dialogs |
| 3.9 | Integration test vs OpenSSH container | CI optional job |
| 3.10 | Planned connections on Files home | “servers” section |

**Exit:** SFTP success criterion §1.3.4 met.

---

### Phase 4 — PDF

| # | Task | Done when |
|---|------|-----------|
| 4.1 | PDF.js viewer tab | render multipage |
| 4.2 | Zoom/page nav/search | usable |
| 4.3 | pdf-lib annotations highlight/text | save bytes |
| 4.4 | Page rotate/delete (desktop) | save |
| 4.5 | Merge/split tools (desktop) | save |
| 4.6 | Save to local + SFTP sources | e2e |
| 4.7 | Mobile light annotate | at least highlight |

**Exit:** PDF criterion §1.3.5 met.

---

### Phase 5 — Encrypted Google Drive vault + dual notes sync

| # | Task | Done when |
|---|------|-----------|
| 5.1 | Crypto module Argon2id + AES-GCM | unit tests pass |
| 5.2 | Vault header + create + recovery key UX | key shown once |
| 5.3 | Unlock password / recovery key | wrong key fails |
| 5.4 | Lock + zeroize | memory tests best-effort |
| 5.5 | Google OAuth PKCE + token keychain | link account |
| 5.6 | Object put/get on Drive | ciphertext only |
| 5.7 | Encrypted manifest | list logical files |
| 5.8 | Vault file browser in UI | open/save encrypted docs |
| 5.9 | Notes dual-write queue | note appears as vault object |
| 5.10 | Notes pull on second device | restore works |
| 5.11 | Conflict matrix tests | §9.4 |
| 5.12 | Biometric re-unlock mobile | optional gate |
| 5.13 | `docs/vault-format.md` finalized | versioned format |

**Exit:** Criteria §1.3.3 and vault threat model satisfied.

---

### Phase 6 — Format expansion + polish

| # | Task | Done when |
|---|------|-----------|
| 6.1 | Images viewer | open png/jpg/webp/gif |
| 6.2 | HTML view/edit source | sandbox |
| 6.3 | CSV grid | edit save |
| 6.4 | DOCX mammoth view | read-only |
| 6.5 | ipynb light view | cells render |
| 6.6 | Command palette desktop | Ctrl+K |
| 6.7 | Global shortcuts | new note, lock vault |
| 6.8 | Settings complete | all prefs |
| 6.9 | Onboarding wizard first run | 4 steps |
| 6.10 | Performance pass | large dir, large PDF |
| 6.11 | A11y pass | keyboard |
| 6.12 | Store listing assets | screenshots |

---

### Phase 7 — v1.0 release hardening

| # | Task | Done when |
|---|------|-----------|
| 7.1 | CSP + capability audit | written checklist |
| 7.2 | Dependency audit | no critical CVEs |
| 7.3 | Secret scan history | clean |
| 7.4 | Signed/notarized macOS if distributing | optional |
| 7.5 | Play/TestFlight builds | internal testers |
| 7.6 | CHANGELOG + tag v1.0.0 | released |
| 7.7 | CONTRIBUTING.md | community ready |

---

## 21. Risks, mitigations, open tech choices

### 21.1 Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Tauri mobile plugin gaps | Feature blocked on iOS/Android | Feature flags; thin native bridges; test early on devices |
| PDF edit complexity | Scope blowup | Strict annotate/page-ops scope |
| Drive API quota / OAuth review | Vault delayed | Use appDataFolder; start OAuth consent early |
| Argon2 too heavy on old phones | Unlock slow | Adaptive params; document min device |
| SFTP server quirks | Save fails | Temp+rename fallback; clear errors |
| Scope creep “all Office formats” | Never ship | Registry P2+ freeze for v1 |
| Dual-sync bugs | Data loss fear | Conflict copies; never silent drop |

### 21.2 Open choices (decide at phase start)

| Topic | Options | Recommendation |
|-------|---------|----------------|
| SQL crate | rusqlite vs sqlx | rusqlite for simplicity |
| SFTP crate | russh vs ssh2 | russh (pure rust async) |
| Router | RR v7 vs TanStack | TanStack Router if time; RR OK |
| Drive folder | appDataFolder vs visible | appDataFolder default; setting to use visible folder |
| Note body storage | Tiptap JSON only vs also MD | JSON primary; MD export |
| Windows | skip vs add CI | Add when contributor needs it |

---

## 22. Definition of Done (v1.0)

- [ ] All §1.3 success criteria demonstrable on video per platform  
- [ ] MIT LICENSE + copyright in README  
- [ ] `docs/vault-format.md` + `docs/threat-model.md` complete  
- [ ] No known critical security issues in crypto/SFTP/auth  
- [ ] CI green on `main`  
- [ ] At least manual test checklist executed  
- [ ] Version 1.0.0 tagged  

---

## 23. Appendix

### 23.1 Glossary

| Term | Meaning |
|------|---------|
| MK | Master key derived from password or recovery key |
| DEK | Per-object data encryption key |
| Dual-write | Local DB write + async encrypted vault upload |
| TOFU | Trust On First Use (SSH host keys) |
| Adapter | Format-specific open/edit/save implementation |
| Profile | Saved SFTP connection configuration |

### 23.2 URI scheme examples

```
local:///home/dev/docs/readme.md
sftp://profile_01HZY…/var/www/app/.env
vault://objects/01HZY… 
notes://01HZY…
```

### 23.3 First-run wizard steps

1. Welcome + license  
2. Create vault password + show recovery key (can skip vault, warn)  
3. Optional link Google Drive  
4. Optional add SFTP profile  
5. Land on Notes  

### 23.4 Recovery key UX copy (required)

> This recovery key is the only way to access your vault if you forget your password. DocTool cannot reset it. Store it offline (password manager or paper). You will not see it again.

Confirm: “I have saved my recovery key” + re-enter first 8 characters.

### 23.5 Related docs to write next

1. `docs/threat-model.md`  
2. `docs/vault-format.md`  
3. `docs/ipc.md`  
4. `CONTRIBUTING.md`  

### 23.6 Implementation order reminder

```
Phase 0 shell → 1 local editors → 2 notes → 3 SFTP → 4 PDF → 5 vault+dual-sync → 6 polish → 7 release
```

**Do not start Phase 5 crypto until Phase 2 notes exist** (dual-sync needs notes).  
**Do not skip SFTP (Phase 3)** — product requirement D7.  
**Test mobile layouts from Phase 0** — day-1 platforms D1.

---

*End of plan. Update this document when decisions change; bump Version at top.*
