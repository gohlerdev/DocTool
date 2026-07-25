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
| 7 | 7A–7C | Release | in_progress | | Android debug APK verified on emulator |

## Current focus

```
Android app READY on emulator-5554 (com.doctool.app)
APK: src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk
```

### Known deferrals vs full plan
- Google Drive OAuth cloud upload (local encrypted vault + dual-write works)
- Full pdf-lib annotation UI (viewer works)
- Biometric unlock
