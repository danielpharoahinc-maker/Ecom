// Paystack webhook verification.
// Reference: https://paystack.com/docs/payments/webhooks/
//   header  x-paystack-signature = HMAC-SHA512(secret key, raw request body), hex.
// There is no separate webhook secret: the same secret key that creates transactions signs the events.
// Paystack has no timestamp header, so replays are harmless by design: the order is created idempotently
// (Printify external_id = the transaction reference) and the amount is re-checked against our own price list.

import crypto from "node:crypto";

export function signPayload(secret, rawBody) {
  return crypto.createHmac("sha512", String(secret)).update(rawBody).digest("hex");
}

/** @returns {{ ok: true } | { ok: false, reason: string }} */
export function verifyWebhook({ secret, signature, rawBody }) {
  if (!secret || !/^sk_(test|live)_/.test(String(secret))) return { ok: false, reason: "secret_missing" };
  if (!signature) return { ok: false, reason: "headers_missing" };
  const expected = Buffer.from(signPayload(secret, rawBody), "utf8");
  const got = Buffer.from(String(signature).trim().toLowerCase(), "utf8");
  return got.length === expected.length && crypto.timingSafeEqual(got, expected) ? { ok: true } : { ok: false, reason: "bad_signature" };
}
