# Phases (hub)

Implementation is organized as **8 phases (0–7)**, each split into **subphases (A, B, C…)**, each with **numbered tasks**.

## Start here

| Resource | Purpose |
|----------|---------|
| **[phases/README.md](./phases/README.md)** | Phase index, dependency graph, ID scheme |
| **[phases/TRACKING.md](./phases/TRACKING.md)** | Live status board |
| **[phases/phase-00-foundation.md](./phases/phase-00-foundation.md)** | Phase 0 + subphases 0A–0F |
| **[phases/phase-01-local-editors.md](./phases/phase-01-local-editors.md)** | Phase 1 + 1A–1E |
| **[phases/phase-02-notes.md](./phases/phase-02-notes.md)** | Phase 2 + 2A–2D |
| **[phases/phase-03-sftp.md](./phases/phase-03-sftp.md)** | Phase 3 + 3A–3E |
| **[phases/phase-04-pdf.md](./phases/phase-04-pdf.md)** | Phase 4 + 4A–4C |
| **[phases/phase-05-vault-sync.md](./phases/phase-05-vault-sync.md)** | Phase 5 + 5A–5F |
| **[phases/phase-06-polish.md](./phases/phase-06-polish.md)** | Phase 6 + 6A–6D |
| **[phases/phase-07-release.md](./phases/phase-07-release.md)** | Phase 7 + 7A–7C |

## Quick map

```
0 Foundation     0A Branding · 0B Shell · 0C Routes · 0D Rust core · 0E SQLite · 0F CI/mobile
1 Local editors  1A Local FS · 1B Browser · 1C Registry/CM · 1D MD+code · 1E Tabs/autosave
2 Notes          2A Schema/IPC · 2B Keep UI · 2C Tiptap · 2D Search/export
3 SFTP           3A Profiles · 3B Auth · 3C TOFU · 3D Browse/save · 3E Transfers
4 PDF            4A Viewer · 4B Annotate · 4C Page ops
5 Vault+sync     5A Crypto · 5B Session UX · 5C Drive · 5D Manifest · 5E Dual-write · 5F Conflicts
6 Polish         6A Formats · 6B Palette · 6C Settings · 6D Perf/a11y
7 Release        7A Security · 7B QA · 7C Tag v1.0
```

## Dependencies

```
0 → 1 → 2 → 5 → 6 → 7
0 → 1 → 3 → 4
```

**Current focus:** Phase **0** / Subphase **0A** (see [phases/TRACKING.md](./phases/TRACKING.md)).

Master narrative plan: [PLAN.md](./PLAN.md).
