# Phase 7 — v1.0 Hardening & Release

| Field | Value |
|-------|--------|
| **Status** | `todo` |
| **Depends on** | Phase 6 complete; Phases 1–5 exit criteria true |
| **Unblocks** | Public v1.0.0 tag |
| **Estimate** | 5–8 days |
| **Specs** | [roadmap.md](../roadmap.md), [threat-model.md](../threat-model.md), [testing.md](../testing.md) |

---

## Phase goal

Security audit, cross-platform QA, release hygiene, tag **v1.0.0**.

---

## Phase exit criteria

- [ ] All [roadmap.md](../roadmap.md) Definition of Done items checked  
- [ ] Threat-model pre-release checklist complete  
- [ ] CI green on `main`  
- [ ] Manual test matrix for Linux + macOS + Android + iOS (or documented gaps)  
- [ ] `CHANGELOG.md` + tag `v1.0.0`  
- [ ] `CONTRIBUTING.md` published  

---

## Subphase 7A — Security audit

**Status:** `todo` · **Legacy:** 7.1–7.3

### Tasks

| ID | Task | Acceptance | Files / area |
|----|------|------------|--------------|
| 7A.1 | Tauri capabilities review | Least privilege doc note | capabilities/ |
| 7A.2 | CSP final values | No unnecessary unsafe | tauri.conf / HTML |
| 7A.3 | HTML/SVG sandbox review | XSS paths closed | editors |
| 7A.4 | Secret scan git history | Clean | gitleaks/manual |
| 7A.5 | `npm audit` / `cargo audit` | No critical unfixed | CI optional job |
| 7A.6 | Host key mismatch retest | Pass | SFTP |
| 7A.7 | Vault lock zeroize review | Code path verified | crypto |
| 7A.8 | IPC never returns secrets | Grep + review | commands |
| 7A.9 | Fill threat-model checklist | All boxes | threat-model.md |

### Done when

Security gate signed off in TRACKING notes.

---

## Subphase 7B — Cross-platform QA

**Status:** `todo` · **Legacy:** 7.4

### Tasks

| ID | Task | Acceptance | Files / area |
|----|------|------------|--------------|
| 7B.1 | Create manual test checklist file | Per platform sections | `docs/manual-test-checklist.md` |
| 7B.2 | Linux desktop full success criteria | Record pass/fail | |
| 7B.3 | macOS desktop full | pass/fail | |
| 7B.4 | Android internal build smoke | Notes + vault + SFTP smoke | |
| 7B.5 | iOS TestFlight/sim smoke | Notes + vault smoke | |
| 7B.6 | Dual-device notes restore demo | Documented steps | |
| 7B.7 | SFTP remote edit demo | Documented | |
| 7B.8 | PDF annotate demo | Documented | |
| 7B.9 | File known issues list | Honest README section | |

### Done when

No **critical** open bugs on primary platforms.

---

## Subphase 7C — Release artifacts

**Status:** `todo` · **Legacy:** 7.5–7.8

### Tasks

| ID | Task | Acceptance | Files / area |
|----|------|------------|--------------|
| 7C.1 | Sync versions package/Cargo/tauri | Same semver | scripts optional |
| 7C.2 | Write `CHANGELOG.md` | User-facing notes | root |
| 7C.3 | Write `CONTRIBUTING.md` | Build + PR guide | root |
| 7C.4 | Release workflow or manual build notes | Linux artifact at min | `.github` / docs |
| 7C.5 | Android AAB/APK internal | Produced | |
| 7C.6 | iOS archive notes | Documented | |
| 7C.7 | Store screenshots (optional) | assets/ | |
| 7C.8 | Tag `v1.0.0` and GitHub release | Published | git |
| 7C.9 | Announce README badges/status | “v1.0” | README |

### Done when

Phase 7 exit criteria satisfied → mark Phase 7 + project v1.0 `done`.

---

## Suggested PR split

1. 7A security fixes  
2. 7B checklist + bugfixes  
3. 7C changelog/contributing/tag  

---

## Risks

| Risk | Mitigation |
|------|------------|
| Store review delays | Ship GitHub binaries first |
| Incomplete iOS signing | Document; ship Android+desktop if blocked |
| Last-minute crypto change | Freeze format_version before tag |
