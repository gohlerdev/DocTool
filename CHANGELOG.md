# Changelog

All notable changes to DocTool are documented here.

## [0.1.0] — 2026-07-26

### Added
- Keep-style notes with labels, FTS, pin/archive, trash restore
- Local markdown/code editors (CodeMirror) and PDF view + annotation page save
- SFTP profiles (password/key), TOFU host keys, reconnect UX, key file picker
- WebDAV/Nextcloud list + settings
- E2EE vault (Argon2id + AES-256-GCM v2), recovery-key ritual, auto-lock
- Vault backup export/import, Drive token link surface, dual-write sync skeleton
- Interactive first-install onboarding + getting-started checklist + coaches
- Command palette (Ctrl/Cmd+K), multi-select bulk notes, long-press menus
- Appearance themes, density, nav layouts
- Encryption explainer sheet, error catalog, offline banners
- Browser extension clipper scaffold (`extension/clipper/`)
- CI: `tsc` + `cargo test` / check

### Security
- Device-sealed local secrets and note bodies at rest
- Host key mismatch hard-fail
- Opt-in crash reporting flag (default off)

### Platforms
- Android release pipeline (signed APK/AAB docs)
- Windows / macOS / iOS paths documented for v1 packaging

## [Unreleased]

- Full Google Drive OAuth browser flow per platform
- Biometric keystore unlock bindings
- Android home-screen quick-capture widget packaging
- Cryptomator import, full OCR model pack, desktop terminal pane polish
