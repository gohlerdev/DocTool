# Phase 1 — Local Files + Markdown/Code Editors

| Field | Value |
|-------|--------|
| **Status** | `todo` |
| **Depends on** | Phase 0 complete |
| **Unblocks** | Phase 2, 3, 4 |
| **Estimate** | 5–8 days |
| **Specs** | [formats.md](../formats.md), [architecture.md](../architecture.md), [ipc.md](../ipc.md) |

---

## Phase goal

Browse local filesystem (desktop) / pick files (mobile); open and save **markdown** and **code/config** via CodeMirror; multi-tab workspace with dirty state and autosave.

---

## Phase exit criteria

- [ ] Edit local `.md`, save, reopen → only intentional edits differ  
- [ ] YAML front matter preserved  
- [ ] Open `.rs`/`.ts`/`.json`/`.yaml`/`.toml` with syntax highlighting  
- [ ] Multi-tab dirty indicator + close confirm  
- [ ] Mobile: open a text file via system picker and save if permitted  

---

## Subphase 1A — Local FileSource + IPC

**Status:** `todo` · **Legacy:** 1.1, 1.2

### Objective

Implement `local://` reads/writes with path safety; expose `fs_*` commands.

### Tasks

| ID | Task | Acceptance | Files / area |
|----|------|------------|--------------|
| 1A.1 | Define `DocUri` parse/format | Round-trip local URIs | `domain/uri.rs` |
| 1A.2 | `FileSource` trait | Compiles | `domain/source.rs` |
| 1A.3 | `LocalFsSource` list/read/write/mkdir/rename/remove/stat | Unit tests on temp dir | `infra/local_fs.rs` |
| 1A.4 | Path canonicalization + jail | Reject `..` escape outside roots | `local_fs.rs` |
| 1A.5 | Configure allowed roots (home, docs, app data) | Documented policy | settings / capabilities |
| 1A.6 | IPC `fs_list`, `fs_read`, `fs_write`, `fs_stat` | Frontend invoke works | `commands/fs.rs` |
| 1A.7 | Large file threshold → temp path return | &gt;8MB uses temp | `fs_read` |
| 1A.8 | Base64 encode policy for small files | Documented in ipc.md | invoke wrappers |
| 1A.9 | Tauri fs capabilities scoped | Least privilege | `capabilities/` |

### Acceptance tests

```bash
cargo test local_fs
# manual: list home, write temp file, read back
```

### Done when

All local fs IPC ops work safely from Settings debug or Files page stub.

---

## Subphase 1B — Files browser UI

**Status:** `todo` · **Legacy:** 1.3

### Objective

Navigate directories; open files into workspace.

### Tasks

| ID | Task | Acceptance | Files / area |
|----|------|------------|--------------|
| 1B.1 | Files page source list (Local) | Shows Local entry | `FilesPage` |
| 1B.2 | Directory listing component | Name, size, mtime | `FileList.tsx` |
| 1B.3 | Breadcrumbs | Navigate up/down | `Breadcrumbs.tsx` |
| 1B.4 | Sort by name/mtime/size | Toggle works | FileList |
| 1B.5 | Hidden files toggle | Dotfiles show/hide | UI + list filter |
| 1B.6 | Open file action | Calls workspace open | integration with 1E stub |
| 1B.7 | Empty/error/loading states | Per ui-ux.md | FileList |
| 1B.8 | Mobile: `fs_pick_local` button | Picks file URI | `commands` + UI |
| 1B.9 | Bookmarks stub (optional) | Pin a folder | later OK if deferred |

### Acceptance tests

- Desktop: browse into a folder with markdown files; click opens editor path.  
- Mobile: picker returns a file.

### Done when

Files section is usable for navigation.

---

## Subphase 1C — Format registry + CodeMirror shell

**Status:** `todo` · **Legacy:** 1.4, 1.5

### Objective

Adapter pattern; CodeMirror-based text editor session.

### Tasks

| ID | Task | Acceptance | Files / area |
|----|------|------------|--------------|
| 1C.1 | `DocumentAdapter` + `EditorSession` types | TS interfaces | `features/editors/types.ts` |
| 1C.2 | `FormatRegistry` register/pick | Priority order | `features/editors/registry.ts` |
| 1C.3 | Install CodeMirror 6 + React wrapper | Renders | package.json |
| 1C.4 | `TextEditorSession` base | getBytes/isDirty/dispose | `editors/text/` |
| 1C.5 | Markdown adapter `canHandle` | md/mdx/markdown | `editors/markdown/` |
| 1C.6 | Open path: read → adapter → session View | Bytes in editor | workspace open flow |
| 1C.7 | Save path: getBytes → fs_write | Round-trip | workspace save |
| 1C.8 | Binary fallback adapter | Hex/message for unknown | `editors/binary/` |

### Acceptance tests

- Open `.md` file; change one character; save; disk matches.

### Done when

Registry-driven open/save works for markdown.

---

## Subphase 1D — Markdown preview & code languages

**Status:** `todo` · **Legacy:** 1.6, 1.7, 1.11

### Objective

GFM preview modes; syntax packs for dev configs; front matter fidelity.

### Tasks

| ID | Task | Acceptance | Files / area |
|----|------|------------|--------------|
| 1D.1 | `react-markdown` + remark-gfm | Renders tables/tasks | preview component |
| 1D.2 | Desktop split edit/preview | Resizable split | markdown view |
| 1D.3 | Mobile tab Edit \| Preview | Tabs work | markdown view |
| 1D.4 | Syntax highlight in preview fences | Code blocks colored | rehype-highlight or shiki |
| 1D.5 | Code adapter + lang map | per formats.md table | `editors/code/` |
| 1D.6 | JSON/YAML/TOML modes | Highlight works | lang packages |
| 1D.7 | Front matter fold (optional) | YAML block preserved | CM extension |
| 1D.8 | Golden test: front-matter.md | getBytes identical if no edit | `testdata/` + vitest |
| 1D.9 | Line ending preserve CRLF/LF | Test fixture | text session |

### Acceptance tests

```bash
npm test -- front-matter
# manual: GFM table preview
```

### Done when

Markdown + common code/config formats polished for daily use.

---

## Subphase 1E — Tabs, dirty, autosave, recents

**Status:** `todo` · **Legacy:** 1.8, 1.9, 1.10, 1.12

### Objective

Multi-document workspace behavior.

### Tasks

| ID | Task | Acceptance | Files / area |
|----|------|------------|--------------|
| 1E.1 | Tab bar component | Open multiple URIs | `workspace/TabBar.tsx` |
| 1E.2 | Active tab switching | State correct | workspace store |
| 1E.3 | Dirty indicator dot | Sets on edit | session → store |
| 1E.4 | Close tab confirm if dirty | Modal | TabBar |
| 1E.5 | Ctrl/Cmd+S save | Saves active | shortcuts |
| 1E.6 | Autosave interval from settings | Default 30s | workspace + settings |
| 1E.7 | Save on blur option | Setting works | |
| 1E.8 | `recents` table + migration | 002 or extend 001 | migrations |
| 1E.9 | Push recent on open | List on Files home | IPC + UI |
| 1E.10 | Prune recents to 100 | On insert | SQL |
| 1E.11 | Mobile save path | Write-back when allowed | document limitation if not |

### Acceptance tests

- Two tabs dirty independently; close prompts.  
- Restart app; recents show last files.

### Done when

Phase 1 exit criteria satisfied → mark Phase 1 `done`.

---

## Suggested PR split

1. 1A local fs  
2. 1B browser UI  
3. 1C/1D editors  
4. 1E workspace  

---

## Risks

| Risk | Mitigation |
|------|------------|
| Mobile write restrictions | Prefer export/share if in-place write blocked |
| CM bundle size | Lazy-load language packs |
| Capability denials | Explicit user-selected folders (P1 bookmarks) |
