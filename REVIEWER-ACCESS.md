# GLPenPal — reviewer / demo access (Play Console "App access")

The app is **sign-in gated**, so Google's reviewer needs a working login that
lands on real content (Chat, Timeline, Matches). This is the single most common
reason health apps get a "we couldn't access your app" rejection — so set it up
properly.

## Step 1 — create TWO accounts in the LIVE app (so a real match exists)
The 1:1 features only show once two people are mutually matched. Create both on
the production app (glpenpal.com or your build):

1. **Reviewer account** — the one you'll hand to Google:
   - Email: `reviewer@glpenpal.com` *(or any inbox you control)*
   - Password: pick a simple, stable one — **[YOU FILL]**
   - Complete onboarding (medication, stage, goals) and accept safety.
2. **Buddy account** — a second account to be the reviewer's pen pal:
   - Email: `demo-buddy@glpenpal.com` *(or any second inbox)*
   - Complete onboarding with **similar** medication/stage so they match.
3. **Match them:** from each account, open **Matches** and send interest to the
   other, so a mutual match opens the private space. Then **send a few chat
   messages and log a milestone** from both sides, so Chat + Timeline aren't empty.

> Keep this reviewer account active and matched — don't delete the buddy, or the
> reviewer will see an empty app.

## Step 2 — fill the "App access" form (Policy → App content → App access)
- Choose: **All or some functionality is restricted**.
- Add one instruction set:
  - **Name:** `Full app access (demo)`
  - **Username:** `reviewer@glpenpal.com`  *(the reviewer account email)*
  - **Password:** `[YOU FILL]`
  - **Any other instructions:** paste the block below.

### Paste into "Any other instructions"
```
Sign in on the first screen with the email and password above (the app is
sign-in gated). This account has already completed onboarding and is mutually
matched with a pen pal, so all core features are reachable from the bottom
navigation:

• Home – buddy card, check-in streak, milestones
• Chat – an active 1:1 conversation with the matched buddy
• Timeline – shared milestones and photos
• Matches – swipe deck of other potential buddies

No email verification or payment is required. GLPenPal is a peer-support app and
explicitly provides no medical advice.
```

## Notes
- If you use `+` aliases (e.g. `yuvalste13+reviewer@gmail.com`) they still work
  and land in your inbox — handy for creating two accounts on one mailbox.
- Do **not** put a real personal password here; use a throwaway you don't reuse.
- The account must stay valid through the review; if you rotate the password,
  update this form too.
