# DocTool Vault Format v2 — Strongest Crypto Profile

**Format version:** 2 (v1 unlock still supported for migration)  
**Scope:** Local vault objects **and** Google Drive blobs use the **identical** ciphertext format.

---

## Algorithms (v2 defaults)

| Layer | Algorithm | Parameters |
|-------|-----------|------------|
| Password KDF | **Argon2id** | m=**128 MiB**, t=**3**, p=**1**, output 32 bytes |
| Salt | CSPRNG | **32 bytes** |
| Key separation | **HKDF-SHA256** | Distinct `info` labels per purpose |
| Recovery material | 256-bit CSPRNG | Displayed as grouped Base32 |
| Recovery → wrap key | HKDF-SHA256 | `doctool/v2/recovery-wrap-key` |
| Password → wrap key | Argon2id then HKDF | `doctool/v2/password-wrap-key` |
| AEAD | **AES-256-GCM** | 96-bit random nonce, 128-bit tag |
| Per-object data key | Random DEK 256-bit | Wrapped under master key (MK) |
| AAD | Purpose-bound strings | Magic + format version + purpose |
| Master key wipe | `zeroize` on drop | Lock vault clears session |
| Local SFTP secrets | AES-256-GCM | Device key file + purpose HKDF |

Password policy: **≥12 characters**, letters **and** digits, rejects common weak strings.

---

## Threat model (summary)

| Protects against | How |
|------------------|-----|
| Cloud provider / Drive breach | Zero-knowledge: only ciphertext uploaded |
| Offline password guessing | Memory-hard Argon2id 128 MiB × 3 passes |
| Ciphertext tampering | GCM authentication tag |
| Cross-protocol key reuse | HKDF domain separation |
| SFTP secrets in SQLite dump | Sealed with device key (not base64 plaintext) |
| Residual MK in RAM after lock | `ZeroizeOnDrop` on `MasterKey` |

**Does not protect:** malware on unlocked device; user who loses password **and** recovery key; metadata (sizes, counts) on Drive.

---

## Header (`vault.header.json` / SQLite `header_json`)

Public (no secrets):

- `format_version`: `2`
- `kdf`: argon2id + salt + m/t/p
- `wrap.kdf_mode`: `hkdf-sha256+argon2id`
- Wrapped MK under password key and recovery key (AES-GCM)
- Verify blob: encrypts fixed string under MK

---

## Object blob (local file **or** Drive)

Version byte `2`:

```
version=2 | purpose_len | purpose | nonce_wrap(12) | wrap_len | wrapped_dek | nonce_data(12) | ct||tag
```

- Random DEK per object  
- DEK wrapped under MK with AAD `…|blob|dek-wrap|{purpose}`  
- Payload encrypted under DEK with AAD `…|blob|{purpose}`  
- Same bytes may be stored under `vault_objects/` or uploaded to Drive  

---

## Local SFTP secret storage

- Device master key: 32-byte file `device_master.key` (mode 0600 when OS allows)  
- Each secret: `DTSEC1:` + base64(nonce||AES-GCM-ct)  
- Purpose labels: `sftp.password`, `sftp.private_key`, `sftp.passphrase`  
- Legacy bare-base64 secrets still open once, then re-saved sealed  

---

## Unlock / lock

1. Password or recovery key → derive wrap key → open MK → verify blob  
2. Decrypt manifest from `vault_manifest.enc`  
3. Lock: drop session → MK zeroized  

---

## Verification commands

```bash
cd src-tauri && cargo test crypto -- --nocapture
```

In-app: Vault unlocked shows `crypto_info` summary (format v2, Argon2id 128 MiB, AES-256-GCM).

---

## Changelog

| Ver | Change |
|-----|--------|
| 1 | Initial AES-GCM + Argon2id 32 MiB t=2, direct key use |
| 2 | 128 MiB t=3, HKDF separation, purpose AAD, sealed local secrets, 12-char password policy |
