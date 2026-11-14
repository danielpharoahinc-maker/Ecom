// Small HTTP helpers shared by the AWEZA functions. No PII in logs, ever.

export const json = (status, body, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...headers,
    },
  });

/** Log a structured line. Only pass non-personal fields (ids, counts, cents). */
export const log = (event, fields = {}) => {
  try { console.log(JSON.stringify({ fn: "aweza", event, ...fields })); } catch { /* ignore */ }
};

/** fetch with a hard timeout. */
export async function fetchWithTimeout(url, opts = {}, ms = 8000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ac.signal });
  } finally {
    clearTimeout(t);
  }
}

/**
 * Best-effort rate limit per visitor (keyed by IP and a name). Serverless instances are short-lived and not shared,
 * so this is a speed bump against scripts and guessing, not a guarantee; the real guards are the signature checks,
 * the email match on tracking, and the server-side pricing.
 */
const hitLog = new Map();
export function rateLimited(req, name, max, windowMs) {
  const ip = (req.headers.get("x-nf-client-connection-ip") || (req.headers.get("x-forwarded-for") || "").split(",")[0] || "unknown").trim().slice(0, 64);
  const key = name + "|" + ip, now = Date.now();
  const list = (hitLog.get(key) || []).filter(t => now - t < windowMs);
  list.push(now); hitLog.set(key, list);
  if (hitLog.size > 5000) hitLog.clear();
  return list.length > max;
}

/** Origin of the deployed site: SITE_URL env, else the request's own origin. */
export function siteOrigin(req) {
  const env = (process.env.SITE_URL || "").trim();
  if (env) {
    try { return new URL(env).origin; } catch { /* fall through */ }
  }
  return new URL(req.url).origin;
}
