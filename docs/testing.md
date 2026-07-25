# DocTool — Testing Strategy

---

## 1. Goals

1. Crypto correctness before any Drive upload.  
2. No silent note loss in dual-sync.  
3. SFTP ops verified against real SSH server in CI when possible.  
4. UI smoke on desktop; manual matrix for mobile.

---

## 2. Test layers

| Layer | Tool | Location |
|-------|------|----------|
| Rust unit | `cargo test` | `src-tauri/src/**` |
| Rust integration | `cargo test --test *` | `src-tauri/tests/` |
| TS unit | `vitest` | `src/**/*.test.ts` |
| Component | vitest + Testing Library | `src/**/*.test.tsx` |
| E2E desktop | Playwright or manual script | `e2e/` P1 |
| Manual mobile | checklist | `docs/manual-test-checklist.md` later |

---

## 3. Crypto tests (mandatory Phase 5)

- Known answer: encrypt/decrypt fixed plaintext with fixed key/nonce (test-only vectors).  
- Wrong password fails header verify.  
- Recovery key unlock.  
- Password change.  
- Corrupt ct fails.  
- Empty payload.  
- Large payload 10MB.

---

## 4. Notes sync tests

Simulate in memory / temp Drive mock:

- Offline create → pending → mock upload → synced.  
- Pull creates local.  
- Conflict matrix all rows from notes-sync.md §10.  
- Queue backoff increments attempts.

Mock trait `ObjectStore` for Drive.

---

## 5. SFTP tests

```bash
docker run -d --name doctool-sftp -p 2222:22 \
  -e USER_NAME=test -e USER_PASSWORD=pass \
  atmoz/sftp:latest test:pass:1001
```

Tests: connect, list, write, read, rename, delete, bad password.

CI: optional job `sftp-integration` with service container.

---

## 6. Adapter golden tests

For each fixture in `testdata/`:

1. open(bytes)  
2. getBytes() without edits  
3. assert equal to original for text formats  

PDF: open + annotate + save produces valid PDF header `%PDF`.

---

## 7. CI gates (`.github/workflows/ci.yml`)

On PR and push to `main`:

```
- npm ci
- npm run build
- npm test          # when vitest added
- cargo fmt --check
- cargo clippy -- -D warnings
- cargo test
- rg secrets? optional gitleaks
```

---

## 8. Performance budgets (targets)

| Operation | Budget |
|-----------|--------|
| App cold start desktop | < 2.5s to interactive |
| Notes list 1000 notes | < 100ms filter local |
| Open 5MB markdown | < 500ms |
| Vault unlock (Argon2) | < 3s mid-range phone |
| SFTP list 500 entries | < 1s after connect |

Measure manually; automate later.

---

## 9. Manual mobile checklist (excerpt)

- [ ] Install Android debug build  
- [ ] Create note, kill app, note persists  
- [ ] Vault create + recovery key confirm  
- [ ] Biometric unlock (if enabled)  
- [ ] SFTP connect key auth  
- [ ] Open md, edit, save  
- [ ] Rotate device orientation editors  

---

## 10. Fixtures directory

```
testdata/
  markdown/
  code/
  config/
  pdf/
  csv/
  docx/
  ipynb/
  crypto/
  notes/
```

Do not put real secrets in fixtures.
