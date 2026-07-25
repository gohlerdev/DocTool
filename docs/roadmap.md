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

## 5. Post-v1 backlog (not committed)

- Windows target  
- WebDAV / Nextcloud  
- Cryptomator import  
- Full OCR  
- Real-time collaboration  
- Terminal pane  
- Browser extension clipper  
- End-to-end automated mobile CI  

---

## 6. Document ownership

| Doc | Owner role |
|-----|------------|
| PLAN.md | Architect summary |
| phases.md | Implementation tracking |
| vault-format.md | Crypto changes only with version bump |
| decisions.md | New ADRs on product change |

When implementation completes a phase, check boxes in `phases.md` and add a short note to CHANGELOG.
