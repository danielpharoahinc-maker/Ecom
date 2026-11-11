// POST /.netlify/functions/track-order
// Body: { ref: "AW1A2B3C4D", email: "customer@example.com" }
// Looks the order up in Printify by its label (the order number we gave the customer), checks the email matches the
// one on the order, and returns only safe fields: a stage, items, and tracking links. Never the address or phone.

import { loadCatalogue } from "./_lib/catalogue.mjs";
import { findOrderByLabel } from "./_lib/printify.mjs";
import { json, log } from "./_lib/http.mjs";

const MAX_BODY = 2 * 1024;
const NOT_FOUND = "We couldn't find an order with those details. Check the order number and the email you used. If you only just paid, give it a few minutes and try again.";
const REF_RE = /^AW[A-Z0-9]{6,12}$/;

// Best-effort limit per visitor so the lookup can't be used to guess order numbers. (Serverless instances are
// short-lived, so this is a speed bump, not a guarantee. The email must also match, which is the real guard.)
const hits = new Map();
function throttled(ip) {
  const now = Date.now(), win = 10 * 60 * 1000, list = (hits.get(ip) || []).filter(t => now - t < win);
  list.push(now); hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > 12;
}

function sameOrigin(req) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  const allowed = new Set([new URL(req.url).origin]);
  try { if (process.env.SITE_URL) allowed.add(new URL(process.env.SITE_URL).origin); } catch { /* ignore */ }
  return allowed.has(origin);
}

const httpsOnly = u => { try { const x = new URL(String(u)); return x.protocol === "https:" ? x.href : null; } catch { return null; } };
const prettyCarrier = c => String(c || "").replace(/[-_]+/g, " ").trim().replace(/\b\w/g, m => m.toUpperCase()).slice(0, 40) || "Courier";

/** Turn a Printify order into a stage the customer understands. */
export function describeOrder(o) {
  const ships = (Array.isArray(o.shipments) ? o.shipments : []).filter(s => s && (s.number || s.url));
  const status = String(o.status || "");
  const allDelivered = ships.length > 0 && ships.every(s => s.delivered_at);
  if (status === "canceled") return { stage: -1, title: "Cancelled", detail: "This order was cancelled. If you didn't ask for that, message us and we'll sort it out.", issue: true };
  if (allDelivered) return { stage: 3, title: "Delivered", detail: "Your order has been delivered. Enjoy.", issue: false };
  if (ships.length || status === "fulfilled" || status === "partially-fulfilled") {
    return { stage: 2, title: status === "partially-fulfilled" ? "Part of your order is on its way" : "On its way", detail: ships.length ? "Your parcel has left the printer. Use the tracking details below." : "Your order has been printed and is being handed to the courier. Tracking appears here as soon as it is added.", issue: false };
  }
  if (["in-production", "sending-to-production", "sending_to_production_delegate", "sending_to_production_delegate_sync"].includes(status)) {
    return { stage: 1, title: "Being printed", detail: "Your tee is being printed just for you. Tracking appears here once it ships.", issue: false };
  }
  if (["has-issues", "on-hold", "unfulfillable", "source-check-failed", "payment-not-received"].includes(status)) {
    return { stage: 0, title: "We're checking your order", detail: "Something needs a quick look on our side. We'll be in touch by email if we need anything from you.", issue: true };
  }
  return { stage: 0, title: "Order received", detail: "We have your order and it's about to go to print.", issue: false };
}

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
  if (req.method !== "POST") return json(405, { error: "Method not allowed" }, { allow: "POST" });
  if (!sameOrigin(req)) return json(403, { error: "Forbidden" });
  const ip = (req.headers.get("x-nf-client-connection-ip") || (req.headers.get("x-forwarded-for") || "").split(",")[0] || "unknown").trim();
  if (throttled(ip)) return json(429, { error: "Too many tries. Please wait a few minutes and try again." });

  let input;
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY) return json(413, { error: "That request is too large." });
    input = JSON.parse(raw);
  } catch { return json(400, { error: "Something is off with that request. Refresh and try again." }); }

  const ref = String((input && input.ref) || "").trim().toUpperCase().replace(/\s+/g, "");
  const email = String((input && input.email) || "").trim().toLowerCase();
  if (!REF_RE.test(ref) || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) return json(404, { error: NOT_FOUND });

  try {
    const cat = loadCatalogue();
    // Test-mode orders are labelled TEST-<ref>; try the live label first.
    const order = (await findOrderByLabel(ref)) || (await findOrderByLabel("TEST-" + ref));
    const orderEmail = order && order.address_to && String(order.address_to.email || "").trim().toLowerCase();
    if (!order || !orderEmail || orderEmail !== email) { log("track_miss", { found: !!order }); return json(404, { error: NOT_FOUND }); }
    const d = describeOrder(order);
    const shipments = (Array.isArray(order.shipments) ? order.shipments : []).filter(s => s && (s.number || s.url)).map(s => ({
      carrier: prettyCarrier(s.carrier),
      number: s.number ? String(s.number).slice(0, 60) : "",
      url: httpsOnly(s.url) || (s.number ? "https://t.17track.net/en#nums=" + encodeURIComponent(String(s.number).slice(0, 60)) : null),
      deliveredAt: s.delivered_at ? String(s.delivered_at).slice(0, 10) : "",
    }));
    log("track_ok", { stage: d.stage, shipments: shipments.length });
    return json(200, { ref, stage: d.stage, title: d.title, detail: d.detail, issue: d.issue, placedAt: order.created_at ? String(order.created_at).slice(0, 10) : "", items: itemsOf(order, cat), shipments });
  } catch (e) {
    log("track_error", { status: e && e.status, name: e && e.name });
    return json(503, { error: "Tracking is temporarily unavailable. Please try again in a few minutes." });
  }
}
