# Phase 6 — Formats & Polish

| Field | Value |
|-------|--------|
| **Status** | `todo` |
| **Depends on** | Phases 1–5 substantially complete |
| **Unblocks** | Phase 7 release |
| **Estimate** | 7–12 days |
| **Specs** | [formats.md](../formats.md), [ui-ux.md](../ui-ux.md) |

---

## Phase goal

Expand format support; command palette; settings/onboarding; performance and accessibility pass so the app feels finished.

---

## Phase exit criteria

- [ ] Images, HTML (sandboxed), CSV, DOCX view, ipynb light each open a fixture  
- [ ] Ctrl/Cmd+K command palette on desktop  
- [ ] First-run wizard completable  
- [ ] Settings cover theme, autosave, vault lock timer, about/license  
- [ ] Keyboard navigation critical paths work  
- [ ] Performance budgets smoke-checked (see testing.md)  

---

## Subphase 6A — Extra format adapters

**Status:** `todo` · **Legacy:** 6.1–6.5

### Tasks

| ID | Task | Acceptance | Files / area |
|----|------|------------|--------------|
| 6A.1 | Image viewer adapter | png/jpg/gif/webp | editors/image |
| 6A.2 | SVG sandboxed display | No script exec | |
| 6A.3 | HTML view iframe CSP sandbox | Scripts blocked | editors/html |
| 6A.4 | HTML source edit mode | CodeMirror | |
| 6A.5 | CSV/TSV grid editor | Delimiter detect | editors/csv |
| 6A.6 | DOCX mammoth preview | Read-only banner | editors/docx |
| 6A.7 | DOCX export to markdown action | Lossy OK | |
| 6A.8 | ipynb cell renderer | md+code cells | editors/ipynb |
| 6A.9 | Register all in registry priorities | formats.md order | registry |
| 6A.10 | Fixtures under testdata/ | Present | testdata/ |

### Done when

Each format opens without crash; binary fallback still last.

---

## Subphase 6B — Command palette & shortcuts

**Status:** `todo` · **Legacy:** 6.6, 6.7

### Tasks

| ID | Task | Acceptance | Files / area |
|----|------|------------|--------------|
| 6B.1 | Command palette component | Ctrl/Cmd+K | `CommandPalette.tsx` |
| 6B.2 | Commands: nav, new note, lock vault, sync, theme | Each works | |
| 6B.3 | Fuzzy filter commands | Typing filters | |
| 6B.4 | Global shortcuts per ui-ux.md | Documented list | |
| 6B.5 | Settings screen shortcut cheatsheet | Readable | |
| 6B.6 | Disable conflicting CM keys carefully | Save still works | |

### Done when

Power users can drive desktop without mouse for common actions.

---

## Subphase 6C — Settings & onboarding

**Status:** `todo` · **Legacy:** 6.8, 6.9, 6.12

### Tasks

| ID | Task | Acceptance | Files / area |
|----|------|------------|--------------|
| 6C.1 | Settings sections: General, Editor, Vault, SFTP, About | Layout | SettingsPage |
| 6C.2 | Theme dark/light/system | Persists | |
| 6C.3 | Autosave interval control | Persists | |
| 6C.4 | Idle vault lock minutes | Persists | |
| 6C.5 | About: version, MIT, links | Accurate | |
| 6C.6 | First-run wizard 5 steps | ui-ux.md §11 | `Onboarding.tsx` |
| 6C.7 | `onboarding_complete` flag | Skip next launches | app_meta |
| 6C.8 | Skip vault path with warning | Allowed | wizard |
| 6C.9 | Open source licenses list (optional) | Best-effort | |

### Done when

New user path is guided; settings complete.

---

## Subphase 6D — Performance & a11y

**Status:** `todo` · **Legacy:** 6.10, 6.11

### Tasks

| ID | Task | Acceptance | Files / area |
|----|------|------------|--------------|
| 6D.1 | Virtualize long file lists | 1k entries usable | FileList |
| 6D.2 | Virtualize notes grid if needed | 1k notes | NotesGrid |
| 6D.3 | Lazy-load heavy editors (PDF, CM langs) | Code split | |
| 6D.4 | Cold start smoke timing | Record in TRACKING | manual |
| 6D.5 | Focus rings + aria-labels audit | Icon buttons labeled | |
| 6D.6 | Keyboard: Esc closes modals | Works | |
| 6D.7 | Hit targets ≥44px mobile | Spot check | |
| 6D.8 | `prefers-reduced-motion` | Disables fancy anim | CSS |
| 6D.9 | Contrast check note colors | Readable text | |

### Done when

Phase 6 exit criteria satisfied → mark Phase 6 `done`.

---

## Suggested PR split

1. 6A formats (can be multiple PRs per adapter)  
2. 6B palette  
3. 6C settings/onboarding  
4. 6D a11y/perf  

---

## Risks

| Risk | Mitigation |
|------|------------|
| Format rabbit holes | Timebox each adapter | 
| Onboarding vs power users | Always skippable after first |
