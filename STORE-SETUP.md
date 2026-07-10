# GLPenPal — App Store & Google Play setup

The app is already wrapped for native with **Capacitor**. The web app (`dist/`)
is bundled into real iOS/Android apps that talk to Supabase — not a remote-URL
webview (which Apple tends to reject).

You need a **Mac with Xcode** (iOS) and **Android Studio** (Android).

---

## 0) One-time accounts
- **Apple Developer Program** — $99/yr — https://developer.apple.com
- **Google Play Console** — $25 once — https://play.google.com/console

## 1) Generate the native projects (on your Mac, in the repo)
```bash
npm install
npx cap add ios
npx cap add android
```

## 2) Generate app icons + splash (from the ready-made source art)
Source images are in `resources/` (`icon.png` 1024×1024, `splash.png` 2732×2732).
```bash
npx @capacitor/assets generate --iconBackgroundColor '#5e8c74' --splashBackgroundColor '#f6f4ee'
```
This creates every required icon/splash size for both platforms.

## 3) Build the web app into the native shells
```bash
npm run cap:sync        # = build + copy dist into ios/ and android/
```
(Or the all-in-one helpers: `npm run cap:ios` / `npm run cap:android`.)

## 4) iOS — build & submit
```bash
npx cap open ios        # opens Xcode
```
In Xcode:
1. Select the project → **Signing & Capabilities** → set your **Team**.
2. Set version (1.0.0) and build (1).
3. **Product → Archive** → **Distribute App → App Store Connect**.
4. In **App Store Connect** (appstoreconnect.apple.com): create the app
   (bundle id `com.glpenpal.app`), fill the listing, upload screenshots,
   set the **Privacy Policy URL** = `https://glpenpal.com/privacy`, and a
   **support URL/email**. Submit for review.

## 5) Android — build & submit
```bash
npx cap open android    # opens Android Studio
```
In Android Studio:
1. **Build → Generate Signed Bundle / APK → Android App Bundle** (create a
   keystore the first time — keep it safe).
2. In **Play Console**: create the app, upload the `.aab`, fill the listing,
   privacy URL, content rating, and submit.

---

## Store listing assets (both platforms)
- **Name:** GLPenPal
- **Category:** Health & Fitness
- **Short description:** A GLP pen pal who gets it — 1:1 peer support for your GLP-1 journey.
- **Privacy Policy:** https://glpenpal.com/privacy
- **Screenshots:** capture from the running app (a few per device size).

## ⚠️ Important notes
- **Native push ≠ web push.** The VAPID/web-push setup powers the PWA. Native
  apps need **FCM (Android) + APNs (iOS)** via `@capacitor/push-notifications`
  + a Firebase project. Add this when you want push in the store apps.
- **App Review:** Apple scrutinizes health/medication apps and rejects thin
  webview wrappers (Guideline 4.2). The medical-advice disclaimers + real
  native features help; budget for one review round.
- Keep the iOS signing certs and the Android keystore backed up — losing the
  keystore means you can't update the Android app.
