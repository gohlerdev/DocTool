# Phase 2 — Keep-Style Notes

| Field | Value |
|-------|--------|
| **Status** | `todo` |
| **Depends on** | Phase 1 (export to file uses fs); Phase 0 minimum for shell |
| **Unblocks** | Phase 5 (dual-sync) |
| **Estimate** | 5–8 days |
| **Specs** | [ui-ux.md](../ui-ux.md), [notes-sync.md](../notes-sync.md), [data-model.md](../data-model.md), [ipc.md](../ipc.md) |

---

## Phase goal

Full **offline** Google Keep–like notes: colors, pins, labels, rich body (Tiptap), FTS search, archive/trash, markdown export. Sync fields exist but remain `local_only` until Phase 5.

---

## Phase exit criteria

- [ ] Create colored note; kill app; note persists  
- [ ] Pin, label, archive, soft-delete work  
- [ ] FTS search finds title and body text  
- [ ] Tiptap rich editing (bold, lists, checklist)  
- [ ] Export note → local `.md` file  
- [ ] `sync_status` defaults to `local_only`  

---

## Subphase 2A — Notes schema & IPC

**Status:** `todo` · **Legacy:** 2.1, 2.2, 2.11

### Objective

Persist notes in SQLite with FTS; full CRUD commands.

### Tasks

| ID | Task | Acceptance | Files / area |
|----|------|------------|--------------|
| 2A.1 | Migration: `notes`, `note_labels`, `body_text` | Schema matches data-model.md | `migrations/00x_notes.sql` |
| 2A.2 | FTS5 setup + maintain on write | Search works in SQL | db layer |
| 2A.3 | Domain `Note` model | Serde JSON body | `domain/note.rs` |
| 2A.4 | `notes_list` | Filters archived/deleted | commands |
| 2A.5 | `notes_get` | Full note + labels | |
| 2A.6 | `notes_upsert` create/update | ULID on create; bumps `updated_at` | |
| 2A.7 | `notes_delete` soft/hard | Soft sets `deleted_at` | |
| 2A.8 | Extract plain `body_text` from Tiptap JSON | FTS quality | util |
| 2A.9 | Default `sync_status=local_only` | Column set | |
| 2A.10 | Unit tests CRUD | cargo test | |

### Acceptance tests

```bash
cargo test notes
```

### Done when

All notes IPC usable from a temporary debug UI or tests.

---

## Subphase 2B — Notes list & Keep UI

**Status:** `todo` · **Legacy:** 2.3, 2.10

### Objective

Keep-like grid/list with FAB and empty state.

### Tasks

| ID | Task | Acceptance | Files / area |
|----|------|------------|--------------|
| 2B.1 | Notes query via TanStack Query | Cache invalidation on change | `features/notes/` |
| 2B.2 | Note card component | Color, title, snippet, labels | `NoteCard.tsx` |
| 2B.3 | Masonry/grid desktop | 2–4 columns | `NotesGrid.tsx` |
| 2B.4 | Single-column mobile | Comfortable density | |
| 2B.5 | Pinned section | Pinned above others | |
| 2B.6 | Color palette tokens | 9 Keep-like colors | tokens + card |
| 2B.7 | FAB new note | Opens editor | |
| 2B.8 | Empty state CTA | Matches ui-ux | |
| 2B.9 | Context menu / sheet | Pin, color, archive, delete | |
| 2B.10 | Event `notes://changed` refresh | Live update | |

### Acceptance tests

- Create 5 notes different colors; pin one; layout correct.

### Done when

List UX feels Keep-like without editor polish complete.

---

## Subphase 2C — Tiptap editor & labels

**Status:** `todo` · **Legacy:** 2.4, 2.5, 2.8

### Objective

Rich note editor and label management.

### Tasks

| ID | Task | Acceptance | Files / area |
|----|------|------------|--------------|
| 2C.1 | Install Tiptap + starter-kit | Renders | package.json |
| 2C.2 | Note editor page/route | Title + body | `NoteEditor.tsx` |
| 2C.3 | Toolbar: bold/italic/lists/code/link | Commands work | |
| 2C.4 | Task list / checklist extension | Toggle items | |
| 2C.5 | Autosave note debounced 1–1.5s | Saved indicator | |
| 2C.6 | Color picker in editor chrome | Updates note | |
| 2C.7 | Pin toggle | Updates list order | |
| 2C.8 | Labels add/remove chips | Persisted join table | |
| 2C.9 | Filter list by label | Query param/filter | |
| 2C.10 | Mobile editor chrome | Keyboard-friendly | |

### Acceptance tests

- Edit body offline; restart; content + labels intact.

### Done when

Core note editing complete.

---

## Subphase 2D — Search, archive, export

**Status:** `todo` · **Legacy:** 2.6, 2.7, 2.9

### Objective

Find notes, lifecycle, export to markdown.

### Tasks

| ID | Task | Acceptance | Files / area |
|----|------|------------|--------------|
| 2D.1 | Search bar → `notes_search` / FTS | Ranked results | NotesPage |
| 2D.2 | Debounce search input | No lag spam | |
| 2D.3 | Archive view filter | Archived list | |
| 2D.4 | Trash / soft-delete view | Restore action | |
| 2D.5 | Hard delete confirm | Permanent | |
| 2D.6 | Tiptap JSON → GFM markdown exporter | Reasonable MD | `exportMarkdown.ts` |
| 2D.7 | Export action writes via `fs_write` | File on disk | |
| 2D.8 | Snippet generator for cards | 3 lines plain text | |
| 2D.9 | Basic vitest for exporter | Unit test | |

### Acceptance tests

- Search unique word in body finds note.  
- Export creates openable `.md` in Phase 1 editor.

### Done when

Phase 2 exit criteria satisfied → mark Phase 2 `done`.

---

## Suggested PR split

1. 2A schema/IPC  
2. 2B list UI  
3. 2C editor  
4. 2D search/export  

---

## Risks

| Risk | Mitigation |
|------|------------|
| FTS external content sync bugs | App-maintained body_text + fts rebuild on upsert |
| Tiptap mobile selection quirks | Test early on Android WebView |
| Export fidelity | Document lossy conversion |
