# Phase 0 — Foundation & Adaptive Shell

| Field | Value |
|-------|--------|
| **Status** | `todo` |
| **Depends on** | None (scaffold exists) |
| **Unblocks** | Phase 1, all later work |
| **Estimate** | 3–5 days |
| **Specs** | [ui-ux.md](../ui-ux.md), [architecture.md](../architecture.md), [data-model.md](../data-model.md), [ipc.md](../ipc.md) |

---

## Phase goal

Ship a **product-shaped empty app**: branded DocTool, adaptive desktop/mobile chrome, four primary destinations, typed IPC, structured Rust errors, SQLite migrations, CI, mobile target docs.

---

## Phase exit criteria

- [ ] `npm run tauri dev` shows DocTool with Notes / Files / Vault / Settings  
- [ ] Desktop sidebar + mobile bottom-nav both work (resize or platform)  
- [ ] SQLite DB created under app data; migration `001` applied  
- [ ] `cargo test` + `npm run build` pass; CI workflow exists  
- [ ] Android/iOS init steps documented (init run if SDK available)  

---

## Subphase 0A — Branding & project hygiene

**Status:** `todo` · **Legacy:** 0.1, 0.2

### Objective

Consistent DocTool naming, license, and package identity across JS and Rust.

### Tasks

| ID | Task | Acceptance | Files / area |
|----|------|------------|--------------|
| 0A.1 | Verify MIT `LICENSE` and copyright | Present at repo root | `LICENSE` |
| 0A.2 | Align `package.json` name/description/license | `doctool`, MIT | `package.json` |
| 0A.3 | Align Cargo package + lib name | `doctool` / `doctool_lib` | `src-tauri/Cargo.toml`, `main.rs` |
| 0A.4 | Align `tauri.conf.json` productName, title, identifier | DocTool, `com.doctool.app` | `src-tauri/tauri.conf.json` |
| 0A.5 | Update HTML title + default App chrome | Title “DocTool” | `index.html`, `src/App.tsx` |
| 0A.6 | Remove leftover “tauri-app” strings | `rg tauri-app` empty (except lock history OK) | repo |

### Acceptance tests

```bash
rg -n "tauri-app|Welcome to Tauri" --glob '!node_modules' --glob '!package-lock.json' --glob '!**/target/**'
# expect no product-facing hits
```

### Done when

All 0A tasks checked; app window title is DocTool.

---

## Subphase 0B — Design system & adaptive shell

**Status:** `todo` · **Legacy:** 0.3, 0.5

### Objective

Install Tailwind (or equivalent token system), implement dark default theme tokens from ui-ux.md, and adaptive shell layout.

### Tasks

| ID | Task | Acceptance | Files / area |
|----|------|------------|--------------|
| 0B.1 | Add Tailwind + PostCSS + config | Utility classes work | `tailwind.config.*`, `src/styles.css` |
| 0B.2 | CSS variables for design tokens | Dark default matches ui-ux.md | `src/styles/tokens.css` |
| 0B.3 | `platform.ts` detect OS + width breakpoint | Returns desktop vs mobile mode | `src/app/platform.ts` |
| 0B.4 | `DesktopShell` sidebar layout | Sidebar + main region | `src/app/DesktopShell.tsx` |
| 0B.5 | `MobileShell` bottom navigation | 4 tabs thumb-reachable | `src/app/MobileShell.tsx` |
| 0B.6 | `AppShell` switches by mode | Resize &lt;900px uses mobile shell | `src/app/AppShell.tsx` |
| 0B.7 | Light/system theme hook (stub OK) | Theme class on `<html>` | `src/stores/ui.ts` |

### Acceptance tests

- Manual: narrow window → bottom nav; wide → sidebar.  
- Tokens: background is dark by default.

### Done when

Empty shells render with correct layout modes.

---

## Subphase 0C — Routing & feature shells

**Status:** `todo` · **Legacy:** 0.4, 0.6

### Objective

Four primary routes with placeholder feature pages; client state stores.

### Tasks

| ID | Task | Acceptance | Files / area |
|----|------|------------|--------------|
| 0C.1 | Add router (React Router or TanStack) | Client routes work in Tauri | `src/app/routes.tsx` |
| 0C.2 | Notes placeholder page | Route `/notes` | `src/features/notes/NotesPage.tsx` |
| 0C.3 | Files placeholder page | Route `/files` | `src/features/files/FilesPage.tsx` |
| 0C.4 | Vault placeholder page | Route `/vault` | `src/features/vault/VaultPage.tsx` |
| 0C.5 | Settings placeholder page | Route `/settings` | `src/features/settings/SettingsPage.tsx` |
| 0C.6 | Nav items wire to routes | Active state styling | shells |
| 0C.7 | Zustand `ui` store | sidebar collapsed, theme | `src/stores/ui.ts` |
| 0C.8 | Zustand `workspace` store stub | tabs array empty | `src/stores/workspace.ts` |
| 0C.9 | Shared types stub | Note, VaultStatus, DirEntry | `src/shared/types/` |

### Acceptance tests

- Click each nav destination; URL/content changes.  
- Refresh deep link to `/settings` works (HashRouter if needed on mobile).

### Done when

All four sections navigable with empty but titled content.

---

## Subphase 0D — Core Rust foundation

**Status:** `todo` · **Legacy:** 0.7, 0.8, 0.9

### Objective

Structured errors, tracing, typed frontend invoke helpers; keep `greet` as smoke test.

### Tasks

| ID | Task | Acceptance | Files / area |
|----|------|------------|--------------|
| 0D.1 | `AppError` enum + serde | IPC returns `{code,message}` | `src-tauri/src/error.rs` |
| 0D.2 | `thiserror` / mapping helper | From io errors | `error.rs` |
| 0D.3 | Init `tracing` + subscriber | Startup log line | `lib.rs` |
| 0D.4 | Ensure no secret fields in Display | Code review | `error.rs` |
| 0D.5 | TS `invoke.ts` wrapper | Typed `greet` | `src/shared/lib/invoke.ts` |
| 0D.6 | Settings smoke: `app_info` command | Returns version + os | `commands/system.rs` |
| 0D.7 | Module folders | `commands/`, `domain/`, `infra/`, `crypto/` stubs | `src-tauri/src/` |

### Acceptance tests

```bash
cd src-tauri && cargo test && cargo clippy -- -D warnings
```

- UI can call `app_info` and show version on Settings placeholder.

### Done when

Rust layout ready; errors structured; tracing on.

---

## Subphase 0E — SQLite & app meta

**Status:** `todo` · **Legacy:** 0.10, 0.11

### Objective

Open DB in app data dir; run migrations; persist `device_id`.

### Tasks

| ID | Task | Acceptance | Files / area |
|----|------|------------|--------------|
| 0E.1 | Resolve app data directory | Platform-correct path | `infra/paths.rs` |
| 0E.2 | Add `rusqlite` (or chosen crate) | Builds | `Cargo.toml` |
| 0E.3 | Migration runner | Applies `001_init.sql` | `infra/db.rs`, `migrations/` |
| 0E.4 | Migration 001: `app_meta`, `vault_state` singleton | Tables exist | `migrations/001_init.sql` |
| 0E.5 | Generate/store `device_id` ULID | Stable across restarts | domain/settings |
| 0E.6 | Command `settings_get` / `settings_set` | Round-trip theme key | IPC |
| 0E.7 | Unit test migration on temp path | `cargo test` | `tests/` or module tests |

### Acceptance tests

- Launch app twice; same `device_id`.  
- DB file visible under app data path.

### Done when

SQLite is the system of record for prefs/meta.

---

## Subphase 0F — CI, mobile targets, docs gate

**Status:** `todo` · **Legacy:** 0.12–0.15

### Objective

Automate quality gates; document mobile; optional android/ios project init.

### Tasks

| ID | Task | Acceptance | Files / area |
|----|------|------------|--------------|
| 0F.1 | GitHub Actions `ci.yml` | FE build + cargo test/clippy | `.github/workflows/ci.yml` |
| 0F.2 | README dev prerequisites | Node, Rust, platform notes | `README.md` |
| 0F.3 | Document `tauri android init` | Commands copy-pasteable | `README.md` or `docs/dev-mobile.md` |
| 0F.4 | Document `tauri ios init` | macOS requirement clear | same |
| 0F.5 | Run android init if SDK present | Or note blocker in TRACKING | `src-tauri/gen` or note |
| 0F.6 | Phase 0 checklist review | This file exit criteria | TRACKING.md |

### Acceptance tests

- CI green on PR (or local act).  
- New contributor can follow README to run desktop dev.

### Done when

Phase 0 exit criteria all checked → mark Phase 0 `done` in [TRACKING.md](./TRACKING.md).

---

## Suggested PR split

1. `phase-0A/0B` branding + shell  
2. `phase-0C` routing  
3. `phase-0D/0E` rust + sqlite  
4. `phase-0F` CI  

---

## Risks

| Risk | Mitigation |
|------|------------|
| Hash vs browser router on Tauri | Prefer HashRouter if path routing fails |
| Mobile init without SDKs | Document blockers; don’t block desktop |
| Tailwind + Vite setup friction | Follow official Vite+TW guide |
