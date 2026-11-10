/* AWEZA bag drawer + checkout UI. OWNED BY AGENT 06. Prefixes: .bag-* (drawer), .co-* (checkout).
   Fills #cart-root with the drawer, registers AW.route("checkout", ...).
   Order object for window.AW_PAY follows DIRECTION §11 exactly. No card data is ever collected here. */
(() => {
  const AW = window.AW;
  if (!AW) return;

  /* ---------- helpers & defensive fallbacks ---------- */
  const esc = AW.esc || (s => String(s));
  const rand = AW.rand || (n => "R" + Math.round(n));
  const ui = () => AW.ui || {};
  const mq = q => window.matchMedia && window.matchMedia(q).matches;
  const reduced = () => (AW.motion && typeof AW.motion.reduced === "boolean") ? AW.motion.reduced : mq("(prefers-reduced-motion: reduce)");
  const cfg = () => AW.config || { freeDeliveryOver: 2000, delivery: 179 };

  const SVG = (p, s = 20) => `<svg class="bag-ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${p}</svg>`;
  const LOCAL_ICONS = {
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="1"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    "arrow-right": '<path d="M4 12h15M13 6l6 6-6 6"/>',
    "arrow-left": '<path d="M20 12H5M11 6l-6 6 6 6"/>',
    "chevron-down": '<path d="M6 9l6 6 6-6"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="1"/><path d="M3 7l9 6 9-6"/>',
    whatsapp: '<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8c-1-.4-1.9-1.3-2.3-2.3l.8-1-1-2z"/>',
    truck: '<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.5"/><circle cx="17" cy="17.5" r="1.5"/>',
    alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.2v.3"/>',
  };
  const ic = (name, size = 20) => {
    if (name !== "alert" && typeof ui().icon === "function") {
      try { const s = ui().icon(name, { size }); if (s) return s; } catch (e) { /* fall through */ }
    }
    return SVG(LOCAL_ICONS[name] || "", size);
  };

  const fitFor = src => {
    if (typeof ui().fitFor === "function") { try { return ui().fitFor(src); } catch (e) {} }
    return /\/(front|back|folded)\.jpg$/.test(src) ? "contain" : "cover";
  };
  const printSide = p => {
    if (typeof ui().printSide === "function") { try { return ui().printSide(p); } catch (e) {} }
    return ["captain-save", "need-a-hug", "mini-lips"].includes(p.id) ? "front" : "back";
  };
  const thumbFor = p => {
    if (typeof ui().cardImages === "function") {
      try { const c = ui().cardImages(p); if (c && c.primary) return c.primary; } catch (e) {}
    }
    const imgs = p.images || [];
    const side = printSide(p);
    return imgs.find(s => s.includes("/male-" + side + "-")) || imgs.find(s => s.includes("/male-")) || imgs[0] || "";
  };
  const altFor = (p, src) => {
    if (typeof ui().altFor === "function") { try { return ui().altFor(p, src); } catch (e) {} }
    return p.name;
  };
  const thumb = (p, cls = "bag-media") => {
    const src = thumbFor(p);
    return `<span class="${cls} ${cls}--${fitFor(src)}"><img src="${esc(src)}" alt="${esc(altFor(p, src))}" width="1000" height="1000" loading="lazy" decoding="async"></span>`;
  };
  const lipsArt = (cls, eager) => `<img class="${cls}" src="images/brand/art/lips-logo.jpg" alt="" width="724" height="644" ${eager ? "" : 'loading="lazy"'} decoding="async">`;
  const logo = () => {
    if (typeof ui().logo === "function") { try { const s = ui().logo({ size: "sm" }); if (s) return s; } catch (e) {} }
    return '<span class="co-logo-text">AWEZA<sup>™</sup></span>';
  };
  const lock = on => {
    if (typeof ui().lockScroll === "function") { try { ui().lockScroll(on); return; } catch (e) {} }
    document.documentElement.style.overflow = on ? "hidden" : "";
    if (AW.motion) { try { on ? AW.motion.stop && AW.motion.stop() : AW.motion.start && AW.motion.start(); } catch (e) {} }
  };
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const trap = el => {
    if (typeof ui().trapFocus === "function") { try { const r = ui().trapFocus(el); if (typeof r === "function") return r; } catch (e) {} }
    const onKey = e => {
      if (e.key !== "Tab") return;
      const f = AW.$$(FOCUSABLE, el).filter(n => n.offsetParent !== null || n === document.activeElement);
      if (!f.length) { e.preventDefault(); el.focus(); return; }
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === el)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  };
  // Buttons follow base.css anatomy (.btn-label / .btn-icon) so loading + arrow nudge work.
  const btn = (label, o = {}) => {
    const cls = "btn btn--" + (o.variant || "primary") + (o.size ? " btn--" + o.size : "") + (o.block ? " btn--block" : "") + (o.cls ? " " + o.cls : "");
    const inner = (o.icon ? `<span class="btn-icon">${ic(o.icon, 18)}</span>` : "") + `<span class="btn-label"${o.labelAttr ? " " + o.labelAttr : ""}>${esc(label)}</span>` + (o.iconAfter ? `<span class="btn-icon btn-icon--after">${ic(o.iconAfter, 18)}</span>` : "");
    return o.href ? `<a class="${cls}" href="${esc(o.href)}" ${o.attrs || ""}>${inner}</a>` : `<button type="${o.type || "button"}" class="${cls}" ${o.attrs || ""}>${inner}</button>`;
  };
  const plural = n => n + (n === 1 ? " item" : " items");
  const pad2 = n => String(n).padStart(2, "0");
  const lineView = (l, i) => {
    const p = AW.byId(l.id);
    if (!p) return null;
    const unit = AW.priceFor(p, l.size);
    return { ...l, i, p, unit, total: unit * l.qty, key: l.id + "__" + l.size };
  };
  const views = () => AW.cart.lines().map(lineView).filter(Boolean);
  // Products for "You might also like": not in the bag, never real-face prints in marketing slots.
  const NO_MARKETING = ["need-a-hug", "sweet-cupcake"];
  const suggestions = (n = 2) => {
    const inBag = new Set(AW.cart.lines().map(l => l.id));
    const lastCol = (() => { const ls = AW.cart.lines(); const p = ls.length && AW.byId(ls[ls.length - 1].id); return p ? p.collection : null; })();
    const pool = (AW.products || []).filter(p => !inBag.has(p.id) && !NO_MARKETING.includes(p.id));
    pool.sort((a, b) => (b.collection === lastCol) - (a.collection === lastCol));
    return pool.slice(0, n);
  };
  const minPrice = p => Math.min(...(p.sizes || [""]).map(s => AW.priceFor(p, s)));

  /* =========================================================
     BAG DRAWER
     ========================================================= */
  const root = document.getElementById("cart-root");
  let isOpen = false, opener = null, releaseTrap = null, closeTimer = 0, openTimer = 0, staggerNext = false;

  const shell = () => `
    <div class="bag" data-state="closed" hidden>
      <div class="bag-scrim" data-bag-close></div>
      <section class="bag-panel" role="dialog" aria-modal="true" aria-labelledby="bag-title" tabindex="-1">
        <header class="bag-head">
          <h2 class="bag-title" id="bag-title">Your bag<span class="bag-count" aria-hidden="true"></span><span class="visually-hidden bag-count-sr"></span></h2>
          <button type="button" class="bag-close" data-bag-close aria-label="Close bag">${ic("close", 22)}</button>
        </header>
        <div class="bag-ship" aria-live="polite">
          <p class="bag-ship-text"></p>
          <div class="bag-ship-track" role="progressbar" aria-label="Progress to free delivery" aria-valuemin="0" aria-valuemax="100"><span class="bag-ship-fill"></span></div>
        </div>
        <div class="bag-body" data-lenis-prevent></div>
        <footer class="bag-foot"></footer>
      </section>
    </div>`;

  if (root) root.innerHTML = shell();
  const $b = s => root && root.querySelector(s);
  const bagEl = () => $b(".bag");
  const panel = () => $b(".bag-panel");

  function shipState() {
    const over = cfg().freeDeliveryOver, sub = AW.cart.net();
    const pct = over ? Math.max(0, Math.min(100, (sub / over) * 100)) : 100;
    const done = sub >= over;
    return { over, sub, pct, done, text: done ? "Free delivery unlocked. Sharp." : `You're <strong>${esc(rand(over - sub))}</strong> away from free delivery.` };
  }

  function renderHead() {
    const n = AW.cart.count();
    const c = $b(".bag-count"), sr = $b(".bag-count-sr");
    if (c) c.textContent = n ? pad2(n) : "";
    if (sr) sr.textContent = n ? ", " + plural(n) : ", empty";
    const ship = $b(".bag-ship");
    if (!ship) return;
    ship.hidden = !n;
    const s = shipState();
    $b(".bag-ship-text").innerHTML = s.text;
    ship.classList.toggle("is-done", s.done);
    const track = $b(".bag-ship-track");
    track.setAttribute("aria-valuenow", String(Math.round(s.pct)));
    // Width is a transform so it animates cheaply; the element persists between renders.
    $b(".bag-ship-fill").style.transform = `scaleX(${s.pct / 100})`;
  }

  const lineHTML = (v, n) => `
    <li class="bag-line" data-key="${esc(v.key)}" style="--i:${n}">
      <span class="bag-line-no" aria-hidden="true">${pad2(n + 1)}</span>
      <a class="bag-line-thumb" href="#/product/${esc(v.p.id)}" tabindex="-1" aria-hidden="true">${thumb(v.p)}</a>
      <div class="bag-line-info">
        <div class="bag-line-top">
          <a class="bag-line-name" href="#/product/${esc(v.p.id)}">${esc(v.p.name)}</a>
          <span class="bag-line-price">${esc(rand(v.total))}</span>
        </div>
        <p class="bag-line-meta">Size ${esc(v.size)} · ${esc(v.p.colourName || "White")}${v.qty > 1 ? ` <span class="bag-line-each">· ${esc(rand(v.unit))} each</span>` : ""}</p>
        <div class="bag-line-actions">
          <div class="bag-qty" role="group" aria-label="Quantity, ${esc(v.p.name)} size ${esc(v.size)}">
            <button type="button" class="bag-qty-btn" data-qty="-1" data-i="${v.i}" data-fk="minus:${esc(v.key)}" aria-label="${v.qty === 1 ? "Remove" : "Decrease quantity"}">${ic("minus", 16)}</button>
            <output class="bag-qty-val" aria-live="polite">${v.qty}</output>
            <button type="button" class="bag-qty-btn" data-qty="1" data-i="${v.i}" data-fk="plus:${esc(v.key)}" aria-label="Increase quantity">${ic("plus", 16)}</button>
          </div>
          <button type="button" class="bag-remove" data-remove="${v.i}" data-fk="remove:${esc(v.key)}" aria-label="Remove ${esc(v.p.name)}, size ${esc(v.size)}">${ic("trash", 16)}<span>Remove</span></button>
        </div>
      </div>
    </li>`;

  const suggestHTML = () => {
    const s = suggestions(2);
    if (!s.length) return "";
    return `
      <div class="bag-also">
        <p class="bag-label">You might also like</p>
        <ul class="bag-also-list">
          ${s.map(p => `
            <li><a class="bag-also-item" href="#/product/${esc(p.id)}">
              ${thumb(p, "bag-media bag-media--sm")}
              <span class="bag-also-text"><span class="bag-also-name">${esc(p.name)}</span><span class="bag-also-col">${esc(AW.colName ? AW.colName(p.collection) : "")}</span></span>
              <span class="bag-also-price">${esc(rand(minPrice(p)))}</span>
              <span class="bag-also-go">${ic("arrow-right", 18)}</span>
            </a></li>`).join("")}
        </ul>
      </div>`;
  };

  const chipsHTML = cls => (AW.collections || []).map(c => {
    const label = esc(c.name);
    return `<a class="${cls}" href="#/shop/${esc(c.id)}">${label}</a>`;
  }).join("");

  const emptyHTML = () => `
    <div class="bag-empty">
      <div class="bag-empty-art">${lipsArt("bag-empty-lips")}</div>
      <h3 class="bag-empty-title">Your bag is empty.</h3>
      <p class="bag-empty-sub">Bold of you.</p>
      <p class="bag-label">Start with a collection</p>
      <div class="bag-empty-chips">${chipsHTML("bag-chip")}</div>
      ${btn("Find your statement", { href: "#/shop", block: true, iconAfter: "arrow-right", cls: "bag-empty-cta" })}
    </div>`;

  const footHTML = () => {
    const d = AW.cart.delivery();
    return `
      <dl class="bag-sum">
        <div class="bag-sum-row"><dt>Subtotal</dt><dd>${esc(rand(AW.cart.subtotal()))}</dd></div>
        ${AW.cart.discount() ? `<div class="bag-sum-row is-deal"><dt>Multi-buy deal</dt><dd>-${esc(rand(AW.cart.discount()))}</dd></div>` : ""}
        ${AW.cart.referral() ? `<div class="bag-sum-row is-deal"><dt>Friend's gift</dt><dd>-${esc(rand(AW.cart.referral()))}</dd></div>` : ""}
        <div class="bag-sum-row"><dt>Delivery</dt><dd>${d ? esc(rand(d)) : "Free"}</dd></div>
        <div class="bag-sum-row bag-eta"><dt>Estimated arrival</dt><dd>${esc(AW.eta().text)}</dd></div>
        <div class="bag-sum-row bag-sum-total"><dt>Total</dt><dd>${esc(rand(AW.cart.total()))}</dd></div>
      </dl>
      ${btn("Checkout", { href: "#/checkout", block: true, size: "lg", iconAfter: "arrow-right", cls: "bag-checkout", attrs: 'data-fk="checkout"' })}
      <button type="button" class="bag-keep" data-bag-close>Keep shopping</button>`;
  };

  function renderBody() {
    const body = $b(".bag-body"), foot = $b(".bag-foot");
    if (!body) return;
    const vs = views();
    const p = panel();
    p.classList.toggle("is-empty", !vs.length);
    if (!vs.length) {
      body.innerHTML = emptyHTML();
      foot.innerHTML = "";
      foot.hidden = true;
    } else {
      body.innerHTML = `<ul class="bag-lines" aria-label="Items in your bag">${vs.map(lineHTML).join("")}</ul>${suggestHTML()}`;
      foot.hidden = false;
      foot.innerHTML = footHTML();
    }
    if (staggerNext && !reduced()) {
      body.classList.remove("is-stagger"); void body.offsetWidth; body.classList.add("is-stagger");
      staggerNext = false;
    }
  }

  function render() {
    if (!root) return;
    // Keep focus where the user was: same control on the same line, else a sensible neighbour.
    const a = document.activeElement;
    const pnl = panel();
    const fk = a && pnl && pnl.contains(a) ? a.getAttribute("data-fk") : null;
    renderHead();
    renderBody();
    if (isOpen && fk) {
      let target = pnl.querySelector(`[data-fk="${CSS.escape ? CSS.escape(fk) : fk}"]`);
      if (target && target.disabled) target = target.parentElement.querySelector(".bag-qty-btn:not([disabled])");
      if (!target) target = pnl.querySelector(".bag-remove") || pnl.querySelector(".bag-empty-cta") || pnl;
      target.focus({ preventScroll: true });
    }
  }

  function open() {
    const el = bagEl();
    if (!el) return;
    clearTimeout(closeTimer); clearTimeout(openTimer);
    if (isOpen) return;
    isOpen = true;
    const a = document.activeElement;
    opener = a && a !== document.body && !el.contains(a) ? a : null;
    staggerNext = true;
    render();
    el.hidden = false;
    el.setAttribute("data-state", "opening");
    void el.offsetWidth; // commit start state so the transition runs
    el.setAttribute("data-state", "open");
    lock(true);
    releaseTrap = trap(panel());
    const first = panel().querySelector(".bag-close");
    setTimeout(() => { if (isOpen) (first || panel()).focus({ preventScroll: true }); }, reduced() ? 0 : 60);
  }

  function close(opts = {}) {
    const el = bagEl();
    if (!el || !isOpen) return;
    isOpen = false;
    clearTimeout(openTimer);
    el.setAttribute("data-state", "closing");
    if (releaseTrap) { releaseTrap(); releaseTrap = null; }
    lock(false);
    const done = () => { if (!isOpen) { el.hidden = true; el.setAttribute("data-state", "closed"); } };
    closeTimer = setTimeout(done, reduced() ? 0 : 460);
    if (opts.returnFocus !== false) {
      const back = (opener && document.contains(opener) && opener) || document.querySelector("[data-bag-target]");
      if (back && typeof back.focus === "function") back.focus({ preventScroll: true });
    }
    opener = null;
  }

  // Remove with a height collapse, then mutate the cart.
  function removeLine(i, li) {
    const ls = AW.cart.lines();
    if (!ls[i]) return;
    const finish = () => { AW.cart.remove(i); AW.toast && AW.toast("Removed. No hard feelings."); };
    if (!li || reduced() || !li.animate) { finish(); return; }
    const h = li.offsetHeight;
    li.style.overflow = "hidden";
    li.querySelectorAll("button").forEach(b => { b.disabled = true; });
    const anim = li.animate(
      [{ height: h + "px", opacity: 1, transform: "translateX(0)" }, { height: h + "px", opacity: 0, transform: "translateX(24px)", offset: .45 }, { height: "0px", opacity: 0, paddingTop: 0, paddingBottom: 0, transform: "translateX(24px)" }],
      { duration: 420, easing: "cubic-bezier(.65, 0, .35, 1)", fill: "forwards" }
    );
    // Keep focus inside the panel during the collapse.
    if (li.contains(document.activeElement)) panel().focus({ preventScroll: true });
    anim.onfinish = finish;
  }

  if (root) {
    root.addEventListener("click", e => {
      const t = e.target.closest("button, a");
      if (!t || !root.contains(t)) {
        if (e.target.closest("[data-bag-close]")) close();
        return;
      }
      if (t.hasAttribute("data-bag-close")) { e.preventDefault(); close(); return; }
      if (t.hasAttribute("data-qty")) {
        const i = +t.getAttribute("data-i"), d = +t.getAttribute("data-qty");
        const l = AW.cart.lines()[i];
        if (!l) return;
        if (l.qty + d < 1) { removeLine(i, t.closest(".bag-line")); return; }
        if (l.qty + d > 20) { AW.toast && AW.toast("That's the max per order. Calm down."); return; }
        AW.cart.setQty(i, l.qty + d);
        return;
      }
      if (t.hasAttribute("data-remove")) { removeLine(+t.getAttribute("data-remove"), t.closest(".bag-line")); return; }
      if (t.matches("a[href^='#/']")) {
        // Same-hash links (e.g. already on checkout) would not fire a route: close by hand.
        if (t.getAttribute("href") === location.hash) { e.preventDefault(); close({ returnFocus: false }); return; }
        close({ returnFocus: false });
      }
    });
    root.addEventListener("keydown", e => {
      if (e.key === "Escape" && isOpen) { e.preventDefault(); e.stopPropagation(); close(); }
    });
  }

  AW.on("cart:open", open);
  AW.on("cart:close", () => close());
  AW.on("cart:added", () => {
    clearTimeout(openTimer);
    if (isOpen) return;
    if ((location.hash || "").startsWith("#/checkout")) return; // stay calm on checkout
    openTimer = setTimeout(open, reduced() ? 0 : 420);
  });
  AW.on("cart", () => {
    if (isOpen) render(); else renderHead();
    coOnCart();
  });
  AW.on("route", () => { clearTimeout(openTimer); close({ returnFocus: false }); });
  window.addEventListener("keydown", e => { if (e.key === "Escape" && isOpen) close(); });

  /* =========================================================
     CHECKOUT
     ========================================================= */
  const DRAFT_KEY = "aw-checkout-draft";
  const PROVINCES = ["Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo", "Mpumalanga", "Northern Cape", "North West", "Western Cape"];
  const FIELDS = [
    { name: "email", label: "Email", type: "email", ac: "email", im: "email", req: true, sec: "contact", hint: "For your order confirmation." },
    { name: "phone", label: "Mobile number", type: "tel", ac: "tel", im: "tel", req: true, sec: "contact", ph: "082 123 4567", hint: "The courier calls this if they get lost." },
    { name: "firstName", label: "First name", ac: "given-name", req: true, sec: "address", half: true },
    { name: "lastName", label: "Last name", ac: "family-name", req: true, sec: "address", half: true },
    { name: "line1", label: "Street address", ac: "address-line1", req: true, sec: "address" },
    { name: "line2", label: "Apartment, complex or unit", ac: "address-line2", sec: "address", optional: true },
    { name: "suburb", label: "Suburb", ac: "address-level3", sec: "address", half: true, optional: true },
    { name: "city", label: "City or town", ac: "address-level2", req: true, sec: "address", half: true },
    { name: "province", label: "Province", ac: "address-level1", req: true, sec: "address", half: true, select: PROVINCES },
    { name: "postalCode", label: "Postal code", ac: "postal-code", im: "numeric", req: true, sec: "address", half: true, max: 4, ph: "0000" },
    { name: "notes", label: "Delivery notes", sec: "notes", optional: true, area: true, ph: "Gate code, landmarks, the dog's name." },
  ];
  const MSG = {
    email: ["We need your email for the order confirmation.", "That email looks off."],
    phone: ["We need a mobile number for the courier.", "We need a working SA number for the courier."],
    firstName: ["What should we call you?"],
    lastName: ["Your surname, for the courier."],
    line1: ["We need this to deliver your tee."],
    city: ["Which city or town?"],
    province: ["Pick your province."],
    postalCode: ["We need your postal code.", "Four digits, please."],
  };

  const normPhone = raw => {
    const d = String(raw || "").replace(/[\s\-().]/g, "");
    let m;
    if ((m = d.match(/^0(\d{9})$/))) return "+27" + m[1];
    if ((m = d.match(/^\+?27(\d{9})$/))) return "+27" + m[1];
    return null;
  };
  const prettyPhone = p => p ? p.replace(/^\+27(\d{2})(\d{3})(\d{4})$/, "+27 $1 $2 $3") : "";
  const validate = (name, raw) => {
    const v = String(raw || "").trim();
    const m = MSG[name];
    if (!m) return "";
    if (!v) return m[0];
    if (name === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return m[1];
    if (name === "phone" && !normPhone(v)) return m[1];
    if (name === "postalCode" && !/^\d{4}$/.test(v)) return m[1];
    if (name === "province" && !PROVINCES.includes(v)) return m[0];
    return "";
  };

  const loadDraft = () => { try { return JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "{}") || {}; } catch (e) { return {}; } };
  const saveDraft = form => {
    const d = {};
    FIELDS.forEach(f => { const el = form.elements[f.name]; if (el) d[f.name] = el.value; });
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch (e) {}
  };
  const clearDraft = () => { try { sessionStorage.removeItem(DRAFT_KEY); } catch (e) {} };

  const fieldHTML = (f, draft) => {
    const id = "co-" + f.name;
    const val = draft[f.name] || "";
    const desc = [f.hint ? id + "-hint" : "", id + "-err"].filter(Boolean).join(" ");
    const common = `id="${id}" name="${f.name}" ${f.ac ? `autocomplete="${f.ac}"` : ""} ${f.req ? 'required aria-required="true"' : ""} aria-describedby="${desc}"`;
    let control;
    if (f.select) {
      control = `<select class="select co-input" ${common}>
          <option value="" ${val ? "" : "selected"} disabled>Select a province</option>
          ${f.select.map(o => `<option ${o === val ? "selected" : ""}>${esc(o)}</option>`).join("")}
        </select>`;
    } else if (f.area) {
      control = `<textarea class="co-input co-textarea" rows="3" ${common} maxlength="300" ${f.ph ? `placeholder="${esc(f.ph)}"` : ""}>${esc(val)}</textarea>`;
    } else {
      control = `<input class="co-input" type="${f.type || "text"}" ${common} ${f.im ? `inputmode="${f.im}"` : ""} ${f.max ? `maxlength="${f.max}" pattern="\\d{4}"` : ""} ${f.ph ? `placeholder="${esc(f.ph)}"` : ""} ${f.name === "email" ? 'spellcheck="false" autocapitalize="off"' : ""} value="${esc(val)}">`;
    }
    return `
      <div class="field co-field${f.half ? " co-field--half" : ""}${f.name === "postalCode" ? " co-field--postal" : ""}" data-field="${f.name}">
        <label for="${id}">${esc(f.label)}${f.optional ? ' <span class="field-optional">Optional</span>' : ""}</label>
        ${control}
        ${f.hint ? `<p class="field-hint co-hint" id="${id}-hint">${esc(f.hint)}</p>` : ""}
        <p class="field-error co-err" id="${id}-err" aria-live="polite"></p>
      </div>`;
  };

  const SECTIONS = [
    { id: "contact", n: "01", title: "Contact", note: "Where we send the receipt." },
    { id: "address", n: "02", title: "Delivery address", note: "South Africa only, for now." },
    { id: "notes", n: "03", title: "Delivery notes", note: "For the courier, not for us." },
  ];

  const summaryLines = vs => vs.map(v => `
    <li class="co-line">
      <span class="co-line-thumb">${thumb(v.p, "bag-media")}<span class="co-line-qty" aria-label="Quantity ${v.qty}">${v.qty}</span></span>
      <span class="co-line-text">
        <span class="co-line-name">${esc(v.p.name)}</span>
        <span class="co-line-meta">Size ${esc(v.size)} · ${esc(v.p.colourName || "White")}${v.qty > 1 ? ` · ${v.qty} × ${esc(rand(v.unit))}` : ""}</span>
      </span>
      <span class="co-line-price">${esc(rand(v.total))}</span>
    </li>`).join("");

  const totalsHTML = () => {
    const d = AW.cart.delivery(), s = shipState();
    return `
      <dl class="co-totals">
        <div class="co-trow"><dt>Subtotal</dt><dd>${esc(rand(AW.cart.subtotal()))}</dd></div>
        ${AW.cart.discount() ? `<div class="co-trow is-deal"><dt>Multi-buy deal</dt><dd>-${esc(rand(AW.cart.discount()))}</dd></div>` : ""}
        ${AW.cart.referral() ? `<div class="co-trow is-deal"><dt>Friend's gift</dt><dd>-${esc(rand(AW.cart.referral()))}</dd></div>` : ""}
        ${AW.cart.nudge() ? `<p class="co-nudge">${esc(AW.cart.nudge())} (${esc(AW.dealLabel())})</p>` : ""}
        <div class="co-trow"><dt>Delivery</dt><dd>${d ? esc(rand(d)) : "Free"}</dd></div>
        <div class="co-trow co-eta"><dt>Estimated arrival</dt><dd>${esc(AW.eta().text)}</dd></div>
        ${s.done ? "" : `<p class="co-nudge">Add ${esc(rand(s.over - s.sub))} more for free delivery.</p>`}
        <div class="co-trow co-trow--total"><dt>Total</dt><dd>${esc(rand(AW.cart.total()))}</dd></div>
      </dl>
      <p class="co-rand">Prices in Rand.</p>`;
  };

  const summaryHTML = vs => `
    <aside class="co-summary" aria-labelledby="co-sum-title">
      <button type="button" class="co-sum-toggle" aria-expanded="false" aria-controls="co-sum-body">
        <span class="co-sum-toggle-label"><span class="co-sum-show">Show order summary</span><span class="co-sum-hide">Hide order summary</span></span>
        <span class="co-sum-toggle-total"><span class="co-dot" aria-hidden="true">·</span> <span data-co-total>${esc(rand(AW.cart.total()))}</span></span>
        ${ic("chevron-down", 18)}
      </button>
      <div class="co-sum-body" id="co-sum-body">
        <div class="co-receipt">
          <div class="co-receipt-head">
            <span class="co-logo">${logo()}</span>
            <span class="co-receipt-fig">Order summary · ${esc(plural(AW.cart.count()))}</span>
          </div>
          <h2 class="visually-hidden" id="co-sum-title">Order summary</h2>
          <ul class="co-lines">${summaryLines(vs)}</ul>
          <div class="co-totals-wrap">${totalsHTML()}</div>
          <button type="button" class="co-edit" data-co-editbag>Edit bag</button>
          <p class="co-signoff">Time of your life.</p>
        </div>
      </div>
    </aside>`;

  /* Apple Pay / Google Pay: the secure payment page (Yoco) offers both and asks for Face ID, Touch ID or a fingerprint.
     We cannot show the wallet sheet on this page, so we tell people what to expect on their device. */
  const walletKind = () => {
    let apple = false;
    try { apple = !!(window.ApplePaySession && window.ApplePaySession.canMakePayments()); } catch (e) {}
    return apple ? "apple" : /Android/i.test(navigator.userAgent || "") ? "google" : "other";
  };
  const walletLine = () => ({
    apple: "Apple Pay works on this device. Tap Pay, then confirm with Face ID or Touch ID. No card number to type.",
    google: "Google Pay works on the next screen. Tap Pay, then confirm with your fingerprint or face. No card number to type.",
    other: "On the next screen, choose Apple Pay, Google Pay or card.",
  })[walletKind()];
  const payLabel = () => `Pay ${rand(AW.cart.total())}`;

  function checkoutForm(app) {
    const vs = views();
    if (!vs.length) { app.innerHTML = resultShell("empty"); return; }
    const draft = loadDraft();
    app.innerHTML = `
      <div class="co" data-co>
        <div class="co-grid">
          ${summaryHTML(vs)}
          <div class="co-main">
            <div class="co-bar">
              <ol class="co-steps" aria-label="Checkout steps">
                <li><button type="button" class="co-step-link" data-co-editbag>Bag</button></li>
                <li aria-current="step"><span>Delivery details</span></li>
                <li><span>Payment</span></li>
              </ol>
              <span class="co-secure">${ic("lock", 14)} Secure checkout</span>
            </div>
            <header class="co-head">
              <p class="co-eyebrow">Delivery details</p>
              <h1 class="co-title">Nearly <em>yours.</em></h1>
              <p class="co-lede">Tell us where it's going. Takes about a minute.</p>
            </header>
            <form class="co-form" novalidate>
              ${SECTIONS.map(s => `
                <fieldset class="co-sec co-sec--${s.id}">
                  <legend class="co-sec-head"><span class="co-sec-n">${s.n}</span><span class="co-sec-title">${s.title}</span><span class="co-sec-note">${s.note}</span></legend>
                  <div class="co-fields">${FIELDS.filter(f => f.sec === s.id).map(f => fieldHTML(f, draft)).join("")}</div>
                </fieldset>`).join("")}
              <div class="co-pay-wrap">
                <div class="co-alert" role="alert" hidden></div>
                <div class="co-wallets" data-wallet="${walletKind()}">
                  <ul class="co-wallet-marks" aria-label="Ways to pay">
                    <li>Apple Pay</li><li>Google Pay</li><li>Card</li>
                  </ul>
                  <p class="co-wallet-line">${walletLine()}</p>
                </div>
                ${btn(payLabel(), { type: "submit", block: true, size: "lg", icon: "lock", cls: "co-pay", labelAttr: "data-co-paylabel" })}
                <p class="co-fine">You'll pay on Yoco's secure payment page. We never see or store your card details.</p>
                <div class="co-soon" hidden tabindex="-1">
                  <span class="co-soon-mark" aria-hidden="true">${lipsArt("co-soon-lips")}</span>
                  <div class="co-soon-text">
                    <p class="co-soon-title">Payments are launching soon.</p>
                    <p class="co-soon-body">Your bag is saved on this device. Want it sooner? Message us and we'll sort you out.</p>
                    <p class="co-soon-links">
                      <a class="co-soon-link" href="#" data-placeholder>${ic("whatsapp", 18)} WhatsApp [Contact link]</a>
                      <a class="co-soon-link" href="#" data-placeholder>${ic("mail", 18)} Email [Contact link]</a>
                    </p>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>`;
    bindCheckout(app);
  }

  function setErr(form, name, msg) {
    const wrap = form.querySelector(`[data-field="${name}"]`);
    if (!wrap) return;
    const el = form.elements[name], err = wrap.querySelector(".co-err");
    wrap.classList.toggle("is-invalid", !!msg);
    wrap.classList.toggle("is-valid", !msg && !!String(el.value).trim());
    el.setAttribute("aria-invalid", msg ? "true" : "false");
    err.textContent = msg || "";
  }

  function bindCheckout(app) {
    const form = app.querySelector(".co-form");
    const toggle = app.querySelector(".co-sum-toggle");
    const sum = app.querySelector(".co-summary");
    const touched = new Set();

    toggle.addEventListener("click", () => {
      const openNow = toggle.getAttribute("aria-expanded") !== "true";
      toggle.setAttribute("aria-expanded", String(openNow));
      sum.classList.toggle("is-open", openNow);
    });
    app.addEventListener("click", e => {
      const t = e.target.closest("[data-co-editbag]");
      if (t) { e.preventDefault(); AW.emit("cart:open"); }
      const ph = e.target.closest("[data-placeholder]");
      if (ph) e.preventDefault();
    });

    form.addEventListener("focusout", e => {
      const el = e.target;
      if (!el.name || !MSG[el.name]) return;
      if (el.name === "phone") { const n = normPhone(el.value); if (n) el.value = prettyPhone(n); }
      if (el.name === "email") el.value = el.value.trim();
      // Only judge a field once the user has had a go at it.
      if (String(el.value).trim() || touched.has(el.name)) { touched.add(el.name); setErr(form, el.name, validate(el.name, el.value)); }
      saveDraft(form);
    });
    form.addEventListener("input", e => {
      const el = e.target;
      if (el.name === "postalCode") el.value = el.value.replace(/\D/g, "").slice(0, 4);
      if (el.name && MSG[el.name] && touched.has(el.name)) {
        const msg = validate(el.name, el.value);
        if (!msg) setErr(form, el.name, "");
      }
      saveDraft(form);
    });
    form.addEventListener("change", e => {
      const el = e.target;
      if (el.tagName === "SELECT") { touched.add(el.name); setErr(form, el.name, validate(el.name, el.value)); saveDraft(form); }
    });

    form.addEventListener("submit", async e => {
      e.preventDefault();
      const alertEl = form.querySelector(".co-alert");
      alertEl.hidden = true; alertEl.innerHTML = "";
      let firstBad = null;
      FIELDS.forEach(f => {
        if (!MSG[f.name]) return;
        touched.add(f.name);
        const msg = validate(f.name, form.elements[f.name].value);
        setErr(form, f.name, msg);
        if (msg && !firstBad) firstBad = form.elements[f.name];
      });
      if (firstBad) {
        firstBad.focus();
        if (firstBad.scrollIntoView) firstBad.scrollIntoView({ block: "center", behavior: reduced() ? "auto" : "smooth" });
        return;
      }
      if (!AW.cart.lines().length) { AW.go("#/checkout"); return; }
      const order = buildOrder(form);
      saveDraft(form);
      const btn = form.querySelector(".co-pay");
      if (typeof window.AW_PAY === "function") {
        btn.classList.add("is-loading");
        btn.disabled = true;
        btn.setAttribute("aria-busy", "true");
        alertEl.className = "co-alert co-alert--status"; alertEl.setAttribute("role", "status");
        alertEl.textContent = "Taking you to secure payment..."; alertEl.hidden = false;
        try {
          await window.AW_PAY(order);
          // A successful AW_PAY redirects. If it resolves without leaving, give control back.
          setTimeout(() => { btn.classList.remove("is-loading"); btn.disabled = false; btn.removeAttribute("aria-busy"); }, 8000);
        } catch (err) {
          btn.classList.remove("is-loading");
          btn.disabled = false;
          btn.removeAttribute("aria-busy");
          alertEl.className = "co-alert"; alertEl.setAttribute("role", "alert");
          const msg = (err && err.message) || "Something went wrong on our side. Try again in a moment.";
          alertEl.innerHTML = `${ic("alert", 18)}<span><strong>That didn't go through.</strong> ${esc(msg)}</span>`;
          alertEl.hidden = false;
        }
      } else {
        const soon = form.querySelector(".co-soon");
        soon.hidden = false;
        btn.hidden = true;
        form.querySelector(".co-fine").hidden = true;
        soon.focus({ preventScroll: true });
        if (soon.scrollIntoView) soon.scrollIntoView({ block: "nearest", behavior: reduced() ? "auto" : "smooth" });
      }
    });
  }

  function buildOrder(form) {
    const v = n => String((form.elements[n] && form.elements[n].value) || "").trim();
    return {
      lines: AW.cart.lines().map(l => ({ id: l.id, size: l.size, qty: l.qty })),
      customer: { email: v("email"), phone: normPhone(v("phone")) || v("phone"), firstName: v("firstName"), lastName: v("lastName") },
      address: { line1: v("line1"), line2: v("line2"), suburb: v("suburb"), city: v("city"), province: v("province"), postalCode: v("postalCode"), country: "ZA" },
      notes: v("notes"),
      ref: AW.referral.code(),
      totals: { subtotal: Math.round(AW.cart.subtotal()), discount: Math.round(AW.cart.discount()), referral: Math.round(AW.cart.referral()), delivery: Math.round(AW.cart.delivery()), total: Math.round(AW.cart.total()), currency: "ZAR" },
    };
  }

  // Bag edited (e.g. from the drawer) while on checkout: refresh summary + pay label in place.
  function coOnCart() {
    const co = document.querySelector("[data-co]");
    if (!co) return;
    if (!AW.cart.lines().length) { checkoutForm(AW.app); return; }
    const vs = views();
    const lines = co.querySelector(".co-lines"); if (lines) lines.innerHTML = summaryLines(vs);
    const tw = co.querySelector(".co-totals-wrap"); if (tw) tw.innerHTML = totalsHTML();
    const fig = co.querySelector(".co-receipt-fig"); if (fig) fig.textContent = "Order summary · " + plural(AW.cart.count());
    co.querySelectorAll("[data-co-total]").forEach(n => { n.textContent = rand(AW.cart.total()); });
    const pl = co.querySelector("[data-co-paylabel]"); if (pl) pl.textContent = payLabel();
  }

  /* ---------- result pages ---------- */
  const RESULTS = {
    empty: {
      fig: "Checkout",
      title: "Nothing to check out <em>yet.</em>",
      lede: "Your bag is empty. Bold of you.",
      body: "",
      actions: btn("Find your statement", { href: "#/shop", size: "lg", iconAfter: "arrow-right" }),
      chips: true,
    },
    success: {
      fig: "Order confirmed",
      title: "Paid. Good <em>decision.</em>",
      lede: `Your order is in. We print it fresh and ship it to your door. Estimated arrival: ${AW.eta().text}. A confirmation is on its way to your inbox.`,
      steps: [
        ["Printed to order", "Your tee gets printed now, just for you. No warehouse of leftovers."],
        ["On its way", `Delivered across South Africa in ${AW.eta().days[0]} to ${AW.eta().days[1]} working days. Estimated arrival: ${AW.eta().text}.`],
        ["Check your inbox", "Your confirmation is there now. Tracking follows when it ships."],
      ],
      actions: btn("Back to the shop", { href: "#/shop", size: "lg", iconAfter: "arrow-right" }),
    },
    cancelled: {
      fig: "Payment cancelled",
      title: "Payment <em>cancelled.</em>",
      lede: "Your bag is still here. Nothing was charged.",
      actions: btn("Back to checkout", { href: "#/checkout", size: "lg", iconAfter: "arrow-right" }) + `<a class="co-textlink" href="#/shop">Keep shopping</a>`,
    },
    failed: {
      fig: "Payment failed",
      title: "That didn't <em>go through.</em>",
      lede: "Nothing was charged. Your bag is still here. Try again or use another card.",
      actions: btn("Try again", { href: "#/checkout", size: "lg", iconAfter: "arrow-right" }) + `<a class="co-textlink" href="#/help">Get help</a>`,
    },
  };

  function resultShell(kind) {
    const r = RESULTS[kind];
    return `
      <section class="co-result co-result--${kind}" data-co-result>
        <div class="co-result-grid">
          <div class="co-result-text">
            <p class="co-result-fig"><span>${esc(r.fig)}</span>${kind === "success" ? "<span>Drop 01 / 2026</span>" : ""}</p>
            <h1 class="co-result-title">${r.title}</h1>
            <p class="co-result-lede">${esc(r.lede)}</p>
            ${r.steps ? `<ol class="co-next">${r.steps.map((s, i) => `<li><span class="co-next-n">${pad2(i + 1)}</span><span class="co-next-t">${esc(s[0])}</span><span class="co-next-d">${esc(s[1])}</span></li>`).join("")}</ol>` : ""}
            ${r.chips ? `<div class="co-result-chips">${chipsHTML("bag-chip")}</div>` : ""}
            <div class="co-result-actions">${r.actions}</div>
          </div>
          <div class="co-result-art" aria-hidden="true">${lipsArt("co-result-lips", true)}</div>
        </div>
      </section>`;
  }

  AW.route("checkout", (app, arg) => {
    document.title = "Checkout | AWEZA";
    if (arg === "success") {
      // Paid: empty the bag and forget the form.
      while (AW.cart.lines().length) AW.cart.remove(0);
      clearDraft();
      app.innerHTML = resultShell("success");
      return;
    }
    if (arg === "cancelled" || arg === "failed") { app.innerHTML = resultShell(arg); return; }
    checkoutForm(app);
  });

  // Initial head state (count badge in the drawer) once the cart is known.
  renderHead();
})();
