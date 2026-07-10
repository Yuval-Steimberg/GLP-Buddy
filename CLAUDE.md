# GLPenPal — project memory

Peer-support PWA for people on GLP-1 medications. Users are matched 1:1 with a
"pen pal" on the same medication/stage/goals; they chat, log milestones, and
build a shared timeline. React + Vite + TypeScript front end, Supabase back end,
wrapped with Capacitor for the app stores. Deployed on Netlify (auto-deploy from
`main`); domain `glpenpal.com`.

Brand name is **GLPenPal** (do NOT reintroduce the old "GLP Buddy" name).

## Commands
- `npm run dev` — local dev server
- `npm run build` — `tsc -b && vite build` (this is the typecheck; run it after changes)
- `npm run lint` — `tsc --noEmit`
- `npm run preview` — serve the built `dist/` (used for screenshot verification)
- Native: `npm run cap:sync` / `cap:ios` / `cap:android`

## Architecture
- **Dual backend**, gated by `USE_SUPABASE` in `src/lib/env.ts`:
  - Demo/local mode (no env vars): mock data in `src/data/mockData.ts`, persisted
    to `localStorage` key `glpenpal-state-v1`. Used for dev + screenshots.
  - Supabase mode (`VITE_BACKEND=supabase` or URL+anon key present): real auth +
    Postgres + realtime.
- **`src/store/AppStore.tsx`** is the single source of truth — a big context
  provider holding `AppState` and every action/selector. Components call
  `useStore()`. Every action branches on `USE_SUPABASE`.
- **`src/services/api.ts`** — all Supabase calls (auth, profiles, chat, matching,
  milestones, timeline, notifications, safety, trios). `src/store/hydrate.ts`
  pulls a full `AppState` snapshot; `src/store/mappers.ts` converts DB rows
  (`row*`) to domain types and `profileToRow` back.
- **Types**: domain models in `src/types.ts`; DB row shapes in
  `src/lib/database.types.ts`. Keep these in sync with migrations + mappers.
- **Routing** in `src/App.tsx`. Authenticated pages are `React.lazy`-loaded via
  `lazyWithReload` (see gotchas). Guards enforce onboarding → safety → app.
- Styling is **hand-written CSS** in `src/index.css` (no Tailwind), driven by CSS
  variables. Line icons + `BrandMark` logo are inline SVG in
  `src/components/Icon.tsx` (never use emojis in UI — see Design).

## Supabase
- Migrations in `supabase/migrations/000N_*.sql`. `ALL_MIGRATIONS.sql` is a
  hand-concatenated copy for pasting into the SQL Editor — **regenerate it**
  whenever you add a migration (cat 0001..latest in order). It is skipped by
  `supabase db push` (doesn't match the timestamp filename pattern) — that's fine.
- All tables use RLS; a user only sees their own data or data for relationships/
  trios they belong to. Helpers: `is_relationship_member`, `is_trio_member`,
  `is_staff`.
- Realtime (migration 0005) powers live chat/notifications. Edge function
  `supabase/functions/send-push` + a Database Webhook on `notifications` INSERT
  deliver Web Push.
- Migration list: 0001 schema+RLS, 0002 `approve_buddy` RPC, 0003 notify
  triggers, 0004 compliance/staff, 0005 realtime, 0006 `delete_own_account`,
  0007 message/trio reaction RLS fix, 0008 `profiles.avatar_url`, 0009
  `messages.image_url` (+ text nullable).
- `supabase/maintenance/reset_all_data.sql` wipes all users/data (deletes
  `auth.users`, cascades everywhere).

## Hard-won gotchas (do not regress these)
- **supabase-js deadlock**: never call `supabase.auth.getUser()`/`getSession()`
  inside an `onAuthStateChange` callback — it deadlocks. `hydrateFor(userId)`
  uses the id the event already provides.
- **Auth re-render storm**: `onAuthChange` fires on every focus/token refresh.
  The store only re-hydrates/re-subscribes when the signed-in user id actually
  changes (`subscribedFor` guard). A throttled `visibilitychange` refresh (min
  8s) pulls fresh data when returning to the app. Notifications stream in
  incrementally (no full re-hydrate) to avoid flicker.
- **Onboarding/safety loop**: `completeOnboarding`/`acceptSafety` flip local
  state optimistically before the async save, or the route guard bounces the
  user back to the start.
- **Do NOT add a `controllerchange` → reload handler** in `main.tsx`.
  vite-plugin-pwa `autoUpdate` already reloads once; a second handler = "app
  loads twice". Stale code-split chunks after a deploy are handled by
  `lazyWithReload` in `App.tsx` (reloads once on a failed dynamic import →
  fixes `'text/html' is not a valid JavaScript MIME type`).
- **Reactions RLS**: message/trio_message UPDATE must be allowed for any
  relationship/trio member, not just the author (0007). Reaction/encouragement/
  image sends are optimistic + wrapped so a failure can't become an unhandled
  promise rejection (which showed up in Sentry).
- **Web Push**: `enablePush` unsubscribes any existing subscription before
  re-subscribing, or you get `InvalidStateError: applicationServerKey does not
  match`. VAPID public key in Netlify (`VITE_VAPID_PUBLIC_KEY`) must match the
  private key in Supabase function secrets.
- **PWA cache**: users frequently see stale builds. When something "doesn't
  update," it's almost always the service worker cache — hard refresh / clear
  site data on desktop, delete+re-add to Home Screen on iOS.
- **Images/avatars** are stored as compressed JPEG **data URLs** on the row
  (`fileToAvatarDataUrl`, `fileToChatImage` in `src/lib/image.ts`) — no Storage
  bucket to configure; protected by the row's own RLS.
- **App icon badge** (`navigator.setAppBadge`) is set in-app from unread count
  and from the push SW (`public/push-sw.js`); iOS support is finicky.

## Design system ("Dusk" — Electric Sunset, toned down)
- Palette in `src/index.css` `:root`: primary `#574a8e` (muted indigo-plum),
  accent `#cf8763` (clay), amber `#e0a45e`, ink `#221b26`, bg `#f6f3f0` (warm
  ivory). Signature gradient `--grad` (indigo→mauve→clay) runs through the logo,
  primary buttons (animated `gradientdrift`), gradient headline words, and
  milestone/stat accents. `--green`/`--green-soft` are repurposed as warm bronze
  (NO teal/green — the user rejected it).
- Fonts: **Space Grotesk** (`--font-display`) for headings, **Inter**
  (`--font-body`) for body. Both self-hosted via `@fontsource-variable/*`
  (imported in `main.tsx`) — never link Google Fonts (CSP/offline).
- **No emojis in UI.** Use `Icon` components / gradient badges (`.ms-badge`).
  Exception: chat message reactions are an intentional emoji feature.
- Responsive: mobile-first `--maxw: 460px`; ≥980px shows a sidebar (repurposed
  bottom nav) + wide content (`--content-w: 1180px`); chat fills the screen from
  640px up. Respect `prefers-reduced-motion`.

## Verifying visual/behaviour changes
Build, run `vite preview` on a fixed port, and drive it with Playwright
(installed). Inject a logged-in demo `AppState` into `localStorage`
(`glpenpal-state-v1`) via `addInitScript` to reach app screens without auth.
Use a clean context (no injected state) for the marketing landing. Scratch
scripts live in the scratchpad dir; clean up screenshots from `store-screenshots/`
(that dir holds the real App Store assets — don't leave test images in it).
`pkill -f "vite preview"` often exits 144 (harmless).

## Deploy / ops the user must do (no access from here)
- Netlify: set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_BACKEND=supabase`
  (+ optional VAPID/Sentry/Plausible) and redeploy with cache cleared.
- Supabase: run migrations (`supabase db push` or paste `ALL_MIGRATIONS.sql`),
  deploy `send-push`, create the notifications Insert webhook.
- Git: develop on `claude/glp-buddy-mvp-c0ante`, then fast-forward `main` and
  push both (Netlify deploys `main`). Do not create PRs unless asked.

## Guide docs (repo root)
`GETTING-STARTED-PWA.md` (go-live + install + smoke test), `STORE-SETUP.md` /
`STORE-LISTING.md` (App Store/Play), `ACTIVATE-OPTIONAL.md` (push/SMTP/analytics/
Sentry), `PRODUCTION.md`, `GO_LIVE.md`.
