#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
mkdir -p dist-apk
npm ci
npm run build
cd src-tauri
npm run tauri -- android build --apk --target aarch64
OUT="gen/android/app/build/outputs/apk"
find "$OUT" -name "*.apk" -print0 | while IFS= read -r -d '' f; do
  cp -v "$f" "$ROOT/dist-apk/"
done
echo "APKs in dist-apk/:"
ls -lh "$ROOT/dist-apk" || true
sha256sum "$ROOT/dist-apk"/*.apk 2>/dev/null || true
