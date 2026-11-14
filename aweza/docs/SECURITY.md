# Security notes (audit of 14 November 2026)

No website can be promised "unhackable". This is what protects AWEZA, what was fixed, and what only you can do.

## How an order is protected
- **Prices are set on the server only.** The browser can claim any price; the payment function re-prices every order from `data/products.js` and tells Yoco the amount.
- **Payments are confirmed by Yoco, not by the browser.** The webhook only accepts messages signed by Yoco (HMAC-SHA256 with your `YOCO_WEBHOOK_SECRET`, checked in constant time, rejected if older than 3 minutes) and re-checks the amount before creating the Printify order. Forged, altered and replayed messages are all rejected (tested).
- **Card details never touch the site.** Customers pay on Yoco's own page. The checkout function only ever sends customers to a `yoco.com` address.
- **Order tracking needs the order number and the email.** Wrong guesses all get the same answer; there is a per-visitor limit.
- **Secrets live only in Netlify environment variables** (`YOCO_SECRET_KEY`, `YOCO_WEBHOOK_SECRET`, `PRINTIFY_API_TOKEN`). None are in the code or its git history (scanned 14 Nov 2026).

## Fixed in this audit
- **Your wholesale costs were publicly downloadable** (`/data/printify-variants.json`, with Printify product ids). It is now blocked, along with `netlify.toml`, `package.json`, `README.md`, `.git` and `.env*`. (The server functions still read it from their own bundle.)
- **Content Security Policy:** only the site's own code can run; scripts from anywhere else, inline scripts, other sites' frames and data going to other sites are blocked. Tested: an injected script, image, request and frame were all blocked while the whole shop still works.
- **Other headers:** HTTPS-only (HSTS), no framing by other sites, no content sniffing, tighter browser permissions, same-origin isolation.
- **Rate limits** on checkout (20 per 10 minutes per visitor) and tracking (12), best effort.
- **The cart stored in the browser is treated as untrusted:** unknown tees, sizes and quantities are dropped or clamped, so a tampered cart cannot inject anything.
- **The payment redirect is pinned to Yoco** on both the server and the browser.
- Tracking links must be `https`.

## What only you can do (this is where most real break-ins happen)
1. **Turn on two-step login (2FA) everywhere:** GitHub, Netlify, Yoco, Printify, your domain registrar, your email, Higgsfield. A stolen password with no 2FA is the most likely way in.
2. **Lock the domain** at the registrar (transfer lock on) and use a strong, unique password.
3. **Use Yoco test keys first**, then live keys. Keep the live key only in Netlify. If a key may have leaked, roll it in the Yoco dashboard straight away.
4. **Rotate the Printify API token** when this build is finished: it was used by the AI session that built the site. Create a new token in Printify (Account, Connections), put it in Netlify, delete the old one.
5. **Set `SITE_URL`** in Netlify to your real address once you have a domain.
6. **GitHub:** turn on secret scanning and branch protection, and keep the repository private.
7. **Watch for trouble:** check Netlify function logs and the Yoco dashboard now and then; Yoco can alert you to odd payments.
8. **Keep `vendor/three.min.js` (version r149) up to date** now and then; it is the only third-party code the site runs.
9. **If customer data is ever exposed**, South African law (POPIA) requires you to report it to the Information Regulator and the people affected. See the privacy page placeholders in `docs/OWNER-TODO.md`.

## Known limits
- The rate limits and the referral codes are only a speed bump (no shared database): the real guards are signatures, email matching and server-side pricing.
- Anyone can type any friend code and get the R50 (no customer database to check against).
- Attacks on Netlify, Yoco, Printify or the registrar themselves are outside what this code can stop: that is what 2FA is for.
