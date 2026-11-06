// Yoco Checkout API webhook verification (Standard Webhooks / Svix scheme).
// Reference: https://developer.yoco.com/guides/online-payments/webhooks/verifying-the-events
//   signed content = `${webhook-id}.${webhook-timestamp}.${rawBody}`
//   key            = base64-decode(secret without the "whsec_" prefix)
//   signature      = base64(HMAC-SHA256(key, signed content))
//   header         = space-separated "v1,<sig>" entries; compare in constant time.
// Yoco recommends a replay window of up to 3 minutes.

import crypto from "node:crypto";

export const TOLERANCE_SECONDS = 180;

export function signPayload(secret, id, timestamp, rawBody) {
  const key = Buffer.from(String(secret).replace(/^whsec_/, ""), "base64");
  return crypto.createHmac("sha256", key).update(`${id}.${timestamp}.${rawBody}`).digest("base64");
}

/**
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function verifyWebhook({ secret, id, timestamp, signature, rawBody, now = Date.now() }) {
  if (!secret || !String(secret).startsWith("whsec_")) return { ok: false, reason: "secret_missing" };
  if (!id || !timestamp || !signature) return { ok: false, reason: "headers_missing" };
  if (!/^\d{1,12}$/.test(String(timestamp))) return { ok: false, reason: "bad_timestamp" };
  const age = Math.abs(now / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > TOLERANCE_SECONDS) return { ok: false, reason: "stale_timestamp" };
  const expected = Buffer.from(signPayload(secret, id, timestamp, rawBody), "utf8");
  const match = String(signature).split(" ").some(entry => {
    const [version, sig] = entry.split(",");
    if (version !== "v1" || !sig) return false;
    const got = Buffer.from(sig, "utf8");
    return got.length === expected.length && crypto.timingSafeEqual(got, expected);
  });
  return match ? { ok: true } : { ok: false, reason: "bad_signature" };
}
