# Switching on real accounts and live clubs

Right now Proof runs in **local mode**: everything is saved on the phone. That
is enough to use it yourself and test it with a few friends on their own
phones. Clubs need a server so friends can see each other's proof. This guide
switches that on.

**You're under 18, so a parent must own these accounts** (Apple Developer,
Google Cloud, Microsoft Azure, Supabase billing). Do this together.

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
