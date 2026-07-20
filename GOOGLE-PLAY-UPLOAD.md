# GLPenPal — Google Play upload guide (Android)

Command-by-command guide to ship the **current** GLPenPal build to Google Play,
in parallel with the iOS App Store review. The iOS project is **not touched** by
any step here — Android is generated and configured independently.

- **App name:** GLPenPal
- **Android package (applicationId):** `com.glpenpal.app`  ← permanent, never changes after first upload
- **iOS bundle id (for reference, untouched):** `com.glpenpal.mobile.ios`
- **Backend:** Supabase (must be baked in at build time — see Step 2, the #1 gotcha)

> Run every command from the repo root unless noted. You need **Android Studio**
> (bundles the Android SDK + JDK) installed: https://developer.android.com/studio

---

## 0) One-time: Google Play Console account
- Pay the **$25 one-time** fee: https://play.google.com/console → "Create developer account".
- Verifying identity/payment can take a day or two — do this first so it isn't a blocker.

---

## 1) Get the latest code + dependencies
```bash
git checkout claude/glp-buddy-mvp-c0ante
git pull origin claude/glp-buddy-mvp-c0ante
npm install
```

## 2) ⚠️ Create `.env.production` — REAL backend (the #1 gotcha)
The web app is bundled into the APK **at build time**, so the Supabase env vars
must be present **locally before you build**. Without this file the store app
ships in **demo mode with fake data**.

```bash
cat > .env.production <<'EOF'
VITE_BACKEND=supabase
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY
EOF
```
Fill in the real values from **Supabase → Project Settings → API** (same values
that are set in Netlify). The anon key is safe to ship (public, RLS-protected).
`.env.production` is git-ignored — it stays on your machine.

Sanity-check the build actually reads them (optional):
```bash
npm run build   # should complete with no errors; dist/ is the bundle
```

## 3) Generate the native Android project
`cap add android` reads `appId` from `capacitor.config.ts`
(`com.glpenpal.mobile.ios`) as a starting point — you override it to the clean
Android id in the next step. The `android/` folder is local-only (git-ignored),
exactly like `ios/`.
```bash
npx cap add android
```

## 4) Set the clean Android package name → `com.glpenpal.app`
Edit **`android/app/build.gradle`**. In the `defaultConfig { … }` block change
**only** `applicationId`:
```gradle
    defaultConfig {
        applicationId "com.glpenpal.app"     // ← was com.glpenpal.mobile.ios
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 1                         // bump +1 on EVERY future upload
        versionName "1.0.0"                   // human-facing version
        …
    }
```
Leave `namespace "com.glpenpal.mobile.ios"` (the internal code package) as-is —
Android allows `applicationId` ≠ `namespace`, and Play only cares about
`applicationId`. This keeps the change to one line and moves no source files.

> Verify: `grep applicationId android/app/build.gradle` → `com.glpenpal.app`.

## 5) Generate app icons + adaptive splash
Source art is ready in `resources/` (`icon.png` 1024×1024, `splash.png` 2732×2732).
```bash
npx @capacitor/assets generate --android \
  --iconBackgroundColor '#5e8c74' \
  --splashBackgroundColor '#f6f4ee'
```
This writes every Android density (mipmap icons + adaptive icon + splash) into
`android/app/src/main/res/`.

## 6) (If you want in-app camera capture) declare the camera permission
Photo attach uses the WebView file picker. **Gallery** selection works with no
permission (Android's system photo picker). **Taking a photo in-app**
(`capture="environment"`) needs the camera permission — add to
`android/app/src/main/AndroidManifest.xml` inside `<manifest>`:
```xml
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-feature android:name="android.hardware.camera" android:required="false" />
```
Skip this if you're fine with gallery-only on Android for v1 (Play then won't
flag a camera-permission declaration).

## 7) Build the web app into the Android shell
```bash
npm run cap:android    # = npm run build + cap sync android + cap open android
```
This rebuilds `dist/` (with your `.env.production`), copies it into `android/`,
and opens **Android Studio**. Let Gradle finish syncing.

## 8) Create your upload keystore (first time only — BACK IT UP)
Losing this key means you can **never update the app again**. Store it in a
password manager / secure backup.
```bash
keytool -genkey -v \
  -keystore ~/glpenpal-upload.keystore \
  -alias glpenpal \
  -keyalg RSA -keysize 2048 -validity 10000
```
Answer the prompts (name/org/etc.) and set a strong password you save.

## 9) Build the signed release bundle (`.aab`)
**In Android Studio** (easiest first time):
1. **Build → Generate Signed Bundle / APK → Android App Bundle → Next**.
2. Choose the keystore from Step 8, enter the alias (`glpenpal`) + passwords → Next.
3. Build variant **release** → Finish.
4. The bundle lands at:
   `android/app/build/outputs/bundle/release/app-release.aab`

**Or from the command line** (after wiring signing into `build.gradle`):
```bash
cd android && ./gradlew bundleRelease
```

## 10) Create the app in Play Console + upload
1. Play Console → **Create app** → name **GLPenPal**, Free, App (not game),
   confirm declarations.
2. **Test and release → Production** (or start with **Internal testing** for a
   quick private smoke test — recommended for v1) → **Create new release**.
3. **Enroll in Play App Signing** when prompted (Google manages the app signing
   key; your keystore is the *upload* key) → **Upload** `app-release.aab`.
4. Release name auto-fills from versionName; add short release notes.

## 11) Fill the store listing (copy is in `STORE-LISTING.md`)
- **App name:** GLPenPal
- **Short description (80 char):**
  `1:1 peer support for your GLP-1 journey — matched by medication, stage & goals.`
- **Full description:** paste the "Full description" block from `STORE-LISTING.md`.
- **Category:** Health & Fitness.
- **Screenshots:** phone shots in `store-screenshots/` (add a 7"/10" tablet set if
  you mark the app as tablet-supported).
- **Feature graphic (1024×500):** required by Play — create one if you don't have it.
- **Privacy Policy URL:** `https://glpenpal.com/privacy` (live in-app).

## 12) Required Play forms (all under the app → Policy/Content)
- **Data safety:** declare what's collected. GLPenPal collects account info +
  user-generated messages/photos; data is encrypted in transit; users can request
  deletion (the app has `delete_own_account`). Nothing sold to third parties.
- **Content rating:** fill the questionnaire (health references + user-to-user
  messaging → likely Teen/17+ — matches the Apple 17+ rating).
- **Target audience:** 18+ (the app is 18+ only).
- **App access:** the app is sign-in gated → **provide a demo login** (ideally an
  account pre-matched with a buddy so review can see the 1:1 chat/timeline), same
  as the Apple reviewer note.
- **Ads:** No ads.

## 13) Submit
Send the Production (or testing) release for review. First review typically lands
within a few days.

---

## Every future update (Android)
1. `git pull` → `npm install` → ensure `.env.production` is still present.
2. Bump **`versionCode`** (+1) in `android/app/build.gradle` — Play rejects a
   re-used code. Bump `versionName` too if it's a user-facing version change.
3. `npm run cap:android` → rebuild the signed `.aab` with the **same keystore** →
   upload a new release.

## Gotchas / notes
- **Native push ≠ web push.** The VAPID web-push setup powers the PWA only.
  Native Android push needs **FCM** via `@capacitor/push-notifications` + a
  Firebase project. Not required to ship — add later.
- **Keep the keystore forever.** Backed-up, off your laptop. It's unrecoverable.
- **iOS is untouched:** nothing here edits `capacitor.config.ts` or `ios/`, so the
  in-review Apple build is unaffected. The two apps share one codebase and Supabase
  backend but have independent package ids and signing.
- **Don't ship demo mode:** if the installed app shows fake buddies/data, the
  `.env.production` wasn't present at build time (Step 2) — rebuild.
