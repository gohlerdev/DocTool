# DocTool

**Privacy-first documents workspace** for Linux, macOS, iOS, and Android.

Read and edit markdown, PDFs, and common developer documents. Capture Keep-style notes. Browse remote servers over SFTP. Back up to Google Drive with **client-side encryption** (WhatsApp-style zero-knowledge vault).

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platforms](https://img.shields.io/badge/platforms-Linux%20%7C%20macOS%20%7C%20iOS%20%7C%20Android-brightgreen)](#platforms)

## Status

Early scaffolding. Full local documentation suite:

| Doc | Description |
|-----|-------------|
| **[docs/README.md](docs/README.md)** | Documentation index |
| **[docs/PLAN.md](docs/PLAN.md)** | Master implementation plan |
| **[docs/phases.md](docs/phases.md)** | Phases hub |
| **[docs/phases/README.md](docs/phases/README.md)** | Phases & subphases for implementation |
| **[docs/phases/TRACKING.md](docs/phases/TRACKING.md)** | Status board |
| **[docs/decisions.md](docs/decisions.md)** | Locked ADRs |
| **[docs/architecture.md](docs/architecture.md)** | System architecture |
| **[docs/vault-format.md](docs/vault-format.md)** | E2EE vault format |
| **[docs/notes-sync.md](docs/notes-sync.md)** | Dual-write notes protocol |
| **[docs/sftp.md](docs/sftp.md)** | SFTP subsystem |
| **[docs/formats.md](docs/formats.md)** | Document adapters |
| **[docs/ui-ux.md](docs/ui-ux.md)** | Desktop & mobile UX |
| **[docs/data-model.md](docs/data-model.md)** | SQLite schema |
| **[docs/ipc.md](docs/ipc.md)** | Tauri IPC surface |
| **[docs/threat-model.md](docs/threat-model.md)** | Security model |
| **[docs/testing.md](docs/testing.md)** | Test strategy |
| **[docs/roadmap.md](docs/roadmap.md)** | Milestones & DoD |

## Platforms

| Platform | Target |
|----------|--------|
| Linux | Day 1 |
| macOS | Day 1 |
| iOS | Day 1 |
| Android | Day 1 |

Built with **Tauri 2** + **React** + **TypeScript** + **Rust**.

## Product pillars

1. **Documents** — open, view, and edit markdown, code/config, PDF, and more  
2. **Notes** — Google Keep–style cards; dual-sync local + encrypted Drive vault  
3. **Remote files** — first-class **SFTP** browser and open-in-editor  
4. **Vault** — Google Drive storage of ciphertext only; password + recovery key  

## Locked product decisions

| Topic | Decision |
|-------|----------|
| License | MIT (public, free; copyright retained) |
| Default branch | `main` |
| Vault recovery | Password **and** offline recovery key |
| Notes sync | Dual-write: local SQLite + encrypted Drive vault |
| Stack | Tauri 2 multi-target |

## Development

```bash
# Prerequisites: Node 20+, Rust stable, platform SDKs for mobile targets
npm install

# Desktop
npm run tauri dev

# Android (after mobile init)
npm run tauri android init
npm run tauri android dev

# iOS (macOS host required)
npm run tauri ios init
npm run tauri ios dev
```

## License

[MIT](LICENSE) © 2026 gohlerdev
