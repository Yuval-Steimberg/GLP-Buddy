# GLPenPal — User-Generated Content safety (Apple Guideline 1.2 / Google UGC)

Prepared in case App Review (or Google) asks how GLPenPal handles user safety.
The app already implements all four required mechanisms. Below is a ready-to-paste
statement plus where each feature lives in the app.

---

## Ready-to-paste App Review reply (Guideline 1.2)
> GLPenPal is a **private, 1:1 peer-support** app. Users are only connected after
> a **mutual match** — there is no public feed, no follower counts, and no way to
> broadcast content to strangers. All content is visible only to a user's matched
> buddy (or trio co-members), enforced by row-level security on the backend.
>
> The app implements all required user-safety mechanisms:
>
> 1. **Report content/users** — every conversation has a menu with "Report",
>    offering reasons (inappropriate messages, medical/dosing advice, harassment,
>    spam, other). Reports are recorded and surfaced to our moderation dashboard.
> 2. **Block users** — the same menu has "Block", which immediately ends the
>    connection, removes the person from the app, and permanently prevents any
>    re-match or further contact.
> 3. **Moderation of user-generated content** — a staff moderation dashboard
>    lists all reports (reporter → target + reason) with a resolve action; we
>    remove content and suspend or ban accounts that violate our terms. Our
>    Terms of Service state a **zero-tolerance policy for objectionable content
>    and abusive users**.
> 4. **Published contact + policies** — a Privacy Policy
>    (https://glpenpal.com/privacy) and Terms of Service
>    (https://glpenpal.com/terms) are linked in-app, and support is reachable at
>    yuvalste13@gmail.com.
>
> Users must confirm they are **18 or older** and accept the safety terms during
> onboarding before any messaging is possible.

---

## Where each feature lives (for your reference)
| Requirement | In the app | Code |
|---|---|---|
| **Report** users/content | Chat → ⋯ menu → **Report** (reason sheet) | `src/pages/Chat.tsx` → `reportUser` → `api.safety.report` |
| **Block** abusive users | Chat → ⋯ menu → **Block** (ends connection, no re-match) | `blockUser` in `AppStore.tsx`; `discover_candidates` excludes blocked both ways |
| **Moderation** of UGC | Staff dashboard `/moderation` → Reports tab (resolve) | `src/pages/Moderation.tsx`; migration 0017 admin RPCs |
| **Filter / limit exposure** | Private 1:1 only — content never public; RLS-scoped | migration 0010 security model |
| **Privacy policy** | In-app + `glpenpal.com/privacy` | `src/pages/legal/Privacy.tsx` |
| **Terms / EULA** (zero-tolerance) | In-app + `glpenpal.com/terms` | `src/pages/legal/Terms.tsx` |
| **18+ gate + safety accept** | Onboarding → Safety screen (must accept) | `src/pages/Safety.tsx`; `accept_safety` RPC |

## Key mitigating point to lead with
GLPenPal is **not a public social network** — it's private 1:1 messaging between
mutually-matched adults, RLS-enforced so no content is ever broadcast. That
context, plus report + block + moderation + a zero-tolerance EULA, is exactly
what Guideline 1.2 asks for.

## Recent hardening (2026-07, in this build)
- Terms of Service now states an explicit **zero-tolerance for objectionable
  content and abusive users** with a stated review target (24h) and permanent-ban
  language (`Terms.tsx`).
- The in-app Report sheet copy was corrected to state reports go to the safety
  team and are reviewed (removed a stale "placeholder for MVP" line that
  understated the real reporting flow) (`Chat.tsx`).

## If Apple pushes further (optional future additions — not currently required)
- Automated image/text screening on upload (e.g. a moderation API) before a
  photo/message is delivered.
- An in-app "objectionable content" filter list.
- A visible SLA / in-app confirmation after a report is filed.
These are **not** required for a private 1:1 app with report+block+moderation,
but are the natural next steps if a reviewer asks for pre-publication filtering.
