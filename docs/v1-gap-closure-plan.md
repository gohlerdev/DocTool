# DocTool — v1.0 Gap Closure Plan (Close Everything)

**Version:** 1.0  
**Date:** 2026-07-26  
**Status:** **Committed for v1.0** — no further deferral of items in this document  
**Supersedes for scope:** [improvement-plan.md](./improvement-plan.md) backlog + former “post-v1” list in [roadmap.md](./roadmap.md)  
**Baseline:** Phases 0–6 done; Phase 7 release in progress; onboarding O1–O3 shipped  

---

## 0. Mandate

**Close the gap entirely in v1.0 only.** Every pending improvement ID, former post-v1 idea, open product question resolution, and original DoD item lands **before** tag `v1.0.0`. Nothing in this plan is “nice later.”

| Rule | Detail |
|------|--------|
| Scope freeze | The inventory in §2 is the closed set. New ideas → v1.1+ only after tag. |
| No silent drops | If something is cut, it needs an explicit ADR + user decision *before* tag. |
| Evidence > claims | Marketing (“encrypted Google Drive”, “multi-device”) only after corresponding IDs pass acceptance. |
| Parallel tracks | Waves allow concurrent work where dependencies allow (notes UI ∥ vault crypto ∥ release infra). |
| Tracking | Live status in [phases/TRACKING.md](./phases/TRACKING.md) under **Phase 8** rows; this doc is the plan of record. |

---

## 1. North-star Definition of Done — v1.0

v1.0 is shippable when **all** of the following are true:

### 1.1 Product (user-visible)

- [ ] Linux, macOS, Android, **iOS** run (dev/internal + documented install).  
- [ ] **Windows** desktop target builds and runs core flows.  
- [ ] Offline Keep notes: search, colors, pins, **labels chips**, long-press, bulk, tasks, export/share.  
- [ ] Note versions / trash recovery; image attachments (local + optional vault encrypt).  
- [ ] Android **quick-capture widget**.  
- [ ] FTS ranking + snippet highlights.  
- [ ] Local E2EE vault: create, unlock password + recovery, **recovery ritual**, change password / rotate recovery, auto-lock, biometrics, backup export/import.  
- [ ] **Google Drive OAuth** + encrypted dual-sync notes; conflict UI; offline/pending indicator.  
- [ ] SFTP first-class + key file picker + reconnect banner + recents polish.  
- [ ] **WebDAV / Nextcloud** source.  
- [ ] PDF view + **annotation save**; **OCR** path for PDFs.  
- [ ] Files: type icons, open-with, large-file progress/streaming.  
- [ ] Desktop **command palette + shortcuts**.  
- [ ] iOS safe-area / home indicator; Android predictive-back consistency; haptics; reduced-motion; dynamic type.  
- [ ] First-run lesson + checklist (done) + contextual coaches + optional sample seed + encryption explainer.  
- [ ] Cryptomator import (read encrypted vaults where format allows).  
- [ ] Browser extension **clipper** (MVP: send selection/page → local notes API or share target).  
- [ ] Optional **terminal pane** (desktop) for SFTP-adjacent shell or local PTY.  
- [ ] Real-time collaboration: **decision locked in §9** — either ship CRDT+E2EE MVP or ship explicit “no multiplayer” with local-only multi-writer conflict model fully documented; **not left ambiguous**.  

### 1.2 Engineering

- [ ] `docs/*` match behavior; this plan’s IDs marked done in TRACKING.  
- [ ] CI: `cargo test` + `tsc` + crypto tests green on main.  
- [ ] E2E mobile CI on emulators (smoke).  
- [ ] No secrets in git; MIT LICENSE; CHANGELOG; tag `v1.0.0`.  
- [ ] Reproducible build notes; store screenshots + privacy copy.  
- [ ] Release-signed Android APK/AAB pipeline documented + runnable.  
- [ ] macOS notarization path documented + at least one notarized build.  
- [ ] iOS TestFlight (or equivalent internal) path documented + one build.  

### 1.3 Security

- [ ] Threat-model checklist completed and residual risks listed.  
- [ ] Host key mismatch hard-fails; vault lock zeroizes keys.  
- [ ] Strict WebView CSP; no remote script.  
- [ ] Crash reporting opt-in only (privacy-safe, no note bodies).  
- [ ] Screenshot warning when vault unlocked (mobile).  

---

## 2. Full inventory (closed set)

**Already done (not re-planned):** O1, O2, O3 · Phases 0–6 core · PDF view · local vault dual-write skeleton · SFTP · appearance system  

**Pending → v1.0 required** (by ID):

### 2.1 Onboarding residual

| ID | Deliverable | Effort | Wave |
|----|-------------|--------|------|
| O4 | Contextual coach: first vault open, first SFTP connect | M | W1 |
| O5 | Optional sample note seed (settings + first-run skip path) | S | W1 |
| O6 | “How encryption works” sheet (Vault + Settings) | S | W1 |

### 2.2 Notes

| ID | Deliverable | Effort | Wave |
|----|-------------|--------|------|
| N1 | Label create + filter chips | M | W2 |
| N2 | Long-press / context menu (pin, color, archive, delete) | M | W2 |
| N3 | Multi-select bulk actions | M | W2 |
| N4 | Task list UX polish (Tiptap) | S | W2 |
| N5 | Export MD + share sheet (mobile) / save dialog (desktop) | M | W2 |
| N6 | Soft-delete trash window + restore; optional versions snapshot | M | W3 |
| N7 | Image attachments (local files; encrypt into vault when unlocked) | L | W3 |
| N8 | Android app widget quick-capture | L | W5 |
| N9 | FTS ranking + highlight snippets in results | M | W3 |

### 2.3 Vault / crypto / sync

| ID | Deliverable | Effort | Wave |
|----|-------------|--------|------|
| V1 | Recovery-key ritual: display once, copy, typed confirm, cannot dismiss early | M | W1 |
| V2 | Biometric unlock (OS keystore wrap of unlock token) | L | W4 |
| V3 | Auto-lock timeout + lock on background/blur | M | W1 |
| V4 | Google Drive OAuth + encrypted blob upload/download | L | W4 |
| V5 | Multi-device conflict UI (LWW default + keep both) | M | W4 |
| V6 | Change password + rotate recovery key | M | W3 |
| V7 | Plain-language crypto status card complete | S | W1 |
| V8 | Export encrypted backup / import vault | L | W4 |
| V9 | Screenshot / screen-capture warning when vault open | S | W1 |
| V10 | Argon2 memory adaptive to device RAM (+ progress UI) | M | W3 |

### 2.4 Files / SFTP / PDF / sources

| ID | Deliverable | Effort | Wave |
|----|-------------|--------|------|
| F1 | SFTP private-key file picker | M | W2 |
| F2 | Connection status + reconnect banner | S | W2 |
| F3 | Recents across local / SFTP / vault | S | W2 |
| F4 | PDF annotation (highlight) + save valid PDF | L | W5 |
| F5 | File-type icons + open-with affordance | S | W2 |
| F6 | Large-file streaming / progress (read/write) | M | W3 |
| F7 | WebDAV / Nextcloud source (browse + r/w text) | L | W5 |

### 2.5 Platform / shell

| ID | Deliverable | Effort | Wave |
|----|-------------|--------|------|
| U1 | Desktop command palette + shortcuts | M | W3 |
| U2 | iOS safe-area + home-indicator polish | M | W5 |
| U3 | Predictive back / history stack consistency (Android WebView) | M | W3 |
| U4 | Haptics on primary actions (Tauri plugin where available) | S | W3 |
| U5 | Reduced-motion full audit | S | W3 |
| U6 | Dynamic type / font scale | M | W5 |
| U7 | Offline / pending dual-sync indicator | S | W4 |
| U8 | Error copy inventory (user-safe strings) | S | W6 |

### 2.6 Performance / reliability

| ID | Deliverable | Effort | Wave |
|----|-------------|--------|------|
| P1 | Notes list virtualization | M | W3 |
| P2 | Argon2 unlock progress + cancel | S | W1 |
| P3 | Strict WebView CSP | M | W3 |
| P4 | Opt-in crash reporting (privacy-safe) | M | W6 |
| P5 | SQLite vacuum + migration tests | S | W6 |

### 2.7 Release / packaging

| ID | Deliverable | Effort | Wave |
|----|-------------|--------|------|
| R1 | Signed Android APK/AAB pipeline docs + script | S | W6 |
| R2 | CHANGELOG + semver + tag discipline | S | W6 |
| R3 | CI: cargo test + tsc + crypto | M | W3 |
| R4 | macOS notarization path | L | W6 |
| R5 | iOS TestFlight path | L | W6 |
| R6 | Screenshots + store privacy copy | M | W6 |
| R7 | Reproducible build notes | M | W6 |

### 2.8 Former “post-v1” — now **in v1**

| ID | Deliverable | Effort | Wave |
|----|-------------|--------|------|
| X1 | **Windows** desktop target | L | W5 |
| X2 | **Cryptomator** import (open existing vault / migrate notes where feasible) | L | W5 |
| X3 | **Full OCR** for PDFs (on-device or pluggable engine; document limits) | L | W5 |
| X4 | **Browser extension clipper** (Chrome/Firefox MVP → notes) | L | W5 |
| X5 | **Real-time collaboration** — resolve per §9; implement chosen path | L | W5–W6 |
| X6 | **Terminal pane** (desktop) | L | W5 |
| X7 | **E2E mobile CI** on emulators (smoke install + launch + note create) | M | W6 |

**Total pending IDs:** O4–O6 (3) + N1–N9 (9) + V1–V10 (10) + F1–F7 (7) + U1–U8 (8) + P1–P5 (5) + R1–R7 (7) + X1–X7 (7) = **56 work items**.

---

## 3. Wave plan (execution sequence)

Waves are **integration gates**. A wave is “closed” only when all its IDs pass acceptance (§5) and TRACKING is updated. Later waves may start design/spike early, but **must not merge** features that depend on unclosed gates.

```
W1 Trust & teach ──► W2 Capture depth ──► W3 Hardening core ──► W4 Cloud & lifecycle
                                                                              │
                    ┌─────────────────────────────────────────────────────────┘
                    ▼
              W5 Platforms & expansion ──► W6 Release & proof ──► tag v1.0.0
```

### Wave 1 — Trust & teach (security UX foundation)

**Theme:** User cannot lock themselves out; crypto is understandable; vault is safe by default.

| ID | Acceptance (short) |
|----|-------------------|
| V1 | Create vault requires copy + typed recovery confirm before success toast |
| V3 | Configurable timeout; lock on app background; session keys zeroized |
| V7 | Vault page shows KDF/AEAD in plain language + link to O6 |
| V9 | Banner when unlocked on mobile: “Screen capture risk” |
| P2 | Unlock shows progress; cancel aborts without partial unlock |
| O4 | First vault / first SFTP show one-shot coach, not every time |
| O5 | Settings toggle seeds one sample note; skip-path optional seed |
| O6 | Sheet explains password, recovery, device-bound, Drive ciphertext |

**Exit:** Threat-model items for recovery/lock updated; manual test script for create→lock→unlock recovery.

**Depends on:** existing vault. **Unblocks:** V2, V4, V6.

---

### Wave 2 — Capture depth (notes + files daily driver)

**Theme:** Notes feel Keep-grade; SFTP less painful on mobile.

| ID | Acceptance (short) |
|----|-------------------|
| N1 | Create label from editor; filter chips on list |
| N2 | Long-press (mobile) / context menu (desktop): pin, color, archive, delete |
| N3 | Multi-select mode + bulk archive/delete/color |
| N4 | Task items toggle with clear hit targets; toolbar affordance |
| N5 | Export single note to `.md`; share sheet on Android |
| F1 | Pick key file from storage into profile (encrypted at rest) |
| F2 | Banner when SFTP disconnected; one-tap reconnect |
| F3 | Recents unified list with source badge |
| F5 | Icons by extension; open-with for unsupported types (OS intent / dialog) |

**Exit:** Notes UX checklist in ui-ux.md §4 fully checked.

**Unblocks:** N6–N9, F6.

---

### Wave 3 — Hardening core (scale, a11y, desktop power, CI start)

**Theme:** Solid local product without cloud.

| ID | Acceptance (short) |
|----|-------------------|
| N6 | Trash retains soft-deleted N days; restore; optional last-K versions |
| N7 | Insert image into note; stored under data dir; vault-encrypt option when unlocked |
| N9 | Search ranks title > body; snippets with `<mark>`/highlight |
| V6 | Change password re-wraps keys; rotate recovery shows new ritual (V1) |
| V10 | Low-RAM devices use reduced Argon2 memory; logged in crypto_info |
| F6 | Progress UI for large read/write; no full-base64 OOM on multi-MB |
| U1 | `Ctrl/Cmd+K` palette: nav, new note, lock vault, open settings |
| U3 | Back from editor returns to list; no app exit mid-flow |
| U4 | Light haptic on FAB save / vault unlock success (if plugin available) |
| U5 | All major animations respect `prefers-reduced-motion` |
| P1 | Notes list virtualized ≥ 500 notes without jank |
| P3 | CSP denies remote scripts; verified in WebView config |
| R3 | GitHub Actions (or equiv): cargo test + tsc on PR |

**Exit:** Local-only user can live in DocTool full-time offline.

---

### Wave 4 — Cloud & vault lifecycle

**Theme:** Dual-sync promise becomes real.

| ID | Acceptance (short) |
|----|-------------------|
| V4 | OAuth link Drive; encrypt notes to Drive folder; pull on sync |
| V5 | Conflict → keep both / keep local / keep remote UI |
| V2 | Biometric unlock after password once; fallback password |
| V8 | Export single encrypted backup file; import on fresh install |
| U7 | Status: pending upload count; offline badge when network down |

**Exit:** Two-device demo (or device + emulator) dual-sync demo recorded; marketing may claim encrypted Drive.

**Depends on:** W1 recovery/lock solid. **Risk:** OAuth platform redirect URIs per OS — budget spike first 2–3 days.

---

### Wave 5 — Platforms & expansion

**Theme:** Every former backlog item lands; multi-platform parity.

| ID | Acceptance (short) |
|----|-------------------|
| F4 | Highlight annotation persists; reopen shows marks; valid `%PDF` |
| F7 | WebDAV profile: browse, open MD, save |
| N8 | Android widget: tap → new note or last note |
| U2 | iOS notches/home indicator; no clipped nav |
| U6 | Respect system font scale; layouts don’t break at large sizes |
| X1 | Windows: `tauri build` MSI/NSIS; notes/files/vault smoke |
| X2 | Import Cryptomator vault path (read files user selects; document format limits) |
| X3 | OCR PDF page → text note or overlay; offline model or explicit download |
| X4 | Extension: “Save to DocTool” creates note via native messaging / share URL scheme |
| X5 | Per §9 decision — shipped implementation |
| X6 | Desktop terminal pane (local shell or SFTP remote shell if feasible) |

**Exit:** Platform matrix green for Linux, macOS, Windows, Android, iOS (core paths).

---

### Wave 6 — Release & proof

**Theme:** Ship quality, trust artifacts, CI depth.

| ID | Acceptance (short) |
|----|-------------------|
| U8 | Error catalog; UI shows friendly message + code, never raw panic |
| P4 | Opt-in crash reporter; default off; no content |
| P5 | Migration tests + vacuum command/docs |
| R1 | Scripted signed release APK/AAB |
| R2 | CHANGELOG complete; `v1.0.0` tag |
| R4 | Notarized macOS build once |
| R5 | TestFlight (or Ad Hoc) iOS build once |
| R6 | Privacy policy / store copy + screenshots set |
| R7 | Reproducible build notes verified by second machine or documented hashes |
| X7 | Emulator CI: install → launch → create note |

**Exit:** Tag `v1.0.0`. All §1 DoD boxes checked.

---

## 4. Dependency graph (critical path)

```
O4–O6, V1,V3,V7,V9,P2  (W1)
        │
        ├──► N*, F1–F5,F6     (W2–W3 notes/files)
        │
        ├──► V6,V10,P1,P3,U1  (W3)
        │         │
        │         ▼
        └──► V2,V4,V5,V8,U7   (W4 cloud) ──► marketing dual-sync
                        │
                        ▼
              F4,F7,N8,U2,U6,X1–X6 (W5)
                        │
                        ▼
              R*,P4,P5,U8,X7   (W6) ──► v1.0.0
```

**Longest poles (start spikes early):**

1. **V4 Google Drive OAuth** (platform redirect, token storage, Drive API)  
2. **X4 Browser extension** + native bridge  
3. **X3 OCR** (model size / on-device vs cloud — prefer on-device)  
4. **V2 Biometrics** per platform  
5. **X1 Windows** + **R4/R5** store/signing  

---

## 5. Acceptance & test strategy

| Layer | What | When |
|-------|------|------|
| Unit | Crypto, sync conflict rules, FTS rank helpers | Every PR W3+ |
| Integration | vault create/unlock/backup; notes dual-write; SFTP TOFU | Wave exits |
| UI manual | Scripts per wave in `docs/testing.md` | Wave exit |
| Emulator | Android smoke (X7) | W6 |
| Threat checklist | [threat-model.md](./threat-model.md) full pass | End W1 + end W4 + pre-tag |

Each ID gets a checkbox in TRACKING; no ID = done without acceptance line.

---

## 6. Workstream ownership model (even solo)

Treat as concurrent swimlanes when one implementer:

| Lane | Owns | Waves heavy |
|------|------|-------------|
| **A Trust** | Vault UI, crypto UX, auto-lock, biometrics, backup | W1, W3–W4 |
| **B Capture** | Notes UX, attachments, FTS, widget | W2–W3, W5 |
| **C Sources** | SFTP, WebDAV, PDF annotate, OCR, Cryptomator, terminal | W2, W5 |
| **D Cloud** | Drive OAuth, sync, conflicts, offline badge | W4 |
| **E Platform** | Windows, iOS, a11y, palette, CSP, haptics | W3, W5 |
| **F Release** | CI, signing, CHANGELOG, extension packaging, E2E | W3, W6 |

Solo mode: complete waves in order; within a wave, do Trust → Capture → Sources before optional polish.

---

## 7. Effort model (planning only)

Rough person-weeks assuming one full-time engineer familiar with the repo:

| Wave | Est. effort | Notes |
|------|-------------|-------|
| W1 | 1.5–2.5 wk | Mostly UI + lock policy |
| W2 | 2–3 wk | High surface notes menus |
| W3 | 3–4 wk | Attachments, virtualization, CI, CSP |
| W4 | 3–5 wk | Drive OAuth dominant risk |
| W5 | 5–8 wk | Many large X* items; parallelize if possible |
| W6 | 2–3 wk | Packaging + proof |
| **Total** | **~17–26 person-weeks** | Calendar longer if serial + review |

If calendar is fixed, **do not drop IDs** — add people or sequence; cuts require ADR.

---

## 8. Risk register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Drive OAuth blocked on mobile WebView | V4 slips | Use system browser / ASWebAuthenticationSession / Chrome Custom Tabs; spike day 1 of W4 |
| Argon2 128MiB kills low-end Android | Unlock unusable | V10 adaptive params early in W3 |
| OCR model size balloons APK | Store rejection / disk | Optional download; or platform OCR APIs |
| Real-time collab vs E2EE | Scope explosion | §9 forces binary decision early (start of W5 at latest) |
| Extension cannot reach Tauri core | X4 fails | Deep link / local HTTP loopback with token / share intent |
| Cryptomator format complexity | X2 partial | Support documented subset; refuse unknown versions clearly |
| Windows WebView2 / path issues | X1 flaky | Smoke matrix early mid-W5 |
| iOS signing / Apple account | R5 blocked | Identify Apple account requirement at plan start |

---

## 9. Locked product decisions (open questions → resolved for v1)

These were open in the improvement plan; **for gap closure they are decided** as follows (change only via ADR):

| # | Question | v1 decision |
|---|----------|-------------|
| Q1 | Seed note if user skips interactive create? | **Yes, optional** — O5: if skip and zero notes, offer “Add sample note” once; never force. |
| Q2 | Force recovery ritual before vault configured? | **Yes** — V1 is mandatory; vault not `configured` until confirm. |
| Q3 | Market “encrypted Google Drive” before V4? | **No** — README/store must say “local vault” until V4 acceptance. |
| Q4 | Distribution targets | **GitHub Releases (all platforms) + Android APK/AAB + optional Play listing + F-Droid metadata if feasible + macOS notarized + iOS TestFlight**; Windows via GitHub installer. |
| Q5 | Real-time collaboration (X5) | **v1 ships “multi-writer via dual-sync conflict UI only” (V5), not live CRDT rooms.** Document as intentional: E2EE + offline-first; true real-time collab deferred to v1.1 **unless** a minimal encrypted relay is finished in W5 without delaying tag — default is **conflict-based multi-device, not live cursors**. *If live collab is mandatory under “all items,” implement **X5-lite**: shared vault folder + conflict UI + “presence” not required; mark X5 as “sync collab” not “OT/CRDT.”* |

**X5-lite (authoritative for this plan):** Multi-device collaboration = dual-sync + V5 conflict resolution + device list in vault status. No live cursors, no shared editing session protocol in v1.0. This satisfies the backlog intent without a multi-year CRDT project.

---

## 10. TRACKING scheme (Phase 8)

Add to [phases/TRACKING.md](./phases/TRACKING.md):

| Phase | Subphase | Title | Status |
|-------|----------|-------|--------|
| 8 | 8A | W1 Trust & teach | todo |
| 8 | 8B | W2 Capture depth | todo |
| 8 | 8C | W3 Hardening core | todo |
| 8 | 8D | W4 Cloud & lifecycle | todo |
| 8 | 8E | W5 Platforms & expansion | todo |
| 8 | 8F | W6 Release & proof | todo |
| 8 | 8G | v1.0.0 tag | todo |

Per-ID checklist lives in [phases/phase-08-v1-gap-closure.md](./phases/phase-08-v1-gap-closure.md) (companion checklist file).

---

## 11. Documentation updates required with this plan

| Doc | Change |
|-----|--------|
| [roadmap.md](./roadmap.md) | Post-v1 section emptied / moved into v1; DoD expanded to match §1 |
| [improvement-plan.md](./improvement-plan.md) | Status: absorbed by this plan; link here |
| [phases/TRACKING.md](./phases/TRACKING.md) | Phase 8 rows |
| [phases/phase-08-v1-gap-closure.md](./phases/phase-08-v1-gap-closure.md) | Checkbox board |
| [docs/README.md](./README.md) | Index entry |
| [threat-model.md](./threat-model.md) | Touch at W1/W4/W6 exits |
| README root | Claims gated on V4 |

---

## 12. Immediate next actions (start execution)

1. Approve this plan as scope freeze (this commit is the freeze).  
2. Create Phase 8 tracking + checklist file.  
3. Start **W1** in order: **V1 → V3 → P2 → V7/V9 → O6 → O4 → O5**.  
4. Spike notes for W4 (Drive OAuth redirect per platform) in parallel docs only.  
5. Do not start W5 megas (OCR, extension, Windows) until W3 CI (R3) is green.

---

## 13. Explicit non-goals (even in “everything” v1)

These are **not** in the inventory and stay out unless new ADR:

- Proprietary cloud account for DocTool itself  
- Server-side note storage operated by us  
- End-to-end encrypted live CRDT multiplayer with presence  
- Supporting every Cryptomator historical format  
- Play/App Store **review approval** (we ship the pipeline + builds; store acceptance is external)

---

*Plan of record for closing the entire gap in v1.0. Implementation begins at Wave 1.*
