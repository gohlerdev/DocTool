# DocTool — Locked Product Decisions (ADRs)

**Status:** Binding unless superseded by a new ADR in this file.  
**Last updated:** 2026-07-25

---

## How to use this file

Every major choice is an Architecture Decision Record (ADR).  
Format: Context → Decision → Consequences → Alternatives rejected.

Do not reverse a decision in code without adding a new ADR and updating `PLAN.md`.

---

## ADR-001 — Multi-platform from day one

**Context:** User requires iOS and Android alongside Linux and macOS from day 1, not as a later port.

**Decision:** Ship **Tauri 2** with a single React UI + Rust core targeting Linux, macOS, iOS, Android. Adaptive UI (desktop shell vs mobile bottom-nav). Feature parity matrix allows reduced PDF edit and bulk SFTP on mobile, but all four binaries exist in the project from Phase 0.

**Consequences:**
- Mobile layouts and sandboxed FS must be designed early.
- CI/docs must mention Android SDK + Xcode.
- Some plugins may need thin native bridges.

**Rejected:** Electron desktop + React Native mobile (two codebases). Flutter-only (weaker shared SFTP/crypto/editor ecosystem for this product).

---

## ADR-002 — Stack: Tauri 2 + React + TypeScript + Rust

**Context:** Need native FS/SFTP/crypto, multi-platform, secure IPC.

**Decision:** Tauri 2 shell; React+TS frontend; all secrets, SFTP, crypto, Drive I/O in Rust.

**Consequences:** Team needs Node + Rust toolchains; WebView differences across OS.

**Rejected:** Electron (heavier, larger attack surface). Pure web (no real SFTP).

---

## ADR-003 — License MIT, public repository

**Context:** Product will be public and free with copyright permissions retained by author.

**Decision:**
- License: **MIT**
- Copyright: © 2026 gohlerdev
- Repository: public on GitHub (`gohlerdev/DocTool`)
- Default branch: **`main`**

**Consequences:** Anyone may use/modify/distribute with attribution; no copyleft obligation.

**Rejected:** GPL (copyleft too strict for stated intent). Proprietary (contradicts public free).

---

## ADR-004 — Vault recovery: password + offline recovery key

**Context:** WhatsApp-style E2EE backups offer password or long recovery key. Hosted HSM key vault adds infrastructure and trust.

**Decision:**
- Unlock with **password** (Argon2id → master key) **or**
- Unlock with **offline recovery key** (high-entropy, shown once at creation).
- **No** hosted HSM / Backup Key Vault in v1.
- Losing both password and recovery key ⇒ data permanently unrecoverable.

**Consequences:** UX must force recovery-key backup confirmation; support burden is “we cannot reset.”

**Rejected:** Server-side key escrow. SMS recovery. Single password only (no recovery path).

---

## ADR-005 — Notes sync: dual-write

**Context:** Notes must work offline (Keep-like) and sync privately via encrypted Drive.

**Decision:**
- **Local SQLite is always written first** (source of truth for latency).
- When vault is configured, unlocked, and Drive linked: **encrypt note payload and upload** to vault objects.
- Sync queue with backoff; conflict rules documented in `notes-sync.md`.

**Consequences:** Need conflict handling and queue UI; never block create-note on network.

**Rejected:** Local-only notes (no multi-device). Vault-only notes (bad offline UX). Plaintext Drive sync.

---

## ADR-006 — SFTP is first-class

**Context:** User requires remote file browser mainly SFTP; “keep SFTP planned” = connection profiles are core.

**Decision:** Phase 3 delivers full SFTP browse/open/save with planned connection profiles. Not optional/plugin-only for v1.

**Consequences:** SSH host key TOFU, keychain for credentials, mobile simplified browser.

**Rejected:** Defer SFTP after v1. WebDAV-only first.

---

## ADR-007 — Google Drive stores ciphertext only

**Context:** User wants GDrive function encrypted like WhatsApp backups.

**Decision:** Client-side AES-256-GCM; Drive holds opaque blobs + public vault header; Google cannot read note/file plaintext.

**Consequences:** Custom vault format (`vault-format.md`); OAuth only for storage API.

**Rejected:** Relying on Google’s server-side encryption alone. Cryptomator format v1 (interop later optional).

---

## ADR-008 — Windows not day-1

**Context:** User asked Linux, macOS, iOS, Android.

**Decision:** Windows is non-blocking architecture-compatible but not a v1 success criterion.

**Consequences:** No Windows CI required for v1; Tauri still can target it later cheaply.

---

## ADR-009 — No real-time collaboration in v1

**Context:** Scope control.

**Decision:** Single-user editing; multi-device via dual-sync, not OT/CRDT co-editing.

---

## ADR-010 — Editor split: CodeMirror vs Tiptap

**Context:** Need source-faithful markdown/code and Keep-like rich notes.

**Decision:**
- **CodeMirror 6** for markdown source, code, config files.
- **Tiptap** for note rich body.
- **PDF.js + pdf-lib** for PDF view/edit.

**Rejected:** One editor for everything (poor fit). Monaco only (heavy on mobile).

---

## Decision summary table

| ID | Topic | Decision |
|----|--------|----------|
| D1 / ADR-001 | Platforms | Linux, macOS, iOS, Android day 1 |
| D2 / ADR-002 | Stack | Tauri 2 + React + TS + Rust |
| D3 / ADR-003 | License | MIT, public, copyright gohlerdev |
| D4 / ADR-003 | Branch | `main` |
| D5 / ADR-004 | Vault recovery | Password + offline recovery key |
| D6 / ADR-005 | Notes sync | Dual-write local + encrypted vault |
| D7 / ADR-006 | SFTP | First-class Phase 3 |
| D8 / ADR-007 | Drive | Client-side E2EE only |
| D9 / ADR-008 | Windows | Later |
| D10 / ADR-009 | Collab | Out of scope v1 |
