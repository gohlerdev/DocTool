# DocTool — Document Format Registry

---

## 1. Purpose

Map files → viewers/editors without hardcoding switches across the app.  
Every format implements `DocumentAdapter`.

---

## 2. Adapter interface (TypeScript)

```ts
export interface FileMeta {
  uri: string;
  name: string;
  extension: string; // lowercased, no dot
  mime?: string;
  size: number;
  mtime?: string;
}

export interface DocumentAdapter {
  id: string;
  label: string;
  /** Higher wins if multiple match */
  priority: number;
  canHandle(meta: FileMeta, sniff?: Uint8Array): boolean;
  open(bytes: Uint8Array, meta: FileMeta): Promise<EditorSession>;
}

export interface EditorSession {
  id: string;
  meta: FileMeta;
  /** React component for the editor surface */
  View: React.ComponentType<{ session: EditorSession }>;
  isDirty(): boolean;
  /** Serialize current content */
  getBytes(): Promise<Uint8Array>;
  /** Optional: apply external bytes (reload) */
  reload?(bytes: Uint8Array): Promise<void>;
  dispose(): void;
}
```

Registration: `FormatRegistry.register(adapter)` at app boot.

---

## 3. Priority matrix

| Priority | Formats | Phase |
|----------|---------|-------|
| 100 | Markdown | 1 |
| 90 | Code / config | 1 |
| 80 | PDF | 4 |
| 70 | Rich note (virtual) | 2 |
| 60 | HTML | 6 |
| 50 | CSV/TSV | 6 |
| 40 | Images | 6 |
| 30 | DOCX (view) | 6 |
| 20 | ipynb (light) | 6 |
| 10 | Binary hex fallback | 6 |
| 0 | Download-only stub | always |

---

## 4. Format specifications

### 4.1 Markdown — P0

| Item | Spec |
|------|------|
| Extensions | `md`, `mdx`, `markdown` |
| Editor | CodeMirror 6 `@codemirror/lang-markdown` |
| Preview | `react-markdown` + `remark-gfm` + syntax highlight |
| Modes desktop | Split edit/preview |
| Modes mobile | Tabs: Edit \| Preview |
| Front matter | YAML between `---`; foldable; preserve exactly |
| Line endings | Preserve CRLF/LF as opened |
| Features | GFM tables, task lists, strikethrough, fenced code |
| Save | Exact source text from CM document |

**Acceptance:** Open README with front matter; edit; save; bytes differ only by intentional edit.

### 4.2 Code & config — P0

| Ext | Language pack |
|-----|----------------|
| rs | rust |
| ts, tsx | typescript |
| js, jsx, mjs, cjs | javascript |
| py | python |
| go | go |
| java, kt | java/kotlin best-effort |
| c, h, cpp, hpp | cpp |
| sh, bash, zsh | shell |
| sql | sql |
| yaml, yml | yaml |
| json, jsonc | json |
| toml | toml |
| ini, cfg, conf | properties-like |
| env | shell/plain |
| xml, svg | xml |
| html, htm | html |
| css, scss | css |
| txt, log | plain |

Features: line numbers, search, indent detection, soft wrap toggle.

### 4.3 PDF — P0/P1

| Capability | Desktop | Mobile | Phase |
|------------|---------|--------|-------|
| Render pages | Yes | Yes | 4 |
| Zoom / pan | Yes | Yes | 4 |
| Text search | Yes | Best-effort | 4 |
| Highlight | Yes | Yes | 4 |
| Sticky note / free text | Yes | Free text | 4 |
| Fill forms | Yes | Yes if possible | 4 |
| Rotate/delete/reorder pages | Yes | No | 4 |
| Merge/split | Yes | No | 4 |
| OCR | No | No | — |

Libraries: `pdfjs-dist` (view), `pdf-lib` (mutate).  
Save strategy: load original → apply ops → `save()` bytes → write URI.

### 4.4 Rich notes — P0

Virtual URI `notes://{id}`; body Tiptap JSON in SQLite; not a filesystem format.  
Export: generate GFM markdown file to any FileSource.

### 4.5 HTML — P1

- View: sandboxed iframe `srcDoc` with strict CSP.  
- Edit: CodeMirror HTML mode.  
- Do not execute scripts from files.

### 4.6 CSV / TSV — P1

- Detect delimiter `,` / `\t` / `;`.  
- Grid editor; max rows warning if > 50k.  
- Save preserves delimiter.

### 4.7 Images — P0 view

`png`, `jpg`, `jpeg`, `gif`, `webp`, `svg` (svg sandboxed).  
No edit in v1 except optional rotate P2.

### 4.8 DOCX — P1 view

- `mammoth` → HTML preview.  
- Banner: “Read-only preview”.  
- Action: Export markdown (lossy).

### 4.9 Jupyter ipynb — P1 light

- Parse JSON; render markdown + code cells read-only/light edit of source fields.  
- Full kernel execution **out of scope**.

### 4.10 Binary fallback

- Show size, hash, hex preview first 4KB.  
- Download/export only.

---

## 5. MIME sniffing

If extension missing/wrong:

1. Magic: `%PDF` → pdf  
2. UTF-8 text heuristics → code/markdown  
3. ZIP+word structure → docx attempt  
4. Else binary fallback  

---

## 6. Dirty / autosave policy

| Setting | Default |
|---------|---------|
| Autosave interval | 30s when dirty |
| Save on blur | On |
| Save on tab close | Prompt if dirty and autosave off |
| Atomic write | temp + rename for local and SFTP when possible |

---

## 7. Encoding

- Default UTF-8.  
- If invalid UTF-8 text open: offer Latin-1 / lossy replace (P1).  
- BOM: preserve if present.

---

## 8. Registration bootstrap order

1. Markdown  
2. Code  
3. PDF  
4. HTML  
5. CSV  
6. Image  
7. DOCX  
8. ipynb  
9. Binary fallback (always last)

---

## 9. Testing fixtures

```
testdata/
  markdown/front-matter.md
  markdown/gfm-tables.md
  code/sample.rs
  config/sample.yaml
  pdf/simple.pdf
  pdf/form.pdf
  csv/sample.csv
  docx/sample.docx
  ipynb/sample.ipynb
```

Golden tests: open → getBytes without edit equals original (byte-identical) for text formats.
