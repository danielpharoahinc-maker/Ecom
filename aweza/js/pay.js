/* AWEZA payments bridge (agent 10).
   window.AW_PAY(order) -> Promise. Sends the order (DIRECTION §11) to the
   create-checkout function, then sends the browser to Yoco's hosted payment
   page. Rejects with Error(userFacingMessage) on failure. No secrets here:
   the server re-prices everything and holds the keys. */
(() => {
  const ENDPOINT = "/.netlify/functions/create-checkout";
  const TIMEOUT_MS = 20000;
  const MSG = {
    offline: "You seem to be offline. Check your connection and try again.",
    timeout: "Payment is taking too long to start. Check your connection and try again.",
    down: "Payments are temporarily unavailable. Please try again in a few minutes.",
    generic: "We couldn't start your payment. Please try again.",
  };

  let inflight = null;

  const attemptId = () => {
    try { if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) { /* fall through */ }
    return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12);
  };

  const safeHttps = (url) => {
    try {
      const u = new URL(url, location.href);
      const yoco = u.hostname === "yoco.com" || u.hostname.endsWith(".yoco.com");
      return (u.protocol === "https:" && yoco) || u.hostname === "localhost" || u.hostname === "127.0.0.1" ? u.href : null;
    } catch (e) { return null; }
  };

  async function pay(order) {
    if (navigator.onLine === false) throw new Error(MSG.offline);
    const ctrl = typeof AbortController === "function" ? new AbortController() : null;
    const timer = setTimeout(() => ctrl && ctrl.abort(), TIMEOUT_MS);
    let res;
    try {
      res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json", "x-aweza-attempt": attemptId() },
        body: JSON.stringify(order || {}),
        credentials: "same-origin",
        cache: "no-store",
        signal: ctrl ? ctrl.signal : undefined,
      });
    } catch (e) {
      throw new Error(e && e.name === "AbortError" ? MSG.timeout : (navigator.onLine === false ? MSG.offline : MSG.down));
    } finally {
      clearTimeout(timer);
    }

    let data = null;
    try { data = await res.json(); } catch (e) { data = null; }

    if (res.ok && data && typeof data.redirectUrl === "string") {
      const url = safeHttps(data.redirectUrl);
      if (!url) throw new Error(MSG.generic);
      location.assign(url);
      // The page is navigating away; never resolve with anything useful.
      return new Promise(() => {});
    }
    if (res.status === 400 || res.status === 413) {
      const m = data && typeof data.error === "string" && data.error.length < 200 ? data.error : MSG.generic;
      throw new Error(m);
    }
    if (res.status === 404 || res.status >= 500) throw new Error(MSG.down);
    throw new Error(MSG.generic);
  }

  // Coming back from Yoco via the back button (bfcache) must allow a new attempt.
  window.addEventListener("pageshow", (e) => { if (e.persisted) inflight = null; });

  window.AW_PAY = (order) => {
    // One payment attempt at a time: a double tap reuses the first request.
    if (inflight) return inflight;
    inflight = pay(order).catch((err) => { inflight = null; throw err; });
    return inflight;
  };
})();
