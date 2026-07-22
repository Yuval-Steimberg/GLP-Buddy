# GLPenPal — Apple App Store: full upload & listing guide

A complete, do-this-then-that walkthrough for shipping GLPenPal to the real App
Store — **every command, every click, and all the copy/paste listing text in one
place.** Written for someone who has **not** done an iOS release before.

The app is already wrapped for native with **Capacitor** (`capacitor.config.ts`:
appId `com.glpenpal.app`, appName `GLPenPal`). The built web app (`dist/`) is
bundled into a real iOS app that talks to Supabase over the network — **not** a
remote-URL webview (Apple rejects those). There is no `ios/` folder in the repo
yet; you generate it on your Mac in Part C.

> **This all happens on a Mac.** iOS apps can only be built and uploaded from
> macOS with Xcode. Nothing here can be done from Linux, the web session, or a
> phone. Budget ~2–4 hours for a first-time run, plus 1–3 days for Apple review.

## Contents
- **Where you run each thing** — the three places you'll work
- **Part A** — one-time accounts & tools
- **Part B** — get the code + production config onto your Mac
- **Part C** — generate & build the iOS app *(Terminal)*
- **Part D** — sign, archive, upload *(Xcode)*
- **Part E** — create the listing & submit *(App Store Connect)* — includes all paste-ready copy
- **Part F** — after you submit
- **Shipping updates after launch** — changing things once you're live
- **Quick command reference** · **Troubleshooting** · **Appendix: Google Play mirror**

---

## Where you run each thing (read this first)

Three different places. Every step below is tagged with one of these:

| Tag | Where | How to open it |
|-----|-------|----------------|
| **[Terminal]** | The macOS Terminal app | Press `⌘ + Space`, type `Terminal`, hit Return. Commands run **inside the project folder** (Part B gets you there). |
| **[Xcode]** | Xcode's graphical app | Opens automatically from a Terminal command, or from Launchpad. You click buttons, not type commands. |
| **[Web]** | appstoreconnect.apple.com in a browser | Sign in with your Apple Developer account. |

In Terminal, the leading `$` is the prompt — don't type it. Type what comes
after. After each command press Return and wait for it to finish before the next.

---

## Part A — One-time accounts & tools

### A1. Enroll in the Apple Developer Program — **[Web]**
- Go to <https://developer.apple.com/programs/> and enroll. **$99/year.**
- Use the Apple ID you want to own this app. Enrollment approval can take a few
  hours to a couple of days — **start this first**, everything else waits on it.

### A2. Install Xcode — **[Mac, App Store app]**
- Open the **App Store** on your Mac, search **Xcode**, install it (it's large,
  ~10 GB — do this on good Wi‑Fi).
- Launch Xcode once and let it finish "Installing components" / accept the
  license when prompted.

### A3. Install the Xcode command-line tools — **[Terminal]**
```bash
$ xcode-select --install
```
A dialog pops up → click **Install**. If it says "already installed," you're good.

### A4. Install CocoaPods — **[Terminal]**
Capacitor's iOS project uses CocoaPods to pull in native dependencies.
```bash
$ sudo gem install cocoapods
```
Enter your Mac password when asked (typing is invisible — that's normal).
Verify:
```bash
$ pod --version
```
You should see a version number (e.g. `1.15.x`).

### A5. Install Node.js 20+ — **[Terminal]**
Check what you have:
```bash
$ node -v
```
If it prints `v20.x` or newer (this project is developed on `v22`), you're set.
If Node is missing or older, install it from <https://nodejs.org> (the "LTS"
installer) and re-run `node -v`.

---

## Part B — Get the code and the production config onto your Mac

### B1. Get the repository — **[Terminal]**
Clone the **production branch** (Netlify deploys from
`claude/glp-buddy-mvp-c0ante`). If you already have the folder, skip the clone
and just `cd` into it, then `git pull`.

```bash
$ cd ~
$ git clone https://github.com/Yuval-Steimberg/GLP-Buddy.git
$ cd GLP-Buddy
$ git checkout claude/glp-buddy-mvp-c0ante
$ git pull
```
From here on, **every [Terminal] command runs from inside this `GLP-Buddy`
folder.** If you open a new Terminal window later, run `cd ~/GLP-Buddy` first.

### B2. Install the project's dependencies — **[Terminal]**
```bash
$ npm install
```

### B3. ⚠️ Set the production environment variables — **[Terminal, create a file]**
This is the single most important step and the easiest to get wrong. The
Supabase config is **baked into the app at build time**. On the website these
live in Netlify's dashboard — but your Mac doesn't have them, so you must supply
them here. **Without this, the App Store build ships in demo mode with fake
data.**

The app reads these names (see `src/lib/env.ts`):

| Variable | Value | Required? |
|----------|-------|-----------|
| `VITE_BACKEND` | `supabase` | **Yes** — forces real backend |
| `VITE_SUPABASE_URL` | your Supabase project URL | **Yes** |
| `VITE_SUPABASE_ANON_KEY` | your Supabase anon/public key | **Yes** |
| `VITE_VAPID_PUBLIC_KEY` | web-push key | Optional (web push only) |
| `VITE_SENTRY_DSN` | Sentry DSN | Optional (crash reporting) |

**Where to copy the two Supabase values from:** open the Netlify dashboard →
site **buddyglp** → **Site configuration → Environment variables**. Copy
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` exactly. (Or from the Supabase
dashboard → your project → **Settings → API**: "Project URL" and the "anon
public" key.)

Create the file `.env.production` in the project root. Quick way from Terminal
(replace the placeholder values with your real ones):
```bash
$ cat > .env.production <<'EOF'
VITE_BACKEND=supabase
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY
EOF
```
(You can instead open the project in any text editor and create `.env.production`
by hand with those three lines.) Vite automatically loads `.env.production`
during `npm run build`. `.env.production` is gitignored; keep it local.

---

## Part C — Generate and build the iOS app — **[Terminal]**

### C1. Add the native iOS project
```bash
$ npx cap add ios
```
This creates the `ios/` folder (an Xcode project) and runs `pod install`. First
run downloads pods — give it a minute. You only do this once; after that you just
sync.

### C2. Generate the app icons and splash screen
Source art is ready in `resources/` (`icon.png` 1024×1024, `splash.png`
2732×2732). This one command produces every icon/splash size iOS needs:
```bash
$ npx @capacitor/assets generate --iconBackgroundColor '#5e8c74' --splashBackgroundColor '#f6f4ee'
```
(The colors are the brand sage and cream — leave them as-is.)

### C3. Build the web app and copy it into the iOS project
```bash
$ npm run cap:ios
```
This one script does three things: `npm run build` (compiles the web app using
`.env.production`), `cap sync ios` (copies `dist/` into `ios/` and updates
pods), and `cap open ios` (**opens the project in Xcode**). Wait for Xcode to
launch — Part D continues there.

> **Verify you're NOT in demo mode.** After the build, run:
> ```bash
> $ grep -r "YOUR-PROJECT.supabase.co" dist/assets >/dev/null && echo "supabase URL is baked in ✅" || echo "⚠️ check .env.production"
> ```
> Replace `YOUR-PROJECT.supabase.co` with your actual URL host. Seeing it in the
> built bundle confirms the production config took. (Simplest real check: run
> `npm run preview`, open the printed URL, and confirm it asks you to sign in
> with a real account rather than dropping you into seeded demo data.)

Any time you change code or env vars later, re-run `npm run cap:ios` to rebuild
before archiving.

---

## Part D — Sign, archive, and upload — **[Xcode]**

Xcode is now open on the `App` project. You'll click through these; no typing.

### D1. Set your signing Team
1. In the left sidebar, click the blue **`App`** project at the very top.
2. Select the **`App`** target → **Signing & Capabilities** tab.
3. Check **Automatically manage signing**.
4. **Team:** pick your Apple Developer team from the dropdown. (If it's not
   listed: **Xcode → Settings → Accounts → +** and sign in with your developer
   Apple ID, then come back and pick the team.)
5. Confirm **Bundle Identifier** is `com.glpenpal.app`. Xcode will register this
   ID with Apple automatically. If it reports the ID is taken, it's likely
   already registered under your account — that's fine.

### D2. Set the version and build number
Same target → **General** tab (or the top of Signing & Capabilities):
- **Version** (the public marketing version): `1.0.0`
- **Build**: `1`

> Rule for later updates: every upload to Apple needs a **higher Build number**
> than the last. Bump Build to `2`, `3`, … each time. Version only changes when
> you want a new public version number (`1.0.1`, `1.1.0`, …).

### D3. Pick the archive destination
At the top of the Xcode window, next to the ▶︎/■ buttons, there's a device
selector. Click it and choose **Any iOS Device (arm64)**. (You **cannot** archive
while a Simulator is selected — the Archive menu item stays greyed out.)

### D4. Archive
Menu bar → **Product → Archive**. This does a full release build; it takes a few
minutes. When it finishes, the **Organizer** window opens showing your archive.

> If **Archive** is greyed out, you didn't pick "Any iOS Device" in D3.

### D5. Upload to App Store Connect
In the Organizer window:
1. Select the archive you just made → click **Distribute App**.
2. Choose **App Store Connect** → **Next**.
3. Choose **Upload** → **Next**.
4. Leave the default options checked (Xcode manages signing) → **Next** →
   **Upload**.
5. Wait for "Upload Successful." The build now goes to Apple for automated
   processing (usually 5–30 minutes) before it appears in App Store Connect.

---

## Part E — Create the listing and submit — **[Web: appstoreconnect.apple.com]**

You can do E1–E7 while the build from Part D is still processing. **All the
copy/paste text lives right here** — no other file needed.

### E1. Create the app record
1. Sign in at <https://appstoreconnect.apple.com> → **Apps** → **`+` → New App**.
2. Fill in:
   - **Platform:** iOS
   - **Name:** `GLPenPal`
   - **Primary Language:** English (U.S.)
   - **Bundle ID:** select **com.glpenpal.app** from the dropdown (it appears
     because Xcode registered it in D1)
   - **SKU:** any unique string, e.g. `glpenpal-ios-001`
   - **User Access:** Full Access
3. Click **Create**.

### E2. App Information (left nav → **General → App Information**)
- **Subtitle** (30-char max):
  ```
  A pen pal for your GLP-1 journey
  ```
- **Category:** Health & Fitness  •  **Secondary:** Lifestyle
- **Privacy Policy URL:** `https://glpenpal.com/privacy`  *(page is live)*
- **Terms/EULA:** optional; `https://glpenpal.com/terms` is live if you want it.

### E3. Pricing and Availability
- **Price:** Free. Choose your country availability (all is fine).

### E4. The version page (left nav → **"1.0 Prepare for Submission"**)

**Promotional Text** (170 chars — editable later *without* review):
```
Get matched 1:1 with someone on the same medication, stage, and goals. Real peer support for the wins, the rough side-effect weeks, and the days the scale makes no sense.
```

**Keywords** (100 chars, comma-separated, no spaces):
```
GLP-1,Ozempic,Wegovy,Mounjaro,Zepbound,weight loss,semaglutide,support,accountability,buddy,health
```

**Support URL:** `https://glpenpal.com`  •  **Marketing URL:** `https://glpenpal.com`

**Description** (paste as-is):
```
You don't have to do GLP-1 alone.

Starting a GLP-1 medication like Ozempic, Wegovy, Mounjaro, Zepbound, or Saxenda can feel isolating. The nausea weeks are rough, progress isn't always linear, and the people around you don't always get it. GLPenPal matches you 1:1 with a pen pal who's on the same path.

How it works
- Get matched, mutually. We suggest people on the same medication, treatment stage, and goals as you. A private space only opens when you both say yes.
- Check in your way. Daily, a few times a week, or weekly — you set the pace.
- Celebrate the milestones. Log wins together and watch a shared timeline of how far you've come.
- Grow the friendship. Unlock Buddy Levels the longer you support each other, and Buddy Trios once you're an established member.

Built for privacy and safety
- Private 1:1 conversations. No public feeds, no follower counts.
- You choose what to share — a nickname is all you need.
- Report or block anyone, anytime.

Peer support — not medical advice. GLPenPal is a place to feel understood by people who get it. It does not provide medical, dosing, or clinical guidance. Always talk to a qualified healthcare professional about your treatment, and for urgent symptoms contact a clinician or emergency services.

Find your pen pal today — it's free.
```

### E5. Screenshots
Upload the six PNGs from the repo's **`store-screenshots/`** folder. They're
already the required **6.7" iPhone size (1290×2796)** — the 6.7" set is enough,
Apple scales it for other devices. **Upload in this order** (the first two matter
most in search results):

| # | File | What it shows |
|---|------|---------------|
| 1 | `00-landing.png` | Hero — "You don't have to do GLP-1 alone" |
| 2 | `01-chat.png`     | Real 1:1 conversation with a pen pal |
| 3 | `04-matches.png`  | Compatibility-based matching |
| 4 | `02-home.png`     | Buddy home — streak, levels, milestones |
| 5 | `03-timeline.png` | Shared milestone timeline |
| 6 | `05-profile.png`  | Your profile |

> Regenerate anytime: `node store-screenshots/shots.mjs` (runs against a local
> `vite preview` on port 4196 in demo mode).

**Build:** once processing finishes, a **Build** section appears on this page —
click **`+` / Select a build** and pick the one you uploaded (`1.0.0 (1)`).

### E6. App Privacy questionnaire (left nav → **App Privacy → Get Started / Edit**)
Apple requires this and is strict about health apps. GLPenPal uses Supabase auth
+ Postgres with **no ad SDKs and no third-party trackers**. Answer:

- **Data used to track you:** **None.**
- **Data linked to you** (stored in the account):
  - **Contact Info → Email address** — account sign-in. *Not* for tracking.
  - **User Content → Other user content** — profile (nickname, non-identifying
    medication/stage/goals) and messages sent to buddies.
  - **Identifiers → User ID** — an internal account ID.
  - **Health & Fitness → Health** — self-reported medication/stage/goals. Apple
    treats health data as **Sensitive**; declare it **Linked to you**, used for
    **App Functionality** only, **not** tracking.
- **Data not linked to you:**
  - **Diagnostics → Crash / Performance data** — **only if** you enabled Sentry
    (`VITE_SENTRY_DSN`). If you didn't ship Sentry, mark this **not collected**.
- **Data NOT collected:** name, phone, address, precise/coarse location,
  contacts, browsing/search history, purchases, financial info, photos, audio,
  advertising data.

> If you later enable Plausible analytics (`VITE_PLAUSIBLE_DOMAIN` — cookieless,
> no personal data), add **Usage Data → Product Interaction** (not linked, app
> functionality) to be safe.

### E7. Age rating, compliance & reviewer notes
- **Age Rating:** answer the questionnaire → it resolves to **17+** (health/
  medical references + user-to-user messaging).
- **Export Compliance:** the app uses only standard HTTPS encryption → when asked
  "Does your app use encryption?" answer **No** (exempt) unless you've added
  custom crypto. Answer honestly.
- **Sign-in for review:** the reviewer can create an account with any email, so
  demo credentials aren't required. Paste this into **App Review Information →
  Notes**:
  ```
  GLPenPal is a real native app (Capacitor) bundling a React web app that talks to a Supabase backend — not a remote-URL webview. It is peer-support only and shows clear, repeated disclaimers that it does not provide medical advice. To test: create an account with any email, complete the short onboarding, and you'll see match suggestions and can open a 1:1 chat. Account deletion is available in Profile. Demo credentials are not required.
  ```
- **Support email** (if asked): `yuvalste13@gmail.com`

### E8. Submit
Click **Add for Review** / **Submit for Review** (top right of the version page).
If a field is missing, App Store Connect highlights it in red — fill it and
resubmit.

---

## Part F — After you submit

- **Status** shows in App Store Connect: *Waiting for Review → In Review →
  Pending Developer Release / Ready for Sale*. First review is typically 1–3 days.
- **Optional but recommended — TestFlight:** before (or instead of) public
  release you can install the uploaded build on your own iPhone via TestFlight
  (left nav → **TestFlight**, add yourself as an internal tester). This is the
  best way to confirm the production build talks to the real backend on a real
  device.
- **If rejected:** Apple messages you in the **Resolution Center** with the
  reason. Common ones for health apps are Guideline 4.2 (too webview-like) or
  5.1.1 (privacy/account deletion). GLPenPal is built to answer both — it's a
  real bundled native app with clear not-medical-advice disclaimers, and account
  deletion is at **Profile → Delete my account**. Fix what they cite, bump the
  **Build** number in Xcode (Part D2), re-archive/upload, and resubmit.

---

## Shipping updates after launch — can you change things later?

**Yes. The App Store is not a one-way door.** How you push a change depends on
*what* you're changing. GLPenPal's Supabase + Capacitor setup gives you fast
paths a typical native app doesn't. Four categories:

### 1. Backend / data / logic → **instant, no review**
Anything in **Supabase** — database rows, migrations, RLS policies, edge
functions (`ask-coach`, `send-push`), the Coach system prompt, server-side logic
— goes live the moment you deploy it. The installed app just talks to the new
backend. No Apple involvement, no waiting.

### 2. Store metadata → **easy, little or no review**
In App Store Connect:
- **Promotional text** — changes instantly, no review.
- **Description, keywords, screenshots, support URL, privacy URL** — take effect
  with your next version submission (or a quick metadata-only review).
- **Price / availability** — changeable anytime.

### 3. App code (React/TS, UI, new screens/features) → **new build + review**
Because the web app (`dist/`) is **bundled into the binary**, any front-end
change needs the full release loop:

> change code → `npm run cap:ios` → **bump the Build number in Xcode** (Part D2)
> → Archive → Upload (Part D5) → submit the new version in App Store Connect
> (Part E) → Apple review.

- Bump **Build** (`2`, `3`, …) on **every** upload — Apple rejects a duplicate
  build number.
- Bump **Version** (`1.0.1`, `1.1.0`, …) when you want a new public version
  number; create it in App Store Connect via **`+ Version or Platform`**.
- Update reviews are usually **faster** than the first submission.
- Users get it through the App Store's normal update mechanism.

> ⚠️ **The store app and the website are now two separate deployments of the same
> code.** Pushing to the Netlify branch (`claude/glp-buddy-mvp-c0ante`) updates
> the web/PWA instantly, but the **iOS app keeps running its bundled build** until
> you cut a new release and it clears review. When you ship a front-end change you
> want native users to have, rebuild and resubmit the app too.

### 4. Over-the-air (OTA) updates → **optional, not set up today**
Services like **Capgo** or **Ionic Appflow** can push bundled-JS changes to
installed apps **without** re-review. Apple's guideline **3.3.2** allows this
**only** for changes that don't materially alter the app's purpose or add
un-reviewed features — bug fixes and tweaks are fine; whole new features are a
gray area. GLPenPal doesn't use OTA today; it's an optional future add if update
velocity ever becomes a bottleneck.

### Sensible pattern
Iterate fast and continuously on the **backend** and the **web/PWA**; batch
**front-end app changes** into periodic App Store version releases.

---

## Quick command reference (all **[Terminal]**, run in `~/GLP-Buddy`)
```bash
# One-time environment
sudo gem install cocoapods            # A4
npm install                           # B2

# Create .env.production with VITE_BACKEND / VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY   # B3

# One-time iOS project generation
npx cap add ios                       # C1
npx @capacitor/assets generate --iconBackgroundColor '#5e8c74' --splashBackgroundColor '#f6f4ee'   # C2

# Build + open Xcode (repeat this whenever code/env changes)
npm run cap:ios                       # C3
```
Everything after `npm run cap:ios` is clicks in **Xcode** (Part D) and the
**App Store Connect** website (Part E).

---

## Troubleshooting

- **App shows demo/seeded data instead of real accounts** → `.env.production` was
  missing or wrong when you built. Fix it (Part B3), re-run `npm run cap:ios`,
  re-archive. This is the #1 mistake.
- **Archive menu is greyed out** → device selector isn't on **Any iOS Device
  (arm64)** (Part D3).
- **"No account / no team" or signing errors** → add your Apple ID in **Xcode →
  Settings → Accounts** and pick the Team (Part D1). Enrollment (A1) must be
  fully approved first.
- **`pod install` fails / "command not found: pod"** → CocoaPods isn't installed
  (Part A4). Re-run `sudo gem install cocoapods`, then `cd ios/App && pod install
  && cd ../..`.
- **Build number already used** → bump **Build** in Xcode (Part D2); every upload
  needs a higher number.
- **Bundle ID already registered / in use** → if it's under *your* account that's
  fine (select it in E1). If a different account grabbed `com.glpenpal.app`,
  you'd need a different appId in `capacitor.config.ts` — but this shouldn't
  happen for a new app.
- **Native push doesn't work in the store app** → expected. The VAPID/web-push
  setup only works in browsers. iOS push needs APNs via
  `@capacitor/push-notifications` + Firebase; it's a separate future task and not
  required to ship v1.

---

## Appendix — Google Play (mirror, for when you do Android)

The same listing copy above works for Google Play. Android build steps live in
**`STORE-SETUP.md`**; the Play-specific listing bits are:

- **Short description** (80-char max):
  ```
  1:1 peer support for your GLP-1 journey — matched by medication, stage & goals.
  ```
- **Full description:** reuse the E4 Description block verbatim.
- **Screenshots:** the same `store-screenshots/` PNGs (min 2, max 8) are fine.
- **Data safety form:**
  - Data collected: Email, User IDs, Messages/User content, Health info (self-reported).
  - Encrypted in transit: **Yes.**
  - Users can request deletion: **Yes** — in-app **Profile → Delete my account**
    permanently removes the account and all data.
  - Data shared with third parties: **No.**
- **Reviewer notes / data-handling:** same as E7.

### Names & IDs (quick reference)
- **App name:** GLPenPal · **Bundle ID:** `com.glpenpal.app`
- **Category:** Health & Fitness (Secondary: Lifestyle) · **Age:** 17+ · **Price:** Free
- **Support:** yuvalste13@gmail.com · **Privacy:** https://glpenpal.com/privacy · **Terms:** https://glpenpal.com/terms
