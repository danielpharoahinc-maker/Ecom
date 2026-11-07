/* AWEZA navigation: promo bar, sticky header, mobile contents menu, search overlay, bag button.
   Owner: agent 02. Fills #nav-root; search appends its own container to #overlay-root.
   Consumes AW.ui (logo, icon, modelShot, price, lockScroll, trapFocus) defensively.
   Emits "cart:open". Listens to "route", "cart", "cart:added", "search:open". */
(() => {
  const AW = window.AW;
  if (!AW) return;
  const root = document.getElementById("nav-root");
  if (!root) return;

  const doc = document.documentElement;
  const esc = AW.esc || (s => String(s));
  const ui = () => AW.ui || {};
  const mqReduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mqDesktop = window.matchMedia("(min-width: 1024px)");
  const reduced = () => mqReduced.matches || !!(AW.motion && AW.motion.reduced);
  const FACE_IDS = ["need-a-hug", "sweet-cupcake"]; // real-face prints: never in marketing surfaces (DIRECTION §6)

  /* ---------- small helpers ---------- */
  const FALLBACK_ICONS = {
    bag: '<path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    "arrow-up-right": '<path d="M7 17L17 7M8 7h9v9"/>',
    "arrow-right": '<path d="M4 12h15M13 6l6 6-6 6"/>',
    instagram: '<rect x="3.5" y="3.5" width="17" height="17" rx="4.5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".6"/>',
    tiktok: '<path d="M14 4v10.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 4c.4 2.6 2.2 4.3 5 4.5"/>',
    facebook: '<path d="M14 8h2.5V4.5H14A4 4 0 0 0 10 8.5V11H7.5v3.5H10V20h3.5v-5.5H16l.5-3.5h-3V8.8c0-.5.3-.8.5-.8z"/>',
    whatsapp: '<path d="M4.5 19.5l1.2-3.9A8 8 0 1 1 8.6 18.4z"/><path d="M9.2 8.6c.2 2.6 2.4 4.9 5.2 5.3l1-1.2-1.6-.8-.8.7c-.9-.4-1.7-1.2-2.1-2.1l.7-.8-.8-1.6z"/>',
  };
  function icon(name, size = 20) {
    const u = ui();
    if (typeof u.icon === "function") {
      try { const s = u.icon(name, { size }); if (s) return s; } catch (e) { /* fall through */ }
    }
    const d = FALLBACK_ICONS[name] || "";
    return `<svg class="nav-svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${d}</svg>`;
  }
  function logo(tone = "ink") {
    const u = ui();
    if (typeof u.logo === "function") {
      try { const s = u.logo({ size: "md", tagline: false, tone }); if (s) return s; } catch (e) { /* fall through */ }
    }
    return '<span class="nav-wordmark">AWEZA<sup>&trade;</sup></span>';
  }
  const priceHtml = p => {
    const u = ui();
    if (typeof u.price === "function") { try { return u.price(p); } catch (e) { /* fall through */ } }
    return `<span class="nav-price">${esc(AW.rand(AW.priceFor ? AW.priceFor(p) : p.price))}</span>`;
  };
  const pad2 = n => String(n).padStart(2, "0");
  const products = () => AW.products || [];
  const collections = () => AW.collections || [];
  const countIn = id => products().filter(p => p.collection === id).length;
  const teeWord = n => `${n} ${n === 1 ? "tee" : "tees"}`;
  const fitFor = src => {
    const u = ui();
    if (typeof u.fitFor === "function") { try { return u.fitFor(src); } catch (e) { /* fall through */ } }
    return /\/(front|back|folded)\.jpg$/.test(src) ? "contain" : "cover";
  };
  const modelShot = p => {
    const u = ui();
    if (typeof u.modelShot === "function") { try { const s = u.modelShot(p); if (s) return s; } catch (e) { /* fall through */ } }
    return (p.images || []).find(s => /\/male-/.test(s)) || (p.images || [])[0];
  };
  /* Small 1:1 thumbnail for search rows: flat shot (contain). Face prints show the side without the face. */
  const flatThumb = p => {
    const imgs = p.images || [];
    const u = ui();
    let side = typeof u.printSide === "function" ? u.printSide(p) : (["captain-save", "need-a-hug", "mini-lips"].includes(p.id) ? "front" : "back");
    if (FACE_IDS.includes(p.id)) side = side === "back" ? "front" : "back"; // show the side without the face
    return imgs.find(s => s.endsWith(`/${side}.jpg`)) || imgs[0];
  };
  const altFor = (p, src) => {
    const u = ui();
    if (typeof u.altFor === "function") { try { return u.altFor(p, src); } catch (e) { /* fall through */ } }
    return p.name;
  };
  const markLoaded = img => {
    const done = () => img.classList.add("is-loaded");
    if (img.complete && img.naturalWidth) done(); else img.addEventListener("load", done, { once: true });
  };

  let locks = 0;
  function lock(on) {
    const u = ui();
    if (typeof u.lockScroll === "function") { u.lockScroll(on); return; }
    locks = Math.max(0, locks + (on ? 1 : -1));
    doc.style.overflow = locks ? "hidden" : "";
  }
  function trap(el) {
    const u = ui();
    if (typeof u.trapFocus === "function") { try { return u.trapFocus(el) || (() => {}); } catch (e) { /* fall through */ } }
    const onKey = e => {
      if (e.key !== "Tab") return;
      const f = [...el.querySelectorAll('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter(n => n.offsetParent !== null || n === document.activeElement);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }

  /* ---------- markup ---------- */
  const promoMessages = () => {
    const free = AW.config && AW.config.freeDeliveryOver;
    return [
      free ? `Free delivery over ${AW.rand(free)}` : "Delivery across South Africa",
      "Printed to order. Shipped nationwide.",
      "Sizes XS to 5XL",
    ];
  };

  function desktopLinks() {
    const items = [{ href: "#/shop/all", label: "Shop All", key: "all", n: products().length }]
      .concat(collections().map(c => ({ href: `#/shop/${c.id}`, label: c.name, key: c.id, n: countIn(c.id) })));
    return items.map(it => `
      <li><a class="nav-link link-draw" href="${it.href}" data-nav-key="${esc(it.key)}">${esc(it.label)}<sup class="nav-link-count" aria-hidden="true">${pad2(it.n)}</sup></a></li>`).join("");
  }

  function thumbStrip(colId) {
    const shots = products().filter(p => p.collection === colId && !FACE_IDS.includes(p.id)).slice(0, 3);
    if (!shots.length) return "";
    return `<span class="nav-menu-thumbs" aria-hidden="true">${shots.map(p => {
      const src = modelShot(p);
      return `<span class="nav-thumb"><img src="${esc(src)}" alt="" width="1000" height="1000" loading="lazy" decoding="async"></span>`;
    }).join("")}</span>`;
  }

  function menuItems() {
    const all = { href: "#/shop/all", label: "Shop All", key: "all", meta: teeWord(products().length), tagline: "Every statement we print.", thumbs: "" };
    const cols = collections().map(c => ({ href: `#/shop/${c.id}`, label: c.name, key: c.id, meta: teeWord(countIn(c.id)), tagline: c.tagline, thumbs: thumbStrip(c.id) }));
    return [all, ...cols].map((it, i) => `
      <li class="nav-menu-item" style="--i:${i}">
        <a class="nav-menu-link" href="${it.href}" data-nav-key="${esc(it.key)}">
          <span class="nav-menu-num">${pad2(i + 1)}</span>
          <span class="nav-menu-mask"><span class="nav-menu-word">${esc(it.label)}<sup class="nav-menu-count"><span class="nav-sr">, </span>${esc(it.meta)}</sup></span></span>
          ${it.tagline ? `<span class="nav-menu-meta"><span class="nav-menu-tag">${esc(it.tagline)}</span></span>` : ""}
          ${it.thumbs}
        </a>
      </li>`).join("");
  }

  function socialLinks() {
    const s = (AW.config && AW.config.social) || {};
    return [["instagram", "Instagram"], ["tiktok", "TikTok"], ["facebook", "Facebook"], ["whatsapp", "WhatsApp"]]
      .map(([k, label]) => `<a class="nav-social" href="${esc(s[k] || "#")}" ${s[k] ? 'target="_blank" rel="noopener"' : 'data-nav-placeholder'} aria-label="${label}">${icon(k, 20)}</a>`).join("");
  }

  const burger = '<span class="nav-burger" aria-hidden="true"><span></span><span></span></span>';

  root.innerHTML = `
    <div class="nav-promo" role="region" aria-label="Store notices">
      <div class="nav-promo-track">${promoMessages().map((m, i) => `<p class="nav-promo-msg${i === 0 ? " is-active" : ""}"${i ? ' aria-hidden="true"' : ""}>${esc(m)}</p>`).join("")}</div>
    </div>
    <header class="nav-header" data-nav-header>
      <div class="nav-bar">
        <div class="nav-start">
          <button class="nav-icon-btn nav-menu-btn" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="nav-menu">${burger}</button>
          <a class="nav-logo" href="#/" aria-label="AWEZA, home">${logo()}</a>
        </div>
        <nav class="nav-primary" aria-label="Primary"><ul class="nav-links">${desktopLinks()}</ul></nav>
        <div class="nav-end">
          <button class="nav-icon-btn nav-search-btn" type="button" aria-label="Search" aria-haspopup="dialog">${icon("search", 22)}<span class="nav-btn-label">Search</span></button>
          <button class="nav-icon-btn nav-bag" type="button" data-bag-target aria-label="Bag, 0 items">${icon("bag", 22)}<span class="nav-btn-label">Bag</span><span class="nav-bag-count" aria-hidden="true" hidden>0</span></button>
        </div>
      </div>
    </header>
    <div class="nav-menu" id="nav-menu" role="dialog" aria-modal="true" aria-label="Menu" data-theme="dark" hidden>
      <div class="nav-menu-inner">
        <div class="nav-menu-top">
          <button class="nav-icon-btn nav-menu-close" type="button" aria-label="Close menu">${burger}</button>
          <a class="nav-logo nav-menu-logo" href="#/" aria-label="AWEZA, home">${logo("white")}</a>
          <span class="nav-menu-top-spacer" aria-hidden="true"></span>
        </div>
        <div class="nav-menu-scroll">
          <div class="nav-menu-head">
            <span>Contents</span>
            <span>Drop 01 / ${new Date().getFullYear()}</span>
          </div>
          <nav aria-label="Shop"><ol class="nav-menu-list">${menuItems()}</ol></nav>
          <div class="nav-menu-foot">
            <ul class="nav-menu-sub">
              <li><a href="#/help">Help</a></li>
              <li><a href="#/size-guide">Size guide</a></li>
              <li><a href="#/about">About</a></li>
            </ul>
            <p class="nav-menu-line">Time of your life.</p>
            <div class="nav-menu-social">${socialLinks()}</div>
          </div>
        </div>
      </div>
    </div>`;

  const $ = s => root.querySelector(s);
  const header = $(".nav-header");
  const menuBtn = $(".nav-menu-btn");
  const menu = $(".nav-menu");
  const bagBtn = $(".nav-bag");
  const bagCount = $(".nav-bag-count");
  const searchBtn = $(".nav-search-btn");

  /* ---------- promo bar ---------- */
  (function promo() {
    const el = $(".nav-promo");
    const msgs = [...el.querySelectorAll(".nav-promo-msg")];
    if (msgs.length < 2) return;
    let i = 0, timer = 0, hover = false, focus = false;
    const show = n => msgs.forEach((m, k) => {
      m.classList.toggle("is-active", k === n);
      if (k === n) m.removeAttribute("aria-hidden"); else m.setAttribute("aria-hidden", "true");
    });
    const tick = () => { i = (i + 1) % msgs.length; show(i); };
    const stop = () => { clearInterval(timer); timer = 0; };
    const run = () => {
      stop();
      if (reduced() || hover || focus || document.hidden) return;
      timer = setInterval(tick, 4000);
    };
    el.addEventListener("mouseenter", () => { hover = true; run(); });
    el.addEventListener("mouseleave", () => { hover = false; run(); });
    el.addEventListener("focusin", () => { focus = true; run(); });
    el.addEventListener("focusout", () => { focus = false; run(); });
    document.addEventListener("visibilitychange", run);
    const onMq = () => { if (reduced()) { i = 0; show(0); } run(); };
    mqReduced.addEventListener ? mqReduced.addEventListener("change", onMq) : mqReduced.addListener(onMq);
    run();
  })();

  /* ---------- header: hairline, hide on scroll down ---------- */
  let hidden = false, lastY = window.scrollY || 0, ticking = false, page = "", menuOpen = false, searchOpen = false;
  const setOffset = () => doc.style.setProperty("--nav-offset", hidden ? "0px" : "var(--header-h)");
  function setHidden(h) {
    if (h === hidden) return;
    hidden = h;
    header.classList.toggle("is-hidden", h);
    setOffset();
  }
  function onScrollFrame() {
    ticking = false;
    const y = Math.max(0, window.scrollY || 0);
    header.classList.toggle("is-scrolled", y > 8);
    const locked = menuOpen || searchOpen || page === "checkout" || header.contains(document.activeElement);
    if (locked) setHidden(false);
    else if (y > lastY + 4 && y > 240) setHidden(true);
    else if (y < lastY - 4 || y <= 240) setHidden(false);
    if (Math.abs(y - lastY) > 4 || y <= 240) lastY = y;
  }
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(onScrollFrame); } };
  window.addEventListener("scroll", onScroll, { passive: true });
  header.addEventListener("focusin", () => setHidden(false));
  setOffset();

  /* ---------- active link state ---------- */
  function setActive(pg, arg) {
    let key = null;
    if (pg === "shop") key = arg && arg !== "all" ? arg : "all";
    else if (pg === "product") { const p = AW.byId && AW.byId(arg); key = p ? p.collection : null; }
    root.querySelectorAll("[data-nav-key]").forEach(a => {
      const on = a.dataset.navKey === key;
      a.classList.toggle("is-active", on);
      if (a.classList.contains("nav-link")) a.classList.toggle("link-draw--on", on);
      if (on && pg === "shop") a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
  }

  /* ---------- bag button ---------- */
  let addedPending = false, bumpTimer = 0;
  function paintCount() {
    const n = AW.cart ? AW.cart.count() : 0;
    bagCount.textContent = n > 99 ? "99+" : String(n);
    bagCount.hidden = n === 0;
    bagBtn.setAttribute("aria-label", `Bag, ${n} ${n === 1 ? "item" : "items"}`);
  }
  AW.on("cart", () => { Promise.resolve().then(() => { if (!addedPending) paintCount(); }); });
  AW.on("cart:added", () => {
    addedPending = true;
    clearTimeout(bumpTimer);
    bumpTimer = setTimeout(() => {
      addedPending = false;
      paintCount();
      if (reduced()) return;
      bagBtn.classList.remove("is-bumping");
      void bagBtn.offsetWidth; // restart the animation
      bagBtn.classList.add("is-bumping");
    }, reduced() ? 0 : 420);
  });
  bagBtn.addEventListener("animationend", () => bagBtn.classList.remove("is-bumping"));
  bagBtn.addEventListener("click", () => { closeMenu(false); closeSearch(false); AW.emit("cart:open"); });
  paintCount();

  /* ---------- mobile menu ---------- */
  let releaseMenuTrap = null, menuTimer = 0, menuTl = null;
  const G = () => (window.gsap && !reduced() ? window.gsap : null);

  function openMenu() {
    if (menuOpen) return;
    closeSearch(false);
    menuOpen = true;
    clearTimeout(menuTimer);
    setHidden(false);
    // Align the menu's top bar with the live header so the burger appears to morph in place.
    const top = Math.max(0, header.getBoundingClientRect().top);
    menu.style.setProperty("--nav-menu-bar-top", `${Math.round(top)}px`);
    menu.hidden = false;
    menu.querySelectorAll(".nav-thumb img").forEach(markLoaded);
    menuBtn.setAttribute("aria-expanded", "true");
    header.classList.add("is-menu-open");
    lock(true);
    void menu.offsetWidth;
    menu.classList.add("is-open");
    const g = G();
    if (g) {
      menu.classList.add("nav-menu--gsap");
      if (menuTl) menuTl.kill();
      menuTl = g.timeline()
        .fromTo(menu.querySelectorAll(".nav-menu-word"), { yPercent: 110 }, { yPercent: 0, duration: 0.9, ease: "expo.out", stagger: 0.07, delay: 0.12 }, 0)
        .fromTo(menu.querySelectorAll(".nav-menu-num, .nav-menu-meta, .nav-menu-thumbs, .nav-menu-head, .nav-menu-foot"), { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: "expo.out", stagger: 0.04, delay: 0.25 }, 0);
    }
    releaseMenuTrap = trap(menu);
    const close = menu.querySelector(".nav-menu-close");
    requestAnimationFrame(() => close.focus({ preventScroll: true }));
  }
  function closeMenu(restore = true) {
    if (!menuOpen) return;
    menuOpen = false;
    menuBtn.setAttribute("aria-expanded", "false");
    header.classList.remove("is-menu-open");
    menu.classList.remove("is-open");
    if (releaseMenuTrap) { releaseMenuTrap(); releaseMenuTrap = null; }
    lock(false);
    if (restore) menuBtn.focus({ preventScroll: true });
    clearTimeout(menuTimer);
    menuTimer = setTimeout(() => {
      if (menuTl) { menuTl.kill(); menuTl = null; }
      menu.classList.remove("nav-menu--gsap");
      menu.querySelectorAll(".nav-menu-word, .nav-menu-num, .nav-menu-meta, .nav-menu-thumbs, .nav-menu-head, .nav-menu-foot").forEach(n => n.removeAttribute("style"));
      if (!menuOpen) menu.hidden = true;
    }, reduced() ? 0 : 480);
  }
  menuBtn.addEventListener("click", () => (menuOpen ? closeMenu() : openMenu()));
  menu.querySelector(".nav-menu-close").addEventListener("click", () => closeMenu());
  menu.addEventListener("keydown", e => { if (e.key === "Escape") { e.stopPropagation(); closeMenu(); } });
  menu.addEventListener("click", e => {
    const a = e.target.closest("a");
    if (!a) return;
    if (a.hasAttribute("data-nav-placeholder")) { e.preventDefault(); return; }
    const href = a.getAttribute("href") || "";
    // Same-route link: the router won't fire, so close the menu ourselves.
    if (href === (location.hash || "#/") || (href === "#/" && !location.hash)) closeMenu(false);
  });
  const onDesktop = () => { if (mqDesktop.matches) closeMenu(false); };
  mqDesktop.addEventListener ? mqDesktop.addEventListener("change", onDesktop) : mqDesktop.addListener(onDesktop);

  /* ---------- search overlay ---------- */
  const overlayRoot = document.getElementById("overlay-root") || document.body;
  const search = document.createElement("div");
  search.className = "nav-search";
  search.hidden = true;
  search.innerHTML = `
    <div class="nav-search-scrim" data-nav-search-close></div>
    <div class="nav-search-sheet" role="dialog" aria-modal="true" aria-label="Search">
      <div class="nav-search-inner">
        <div class="nav-search-top">
          <span class="nav-search-label" id="nav-search-label">Search the shop</span>
          <button class="nav-icon-btn nav-search-close" type="button" aria-label="Close search" data-nav-search-close>${icon("close", 22)}</button>
        </div>
        <form class="nav-search-form" role="search" autocomplete="off">
          <label class="visually-hidden nav-sr" for="nav-search-input">Search tees</label>
          <input class="nav-search-input" id="nav-search-input" type="search" placeholder="Search tees" spellcheck="false"
            role="combobox" aria-autocomplete="list" aria-expanded="true" aria-controls="nav-search-list" enterkeyhint="go">
        </form>
        <div class="nav-search-results">
          <p class="nav-search-kicker" aria-live="polite"></p>
          <ul class="nav-search-list" id="nav-search-list" role="listbox" aria-labelledby="nav-search-label"></ul>
        </div>
      </div>
    </div>`;
  overlayRoot.appendChild(search);
  const sInput = search.querySelector(".nav-search-input");
  const sList = search.querySelector(".nav-search-list");
  const sKicker = search.querySelector(".nav-search-kicker");
  const sSheet = search.querySelector(".nav-search-sheet");
  let releaseSearchTrap = null, searchOpener = null, active = -1, results = [], searchTimer = 0;

  const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[‘’']/g, "").toLowerCase();
  function find(q) {
    const words = norm(q).split(/\s+/).filter(Boolean);
    if (!words.length) return null;
    return products().map(p => {
      const name = norm(p.name), col = norm(AW.colName ? AW.colName(p.collection) : ""), sum = norm(p.summary);
      const hay = `${name} ${col} ${sum} ${norm(p.badge)}`;
      if (!words.every(w => hay.includes(w))) return null;
      const score = words.reduce((s, w) => s + (name.includes(w) ? 3 : 0) + (col.includes(w) ? 2 : 0) + 1, 0) + (name.startsWith(words[0]) ? 2 : 0);
      return { p, score };
    }).filter(Boolean).sort((a, b) => b.score - a.score).map(r => r.p);
  }
  function renderResults() {
    const q = sInput.value.trim();
    const found = find(q);
    if (found === null) {
      results = products().filter(p => p.badge);
      sKicker.textContent = "Popular";
    } else {
      results = found;
      sKicker.textContent = found.length ? `${found.length} ${found.length === 1 ? "result" : "results"}` : "";
    }
    active = -1;
    sInput.removeAttribute("aria-activedescendant");
    if (!results.length) {
      sList.innerHTML = `<li class="nav-search-empty" role="presentation"><span class="nav-search-empty-big">Nothing yet.</span> Try &lsquo;lips&rsquo;.</li>`;
      return;
    }
    sList.innerHTML = results.map((p, i) => {
      const src = flatThumb(p);
      return `<li role="presentation" style="--i:${i}">
        <a class="nav-result" id="nav-result-${i}" role="option" aria-selected="false" tabindex="-1" href="#/product/${encodeURIComponent(p.id)}">
          <span class="nav-result-media nav-result-media--${fitFor(src)}"><img src="${esc(src)}" alt="${esc(altFor(p, src))}" width="1000" height="1000" loading="lazy" decoding="async"></span>
          <span class="nav-result-text">
            <span class="nav-result-name">${esc(p.name)}</span>
            <span class="nav-result-col">${esc(AW.colName ? AW.colName(p.collection) : "")}${found === null && p.badge ? ` <span class="nav-result-badge">${esc(p.badge)}</span>` : ""}</span>
          </span>
          <span class="nav-result-price">${priceHtml(p)}</span>
          <span class="nav-result-go" aria-hidden="true">${icon("arrow-up-right", 18)}</span>
        </a></li>`;
    }).join("");
    sList.querySelectorAll("img").forEach(markLoaded);
  }
  function setActiveResult(n) {
    const opts = [...sList.querySelectorAll(".nav-result")];
    if (!opts.length) return;
    active = (n + opts.length) % opts.length;
    opts.forEach((o, i) => { o.classList.toggle("is-active", i === active); o.setAttribute("aria-selected", i === active ? "true" : "false"); });
    sInput.setAttribute("aria-activedescendant", opts[active].id);
    opts[active].scrollIntoView({ block: "nearest" });
  }
  sInput.addEventListener("input", renderResults);
  sInput.addEventListener("keydown", e => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveResult(active + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveResult(active < 0 ? -1 : active - 1); }
  });
  search.querySelector(".nav-search-form").addEventListener("submit", e => {
    e.preventDefault();
    const opts = sList.querySelectorAll(".nav-result");
    const target = opts[active >= 0 ? active : 0];
    if (target && (active >= 0 || sInput.value.trim())) target.click();
  });
  sList.addEventListener("mousemove", e => {
    const o = e.target.closest(".nav-result");
    if (!o) return;
    const i = [...sList.querySelectorAll(".nav-result")].indexOf(o);
    if (i !== active) setActiveResult(i);
  });
  sList.addEventListener("click", e => {
    const a = e.target.closest(".nav-result");
    if (a && a.getAttribute("href") === location.hash) closeSearch(false);
  });
  search.addEventListener("click", e => { if (e.target.closest("[data-nav-search-close]")) closeSearch(); });
  search.addEventListener("keydown", e => { if (e.key === "Escape") { e.stopPropagation(); closeSearch(); } });

  function openSearch() {
    if (searchOpen) return;
    closeMenu(false);
    searchOpen = true;
    searchOpener = document.activeElement && document.activeElement !== document.body ? document.activeElement : searchBtn;
    clearTimeout(searchTimer);
    setHidden(false);
    search.hidden = false;
    renderResults();
    lock(true);
    void search.offsetWidth;
    search.classList.add("is-open");
    searchBtn.setAttribute("aria-expanded", "true");
    releaseSearchTrap = trap(sSheet);
    requestAnimationFrame(() => { sInput.focus({ preventScroll: true }); sInput.select(); });
  }
  function closeSearch(restore = true) {
    if (!searchOpen) return;
    searchOpen = false;
    search.classList.remove("is-open");
    searchBtn.setAttribute("aria-expanded", "false");
    if (releaseSearchTrap) { releaseSearchTrap(); releaseSearchTrap = null; }
    lock(false);
    if (restore && searchOpener && document.contains(searchOpener)) searchOpener.focus({ preventScroll: true });
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { if (!searchOpen) search.hidden = true; }, reduced() ? 0 : 460);
  }
  searchBtn.addEventListener("click", openSearch);
  AW.on("search:open", openSearch);
  searchBtn.setAttribute("aria-expanded", "false");

  /* ---------- route ---------- */
  AW.on("route", d => {
    const pg = (d && d.page) || "";
    const arg = d && d.arg;
    page = pg;
    document.body.dataset.page = pg || "home";
    setActive(pg, arg);
    const hadOverlay = menuOpen || searchOpen;
    closeMenu(false);
    closeSearch(false);
    if (hadOverlay && AW.app) AW.app.focus({ preventScroll: true });
    lastY = window.scrollY || 0;
    setHidden(false);
    header.classList.toggle("is-scrolled", lastY > 8);
  });
})();
