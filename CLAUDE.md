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
- Native: `npm run cap:sync` (= `npm run build && cap sync`) / `cap:ios` / `cap:android`.
  **After any `git pull` that touched `package.json`, run `npm install` before
  `cap:sync`** — `jspdf` (Journey Book PDF) is a dep; a stale `node_modules`
  fails the build with "Cannot find module 'jspdf'".

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
- **⚠️ Migration-history mismatch (bit us 2026-07):** the remote DB's migration
  history is OUT OF SYNC because several migrations were applied by pasting into
  the SQL Editor (which does NOT record them in `supabase_migrations`). So
  `supabase db push` tries to RE-APPLY already-applied migrations and dies with
  `... already exists (SQLSTATE 42710)`. **Preferred way to ship a new migration:
  paste its `.sql` into the SQL Editor** (our migrations are idempotent —
  `if not exists` / `drop policy if exists` / `add column if not exists`). We ran
  `supabase migration repair --status applied 0010 … 0018` to reconcile the
  history — but **`repair` marks a migration applied WITHOUT running it**, so if a
  table/column was never actually created, `db push` will now SKIP it and it stays
  missing. After any repair, VERIFY the object exists (e.g. `select count(*) from
  public.meals;`) and paste the SQL manually if not.
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
  0014 `messages.from_coach` ("Hey Coach" in the buddy chat), 0015
  `profiles.is_premium` (premium tier — see Monetization below), 0016
  `weight_logs` (optional private weight logging — powers real "kg lost"), 0017
  admin dashboard RPCs (see Admin below), 0018 `meals` (private food-photo log —
  calorie/protein estimates), 0019 `meals` full macros (carbs/fat/fiber columns),
  0020 `goals` (shared buddy goals/challenges — see below).
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
- Migration 0015: `profiles.is_premium` (bool, default false). **Privileged flag,
  exactly like `is_staff`** — NOT added to the 0010 editable-column GRANT, so
  clients can only READ it, never set it. Written only by the service role (a
  future billing webhook / admin SQL). Mapped to `User.isPremium`
  (`mappers.rowToUser`); `profileToRow` must NEVER include it (keeps it
  non-writable). Grant premium for testing:
  `update profiles set is_premium=true where id='…'`.

## Monetization / Premium (Journey Book)
- **STATUS: Premium is DISABLED for launch — every feature is free.** The store's
  `isPremium` is hardcoded `true` (see `AppStore.tsx`), so all exports/cards are
  unlocked for everyone; the paywall UI, the `PremiumSheet`, the `setPremiumDemo`
  demo toggle, the Stripe billing (`api.billing`, the `create-checkout` /
  `stripe-webhook` edge functions), and `IS_NATIVE` were all removed. The
  `profiles.is_premium` column (migration 0015) + the `rowToUser` mapper are kept
  so re-enabling later is a one-line change: `isPremium = currentUser?.isPremium
  ?? false`, then re-add a paywall + billing. The notes below describe the
  (removed) paywall/billing design for when that happens.
- **First premium feature** (branch `claude/premium-monetization-features-*`):
  **The Journey Book** — `/journey-book` (`src/pages/JourneyBook.tsx`, NOT in
  `NAV_PATHS` so the bottom nav is hidden → `TopBar back` gives it a back
  button, same as Coach/Capsule). Reached from a teaser card on BuddyHome
  (`.jb-teaser`, under the Journey Capsule card).
- **Free = the retention hook:** a month-by-month auto-written story of a buddy
  pair, from the month they matched to now. Pure/derived, no schema — computed by
  `buildJourneyBook()` in `src/utils/journey.ts` from existing milestones +
  messages + timeline. Store selector `journeyBook(rel)`. Each month is a
  `JourneyChapter` with an auto-written `story: string[]` (types in `types.ts`).
- **Premium = the exports:** `src/lib/journeyExport.ts` — `exportJourneyPdf(book)`
  (designed multi-page **jsPDF** keepsake, native vector drawing in Helvetica, no
  html2canvas path used). Canvas PNG share cards live in **`src/lib/shareCards.ts`**
  (`shareJourneyCard` + `shareYearReview`, same approach as `Capsule.drawCapsule`);
  shared colours/`deliver()`/`heartCanvas()` are in **`src/lib/shareBrand.ts`**.
  Both `deliver()` via `navigator.share` (files) → download fallback.
  **Split on purpose:** jsPDF is heavy (pulls html2canvas), so ONLY
  `journeyExport.ts` imports it — `shareCards.ts`/`shareBrand.ts` are jsPDF-free
  so the free/viral Year in Review page (canvas only) never loads jsPDF. The
  `/journey-book` chunk (with jsPDF) is lazy-loaded, so it only loads there.
- **Gating:** `isPremium` (store value = `currentUser?.isPremium ?? false`).
  Non-premium sees the story free + a `.jb-lock` upsell → `PremiumSheet`
  (benefits + CTA). **Demo/local mode only:** `setPremiumDemo(v)` flips the flag
  locally (persisted in the local cache) so both the paywall AND the unlocked
  export are demoable without billing; it's a **no-op in Supabase mode** (real
  flag is server-only). The sheet shows "Preview Premium (demo)" in demo mode and
  "Notify me when Premium launches" in Supabase mode.
- **Billing (Stripe, WEB ONLY — App Store safe):** wired for the PWA.
  `PremiumSheet` (JourneyBook.tsx) branches on runtime: demo → "Preview Premium"
  (`setPremiumDemo`); **web + Supabase** → real Stripe checkout
  (`api.billing.checkoutUrl()` → `create-checkout` edge fn → redirect); **native
  app** (`IS_NATIVE` in `src/lib/env.ts`, via `Capacitor.isNativePlatform()`) →
  **NO purchase button** (Apple/Google mandate their own IAP for digital subs;
  showing Stripe/web purchase in a native build risks App Store rejection). Edge
  functions: `create-checkout` (verify_jwt ON; stamps `user_id` into the Stripe
  subscription metadata) and `stripe-webhook` (deploy `--no-verify-jwt`,
  signature-verified; the ONLY writer of `profiles.is_premium`, via service role;
  maps subscription→user by that metadata, so no `stripe_customer_id` column
  needed). Return path: `?upgraded=1` on `/journey-book` shows a banner; hydrate
  + focus-refresh reconcile the flag. **Native IAP (RevenueCat/StoreKit) is the
  follow-up** for selling Premium inside the apps.
- **Animated recap** (`/recap`, `src/pages/Recap.tsx`, NOT in `NAV_PATHS`): a
  Spotify-Wrapped-style **full-screen story player** built from `yearReview`
  (`buildScenes`) — "You started here…", "Remember your first week?/plateau?",
  tough weeks, buddy's encouragement, biggest moment, year in numbers, finale
  with share. Auto-advances (`SCENE_MS`), progress bars, tap zones (left/right),
  hold-to-pause, reduced-motion safe. **Pure client-side CSS animation (no video
  encoding)** so it's reliable on iOS. Reached from a "Play your recap" button on
  Year in Review. `.recap-*` CSS.
- **Weight logging** (migration 0016, PRIVATE self-only RLS — never shown to
  buddies): optional `WeightSheet` on BuddyHome (`postWeight`/`latestWeight` in
  the store). `buildYearReview` derives a real **`kgLost`** for the year (shown on
  the YiR screen, share card, and recap). `hydrate` fetches `weight_logs` with
  **try/catch graceful degrade** (same footgun as checkins — a new per-load fetch
  from an unapplied migration would brick load). `load()` now backfills new
  `AppState` keys onto older persisted caches (so `weightLogs` never reads
  undefined).
- **Shared `Reveal`** (`src/components/Reveal.tsx`, `.reveal/.in`): in-app
  scroll fade+rise (reduced-motion safe), applied to Year in Review.
- **Deploy:** apply migration 0015, then push the frontend (client reads
  `is_premium` — degrade is safe since a missing column just reads false via the
  mapper default, but apply it to actually gate). No new secret.
- **Year in Review** (`/year-in-review`, `src/pages/YearInReview.tsx`, NOT in
  `NAV_PATHS`): a shareable end-of-year recap **aggregated across ALL the user's
  buddies** for a calendar year (JourneyBook is per-pair; this is the whole year).
  `buildYearReview()` + `availableReviewYears()` in `utils/journey.ts`; store
  selectors `yearReview(year)` + `reviewYears()`. Stats: days on journey,
  milestones, messages, buddies, photos, **tough weeks overcome** (distinct weeks
  with a rough side-effect check-in), **strongest month**, biggest milestone, and
  a **favourite encouragement** (the most-reacted message you received, no name).
  **Deliberately FREE + viral** (free users sharing "My GLP Journey 2026" is the
  growth loop) — the shareable card (`shareYearReview`) is free; **Premium is a
  card upgrade**: `includeQuote` (= `isPremium`) adds the favourite-encouragement
  line, and the page cross-sells the Journey Book keepsake. Entry: a `.yir-entry`
  card on BuddyHome (shown when `reviewYears().length > 0`). No schema — pure/derived.

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
- **Check-in streaks** (BuddyHome, top card, pure/derived — no schema):
  `currentStreak(userId)` in `AppStore.tsx` walks backwards day-by-day over
  `state.checkins` counting consecutive days with a check-in; today not yet
  logged doesn't break the streak (grace until the day is actually missed).
  Shown as a `.ms-badge` + "N-day check-in streak" line, only when `> 0`.
- **Shared buddy goals/challenges** (migration **0020** `goals`; BuddyHome
  "SHARED GOALS" card per relationship, between the Journey Book teaser and
  Recent milestones): a buddy pair sets a joint target (e.g. "log 5 meals this
  week") via `GoalSheet.tsx` (`createGoal`) and either buddy taps **"+1"**
  (`incrementGoal`) to tally shared progress on the same goal — reuses the
  existing `.progress` bar CSS. **Visible to both members**, unlike
  checkins/meals/weight_logs (per-user RLS) — `goals` RLS is
  `is_relationship_member`-scoped instead. Progress only moves through the
  **atomic `increment_goal_progress` RPC** (no client UPDATE grant on the
  table), so two buddies tapping "+1" at once can't race into a lost update;
  the RPC also stamps `completed_at` and a trigger notifies both buddies
  (`'goal_reached'`, already an existing `NotificationType`) when the target is
  reached. Realtime via `api.goals.subscribeAll` mirrors the checkins pattern
  (global subscription, RLS scopes delivery). `hydrate` fetches goals per
  active relationship in its own try/catch (same degrade-gracefully rule as
  checkins/meals/weight_logs — an unapplied 0020 must not brick the load).
  Deploy: apply migration 0020 (paste into the SQL Editor, idempotent) before
  shipping the frontend.
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
- **Food log / meal photo estimate** (migrations 0018 `meals` + **0019** macros;
  page `src/pages/MealLog.tsx`, route `/meals`, entry card on BuddyHome; **never
  medical/nutritional advice**): user photographs a meal → the
  `supabase/functions/analyze-food` edge function (Claude **vision**, reuses the
  same `ANTHROPIC_API_KEY` as the Coach, `MODEL`/`FOOD_MODEL` default
  `claude-opus-4-8`, **verify_jwt ON**) returns strict JSON with **full macros +
  per-item grams**: `{title, calories, calories_low/high, protein_g, carbs_g,
  fat_g, fiber_g, confidence, items:[{name, grams, calories, protein_g, carbs_g,
  fat_g}]}`. The prompt tells it to estimate **grams per item** using visual scale
  and to fold in **hidden calories** (oil/butter/dressing). Totals are summed from
  the items (server + client) so they stay consistent when edited.
  - **Per-item grams = the accuracy mechanism** (replaced the old ½×/2× portion
    multiplier): the result card shows a gram stepper per item; editing grams
    linearly rescales that item's macros and the meal totals recompute live
    (`scaleItem` in MealLog). A **TODAY** card sums the day's logged meals
    (cal/protein/carbs/fat). Confidence + calorie range shown for honesty.
  - Migration **0019** (`0019_meal_macros.sql`) adds `carbs_g`/`fat_g`/`fiber_g`
    to `meals` (idempotent `add column if not exists`); the richer `items` shape
    (grams + carbs/fat) rides in the existing jsonb (no schema change). `MealItem`
    gains `grams/carbsG/fatG`; `Meal`/`AnalyzedMeal` gain `carbsG/fatG/fiberG`.
  - The function does NOT write to the DB (compute-only), strips code fences,
    clamps numbers, returns `{error:'no_food'}` for non-food photos, and handles
    `stop_reason==='refusal'`. The photo is a compressed JPEG data URL
    (`fileToChatImage`), size-capped (3MB) like chat/timeline images.
  - **Redeploy `analyze-food` + apply migration 0019 when shipping this** (both are
    additive; frontend degrades gracefully via hydrate try/catch + mapper `?? 0`
    defaults if 0019 isn't applied). Possible future accuracy upgrades (not built):
    barcode → Open Food Facts, verified-DB lookup, LiDAR depth, daily targets.
  - **Privacy:** `meals` is **own-data-only** RLS (NO buddy visibility, unlike
    checkins). Sharing a meal is an explicit, separate action that reuses the
    existing `addTimelinePhoto` (timeline) / `sendMessage` (chat) — copying the
    photo + a caption into the already-RLS-scoped timeline/message. Nothing in
    `meals` is exposed to anyone else.
  - Client↔store: `analyzeMeal` (demo mode returns a canned estimate),
    `saveMeal`/`deleteMeal`/`myMeals` in AppStore; `api.food.analyze` +
    `api.meals.{add,forUser,remove}`; `rowToMeal` mapper; hydrate fetches own
    meals in its own try/catch (degrade-gracefully rule — 0018 unapplied must not
    brick the load). `AppState.meals` + `mockData` builders seed `meals: []`.
  - **Deploy:** apply migration 0015, then `supabase functions deploy
    analyze-food` (no new secret — reuses `ANTHROPIC_API_KEY`). Reaches the store
    app only in the next native build.
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
  header (avatar+name+medication+caret) and **always starts collapsed on app
  entry** (no single-buddy auto-open — user wanted a calm home screen every time;
  a `visibilitychange` listener re-collapses all cards when the app returns to the
  foreground, so a card left open before backgrounding is closed on reopen);
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
- **Food log (meal photos):** apply migrations **0018** (`meals` table) **+ 0019**
  (macro columns), then `supabase functions deploy analyze-food` (**keep verify_jwt
  ON**). No new secret — reuses the Coach's `ANTHROPIC_API_KEY`. "Couldn't estimate
  that" = key not set, function not deployed, or no Anthropic credit (check Edge
  Function logs). Ship the migrations before the frontend (the `/meals` page calls
  the function + reads the table). NOTE: `supabase db push` may choke if earlier
  migrations were applied via the SQL Editor (history mismatch) — paste
  `0018_meals.sql` / `0019_meal_macros.sql` into the SQL Editor instead (both
  idempotent), or `supabase migration repair --status applied <n>` the already-run
  ones first.
- **Shared buddy goals:** apply migration **0020** (`goals` table + the
  `increment_goal_progress` RPC + `notify_on_goal_complete` trigger — paste
  `0020_goals.sql` into the SQL Editor, idempotent) before shipping the
  frontend (BuddyHome's "SHARED GOALS" card calls the RPC directly). No new
  secret or edge function.
- **Stripe billing (web Premium):** `supabase secrets set STRIPE_SECRET_KEY=sk_…
  STRIPE_PRICE_ID=price_… STRIPE_WEBHOOK_SECRET=whsec_…` then
  `supabase functions deploy create-checkout` (**keep verify_jwt ON**) and
  `supabase functions deploy stripe-webhook --no-verify-jwt`. In the Stripe
  Dashboard add a webhook endpoint → the `stripe-webhook` function URL,
  subscribed to `checkout.session.completed`, `customer.subscription.updated`,
  `customer.subscription.deleted`; paste its signing secret as
  `STRIPE_WEBHOOK_SECRET`. Optional `APP_URL` secret sets the success/cancel
  origin (defaults to the request origin, else glpenpal.com). No migration — uses
  the existing `is_premium` column. **Do NOT enable web purchase in the native
  build** — the client already hides it via `IS_NATIVE`; native Premium needs
  Apple/Google IAP (a later RevenueCat/StoreKit follow-up).
- **Deploy order for a release that touches both:** apply the DB migration
  first, THEN push the frontend to the Netlify branch — the frontend depends on
  the new RPCs (see migration 0010 notes). Ship them close together.
- Git: develop on the designated branch, then fast-forward and push
  `claude/glp-buddy-mvp-c0ante` (keep `main` in sync too). Do not create PRs
  unless asked.
- Wipe all data to test from scratch: `supabase/maintenance/reset_all_data.sql`
  (SQL Editor). Re-grant staff after: `update profiles set is_staff=true where id='…'`.
- **Native store builds (iOS/Android, Capacitor):** the `ios/`/`android/` shells
  are NOT committed — generate on a Mac with `npx cap add ios`. The web app is
  bundled at BUILD time, so env vars must be supplied locally (Netlify's dashboard
  doesn't reach the Mac): create `.env.production` with `VITE_BACKEND=supabase` +
  `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` BEFORE `npm run cap:ios`, or the
  store app ships in **demo mode with fake data** (the #1 gotcha). Every re-upload
  needs a higher Xcode **Build** number. Bundle id `com.glpenpal.app`; icon/splash
  source art in `resources/`. Full step-by-step in `APPLE-STORE-UPLOAD.md`.

## Pending for the NEXT App Store build (ship AFTER the current version is approved)
These 3 features are **already merged into `main` + the prod branch
`claude/glp-buddy-mvp-c0ante`** (commit `2051a08`) and live on the PWA — but are
**NOT** in the currently-in-review iOS binary. They ride into the next native
build (tested on the PWA first):
1. **Dark mode** (System/Light/Dark) — `src/lib/theme.ts`, `data-theme` on
   `<html>`, `:root[data-theme="dark"]` palette in `index.css`, anti-flash inline
   script in `index.html`, Profile → Appearance control. Pure frontend.
2. **Collapse-by-default on Home** — BuddyHome buddy cards always start collapsed
   (+ a `visibilitychange` re-collapse on foreground). Pure frontend.
3. **Food log** (meal photo → **full macros + per-item grams**) — migrations
   **0018** `meals` + **0019** macro columns + `analyze-food` edge function +
   `/meals` page + "Log a meal" Home card. Backend deploy required: apply 0018 +
   0019 (paste the `.sql` files into the SQL Editor — both idempotent) + `supabase
   functions deploy analyze-food` (reuses `ANTHROPIC_API_KEY`, verify_jwt ON).
   Frontend degrades gracefully if unapplied (hydrate try/catch + mapper `?? 0`).
Native rebuild to release (see `APPLE-STORE-UPLOAD.md`): set `.env.production` →
`npm run cap:ios` → bump the Xcode **Build** number → Archive → upload → submit as
a **NEW version** in App Store Connect.
- ✅ **Integration done (2026-07):** built on `claude/apple-store-upload-snyqvn`,
  then MERGED onto the advanced production (`aa27923` → `2051a08`; that base had
  Premium removed, Journey Book, Year in Review, weight logging, admin dashboard,
  bundle id `com.glpenpal.mobile.ios`). Our meals migration was renumbered
  **`0015 → 0018`** (prod already used 0015 premium / 0016 weight_logs / 0017
  admin). Pushed to BOTH `main` and `claude/glp-buddy-mvp-c0ante` (kept in sync),
  so whichever branch Netlify watches got it — redeploy "without cache" to serve.
- ⚠️ `APPLE-STORE-UPLOAD.md` still says the OLD `com.glpenpal.app` bundle id; the
  real one is **`com.glpenpal.mobile.ios`** (`capacitor.config.ts`). Reconcile that
  doc before the next native build.
- ⚠️ A separate `claude/dark-mode-option-k2p7lr` branch has a DUPLICATE dark-mode
  implementation; we shipped OURS (verified). Do NOT also merge that branch.

## Staff admin dashboard
- **`/moderation`** (`src/pages/Moderation.tsx`, staff-only via `Guard staff`,
  reached from a "Admin dashboard (staff)" row on Profile shown when
  `isStaff`). Full dashboard with tabs: **Overview** (stat cards + 30-day signups
  mini bar chart), **Users** (searchable list, staff/premium/onboarding badges),
  **Reports** (reporter→target + reason, "Mark resolved" toggle).
- **Data source depends on mode:** local/demo mode derives everything from the
  store `state` (so it's demoable/screenshot-testable); Supabase mode calls the
  **migration 0017** RPCs (`api.admin.*`). Those RPCs (`admin_overview`,
  `admin_signups_daily`, `admin_users`, `admin_reports`, `admin_resolve_report`)
  are **SECURITY DEFINER, gated on `is_staff()`, search_path=''** — required
  because the per-user RLS (0010) hides other users' profiles/messages from
  everyone, staff included, so a plain `select` returns nothing.
- **Grant staff:** `update profiles set is_staff=true where id='…'`, then refresh
  the app. Destructive actions (ban/delete) still go through the Supabase
  dashboard — the in-app admin is read + report-resolve only for now.

## Native app / App Store (Capacitor iOS + Android)
- **Native projects (`ios/`, `android/`) are generated on the user's Mac** with
  `npx cap add ios` / `add android`; they are **NOT committed** (local only) —
  that's fine, they aren't needed in git to submit. Regenerate with `cap add`.
- **Bundle ID: `com.glpenpal.mobile.ios`** (`capacitor.config.ts` `appId`; also
  in STORE-SETUP/STORE-LISTING). The original `com.glpenpal.app` was taken, so we
  moved to this. Keep all three in sync if it ever changes.
- **Apple account:** submitted under a **new Apple ID** (`steimberg.yuval1@gmail.com`),
  a **paid Individual** Developer team ("Yuval Steimberg (Individual)"). The App
  Store app **name is `GLPenPal`** (bundle id above). The old Apple ID was a free
  "Personal Team" — can't distribute; the paid enrollment is what unblocks Xcode
  signing + the developer portal.
- **iOS Info.plist camera/photo strings (MUST add after `cap add ios`, footgun):**
  the app attaches photos (chat/timeline/onboarding/profile), so `ios/App/App/Info.plist`
  needs `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`,
  `NSPhotoLibraryAddUsageDescription` or **iOS crashes on the photo button and
  Apple rejects**. `cap sync` does NOT add or overwrite these (they live only on
  the Mac's ios/ copy). The exact strings are in **STORE-SETUP.md §4**.
- **Screenshots:** `store-screenshots/shots.mjs` = iPhone 6.7" (1290×2796);
  **`store-screenshots/shots-ipad.mjs` = 13" iPad (2048×2732)** — iPad shots are
  **required** because the build supports iPad ("Designed for iPad"). Both drive a
  `vite preview` (port 4196) with an injected demo `AppState`; the iPad script
  uses a 1024×1366 @2x desktop viewport so the ≥980px sidebar layout renders.
- **Export compliance:** answer **"None of the algorithms mentioned above"**
  (HTTPS only = exempt) → no docs needed. Optional: set
  `ITSAppUsesNonExemptEncryption=false` in Info.plist to skip the prompt.
- **Release flow:** archive against **"Any iOS Device (arm64)"** (a stuck device
  list — e.g. an iPhone on a newer iOS than Xcode supports — hides it; **quitting
  Xcode with ⌘Q fixes it**). Create the App Store Connect record FIRST (as
  `GLPenPal`) so `Distribute → Upload` has a home (avoids "App Record Creation
  Error"). Reviewer: **provide a demo login** (app is sign-in-gated) — ideally an
  account pre-matched with a buddy so the 1:1 chat/timeline is reachable.

## Guide docs (repo root)
`GETTING-STARTED-PWA.md` (go-live + install + smoke test),
`APPLE-STORE-UPLOAD.md` (**full Apple App Store guide** — build → upload →
listing copy + privacy + reviewer notes, all inlined; `STORE-LISTING.md` was
folded into it and deleted), `STORE-SETUP.md` (short iOS+Android build notes),
`ACTIVATE-OPTIONAL.md` (push/SMTP/analytics/Sentry), `PRODUCTION.md`,
`GO_LIVE.md`.
