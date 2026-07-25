# Phase 5 — Vault E2EE + Notes Dual-Sync

| Field | Value |
|-------|--------|
| **Status** | `todo` |
| **Depends on** | Phase 2 (notes); Phase 0 (sqlite); ideally Phase 1 (vault file open) |
| **Unblocks** | Phase 6/7 product completeness |
| **Estimate** | 12–20 days |
| **Specs** | [vault-format.md](../vault-format.md), [notes-sync.md](../notes-sync.md), [threat-model.md](../threat-model.md), [ipc.md](../ipc.md) |

---

## Phase goal

Client-side encrypted Google Drive vault (WhatsApp-backup intent): password + recovery key; object store; encrypted manifest; vault file browser; **dual-write notes** with pull, conflicts, queue.

---

## Phase exit criteria

- [ ] Create vault; recovery key shown once with confirm UX  
- [ ] Unlock with password; unlock with recovery key  
- [ ] Lock zeroizes session keys; status locked  
- [ ] Drive holds ciphertext only (manual inspect)  
- [ ] Note created → appears as vault object when unlocked+linked  
- [ ] Second device/profile restores note after pull  
- [ ] Conflict creates `"(conflict)"` duplicate per notes-sync.md  
- [ ] Wrong password fails cleanly  

---

## Subphase 5A — Crypto module

**Status:** `todo` · **Legacy:** 5.1, 5.15 (partial)

### Objective

Pure Rust crypto primitives + vault header seal/open with unit tests. **No Drive yet.**

### Tasks

| ID | Task | Acceptance | Files / area |
|----|------|------------|--------------|
| 5A.1 | Add crates: argon2, aes-gcm, sha2, hmac, rand, zeroize | Build | Cargo.toml |
| 5A.2 | Argon2id derive from password + salt | Params from vault-format | `crypto/kdf.rs` |
| 5A.3 | AES-256-GCM seal/open helpers | AAD support | `crypto/aead.rs` |
| 5A.4 | Generate MK, recovery key encode/decode | Base32 groups | `crypto/keys.rs` |
| 5A.5 | Create public `vault.header.json` structure | Serialize | `crypto/header.rs` |
| 5A.6 | Password wrap + recovery wrap of MK | Both unlock paths | |
| 5A.7 | Verify blob `DOCTOOL_VAULT_OK` | Detect wrong secret | |
| 5A.8 | DEK wrap/unwrap | Per-object | |
| 5A.9 | Object encrypt/decrypt bytes | Round-trip | `crypto/object.rs` |
| 5A.10 | Known-answer + property tests | cargo test | `tests/crypto*` |
| 5A.11 | Zeroize MK on drop | Use zeroize traits | |

### Acceptance tests

```bash
cd src-tauri && cargo test crypto
```

- Wrong password fails verify.  
- Recovery key unlocks same MK as password path after create.

### Done when

Crypto is trustworthy in isolation.

---

## Subphase 5B — Vault create / unlock / lock UX

**Status:** `todo` · **Legacy:** 5.2–5.5, 5.16, 5.17

### Objective

Local vault session lifecycle + UI (Drive optional later).

### Tasks

| ID | Task | Acceptance | Files / area |
|----|------|------------|--------------|
| 5B.1 | `VaultService` state machine | locked/unlocked/configured | `domain/vault.rs` |
| 5B.2 | Persist configured flag + header cache | vault_state row | db |
| 5B.3 | `vault_create` returns recoveryKey once | IPC | commands |
| 5B.4 | Recovery key screen UX | Confirm + retype prefix | `features/vault/` |
| 5B.5 | `vault_unlock` password \| recovery | Status unlocked | |
| 5B.6 | `vault_lock` zeroize | Memory cleared | |
| 5B.7 | `vault_status` for UI | Poll/query | |
| 5B.8 | Vault page states | not configured / locked / unlocked | VaultPage |
| 5B.9 | `vault_change_password` | Recovery still works | |
| 5B.10 | `vault_rotate_recovery_key` | New key once | |
| 5B.11 | Idle lock timer setting | Default 15/5 min | |
| 5B.12 | Header shield indicator in shell | Green/gray/amber | AppShell |

### Acceptance tests

- Create → lock → unlock password.  
- Create → unlock with recovery only (simulate forgot password).  
- Clipboard clear timer for recovery key (manual).

### Done when

Vault can be used offline for crypto session (objects still local/mocked).

---

## Subphase 5C — Google Drive OAuth + blob store

**Status:** `todo` · **Legacy:** 5.6, 5.7

### Objective

OAuth PKCE; store/retrieve opaque objects in appDataFolder (or chosen folder).

### Tasks

| ID | Task | Acceptance | Files / area |
|----|------|------------|--------------|
| 5C.1 | Register Google Cloud OAuth client (public PKCE) | Client ID in config/env example | `.env.example` |
| 5C.2 | Desktop OAuth PKCE flow | Token in keychain | `infra/drive.rs` |
| 5C.3 | Mobile OAuth flow | Platform-appropriate | |
| 5C.4 | Token refresh | Silent refresh | |
| 5C.5 | `vault_link_drive` / `unlink` | Status driveLinked | IPC + UI |
| 5C.6 | Upload object bytes | Returns object id | Drive API |
| 5C.7 | Download object bytes | Round-trip ciphertext | |
| 5C.8 | Delete object | OK | |
| 5C.9 | List vault root files | header/manifest present | |
| 5C.10 | Never upload plaintext note body in logs/API debug | Review | |

### Acceptance tests

- Link account; upload random ciphertext; download matches.  
- Unlink clears token.

### Done when

Blob transport works.

---

## Subphase 5D — Manifest + vault file browser

**Status:** `todo` · **Legacy:** 5.8, 5.9

### Objective

Encrypted manifest; browse logical vault files; open/save through adapters.

### Tasks

| ID | Task | Acceptance | Files / area |
|----|------|------------|--------------|
| 5D.1 | Manifest struct serde | Per vault-format | `crypto/manifest.rs` |
| 5D.2 | Load/decrypt manifest on unlock | In-memory | VaultService |
| 5D.3 | Encrypt+upload manifest | After mutations | |
| 5D.4 | Put file: DEK, object, manifest entry | `files/...` path | |
| 5D.5 | Get file: unwrap DEK, decrypt | Bytes out | |
| 5D.6 | `VaultSource` FileSource impl | list/read/write | |
| 5D.7 | URI `vault://` routing | SourceRouter | |
| 5D.8 | Files UI Vault section | Browse when unlocked | |
| 5D.9 | Open vault file in editor | Save re-encrypts | |
| 5D.10 | Gate vault paths when locked | Clear error | |

### Acceptance tests

- Save markdown into vault; lock; unlock; content matches.  
- Drive blob is not readable as plaintext UTF-8 note.

### Done when

Vault is a usable encrypted file backend.

---

## Subphase 5E — Notes dual-write + pull

**Status:** `todo` · **Legacy:** 5.10, 5.11, 5.13

### Objective

Implement notes-sync.md: queue, upload, pull.

### Tasks

| ID | Task | Acceptance | Files / area |
|----|------|------------|--------------|
| 5E.1 | Migration `sync_queue` if not present | Table exists | migrations |
| 5E.2 | Enqueue upsert on `notes_upsert` when vault ready | pending_upload | NotesService |
| 5E.3 | Worker loop with backoff | Drains queue | `domain/sync_worker.rs` |
| 5E.4 | Serialize note payload + content_hash | Canonical JSON | notes-sync.md |
| 5E.5 | Upload note object + manifest entry | `notes/{id}.json` | |
| 5E.6 | Mark synced + remote_object_id | Row updated | |
| 5E.7 | Soft-delete → pending_delete → remote tombstone | | |
| 5E.8 | Pull on unlock + foreground + `notes_sync_now` | Creates/updates local | |
| 5E.9 | Coalesce queue jobs per note | One upsert | |
| 5E.10 | UI sync indicator + errors | pending count | Notes/Vault |
| 5E.11 | Event `sync://progress` | UI updates | |
| 5E.12 | Integration test with mock ObjectStore | No real Drive required | tests |

### Acceptance tests

- Offline create note → unlock+online → synced.  
- Simulated second DB pull imports note.

### Done when

Dual-write happy path solid.

---

## Subphase 5F — Conflicts, biometrics, hardening

**Status:** `todo` · **Legacy:** 5.12, 5.14, 5.15–5.17 residual

### Objective

Conflict matrix, mobile biometrics, docs alignment, security pass.

### Tasks

| ID | Task | Acceptance | Files / area |
|----|------|------------|--------------|
| 5F.1 | Implement conflict rules §notes-sync | Auto duplicate title | sync |
| 5F.2 | Tests for each conflict table row | cargo/vitest | tests |
| 5F.3 | Biometric wrap MK (mobile) | Optional re-unlock | keychain/bio |
| 5F.4 | Disable bio on password change | Wrap invalidated | |
| 5F.5 | Align code with vault-format.md | Version fields match | docs + code |
| 5F.6 | Threat checklist Phase 5 items | Checked in threat-model | |
| 5F.7 | Manual Drive inspect ciphertext | Screenshot/note in TRACKING | |
| 5F.8 | Rate-limit unlock attempts soft | UX delay optional | |
| 5F.9 | Recovery key copy auto-clear 60s | Timer | UI |

### Acceptance tests

- Forced concurrent edit → conflict copy.  
- Recovery unlock after password “forgotten”.  
- Biometric path on at least one mobile OS (if hardware available).

### Done when

Phase 5 exit criteria satisfied → mark Phase 5 `done`.

---

## Suggested PR split

1. 5A crypto only  
2. 5B vault UX session  
3. 5C Drive  
4. 5D manifest/files  
5. 5E dual-sync  
6. 5F conflicts/hardening  

---

## Risks

| Risk | Mitigation |
|------|------------|
| OAuth app verification delay | Start client setup early; use test users |
| Argon2 too slow mobile | Bench; store params; allow m=32MiB if needed |
| Manifest race two devices | Document LWW + conflict notes |
| Scope creep sharing vaults | Explicit non-goal |

## Security gate

Do **not** merge 5C/5D without 5A tests green.  
Do **not** ship dual-sync without conflict tests (5F.2).
