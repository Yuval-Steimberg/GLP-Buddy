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
- **Profile editing**: `/edit-profile` (`src/pages/EditProfile.tsx`) is a
  single-page editor — every field pre-filled, change just what you want. It
  uses `updateProfile` (store) + `api.profiles.update` (writes only profile
  fields, no onboarding/safety flags), optimistic in both modes. Do NOT route
  "Edit profile" back through the onboarding wizard.
- Styling is **hand-written CSS** in `src/index.css` (no Tailwind), driven by CSS
  variables. Line icons + `BrandMark` logo are inline SVG in
  `src/components/Icon.tsx` (never use emojis in UI — see Design).
- **Marketing landing** (`src/pages/Landing.tsx`, `.lp-*` CSS): scoped design
  system that re-declares palette vars on `.lp`. Motion primitives live in the
  file: `Reveal` (IntersectionObserver scroll-reveal, one-shot, reduced-motion
  safe), `Counter` (animated stat numbers). Sections: hero + floating phone,
  stats band, problem, feature rows, how-it-works, community voices
  (representative quotes, labelled not-medical-advice — never fabricate named
  reviews for a health product), values, FAQ, final CTA.

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
  deliver Web Push. The store subscribes to `messages`, `notifications` AND
  `timeline_events` (via `api.timeline.subscribeAll`) so a buddy's timeline
  posts/reactions appear live — mirror this pattern for any new realtime table
  (add it to the publication, then subscribe + incrementally patch state).
- Migration list: 0001 schema+RLS, 0002 `approve_buddy` RPC, 0003 notify
  triggers, 0004 compliance/staff, 0005 realtime, 0006 `delete_own_account`,
  0007 message/trio reaction RLS fix, 0008 `profiles.avatar_url`, 0009
  `messages.image_url` (+ text nullable), 0010 **security hardening** (see below),
  0011 `messages.reply_to` (quoted replies), 0012 `timeline_events.image_url`
  (timeline photos), 0013 GLP features (injection day + check-ins + support RPC),
  0014 `messages.from_coach` ("Hey Coach" in the buddy chat).
- **Migration 0010 (security model — do NOT regress):**
  - `profiles` UPDATE is **column-scoped via GRANTs** (revoke-then-grant only
    editable columns). Privileged flags (`is_staff`, `onboarding_complete`,
    `accepted_safety`, `age_confirmed`, `terms_version`) are writable ONLY via
    `SECURITY DEFINER` RPCs. The client MUST call `mark_onboarding_complete()`
    and `accept_safety(p_terms_version)` — never write those columns directly.
  - `messages`/`trio_messages`/`timeline_events` UPDATE is column-scoped to
    `reactions` only. Reactions toggle atomically via
    `toggle_message_reaction` / `toggle_timeline_reaction` /
    `toggle_trio_reaction` (pass the single reaction, not the whole array).
  - `profiles` SELECT is restricted to `can_view_profile(id)` (self + buddies +
    pending approvals + trio co-members). Match discovery goes through the
    bounded `discover_candidates(p_limit)` RPC (minimized columns, no
    staff/compliance fields). `hydrate.ts` fetches connected profiles via
    `api.profiles.related(ids)`; there is NO more `select * from profiles`.
  - Relationships can't be client-inserted (only `approve_buddy` creates them);
    `trio_members` inserts are self/creator-only; `approve_trio_membership(trio)`
    approves + activates. All definer funcs pin `search_path=''`. Size CHECKs on
    data-URL columns; push endpoint host allow-list.
  - **Client↔DB contract:** the frontend calls these RPCs, so migration 0010 and
    the current frontend MUST be deployed together. Old frontend + 0010 = onboarding
    loop (denied column writes) + empty matches (restricted reads).
- Migration 0011: `messages.reply_to` (FK → messages, `on delete set null`) powers
  quoted replies in chat. Rides the existing realtime publication.
- Migration 0012: `timeline_events.image_url` (data-URL photo, size-capped) —
  photos on the shared timeline, same pattern as chat images.
- Migration 0013 (**GLP-journey features**): `profiles.injection_weekday`
  (0-6; re-granted into the 0010 editable-column GRANT — any NEW editable
  profile column MUST be added to that grant or client writes are denied);
  `checkins` table (side-effect check-ins, own RLS + `notify_on_checkin` trigger
  + realtime + `shares_relationship` helper); `request_support()` RPC ("Someone
  Gets It" — notifies all active buddies). Buddy Memories (6) + Journey Capsule
  (15) are derived client-side (no schema).
- **hydrate must degrade gracefully:** a new per-load fetch that hits a table
  from an unapplied migration will reject the whole `hydrate` and brick the app
  on an infinite "Loading…" screen. Wrap optional/new fetches (e.g. `checkins`)
  in try/catch. This bit us: 0013 unapplied → checkins query failed → stuck load.
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
  bucket to configure; protected by the row's own RLS. `messages.image_url`
  (migration 0009) holds chat photos and `text` is nullable (image-only msgs).
  Chat compose (`src/pages/Chat.tsx`): attach sheet offers camera
  (`capture="environment"`) or gallery (`multiple`); picked photos queue in a
  compose tray (removable thumbnails), the input becomes a caption field, and
  `send()` posts each photo in order with the caption on the last one. Tap an
  image bubble → full-screen lightbox.
- **Quoted replies** (migration 0011): swipe a bubble sideways (or tap → Reply in
  the action bar) sets `replyTo`; a reply preview shows above the composer;
  `sendMessage(relId, text, imageUrl?, replyTo?)` threads the id (last photo in a
  batch carries it). Reply bubbles render a `.bubble-quote` that scrolls to +
  flashes the original (`#msg-<id>` + `.msg-flash`). Reactions/replies/timeline
  all sync live via realtime.
- **Chat bubble gestures** (`Chat.tsx`, all share `touchStart`): press-and-hold
  ~450ms → open reaction picker (`lpTimer`/`lpFired`, swallows the trailing
  click); swipe sideways → reply; a >8px drag cancels the long-press. Tap also
  opens reactions (desktop).
- **GLP-journey features** (BuddyHome unless noted): injection-day nudge (buddy's
  `injectionWeekday` === today); side-effect check-ins (`postCheckin`, buddies
  notified + latest status shown; `CHECKIN_OPTIONS` in constants, no emojis — a
  tone dot); "Someone Gets It" (`requestSupport()` RPC → notifies buddies);
  Buddy Memories (`buddyMemories(rel)`, client-derived anniversaries); Journey
  Capsule (`journeyCapsule(rel, monthsAgo)`) — its own screen `/capsule` with
  month browsing + canvas PNG export via Web Share (`Capsule.tsx`).
- **AI Coach** (`src/pages/Coach.tsx`, `/coach`, reached from a card on BuddyHome
  AND an always-present entry at the top of the Chat tab `ChatList`): a
  wellness/habits companion, **never medical advice**. `/coach` is NOT in
  `NAV_PATHS`, so the bottom nav is hidden there — the header has its own back
  button (`navigate(-1)`, same as buddy `Chat`) or mobile users get trapped.
  Backed by the
  `supabase/functions/ask-coach` edge function (Deno + Anthropic SDK,
  `MODEL=claude-opus-4-8`, over/ridable via `COACH_MODEL` secret). The
  no-medical-advice rules live in the function's **server-side system prompt**
  (can't be prompt-injected away); it also handles `stop_reason==='refusal'` with
  a safe fallback, sanitizes history (last 12 turns), and keeps **verify_jwt ON**
  (signed-in users only — do NOT deploy with `--no-verify-jwt`). Client calls
  `api.coach.ask(messages)` → `functions.invoke('ask-coach')`. Conversation is
  ephemeral (React state, never stored). Demo mode returns a canned safe reply.
  Activation = set `ANTHROPIC_API_KEY` supabase secret + `supabase functions
  deploy ask-coach`; **no migration/SQL**. Coach replies are markdown — rendered
  by a tiny in-file `CoachText` formatter (paragraphs + `-`/`*` bullets +
  `**bold**`, no library — extracted to `src/components/CoachText.tsx`, shared
  with the in-chat Coach); the chat is capped to a centred `.chat-wrap.coach`
  760px column (buddy chat still goes full-width ≥640px).
- **"Hey Coach" in the buddy chat** (migration 0014 `messages.from_coach`,
  **server-authored + privacy-first**): typing `Hey Coach …` / `Coach: …` in a 1:1
  chat (`COACH_TRIGGER` in AppStore) summons the Coach. The client calls
  `api.coach.askInChat(relId, question)` → `ask-coach` in **in-chat mode**: the
  Edge Function verifies the caller's relationship membership (user-scoped client
  + RLS), asks Claude with **only the typed question** (no names, history, or
  profile/health data leave the app), then **inserts the reply itself via the
  service role** with `from_coach=true`. It syncs to **both** buddies over the
  existing realtime publication; the asker just `refresh()`es. `Chat.tsx` renders
  `fromCoach` messages as a distinct non-attributed Coach bubble (`.coach-bubble`,
  `CoachText` markdown, "not medical advice" label); a `.coach-hint` above the
  composer advertises it until first use.
  - **Hardening:** 0014 does `revoke insert on messages from authenticated; grant
    insert (relationship_id, sender_id, text, image_url, reply_to) …` — clients
    CANNOT set `from_coach` (column-scoped INSERT, same trick as 0010's
    reactions-only UPDATE), so only the service-role function can author a Coach
    bubble. `api.chat.send` therefore must NOT reference `from_coach`.
  - **Rate limit:** the function enforces one Coach summon per chat per 8s
    (checks the latest `from_coach` message's `created_at` with the service role
    BEFORE calling Claude → returns 429 on cooldown, so spam can't burn API
    cost). The client swallows the 429 (the user's message still posts).
  - The privacy clause lives in the function's SYSTEM prompt (never ask
    for/repeat personal or health specifics). Guardrail unchanged (server-side).
  - Uses the auto-injected `SUPABASE_URL` / `SUPABASE_ANON_KEY` /
    `SUPABASE_SERVICE_ROLE_KEY` edge secrets — no new secret to set. Redeploy
    `ask-coach` when shipping this (the in-chat branch is new).
- **Brand logo system** (all in `src/components/Icon.tsx`; assets in
  `public/brand/`):
  - `BrandMark` = inline-SVG heart mark (small spots, in-app tab bar, install
    prompt, capsule export).
  - `BrandWordmark` = CSS multi-colour "GLPenPal" text (GLP=primary, en=ink,
    Pal=green) — crisp fallback text, can't fail to load.
  - `BrandLogo` = **full** artwork `public/brand/logo-full.png` (mark + wordmark +
    tagline) on auth + reset-password + landing CTA. On the dark landing CTA it
    sits on a light `.lp-logo-badge` card (the artwork is drawn for light bg — its
    dark wordmark/pen vanish on dark).
  - `BrandLockup` = **horizontal** artwork `public/brand/logo-lockup.png` (mark +
    wordmark + tagline, side-by-side) for the landing nav + footer + desktop
    sidebar.
  - Every raster logo has an **onError fallback** to the inline mark+wordmark so a
    load failure never shows a broken-image box.
  - **App icons** (`public/icons/*`, referenced in `vite.config.ts` manifest +
    `index.html`) are generated from `logo-full.png` centred on cream.
  - **Cropping gotcha (this bit us hard):** the horizontal/app-icon rasters are
    cropped from `logo-full.png` with PIL. The wordmark band's "G" starts at
    **x=12** — cropping the wordmark from x>12 **slices the left off the G** and it
    reads as cut/unreadable. Always crop the wordmark at **full width** (x=0..W)
    and `trim()` to bbox. Y-bands in `logo-full.png` (1077×1082): mark ≈ 8–676,
    wordmark ≈ 678–905, divider heart ≈ 926–979, tagline ≈ 982–1078.
  - **Static-filename cache trap:** logo/icon files are in `public/` (served as-is,
    no content hash). Re-saving the SAME filename after an edit → clients keep the
    cached old image. When an artwork asset materially changes, ship it under a
    **new filename** (that's why the nav lockup is `logo-lockup.png`, not the old
    `logo-horizontal.png`) or it won't refresh without a full SW clear.
  - Source artwork was a JPEG with a baked-in cream box → made transparent +
    tight-cropped via PIL floodfill. If re-supplying, use a transparent PNG.
- **Landing nav** (`.lp-nav`): background is **near-opaque** (`rgba(...,.97)`) — a
  translucent sticky nav let hero text ghost through it while scrolling ("covering
  content"). Keep it opaque. On mobile `.lp-nav-in .lp-brand` is `flex:1` so the
  sign-in button sits at the right edge.
- **Data-density collapses** (scannability): BuddyHome buddy card collapses to a
  header (avatar+name+medication+caret), auto-open when there's a single buddy;
  `ProfileCard` (Matches) leads with essentials + a "More about…" toggle for
  bio/secondary chips; Profile "Your details" (11-field list) collapses behind a
  tappable header. Shared `.expand-caret` (rotates) + `.more-toggle` styles.
- **Timeline dating** (`Timeline.tsx`): each entry shows an absolute
  `stamp(createdAt)` ("Jul 12, 3:45 PM", `.tl-stamp`) instead of relative time,
  and entries are grouped under `.tl-day` dividers via `dayHeading()` (Today /
  Yesterday / "Fri, Jul 12", +year for prior years) — computed inline by
  comparing adjacent events' `toDateString()` (events are sorted desc).
- **App icon badge** (`navigator.setAppBadge`) is set in-app from unread count
  and from the push SW (`public/push-sw.js`); iOS support is finicky.
- **Service-worker cache = the deploy footgun.** After ANY deploy, existing
  clients keep running the OLD JS until the SW updates. Symptoms of a
  frontend/DB mismatch (onboarding loops back to step 1, matches empty) are
  almost always this. To verify a deploy actually reached the browser: test in
  an **Incognito window** (no SW). To fix a stuck client: DevTools → Application
  → Service Workers → Unregister → Clear site data → hard refresh; iPhone:
  delete + re-add the PWA. Confirm the truth server-side with
  `select onboarding_complete, accepted_safety from profiles order by created_at desc`
  — if those are `true`, the backend is fine and it's purely the cached client.
- **send-push auth:** the edge function requires a shared secret. Set
  `SEND_PUSH_SECRET` (supabase secret) AND add it as the `x-webhook-secret`
  header on the `notifications` INSERT Database Webhook, or push 401s. The
  function re-reads the notification row by id and sends a GENERIC lock-screen
  body (no message/health content); the in-app bell keeps the full text.

## Design system ("Sage" — calm wellness; app + landing unified)
- Palette in `src/index.css` `:root`: primary `#5e8c74` (muted eucalyptus sage),
  accent `#c2955f` (warm sand), ink `#1e2a25` (green-charcoal), bg `#f6f4ee`
  (warm off-white). `--green`/`--green-soft` are repurposed as a **soft sky-blue**
  (`#5f8497`) used for buddy/milestone chips (sage + blue two-tone). Signature
  gradient `--grad` (sage→soft-green→pale) runs through the logo, primary buttons
  (animated `gradientdrift`), gradient headline words, and milestone/stat accents.
  Avatar initials palette (`src/utils/format.ts`) is sage/blue/sand family.
- History: was teal (rejected as "vibe-coding"), then bright violet (too bright),
  then dusk indigo, now unified **sage wellness** (Oura/Headspace feel) after the
  landing redesign. If changing palette, do it via `:root` + the hardcoded rgba
  glows/shadows; the landing's `.lp` block also re-declares palette vars.
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
- **Netlify production branch is `claude/glp-buddy-mvp-c0ante`** (site name
  `buddyglp`, domain glpenpal.com) — NOT `main`, despite older notes. A push to
  `main` alone does NOT deploy. Verify the published deploy's commit in
  Netlify → Deploys (`@<sha>`) matches what you pushed.
- Netlify env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
  `VITE_BACKEND=supabase` (+ optional VAPID/Sentry/Plausible). Redeploy with
  **"Deploy without cache"** so the SW updates.
- Supabase: run migrations (`supabase db push` or paste ONLY the new file into
  the SQL Editor — `ALL_MIGRATIONS.sql` is for a fresh DB), deploy `send-push`
  (`--no-verify-jwt`; the `x-webhook-secret` is the gate), set the
  `SEND_PUSH_SECRET` secret + webhook header.
- **AI Coach:** `supabase secrets set ANTHROPIC_API_KEY=sk-ant-…` then
  `supabase functions deploy ask-coach` (**keep verify_jwt ON** — no
  `--no-verify-jwt`). No SQL/migration. "Couldn't reach the Coach" = key not set,
  function not deployed, or no Anthropic credit (check Edge Function logs).
  Deploying `ask-coach` needs the file locally — `git pull` first if it's missing.
- **Deploy order for a release that touches both:** apply the DB migration
  first, THEN push the frontend to the Netlify branch — the frontend depends on
  the new RPCs (see migration 0010 notes). Ship them close together.
- Git: develop on the designated branch, then fast-forward and push
  `claude/glp-buddy-mvp-c0ante` (keep `main` in sync too). Do not create PRs
  unless asked.
- Wipe all data to test from scratch: `supabase/maintenance/reset_all_data.sql`
  (SQL Editor). Re-grant staff after: `update profiles set is_staff=true where id='…'`.

## Guide docs (repo root)
`GETTING-STARTED-PWA.md` (go-live + install + smoke test), `STORE-SETUP.md` /
`STORE-LISTING.md` (App Store/Play), `ACTIVATE-OPTIONAL.md` (push/SMTP/analytics/
Sentry), `PRODUCTION.md`, `GO_LIVE.md`.
