# Activate optional features in production

All code is already shipped. These steps only touch your dashboards.
Netlify env vars are added at: **Netlify → `buddyglp` site → Site configuration
→ Environment variables → Add a variable**, then **Deploys → Trigger deploy**.

---

## 4) Error tracking — Sentry (~3 min)
1. Go to **sentry.io** → sign up / log in.
2. **Create project** → platform **React** → name it `glpenpal`.
3. Copy the **DSN** (looks like `https://abc123@o000.ingest.sentry.io/123`).
4. Netlify → add env var:
   - Key: `VITE_SENTRY_DSN`
   - Value: *(your DSN)*
5. **Trigger deploy.** Errors now report to Sentry automatically.

---

## 5) Analytics — Plausible (~3 min)
1. Go to **plausible.io** → sign up (free trial).
2. **Add a website** → domain: `glpenpal.com`.
3. Netlify → add env var:
   - Key: `VITE_PLAUSIBLE_DOMAIN`
   - Value: `glpenpal.com`
4. **Trigger deploy.** Visit the site → you should see live visitors in Plausible.

---

## 7) Real confirmation emails — Resend SMTP (~15 min)
*(Only needed if you turn "Confirm email" back ON.)*
1. **resend.com** → sign up.
2. **Domains → Add Domain** → `glpenpal.com` → add the SPF/DKIM DNS records it
   shows you at **Porkbun** → wait for **Verified**.
3. **API Keys → Create API Key** → copy it.
4. Supabase → **Project Settings → Authentication → SMTP Settings → Enable custom SMTP:**
   - Host: `smtp.resend.com`
   - Port: `465`
   - Username: `resend`
   - Password: *(your Resend API key)*
   - Sender email: `noreply@glpenpal.com`
   - Sender name: `GLPenPal`
5. Supabase → **Authentication → URL Configuration → Site URL** = `https://glpenpal.com`
6. Supabase → **Authentication → Email** → turn **Confirm email ON**.
7. Test: sign up with a real email → confirmation email arrives → link logs you in.

---

## 6) Push notifications (~30 min)
Needs the Supabase CLI on your computer (Node 18+).

### Your VAPID keys (already generated)
```
PUBLIC:  BLsh8hXytqT0mV04taRsmwsZXkleBguHzsfog0de_k0xuQDe8W5v1dmhlTrgJneEoTdUJprQIc9-frZjn84eo6w
PRIVATE: <kept out of git — see the chat message where these were generated>
```
Keep PRIVATE secret — it only goes into Supabase secrets, never Netlify/client/git.

### Steps
1. **Netlify** → add env var:
   - Key: `VITE_VAPID_PUBLIC_KEY`
   - Value: `BLsh8hXytqT0mV04taRsmwsZXkleBguHzsfog0de_k0xuQDe8W5v1dmhlTrgJneEoTdUJprQIc9-frZjn84eo6w`
   - **Trigger deploy.**
2. **On your computer** (terminal):
   ```bash
   npm install -g supabase
   supabase login
   supabase link --project-ref nrigknrqdxhbzzmzbevu
   supabase secrets set \
     VAPID_PUBLIC_KEY=BLsh8hXytqT0mV04taRsmwsZXkleBguHzsfog0de_k0xuQDe8W5v1dmhlTrgJneEoTdUJprQIc9-frZjn84eo6w \
     VAPID_PRIVATE_KEY=<your private key from chat> \
     VAPID_SUBJECT=mailto:support@glpenpal.com
   supabase functions deploy send-push --no-verify-jwt
   ```
3. **Supabase → Database → Webhooks → Create a new hook:**
   - Name: `send-push`
   - Table: `public.notifications`
   - Events: **Insert**
   - Type: **Supabase Edge Functions** → choose `send-push`
   - Save.
4. In the app: **Profile → Enable push notifications** → allow.
   - **iPhone only:** first **Share → Add to Home Screen**, then open it from the
     home-screen icon (web push needs an installed PWA on iOS 16.4+).
5. Test: have your buddy send a message → your phone gets a notification.

---

### Recap of env vars on the `buddyglp` Netlify site
| Key | Value |
|-----|-------|
| `VITE_SENTRY_DSN` | your Sentry DSN |
| `VITE_PLAUSIBLE_DOMAIN` | `glpenpal.com` |
| `VITE_VAPID_PUBLIC_KEY` | the PUBLIC VAPID key above |

(Plus the ones already set: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_BACKEND=supabase`.)
