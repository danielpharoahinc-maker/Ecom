# Proof

Lock in. Post proof. Every day. Three commitments, a photo and a few words
each, and a club of friends who see it.

An installable web app (PWA): plain HTML, CSS and JavaScript, no build step.

## Run it
```
cd proof
python3 -m http.server 8000
# open http://localhost:8000
```
Camera and mic need `https://` or `localhost`. To try it on your phone,
deploy the `proof` folder (Netlify drag-and-drop works), open it in Safari,
then Share > Add to Home Screen.

## How it's organised
| File | What it does |
|---|---|
| `js/app.js` | Start-up, routing, the bottom tab bar |
| `js/welcome.js` | Sign-in screen: Apple, Google, Microsoft, email |
| `js/onboarding.js` | Set-up questions with the head-start progress bar |
| `js/data.js` | The commitments list and onboarding questions. **Edit this to change choices** |
| `js/capture.js` | The + button: camera, voice recording, posting |
| `js/today.js` | Today tab: the widgets |
| `js/vault.js` | Vault tab: every past proof, plus the 30-day recap |
| `js/statsview.js` | Stats tab: charts |
| `js/stats.js` | The maths behind streaks and stats |
| `js/club.js` | Club tab: create, invite, join |
| `js/state.js`, `js/db.js` | Saving to the phone (IndexedDB) |
| `js/auth.js`, `js/config.js` | Sign-in; server settings |
| `supabase/schema.sql`, `docs/BACKEND.md` | The server, for live clubs |

## Tabs
Vault | Stats | **+** | Today | Club. The app opens on Today.

## Widgets
Inside the app, the Today screen is built from widgets: last proof with its
photo and voice note, today's progress, streak, one widget per commitment
(tap one and the camera opens already set to it), Snap/Talk, and your club.

On Android, long-pressing the installed icon gives **Snap proof** and
**Talk proof** shortcuts. True home-screen widgets on iPhone need the native
App Store version (WidgetKit). That's phase 2: wrap this app with Capacitor
and add a widget extension, once people are using it.

## Status
- Works now, in local mode: sign-in, onboarding, camera, voice notes with live
  captions (where the browser supports them), widgets, vault, recap, stats,
  creating clubs, invite codes and links, offline support.
- Needs the server (docs/BACKEND.md): real Apple/Google/Microsoft accounts,
  seeing friends' proof in clubs, reminders, backup across phones.
