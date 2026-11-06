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

/** Origin of the deployed site: SITE_URL env, else the request's own origin. */
export function siteOrigin(req) {
  const env = (process.env.SITE_URL || "").trim();
  if (env) {
    try { return new URL(env).origin; } catch { /* fall through */ }
  }
  return new URL(req.url).origin;
}
