// POST /.netlify/functions/printify-webhook
// Printify calls this when a parcel ships (order:shipment:created) or is delivered (order:shipment:delivered).
// We check Printify's signature, read the order from Printify, and email the customer their tracking.
// Printify docs: https://developers.printify.com/#webhooks  (header X-Pfy-Signature: sha256=<hmac hex of the body>)

import crypto from "node:crypto";
import { loadCatalogue } from "./_lib/catalogue.mjs";
import { getOrder, PrintifyError } from "./_lib/printify.mjs";
import { mailEnabled, sendMail, shippedEmail, deliveredEmail } from "./_lib/email.mjs";
import { trackToken } from "./_lib/track-token.mjs";
import { json, log, siteOrigin } from "./_lib/http.mjs";

const MAX_BODY = 64 * 1024;
const TOPICS = new Set(["order:shipment:created", "order:shipment:delivered"]);

export function verifyPrintify(secret, rawBody, header) {
  if (!secret || typeof header !== "string") return false;
  const m = /^sha256=([0-9a-f]{64})$/i.exec(header.trim());
  if (!m) return false;
  const want = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(want, "utf8"), Buffer.from(m[1].toLowerCase(), "utf8"));
}

const httpsOnly = u => { try { const x = new URL(String(u)); return x.protocol === "https:" ? x.href : null; } catch { return null; } };
const prettyCarrier = c => String(c || "").replace(/[-_]+/g, " ").trim().replace(/\b\w/g, m => m.toUpperCase()).slice(0, 40) || "Courier";

function itemsOf(o, cat) {
  const out = [];
  for (const li of Array.isArray(o.line_items) ? o.line_items : []) {
    let name = "", size = "";
    for (const [slug, pv] of Object.entries(cat.variants)) {
      if (String(pv.printify_product_id) !== String(li.product_id)) continue;
      const p = cat.byId.get(slug); name = p ? p.name : slug;
      size = Object.entries(pv.sizes).find(([, v]) => Number(v.variant_id) === Number(li.variant_id))?.[0] || "";
      break;
    }
    out.push({ name: name || "AWEZA tee", size, qty: Number(li.quantity) || 1 });
  }
  return out;
}

export default async function handler(req) {
  if (req.method !== "POST") return json(405, { error: "Method not allowed." }, { allow: "POST" });
  const secret = process.env.PRINTIFY_WEBHOOK_SECRET;
  if (!secret) { log("config_missing", { name: "PRINTIFY_WEBHOOK_SECRET" }); return json(500, { error: "not configured" }); }   // fail closed

  const rawBody = await req.text();
  if (rawBody.length > MAX_BODY) return json(413, { error: "too large" });
  if (!verifyPrintify(secret, rawBody, req.headers.get("x-pfy-signature"))) { log("printify_webhook_rejected", {}); return json(401, { error: "invalid signature" }); }

  let event;
  try { event = JSON.parse(rawBody); } catch { return json(400, { error: "bad json" }); }
  const type = event && String(event.type || "");
  if (!TOPICS.has(type)) return json(200, { received: true, ignored: true });
  const orderId = event.resource && String(event.resource.id || "");
  if (!/^[A-Za-z0-9_-]{8,40}$/.test(orderId || "")) return json(200, { received: true, ignored: true });
  if (!mailEnabled()) { log("mail_not_configured", { type }); return json(200, { received: true, mail: "off" }); }

  try {
    const order = await getOrder(orderId);
    const label = String(order.label || ""), test = label.startsWith("TEST-");
    const ref = label.replace(/^TEST-/, "");
    if (!/^AW[A-Z0-9]{6,12}$/.test(ref)) { log("printify_webhook_not_ours", { type }); return json(200, { received: true, ignored: true }); }
    const email = order.address_to && String(order.address_to.email || "").trim();
    if (!email) return json(200, { received: true, ignored: true });
    const first = order.address_to.first_name ? String(order.address_to.first_name).slice(0, 60) : "";
    const siteUrl = siteOrigin(req), token = trackToken(ref), cat = loadCatalogue();

    let mail, key;
    if (type === "order:shipment:created") {
      const shipments = (Array.isArray(order.shipments) ? order.shipments : []).filter(s => s && (s.number || s.url)).map(s => ({
        carrier: prettyCarrier(s.carrier), number: s.number ? String(s.number).slice(0, 60) : "",
        url: httpsOnly(s.url) || (s.number ? "https://t.17track.net/en#nums=" + encodeURIComponent(String(s.number).slice(0, 60)) : null),
      }));
      if (!shipments.length) return json(200, { received: true, ignored: true, reason: "no tracking yet" });
      mail = shippedEmail({ siteUrl, ref, token, first, items: itemsOf(order, cat), shipments, test });
      key = `shipped:${orderId}:${shipments.map(s => s.number).join(",")}`;
    } else {
      mail = deliveredEmail({ siteUrl, ref, token, first, test });
      key = `delivered:${orderId}`;
    }
    const r = await sendMail({ to: email, subject: mail.subject, html: mail.html, text: mail.text, idempotencyKey: key });
    if (!r.ok) {
      log("email_failed", { type, status: r.status, retryable: r.retryable });
      return r.retryable ? json(503, { error: "email temporarily unavailable" }) : json(200, { received: true, mail: "failed" });
    }
    log("email_sent", { type, test });
    return json(200, { received: true, mail: "sent" });
  } catch (e) {
    const transient = !(e instanceof PrintifyError) || e.status === 429 || e.status >= 500;
    log("printify_webhook_error", { type, status: e instanceof PrintifyError ? e.status : 0 });
    return transient ? json(503, { error: "temporarily unavailable" }) : json(200, { received: true, ignored: true });
  }
}
