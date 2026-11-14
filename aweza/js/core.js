/* AWEZA core: shared helpers, cart state, router, events. OWNED BY THE INTEGRATOR. Do not edit.
   Public API (use only these):
     AW.$(sel, el?)  AW.$$(sel, el?)  AW.esc(str)  AW.rand(n) -> "R649"
     AW.byId(id)  AW.colName(id)  AW.priceFor(product, size)  AW.config  AW.products  AW.collections
     AW.app                          the <main id="app"> element
     AW.route(name, fn(app, arg))    register a page. URLs are #/name/arg. Home is name "". Not-found is "404".
     AW.go(hash)                     navigate
     AW.cart.lines() -> [{id,size,qty}]  .add(id,size)  .setQty(i,q)  .remove(i)
            .count()  .subtotal()  .delivery()  .total()
     AW.on(evt, fn)  AW.emit(evt, detail)
       events: "route" {page,arg} after a page renders; "cart" after any cart change;
               "cart:added" {id,size} after add(); "toast" {msg}; "cart:open" request to open the bag
     AW.toast(msg)
   Script load order: data/products.js, js/core.js, other modules, then js/boot.js (calls AW.start()). */
(() => {
  const AW = window.AW;
  AW.$ = (s, el = document) => el.querySelector(s);
  AW.$$ = (s, el = document) => [...el.querySelectorAll(s)];
  AW.esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  AW.rand = n => "R" + Math.round(n).toLocaleString("en-ZA").replace(/[  ]/g, " ");
  AW.byId = id => AW.products.find(p => p.id === id);
  AW.colName = id => (AW.collections.find(c => c.id === id) || {}).name || "";

  const bus = new EventTarget();
  AW.on = (e, fn) => bus.addEventListener(e, ev => fn(ev.detail));
  AW.emit = (e, detail) => bus.dispatchEvent(new CustomEvent(e, { detail }));
  AW.toast = msg => AW.emit("toast", { msg });

  // Cart (saved in this browser)
  const KEY = "aweza-cart-v2";
  let lines = [];
  try { lines = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { lines = []; }
  if (!Array.isArray(lines)) lines = [];
  // Whatever is in storage is untrusted: keep only well-formed lines (known tee, known size, whole quantity 1 to 20).
  lines = lines.filter(l => l && typeof l.id === "string" && AW.byId(l.id) && typeof l.size === "string" && AW.byId(l.id).sizes.includes(l.size))
    .map(l => ({ id: l.id, size: l.size, qty: Math.max(1, Math.min(20, Math.floor(Number(l.qty)) || 1)) }));
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch {} AW.emit("cart"); };
  /* Multi-buy ("2 for R700"): tees are grouped in sets of deal.qty, dearest base prices together, and each full
     set costs deal.price instead of its base prices. Size extras are paid on top. Mirrored on the server in
     netlify/functions/_lib/catalogue.mjs; keep the two the same. */
  AW.bestDeal = (bases, deals) => {            // biggest saving from splitting these base prices into deal sets
    const u = bases.slice().sort((a, b) => b - a), best = new Array(u.length + 1).fill(0);
    for (let i = 1; i <= u.length; i++) {
      best[i] = best[i - 1];
      for (const d of deals) if (i >= d.qty) best[i] = Math.max(best[i], best[i - d.qty] + Math.max(0, u.slice(i - d.qty, i).reduce((a, b) => a + b, 0) - d.price));
    }
    return best[u.length];
  };
  const dealUnits = ls => { const u = []; ls.forEach(l => { const p = AW.byId(l.id); if (p && !p.noDeal) for (let k = 0; k < l.qty; k++) u.push(p.price); }); return u; };
  AW.dealDiscount = ls => AW.bestDeal(dealUnits(ls), AW.config.deals || []);
  AW.dealLabel = () => (AW.config.deals || []).map(d => `${d.qty} for ${AW.rand(d.price)}`).join(" · ");
  AW.dealNudge = ls => {                      // "add one more and save R..." (squad order)
    const u = dealUnits(ls), deals = AW.config.deals || []; if (!u.length || !deals.length) return "";
    const now = AW.bestDeal(u, deals), next = AW.bestDeal(u.concat([Math.min(...u)]), deals);
    return next > now ? `Add one more tee and your deal saves ${AW.rand(next)} in total.` : "";
  };
  /* Refer a friend: ?ref=CODE on the link is remembered; your own code is made once and kept. */
  const REF_RE = /^[A-Za-z0-9]{4,16}$/;
  let friend = "", mine = "";
  try {
    const q = new URLSearchParams(location.search).get("ref");
    if (q && REF_RE.test(q)) localStorage.setItem("aweza-ref", q);
    friend = localStorage.getItem("aweza-ref") || "";
    mine = localStorage.getItem("aweza-mycode") || "";
    if (!mine) { mine = "AW" + Math.random().toString(36).slice(2, 8).toUpperCase(); localStorage.setItem("aweza-mycode", mine); }
  } catch { if (!mine) mine = "AW" + Math.random().toString(36).slice(2, 8).toUpperCase(); }
  AW.referral = {
    code: () => (friend && friend !== mine && REF_RE.test(friend) ? friend : ""),
    mine: () => mine,
    link: () => location.origin + location.pathname + "?ref=" + mine,
  };
  /* Delivery estimate: a window of working days from today (weekends and listed public holidays skipped).
     AW.eta(date?) -> { from: Date, to: Date, text: "Wed 26 Nov to Fri 12 Dec", days: [lo, hi], peak: bool } */
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const ymd = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const addWorkingDays = (start, n, holidays) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    while (n > 0) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0 && d.getDay() !== 6 && !holidays.includes(ymd(d))) n--; }
    return d;
  };
  AW.eta = (date = new Date()) => {
    const c = AW.config.shipping || { days: [12, 20] };
    const md = String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
    const pk = c.peak, peak = !!pk && (pk.from <= pk.to ? md >= pk.from && md <= pk.to : md >= pk.from || md <= pk.to);
    const extra = peak ? pk.extra : 0, lo = c.days[0] + extra, hi = c.days[1] + extra, hol = c.holidays || [];
    const from = addWorkingDays(date, lo, hol), to = addWorkingDays(date, hi, hol);
    const fmt = d => DAYS[d.getDay()] + " " + d.getDate() + " " + MONTHS[d.getMonth()];
    return { from, to, days: [lo, hi], peak, text: fmt(from) + " to " + fmt(to) };
  };
  /* The struck-through "was" price for a tee (and size), or 0 when none applies: switched off, expired, or not above
     the real price. Size extras are added to both, so the saving is the same for every size. */
  AW.was = (p, size) => {
    const w = AW.config.was; if (!w || !p || p.noWas) return 0;
    if (w.until && Date.parse(w.until + "T23:59:59+02:00") < Date.now()) return 0;
    const now = AW.priceFor(p, size), was = w.price + (now - p.price);
    return was > now ? was : 0;
  };
  AW.priceHTML = (p, size) => {
    const now = AW.priceFor(p, size), was = AW.was(p, size);
    return was ? `<s class="pk-was"><span class="visually-hidden">Was </span>${AW.rand(was)}</s> <span class="pk-now"><span class="visually-hidden">Now </span>${AW.rand(now)}</span>` : AW.rand(now);
  };
  AW.drop = () => {
    const d = AW.config.drop; if (!d) return null;
    return { name: d.name, label: d.label, closed: Date.parse(d.ends + "T23:59:59+02:00") < Date.now() };
  };
  AW.cart = {
    lines: () => lines.map(l => ({ ...l })),
    add(id, size) {
      const l = lines.find(x => x.id === id && x.size === size);
      l ? (l.qty = Math.min(l.qty + 1, 20)) : lines.push({ id, size, qty: 1 });
      save(); AW.emit("cart:added", { id, size });
    },
    setQty(i, q) { if (!lines[i]) return; if (q < 1) lines.splice(i, 1); else lines[i].qty = Math.min(q, 20); save(); },
    remove(i) { lines.splice(i, 1); save(); },
    count: () => lines.reduce((n, l) => n + l.qty, 0),
    subtotal: () => lines.reduce((n, l) => n + l.qty * AW.priceFor(AW.byId(l.id), l.size), 0),
    discount: () => AW.dealDiscount(lines),
    referral() { const r = AW.config.referral; return r && AW.referral.code() && this.subtotal() - this.discount() >= r.minSubtotal ? r.amount : 0; },
    nudge: () => AW.dealNudge(lines),
    net() { return this.subtotal() - this.discount() - this.referral(); },
    delivery() { const s = this.net(); return !s || s >= AW.config.freeDeliveryOver ? 0 : AW.config.delivery; },
    total() { return this.net() + this.delivery(); },
  };

  // Router
  const routes = {};
  AW.app = document.getElementById("app");
  AW.route = (name, fn) => { routes[name] = fn; };
  AW.go = h => { location.hash = h; };
  function render() {
    if (AW.railHandles && AW.railHandles(location.hash)) return;   // rail <-> tee moves are handled in place
    const [, page = "", arg] = (location.hash || "#/").split("/");
    const fn = routes[page] || routes["404"] || (app => { app.innerHTML = "<p style='padding:40px'>Not found</p>"; });
    AW.app.innerHTML = "";
    fn(AW.app, arg ? decodeURIComponent(arg) : undefined);
    window.scrollTo(0, 0);
    AW.emit("route", { page, arg });
  }
  AW.start = () => { window.addEventListener("hashchange", render); render(); AW.emit("cart"); };
})();
