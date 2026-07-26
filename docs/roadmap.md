# DocTool — Roadmap, Milestones & Definition of Done

---

## 1. Product milestones

| Milestone | Phases | Ships |
|-----------|--------|-------|
| M0 Scaffold | 0 | Empty adaptive app + CI + docs |
| M1 Local docs | 1 | Markdown/code local edit |
| M2 Notes | 2 | Keep-like offline notes |
| M3 Remote | 3 | SFTP production-usable |
| M4 PDF | 4 | View + annotate |
| M5 Vault | 5 | E2EE Drive + dual-sync notes |
| M6 Polish | 6 | Formats + UX |
| M7 v1.0 | 7 | Public release quality |

---

## 2. Locked constraints (reminder)

- Platforms: Linux, macOS, iOS, Android  
- License: MIT public  
- Branch: main  
- Vault: password + recovery key  
- Notes: dual-write  
- SFTP: first-class  

---

## 3. Definition of Done — v1.0

### Product

- [ ] Runs on Linux, macOS, Android, iOS (dev/internal distribution OK)  
- [ ] Offline Keep notes with search, colors, pins, labels  
- [ ] Dual-sync encrypted notes to Google Drive vault  
- [ ] Unlock with password and with recovery key  
- [ ] SFTP profile key auth; browse; edit; save remote markdown  
- [ ] PDF view + annotation save  
- [ ] Local markdown live preview + front matter preserve  

### Engineering

- [ ] `docs/*` match implemented behavior (update docs if drifted)  
- [ ] CI green on main  
- [ ] Crypto unit tests pass  
- [ ] No secrets in git  
- [ ] MIT LICENSE present  

### Security

- [ ] Threat model checklist completed  
- [ ] Host key mismatch blocks connect  
- [ ] Vault lock zeroizes session keys  

### Release

- [ ] Tag `v1.0.0`  
- [ ] CHANGELOG  
- [ ] README quickstart accurate  

---

## 4. Success demos (record GIFs later)

1. Mobile: create note → appears in list.  
2. Desktop: SFTP open README → edit → save.  
3. Vault: create → show recovery → lock → unlock with recovery.  
4. Two devices: note dual-sync.  
5. PDF highlight save reopen.

---

## 5. Former post-v1 — **committed to v1.0**

All of the following are **in scope for v1.0** under [v1-gap-closure-plan.md](./v1-gap-closure-plan.md) (IDs X1–X7 + full improvement portfolio). Nothing below is deferred past `v1.0.0`:

- Windows target (X1)  
- WebDAV / Nextcloud (F7)  
- Cryptomator import (X2)  
- Full OCR (X3)  
- Multi-device collab via dual-sync + conflict UI (X5-lite; not live CRDT)  
- Terminal pane (X6)  
- Browser extension clipper (X4)  
- End-to-end automated mobile CI (X7)  

**Execution:** Phase 8 waves W1→W6, then tag `v1.0.0`.

---

## 6. Document ownership

| Doc | Owner role |
|------|------------|
| PLAN.md | Architect summary |
| phases/README.md + phase-0N-*.md | Implementation task breakdown |
| phases/TRACKING.md | Live status |
| vault-format.md | Crypto changes only with version bump |
| decisions.md | New ADRs on product change |

When implementation completes a subphase, update [phases/TRACKING.md](./phases/TRACKING.md) and tick boxes in the phase file. When a full phase exits, note it in CHANGELOG.
