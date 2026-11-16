// A private tracking link for emails: https://site/#/track/<order number>.<token>
// The token is an HMAC of the order number, so only the person who got the email can use that link (no email retyping),
// and nobody can make one for another order. Secret: TRACK_SECRET, or else PAYSTACK_SECRET_KEY.
import crypto from "node:crypto";

const secret = () => process.env.TRACK_SECRET || process.env.PAYSTACK_SECRET_KEY || "";

export function trackToken(ref) {
  const s = secret();
  if (!s) return "";
  return crypto.createHmac("sha256", s).update("track:" + String(ref)).digest("hex").slice(0, 24);
}

export function tokenOk(ref, token) {
  const want = trackToken(ref);
  if (!want || typeof token !== "string" || token.length !== want.length) return false;
  return crypto.timingSafeEqual(Buffer.from(want), Buffer.from(token));
}
