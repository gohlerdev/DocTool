# DocTool — Research-Based Improvement Plan

**Version:** 1.1  
**Date:** 2026-07-26  
**Status:** **Absorbed for execution by [v1-gap-closure-plan.md](./v1-gap-closure-plan.md)** — all pending IDs committed to v1.0  
**Inputs:** Current codebase (phases 0–6 done, release in progress), threat model, UI/UX spec, deferred roadmap items, industry onboarding research (2024–2026)

---

## 0. Executive summary

DocTool already ships a coherent MVP: Keep-style notes, local/SFTP files, PDF view, Argon2id + AES-GCM vault, dual-write sync skeleton, multi-theme dense mobile shell. The biggest gaps vs a **trustworthy daily-driver** are:

1. **First-run education** — crypto/vault is invisible value until explained; cold open feels empty.  
2. **Deferred core promises** — Google Drive OAuth, biometrics, full PDF annotate, multi-device proof.  
3. **Trust & recovery UX** — recovery-key ritual, lock state clarity, threat transparency.  
4. **Depth over width** — notes labels/color workflows, SFTP polish, search quality, offline resilience.  
5. **Release engineering** — signed store builds, CI gates, iOS/macOS parity, changelog/DoD.

This plan ranks improvements by **user impact**, **security leverage**, and **effort**, and ties each area to research or product evidence.

**Shipping now (this cycle):** interactive first-install onboarding lesson (see §1 and implementation in `src/features/onboarding/`).

---

## 1. Research base (onboarding & product activation)

### 1.1 Industry patterns (2024–2026)

| Pattern | Evidence | DocTool application |
|---------|----------|---------------------|
| **Interactive > carousel** | Interactive onboarding outperforms static slides; users learn by doing (VWO, DesignStudio, Userpilot). | Guided “create first note” that writes a real note, not a fake demo. |
| **First value ≤ 60s** | Strong flows get a meaningful action under a minute (UXCam / retention guides). | Step 1–2: welcome → create note. |
| **≤ 5 primary steps** | Drop-off rises after ~5 screens; keep core path short. | 5-step lesson + optional post-checklist. |
| **Always allow skip** | Forced tours get dismissed blindly. | Skip / “I’ll explore” on every step; re-run from Settings. |
| **Progress visible** | Dots / checklist raise completion. | Step indicator + completion checklist. |
| **Permissions after value** | Ask only when needed. | No notification/storage prompts in onboarding; vault password only if user chooses setup. |
| **Privacy products need recovery ritual** | Password managers (1Password, Bitwarden) force recovery awareness before finish. | Dedicated vault step: explain recovery key *before* deep vault setup; optional deferred setup. |
| **Empty states as coaching** | Progressive disclosure beats one long tour. | After lesson: contextual empty-state CTAs and “Getting started” checklist chip. |
| **Personalization if it changes UI** | Only ask what mutates experience. | Optional theme/density pick in final step (already wired in Settings). |

### 1.2 DocTool-specific activation goals

| Goal | Success signal |
|------|----------------|
| G1 User creates ≥1 note in first session | Onboarding step completed or note count ≥ 1 |
| G2 User understands vault is optional but valuable | Vault step viewed or skipped knowingly |
| G3 User can find Notes / Files / Vault / Settings | Nav map step completed |
| G4 Recovery-key concept introduced before vault create | Copy + confirm checkbox when they create later |
| G5 Onboarding completable offline | No network required |

### 1.3 Anti-patterns we avoid

- Multi-screen marketing carousels with no action.  
- 12 coach-mark tooltips on day one.  
- Blocking vault password setup before any note exists.  
- “Sign up for account” (DocTool is local-first — keep it that way).  
- Hiding Skip behind tiny text.

---

## 2. Current product snapshot (baseline)

| Area | Status | Notes |
|------|--------|-------|
| Notes (CRUD, pin, archive, color, FTS, Tiptap) | Done | Labels UI thin; masonry optional |
| Local files + CodeMirror MD/code | Done | |
| SFTP profiles + TOFU + r/w | Done | UX dense; key paste awkward on mobile |
| PDF view | Done | Annotation deferred |
| Local E2EE vault + dual-write | Done | Drive OAuth deferred |
| Appearance (themes, density, nav, layout) | Done | |
| Biometrics | Deferred | |
| iOS / macOS ship quality | Partial | Android ahead |
| First-run onboarding | **None → shipping** | Interactive lesson |
| Google Drive vault upload | Deferred | Local vault works |
| Desktop keyboard palette | Spec only | |

---

## 3. Improvement portfolio (what we can improve)

Priorities: **P0** ship / fix soon · **P1** next milestone · **P2** post-v1 · **P3** explore.

### 3.1 Onboarding & education — **P0**

| ID | Improvement | Why | Effort |
|----|-------------|-----|--------|
| O1 | Interactive first-install lesson (5 steps) | Activation + privacy comprehension | S — **in progress** |
| O2 | Replay lesson from Settings | Power users / reinstall education | S |
| O3 | Persistent “Getting started” checklist (dismissible) | Progressive goals after skip | S |
| O4 | Contextual coach (first vault open, first SFTP) | Teach at moment of need | M |
| O5 | Sample note seed (optional) | Demo content without pollution | S |
| O6 | In-app “How encryption works” sheet | Trust without leaving app | S |

**Metrics (later):** completion rate, skip rate, notes created in session 1, vault configured by day 7.

---

### 3.2 Notes depth — **P1**

| ID | Improvement | Why | Effort |
|----|-------------|-----|--------|
| N1 | Label create/filter chips UX | Spec’d; partially missing | M |
| N2 | Long-press / context menu (pin, color, archive, delete) | Mobile Keep parity | M |
| N3 | Multi-select bulk actions | Power users | M |
| N4 | Checklist / task UX polish in Tiptap | Daily capture quality | S |
| N5 | Export note as Markdown / share sheet | Interop | S–M |
| N6 | Note versions / trash recovery window | Safety | M |
| N7 | Attach images (local, optional vault encrypt) | Common request class | L |
| N8 | Widgets / quick-capture (Android) | Capture < 2 taps outside app | L |
| N9 | FTS ranking + highlight snippets | Search trust | M |

---

### 3.3 Vault, crypto & trust — **P0/P1**

| ID | Improvement | Why | Effort |
|----|-------------|-----|--------|
| V1 | Recovery-key confirmation ritual (copy + typed confirm) | Prevent lockout | M |
| V2 | Biometric unlock (Android/iOS keystore wrap) | Daily unlock friction | L |
| V3 | Auto-lock timeout + background lock | Threat model ADV5/7 | M |
| V4 | Google Drive OAuth + encrypted upload | Core dual-sync promise | L |
| V5 | Multi-device conflict UI (LWW explain / pick) | Dual-write reality | M |
| V6 | Change password / rotate recovery | Lifecycle | M |
| V7 | Plain-language crypto status card (already partial) | Trust | S |
| V8 | Export encrypted backup / import vault | Portability | L |
| V9 | Screen-capture / screenshot warning when vault open | Mobile OPSEC optional | S |
| V10 | Argon2 params adaptive by device RAM | Low-end Android UX | M |

---

### 3.4 Files, SFTP, PDF — **P1/P2**

| ID | Improvement | Why | Effort |
|----|-------------|-----|--------|
| F1 | SFTP key file picker (not only paste) | Mobile key UX | M |
| F2 | Connection status + reconnect banner | Reliability feel | S |
| F3 | Recents polish across sources | Desktop IA | S |
| F4 | PDF annotation (highlight + save) | Roadmap M4 remainder | L |
| F5 | Better binary/file type icons + open-with | Files browser | S |
| F6 | Large-file streaming / progress | Avoid OOM on big blobs | M |
| F7 | WebDAV / Nextcloud source | Post-v1 backlog | L |

---

### 3.5 Platform & shell UX — **P1**

| ID | Improvement | Why | Effort |
|----|-------------|-----|--------|
| U1 | Desktop command palette + shortcuts | ui-ux.md keyboard principle | M |
| U2 | iOS safe-area + home-indicator polish | Parity | M |
| U3 | Predictive back / history stack consistency | Android feel | M |
| U4 | Haptics on primary actions (plugin) | Tactile polish | S |
| U5 | Reduced-motion audit complete | a11y | S |
| U6 | Dynamic type / font scale | a11y | M |
| U7 | Offline indicator when dual-sync pending | Honesty | S |
| U8 | Error copy inventory (actionable, no raw IPC) | Support burden | S |

---

### 3.6 Performance & reliability — **P1**

| ID | Improvement | Why | Effort |
|----|-------------|-----|--------|
| P1 | Notes list virtualization for large corpora | Scale | M |
| P2 | Vault Argon2 unlock progress + cancel | Perceived hang | S |
| P3 | Strict WebView CSP / no remote script | Threat model ADV3 | M |
| P4 | Crash reporting opt-in (privacy-safe) | Quality signal | M |
| P5 | SQLite vacuum / migration tests | Longevity | S |

---

### 3.7 Release, packaging, docs — **P0 for v1.0**

| ID | Improvement | Why | Effort |
|----|-------------|-----|--------|
| R1 | Release-signed Android APK/AAB pipeline docs | Distribution | S (partially done) |
| R2 | CHANGELOG + semver tags | DoD | S |
| R3 | CI: `cargo test` + `tsc` + crypto tests | Roadmap DoD | M |
| R4 | macOS notarization path | Desktop ship | L |
| R5 | iOS TestFlight path | Mobile ship | L |
| R6 | Screenshots + store listing privacy copy | Trust | M |
| R7 | Reproducible build notes | Security audience | M |

---

### 3.8 Product expansion (post-v1, P2–P3)

From existing roadmap + sensible adjacencies:

- Windows target  
- Cryptomator import  
- Full OCR for PDFs  
- Browser extension clipper  
- Real-time collab (probably never — conflicts with E2EE story unless CRDT+E2EE)  
- Terminal pane  
- End-to-end mobile CI on emulators  

---

## 4. Suggested sequencing (milestones)

### M-Onboard (now)

- [x] Plan document  
- [x] Interactive first-install lesson (O1)  
- [x] Replay from Settings (O2)  
- [x] Optional getting-started checklist chip (O3)  

### M-Trust (next)

- V1 recovery ritual, V3 auto-lock, O6 encryption explainer, P2 unlock progress  
- Threat-model checklist pass  

### M-Notes+ (next)

- N1–N5, long-press menu, export MD  

### M-Cloud (release critical if dual-sync marketed)

- V4 Drive OAuth, V5 conflict UI, U7 pending indicator  

### M-Store

- R1–R7, biometrics V2, PDF annotate F4 as stretch  

---

## 5. Interactive onboarding lesson design (spec)

### 5.1 Trigger

- Show when `settings_get("onboarding.v1.completed")` is not `"1"`.  
- After complete or skip-all: set `"1"`.  
- Settings → “Replay onboarding lesson” clears flag and opens lesson.

### 5.2 Steps (max 5)

| # | Id | Type | User action | Outcome |
|---|-----|------|-------------|---------|
| 0 | welcome | content | Continue | Understand product promise |
| 1 | first_note | **interactive** | Title + body → Save note | Real note in DB |
| 2 | vault_intro | content + choice | “I’ll set up later” or “Open Vault after” | Informed optional crypto |
| 3 | map | content | Continue | Know four destinations |
| 4 | done | content + checklist | Finish | Land on Notes |

### 5.3 Copy principles

- Short sentences; no jargon without one-line gloss.  
- Vault: “Your password never leaves this device. We cannot reset it.”  
- Recovery: mention once; full ritual lives on Vault create.  
- No guilt on Skip.

### 5.4 Visual

- Full-screen overlay in mobile shell (no bottom nav).  
- Progress dots, primary + ghost Skip.  
- Dense, system fonts, tokens only — matches modern UI plan.  
- `prefers-reduced-motion` honored.

### 5.5 Success criteria

- First open shows lesson; second open does not.  
- Completing step 1 creates a searchable note.  
- Skip marks complete (no nag loop); Settings can restart.  
- Works offline; no Drive dependency.

---

## 6. Measurement (lightweight, privacy-first)

Prefer **local counters** over telemetry:

| Event | Storage |
|-------|---------|
| onboarding_completed / skipped | meta key |
| first_note_via_onboarding | note id prefix or flag |
| vault_configured_at | existing vault status |

If analytics ever added: opt-in only, no note bodies, no hostnames.

---

## 7. Decision log (this plan)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Onboarding style | Interactive lesson, not carousel-only | Research: learn-by-doing |
| Vault in onboarding | Educate, don’t force create | Avoid abandoning users mid-Argon2 |
| Persistence | SQLite meta via `settings_set` | Survives WebView cache clear better than localStorage alone |
| Sample data | Optional real note from user input | Avoid fake “demo” pollution |

---

## 8. Document index updates

- This file: `docs/improvement-plan.md`  
- Implementation: `src/features/onboarding/`  
- Related: [ui-ux.md](./ui-ux.md), [roadmap.md](./roadmap.md), [threat-model.md](./threat-model.md), [ui/modern-mobile-ui-plan.md](./ui/modern-mobile-ui-plan.md)

---

## 9. Open questions (for later)

1. Should first-run seed a single “Welcome to DocTool” note if user skips interactive create?  
2. Force recovery-key download UI before marking vault “configured”?  
3. Should Drive OAuth block v1.0 marketing claims of “encrypted Google Drive”? (Recommend yes.)  
4. Target store: F-Droid / GitHub releases only vs Play?

---

*O1–O3 shipped. Remaining inventory executes only via [v1-gap-closure-plan.md](./v1-gap-closure-plan.md) (Phase 8, waves W1–W6).*
