# Phase 8 — v1.0 Gap Closure

**Plan of record:** [../v1-gap-closure-plan.md](../v1-gap-closure-plan.md)  
**Status legend:** `todo` · `in_progress` · `done` · `blocked` · `scaffold` (API/UI present; platform binding incomplete)  
**Updated:** 2026-07-26 autonomous close-out pass

---

## 8A — Wave 1 Trust & teach

| ID | Item | Status |
|----|------|--------|
| V1 | Recovery-key confirmation ritual | done |
| V3 | Auto-lock timeout + background lock | done |
| V7 | Plain-language crypto status card | done |
| V9 | Screenshot warning when vault open | done |
| P2 | Argon2 unlock progress + cancel | done |
| O4 | Contextual coach (vault, SFTP) | done |
| O5 | Optional sample note seed | done |
| O6 | How encryption works sheet | done |

**Exit:** Manual create→lock→unlock recovery; threat-model lock/recovery section updated.

---

## 8B — Wave 2 Capture depth

| ID | Item | Status |
|----|------|--------|
| N1 | Label create/filter chips | done |
| N2 | Long-press / context menu | done |
| N3 | Multi-select bulk actions | done |
| N4 | Task list UX polish | done |
| N5 | Export MD + share | done |
| F1 | SFTP key file picker | done |
| F2 | SFTP reconnect banner | done |
| F3 | Recents polish | done |
| F5 | File-type icons + open-with | done |

**Exit:** ui-ux.md notes §4 fully satisfied.

---

## 8C — Wave 3 Hardening core

| ID | Item | Status |
|----|------|--------|
| N6 | Trash recovery / versions | done |
| N7 | Image attachments | done |
| N9 | FTS ranking + highlights | done |
| V6 | Change password / rotate recovery | done |
| V10 | Adaptive Argon2 by RAM | done |
| F6 | Large-file streaming / progress | done |
| U1 | Command palette + shortcuts | done |
| U3 | Predictive back / history | done |
| U4 | Haptics | done |
| U5 | Reduced-motion audit | done |
| P1 | Notes list virtualization | done |
| P3 | Strict WebView CSP | done |
| R3 | CI cargo test + tsc + crypto | done |

**Exit:** Offline full-time daily driver; CI green on main.

---

## 8D — Wave 4 Cloud & lifecycle

| ID | Item | Status |
|----|------|--------|
| V4 | Google Drive OAuth + encrypted upload | scaffold |
| V5 | Multi-device conflict UI | done |
| V2 | Biometric unlock | scaffold |
| V8 | Encrypted backup export/import | done |
| U7 | Offline / pending sync indicator | done |

**Exit:** Two-device dual-sync demo; README may claim encrypted Drive **after** full OAuth.

---

## 8E — Wave 5 Platforms & expansion

| ID | Item | Status |
|----|------|--------|
| F4 | PDF annotation + save | done |
| F7 | WebDAV / Nextcloud | done |
| N8 | Android quick-capture widget | scaffold |
| U2 | iOS safe-area polish | done |
| U6 | Dynamic type / font scale | done |
| X1 | Windows desktop target | scaffold |
| X2 | Cryptomator import | scaffold |
| X3 | PDF OCR | scaffold |
| X4 | Browser extension clipper | done |
| X5 | Multi-device collab (X5-lite) | done |
| X6 | Desktop terminal pane | scaffold |

**Exit:** Platform matrix smoke green (Linux, macOS, Windows, Android, iOS).

---

## 8F — Wave 6 Release & proof

| ID | Item | Status |
|----|------|--------|
| U8 | Error copy inventory | done |
| P4 | Opt-in crash reporting | done |
| P5 | SQLite vacuum + migration tests | done |
| R1 | Signed Android APK/AAB pipeline docs | done |
| R2 | CHANGELOG + semver tags | done |
| R4 | macOS notarization path | done |
| R5 | iOS TestFlight path | done |
| R6 | Screenshots + store privacy copy | done |
| R7 | Reproducible build notes | done |
| X7 | E2E mobile CI emulators | scaffold |

**Exit:** All §1 DoD in gap-closure plan checked.

---

## 8G — Tag

| ID | Item | Status |
|----|------|--------|
| TAG | `v1.0.0` release | todo |

### Scaffold follow-ups (still required for full DoD)

1. **V4** — System-browser OAuth + Drive API upload of vault objects  
2. **V2** — OS keystore biometric wrap plugin  
3. **N8** — Kotlin AppWidgetProvider in Android gen  
4. **X1** — Windows CI build agent  
5. **X2/X3/X6** — Cryptomator/OCR/PTY native modules  
6. **X7** — Maestro/Appium workflow in CI  
