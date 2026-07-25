# DocTool — Extremely Detailed Phase Plan

**Rule:** Finish a phase’s Exit Criteria before starting the next unless tasks are explicitly parallelizable.  
**Master overview:** [PLAN.md](./PLAN.md)

---

## Phase 0 — Foundation & adaptive shell

**Goal:** Product-shaped empty app on desktop; project ready for mobile targets; docs + CI.

### Tasks

| ID | Task | Details | Done when |
|----|------|---------|-----------|
| 0.1 | Repo hygiene | Public MIT `main` already; ensure LICENSE/README | green |
| 0.2 | Branding | package/Cargo/tauri productName DocTool | window title DocTool |
| 0.3 | Tailwind | install, dark tokens from ui-ux.md | sample page styled |
| 0.4 | Routing | Notes/Files/Vault/Settings routes | navigable |
| 0.5 | Adaptive shell | Desktop sidebar vs mobile bottom nav | resize/platform switch works |
| 0.6 | Zustand stores | workspace, ui | compiles |
| 0.7 | Typed invoke stub | `invoke.ts` with greet | works |
| 0.8 | Rust AppError | thiserror codes | serializes to UI |
| 0.9 | Tracing | env filter, no secrets | logs on startup |
| 0.10 | SQLite open | app data path + migrations 001 | file created |
| 0.11 | app_meta + device_id | generate ULID once | persists |
| 0.12 | CI workflow | build FE + cargo test/clippy | GitHub green |
| 0.13 | Mobile docs | README Android/iOS init commands | documented |
| 0.14 | Android init | `tauri android init` when SDK present | project builds or documented blocker |
| 0.15 | iOS init | macOS only; document if no Mac CI | documented |

### Exit criteria

- [ ] Desktop dev launches with 4 sections  
- [ ] SQLite migration applies  
- [ ] CI green  
- [ ] Docs index complete  

### Parallelizable

Docs writing ‖ CI ‖ UI shell.

---

## Phase 1 — Local files + Markdown/Code editors

**Goal:** Open/edit/save local text documents.

| ID | Task | Done when |
|----|------|-----------|
| 1.1 | LocalFsSource + path rules | list/read/write works |
| 1.2 | `fs_*` commands | IPC e2e |
| 1.3 | Files browser UI | navigate dirs |
| 1.4 | FormatRegistry skeleton | register adapters |
| 1.5 | CodeMirror markdown | open/save .md |
| 1.6 | GFM preview | split/tabs |
| 1.7 | Code languages pack | rs/ts/json/yaml/toml/py/go/sh |
| 1.8 | Tabs + dirty + close confirm | multi-file |
| 1.9 | Recents | last 100 |
| 1.10 | Autosave | setting honored |
| 1.11 | Front matter preserve | golden test |
| 1.12 | Mobile file picker | open external file |

### Exit criteria

- [ ] Edit local README.md save reload byte-correct except edits  
- [ ] Code file syntax highlight  
- [ ] Mobile can open a text file via picker  

---

## Phase 2 — Keep-style notes

**Goal:** Full offline notes with search.

| ID | Task | Done when |
|----|------|-----------|
| 2.1 | Migration notes + labels + FTS | schema live |
| 2.2 | notes_* commands | CRUD IPC |
| 2.3 | Notes grid UI | colors, pins |
| 2.4 | Tiptap editor | rich body |
| 2.5 | Labels UX | add/filter |
| 2.6 | Search FTS | matches title/body |
| 2.7 | Archive/trash | soft delete |
| 2.8 | Checklist | task items |
| 2.9 | Export to markdown file | writes local |
| 2.10 | Empty states + FAB | Keep-like |
| 2.11 | Sync status field default local_only | ready for Phase 5 |

### Exit criteria

- [ ] Create colored note offline; restart; present  
- [ ] Search finds note  
- [ ] Success criterion § notes offline met  

---

## Phase 3 — SFTP first-class

**Goal:** Planned servers + remote edit.

| ID | Task | Done when |
|----|------|-----------|
| 3.1 | sftp_profiles table + UI | CRUD metadata |
| 3.2 | Keychain password/key | secrets not in DB |
| 3.3 | russh session manager | connect/disconnect |
| 3.4 | Password auth | list / |
| 3.5 | Key auth | list / |
| 3.6 | Host key TOFU UI | accept stores fp |
| 3.7 | Host key mismatch | hard fail |
| 3.8 | Browse UX desktop+mobile | paths work |
| 3.9 | Open remote text save | e2e |
| 3.10 | Upload/download single | progress event |
| 3.11 | mkdir/rename/delete | confirms |
| 3.12 | Atomic temp write | when supported |
| 3.13 | Integration test container | optional CI |
| 3.14 | Errors UX | friendly messages |

### Exit criteria

- [ ] Key-auth SFTP edit README remote save  
- [ ] Profile survives restart (secret in keychain)  

---

## Phase 4 — PDF

| ID | Task | Done when |
|----|------|-----------|
| 4.1 | PDF.js viewer | multipage |
| 4.2 | Zoom/page/search | usable |
| 4.3 | Highlight + text annotate | saved via pdf-lib |
| 4.4 | Page rotate/delete desktop | saved |
| 4.5 | Merge/split desktop | saved |
| 4.6 | Save to local + SFTP | e2e |
| 4.7 | Mobile light annotate | highlight at least |
| 4.8 | Memory: large PDF smoke | no crash 50MB best-effort |

### Exit criteria

- [ ] Annotate PDF and reopen sees annotation  

---

## Phase 5 — Vault E2EE + dual notes sync

**Goal:** WhatsApp-style Drive backup + dual-write notes.

| ID | Task | Done when |
|----|------|-----------|
| 5.1 | crypto module | unit tests pass |
| 5.2 | vault create + recovery UX | key once + confirm |
| 5.3 | unlock password | verify header |
| 5.4 | unlock recovery key | works |
| 5.5 | lock zeroize | status locked |
| 5.6 | OAuth PKCE Drive | token in keychain |
| 5.7 | object put/get | ciphertext on Drive |
| 5.8 | manifest encrypt | list logical |
| 5.9 | vault file browser | open/save file encrypted |
| 5.10 | notes enqueue dual-write | pending→synced |
| 5.11 | pull second profile/device | note restored |
| 5.12 | conflict auto-duplicate | tested |
| 5.13 | queue backoff UI | errors visible |
| 5.14 | biometric re-unlock mobile | optional works |
| 5.15 | vault-format.md match code | versioned |
| 5.16 | password change | recovery still works |
| 5.17 | idle lock timer | setting |

### Exit criteria

- [ ] Dual-device note restore with password  
- [ ] Restore with recovery key after “forgot password” simulation  
- [ ] Google Drive folder inspection shows non-plaintext  

---

## Phase 6 — Formats & polish

| ID | Task | Done when |
|----|------|-----------|
| 6.1 | Images | viewer |
| 6.2 | HTML sandbox | view/edit source |
| 6.3 | CSV grid | edit save |
| 6.4 | DOCX mammoth | read-only |
| 6.5 | ipynb light | cells |
| 6.6 | Command palette | Ctrl+K |
| 6.7 | Shortcuts | documented |
| 6.8 | Settings complete | all prefs |
| 6.9 | Onboarding wizard | first run |
| 6.10 | Performance pass | budgets |
| 6.11 | A11y pass | keyboard |
| 6.12 | About/license screen | MIT shown |

---

## Phase 7 — v1.0 hardening & release

| ID | Task | Done when |
|----|------|-----------|
| 7.1 | CSP + capabilities audit | checklist signed off |
| 7.2 | Dependency audit | no critical |
| 7.3 | Secret scan history | clean |
| 7.4 | Manual test matrix 4 platforms | sheet filled |
| 7.5 | CHANGELOG | written |
| 7.6 | Tag v1.0.0 | released |
| 7.7 | CONTRIBUTING | published |
| 7.8 | Store assets | screenshots |

### Exit criteria

All [roadmap.md](./roadmap.md) Definition of Done items checked.

---

## Dependency graph

```
0 → 1 → 2 → 5
0 → 1 → 3 → 4
2 → 5
3 → 4 (PDF save remote)
5 → 6 → 7
```

Phase 4 can start after 1 even before 5.  
Phase 5 requires 2.  
Phase 3 requires 1 (editors).

---

## Estimation guide (1 engineer)

| Phase | Rough calendar |
|-------|----------------|
| 0 | 3–5 days |
| 1 | 5–8 days |
| 2 | 5–8 days |
| 3 | 7–12 days |
| 4 | 5–10 days |
| 5 | 12–20 days |
| 6 | 7–12 days |
| 7 | 5–8 days |

Total ballpark **2–4 months** part-time variance excluded.
