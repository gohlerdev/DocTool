# Phase 4 — PDF View & Edit

| Field | Value |
|-------|--------|
| **Status** | `todo` |
| **Depends on** | Phase 1 (registry/tabs); Phase 3 for remote save (can stub local-only first) |
| **Unblocks** | Phase 6 polish completeness |
| **Estimate** | 5–10 days |
| **Specs** | [formats.md](../formats.md) §PDF |

---

## Phase goal

Open PDFs in-app with PDF.js; annotate and perform page operations via pdf-lib; save back to local and SFTP sources. Mobile: view + light annotate.

---

## Phase exit criteria

- [ ] Multi-page PDF renders with zoom/page nav  
- [ ] Highlight or text annotation survives save + reopen  
- [ ] Desktop: rotate or delete a page and save  
- [ ] Save works for `local://` and `sftp://` URIs  
- [ ] Mobile: view + at least highlight  

---

## Subphase 4A — PDF.js viewer

**Status:** `todo` · **Legacy:** 4.1, 4.2

### Objective

Read-only high-quality viewer adapter.

### Tasks

| ID | Task | Acceptance | Files / area |
|----|------|------------|--------------|
| 4A.1 | Add `pdfjs-dist` worker setup | No worker errors | `editors/pdf/` |
| 4A.2 | PDF adapter `canHandle` | `.pdf` + magic `%PDF` | registry |
| 4A.3 | Render pages canvas/SVG | Visible text/graphics | PdfViewer |
| 4A.4 | Page navigation controls | Prev/next/input | toolbar |
| 4A.5 | Zoom in/out/fit width | Smooth enough | |
| 4A.6 | Optional text search | Find next | P0 if easy |
| 4A.7 | Loading/error states | Bad PDF message | |
| 4A.8 | Lazy page render | Scroll large docs | virtualize if needed |
| 4A.9 | Open from Files browser | Tab integration | workspace |

### Acceptance tests

- Open multipage PDF fixture; navigate all pages.

### Done when

Viewer is daily-driver quality for reading.

---

## Subphase 4B — Annotations via pdf-lib

**Status:** `todo` · **Legacy:** 4.3, 4.7

### Objective

Create annotations that serialize into saved PDF bytes.

### Tasks

| ID | Task | Acceptance | Files / area |
|----|------|------------|--------------|
| 4B.1 | Add `pdf-lib` | Builds | package.json |
| 4B.2 | Annotation mode toggle | UI state | toolbar |
| 4B.3 | Highlight tool | Draw rect → store op | |
| 4B.4 | Free-text / sticky note tool | Place text | |
| 4B.5 | Apply ops on save via pdf-lib | Bytes valid `%PDF` | PdfSession.getBytes |
| 4B.6 | Dirty state when annotate | Dot on tab | |
| 4B.7 | Mobile highlight path | Touch draw or tap-drag | |
| 4B.8 | Form fill if AcroForm present | Best-effort | optional stretch |
| 4B.9 | Fixture test save produces openable PDF | automated/manual | testdata |

### Acceptance tests

- Annotate → save → reopen in DocTool and external viewer.

### Done when

Core edit promise met.

---

## Subphase 4C — Page ops, merge, multi-source save

**Status:** `todo` · **Legacy:** 4.4, 4.5, 4.6, 4.8

### Objective

Desktop page tools; save to all sources; smoke large files.

### Tasks

| ID | Task | Acceptance | Files / area |
|----|------|------------|--------------|
| 4C.1 | Rotate page 90° | Desktop menu | pdf-lib |
| 4C.2 | Delete page | Confirm dialog | |
| 4C.3 | Reorder pages (simple) | Move up/down | desktop |
| 4C.4 | Merge PDFs tool | Pick second file | desktop utility |
| 4C.5 | Split (extract page range) | New file / download | desktop |
| 4C.6 | Save via SourceRouter | local + sftp | workspace |
| 4C.7 | Hide heavy tools on mobile | Feature flags | platform |
| 4C.8 | 50MB PDF smoke open | No crash best-effort | manual |
| 4C.9 | Memory: dispose worker on tab close | No leak obvious | dispose() |

### Acceptance tests

- Local annotate save; SFTP annotate save.  
- Rotate page persists.

### Done when

Phase 4 exit criteria satisfied → mark Phase 4 `done`.

---

## Suggested PR split

1. 4A viewer  
2. 4B annotations  
3. 4C page ops  

---

## Risks

| Risk | Mitigation |
|------|------------|
| pdf-lib vs annotation appearance | Keep annotations simple |
| Worker path in Tauri | Bundle worker explicitly |
| Scope creep to full Acrobat | Freeze ops list in formats.md |
