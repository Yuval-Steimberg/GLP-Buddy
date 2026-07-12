# GLPenPal — App Store & Google Play listing copy

Everything you need to paste into App Store Connect and the Play Console.
Screenshots are ready in `store-screenshots/` (6.7" iPhone size, 1290×2796).

---

## Names & IDs
- **App name:** GLPenPal
- **Subtitle (Apple, 30 char max):** A pen pal for your GLP-1 journey
- **Bundle ID:** `com.glpenpal.mobile.ios`
- **Category:** Health & Fitness  (Secondary: Lifestyle)
- **Age rating:** 17+ (health/medical references; peer messaging)
- **Price:** Free

## Promotional text (Apple, 170 char — editable without review)
> Get matched 1:1 with someone on the same medication, stage, and goals. Real peer support for the wins, the rough side-effect weeks, and the days the scale makes no sense.

## Keywords (Apple, 100 char, comma-separated, no spaces)
```
GLP-1,Ozempic,Wegovy,Mounjaro,Zepbound,weight loss,semaglutide,support,accountability,buddy,health
```

## Short description (Google Play, 80 char max)
> 1:1 peer support for your GLP-1 journey — matched by medication, stage & goals.

---

## Full description (App Store & Play)

**You don't have to do GLP-1 alone.**

Starting a GLP-1 medication like Ozempic, Wegovy, Mounjaro, Zepbound, or Saxenda
can feel isolating. The nausea weeks are rough, progress isn't always linear, and
the people around you don't always get it. GLPenPal matches you 1:1 with a pen pal
who's on the same path.

**How it works**
- **Get matched, mutually.** We suggest people on the same medication, treatment
  stage, and goals as you. A private space only opens when you *both* say yes.
- **Check in your way.** Daily, a few times a week, or weekly — you set the pace.
- **Celebrate the milestones.** Log wins together and watch a shared timeline of
  how far you've come.
- **Grow the friendship.** Unlock Buddy Levels the longer you support each other,
  and Buddy Trios once you're an established member.

**Built for privacy and safety**
- Private 1:1 conversations. No public feeds, no follower counts.
- You choose what to share — a nickname is all you need.
- Report or block anyone, anytime.
- 18+ only.

**Peer support — not medical advice.** GLPenPal is a place to feel understood by
people who get it. It does not provide medical, dosing, or clinical guidance.
Always talk to a qualified healthcare professional about your treatment, and for
urgent symptoms contact a clinician or emergency services.

Find your pen pal today — it's free.

---

## Support & legal URLs
- **Marketing / support URL:** https://glpenpal.com
- **Support email:** yuvalste13@gmail.com
- **Privacy Policy URL:** https://glpenpal.com/privacy
- **Terms of Service URL:** https://glpenpal.com/terms

(Both `/privacy` and `/terms` are already live pages in the app.)

---

## Screenshots (attached in `store-screenshots/`)
Upload in this order — the first two matter most in search results:

| # | File | What it shows |
|---|------|---------------|
| 1 | `00-landing.png` | Hero — "You don't have to do GLP-1 alone" |
| 2 | `01-chat.png`     | Real 1:1 conversation with a pen pal |
| 3 | `04-matches.png`  | Compatibility-based matching |
| 4 | `02-home.png`     | Buddy home — streak, levels, milestones |
| 5 | `03-timeline.png` | Shared milestone timeline |
| 6 | `05-profile.png`  | Your profile |

**Sizes required by Apple:** 6.7" (1290×2796) is provided. App Store Connect will
accept just the 6.7" set and scale for other devices. For Google Play, phone
screenshots at this size are fine (min 2, max 8).

> Regenerate anytime: `node store-screenshots/shots.mjs` (runs against a local
> `vite preview` on port 4196 in demo mode).

---

## App Privacy — answers for Apple's "App Privacy" questionnaire

Fill this out in App Store Connect → App Privacy. Based on how the app actually
works (Supabase auth + Postgres; no ad SDKs, no third-party trackers):

**Data used to track you:** None.

**Data linked to you** (stored in your account):
- **Contact Info → Email address** — for account sign-in. *Not* used for tracking.
- **User Content → Other user content** — your profile (nickname, non-identifying
  health context like medication/stage/goals) and the messages you send to buddies.
- **Identifiers → User ID** — an internal account ID.

**Data not linked to you:**
- **Diagnostics → Crash data / Performance data** — *only if* you enable Sentry
  (`VITE_SENTRY_DSN`). If you don't ship Sentry, mark this as not collected.

**Data NOT collected:** Name, phone number, physical address, precise or coarse
location, contacts, browsing history, search history, purchases, financial info,
photos, audio, advertising data.

> Notes:
> - The app collects self-reported health *context* (medication, treatment stage,
>   weight range as broad buckets). Apple treats health data as **Sensitive** —
>   declare **Health & Fitness → Health** as *Data Linked to You*, used for **App
>   Functionality** only, not tracking.
> - No analytics are on by default. If you enable Plausible
>   (`VITE_PLAUSIBLE_DOMAIN`), it's cookieless and doesn't collect personal data,
>   but add **Usage Data → Product Interaction** (not linked, app functionality)
>   to be safe.

---

## Google Play — Data safety form (mirror of the above)
- **Data collected:** Email, User IDs, Messages/User content, Health info (self-reported).
- **Encrypted in transit:** Yes.
- **Users can request deletion:** Yes — in-app **Profile → Delete my account**
  permanently removes the account and all data.
- **Data shared with third parties:** No.

---

## Review notes (paste into "Notes for Reviewer")
> GLPenPal is a real native app (Capacitor) bundling a React web app that talks to
> a Supabase backend — not a remote-URL webview. It is peer-support only and shows
> clear, repeated disclaimers that it does not provide medical advice. To test:
> create an account with any email, complete the short onboarding, and you'll see
> match suggestions and can open a 1:1 chat. Account deletion is available in
> Profile. Demo credentials are not required.
>
> The app is completely free and contains NO in-app purchases, subscriptions, or
> paid content of any kind. Camera/photo access is used solely when the user
> chooses to attach a photo to a chat, timeline post, or profile.
