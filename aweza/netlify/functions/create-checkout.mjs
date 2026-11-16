// POST /.netlify/functions/create-checkout
// Body: the order object from DIRECTION §11. Validates it, re-prices it on
// the server (browser totals are ignored), initialises a Paystack transaction and
// returns { redirectUrl, checkoutId }.
// Paystack reference: https://paystack.com/docs/api/transaction/#initialize

import crypto from "node:crypto";
import {
  loadCatalogue, validateOrder, priceOrder, packOrder, ValidationError, MAX_METADATA_CHARS,
} from "./_lib/catalogue.mjs";
import { json, log, fetchWithTimeout, siteOrigin, rateLimited } from "./_lib/http.mjs";

const PAYSTACK_INIT_URL = "https://api.paystack.co/transaction/initialize";
const MAX_BODY = 16 * 1024;
const UNAVAILABLE = "Payments are temporarily unavailable. Please try again in a few minutes.";

function sameOrigin(req) {
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser caller; nothing to protect via CORS
  const allowed = new Set([new URL(req.url).origin]);
  try { if (process.env.SITE_URL) allowed.add(new URL(process.env.SITE_URL).origin); } catch { /* ignore */ }
  return allowed.has(origin);
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

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    log("config_missing", { name: "PAYSTACK_SECRET_KEY" });
    return json(503, { error: UNAVAILABLE });
  }

  const packed = packOrder(order, pricing, cat);
  if (packed.length > MAX_METADATA_CHARS) return json(400, { error: "Your order is too large to pay in one go. Split it into two orders." });

  const origin = siteOrigin(req);
  const ref = "AW" + crypto.randomBytes(4).toString("hex").toUpperCase();
  // Paystack sends the customer back to callback_url with ?trxref=&reference= appended; the site shows the success page.
  const body = {
    email: order.customer.email,
    amount: pricing.totalCents,
    currency: "ZAR",
    reference: ref,
    callback_url: `${origin}/?order=${ref}`,
    cancel_action: `${origin}/#/checkout/cancelled`,
    metadata: { source: "aweza-web", ref, order: packed },
  };

  let res, data;
  try {
    res = await fetchWithTimeout(PAYSTACK_INIT_URL, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    }, 10000);
    data = await res.json().catch(() => ({}));
  } catch (e) {
    log("paystack_network_error", { ref, message: String(e && e.name) });
    return json(502, { error: UNAVAILABLE });
  }

  const d = data && data.data;
  if (!res.ok || !data || data.status !== true || !d || typeof d.authorization_url !== "string") {
    log("paystack_error", { ref, status: res.status });
    return json(502, { error: UNAVAILABLE });
  }

  let redirectUrl;
  try {
    const u = new URL(d.authorization_url);
    if (u.protocol !== "https:") throw new Error("insecure");
    // Only ever send customers to Paystack's own payment page.
    if (u.hostname !== "paystack.com" && !u.hostname.endsWith(".paystack.com")) throw new Error("not paystack");
    redirectUrl = u.toString();
  } catch {
    log("paystack_bad_redirect", { ref });
    return json(502, { error: UNAVAILABLE });
  }

  log("checkout_created", { ref, lines: order.lines.length, amount: pricing.totalCents });
  return json(200, { redirectUrl, checkoutId: ref });
}
