# Phase 3 — SFTP First-Class

| Field | Value |
|-------|--------|
| **Status** | `todo` |
| **Depends on** | Phase 1 (editors for remote open/save) |
| **Unblocks** | Phase 4 remote PDF save; Files “servers” complete |
| **Estimate** | 7–12 days |
| **Specs** | [sftp.md](../sftp.md), [ipc.md](../ipc.md), [threat-model.md](../threat-model.md) |

---

## Phase goal

**Planned SFTP connections**: secure profiles, password/key auth, host-key TOFU, browse, open text in editors, save remote, upload/download, basic mutations.

---

## Phase exit criteria

- [ ] Create key-auth profile; secrets not in SQLite  
- [ ] Connect; TOFU accept; list directories  
- [ ] Open remote `README.md`; edit; save remote; re-open sees changes  
- [ ] Host key change → hard fail until reset  
- [ ] Desktop + mobile browse UX both usable  

---

## Subphase 3A — Profiles & keychain

**Status:** `todo` · **Legacy:** 3.1, 3.2

### Objective

Persist profile metadata; store secrets only in OS keychain.

### Tasks

| ID | Task | Acceptance | Files / area |
|----|------|------------|--------------|
| 3A.1 | Migration `sftp_profiles` | Schema per data-model | migrations |
| 3A.2 | Keychain/keyring integration | Set/get/delete secret | `infra/keychain.rs` |
| 3A.3 | `sftp_profiles_list` public only | No passwords in JSON | commands |
| 3A.4 | `sftp_profile_save` with optional secrets | Writes keychain refs | |
| 3A.5 | `sftp_profile_delete` clears secrets | Keychain cleaned | |
| 3A.6 | Profiles UI list + form | Add/edit/delete | `features/sftp/` |
| 3A.7 | Key file import (PEM) via picker | Stored securely | |
| 3A.8 | Validate host/port/username | Client+server validation | |

### Acceptance tests

- Restart app: profile remains; can still connect (secret still in keychain).  
- Inspect SQLite: no PEM/password plaintext.

### Done when

Profile management complete offline.

---

## Subphase 3B — Session manager & auth

**Status:** `todo` · **Legacy:** 3.3, 3.4, 3.5

### Objective

Async SSH/SFTP sessions with password and key auth.

### Tasks

| ID | Task | Acceptance | Files / area |
|----|------|------------|--------------|
| 3B.1 | Add `russh` (+ sftp) deps | Builds | Cargo.toml |
| 3B.2 | `SftpSessionManager` map | connect/disconnect | `infra/sftp.rs` |
| 3B.3 | Password authentication | list `/` | |
| 3B.4 | Private key (+ passphrase) auth | list `/` | |
| 3B.5 | Idle timeout disconnect | Default 10 min | config |
| 3B.6 | Max concurrent sessions | Default 4 | |
| 3B.7 | `sftp_connect` / `sftp_disconnect` IPC | Status ready | commands |
| 3B.8 | Mobile: disconnect on background | Policy applied | lifecycle hook |
| 3B.9 | Connection error mapping | AuthFailed/Network codes | AppError |

### Acceptance tests

- Integration against local OpenSSH/docker SFTP (manual or test).  
- Bad password → AuthFailed, no panic.

### Done when

Auth works for both methods.

---

## Subphase 3C — Host keys TOFU

**Status:** `todo` · **Legacy:** 3.6, 3.7

### Objective

Trust on first use; pin fingerprint; mismatch hard-fail.

### Tasks

| ID | Task | Acceptance | Files / area |
|----|------|------------|--------------|
| 3C.1 | Compute host key fingerprint (SHA256) | Stable string | sftp module |
| 3C.2 | Connect returns `host_key_required` when unknown | IPC union status | |
| 3C.3 | UI modal Accept/Cancel | Shows fp + host | `HostKeyModal.tsx` |
| 3C.4 | `sftp_trust_host_key` stores pin | Profile updated | |
| 3C.5 | Known matching key proceeds | Silent | |
| 3C.6 | Mismatch → HostKeyMismatch error | No connect | |
| 3C.7 | `sftp_reset_host_key` settings action | Clears pin | |
| 3C.8 | Unit tests fingerprint compare | cargo test | |

### Acceptance tests

- First connect prompts; second does not.  
- Change server key in test → blocked.

### Done when

TOFU threat mitigations met.

---

## Subphase 3D — Browse + remote open/save

**Status:** `todo` · **Legacy:** 3.8, 3.9, 3.14

### Objective

`sftp://{profileId}/path` as first-class source in Files + editors.

### Tasks

| ID | Task | Acceptance | Files / area |
|----|------|------------|--------------|
| 3D.1 | `SftpSource` implements FileSource | list/read/write | infra |
| 3D.2 | SourceRouter dispatches sftp URIs | Unified fs_* | domain |
| 3D.3 | Files UI: Servers section | Profiles listed | FilesPage |
| 3D.4 | Desktop browse pane | Breadcrumbs + list | |
| 3D.5 | Mobile stack navigation | Dir push/pop | |
| 3D.6 | Open remote text → tab | Uses Phase 1 editors | workspace |
| 3D.7 | Save remote write-back | e2e markdown | |
| 3D.8 | Friendly error toasts | Per sftp.md messages | |
| 3D.9 | Default path on connect | Opens profile.default_path | |

### Acceptance tests

- Remote README edit save cycle on real or docker SFTP.

### Done when

Core SFTP product promise delivered.

---

## Subphase 3E — Transfers & mutations

**Status:** `todo` · **Legacy:** 3.10–3.13

### Objective

Upload/download, mkdir/rename/delete, atomic write, optional CI.

### Tasks

| ID | Task | Acceptance | Files / area |
|----|------|------------|--------------|
| 3E.1 | Upload local → remote | Progress event | transfers |
| 3E.2 | Download remote → local/temp | Progress event | |
| 3E.3 | Cancel in-flight transfer | Best-effort | |
| 3E.4 | mkdir UI + command | Dir appears | |
| 3E.5 | rename UI + confirm | Works | |
| 3E.6 | delete UI + confirm | Works | |
| 3E.7 | Atomic write temp+rename | Fallback direct write | write path |
| 3E.8 | Cellular size warning mobile | &gt;5MB prompt | UI |
| 3E.9 | Docker-based integration test | Optional CI job | `src-tauri/tests` |
| 3E.10 | Document planned connections | README snippet | |

### Acceptance tests

- Upload and download sample file.  
- mkdir/rename/delete on test server.

### Done when

Phase 3 exit criteria satisfied → mark Phase 3 `done`.

---

## Suggested PR split

1. 3A profiles  
2. 3B/3C session + host keys  
3. 3D browse open/save  
4. 3E transfers  

---

## Risks

| Risk | Mitigation |
|------|------------|
| russh API churn | Pin versions; thin wrapper |
| Server without rename | Detect + direct write |
| Key formats | Support OpenSSH PEM/ed25519 first |
