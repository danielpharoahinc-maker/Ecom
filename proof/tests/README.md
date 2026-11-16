# Proof browser tests

Playwright scripts that drive the real app on an emulated phone. Run from this folder:

    python3 -m http.server 8765 --directory ..   # serve the app
    npm i playwright axe-core                      # once
    node regress.js                                # meals, haptics, sheets, undo, buddy
    node flow4.js / flow3.js / clubfix.js          # onboarding, returning sign-in, invites, clubs
    node touch3.js                                 # real touch events: sheet dismissal
    node a11y.js / a11y2.js                        # axe-core accessibility on every screen
    node resil.js                                  # server down / slow / failing
    node autoreview.js / connect.js / notion.js    # Claude review, API keys, Notion log
    node ach.js / origin.js / sweep.js             # achievements + skins, tap-origin animation, every screen

`lib.js` launches the app in local test mode with a seeded account. Some scripts read
`axe/package/axe.min.js` (npm pack axe-core) next to them.
