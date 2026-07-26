# Implementation Phases & Subphases

**Status legend:** `todo` · `in_progress` · `done` · `blocked`  
**Rule:** Complete a phase’s **exit criteria** before starting the next (see allowed parallel paths below).  
**Specs:** [../PLAN.md](../PLAN.md) · [../architecture.md](../architecture.md) · [../roadmap.md](../roadmap.md)

---

## Phase index

| Phase | Name | Status | Subphases | Doc |
|-------|------|--------|-----------|-----|
| **0** | Foundation & adaptive shell | `todo` | 0A–0F | [phase-00-foundation.md](./phase-00-foundation.md) |
| **1** | Local files + Markdown/Code | `todo` | 1A–1E | [phase-01-local-editors.md](./phase-01-local-editors.md) |
| **2** | Keep-style notes | `todo` | 2A–2D | [phase-02-notes.md](./phase-02-notes.md) |
| **3** | SFTP first-class | `todo` | 3A–3E | [phase-03-sftp.md](./phase-03-sftp.md) |
| **4** | PDF view & edit | `todo` | 4A–4C | [phase-04-pdf.md](./phase-04-pdf.md) |
| **5** | Vault E2EE + dual-sync | `todo` | 5A–5F | [phase-05-vault-sync.md](./phase-05-vault-sync.md) |
| **6** | Formats & polish | `todo` | 6A–6D | [phase-06-polish.md](./phase-06-polish.md) |
| **7** | v1.0 hardening & release | `in_progress` | 7A–7C | [phase-07-release.md](./phase-07-release.md) |
| **8** | **v1.0 gap closure (all backlog)** | `todo` | 8A–8G | [phase-08-v1-gap-closure.md](./phase-08-v1-gap-closure.md) · [../v1-gap-closure-plan.md](../v1-gap-closure-plan.md) |

---

## Dependency graph

```
                    ┌──► 2 Notes ──────────────┐
0 Foundation ──► 1 Local editors               ├──► 5 Vault + dual-sync ──► 6 Polish ──► 7 Release
                    └──► 3 SFTP ──► 4 PDF ─────┘
```

| Path | Notes |
|------|--------|
| `0 → 1 → 2 → 5 → 6 → 7` | Critical path for vault notes |
| `0 → 1 → 3 → 4` | Critical path for remote PDF |
| `4` may start after `1`; save-to-SFTP needs `3` | |
| `5` **requires** `2` | Dual-sync needs notes |
| `3` **requires** `1` | Remote open uses editors |

---

## How to use during implementation

1. Open the current phase file.  
2. Work **one subphase** at a time (e.g. `0A`, then `0B`).  
3. Check off tasks as you complete them.  
4. Run the subphase **acceptance tests**.  
5. When all subphases + phase exit criteria pass, mark phase `done` here and in [TRACKING.md](./TRACKING.md).  
6. Open a PR per subphase or phase (prefer subphase-sized PRs).

---

## ID scheme

```
{phase}{letter}.{n}     e.g. 0A.3, 3C.2, 5E.1
```

- **Phase** `0`–`7`  
- **Subphase** letter `A`, `B`, `C`…  
- **Task** number within subphase  

Legacy IDs from [../phases.md](../phases.md) (`0.1`, `3.6`, …) map to new IDs in each phase file.
