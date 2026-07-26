# DocTool release pipeline (R1–R7)

## Android (R1)

```bash
# Keystore (gitignored): keystore/doctool-release.jks + keystore.properties
# Also copied for Gradle: src-tauri/gen/android/keystore.properties

# From repo root — release APK (aarch64 phones)
npm ci && npm run build
cd src-tauri
# Prefer tauri android build release:
npm run tauri -- android build --apk --target aarch64
# Or Gradle directly:
# cd gen/android && ./gradlew :app:assembleUniversalRelease

# Outputs:
#   gen/android/app/build/outputs/apk/universal/release/*.apk
# Copy to dist-apk/ for handoff (gitignored). Never commit keystores or APKs.
```

### Filebin handoff (optional)

```bash
APK=path/to/app-universal-release.apk
BIN=$(openssl rand -hex 8)
# Extensionless name works better for some downloaders:
curl -sS -X POST -F "file=@${APK};filename=DocTool-release" \
  "https://filebin.net/${BIN}/DocTool-release"
echo "https://filebin.net/${BIN}/DocTool-release"
sha256sum "$APK"
```

## CHANGELOG / semver (R2)

- Update `CHANGELOG.md` before every tag.
- Tag: `git tag -a v1.0.0 -m "DocTool v1.0.0"` after Phase 8 exit.

## CI (R3)

GitHub Actions: `.github/workflows/ci.yml` runs `tsc`, `vite build`, `cargo test`, `cargo check`.

## macOS notarization (R4)

1. Apple Developer ID Application certificate.
2. `tauri build` on macOS → `.app` / `.dmg`.
3. `xcrun notarytool submit … --wait` then `stapler staple`.

## iOS TestFlight (R5)

1. Open `src-tauri/gen/apple` (after `tauri ios init`).
2. Archive in Xcode with distribution team.
3. Upload to App Store Connect → TestFlight internal.

## Store copy (R6)

Privacy: local-first; no account required; vault password never leaves device; optional Drive only receives ciphertext; crash reports opt-in and content-free.

## Reproducible builds (R7)

Record:

```bash
git rev-parse HEAD
rustc -V
node -v
sha256sum dist-apk/*.apk
```

Publish hashes next to GitHub Release assets.

## Windows (X1)

```bash
# On Windows host with WebView2
npm ci
npm run tauri -- build
# NSIS/MSI under src-tauri/target/release/bundle/
```

## E2E mobile CI (X7)

Emulator smoke (local or CI with KVM):

```bash
adb install -r path/to/app-universal-debug.apk
adb shell am start -n com.doctool.app/.MainActivity
adb shell input text "smoke"
```

Automate with Maestro/Appium in follow-up; baseline is install+launch+screenshot.
