# DocTool — SFTP Subsystem

**ADR:** ADR-006  
**Priority:** Phase 3 (first-class, not deferred)

---

## 1. Goals

1. Browse remote servers like a first-class file source.  
2. Open text/markdown/code/PDF in DocumentHub; save back.  
3. Store **planned connections** (profiles) securely.  
4. Work on desktop and mobile (simplified mobile UX).  
5. Safe host key handling (TOFU).

---

## 2. Non-goals (v1)

- Full terminal emulator (optional P2).  
- FTP / FTPS.  
- Multi-hop ProxyJump (P1).  
- Server-side recursive search (too expensive).  
- Automatic background sync of entire remote trees.

---

## 3. Profile model

```ts
type SftpAuthType = "password" | "key";

interface SftpProfile {
  id: string;              // ULID
  name: string;            // "Prod box"
  host: string;
  port: number;            // default 22
  username: string;
  auth_type: SftpAuthType;
  // secrets NOT here — keychain refs only
  keychain_ref?: string;   // password or passphrase ref
  private_key_ref?: string;
  default_path?: string;   // e.g. /var/www
  color?: string;
  host_key_fingerprint?: string; // pinned after TOFU
  created_at: string;
  updated_at: string;
}
```

### 3.1 Secret storage

| Secret | Storage |
|--------|---------|
| Password | OS keychain item `sftp.{id}.password` |
| Private key PEM | keychain or app-private encrypted file + passphrase in keychain |
| Passphrase | keychain `sftp.{id}.passphrase` |

SQLite stores **metadata only**.

---

## 4. Connection lifecycle

```
Disconnected
    │ connect(profileId)
    ▼
HostKeyCheck ──(unknown)──► UI prompt TOFU
    │ known match
    ▼
Authenticating
    │ ok
    ▼
Ready  ◄── keepalive ──► (idle timer)
    │ disconnect / timeout / error
    ▼
Disconnected
```

### 4.1 Session manager

- `HashMap<ProfileId, SessionHandle>`  
- Max concurrent sessions: 4 default (configurable).  
- Idle disconnect: 10 minutes default.  
- On app background (mobile): disconnect or keep one session — **disconnect** by default on iOS.

### 4.2 Implementation crate

Prefer **`russh` + SFTP subsystem** (async, pure Rust).  
Fallback research: `ssh2` if blocking pool required.

---

## 5. Host key TOFU

1. On first connect, compute fingerprint (SHA256 of server host key).  
2. Show modal: host, port, fingerprint, algorithm.  
3. User Accept → store fingerprint on profile.  
4. Mismatch later → **hard fail** with “HOST KEY CHANGED” (MITM risk); require explicit reset in profile settings.

---

## 6. File operations

| Op | Behavior |
|----|----------|
| list | `readdir`; map to `DirEntry{ name, path, is_dir, size, mtime, mode? }` |
| read | full file to memory or temp if > threshold |
| write | write to `path.doctool.tmp` then `rename` over target; if rename unsupported, direct write + warn |
| mkdir | create directory |
| remove | file or empty dir; recursive delete confirm + P1 |
| rename | remote rename |
| stat | size/mtime for conflict checks |

### 6.1 URI form

```
sftp://{profileId}{absolute_path}
sftp://01HZY…/home/deploy/app/README.md
```

Path must be absolute starting with `/`.

---

## 7. UI specification

### 7.1 Desktop

- Sources sidebar: “SFTP” section with profiles.  
- Click profile → file pane at `default_path` or `/`.  
- Breadcrumbs, sort by name/mtime/size.  
- Double-click file → open tab.  
- Context menu: download, rename, delete, copy path.  
- Optional dual-pane (P1).

### 7.2 Mobile

- Files tab → Servers → profile → stack of directories.  
- Tap file → full-screen editor.  
- FAB less important; use “…” sheet for mkdir/upload.  
- Cellular warning if file > 5 MB.

### 7.3 Planned connections home

Empty Files view shows:

- Local shortcuts  
- **Planned servers** (profiles list)  
- Vault entry  

---

## 8. Transfers

### P0

- Single file upload/download with progress event.  
- Cancel button.

### P1

- Queue multiple.  
- Resume if possible (SFTP often not resumable easily — re-download).  
- Directory upload (walk local).

---

## 9. Errors (user-facing)

| Code | Message guidance |
|------|------------------|
| AuthFailed | Check username/key/password |
| HostKeyMismatch | Server key changed — verify with admin |
| Network | Cannot reach host:port |
| PermissionDenied | Server denied path |
| NotFound | Path missing |
| Timeout | Increase timeout or check network |

---

## 10. Security requirements

- [ ] No private keys in logs or IPC responses  
- [ ] IPC never echoes passwords  
- [ ] Known_hosts style pin per profile  
- [ ] Optional: restrict outbound only when user initiates connect  
- [ ] Clear sessions on vault lock? **No** — independent; optional “lock all” setting  

---

## 11. Testing

- Docker `linuxserver/openssh-server` or `atmoz/sftp` fixtures.  
- Tests: list, read, write, rename, delete, bad password, host key change.  
- Manual: real VPS with key auth.

---

## 12. Phase checklist (from phases.md)

See Phase 3 tasks in [phases.md](./phases.md).
