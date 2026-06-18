# 🚀 Taking GLPenPal to production

This repo ships in two modes:

- **Local demo mode** (default): mock data in `localStorage`, no accounts. Great
  for demos and development. This is what runs when no Supabase env vars are set.
- **Supabase mode**: real auth, Postgres database, row-level security, realtime,
  and push. Activated by setting `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.

Everything needed for production is in the repo. The steps below are the
operational tasks that require **your** accounts and secrets.

---

## What's already built

| Concern | Status | Where |
| --- | --- | --- |
| Backend schema + RLS for all 13 models | ✅ in repo | `supabase/migrations/0001_init.sql` |
| Atomic mutual-match logic | ✅ in repo | `supabase/migrations/0002_match_rpc.sql` |
| Typed data + auth + realtime client | ✅ in repo | `src/services/api.ts`, `src/lib/supabase.ts` |
| Auth screens (email/password + magic link) | ✅ in repo | `src/auth/` |
| Web Push (client subscribe + server send) | ✅ in repo | `src/lib/push.ts`, `supabase/functions/send-push/` |
| PWA (installable, offline shell) | ✅ in repo | `vite.config.ts`, `public/icons/` |
| Error monitoring (Sentry, env-gated) | ✅ in repo | `src/lib/sentry.ts` |
| Netlify deploy config + SPA routing | ✅ in repo | `netlify.toml`, `public/_redirects` |
| CI (type-check, build, E2E smoke) | ✅ in repo | `.github/workflows/ci.yml` |
| Privacy Policy + Terms + disclaimers | ✅ in repo (templates) | `src/pages/legal/` |
| Moderation queue (placeholder UI) | ✅ in repo | `src/pages/Moderation.tsx` |

> ⚠️ The local demo is fully wired and verified end-to-end. The Supabase data
> layer is implemented and type-checked but has **not** been run against a live
> project here — follow step 2 to provision one, then verify with a real signup.

---

## 1. Prerequisites

```bash
npm install
npm i -g supabase   # Supabase CLI
```

## 2. Create the Supabase project

1. Create a project at https://supabase.com (note the **project ref**).
2. Link and push the schema:
   ```bash
   supabase login
   supabase link --project-ref <your-ref>
   supabase db push          # runs supabase/migrations/*
   ```
3. In the dashboard, **Authentication → Providers**: enable Email (and Google /
   Apple if desired). For production, turn on email confirmations and configure
   SMTP. Set **Site URL** to your deployed domain.

## 3. Point the app at Supabase

Create `.env.local` (see `.env.example`):

```
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
VITE_BACKEND=supabase
```

Run `npm run dev`. You should now get the **login screen**; sign up creates a
row in `public.profiles` (via the `on_auth_user_created` trigger), and the
onboarding/safety flow fills it in.

> The matching engine no longer simulates the other side: a real second account
> must approve you back. The `approve_buddy` RPC creates the relationship +
> notifications atomically only when both approvals exist.

## 4. Realtime

Realtime is enabled in `supabase/config.toml`. In the dashboard, ensure
**Database → Replication** includes the `messages`, `trio_messages`, and
`notifications` tables. The client subscribes via `api.chat.subscribe()` /
`api.notifications.subscribe()`.

## 5. Web Push notifications

1. Generate VAPID keys:
   ```bash
   npx web-push generate-vapid-keys
   ```
2. Add the **public** key to `.env.local` as `VITE_VAPID_PUBLIC_KEY`.
3. Set function secrets:
   ```bash
   supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... \
     VAPID_SUBJECT=mailto:you@yourdomain.com
   ```
4. Deploy the sender and hook it to notification inserts:
   ```bash
   supabase functions deploy send-push
   ```
   Then **Database → Webhooks → Create**: on `INSERT` into
   `public.notifications`, POST to the `send-push` function. Users opt in via
   Profile → "Enable push notifications".

## 6. Error monitoring (optional)

Create a Sentry project and set `VITE_SENTRY_DSN` in your host's env. It's a
no-op when unset.

## 7. Deploy the frontend to Netlify

1. Connect the GitHub repo in Netlify (build settings come from `netlify.toml`).
2. Add env vars in **Site settings → Environment**: `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY`, `VITE_BACKEND=supabase`, `VITE_VAPID_PUBLIC_KEY`,
   `VITE_SENTRY_DSN`.
3. Deploy. `netlify.toml` handles the SPA fallback, security headers, and the
   no-cache rule for `sw.js`.

CLI alternative:
```bash
npm i -g netlify-cli
netlify init && netlify deploy --build --prod
```

## 8. CI

`.github/workflows/ci.yml` runs on every push/PR: type-check → build →
Playwright smoke test of the core flow. Add deploy previews via Netlify's
GitHub integration.

---

## Hardening checklist before public launch

- [ ] **Legal review** of `src/pages/legal/*` (templates) by a lawyer, given the
      medication context. Add a versioned "accepted terms" record.
- [ ] **Age gate** (18+) at signup.
- [ ] **Moderation**: turn `Moderation.tsx` into a staff-gated dashboard backed
      by `reports_blocks`; add a `is_staff` claim/role and RLS for it. Add a
      content classifier for dosing/medical-advice in chat.
- [ ] **Rate limiting & abuse**: Supabase Edge rate limits / Cloudflare in front.
- [ ] **Privacy/compliance**: GDPR/CCPA data export + delete endpoints,
      encryption review, data-processing agreements with vendors.
- [ ] **Email deliverability**: production SMTP, confirmations on.
- [ ] **Observability**: Sentry alerts, uptime monitoring, DB backups.
- [ ] **Code-split** the bundle (Sentry/Supabase) to trim initial JS.
- [ ] **Accessibility & i18n** pass (the app already collects a language field).

## Backend integration — done

`AppStore` is now fully wired to Supabase when `USE_SUPABASE` is true: it
hydrates from `src/store/hydrate.ts` on load/auth-change and routes every action
through `src/services/api.ts`, with realtime notifications and server-side notify
triggers (`0003_notify_triggers.sql`). Local demo mode is unchanged. The only
remaining work is operational (provision the project, run migrations, deploy) and
a live two-account verification — see GO_LIVE.md Phase 3.
