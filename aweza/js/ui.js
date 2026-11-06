/* AWEZA shared UI (AW.ui). OWNED BY AGENT 01 (design system).
   Every helper returns an HTML string unless noted, and escapes its own text with AW.esc.
   API (fixed, see docs/DIRECTION.md section 8):
     img(src, {alt, ratio, fit, eager, className, sizes})   fitFor(src)   printSide(p)
     modelShot(p, side)   cardImages(p)   artFor(id)   altFor(p, src)
     card(p, {size, eager, quickAdd, index})   btn(label, {href, variant, size, icon, iconAfter, block, attrs})
     icon(name, {size, label})   price(p, size)   badge(text, {tone})   chip(label, {active, attrs})
     eyebrow(text)   sectionHead({eyebrow, title, accent, link})   logo({size, tagline, tone})
     lockScroll(on)   trapFocus(el) -> release()   toast(msg) */
(() => {
  const AW = window.AW = window.AW || {};
  const ui = AW.ui = AW.ui || {};
  const esc = s => (AW.esc ? AW.esc(s == null ? "" : s) : String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])));
  const root = document.documentElement;
  root.classList.add("ui-ready");

  /* Input mode: html.ui-touch while the last pointer was a finger (hides hover-only UI like quick add). */
  const mq = q => (window.matchMedia ? window.matchMedia(q).matches : false);
  const setTouch = on => root.classList.toggle("ui-touch", !!on);
  setTouch(mq("(hover: none)") || (mq("(pointer: coarse)") && !mq("(any-pointer: fine)")));
  window.addEventListener("pointerdown", e => setTouch(e.pointerType === "touch" || e.pointerType === "pen"), { passive: true, capture: true });
  window.addEventListener("touchstart", () => setTouch(true), { passive: true, capture: true });
  window.addEventListener("pointermove", e => { if (e.pointerType === "mouse" && root.classList.contains("ui-touch") && mq("(any-hover: hover)")) setTouch(false); }, { passive: true });
  ui.isTouch = () => root.classList.contains("ui-touch");

  /* ---------- images ---------- */
  const fileOf = src => String(src || "").split("?")[0].split("/").pop().replace(/\.[a-z0-9]+$/i, "");

  ui.fitFor = src => {
    const f = fileOf(src);
    if (/^(male-|collar|hanging)/.test(f)) return "cover";
    return "contain"; // front, back, folded, brand art, anything unknown
  };

  const FRONT_PRINT = ["captain-save", "need-a-hug", "mini-lips"];
  ui.printSide = p => (p && FRONT_PRINT.includes(p.id) ? "front" : "back");

  const imagesOf = p => (p && Array.isArray(p.images) ? p.images : []);
  const findFile = (p, test) => imagesOf(p).find(s => test(fileOf(s)));

  ui.modelShot = (p, side) => {
    side = side || ui.printSide(p);
    return findFile(p, f => f.indexOf("male-" + side + "-") === 0)
      || findFile(p, f => f.indexOf("male-") === 0)
      || imagesOf(p)[0] || "";
  };

  /* Real-faces rule (DIRECTION section 6): these cards lead with the side that does not carry the face. */
  const FACE_SAFE = { "need-a-hug": "back", "sweet-cupcake": "front" };
  ui.cardImages = p => {
    const imgs = imagesOf(p);
    const safe = p && FACE_SAFE[p.id];
    if (safe) {
      const worn = findFile(p, f => f.indexOf("male-" + safe + "-") === 0);
      const flat = findFile(p, f => f === safe);
      const primary = worn || flat || imgs[0] || "";
      const alt = (worn ? flat : findFile(p, f => f === "collar" || f === "folded")) || imgs.find(s => s !== primary) || "";
      return { primary, alt };
    }
    const primary = imgs[0] || "";
    const flat = findFile(p, f => f === ui.printSide(p));
    const alt = (flat && flat !== primary ? flat : imgs[1]) || "";
    return { primary, alt };
  };

  const ART = {
    "ceo-of-bad-decisions": "ceo-print", "zero-exes": "zero-exes-print", "need-a-hug": "need-a-hug-print",
    "sweet-cupcake": "sweet-cupcake-print", "captain-save": "captain-save-sheet", "signature-lips": "lips-logo",
  };
  ui.artFor = id => (ART[id] ? "images/brand/art/" + ART[id] + ".jpg" : null);

  ui.altFor = (p, src) => {
    const name = (p && p.name) || "AWEZA tee";
    const f = fileOf(src);
    const s = String(src || "");
    let view = "";
    if (s.indexOf("brand/art/") > -1) view = "print artwork";
    else if (/^male-front/.test(f)) view = "worn front";
    else if (/^male-back/.test(f)) view = "worn back";
    else if (/^male-duo/.test(f)) view = "two models";
    else if (/^male-sleeve/.test(f)) view = "sleeve detail";
    else if (/^collar/.test(f)) view = "collar detail";
    else if (/^folded/.test(f)) view = "folded";
    else if (/^hanging/.test(f)) view = "hanging";
    else if (f === "front") view = "front view";
    else if (f === "back") view = "back view";
    return view ? name + ", " + view : name;
  };

  ui.img = (src, o = {}) => {
    const fit = o.fit || ui.fitFor(src);
    const ratio = o.ratio || "1/1";
    const alt = o.alt != null ? o.alt : "";
    const load = o.eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';
    const sizes = o.sizes ? ' sizes="' + esc(o.sizes) + '"' : "";
    const cls = ("media media--" + fit + " " + (o.className || "")).trim();
    return '<div class="' + esc(cls) + '" style="aspect-ratio:' + esc(ratio) + '">'
      + '<img src="' + esc(src) + '" alt="' + esc(alt) + '" width="1000" height="1000" ' + load + ' decoding="async"' + sizes + '></div>';
  };

  /* Fade-in: mark .media and the img when loaded (or failed: never leave an invisible image). */
  const markLoaded = img => {
    if (!img || img.tagName !== "IMG" || img.classList.contains("is-loaded")) return;
    img.classList.add("is-loaded");
    const m = img.closest(".media");
    if (m) m.classList.add("is-loaded");
  };
  const onLoadish = e => { if (e.target && e.target.tagName === "IMG") markLoaded(e.target); };
  document.addEventListener("load", onLoadish, true);
  document.addEventListener("error", onLoadish, true);
  let scanQueued = false;
  const scan = () => {
    scanQueued = false;
    document.querySelectorAll(".media img:not(.is-loaded)").forEach(img => { if (img.complete) markLoaded(img); });
  };
  const queueScan = () => { if (!scanQueued) { scanQueued = true; requestAnimationFrame(scan); } };
  if ("MutationObserver" in window) {
    new MutationObserver(queueScan).observe(document.documentElement, { childList: true, subtree: true });
  }
  document.addEventListener("DOMContentLoaded", queueScan);
  window.addEventListener("load", queueScan);
  ui.refreshMedia = queueScan; // optional: call after injecting markup outside the observed tree

  /* ---------- icons: original 24px drawings, 1.5 stroke, square caps ---------- */
  const ICONS = {
    bag: '<path d="M4.75 8.25h14.5l-1 12.5H5.75z"/><path d="M8.75 10.5V7a3.25 3.25 0 0 1 6.5 0v3.5"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.25"/><path d="M15.25 15.25 20.5 20.5"/>',
    menu: '<path d="M3.5 8h17M3.5 16h11"/>',
    close: '<path d="m5.5 5.5 13 13M18.5 5.5l-13 13"/>',
    "arrow-right": '<path d="M3.75 12h16M14 6.25 19.75 12 14 17.75"/>',
    "arrow-left": '<path d="M20.25 12h-16M10 6.25 4.25 12 10 17.75"/>',
    "arrow-up-right": '<path d="M6.5 17.5 17.5 6.5M8.5 6.5h9v9"/>',
    "chevron-down": '<path d="m6 9.25 6 6 6-6"/>',
    "chevron-left": '<path d="M14.75 6 8.75 12l6 6"/>',
    "chevron-right": '<path d="m9.25 6 6 6-6 6"/>',
    plus: '<path d="M12 4.5v15M4.5 12h15"/>',
    minus: '<path d="M4.5 12h15"/>',
    check: '<path d="m4.75 12.5 4.5 4.5 10-10"/>',
    truck: '<path d="M2.75 6.25h11v10h-11zM13.75 9.75h4l2.5 3v3.5h-6.5"/><circle cx="6.75" cy="17.75" r="1.75"/><circle cx="16.75" cy="17.75" r="1.75"/>',
    return: '<path d="M8.5 5.5 4.75 9.25 8.5 13"/><path d="M4.75 9.25h9.5a5 5 0 0 1 0 10H9"/>',
    shield: '<path d="M12 3.25 19.25 6v5.5c0 4.6-3 8-7.25 9.25C7.75 19.5 4.75 16.1 4.75 11.5V6z"/><path d="m8.75 12 2.25 2.25 4.25-4.5"/>',
    ruler: '<path d="M3.5 15.5 15.5 3.5l5 5-12 12z"/><path d="m7.5 11.5 2 2M10.5 8.5l2 2M13.5 5.5l2 2"/>',
    zoom: '<circle cx="10.5" cy="10.5" r="6.25"/><path d="M15.25 15.25 20.5 20.5M10.5 7.75v5.5M7.75 10.5h5.5"/>',
    lips: '<path stroke="none" fill="currentColor" d="M1.5 11.9c2.6-3.5 5.6-5.6 7.9-5.6 1.3 0 2 .8 2.6 1.7.6-.9 1.3-1.7 2.6-1.7 2.3 0 5.3 2.1 7.9 5.6-3.8-.6-6.9-.6-10.5.1-3.6-.7-6.7-.7-10.5-.1z"/><path stroke="none" fill="currentColor" d="M1.6 12.9c3.6-.3 6.8 0 10.4.6 3.6-.6 6.8-.9 10.4-.6-2.3 4-5.9 5.8-10.4 5.8S3.9 16.9 1.6 12.9z"/>',
    instagram: '<rect x="3.75" y="3.75" width="16.5" height="16.5" rx="4.5"/><circle cx="12" cy="12" r="3.9"/><path d="M17.1 6.9h.01" stroke-width="2.2"/>',
    tiktok: '<path d="M14.25 3.5v11.25a3.75 3.75 0 1 1-3.75-3.75"/><path d="M14.25 3.5c.4 2.6 2.3 4.5 5 4.75"/>',
    facebook: '<path d="M14.5 20.5v-8h3l.5-3.25h-3.5V7.4c0-1 .45-1.65 1.75-1.65h1.9V2.9c-.6-.1-1.6-.15-2.6-.15-2.75 0-4.3 1.6-4.3 4.4v2.1H8.25v3.25h3v8"/>',
    whatsapp: '<path d="M4.25 20 5.4 16.2A8.25 8.25 0 1 1 8.3 19z"/><path d="M9.2 8.2c-.4.9-.2 2.3 1.2 3.9 1.5 1.7 3 2.3 3.9 2.1l.95-1.2-1.75-1.05-.9.75c-.8-.35-1.5-1-1.9-1.9l.75-.9-1-1.75z" stroke-width="1.2"/>',
    mail: '<path d="M3.25 5.75h17.5v12.5H3.25z"/><path d="m3.75 6.5 8.25 6.75 8.25-6.75"/>',
    trash: '<path d="M4.5 6.75h15M9.25 6.5V4.25h5.5V6.5M6.25 6.75l.9 13h9.7l.9-13M10 10.5v6M14 10.5v6"/>',
    lock: '<rect x="5" y="10.25" width="14" height="10" rx="1"/><path d="M8.25 10.25V7.5a3.75 3.75 0 0 1 7.5 0v2.75M12 14v2.5"/>',
  };
  ui.icon = (name, o = {}) => {
    const body = ICONS[name];
    if (!body) return "";
    const size = o.size || 20;
    const a11y = o.label ? 'role="img" aria-label="' + esc(o.label) + '"' : 'aria-hidden="true" focusable="false"';
    return '<svg class="ui-icon ui-icon--' + name + '" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter" ' + a11y + '>' + body + '</svg>';
  };
  ui.icons = Object.keys(ICONS);

  /* ---------- small primitives ---------- */
  ui.price = (p, size) => {
    if (!p) return "";
    const n = AW.priceFor ? AW.priceFor(p, size) : p.price;
    const txt = AW.rand ? AW.rand(n) : "R" + n;
    return '<span class="price" data-price="' + esc(n) + '">' + esc(txt) + '</span>';
  };

  ui.badge = (text, o = {}) => {
    if (!text) return "";
    const tone = ["red", "ink", "white"].includes(o.tone) ? o.tone : "red";
    return '<span class="badge badge--' + tone + '">' + esc(text) + '</span>';
  };

  ui.chip = (label, o = {}) => '<button type="button" class="chip" aria-pressed="' + (o.active ? "true" : "false") + '" ' + (o.attrs || "") + '>' + esc(label) + '</button>';

  ui.eyebrow = text => '<p class="eyebrow">' + esc(text) + '</p>';

  ui.btn = (label, o = {}) => {
    const variant = o.variant || "primary";
    const size = o.size && o.size !== "md" ? " btn--" + o.size : "";
    const cls = "btn btn--" + variant + size + (o.block ? " btn--block" : "");
    const iconBefore = o.icon ? '<span class="btn-icon">' + ui.icon(o.icon, { size: 18 }) + '</span>' : "";
    const iconAfter = o.iconAfter ? '<span class="btn-icon btn-icon--after">' + ui.icon(o.iconAfter, { size: 18 }) + '</span>' : "";
    const inner = iconBefore + '<span class="btn-label">' + esc(label) + '</span>' + iconAfter;
    const attrs = o.attrs ? " " + o.attrs : "";
    return o.href
      ? '<a class="' + cls + '" href="' + esc(o.href) + '"' + attrs + '>' + inner + '</a>'
      : '<button type="button" class="' + cls + '"' + attrs + '>' + inner + '</button>';
  };

  /* Accent: if `accent` appears inside `title`, that word is set in italic; otherwise it follows the title. */
  const accentTitle = (title, accent) => {
    const t = esc(title || "");
    if (!accent) return t;
    const a = esc(accent);
    const i = t.toLowerCase().indexOf(a.toLowerCase());
    if (i > -1) return t.slice(0, i) + '<em class="t-accent">' + t.slice(i, i + a.length) + '</em>' + t.slice(i + a.length);
    return t + ' <em class="t-accent">' + a + '</em>';
  };
  ui.accentTitle = accentTitle;

  ui.sectionHead = (o = {}) => {
    const link = o.link && o.link.href
      ? '<a class="ui-head-link link-draw" href="' + esc(o.link.href) + '">' + esc(o.link.label || "View all") + ui.icon("arrow-right", { size: 16 }) + '</a>'
      : "";
    const rule = (o.eyebrow || link) ? '<div class="ui-head-rule">' + (o.eyebrow ? '<span class="eyebrow">' + esc(o.eyebrow) + '</span>' : "<span></span>") + link + '</div>' : "";
    return '<header class="ui-head">' + rule
      + (o.title ? '<h2 class="ui-head-title t-display" data-reveal="lines">' + accentTitle(o.title, o.accent) + '</h2>' : "")
      + '</header>';
  };

  ui.logo = (o = {}) => {
    const size = ["xs", "sm", "md", "lg", "xl"].includes(o.size) ? o.size : "md";
    const tone = ["ink", "white", "red"].includes(o.tone) ? o.tone : "ink";
    return '<span class="ui-logo ui-logo--' + size + ' ui-logo--' + tone + '">'
      + '<span class="ui-logo-word" aria-label="AWEZA">AWEZA<sup class="ui-logo-tm" aria-hidden="true">TM</sup></span>'
      + (o.tagline ? '<span class="ui-logo-tag">Time of your life</span>' : "")
      + '</span>';
  };

  /* ---------- product card ---------- */
  const badgeTone = text => (/^(new|bestseller)$/i.test(String(text || "")) ? "red" : "ink");

  ui.card = (p, o = {}) => {
    if (!p) return "";
    const size = o.size === "lg" ? "lg" : "md";
    const href = "#/product/" + encodeURIComponent(p.id);
    const { primary, alt } = ui.cardImages(p);
    const colName = AW.colName ? AW.colName(p.collection) : "";
    const pFit = ui.fitFor(primary);
    const aFit = alt ? ui.fitFor(alt) : "";
    const load = o.eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';
    const sizesAttr = size === "lg" ? "(min-width: 900px) 50vw, 100vw" : "(min-width: 1440px) 25vw, (min-width: 900px) 33vw, 50vw";
    const no = String((o.index || 0) + 1).padStart(2, "0");
    const sizes = Array.isArray(p.sizes) ? p.sizes : [];
    const quick = o.quickAdd !== false && sizes.length
      ? '<div class="card-quick" role="group" aria-label="' + esc("Quick add " + p.name) + '">'
        + '<span class="card-quick-label">Quick add</span>'
        + '<div class="card-quick-sizes">' + sizes.map(s =>
          '<button type="button" class="card-quick-size" data-quick-add="' + esc(p.id) + '" data-size="' + esc(s) + '" aria-label="' + esc("Add " + p.name + ", size " + s) + '">' + esc(s) + '</button>').join("")
        + '</div></div>'
      : "";
    return '<article class="card card--' + size + '" data-reveal="up" data-product="' + esc(p.id) + '">'
      + '<a class="card-link" href="' + href + '">'
      + '<div class="card-media media media--' + pFit + (alt ? " card-media--swap" : "") + '" style="aspect-ratio:4/5">'
      + '<img class="card-img" src="' + esc(primary) + '" alt="' + esc(ui.altFor(p, primary)) + '" width="1000" height="1000" ' + load + ' decoding="async" sizes="' + sizesAttr + '">'
      + (alt ? '<img class="card-img-alt card-img-alt--' + aFit + '" src="' + esc(alt) + '" alt="" width="1000" height="1000" loading="lazy" decoding="async" sizes="' + sizesAttr + '">' : "")
      + '</div>'
      + '<div class="card-info">'
      + '<h3 class="card-name">' + esc(p.name) + '</h3>'
      + ui.price(p)
      + (colName ? '<p class="card-meta">' + esc(colName) + '</p>' : "")
      + '</div></a>'
      + '<div class="card-over"">'
      + (p.badge ? ui.badge(p.badge, { tone: badgeTone(p.badge) }) : "")
      + '<span class="card-no" aria-hidden="true">' + no + '</span>'
      + quick
      + '</div>'
      + '</article>';
  };

  /* Quick add: one delegated listener for every card on every page. */
  document.addEventListener("click", e => {
    const b = e.target.closest && e.target.closest("[data-quick-add][data-size]");
    if (!b) return;
    e.preventDefault();
    e.stopPropagation();
    const id = b.getAttribute("data-quick-add"), size = b.getAttribute("data-size");
    if (!AW.cart || !AW.byId || !AW.byId(id)) return;
    const card = b.closest(".card");
    const img = card && (card.querySelector(".card-img") || card.querySelector("img"));
    AW.cart.add(id, size);
    if (AW.motion && AW.motion.flyToBag && img) { try { AW.motion.flyToBag(img); } catch (err) { /* motion optional */ } }
    b.classList.add("is-done");
    const strip = b.closest(".card-quick");
    if (strip) strip.classList.add("is-done");
    setTimeout(() => { b.classList.remove("is-done"); if (strip) strip.classList.remove("is-done"); }, 1600);
  });

  /* ---------- scroll lock (reference counted) ---------- */
  let locks = 0;
  ui.lockScroll = on => {
    const before = locks;
    locks = Math.max(0, locks + (on ? 1 : -1));
    if (before === 0 && locks > 0) {
      const sbw = Math.max(0, window.innerWidth - root.clientWidth);
      root.style.setProperty("--ui-sbw", sbw + "px");
      root.classList.add("ui-locked");
      if (AW.motion && AW.motion.stop) { try { AW.motion.stop(); } catch (err) {} }
    } else if (before > 0 && locks === 0) {
      root.classList.remove("ui-locked");
      root.style.removeProperty("--ui-sbw");
      if (AW.motion && AW.motion.start) { try { AW.motion.start(); } catch (err) {} }
    }
    return locks;
  };
  ui.isLocked = () => locks > 0;

  /* ---------- focus trap ---------- */
  const FOCUSABLE = 'a[href],area[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),iframe,summary,[contenteditable="true"],[tabindex]:not([tabindex="-1"])';
  ui.focusables = el => [...el.querySelectorAll(FOCUSABLE)].filter(n => !n.hasAttribute("inert") && !n.closest("[inert]") && (n.offsetWidth || n.offsetHeight || n.getClientRects().length) && getComputedStyle(n).visibility !== "hidden");
  ui.trapFocus = el => {
    if (!el) return () => {};
    const opener = document.activeElement;
    const onKey = e => {
      if (e.key !== "Tab") return;
      const f = ui.focusables(el);
      if (!f.length) { e.preventDefault(); el.focus && el.focus(); return; }
      const first = f[0], last = f[f.length - 1], a = document.activeElement;
      if (e.shiftKey && (a === first || !el.contains(a))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (a === last || !el.contains(a))) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey, true);
    if (!el.contains(document.activeElement)) {
      const f = ui.focusables(el);
      if (f.length) f[0].focus({ preventScroll: true });
      else { if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1"); el.focus({ preventScroll: true }); }
    }
    let released = false;
    return () => {
      if (released) return;
      released = true;
      document.removeEventListener("keydown", onKey, true);
      if (opener && opener.focus && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  };

  /* ---------- toasts ---------- */
  let toastBox = null;
  const box = () => {
    if (toastBox && document.contains(toastBox)) return toastBox;
    const host = document.getElementById("overlay-root") || document.body;
    toastBox = document.createElement("div");
    toastBox.className = "ui-toasts";
    toastBox.setAttribute("role", "status");
    toastBox.setAttribute("aria-live", "polite");
    host.appendChild(toastBox);
    return toastBox;
  };
  const showToast = msg => {
    if (!msg) return;
    const b = box();
    const t = document.createElement("div");
    t.className = "ui-toast";
    t.innerHTML = '<span class="ui-toast-mark">' + ui.icon("lips", { size: 14 }) + '</span><span class="ui-toast-msg">' + esc(msg) + '</span>';
    b.appendChild(t);
    while (b.children.length > 3) b.firstElementChild.remove();
    requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add("is-in")));
    setTimeout(() => {
      t.classList.remove("is-in");
      t.classList.add("is-out");
      setTimeout(() => t.remove(), 500);
    }, 3200);
  };
  if (AW.on) AW.on("toast", d => showToast(d && d.msg));
  ui.toast = msg => (AW.toast ? AW.toast(msg) : showToast(msg));
})();
