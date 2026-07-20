#!/usr/bin/env bash
# GLPenPal — Android build prep (run on your Mac, from the repo root).
#
# Automates the mechanical steps so you don't hand-edit Gradle:
#   1. sanity-checks .env.production (real backend, not demo data)
#   2. installs deps
#   3. generates the android/ project if missing
#   4. sets the PERMANENT Play package name -> com.glpenpal.app
#   5. generates icons + splash from resources/
#   6. builds the web app and syncs it into android/
#
# After it finishes, you still create the keystore + signed .aab in Android
# Studio (it can't sign for you — that needs your private keystore). It prints
# those exact next steps at the end.
#
# Usage:  bash scripts/android-build.sh
set -euo pipefail

APP_ID="com.glpenpal.app"
VERSION_NAME="1.0.0"
VERSION_CODE="1"
ICON_BG="#5e8c74"
SPLASH_BG="#f6f4ee"

cd "$(dirname "$0")/.."
ROOT="$(pwd)"
say() { printf "\n\033[1;32m▸ %s\033[0m\n" "$*"; }
warn() { printf "\n\033[1;33m⚠ %s\033[0m\n" "$*"; }

# 1) real-backend guard ------------------------------------------------------
if [ ! -f .env.production ]; then
  warn ".env.production is MISSING — the app would ship in DEMO mode with fake data."
  echo "  Create it first (values from Supabase → Project Settings → API):"
  echo "    VITE_BACKEND=supabase"
  echo "    VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co"
  echo "    VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY"
  exit 1
fi
if ! grep -q "VITE_SUPABASE_URL=https" .env.production; then
  warn ".env.production exists but VITE_SUPABASE_URL looks unset — double-check it before shipping."
fi

# 2) deps --------------------------------------------------------------------
say "Installing dependencies"
npm install

# 3) generate android/ if needed ---------------------------------------------
if [ ! -d android ]; then
  say "Generating the Android project (npx cap add android)"
  npx cap add android
else
  say "android/ already exists — reusing it"
fi

GRADLE="android/app/build.gradle"
[ -f "$GRADLE" ] || { warn "Cannot find $GRADLE"; exit 1; }

# 4) set the permanent package name + version --------------------------------
say "Setting applicationId=$APP_ID, versionName=$VERSION_NAME, versionCode=$VERSION_CODE"
perl -0pi -e "s/applicationId \"[^\"]*\"/applicationId \"$APP_ID\"/" "$GRADLE"
perl -0pi -e "s/versionName \"[^\"]*\"/versionName \"$VERSION_NAME\"/" "$GRADLE"
perl -0pi -e "s/versionCode \d+/versionCode $VERSION_CODE/" "$GRADLE"
echo "  $(grep -E 'applicationId|versionName|versionCode' "$GRADLE" | sed 's/^ *//')"

# 5) icons + splash ----------------------------------------------------------
say "Generating icons + splash from resources/"
npx @capacitor/assets generate --android \
  --iconBackgroundColor "$ICON_BG" \
  --splashBackgroundColor "$SPLASH_BG"

# 6) build web + sync --------------------------------------------------------
say "Building the web app and syncing into android/"
npm run build
npx cap sync android

cat <<EOF

\033[1;32m✔ Android project is ready.\033[0m  Package: $APP_ID  ·  v$VERSION_NAME ($VERSION_CODE)

Next (one-time keystore, then the signed bundle):

  1) Create your upload keystore — BACK IT UP, it's unrecoverable:
       keytool -genkey -v -keystore ~/glpenpal-upload.keystore \\
         -alias glpenpal -keyalg RSA -keysize 2048 -validity 10000

  2) Open Android Studio:
       npx cap open android

  3) Build → Generate Signed Bundle / APK → Android App Bundle
       → pick ~/glpenpal-upload.keystore, alias glpenpal, enter passwords
       → variant: release → Finish
       → output: android/app/build/outputs/bundle/release/app-release.aab

  4) Upload that .aab in Play Console → Test and release → (Internal testing or Production).

  (Optional) In-app camera capture also needs the CAMERA permission — add to
  android/app/src/main/AndroidManifest.xml inside <manifest>:
       <uses-permission android:name="android.permission.CAMERA" />
       <uses-feature android:name="android.hardware.camera" android:required="false" />
  Gallery photo picking works without it.
EOF
