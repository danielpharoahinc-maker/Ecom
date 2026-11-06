// POST /.netlify/functions/yoco-webhook
// Receives Yoco Checkout API events, verifies the signature, and on
// payment.succeeded creates the matching Printify order (idempotently).
// Yoco docs: https://developer.yoco.com/guides/online-payments/webhooks/listen-for-events
//            https://developer.yoco.com/api-reference/checkout-api/webhook-events/payment-notification
// Yoco retries any non-2xx response, so we return 5xx only when a retry
// could help (Printify down, rate-limited, misconfigured) and 200 otherwise.

import { loadCatalogue, validateOrder, priceOrder, unpackOrder } from "./_lib/catalogue.mjs";
import { verifyWebhook } from "./_lib/yoco.mjs";
import { createOrder, findExistingOrder, sendToProduction, isDuplicateError, PrintifyError } from "./_lib/printify.mjs";
import { json, log } from "./_lib/http.mjs";

const MAX_BODY = 64 * 1024;

export default async function handler(req) {
  if (req.method !== "POST") return json(405, { error: "Method not allowed." }, { allow: "POST" });

  const secret = process.env.YOCO_WEBHOOK_SECRET;
  if (!secret) {
    log("config_missing", { name: "YOCO_WEBHOOK_SECRET" });
    return json(500, { error: "not configured" }); // fail closed; Yoco will retry
  }

  const rawBody = await req.text();
  if (rawBody.length > MAX_BODY) return json(413, { error: "too large" });

  const v = verifyWebhook({
    secret,
    id: req.headers.get("webhook-id"),
    timestamp: req.headers.get("webhook-timestamp"),
    signature: req.headers.get("webhook-signature"),
    rawBody,
  });
  if (!v.ok) {
    log("webhook_rejected", { reason: v.reason });
    return json(401, { error: "invalid signature" });
  }

  let event;
  try { event = JSON.parse(rawBody); } catch { return json(400, { error: "bad json" }); }
  const webhookId = req.headers.get("webhook-id");

  if (!event || event.type !== "payment.succeeded") {
    log("webhook_ignored", { webhookId, type: event && String(event.type).slice(0, 40) });
    return json(200, { received: true, ignored: true });
  }

  const payment = event.payload || {};
  const meta = payment.metadata || {};
  const checkoutId = meta.checkoutId;
  if (meta.source !== "aweza-web" || !meta.order || !checkoutId) {
    log("webhook_not_ours", { webhookId });
    return json(200, { received: true, ignored: true });
  }
  const ref = typeof meta.ref === "string" ? meta.ref.slice(0, 32) : "";
  const isTest = payment.mode === "test";

  // Rebuild and re-validate the order, then re-price it from the catalogue.
  let order, pricing;
  try {
    const packed = unpackOrder(meta.order);
    order = validateOrder({ ...packed, lines: packed.lines.map(({ id, size, qty }) => ({ id, size, qty })) });
    pricing = priceOrder(order.lines);
    if (payment.currency !== "ZAR" || payment.amount !== pricing.totalCents || packed.totalCents !== pricing.totalCents) {
      log("manual_review", { ref, checkoutId, reason: "amount_mismatch", paid: payment.amount, expected: pricing.totalCents, quoted: packed.totalCents });
      return json(200, { received: true, status: "manual_review" });
    }
  } catch (e) {
    log("manual_review", { ref, checkoutId, reason: "order_rebuild_failed", message: String(e && e.message).slice(0, 120) });
    return json(200, { received: true, status: "manual_review" });
  }

  const cat = loadCatalogue();
  const label = (isTest ? "TEST-" : "") + (ref || checkoutId).slice(0, 40);

  try {
    const existing = await findExistingOrder({ externalId: checkoutId, label });
    if (existing) {
      log("duplicate_skipped", { ref, checkoutId, printifyOrderId: existing.id });
      return json(200, { received: true, status: "duplicate", printifyOrderId: existing.id });
    }

    const { customer: c, address: a } = order;
    const printifyOrder = {
      external_id: checkoutId,
      label,
      line_items: order.lines.map(l => {
        const pv = cat.variants[l.id];
        return { product_id: pv.printify_product_id, variant_id: pv.sizes[l.size].variant_id, quantity: l.qty };
      }),
      shipping_method: 1,
      send_shipping_notification: true,
      address_to: {
        first_name: c.firstName,
        last_name: c.lastName,
        email: c.email,
        phone: c.phone,
        country: "ZA",
        region: a.province,
        address1: a.line1,
        address2: [a.line2, a.suburb].filter(Boolean).join(", "),
        city: a.city,
        zip: a.postalCode,
      },
    };

    let created;
    try {
      created = await createOrder(printifyOrder);
    } catch (e) {
      if (isDuplicateError(e)) {
        log("duplicate_skipped", { ref, checkoutId, via: "printify_rejected" });
        return json(200, { received: true, status: "duplicate" });
      }
      throw e;
    }
    log("printify_order_created", { ref, checkoutId, printifyOrderId: created.id, lines: order.lines.length, amount: pricing.totalCents, test: isTest });

    if (process.env.PRINTIFY_AUTO_SEND === "true" && !isTest && created.id) {
      try {
        await sendToProduction(created.id);
        log("sent_to_production", { ref, printifyOrderId: created.id });
      } catch (e) {
        // Order exists; the owner can approve it by hand. Do not make Yoco retry.
        log("send_to_production_failed", { ref, printifyOrderId: created.id, status: e && e.status });
      }
    }
    return json(200, { received: true, status: "created", printifyOrderId: created.id });
  } catch (e) {
    const status = e instanceof PrintifyError ? e.status : 0;
    const retryable = !status || status === 429 || status >= 500 || status === 401 || status === 403 || (e && e.code === "config");
    log("printify_error", { ref, checkoutId, status, retryable, code: e instanceof PrintifyError ? (e.body && e.body.code) || null : String(e && e.name) });
    if (retryable) return json(503, { error: "fulfilment temporarily unavailable" });
    log("manual_review", { ref, checkoutId, reason: "printify_rejected_order" });
    return json(200, { received: true, status: "manual_review" });
  }
}
