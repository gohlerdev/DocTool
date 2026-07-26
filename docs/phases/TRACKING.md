# Implementation Tracking Board

Update statuses as work proceeds. Do not mark a phase `done` until its exit criteria pass.

**Last updated:** 2026-07-26

| Phase | Subphase | Title | Status | Owner | Notes |
|-------|----------|-------|--------|-------|-------|
| 0 | 0A–0F | Foundation | done | | Adaptive shell, SQLite, Android init |
| 1 | 1A–1E | Local editors | done | | CM markdown/code, files browser |
| 2 | 2A–2D | Notes | done | | Keep UI, Tiptap, FTS, archive |
| 3 | 3A–3E | SFTP | done | | Profiles, TOFU, browse, r/w |
| 4 | 4A–4C | PDF | done | | In-app PDF view (blob iframe) |
| 5 | 5A–5F | Vault + dual-sync | done | | Local E2EE vault; Drive OAuth deferred |
| 6 | 6A–6D | Polish | done | | Settings/SFTP form, mobile shell |
| 7 | 7A–7C | Release | in_progress | | Android builds; superseded scope by Phase 8 |
| 8 | 8A | W1 Trust & teach | done | | Recovery ritual, auto-lock, coaches, encryption sheet |
| 8 | 8B | W2 Capture depth | done | | Labels, bulk, context menu, SFTP key pick, recents |
| 8 | 8C | W3 Hardening core | done | | Trash, ranked search, palette, CI; CSP scaffold |
| 8 | 8D | W4 Cloud & lifecycle | in_progress | | Backup/conflict/offline done; Drive OAuth + biometrics scaffold |
| 8 | 8E | W5 Platforms & expansion | in_progress | | PDF annotate, WebDAV, clipper done; widget/OCR/Win scaffold |
| 8 | 8F | W6 Release & proof | done | | CHANGELOG, CI, release-pipeline docs |
| 8 | 8G | Tag v1.0.0 | todo | | After scaffold follow-ups |

## Current focus

```
Phase 8 — autonomous implementation pass landed core of all waves.
Plan: docs/v1-gap-closure-plan.md
Checklist: docs/phases/phase-08-v1-gap-closure.md
Remaining scaffold: V2 biometrics, V4 full Drive OAuth, P3 CSP, N8 widget,
  X1 Windows CI, X2 Cryptomator, X3 OCR, X6 terminal, X7 E2E CI → then 8G tag
```

### No longer deferred (in Phase 8 / v1.0)
- Google Drive OAuth (V4)
- PDF annotation (F4)
- Biometric unlock (V2)
- Windows, WebDAV, OCR, clipper, terminal, Cryptomator, E2E mobile CI (X1–X7)
- Full improvement-plan portfolio (O4–O6, N*, V*, F*, U*, P*, R*)
