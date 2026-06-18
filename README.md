# 🫂 GLP Buddy

**A GLP buddy who gets it.**

GLP Buddy is a mobile-first peer-support web app that matches people using
GLP-1 medications (Ozempic, Wegovy, Mounjaro, Zepbound, Saxenda, and similar)
with a long-term buddy going through a similar journey.

It is a **friendship, accountability and peer-support platform — not a medical
advice app, calorie tracker, diet app, or a replacement for a doctor.**

> GLP Buddy helps people using GLP medications build meaningful long-term
> peer-support relationships with people who understand their journey.

---

## ✨ What's in the MVP

This is a fully working front-end MVP. All data is mocked client-side and
persisted to `localStorage`, so the entire flow is demoable without a backend.

| Area | Highlights |
| --- | --- |
| **Landing** | App name, tagline, description, "Find my buddy" CTA |
| **Onboarding** | 6-step flow collecting all GLP + personal/bio fields |
| **Safety** | Required medical-advice disclaimer before continuing |
| **Matching** | Ranked profile cards with compatibility highlights, connect / pass |
| **Mutual approval** | A buddy space opens **only when both users approve** |
| **Pending** | "Waiting on them" + "Needs your decision" |
| **Buddy home** | Days connected, journey stage, recent milestones, buddy levels, quick actions |
| **Private chat** | Text, timestamps, reactions, report / block, no-dosing reminder |
| **Milestones** | Preset + custom; posts to timeline + notifies buddy |
| **Shared timeline** | Milestones, comments, reactions, moments, monthly reflections, level unlocks |
| **Notifications** | New match, approved you, match created, message, milestone, goal, reflection, trio unlocked |
| **Retention** | Days-connected counter, buddy levels (first week → goal reached together) |
| **Buddy limit** | Up to 3 active buddies, enforced |
| **Buddy Trio** | Locked → eligibility checklist → create (invite 2) → group chat + shared milestones |
| **Rematching** | End respectfully with a reason, then return to suggestions |
| **Trust & safety** | Report, block, medical-advice warnings, moderation placeholder |

### Navigation
Bottom nav: **Home · Matches · Timeline · Chat · Profile**

---

## 🧩 Data models

Defined in [`src/types.ts`](src/types.ts): Users, Profiles, Match suggestions,
Match approvals, Buddy relationships, Chat messages, Milestones, Timeline
events, Notifications, Reports/blocks, Buddy Trio groups, Buddy Trio messages.

State + all actions live in [`src/store/AppStore.tsx`](src/store/AppStore.tsx).

---

## ▶️ Demo flow

1. Sign up → complete onboarding → accept the safety disclaimer
2. See potential buddy matches with compatibility highlights
3. Approve a profile → the match becomes mutual (a buddy who already approved you
   matches instantly; a fresh request is auto-approved back after a few seconds to
   demonstrate the notification + match flow)
4. Buddy space opens → send a message → add a milestone
5. Buddy receives a notification → the shared timeline updates
6. Buddy Trio appears as a locked feature with an eligibility checklist
   (use **Simulate eligibility** on the Trio screen to preview the unlocked flow)

---

## 🛠️ Tech & scripts

React + TypeScript + Vite + React Router. No backend required.

```bash
npm install     # install dependencies
npm run dev      # start dev server (http://localhost:5173)
npm run build    # type-check + production build
npm run preview  # preview the production build
```

## 🚀 Production

The app runs in **local demo mode** by default (mock data, no accounts). It also
ships a full **Supabase backend** (auth, Postgres + row-level security, realtime,
web push), is an installable **PWA**, and includes Netlify deploy config, CI, and
legal/safety pages.

To go live, see **[PRODUCTION.md](PRODUCTION.md)** — it walks through creating the
Supabase project, running the migrations in `supabase/`, enabling push, and
deploying to Netlify. Set `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (see
`.env.example`) to switch from demo mode to the real backend.

```bash
node tests/smoke.mjs   # Playwright E2E smoke test of the core flow
```

> **Note:** GLP Buddy is for peer support only and does not provide medical
> advice. Users should never advise each other on dosing, medication changes,
> stopping medication, or urgent symptoms, and should contact a clinician for
> medical questions or concerning symptoms.
