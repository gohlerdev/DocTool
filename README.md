# DocTool

**Privacy-first documents workspace** for Linux, macOS, iOS, and Android.

Read and edit markdown, PDFs, and common developer documents. Capture Keep-style notes. Browse remote servers over SFTP. Back up to Google Drive with **client-side encryption** (WhatsApp-style zero-knowledge vault).

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platforms](https://img.shields.io/badge/platforms-Linux%20%7C%20macOS%20%7C%20iOS%20%7C%20Android-brightgreen)](#platforms)

## Status

Early scaffolding. Architecture and implementation plan: **[docs/PLAN.md](docs/PLAN.md)**.

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
