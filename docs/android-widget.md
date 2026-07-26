# Android quick-capture widget (N8)

## Behavior

1. User long-presses home screen → widgets → DocTool “Quick note”.
2. Tap opens `doctool://note/new` (or MainActivity with extra `open_new_note=1`).
3. App focuses Notes → new note editor.

## Implementation sketch

Kotlin `AppWidgetProvider` in `src-tauri/gen/android/app/src/main/java/.../QuickNoteWidget.kt`:

- `RemoteViews` with “New note” button
- `PendingIntent` → `MainActivity` with intent extra
- WebView bridge reads query / intent on resume and dispatches `doctool:new-note` event (already mirrored via `openNewNoteToken` in App)

## Packaging

Ship with release APK; document in store listing screenshots.
