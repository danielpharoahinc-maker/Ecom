# Switching on real accounts and live clubs

Right now Proof runs in **local mode**: everything is saved on the phone. That
is enough to use it yourself and test it with a few friends on their own
phones. Clubs need a server so friends can see each other's proof. This guide
switches that on.

**You're under 18, so a parent must own these accounts** (Apple Developer,
Google Cloud, Microsoft Azure, Supabase billing). Do this together.

## Privacy: what the database enforces
- Signed-out visitors can read and write nothing.
- Your profile, onboarding answers and daily plans: only you.
- Your proof: you and people in a club with you. Nobody else.
- Club mates see your first name only, never your email or answers.
- Photos and voice notes sit in a private bucket with expiring links.
- Pro and the free-post count can only be changed by the server.
- Anyone can delete their account and everything in it.

`supabase/test/privacy.test.mjs` checks all of this (29 checks). Run it
after any change to `schema.sql`.

## 1. Supabase (database, login, file storage). Free to start.
1. Create a project at supabase.com.
2. SQL Editor: paste `supabase/schema.sql` and run it.
3. Project Settings > API: copy the **Project URL** and the **anon public key**
   into `js/config.js`. Never use the `service_role` key in the app.
4. Authentication > URL Configuration: add your site URL (for example
   `https://proof.netlify.app`) to Site URL and Redirect URLs.

## 2. Sign-in providers (Authentication > Providers in Supabase)
| Button | Supabase provider | What you need | Cost |
|---|---|---|---|
| Continue with Apple | Apple | Apple Developer account: a Services ID, a key, Team ID | $99/year |
| Continue with Google | Google | Google Cloud OAuth client (web) | Free |
| Continue with Microsoft | Azure | Microsoft Entra app registration | Free |
| Continue with email | Email | Nothing. Uses magic links | Free |

Each provider's page in the Supabase dashboard links to its own step-by-step
setup. Start with **Google and email** (free). Add Apple once the App Store
version is in progress, because Apple requires an Apple sign-in option in any
iOS app that offers Google sign-in.

## 2a. Email sign-in with a 6-digit code (free, do this first)
The app is already built for this: people type their email, get a 6-digit
code, type it in, and they're in. New emails get an account automatically.

1. In Supabase: Authentication > Providers > **Email**: make sure it's on.
   Turn **Confirm email** on.
2. Authentication > Email Templates > **Magic Link**. Replace the body with:
   ```
   <h2>Your Proof code</h2>
   <p>Enter this code in Proof to sign in:</p>
   <p style="font-size:28px;font-weight:700;letter-spacing:6px">{{ .Token }}</p>
   <p>It expires in 1 hour. If you didn't ask for it, ignore this email.</p>
   ```
   Do the same for the **Confirm signup** template (first-time users get that one).
   Subject for both: `Your Proof code`.
3. **Before real users:** Supabase's built-in email sender only allows a few
   emails per hour, which is fine for testing but not for launch. Create a free
   Resend account (resend.com, 3,000 emails a month free), verify your domain,
   then in Supabase: Project Settings > Authentication > SMTP Settings, paste
   Resend's SMTP details. Sender name: Proof.
4. Paste the Project URL and anon key into `js/config.js` and redeploy.

Test: open your Netlify link, tap Continue with email, enter your address,
type the code from the email. You land on onboarding.

## 2c. Payments with Paystack (do this with a parent)
Proof Pro is R49/month or R399/year. People pay on Paystack's secure page;
card details never touch Proof. Only the server can switch Pro on, and only
after Paystack confirms a real payment.

1. **Paystack account** (paystack.com) in a parent's name, with the business
   or personal details and the bank account for payouts. Start in **Test mode**.
2. **Plans:** Paystack > Products > Plans > Create plan, twice:
   - "Proof Pro Monthly", R49, interval Monthly. Copy its plan code (PLN_...).
   - "Proof Pro Yearly", R399, interval Annually. Copy its plan code.
3. **Server functions:** install the Supabase CLI on a computer, then from the
   `proof` folder:
   ```
   supabase login
   supabase link --project-ref YOUR-PROJECT-REF
   supabase functions deploy create-checkout
   supabase functions deploy paystack-webhook --no-verify-jwt
   supabase secrets set PAYSTACK_SECRET_KEY=sk_test_... \
     PAYSTACK_PLAN_MONTHLY=PLN_... PAYSTACK_PLAN_YEARLY=PLN_... \
     APP_URL=https://your-site.netlify.app/
   ```
   The secret key goes ONLY into Supabase secrets. Never into the app, never
   into GitHub, never into a chat.
4. **Webhook:** Paystack > Settings > API Keys & Webhooks > Test Webhook URL:
   `https://YOUR-PROJECT-REF.supabase.co/functions/v1/paystack-webhook`
5. **Test it** with Paystack's test card (on their "Test payments" docs page):
   pay for Monthly, land back in Proof, and Account should say Proof Pro.
6. **Go live:** switch Paystack to Live mode, repeat steps 2 to 4 with the live
   secret key, live plan codes and the Live Webhook URL.

How Pro is decided: `profiles.pro_until`. Each confirmed payment extends it
(31 days monthly, 366 yearly). Cancelled or failed renewals need no action:
Pro ends when the paid time runs out. `supabase/test/webhook.test.mjs` checks
forged, duplicate, underpaid and renewal payments.

Later, on the App Store: Apple requires its own in-app purchase for digital
subscriptions sold inside an iPhone app. The web version can keep Paystack.

## 2b. Sign in with Apple, step by step (do this with a parent)
What the person sees: on an iPhone, iPad or Mac, tapping **Continue with
Apple** shows Apple's sheet and confirms with **Face ID or Touch ID**. They
can share their real email or "Hide My Email". On Android or Windows, Apple
asks for the Apple ID password and a code instead. Proof never sees the
password.

Before you start you need a real web address (for example the Netlify
site), because Apple only sends people back to a domain you own. The
claude.ai test link can't do this.

1. **Enrol** in the Apple Developer Program (developer.apple.com). It costs
   $99/year and must be in an adult's name.
2. **App ID:** Certificates, Identifiers & Profiles > Identifiers > + >
   App IDs. Name it "Proof", give it a bundle ID such as `com.yourname.proof`,
   and tick **Sign in with Apple**.
3. **Services ID** (this is the web login): Identifiers > + > Services IDs.
   Identifier: `com.yourname.proof.web`. Tick Sign in with Apple, then Configure:
   - Primary App ID: the one from step 2
   - Domains: `YOUR-PROJECT.supabase.co`
   - Return URL: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`
4. **Key:** Keys > + > tick Sign in with Apple > Configure with the App ID.
   Download the `.p8` file (you only get one download) and note the **Key ID**.
   Your **Team ID** is at the top right of the developer site.
5. **Supabase:** Authentication > Providers > Apple. Turn it on. Client ID =
   the Services ID from step 3. For the secret, use Supabase's Apple secret
   generator with your Team ID, Key ID and `.p8` file.
   **The secret expires every 6 months.** Put a reminder in the calendar to
   regenerate it, or Apple sign-in stops working.
6. **Supabase:** Authentication > URL Configuration. Site URL = your Netlify
   address. Add it to Redirect URLs too.
7. Paste the Supabase URL and anon key into `js/config.js` and redeploy.

Test it on an iPhone in Safari: Continue with Apple should show the Face ID
sheet, then land back in Proof on the onboarding screen.

## 3. What still has to be wired in code
The sign-in buttons already call Supabase when `config.js` is filled in. The
data layer (`js/state.js`) still writes only to the phone. The next build step
is a sync module that:
- uploads photos and voice notes to the `proof-media` bucket at
  `<user id>/<file>`,
- writes rows to `proofs`, `profiles`, `clubs`,
- calls `join_club(code)` when someone joins with a code,
- loads club mates' proof for the Club tab.

That's about one focused session of work. Build it once 10+ people are
actually using local mode.


## 4. Status and going live (latest)

Applied to the project: `supabase/reminders.sql`, then `supabase/migration-2.sql` (both safe to re-run).
Functions deployed: `create-checkout`, `manage-subscription` (JWT on), `paystack-webhook`, `push` (JWT off, they check their own keys/signatures).

To start charging (do with a parent, Paystack business account):
1. Paystack: create two plans in ZAR, R49 monthly and R399 yearly.
2. Supabase > Edge Functions > Secrets: `PAYSTACK_SECRET_KEY`, `PAYSTACK_PLAN_MONTHLY`, `PAYSTACK_PLAN_YEARLY`, `APP_URL` (your site address). Never paste these in chat.
3. Paystack > Settings > Webhooks: `https://kfnetfsyvhyysjjhpwue.supabase.co/functions/v1/paystack-webhook`.
4. SQL editor: `update app_settings set require_card = true;`
5. In `js/config.js` set `PAYMENTS_LIVE = true`, bump `VERSION` in `sw.js`, redeploy.
6. Publish Terms and Privacy pages before the first real charge.

Sign-in on iPhone home-screen apps: add custom SMTP (Authentication > Emails) so the email carries the 6-digit code.
