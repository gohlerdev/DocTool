# Platform matrix (v1)

| Platform | Status in Phase 8 | Notes |
|----------|-------------------|-------|
| Linux | Primary desktop | Full features |
| Android | Primary mobile | Widgets: see `docs/android-widget.md` |
| macOS | Supported | Notarization path in release-pipeline.md |
| iOS | Supported | Safe-area CSS; TestFlight path documented |
| Windows | X1 | WebView2; `tauri build` on Windows |

## Android widget (N8)

Quick-capture widget package stubs live under `src-tauri/gen/android` once generated. Intent: launcher widget → deep link `doctool://note/new`.

See [android-widget.md](./android-widget.md).

## Cryptomator (X2)

Import flow: user picks Cryptomator vault directory; DocTool documents supported format versions and refuses unknown masters with clear error. Implementation entry: Files → Import Cryptomator (settings meta `cryptomator.path`).

## OCR (X3)

PDF OCR uses on-device APIs when present; otherwise optional model download. Annotated text lands as a new note with source PDF path.

## Terminal (X6)

Desktop-only pane hosts local PTY (future `portable-pty`) or documents SFTP remote shell as out-of-band. UI shell: Command palette → “Open terminal” (wired when native side lands).
