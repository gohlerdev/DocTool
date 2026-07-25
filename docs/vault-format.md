# DocTool — Vault Format & Cryptography

**Format version:** 1  
**Intent:** WhatsApp-style E2EE backup semantics — client-side encryption; cloud sees ciphertext only.  
**Recovery:** Password **or** offline recovery key (ADR-004).

---

## 1. Design goals

1. Google Drive (or any blob store) never receives plaintext notes/files.  
2. Password-based unlock with memory-hard KDF.  
3. Recovery key can unlock if password forgotten.  
4. Lose both secrets ⇒ unrecoverable (no backdoor).  
5. Per-object DEKs so one object compromise does not expose raw MK usage patterns poorly.  
6. Versioned header so crypto params can evolve.

---

## 2. Algorithms (v1)

| Role | Algorithm | Notes |
|------|-----------|--------|
| Password KDF | Argon2id | PHC string or structured params in header |
| Default Argon2 params | m=65536 KiB (64 MiB), t=3, p=1 | May lower on low-end mobile after bench; store actual params in header |
| AEAD | AES-256-GCM | 128-bit tag |
| Nonce | 12 random bytes | Unique per encryption under a key |
| MK length | 32 bytes | |
| DEK length | 32 bytes | |
| Path ID | HMAC-SHA256(VK, utf8_path) → hex/base64url | Manifest keys |
| Content hash | SHA-256(ciphertext) | Integrity listing |
| RNG | OS CSPRNG (`getrandom` / `rand::rngs::OsRng`) | |

**Libraries (Rust):** `argon2`, `aes-gcm`, `sha2`, `hmac`, `hkdf`, `rand`, `zeroize`.

---

## 3. Key hierarchy

```
┌──────────────────┐     Argon2id(password, salt, params)
│  User password   │ ─────────────────────────────────────► MK
└──────────────────┘

┌──────────────────┐     decode(recovery_key)  [optional HKDF]
│  Recovery key    │ ─────────────────────────────────────► MK  (same MK)
└──────────────────┘

MK ──wrap──► VK (Vault Key)   // v1 may set VK = MK to simplify; prefer distinct VK

Per object:
  DEK ← random 32 bytes
  ciphertext = AES-GCM-Encrypt(DEK, nonce, plaintext, aad)
  wrapped_dek = AES-GCM-Encrypt(VK, nonce2, DEK, aad2)
```

### 3.1 Recovery key encoding

- 32 bytes CSPRNG.  
- Display: Base32 (RFC 4648, no padding), groups of 4–5 chars for readability.  
- Equivalent to “long recovery key” UX (WhatsApp 64-digit hex style).  
- Stored by **user only**. App stores only a **verification verifier** (see header), not the key.

### 3.2 How password and recovery key both yield MK

**Creation:**

1. Generate `MK` random 32 bytes.  
2. Generate `salt_pw` 16+ bytes; `MK_wrap_pw = seal(KDF(password), MK)`.  
3. Generate `recovery_key` 32 bytes; `MK_wrap_rk = seal(recovery_key, MK)` (RK used directly as AES key, or HKDF(RK, "doctool-mk-wrap")).  
4. Store both wraps in header.  
5. Show recovery key once.

**Unlock password:** KDF → open `MK_wrap_pw` → MK.  
**Unlock recovery:** open `MK_wrap_rk` → MK.

### 3.3 Password change

- Re-wrap MK with new password KDF; leave recovery wrap unchanged unless user rotates recovery key.

### 3.4 Recovery key rotation

- Requires current unlock; generate new RK; replace `MK_wrap_rk`; show new key once.

---

## 4. Drive layout

Preferred root: Google Drive **`appDataFolder`** (hidden from normal Drive UI).  
Optional setting: user-visible folder `DocToolVault/`.

```
{root}/
  vault.header.json          # NOT encrypted (public metadata)
  vault.manifest.enc         # encrypted ManifestBlob
  objects/
    {object_id}.bin          # encrypted ObjectBlob
```

`object_id`: ULID or 32-byte hex random (no path semantics).

---

## 5. `vault.header.json` (public)

```json
{
  "magic": "DOCTOOL_VAULT",
  "format_version": 1,
  "created_at": "2026-07-25T00:00:00Z",
  "kdf": {
    "alg": "argon2id",
    "salt_b64": "...",
    "m_kib": 65536,
    "t": 3,
    "p": 1
  },
  "wrap": {
    "alg": "aes-256-gcm",
    "mk_wrap_password_b64": "...",
    "mk_wrap_password_nonce_b64": "...",
    "mk_wrap_recovery_b64": "...",
    "mk_wrap_recovery_nonce_b64": "..."
  },
  "verify": {
    "alg": "aes-256-gcm",
    "nonce_b64": "...",
    "ciphertext_b64": "..."
  },
  "aad_context": "doctool-vault-v1"
}
```

**verify:** Encrypt fixed plaintext `DOCTOOL_VAULT_OK` under MK (or VK) so unlock can validate without downloading full manifest.

**AAD:** Use `aad_context` + `format_version` as AEAD AAD for wraps where applicable.

---

## 6. Object blob format (on Drive)

Binary layout for `objects/{id}.bin`:

```
magic:     8 bytes  "DTVLT01\n"  or ASCII "DTVOBJ01"
version:   u16 LE = 1
flags:     u16 LE
nonce:     12 bytes
ct_len:    u64 LE
ciphertext+tag: ct_len bytes (AES-GCM produces ct||tag or tag separate — fix: tag last 16 bytes)
```

**v1 simplification:** JSON envelope base64 fields instead of pure binary if faster to ship:

```json
{
  "v": 1,
  "nonce_b64": "...",
  "ct_b64": "..."
}
```

Prefer binary for large PDFs (less expansion). Document chosen form in this file when implemented; **do not mix** without version bump.

### 6.1 Chunked large objects (P1)

If `flags & CHUNKED`:

```
for each chunk:
  chunk_index: u32
  nonce: 12
  ct_len: u32
  ct+tag
```

AAD includes object_id + chunk_index.

---

## 7. Manifest (encrypted)

Decrypt `vault.manifest.enc` with VK → JSON:

```json
{
  "v": 1,
  "updated_at": "ISO-8601",
  "entries": [
    {
      "logical_path": "notes/01HZY….json",
      "object_id": "01HZOBJ…",
      "kind": "note" | "file",
      "size_plain": 1234,
      "size_cipher": 1300,
      "content_hash_sha256": "hex",
      "updated_at": "ISO-8601",
      "wrapped_dek_b64": "...",
      "wrapped_dek_nonce_b64": "...",
      "deleted": false
    }
  ]
}
```

**logical_path** conventions:

| Kind | Path pattern |
|------|----------------|
| Note | `notes/{note_id}.json` |
| User file | `files/{user_relative_path}` |
| Thumbnail optional | `thumbs/{object_id}` |

Manifest itself encrypted as single ObjectBlob-like structure stored at fixed name `vault.manifest.enc`.

**Manifest concurrency:** last-writer-wins with `updated_at`; optional `manifest_generation` counter. On conflict (two devices): merge entries by entry `updated_at` per logical_path; prefer higher; if hash conflict on same timestamp, keep both under conflict path (P1).

---

## 8. Encrypt note for vault

Plaintext = UTF-8 JSON (see notes-sync.md payload).  
Process:

1. DEK = random.  
2. Encrypt plaintext with DEK → object bytes.  
3. Wrap DEK with VK → store in manifest entry.  
4. Upload object.  
5. Update manifest (encrypt + upload).  

Order: **upload object first, then manifest** so orphaned objects possible but missing objects rare. GC orphans in maintenance job (P2).

---

## 9. Session lifecycle

| State | MK in memory | Manifest decrypted | Drive writes |
|-------|--------------|--------------------|--------------|
| Locked | No | No | No |
| Unlocked | Yes | Yes | Yes |
| Unlocking | ephemeral | loading | No |

**Lock:**

1. Cancel queue workers.  
2. Zeroize MK, VK, DEKs cached.  
3. Drop manifest struct.  
4. Emit `vault://locked`.  
5. Close or freeze vault:// tabs.

**Idle lock timeout:** setting default 15 min desktop / 5 min mobile; 0 = manual only.

---

## 10. Biometric re-unlock (mobile)

1. After password unlock, wrap MK with a key stored in Secure Enclave / Android Keystore biometry-bound key.  
2. Store wrap in keychain item `vault.mk.bio`.  
3. On launch, biometric prompt unwraps MK without password.  
4. Disabling biometrics deletes wrap.  
5. Password change invalidates bio wrap until next password unlock.

---

## 11. Threat notes specific to format

| Attack | Mitigation |
|--------|------------|
| Offline brute force password | Argon2id memory-hard; strong password UX meter |
| Steal recovery key screenshot | Warn; clipboard auto-clear timer |
| Swap Drive objects | content_hash + GCM tag; detect on decrypt |
| Rollback manifest | optional local pin of last generation (P1) |
| Malicious app with unlocked session | OS malware out of scope |

---

## 12. Test vectors (implementer checklist)

- [ ] Create vault → header verifies with password  
- [ ] Unlock with recovery key  
- [ ] Wrong password fails verify  
- [ ] Encrypt 0-byte, 1-byte, 1MB, 20MB payloads  
- [ ] Password change keeps recovery key working  
- [ ] Recovery rotate invalidates old RK  
- [ ] Manifest round-trip  
- [ ] Corrupt ciphertext fails cleanly  

Store official vectors in `testdata/crypto/vectors.json` when implemented.

---

## 13. Non-goals of format v1

- Multi-user shared vaults  
- Partial password escrow  
- Post-quantum KEMs  
- Cryptomator directory structure compatibility  

---

## 14. Changelog

| Format version | Date | Changes |
|----------------|------|---------|
| 1 | 2026-07-25 | Initial specification |
