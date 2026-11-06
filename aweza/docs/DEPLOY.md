# AWEZA: deploying payments and fulfilment

How the money flows:

1. The shopper fills in checkout. `js/pay.js` (`window.AW_PAY`) posts the order to `/.netlify/functions/create-checkout`.
2. **create-checkout** checks every line against `data/products.js` and `data/printify-variants.json`, re-prices the order on the server (browser totals are ignored), creates a Yoco hosted checkout, and sends back the Yoco payment page URL.
3. The shopper pays on Yoco's page and returns to `/#/checkout/success`, `/#/checkout/cancelled` or `/#/checkout/failed`.
4. Yoco calls **yoco-webhook** with `payment.succeeded`. The webhook checks Yoco's signature, rebuilds the order from the checkout metadata, checks the amount paid against a fresh server-side total, and creates the order in Printify. The success page alone never triggers fulfilment; only a signed webhook does.
5. By default the Printify order waits for **your approval** in Printify (Orders, then "Send to production"). Set `PRINTIFY_AUTO_SEND=true` to skip that step once you trust the flow.

Files: `netlify.toml`, `netlify/functions/create-checkout.mjs`, `netlify/functions/yoco-webhook.mjs`, `netlify/functions/_lib/*`, `scripts/sync-printify.mjs`, `js/pay.js`. Node 18 or newer, no npm packages.

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
| `YOCO_SECRET_KEY` | yes | `sk_test_...` then `sk_live_...` | Yoco Checkout API secret key. Server only. Test key first. |
| `YOCO_WEBHOOK_SECRET` | yes | `whsec_...` | Returned **once** when you register the webhook (step 3). |
| `PRINTIFY_API_TOKEN` | yes | (long token) | Printify, My account, Connections, generate a token with orders write + products read. |
| `PRINTIFY_SHOP_ID` | recommended | `29483178` | The AWEZA shop. Defaults to 29483178 if unset. |
| `SITE_URL` | recommended | `https://aweza.co.za` | Used to build the Yoco return URLs and as an allowed origin. Falls back to the request's own origin. |
| `PRINTIFY_AUTO_SEND` | no | `true` | Only `true` turns it on. Sends paid **live** orders straight to production. Test-mode payments are never auto-sent. Leave unset for launch. |

Never put any of these in the repo or in `js/`.

## 3. Register the Yoco webhook

Yoco registers Checkout API webhooks through its API (one webhook per account is recommended). Run once from your own computer, with your **secret key** for the mode you are setting up:

```sh
curl -X POST https://payments.yoco.com/api/webhooks \
  -H "Authorization: Bearer $YOCO_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"aweza-netlify","url":"https://<your-site>/.netlify/functions/yoco-webhook"}'
```

Copy the `secret` from the response (it starts with `whsec_` and is shown only once) into `YOCO_WEBHOOK_SECRET`, then redeploy. Do this separately for test and live keys if Yoco gives you a different secret per mode. If the webhook fails for 5 days straight Yoco switches it off and you must register it again.

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

The checkout (`js/cart.js`) calls `window.AW_PAY(order)` when it exists and otherwise shows "Payments are launching soon". `AW_PAY` redirects to Yoco on success and rejects with `Error(message)` that is safe to show inline. A second tap while a request is in flight reuses the first request.

## 6. Test mode checklist (use Yoco **test** keys)

1. Set `YOCO_SECRET_KEY=sk_test_...`, register the webhook with the test key, set `YOCO_WEBHOOK_SECRET`, set `PRINTIFY_API_TOKEN`, leave `PRINTIFY_AUTO_SEND` unset. Redeploy.
2. Add two tees to the bag, one of them a 2XL (to check the size upcharge), go to checkout, fill the form, press Pay.
3. You land on Yoco's page with the right total (subtotal + R149 delivery, or free delivery at R1 500 and over). Pay with Yoco's test card (Yoco App, Checkout API integration, How to connect, Test card details).
4. You return to `/#/checkout/success` and the bag empties.
5. Netlify, Functions, `yoco-webhook` logs show `printify_order_created` with `"test":true`.
6. In Printify, Orders: a new order labelled `TEST-AW...`, on hold, with the right variants and address. **Delete or cancel it by hand**; do not send it to production.
7. Repeat and press Cancel on Yoco's page: you land on `/#/checkout/cancelled`, no Printify order.
8. Optional: try a wrong postal code (3 digits) and confirm the checkout shows the error inline.
9. Yoco does not accept payments under R2.00.

## 7. Going live

1. In the Yoco App, Checkout API integration, How to connect, **Verified Domains**: add your site's domain and wait for approval. Live keys stay locked until a domain is verified.
2. Replace `YOCO_SECRET_KEY` with the live key. Register the webhook again with the live key and update `YOCO_WEBHOOK_SECRET` if the secret differs. Set `SITE_URL` to the real domain. Redeploy.
3. Make one real small purchase yourself, check the Printify order, approve it, and refund yourself in Yoco if you like.
4. Keep `PRINTIFY_AUTO_SEND` unset for the first weeks and approve orders by hand each day. Turn it on later if you want hands-off fulfilment.

## 8. Margins (read before setting prices)

Printify bills you in **US dollars**; customers pay in **Rand**. Current numbers from Printify (November 2026):

- Product cost per tee: about **US$15.93 to $22.35** for S to XL on the Gildan 5000 designs, up to about $26.16 for 5XL; the Mini Lips Bella+Canvas 3001 is $11.29 to $20.24. Exact per-size costs are in `data/printify-variants.json` (`cost_usd_cents`).
- Shipping to South Africa (provider 99, "rest of the world" rate): **US$10.39 for the first item, US$4.00 for each extra item**, about 10 days handling plus transit.
- So one Signature Lips tee in M costs roughly $22.35 + $10.39 = **$32.74**, about **R590 at R18/$** before card fees, against R749 + R149 delivery = R898 collected. Free delivery orders (R1 500+) absorb the shipping themselves.
- Yoco takes its card fee from each payment; Printify may add VAT/duties depending on the destination; the rand moves. Re-check margins whenever you change prices or the exchange rate shifts, and re-run the sync to refresh costs.
- The server only charges what `data/products.js` says; change prices there, never in the browser.

## 9. What can't be tested without live keys

Verified locally (unit tests with mocked `fetch`, plus a browser harness):

- Catalogue loading, server-side pricing (tampered browser totals ignored), size upcharges, free-delivery threshold.
- Validation: unknown products, sizes not offered or not in Printify, quantities, line limits, email, phone, 4-digit postal code, the 9 provinces, South Africa only.
- The exact request create-checkout sends to Yoco (amount in cents, ZAR, return URLs, Idempotency-Key, metadata) and its friendly errors when Yoco fails.
- Webhook signature checks (valid, tampered body, wrong secret, stale timestamp), unknown events ignored, amount mismatch held for manual review, the Printify order body, duplicate webhooks skipped, Printify outages answered with 503 so Yoco retries.
- `AW_PAY` in a real browser: redirect, server validation messages, outage and network errors, the 20-second timeout, double-tap protection.
- `sync-printify.mjs` against the real Printify shop (read-only): it regenerates `data/printify-variants.json` byte-for-byte.

Needs real keys and a deployed site:

- That Yoco accepts the checkout request as built (field names follow Yoco's docs, but no real call was made) and that `redirectUrl` works.
- That Yoco's webhook reaches the deployed function and the signature matches with your real `whsec_` secret.
- That Yoco returns our `metadata` (including `checkoutId`) in the `payment.succeeded` payload, as its docs say.
- That Printify accepts the order body and the South African address format, and how Printify reports a repeated `external_id`. No order has ever been created in Printify from this code.
- `send_to_production` with `PRINTIFY_AUTO_SEND=true`.
- The functions running on Netlify itself (bundling with esbuild and finding `data/**` in production). Locally they were run directly with Node.

## 10. Operations and known limits

- **Logs** (Netlify, Functions) never contain names, emails, phones or addresses: only order refs (`AW1234ABCD`), Yoco checkout ids, Printify order ids, line counts and amounts in cents. Search for `manual_review` daily during launch: it means money was taken but no Printify order was created (amount mismatch, product removed since checkout, or Printify refused the address). Find the payment in the Yoco App by checkout id and create the order by hand or refund.
- **Duplicates**: before creating an order the webhook scans the 150 most recent Printify orders for the same checkout id or label. Two webhook deliveries arriving at the exact same moment could still both create an order (very unlikely; Yoco retries are minutes apart). If you ever see two orders with the same label, cancel one.
- **Order data lives in Yoco's checkout metadata** (a compact JSON string, a few hundred bytes for a full bag). Yoco does not publish a metadata size limit; the function refuses orders whose packed data would exceed 3 000 characters. If that ever bites, store the order in Netlify Blobs keyed by checkout id instead.
- **Delivery notes** are stored in the metadata but Printify orders have no notes field, so they are not passed to the printer.
- **Deploy previews** send shoppers back to `SITE_URL` after paying, not to the preview URL.

## Sources relied on

Yoco developer docs, read November 2026:

- Create checkout (endpoint, fields, `Idempotency-Key`, `lineItems`, `metadata`, `redirectUrl`): https://developer.yoco.com/api-reference/checkout-api/checkout/create-checkout
- Idempotency (same key returns the same result for 24 hours): https://developer.yoco.com/docs/checkout-api/idempotency
- Webhooks, registering and retries (`POST /api/webhooks`, secret shown once, retry schedule, filter by `metadata.checkoutId`): https://developer.yoco.com/guides/online-payments/webhooks/listen-for-events
- Verifying events (`webhook-id`.`webhook-timestamp`.raw body, HMAC-SHA256 with the base64 secret after `whsec_`, `v1,` signatures, constant-time compare, **replay window of up to 3 minutes recommended**, so we use 3 minutes rather than 5): https://developer.yoco.com/guides/online-payments/webhooks/verifying-the-events
- Payment notification payload (`type`, `payload.amount`, `currency`, `mode`, `metadata`): https://developer.yoco.com/api-reference/checkout-api/webhook-events/payment-notification
- Testing and going live (test keys, test cards, verified domains, R2.00 minimum): https://developer.yoco.com/docs/checkout-api/testing

Printify API v1 reference (orders: `external_id`, `line_items`, `shipping_method`, `address_to`; products list max `limit=50`): https://developers.printify.com/
