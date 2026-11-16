# AWEZA: deploying payments and fulfilment

How the money flows:

1. The shopper fills in checkout. `js/pay.js` (`window.AW_PAY`) posts the order to `/.netlify/functions/create-checkout`.
2. **create-checkout** checks every line against `data/products.js` and `data/printify-variants.json`, re-prices the order on the server (browser totals are ignored), creates a Paystack hosted checkout, and sends back the Paystack payment page URL.
3. The shopper pays on Paystack's page and returns to `/#/checkout/success`, `/#/checkout/cancelled` or `/#/checkout/failed`.
4. Paystack calls **paystack-webhook** with `payment.succeeded`. The webhook checks Paystack's signature, rebuilds the order from the checkout metadata, checks the amount paid against a fresh server-side total, and creates the order in Printify. The success page alone never triggers fulfilment; only a signed webhook does.
5. By default the Printify order waits for **your approval** in Printify (Orders, then "Send to production"). Set `PRINTIFY_AUTO_SEND=true` to skip that step once you trust the flow.

Files: `netlify.toml`, `netlify/functions/create-checkout.mjs`, `netlify/functions/paystack-webhook.mjs`, `netlify/functions/_lib/*`, `scripts/sync-printify.mjs`, `js/pay.js`. Node 18 or newer, no npm packages.

---

## 1. Create the Netlify site

1. Push the repo to GitHub (the `aweza/` folder is the site root).
2. In Netlify: **Add new site, Import an existing project**, pick the repo.
3. **Base directory**: `aweza` (or empty if `aweza/` is the repo root). **Build command**: leave empty. **Publish directory**: `.` (relative to the base). `netlify.toml` already sets the functions folder, the esbuild bundler, and includes `data/**` in the functions.
4. Deploy. Check that `https://<your-site>/.netlify/functions/create-checkout` answers `{"error":"Method not allowed."}` in a browser (that is a GET; it proves the function is live).

## 2. Environment variables

Netlify: **Site configuration, Environment variables**. Mark the secret ones as secret. Redeploy after changing any of them.

| Variable | Required | Example | What it is |
|---|---|---|---|
| `PAYSTACK_SECRET_KEY` | yes | `sk_test_...` then `sk_live_...` | Paystack SECRET key (not the public pk_ key). Server only. Test key first. It also signs the webhook, so no separate webhook secret is needed. |
| `PRINTIFY_API_TOKEN` | yes | (long token) | Printify, My account, Connections, generate a token with orders write + products read. |
| `PRINTIFY_SHOP_ID` | recommended | `29483178` | The AWEZA shop. Defaults to 29483178 if unset. |
| `SITE_URL` | recommended | `https://aweza.co.za` | Used to build the Paystack return URLs and as an allowed origin. Falls back to the request's own origin. |
| `RESEND_API_KEY` | for emails | `re_...` | API key from resend.com (create it with "sending access"). Without it no emails are sent. |
| `MAIL_FROM` | for emails | `AWEZA <orders@your-domain.com>` | The sender. The domain must be verified in Resend (section 9). |
| `MAIL_REPLY_TO` | no | `hello@your-domain.com` | Where customers' replies go. |
| `PRINTIFY_WEBHOOK_SECRET` | for tracking emails | (printed once by the script in section 9) | Lets the site trust "shipped" and "delivered" messages from Printify. |
| `TRACK_SECRET` | no | any long random text | Signs the private tracking links in emails. Falls back to `PAYSTACK_SECRET_KEY`. |
| `PRINTIFY_NOTIFY_CUSTOMER` | no | `false` | Set `false` once our emails are confirmed working, so customers don't also get Printify's own shipping email. Default: Printify's email stays on. |
| `PRINTIFY_AUTO_SEND` | no | `true` | Only `true` turns it on. Sends paid **live** orders straight to production. Test-mode payments are never auto-sent. Leave unset for launch. |

Never put any of these in the repo or in `js/`.

## 3. Set the Paystack webhook

Paystack webhooks are set in the dashboard, not by API. Open **Settings, API Keys & Webhooks** and paste this as the **Test** webhook URL, and again as the **Live** webhook URL when you go live:

```
https://<your-site>/.netlify/functions/paystack-webhook
```

Paystack signs every event with your secret key (HMAC-SHA512, header `x-paystack-signature`), so there is nothing else to copy. Paystack retries failed deliveries for up to 72 hours (hourly after the first few tries).

## 4. Sync Printify variants

`data/printify-variants.json` maps each storefront product and size to a Printify variant. Re-run the sync whenever you add, remove or re-price a product in Printify:

```sh
cd aweza
export PRINTIFY_API_TOKEN=...        # never commit it
export PRINTIFY_SHOP_ID=29483178
node scripts/sync-printify.mjs --dry-run   # shows what would change
node scripts/sync-printify.mjs             # writes data/printify-variants.json
```

- Only **White**, **enabled** variants are kept.
- Printify titles are mostly generic ("Unisex Heavy Cotton Tee"), so products are matched by the `OVERRIDES` map at the top of the script (Printify product id to catalogue id), then by the existing file, then by title. When you add a new product, add its Printify id to `OVERRIDES` and its entry to `data/products.js`.
- Warnings tell you about storefront sizes with no Printify variant: those sizes are refused at checkout until fixed.
- `--out somefile.json` writes a preview elsewhere. Behind a corporate proxy run with `NODE_USE_ENV_PROXY=1`.
- Commit the updated JSON and redeploy; the functions read it at runtime.

## 5. Turn on payments in the site (integrator)

Add this line to `index.html` **after `data/products.js` and `js/core.js`, and before `js/boot.js`**:

```html
<script src="js/pay.js"></script>
```

The checkout (`js/cart.js`) calls `window.AW_PAY(order)` when it exists and otherwise shows "Payments are launching soon". `AW_PAY` redirects to Paystack on success and rejects with `Error(message)` that is safe to show inline. A second tap while a request is in flight reuses the first request.

## 6. Test mode checklist (use Paystack **test** keys)

1. Set `PAYSTACK_SECRET_KEY=sk_test_...`, set the test webhook URL, set `PRINTIFY_API_TOKEN`, leave `PRINTIFY_AUTO_SEND` unset. Redeploy.
2. Add two tees to the bag, one of them a 2XL (to check the size upcharge), go to checkout, fill the form, press Pay.
3. You land on Paystack's page with the right total (subtotal + R179 delivery, or free delivery at R2 000 and over). Pay with Paystack's test card (Paystack App, Checkout API integration, How to connect, Test card details).
4. You return to `/#/checkout/success` and the bag empties.
5. Netlify, Functions, `paystack-webhook` logs show `printify_order_created` with `"test":true`.
6. In Printify, Orders: a new order labelled `TEST-AW...`, on hold, with the right variants and address. **Delete or cancel it by hand**; do not send it to production.
7. Repeat and press Cancel on Paystack's page: you land on `/#/checkout/cancelled`, no Printify order.
8. Optional: try a wrong postal code (3 digits) and confirm the checkout shows the error inline.
9. Paystack does not accept payments under R2.00.

## 7. Going live

1. In the Paystack App, Checkout API integration, How to connect, **Verified Domains**: add your site's domain and wait for approval. Live keys stay locked until a domain is verified.
2. Replace `PAYSTACK_SECRET_KEY` with the live key. Set the live webhook URL in the Paystack dashboard. Set `SITE_URL` to the real domain. Redeploy.
3. Make one real small purchase yourself, check the Printify order, approve it, and refund yourself in Paystack if you like.
4. Keep `PRINTIFY_AUTO_SEND` unset for the first weeks and approve orders by hand each day. Turn it on later if you want hands-off fulfilment.

## 8. Margins (read before setting prices)

Printify bills you in **US dollars**; customers pay in **Rand**. Current numbers from Printify (November 2026):

- Product cost per tee: about **US$15.93 to $22.35** for S to XL on the Gildan 5000 designs, up to about $26.16 for 5XL; the Mini Lips Bella+Canvas 3001 is $11.29 to $20.24. Exact per-size costs are in `data/printify-variants.json` (`cost_usd_cents`).
- Shipping to South Africa (provider 99, "rest of the world" rate): **US$10.39 for the first item, US$4.00 for each extra item**, about 10 days handling plus transit.
- Prices checked against the live Printify costs on 9 November 2026 at **R16.50 per US$** (market rate), with a safety margin at **R17.00** for bank currency-conversion fees:
  - Pricing as of 10 November 2026: every tee R450, all eight designs in the multi-buy (Signature Lips dropped its sleeve print on 10 November, so it now costs the same to make as the rest). Multi-buy: 2 for R800, 3 for R1 200, best mix applied automatically, size extras (+R40 2XL, +R70 3XL to 5XL) on top. Delivery R179, free from R2 000 after discounts. Refer a friend: ?ref=CODE gives R50 off an order of R450 or more.
  - Profit per order (R17 per US$, Paystack 3.39% card fee): 1 tee R147 (23%); 2 tees R133 (14%); 3 tees R167 (12%); 4 tees R201 (11%); 5 tees with free delivery R62 (3%); 1 Signature Lips R161 (26%); a friend-code single tee R98 (17%).
  - Orders above four tees with free delivery are thin. If the rand weakens past about R20 per US$, re-check before running ads.
  - The deal logic lives in `data/products.js` (`deals`, `referral`, `drop`, `noDeal`) and is applied by `js/core.js` in the browser and `netlify/functions/_lib/catalogue.mjs` on the server. Paystack gets the total discount as `totalDiscount`.
  - Refer a friend link: the footer has Copy my link, WhatsApp and Email a friend. The link is the site address plus `?ref=CODE`, built from the address the visitor is on, so it only works as a real link once the site is on its live domain (on a preview or test address it points to that address). A friend who opens it sees a "R50 off" banner, and the code is remembered in their browser, so the R50 still applies if they browse around or come back later. Tested end to end on 11 November 2026, including the payment function with a pretend Paystack.
  - Refer a friend: the friend's code is stored on the order (Paystack metadata, field `r`). The referrer's R50 is given by hand for now: ask for their code, then check the logs.
  - Drop 01 ends 31 December 2026: after that the server refuses new orders until you change `drop.ends` (or remove `drop`) in `data/products.js`.
- Delivery estimate (researched 10 November 2026): the print provider is Printify Choice (ships from the US, 10 days listed handling time). Printify says most orders ship in 2 to 7 business days (longer around holidays), and standard international shipping takes 10 to 30 business days (its blog says 5 to 20). Priority shipping (3 to 5 days) costs extra and is not used. The dated window is shown in the bag drawer and in the checkout summary (not on the tee pages) (the FAQ and terms give just the working-day range). The site shows a window of **14 to 18 working days** (5 working days wide, tightened on 10 November at the owner's request; Printify's own range is much wider, so late arrivals are possible) from today, plus **5 more working days from 15 November to 10 January** (so 19 to 23) for the festive rush. Weekends and 16 Dec, 25 Dec, 26 Dec and 1 Jan are skipped. It is in `data/products.js` (`shipping`): tighten or widen it after your first real orders, and re-read Printify's help pages at help.printify.com ("What are Printify's shipping options?") if their times change. Nothing in the data confirms South Africa specifically, so the first few orders are the real test.
- Paystack takes its card fee from each payment; Printify may add VAT/duties depending on the destination; the rand moves. Re-check margins whenever you change prices or the exchange rate shifts, and re-run the sync to refresh costs.
- The server only charges what `data/products.js` says; change prices there, never in the browser.

## 9. What can't be tested without live keys

Verified locally (unit tests with mocked `fetch`, plus a browser harness):

- Catalogue loading, server-side pricing (tampered browser totals ignored), size upcharges, free-delivery threshold.
- Validation: unknown products, sizes not offered or not in Printify, quantities, line limits, email, phone, 4-digit postal code, the 9 provinces, South Africa only.
- The exact request create-checkout sends to Paystack (amount in cents, ZAR, return URLs, Idempotency-Key, metadata) and its friendly errors when Paystack fails.
- Webhook signature checks (valid, tampered body, wrong secret, stale timestamp), unknown events ignored, amount mismatch held for manual review, the Printify order body, duplicate webhooks skipped, Printify outages answered with 503 so Paystack retries.
- `AW_PAY` in a real browser: redirect, server validation messages, outage and network errors, the 20-second timeout, double-tap protection.
- `sync-printify.mjs` against the real Printify shop (read-only): it regenerates `data/printify-variants.json` byte-for-byte.

Needs real keys and a deployed site:

- That Paystack accepts the checkout request as built (field names follow Paystack's docs, but no real call was made) and that `redirectUrl` works.
- That Paystack's webhook reaches the deployed function and the signature matches with your real secret key.
- That Paystack returns our `metadata` (including `checkoutId`) in the `charge.success` payload, as its docs say.
- That Printify accepts the order body and the South African address format, and how Printify reports a repeated `external_id`. No order has ever been created in Printify from this code.
- `send_to_production` with `PRINTIFY_AUTO_SEND=true`.
- The functions running on Netlify itself (bundling with esbuild and finding `data/**` in production). Locally they were run directly with Node.

## 10. Operations and known limits

- **Logs** (Netlify, Functions) never contain names, emails, phones or addresses: only order refs (`AW1234ABCD`), Paystack checkout ids, Printify order ids, line counts and amounts in cents. Search for `manual_review` daily during launch: it means money was taken but no Printify order was created (amount mismatch, product removed since checkout, or Printify refused the address). Find the payment in the Paystack App by checkout id and create the order by hand or refund.
- **Duplicates**: before creating an order the webhook scans the 150 most recent Printify orders for the same checkout id or label. Two webhook deliveries arriving at the exact same moment could still both create an order (very unlikely; Paystack retries are minutes apart). If you ever see two orders with the same label, cancel one.
- **Order data lives in Paystack's checkout metadata** (a compact JSON string, a few hundred bytes for a full bag). Paystack does not publish a metadata size limit; the function refuses orders whose packed data would exceed 3 000 characters. If that ever bites, store the order in Netlify Blobs keyed by checkout id instead.
- **Delivery notes** are stored in the metadata but Printify orders have no notes field, so they are not passed to the printer.
- **Deploy previews** send shoppers back to `SITE_URL` after paying, not to the preview URL.

## Sources relied on

Paystack developer docs: initialize transaction (`POST /transaction/initialize`, amount in cents, `callback_url`, `cancel_action`, `metadata`): https://paystack.com/docs/api/transaction/#initialize . Webhooks (`x-paystack-signature` = HMAC-SHA512 of the raw body with your secret key, `charge.success` event): https://paystack.com/docs/payments/webhooks/ . Test cards: https://paystack.com/docs/payments/test-payments/

## Adding a new tee: use the same model photo

Every tee shows the same model: the man with his hand on his hip, saved as `images/<id>/male-front-5.jpg`. Printify renumbers its model cameras, so do not trust the name: on 10 November 2026 that man is the camera **`person-4`** (id `92661`), and `person-5` is a different woman. Download it with
`https://images-api.printify.com/mockup/<printify product id>/12100/92661/<product slug>.jpg?camera_label=person-4`
and check it by eye before publishing. The other photos (`back` 92571, `front` 92570, `collar` 92586, `folded` 102001, `hanging-1` 102002) have kept their ids.

## Track your order

Customers can track an order at `#/track` ("Track order" in the header, "Track your order" in the footer, the FAQ and the order-confirmed page).

- **How it works:** the customer enters their order number (it starts with `AW`, and is shown on the order-confirmed page, because the payment page now returns them to `/?order=<number>#/checkout/success`) and the email they ordered with. `netlify/functions/track-order.mjs` finds the order in Printify by its label (the same number), checks the email matches, and returns only a stage, the items and tracking links, never the address or phone. It uses the same `PRINTIFY_API_TOKEN` as the webhook, nothing new to set up.
- **Stages:** Order received, Being printed, On its way (with the courier and tracking number, linking to the carrier's page or to 17TRACK when Printify gives only a number), Delivered. Printify statuses `has-issues`, `on-hold` and similar show "We're checking your order". Cancelled orders say so.
- **Orders stay on "Order received" until they are approved in Printify.** Unless `PRINTIFY_AUTO_SEND=true`, the webhook only creates the order (status `pending`); it moves to "Being printed" once you approve it (or once auto-send is on).
- **Printify also emails customers** when their parcel ships (`send_shipping_notification` is on), so they get the tracking link even if they never visit the page.
- **Safety:** wrong order number or email gives the same "couldn't find" message (so nobody can probe for orders), and there is a best-effort limit of 12 lookups per 10 minutes per visitor.
- **Tested against the documented Printify order shape, not a real order:** the shop had no orders on 11 November 2026. Place one test order and watch it on the page before you promote this.

## 9. Customer emails and tracking (order confirmed, on its way, delivered)

What customers get once this is set up:
1. **Order confirmed** (the moment their payment is verified): order number, items, total, estimated arrival, and a **Track your order** button.
2. **On its way** (when Printify ships the parcel): carrier, **tracking number**, a link to track the parcel, and a link to the AWEZA tracking page.
3. **Delivered** (when the courier marks it delivered).
The buttons open `#/track/<order number>.<private token>`: the tracking page loads straight away with no email retyping. The token is made from the order number and a secret, so nobody can make one for someone else's order. The plain "Track your order" page (order number + email) still works too.

Setup (about 20 minutes, once the site has its domain):
1. **Create a Resend account** (resend.com, free to start) and **Add domain** with your site's domain. Resend shows a few DNS records (SPF, DKIM): add them at your domain registrar and click Verify. Until it is verified Resend will not send from your domain.
2. In Resend create an **API key** with sending access. In Netlify add `RESEND_API_KEY` and `MAIL_FROM` (for example `AWEZA <orders@your-domain.com>`), and `MAIL_REPLY_TO` if you like. Redeploy.
3. **Tell Printify to call your site** when parcels ship. On your own computer, in the `aweza` folder:
   ```sh
   export PRINTIFY_API_TOKEN=...      # never commit it
   node scripts/register-printify-webhooks.mjs https://your-domain.com
   ```
   It registers `order:shipment:created` and `order:shipment:delivered` and prints `PRINTIFY_WEBHOOK_SECRET=...` **once**. Put it in Netlify and redeploy. (`--list` shows what is registered.)
4. **Test:** place a test order with your own email. You should get the confirmation email within a minute (the subject starts with `[TEST]` in Paystack test mode). The shipped and delivered emails come from Printify's events, which only fire for real shipments, so check them with the first real order, or in Printify's webhook settings send a test event.
5. When you have received the confirmation and a shipped email once, set `PRINTIFY_NOTIFY_CUSTOMER=false` so customers do not get two shipping emails (ours and Printify's). Until then, leave it alone: Printify's email is the safety net.

Notes:
- If the email service is down or not set up, orders and payments still work; nothing is lost. A failed email is logged in Netlify (`email_failed`).
- Emails are sent only when the Printify order is **freshly created**, and Resend is given an idempotency key, so a retried webhook does not send twice.
- Customers' addresses are used only to send these emails. Mention it in your Privacy page.
- The shipped email appears only once Printify has a tracking number. Printify only creates one after you have **approved the order** in Printify (unless `PRINTIFY_AUTO_SEND=true`).
