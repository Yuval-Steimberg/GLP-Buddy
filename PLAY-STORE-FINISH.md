# GLPenPal — finish the Google Play submission (master checklist)

Everything left to publish on Google Play, in order, with detailed instructions.
The signed app bundle is already built — from here it's uploading + filling
forms. You can do **all of Part 1 now**, while your account verification is still
pending. Only **Part 2 (Production submit)** waits on verification.

---

## Status snapshot
- ✅ App code (both requested changes) merged + migration 0021 applied in Supabase
- ✅ Signed bundle built → `~/GLP-Buddy/android/app/build/outputs/bundle/release/app-release.aab`
- ✅ Assets ready in `store-screenshots/`: `play-store-icon-512.png`,
  `play-feature-graphic-cream.png` / `-sage.png`, phone screenshots
- ✅ Reviewer text ready (`REVIEWER-ACCESS.md`), listing copy (`STORE-LISTING.md`)
- ⏳ Google account **identity + address verification** — in review (blocks only Production)
- ⬜ Everything in Part 1 below

> Get the latest assets/docs on your Mac first: `cd ~/GLP-Buddy && git pull`

---

# PART 1 — Do now (while verification is pending)

## 1. Create the app record (if not already)
Play Console → **Create app**:
- App name: `GLPenPal`
- Default language: English (US)
- App or game: **App**
- Free or paid: **Free**
- Tick the declarations → **Create app**

## 2. Upload the signed bundle to Internal testing
1. Left menu → **Test and release → Testing → Internal testing** → **Create new release**.
2. If prompted, **enroll in Play App Signing** → accept (Google holds the app
   signing key; your `~/glpenpal-upload.keystore` is the *upload* key).
3. **Upload** → select
   `~/GLP-Buddy/android/app/build/outputs/bundle/release/app-release.aab`.
4. **Release name:** auto-fills (e.g. `1.0.0 (1)`). **Release notes:** e.g.
   `First release — 1:1 peer support for the GLP-1 journey.`
5. **Next → Save**. (You'll roll it out in step 6 once other sections are green.)

## 3. Main store listing (Grow → Store presence → Main store listing)
- **App name:** `GLPenPal`
- **Short description (80 max):**
  `1:1 peer support for your GLP-1 journey — matched by medication, stage & goals.`
- **Full description:** paste the full block from `STORE-LISTING.md` ("You don't
  have to do GLP-1 alone …" through "Find your pen pal today — it's free.").
- **App icon:** upload `store-screenshots/play-store-icon-512.png` (512×512).
- **Feature graphic:** upload `store-screenshots/play-feature-graphic-cream.png`
  (or `-sage.png`) — 1024×500, required.
- **Phone screenshots:** upload from `store-screenshots/` (2–8; the landing +
  chat + matches + home shots). 
- Save.

## 4. Store settings (category & contact)
Grow → Store presence → **Store settings**:
- **App category:** Health & Fitness
- **Tags:** support, wellness, community (optional)
- **Contact email:** `yuvalste13@gmail.com`
- **Website:** `https://glpenpal.com`

## 5. App content forms (Policy → App content) — copy from `GOOGLE-PLAY-FORMS.md`
Complete each until it shows a green check:

### 5a. Privacy policy
- URL: `https://glpenpal.com/privacy`

### 5b. App access
- **All or some functionality is restricted** → add one instruction set.
- Username/password = your **reviewer account** (see step 7).
- Instructions: paste the block from `REVIEWER-ACCESS.md`.

### 5c. Ads
- **No, my app does not contain ads.**

### 5d. Content rating
- Start questionnaire; email `yuvalste13@gmail.com`; category **Social / Reference**.
- Violence/sexual/profanity/gambling/controlled-substances: **No**.
- Users can communicate + share content: **Yes**. Shares location: **No**.
- Submit → accept the generated rating (expect Teen-ish).

### 5e. Target audience and content
- Target age: **18 and over** only (do NOT tick under-18 → avoids Families policy).
- Appeals to children: **No**.

### 5f. Data safety (the detailed one — full table in `GOOGLE-PLAY-FORMS.md`)
- Collects/shares data: **Yes**. Encrypted in transit: **Yes**. Deletion
  method offered: **Yes** (in-app account deletion).
- Declare, each **Collected = Yes / Shared = No / stored (not ephemeral)**:
  - Personal info → **Email address**, **Name**, **User IDs**
  - **Photos** (avatar/chat/timeline/meals)
  - **Messages → other in-app messages**
  - **Health and fitness → Health info** (medication, stage, weight, meals)
  - *(only if you shipped Sentry/analytics: Crash logs / App interactions)*
- Location: **Not collected**. Financial: **Not collected**.

### 5g. Government/financial apps declaration
- **None of the above** (already answered at signup — confirm if asked again).

## 6. Roll out Internal testing (works NOW — no verification needed)
1. Back in **Internal testing → Edit release → Review release → Start rollout to
   Internal testing**.
2. **Testers** tab → create an email list → add your own Google account → save.
3. Use the **opt-in link** Play gives you, open it on an **Android phone**, accept,
   install from Play, and smoke-test: sign in, Chat, Timeline, Matches, log a
   meal/milestone. Confirm it's using the REAL backend (your data, not demo).

## 7. Create + match the reviewer account (see `REVIEWER-ACCESS.md`)
- Create **two** accounts in the live app (`reviewer@…` + `demo-buddy@…`, `+`
  aliases are fine), complete onboarding on both, mutually match them in
  **Matches**, then exchange a few messages + log a milestone from both sides.
- Put those credentials into the **App access** form (step 5b).

---

# PART 2 — After verification clears (identity + address approved)

You'll get a Google email confirming verification. Then:

1. **Production** (Test and release → Production) → **Create new release**.
2. **Add from library** → pick the same `app-release.aab` you uploaded to
   Internal testing (no rebuild needed).
3. Choose **countries/regions** (e.g. all, or start with a few).
4. Confirm all **App content** sections are green (they carry over from Part 1).
5. **Review release → Start rollout to Production → Submit for review.**
6. First review is typically a few days. Watch email + the **Publishing overview**
   page for status or policy notes.

---

# PART 3 — Future updates (for later)
1. `cd ~/GLP-Buddy && git pull`
2. Bump **`versionCode` +1** (and `versionName` if user-facing) in
   `android/app/build.gradle` — Play rejects a reused versionCode.
3. `npm run build && npx cap sync android` (or re-run `bash scripts/android-build.sh`).
4. Android Studio → **Generate Signed Bundle** with the **same keystore** →
   upload the new `.aab` to a release.

---

## Blockers / gotchas to remember
- **Keystore is unrecoverable** — back up `~/glpenpal-upload.keystore` + its
  password off your laptop. Losing it = you can never update the app.
- **Don't ship demo data** — if the installed app shows fake buddies, the
  `.env.production` wasn't set at build time; rebuild.
- **Country is permanent** — the developer account/payments country can't change
  after setup.
- **Production is the only step gated by verification** — everything else
  (upload, listing, forms, internal testing) you can finish today.
