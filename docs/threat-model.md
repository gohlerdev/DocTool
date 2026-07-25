# DocTool — Threat Model

**Method:** STRIDE-inspired asset/adversary analysis  
**Related:** [vault-format.md](./vault-format.md)

---

## 1. Scope

In scope: DocTool client apps (Linux, macOS, iOS, Android), local DB, OS keychain usage, SFTP client, Google Drive client-side encryption.

Out of scope: compromising Google’s datacenters beyond “they see ciphertext”; user device malware with root while vault unlocked; physical torture.

---

## 2. Assets

| ID | Asset | Sensitivity |
|----|-------|-------------|
| A1 | Note bodies/titles | High |
| A2 | File bytes opened/saved | High |
| A3 | Vault MK / DEKs | Critical |
| A4 | Recovery key (user-held) | Critical |
| A5 | SFTP passwords/keys | Critical |
| A6 | Google OAuth refresh token | High |
| A7 | SFTP session traffic | High |
| A8 | Vault ciphertext on Drive | Medium (encrypted) |
| A9 | App preferences | Low |
| A10 | Host key pins | Medium |

---

## 3. Trust boundaries

```
[ UI WebView ] --IPC--> [ Rust core ] --OS--> [ Keychain ]
                              |--SSH--> [ Remote server ]
                              |--TLS--> [ Google APIs ]
                              |--FS---> [ Local disk ]
```

WebView is **untrusted** relative to secrets: it may render user files (XSS risk from HTML/SVG) but must not receive MK.

---

## 4. Adversaries

| ID | Adversary | Capabilities |
|----|-----------|--------------|
| ADV1 | Network attacker | MITM public Wi‑Fi |
| ADV2 | Google insider / Drive breach | Read all Drive blobs & metadata |
| ADV3 | Malicious remote HTML/SVG file | Script in WebView if misconfigured |
| ADV4 | Local unprivileged malware | Read app files if unprotected |
| ADV5 | Thief with locked phone | Device access, no biometrics |
| ADV6 | Supply-chain npm/crate | Malicious update |
| ADV7 | Curious roommate | Brief physical access |
| ADV8 | Evil SFTP server | Observe auth attempts, serve files |

---

## 5. STRIDE analysis (summary)

### Spoofing

| Threat | Mitigation |
|--------|------------|
| Fake Drive API | TLS; optional pinning P2 |
| Fake SFTP server | Host key TOFU + mismatch hard fail |
| Fake app update | Signed releases later |

### Tampering

| Threat | Mitigation |
|--------|------------|
| Modify ciphertext on Drive | GCM tag fail; hash in manifest |
| Manifest rollback | generation counter P1; user sees old data risk documented |
| SQLite tampering | OS file perms; no secrets inside |

### Repudiation

Low priority single-user app; optional audit log P2.

### Information disclosure

| Threat | Mitigation |
|--------|------------|
| Drive reads notes | E2EE vault |
| Logs leak passwords | never log secrets; review tracing |
| IPC leaks keys | command contract forbids |
| WebView XSS reads other notes | sandbox HTML; CSP; no node in WebView |
| Recovery key shoulder-surf | dedicated screen; clipboard timeout |

### Denial of service

| Threat | Mitigation |
|--------|------------|
| Huge SFTP list | pagination / cap entries render |
| Huge PDF | page virtualization |
| Sync loop | backoff max attempts |

### Elevation of privilege

| Threat | Mitigation |
|--------|------------|
| Path traversal local | canonicalize; jail to allowed roots |
| Tauri capability abuse | least privilege capabilities |

---

## 6. Explicit residual risks

1. **Unlocked session + malware** can read notes and files.  
2. **Weak password** can be brute-forced offline on stolen header (Argon2 helps, not magic).  
3. **User loses password + recovery key** → permanent loss.  
4. **Metadata on Drive**: object sizes, counts, timestamps visible to Google.  
5. **SFTP server** sees plaintext files (inherent to protocol).  

---

## 7. Security checklist (pre-release)

- [ ] CSP set (no `unsafe-eval` unless unavoidable)  
- [ ] HTML/SVG sandboxed  
- [ ] Capabilities reviewed  
- [ ] Secret scan CI  
- [ ] `cargo audit` / `npm audit`  
- [ ] Zeroize MK on lock  
- [ ] Host key mismatch tested  
- [ ] Recovery key not written to disk by app  
- [ ] OAuth PKCE  
- [ ] Backup of threat model reviewed after Phase 5  

---

## 8. Incident response (maintainer)

If crypto bug found:

1. Bump vault `format_version` if needed.  
2. Publish advisory in GitHub Security.  
3. Migration tool unlock → re-encrypt.  
4. Revoke OAuth client if secret leaked (prefer public PKCE client).  

---

## 9. Privacy policy notes (store listing)

- No analytics by default.  
- Data stays on device / user Drive / user SFTP.  
- Copyright MIT; no account with DocTool vendor required.
