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
