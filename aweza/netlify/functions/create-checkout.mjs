// POST /.netlify/functions/create-checkout
// Body: the order object from DIRECTION §11. Validates it, re-prices it on
// the server (browser totals are ignored), creates a Yoco hosted checkout and
// returns { redirectUrl, checkoutId }.
// Yoco reference: https://developer.yoco.com/api-reference/checkout-api/checkout/create-checkout

import crypto from "node:crypto";
import {
  loadCatalogue, validateOrder, priceOrder, packOrder, ValidationError, MAX_METADATA_CHARS,
} from "./_lib/catalogue.mjs";
import { json, log, fetchWithTimeout, siteOrigin, rateLimited } from "./_lib/http.mjs";

const YOCO_CHECKOUT_URL = "https://payments.yoco.com/api/checkouts";
const MAX_BODY = 16 * 1024;
const UNAVAILABLE = "Payments are temporarily unavailable. Please try again in a few minutes.";

function sameOrigin(req) {
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser caller; nothing to protect via CORS
  const allowed = new Set([new URL(req.url).origin]);
  try { if (process.env.SITE_URL) allowed.add(new URL(process.env.SITE_URL).origin); } catch { /* ignore */ }
  return allowed.has(origin);
}

function idempotencyKey(req, order, pricing) {
  // A stable key per payment attempt: pay.js sends a random attempt id, so a
  // double-tap or network retry of the same attempt reuses the same Yoco
  // checkout, while a fresh attempt (after cancelling) gets a new one.
  const attempt = (req.headers.get("x-aweza-attempt") || "").replace(/[^\w-]/g, "").slice(0, 64);
  const bucket = attempt || String(Math.floor(Date.now() / (5 * 60 * 1000)));
  const canon = JSON.stringify([order.lines, order.customer, order.address, order.ref, pricing.totalCents]);
  return "aweza-" + crypto.createHash("sha256").update(bucket + "|" + canon).digest("hex").slice(0, 40);
}

export default async function handler(req) {
  if (req.method === "OPTIONS") {
    // Same-origin only: no Access-Control-Allow-Origin is ever sent.
    return new Response(null, { status: 204, headers: { allow: "POST, OPTIONS" } });
  }
  if (req.method !== "POST") return json(405, { error: "Method not allowed." }, { allow: "POST, OPTIONS" });
  if (!sameOrigin(req)) return json(403, { error: "Checkout must be started from the AWEZA site." });
  if (rateLimited(req, "checkout", 20, 10 * 60 * 1000)) return json(429, { error: "Too many attempts. Please wait a few minutes and try again." });

  const ctype = req.headers.get("content-type") || "";
  if (!ctype.toLowerCase().includes("application/json")) return json(415, { error: "Something is off with your order. Refresh and try again." });

  let raw;
  try { raw = await req.text(); } catch { return json(400, { error: "Something is off with your order. Refresh and try again." }); }
  if (raw.length > MAX_BODY) return json(413, { error: "Your order is too large. Remove a few items and try again." });

  let input;
  try { input = JSON.parse(raw); } catch { return json(400, { error: "Something is off with your order. Refresh and try again." }); }

  let cat, order, pricing;
  try {
    cat = loadCatalogue();
  } catch (e) {
    log("catalogue_error", { message: String(e && e.message) });
    return json(503, { error: UNAVAILABLE });
  }
  try {
    order = validateOrder(input, cat);
    pricing = priceOrder(order.lines, cat, order.ref);
  } catch (e) {
    if (e instanceof ValidationError) return json(400, { error: e.message });
    log("validate_error", { message: String(e && e.message) });
    return json(400, { error: "Something is off with your order. Refresh and try again." });
  }
  if (pricing.totalCents < 200) return json(400, { error: "Your order total is too low to pay online." });

  const secret = process.env.YOCO_SECRET_KEY;
  if (!secret) {
    log("config_missing", { name: "YOCO_SECRET_KEY" });
    return json(503, { error: UNAVAILABLE });
  }

  const packed = packOrder(order, pricing, cat);
  if (packed.length > MAX_METADATA_CHARS) return json(400, { error: "Your order is too large to pay in one go. Split it into two orders." });

  const origin = siteOrigin(req);
  const ref = "AW" + crypto.randomBytes(4).toString("hex").toUpperCase();
  const body = {
    amount: pricing.totalCents,
    currency: "ZAR",
    successUrl: `${origin}/?order=${ref}#/checkout/success`,
    cancelUrl: `${origin}/#/checkout/cancelled`,
    failureUrl: `${origin}/#/checkout/failed`,
    clientReferenceId: ref,
    subtotalAmount: pricing.subtotalCents,
    ...(pricing.discountCents ? { totalDiscount: pricing.discountCents } : {}),
    lineItems: [
      ...pricing.lines.map(l => ({
        displayName: `${l.name} (${l.size})`.slice(0, 100),
        quantity: l.qty,
        pricingDetails: { price: l.unit * 100 },
      })),
      ...(pricing.deliveryCents ? [{ displayName: "Delivery", quantity: 1, pricingDetails: { price: pricing.deliveryCents } }] : []),
    ],
    metadata: { source: "aweza-web", ref, order: packed },
  };

  let res, data;
  try {
    res = await fetchWithTimeout(YOCO_CHECKOUT_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${secret}`,
        "content-type": "application/json",
        "idempotency-key": idempotencyKey(req, order, pricing),
      },
      body: JSON.stringify(body),
    }, 10000);
    data = await res.json().catch(() => ({}));
  } catch (e) {
    log("yoco_network_error", { ref, message: String(e && e.name) });
    return json(502, { error: UNAVAILABLE });
  }

  if (!res.ok || !data || typeof data.redirectUrl !== "string" || !data.id) {
    // Yoco errors carry { message, reason, solution }; log the status only.
    log("yoco_error", { ref, status: res.status });
    return json(502, { error: UNAVAILABLE });
  }

  let redirectUrl;
  try {
    const u = new URL(data.redirectUrl);
    if (u.protocol !== "https:") throw new Error("insecure");
    // Only ever send customers to Yoco's own payment page.
    if (u.hostname !== "yoco.com" && !u.hostname.endsWith(".yoco.com")) throw new Error("not yoco");
    redirectUrl = u.toString();
  } catch {
    log("yoco_bad_redirect", { ref });
    return json(502, { error: UNAVAILABLE });
  }

  log("checkout_created", { ref, checkoutId: data.id, lines: order.lines.length, amount: pricing.totalCents, mode: data.processingMode });
  return json(200, { redirectUrl, checkoutId: data.id });
}
