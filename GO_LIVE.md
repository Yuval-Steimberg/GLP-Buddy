# ✅ GLP Buddy — complete go-live runbook

Do these in order. By the end you'll have a real, multi-user app live on the
internet with accounts, a database, realtime chat, and push notifications.

Legend: 🧑‍💻 = code in this repo · 🌐 = needs your account/dashboard · ⏱️ = rough effort

---

## Phase 0 — Accounts & tools (⏱️ 30 min) 🌐

1. Create accounts: **GitHub**, **Supabase** (supabase.com), **Netlify**
   (netlify.com), and optionally **Sentry** (sentry.io).
2. Install tooling locally:
   ```bash
   node -v            # need 18+ (repo uses 22)
   npm i -g supabase  # Supabase CLI
   npm i -g netlify-cli
   ```
3. Clone and install:
   ```bash
   git clone <your-repo-url> && cd GLP-Buddy
   npm install
   ```

---

## Phase 1 — Connect the app to the real backend ✅ DONE (verify live in Phase 3)

This is now implemented. When `USE_SUPABASE` is true, `AppStore`:

- Hydrates a full snapshot for the signed-in user from Supabase on load and on
  auth change (`src/store/hydrate.ts` + `src/store/mappers.ts`).
- Routes **every** mutating action through `src/services/api.ts` (1:1 with the
  local actions) and refetches — e.g. `completeOnboarding`→`profiles.saveOnboarding`,
  `connectWith`/`approveIncoming`→`matching.approveBuddy` (atomic RPC),
  `sendMessage`→`chat.send`, `addMilestone`→`milestones.add`+`timeline.addEvent`,
  `endRelationship`→`relationships.end`, `createTrio`→`trios.create`, etc.
- Subscribes to **realtime** notifications (re-hydrate on insert).
- Drops the demo-only simulations (auto-approve-back, simulated Trio approvals) —
  real users drive those now.
- Buddy notifications for new messages/milestones are created **server-side** by
  DB triggers (`supabase/migrations/0003_notify_triggers.sql`).

The local demo path is untouched and still passes (`node tests/smoke.mjs`).

> Not yet possible to verify here: a live run against a real Supabase project.
> Do that in **Phase 3** — sign up two accounts and confirm a real mutual match,
> realtime chat, and milestone notifications.

---

## Phase 2 — Create & configure Supabase (⏱️ 1 hr) 🌐🧑‍💻

1. In the Supabase dashboard, **New project**. Save the **project ref**,
   **anon key** (Settings → API), and DB password.
2. Link and push the schema (creates all 13 tables, RLS, the match RPC):
   ```bash
   supabase login
   supabase link --project-ref <your-ref>
   supabase db push          # applies supabase/migrations/*
   ```
3. Confirm in **Table Editor** that `profiles`, `relationships`, `messages`,
   `milestones`, `timeline_events`, `notifications`, `match_approvals`,
   `reports_blocks`, `trios`, `trio_members`, `trio_messages`,
   `push_subscriptions` exist and **RLS is enabled** on each.

---

## Phase 3 — Run the app against live Supabase (⏱️ 30 min) 🧑‍💻

1. Create `.env.local` (from `.env.example`):
   ```
   VITE_SUPABASE_URL=https://<ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon key>
   VITE_BACKEND=supabase
   ```
2. `npm run dev` → you should see the **login screen**.
3. Sign up two test accounts (two browsers / incognito). For each: complete
   onboarding + accept the disclaimer.
4. From account A, "I'd like to connect" with B. From B, approve A. Confirm a
   buddy space opens for **both** and messages/milestones sync in realtime.

---

## Phase 4 — Auth & email (⏱️ 30 min) 🌐

1. **Authentication → Providers**: keep Email on; enable **Google**/**Apple** if
   wanted (add their OAuth credentials).
2. **Authentication → Email**: turn ON "Confirm email" for production.
3. **Authentication → SMTP**: configure a real sender (Resend, Postmark, SES…).
   Without this, confirmation/magic-link emails won't reliably deliver.
4. **URL Configuration**: set **Site URL** to your production domain and add it
   to redirect URLs (also keep `http://localhost:5173` for dev).

---

## Phase 5 — Realtime (⏱️ 10 min) 🌐

1. **Database → Replication** (or **Realtime**): ensure `messages`,
   `trio_messages`, and `notifications` are published for realtime.
2. Re-test chat between the two accounts — new messages should appear without a
   refresh.

---

## Phase 6 — Push notifications (⏱️ 1 hr) 🌐🧑‍💻

1. Generate VAPID keys:
   ```bash
   npx web-push generate-vapid-keys
   ```
2. Add the **public** key to env as `VITE_VAPID_PUBLIC_KEY` (local `.env.local`
   and later Netlify).
3. Set Edge Function secrets:
   ```bash
   supabase secrets set \
     VAPID_PUBLIC_KEY=<public> VAPID_PRIVATE_KEY=<private> \
     VAPID_SUBJECT=mailto:you@yourdomain.com
   ```
4. Deploy the sender:
   ```bash
   supabase functions deploy send-push
   ```
5. **Database → Webhooks → Create**: on `INSERT` into `public.notifications`,
   POST to the `send-push` function.
6. In the app: Profile → "Enable push notifications", grant permission, then
   trigger a notification (e.g. have your buddy add a milestone) to confirm a
   system notification arrives.

---

## Phase 7 — Error monitoring (⏱️ 15 min) 🌐

1. Create a Sentry project (React). Copy the **DSN**.
2. Set `VITE_SENTRY_DSN` in env. It's a no-op when blank, so dev stays quiet.

---

## Phase 8 — Deploy the frontend to Netlify (⏱️ 30 min) 🌐

Option A — dashboard:
1. **Add new site → Import from Git** → pick the repo. Build settings come from
   `netlify.toml` (build `npm run build`, publish `dist`).
2. **Site settings → Environment variables**: add
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_BACKEND=supabase`,
   `VITE_VAPID_PUBLIC_KEY`, `VITE_SENTRY_DSN`.
3. **Deploy**. `netlify.toml` already handles SPA routing, security headers, and
   the no-cache rule for `sw.js`.

Option B — CLI:
```bash
netlify init
netlify env:set VITE_SUPABASE_URL "https://<ref>.supabase.co"
netlify env:set VITE_SUPABASE_ANON_KEY "<anon key>"
netlify env:set VITE_BACKEND "supabase"
netlify deploy --build --prod
```

Then update Supabase **Site URL** (Phase 4) to the Netlify URL.

---

## Phase 9 — Custom domain & HTTPS (⏱️ 30 min) 🌐

1. Netlify **Domain settings → Add custom domain** (e.g. `glpbuddy.app`).
2. Point DNS to Netlify; HTTPS is auto-provisioned via Let's Encrypt.
3. Update Supabase **Site URL**/redirects and `VITE_VAPID_SUBJECT` to the domain.
4. Confirm the PWA installs ("Add to Home Screen") on a phone over HTTPS.

---

## Phase 10 — CI/CD (⏱️ 15 min) 🌐

1. `.github/workflows/ci.yml` already runs type-check → build → Playwright smoke
   on every push/PR. Confirm it's green in the **Actions** tab.
2. Enable Netlify's GitHub integration for **deploy previews** on PRs and
   auto-deploy on merge to `main`.

---

## Phase 11 — Legal & safety hardening (partly ✅) 🌐🧑‍💻

1. ⏳ Have a lawyer review `src/pages/legal/Privacy.tsx` and `Terms.tsx`
   (templates) — important given the medication context.
2. ✅ **Accepted-terms version** is recorded on acceptance (`TERMS_VERSION` →
   `profiles.terms_version`, migration `0004`). Bump the constant to re-prompt.
3. ✅ **18+ age gate** + explicit Terms/Privacy agreement on the safety screen
   (`profiles.age_confirmed`).
4. ✅ Medical-advice disclaimer is prominent on the safety screen and in chat.

---

## Phase 12 — Trust, moderation & abuse (partly ✅) 🧑‍💻🌐

1. ✅ **Staff role** added: `profiles.is_staff` + RLS so only staff read/update
   `reports_blocks` (migration `0004`), and the `/moderation` route + Profile
   link are staff-gated in Supabase mode. Grant staff with
   `update public.profiles set is_staff = true where id = '<uuid>';`.
   ⏳ Flesh out resolve/suspend actions to write back to the DB.
2. ✅ Chat **content classifier** (`src/utils/safety.ts`) flags dosing/medical
   language and shows a non-blocking reminder. ⏳ Add an LLM/server check to
   back up the heuristic.
3. ⏳ Add **rate limiting** (Supabase Edge / Cloudflare) and abuse detection.

---

## Phase 13 — Performance & polish (partly ✅) 🧑‍💻

1. ✅ **Code-split** done: routes are `React.lazy`-loaded and react/supabase/
   sentry vendors are split via `build.rollupOptions.manualChunks`. The initial
   app chunk is now ~53 KB (was ~617 KB); per-route chunks load on demand.
2. ⏳ Run **Lighthouse** (PWA + performance + a11y) and fix top issues.
3. ⏳ Accessibility/i18n pass (the app already collects a language field).

---

## Phase 14 — Data, ops & compliance (⏱️ ongoing) 🌐

1. **Backups**: enable Supabase scheduled backups (and test a restore).
2. **GDPR/CCPA**: implement data **export** and **delete** (you can build these
   as Edge Functions; RLS + `on delete cascade` already support deletion).
3. **Uptime monitoring** (e.g. Better Uptime) + Sentry alerts.
4. **Analytics**: privacy-respecting (Plausible/Umami).
5. **Secrets hygiene**: anon key is public by design; never expose the service
   role key in the client — it's only used in the Edge Function.

---

## Phase 15 — Launch checklist (⏱️ 1 hr) 🌐

- [ ] Two real accounts can sign up, match mutually, chat, and see milestones in realtime
- [ ] Email confirmation + magic link deliver from your domain
- [ ] Push notification received on a real phone
- [ ] PWA installs over HTTPS on iOS + Android
- [ ] Report/block works and lands in moderation
- [ ] Privacy/Terms reviewed; 18+ gate live
- [ ] CI green; deploy previews on PRs; auto-deploy on `main`
- [ ] Backups on; Sentry + uptime alerts firing
- [ ] Lighthouse PWA pass; bundle code-split
- [ ] Custom domain live with HTTPS

---

### Fastest path to "real and running"
Phases **1 → 2 → 3 → 8** alone give you a live, working multi-user app on a
Netlify URL. Phases 4–7 make it production-grade (email, realtime, push), and
9–15 are launch hardening. See `PRODUCTION.md` for the same steps in reference
form.
