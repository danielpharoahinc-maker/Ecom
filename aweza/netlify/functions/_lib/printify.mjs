// Minimal Printify v1 client for order fulfilment.
// Reference: https://developers.printify.com/ (Orders)

import { fetchWithTimeout } from "./http.mjs";

export const PRINTIFY_API = "https://api.printify.com/v1";
export const DEFAULT_SHOP_ID = "29483178";

export const shopId = () => String(process.env.PRINTIFY_SHOP_ID || DEFAULT_SHOP_ID).trim();

function headers() {
  const token = process.env.PRINTIFY_API_TOKEN;
  if (!token) throw Object.assign(new Error("PRINTIFY_API_TOKEN is not set"), { code: "config" });
  return {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
    "user-agent": "AWEZA-Netlify/1.0",
  };
}

export class PrintifyError extends Error {
  constructor(status, message, body) { super(message); this.status = status; this.body = body; }
}

async function call(method, pathname, body, ms = 6000) {
  const res = await fetchWithTimeout(PRINTIFY_API + pathname, {
    method,
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  }, ms);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data && (data.message || (data.errors && data.errors.reason))) || `HTTP ${res.status}`;
    throw new PrintifyError(res.status, String(msg).slice(0, 200), data);
  }
  return data;
}

/**
 * Look through the most recent orders for one we already created for this
 * Yoco checkout. Matches on external_id, Printify's metadata.shop_order_id,
 * or our label (the short order ref).
 */
export async function findExistingOrder({ externalId, label, pages = 3 }) {
  for (let page = 1; page <= pages; page++) {
    const data = await call("GET", `/shops/${shopId()}/orders.json?limit=50&page=${page}`, null, 4000);
    const list = Array.isArray(data.data) ? data.data : [];
    const hit = list.find(o =>
      (externalId && (o.external_id === externalId || (o.metadata && o.metadata.shop_order_id === externalId))) ||
      (label && o.label === label));
    if (hit) return hit;
    if (!data.next_page_url || list.length < 50) break;
  }
  return null;
}

export const createOrder = (order) => call("POST", `/shops/${shopId()}/orders.json`, order, 8000);

export const sendToProduction = (orderId) =>
  call("POST", `/shops/${shopId()}/orders/${encodeURIComponent(orderId)}/send_to_production.json`, {}, 6000);

/** Printify rejecting a repeated external_id counts as "already created". */
export function isDuplicateError(err) {
  if (!(err instanceof PrintifyError) || err.status < 400 || err.status >= 500) return false;
  const text = JSON.stringify(err.body || {}) + " " + err.message;
  return /external[_ ]?id/i.test(text) && /(exist|duplicate|taken|unique|already)/i.test(text);
}
