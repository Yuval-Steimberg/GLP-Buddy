# GLPenPal — Start using it as a PWA

This is the checklist to go from "code is deployed" to "I (and real users) can
install GLPenPal on a phone and use it for real." Work top to bottom.

---

## Part A — One-time production setup (do this once)

### 1. Supabase project is live
- Supabase dashboard → your project is **not paused** (free projects pause after
  inactivity — open it and click **Restore** if so).
- **Project Settings → API** — copy your **Project URL** and **anon public key**.

### 2. Database is set up
Run these once in **SQL Editor** (skip any already applied):
- Migrations `0001`–`0006` from `supabase/migrations/` (schema, RPCs, triggers,
  realtime, account deletion).
- To launch with a clean slate: `supabase/maintenance/reset_all_data.sql`.

### 3. Auth settings
- **Authentication → Providers → Email** is enabled.
- **Authentication → URL Configuration → Site URL** = `https://glpenpal.com`
  (and add it under **Redirect URLs** too). This makes confirmation and
  password-reset links point back to your live site.
- **Confirm email**: your choice.
  - *On* = safer, but users must click an email link before first sign-in
    (requires SMTP set up, see `ACTIVATE-OPTIONAL.md`).
  - *Off* = users are signed in instantly after sign-up (simplest to launch).

### 4. Environment variables on the host (THIS is what turns on "real mode")
Without these the app runs in demo mode (fake local data). In your Netlify site →
**Site configuration → Environment variables**, add:

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | your Project URL |
| `VITE_SUPABASE_ANON_KEY` | your anon public key |
| `VITE_BACKEND` | `supabase` |

Optional (leave unset to keep off): `VITE_SENTRY_DSN`, `VITE_VAPID_PUBLIC_KEY`,
`VITE_PLAUSIBLE_DOMAIN` — see `ACTIVATE-OPTIONAL.md`.

> After adding/changing env vars you must **redeploy** (Netlify → Deploys →
> Trigger deploy → Clear cache and deploy site). Env vars are baked in at build.

### 5. Domain + HTTPS
- `https://glpenpal.com` loads the site with a **valid lock icon** (PWAs require
  HTTPS — this is non-negotiable for install + service worker).
- Both `glpenpal.com` and `www.glpenpal.com` resolve.

---

## Part B — Confirm it's really in "production mode" (not demo)

Open `https://glpenpal.com` and check:
1. The landing page loads with the green GLPenPal branding.
2. Click **Find my pen pal / Get started** → you land on a real **Sign in /
   Create account** screen asking for email + password. *(If it drops you
   straight into a profile with fake buddies, env vars aren't set → redo A4.)*
3. Create a test account → complete onboarding → you reach the app.
4. In Supabase → **Table Editor → profiles**, your new row appears. ✅ That
   confirms real data is being written.

Then wipe your test data with `reset_all_data.sql` when you're ready to open up.

---

## Part C — Install it as an app (PWA)

### iPhone / iPad (Safari — required, Chrome on iOS can't install PWAs)
1. Open `https://glpenpal.com` in **Safari**.
2. Tap the **Share** button (square with an up-arrow).
3. Scroll down → **Add to Home Screen** → **Add**.
4. Launch it from the new GLPenPal icon — it opens full-screen, no address bar.

### Android (Chrome)
1. Open `https://glpenpal.com` in **Chrome**.
2. Tap the **⋮** menu → **Install app** (or **Add to Home screen**), or tap the
   "Install" banner if it appears.
3. Launch from the home-screen icon.

### Desktop (Chrome / Edge)
1. Open `https://glpenpal.com`.
2. Click the **install icon** in the address bar (monitor with a down-arrow), or
   **⋮ menu → Install GLPenPal**.
3. It opens in its own window like a native app.

---

## Part D — Verify every feature works (real-world smoke test)

Best done with **two accounts** (e.g. your phone + a laptop, or two browsers):

- [ ] **Sign up / Sign in** — create both accounts, complete onboarding.
- [ ] **Matching** — Account A sees Account B under Matches → tap **I'd like to
      connect**. Account B does the same → a buddy space opens for both.
- [ ] **Chat** — send a message from A; it appears on B **in real time** (no
      refresh). Reply back.
- [ ] **Milestones & timeline** — log a milestone; it shows on the shared timeline
      for both.
- [ ] **Notifications** — B gets a notification for A's message/milestone.
- [ ] **Profile** — details show correctly; **Edit profile** works.
- [ ] **Password reset** — sign out → "Forgot password?" → you get the email and
      can set a new one. *(Needs SMTP; see `ACTIVATE-OPTIONAL.md`.)*
- [ ] **Delete account** — Profile → **Delete my account** removes it (verify the
      `profiles` row disappears in Supabase).
- [ ] **Offline / update** — after installing, the app opens offline to a cached
      shell; a new deploy auto-updates on next launch.

If all boxes pass, you're live and installable. 🎉

---

## Quick troubleshooting

| Symptom | Cause / fix |
|---|---|
| Sign-in screen never appears; fake buddies show up | Env vars missing → Part A4, then redeploy with cache cleared. |
| "Couldn't reach the server" on sign-up | Supabase project paused, or wrong URL/key → Part A1/A4. |
| Confirmation / reset emails never arrive | SMTP not configured, or Confirm-email on without it → `ACTIVATE-OPTIONAL.md`, or turn Confirm-email off. |
| "Add to Home Screen" missing on iPhone | You're not in **Safari**, or the site isn't on **HTTPS**. |
| App shows an old version after a deploy | Close all its windows/tabs and reopen; the service worker auto-updates on next launch. |
| Messages don't appear without refresh | Realtime not enabled → run migration `0005_realtime.sql`. |
