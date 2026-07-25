# DocTool — Tauri IPC Command Surface

All commands invoked from React via typed wrappers in `src/shared/lib/invoke.ts`.  
Errors: `{ code: string, message: string, details?: unknown }`.

---

## 1. Conventions

| Convention | Rule |
|------------|------|
| Naming | `snake_case` command names |
| Args | single object argument |
| Bytes | `number[]` or base64 string; prefer base64 for large |
| Large files | write temp path in core; return `{ tempPath }` for stream open |
| Authz | core checks vault unlock for vault URIs |
| Secrets | never returned in list endpoints |

---

## 2. Notes commands

### `notes_list`

```ts
args: { query?: string; label?: string; archived?: boolean; includeDeleted?: boolean }
returns: NoteSummary[]
```

### `notes_get`

```ts
args: { id: string }
returns: Note
```

### `notes_upsert`

```ts
args: {
  id?: string; // omit to create
  title: string;
  body: unknown;
  color?: string;
  pinned?: boolean;
  archived?: boolean;
  labels?: string[];
}
returns: Note
```

Side effects: FTS update; enqueue sync if vault ready.

### `notes_delete`

```ts
args: { id: string; hard?: boolean }
returns: { ok: true }
```

### `notes_search`

```ts
args: { query: string; limit?: number }
returns: NoteSummary[]
```

### `notes_sync_now`

```ts
args: {}
returns: { pulled: number; pushed: number; conflicts: number; errors: string[] }
```

---

## 3. Filesystem / source commands

### `fs_list`

```ts
args: { uri: string }
returns: DirEntry[]
```

### `fs_read`

```ts
args: { uri: string }
returns: { encoding: "base64"; data: string } | { tempPath: string; size: number }
```

### `fs_write`

```ts
args: { uri: string; dataBase64: string } | { uri: string; tempPath: string }
returns: { ok: true; bytes: number }
```

### `fs_mkdir`

```ts
args: { uri: string }
returns: { ok: true }
```

### `fs_remove`

```ts
args: { uri: string; recursive?: boolean }
returns: { ok: true }
```

### `fs_rename`

```ts
args: { fromUri: string; toUri: string }
returns: { ok: true }
```

### `fs_stat`

```ts
args: { uri: string }
returns: FileStat
```

### `fs_pick_local` (mobile)

```ts
args: { mode: "file" | "folder" }
returns: { uri: string } | null
```

---

## 4. SFTP commands

### `sftp_profiles_list`

```ts
returns: SftpProfilePublic[] // no secrets
```

### `sftp_profile_save`

```ts
args: {
  profile: SftpProfilePublic;
  password?: string;       // only on write
  privateKeyPem?: string;
  passphrase?: string;
}
returns: { id: string }
```

### `sftp_profile_delete`

```ts
args: { id: string }
returns: { ok: true }
```

### `sftp_connect`

```ts
args: { id: string }
returns: { status: "ready" } | { status: "host_key_required"; fingerprint: string; alg: string }
```

### `sftp_trust_host_key`

```ts
args: { id: string; fingerprint: string }
returns: { ok: true }
```

### `sftp_disconnect`

```ts
args: { id: string }
returns: { ok: true }
```

### `sftp_reset_host_key`

```ts
args: { id: string }
returns: { ok: true }
```

---

## 5. Vault commands

### `vault_status`

```ts
returns: {
  configured: boolean;
  unlocked: boolean;
  driveLinked: boolean;
  lastSyncAt?: string;
  pendingJobs: number;
  lastError?: string;
}
```

### `vault_create`

```ts
args: { password: string }
returns: { recoveryKey: string } // ONCE — UI must display
```

### `vault_unlock`

```ts
args: { password?: string; recoveryKey?: string }
returns: { ok: true }
```

Exactly one of password or recoveryKey.

### `vault_lock`

```ts
args: {}
returns: { ok: true }
```

### `vault_change_password`

```ts
args: { currentPassword: string; newPassword: string }
returns: { ok: true }
```

### `vault_rotate_recovery_key`

```ts
args: { password: string }
returns: { recoveryKey: string }
```

### `vault_link_drive`

```ts
args: {}
returns: { authUrl?: string; ok?: true } // flow platform-specific
```

### `vault_unlink_drive`

```ts
args: {}
returns: { ok: true }
```

### `vault_export_header` (debug)

```ts
returns: { headerJson: string } // public only
```

---

## 6. Settings / system

### `settings_get` / `settings_set`

```ts
args get: { key: string }
args set: { key: string; value: string }
```

### `app_info`

```ts
returns: { version: string; os: string; deviceId: string }
```

### `recents_list` / `recents_clear`

---

## 7. Events

Subscribe via Tauri event API:

| Event | Payload |
|-------|---------|
| `notes://changed` | `{ id?: string }` |
| `vault://locked` | `{}` |
| `vault://unlocked` | `{}` |
| `sync://progress` | `{ pending: number; lastError?: string }` |
| `sftp://transfer` | `{ id: string; fraction: number; done: boolean }` |
| `sftp://host-key` | `{ profileId: string; fingerprint: string }` |

---

## 8. Capability allowances (Tauri 2)

Minimum for Phase 0–1:

- core defaults  
- fs scoped to user documents + app data (desktop)  
- dialog open/save  
- sql if used from plugin  

SFTP/Drive: no extra FS capability beyond temp dirs.

Document exact `capabilities/*.json` per phase in PRs.

---

## 9. Versioning IPC

If breaking command changes after public release: add `notes_list_v2` rather than silent break; deprecate old in changelog.
