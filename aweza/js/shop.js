/* AWEZA shop / listing pages. OWNED BY AGENT 04. Prefix .shop-*
   Routes: #/shop, #/shop/all, #/shop/<collection-id>. Unknown ids fall back to everything, with a note.
   Sort and size filter persist per session (sessionStorage "aw-shop"). */
(() => {
  const AW = window.AW;
  if (!AW || !AW.route) return;

  const ui = () => AW.ui || {};
  const esc = s => (AW.esc ? AW.esc(s == null ? "" : s) : String(s == null ? "" : s));
  const rm = () => (AW.motion && AW.motion.reduced) || (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const icon = (n, size) => (ui().icon ? ui().icon(n, { size: size || 18 }) : "");

  const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];
  const FACE = ["need-a-hug", "sweet-cupcake"]; // real-faces rule: never in marketing areas
  // Lead model shot per collection (DIRECTION 6, home panel map). Ids are fixed contracts.
  const LEAD = { signature: ["signature-lips", "back"], "bad-decisions": ["ceo-of-bad-decisions", "back"], "no-filter": ["captain-save", "front"] };
  // Editorial tile per page: which print, which line. The art comes from AW.ui.artFor.
  const EDIT = {
    all: { product: "ceo-of-bad-decisions", to: "bad-decisions", line: "Bad decisions look better in heavy cotton." },
    signature: { product: "signature-lips", line: "The lips do the talking. You just turn around." },
    "bad-decisions": { product: "ceo-of-bad-decisions", line: "Bad decisions look better in heavy cotton." },
    "no-filter": { product: "captain-save", line: "Says it loud. Washes well." },
  };
  const SORTS = [["featured", "Featured"], ["newest", "Newest"], ["price-asc", "Price: low to high"], ["price-desc", "Price: high to low"]];

  /* ---------- state ---------- */
  const KEY = "aw-shop";
  const state = { sort: "featured", size: "" };
  try {
    const s = JSON.parse(sessionStorage.getItem(KEY) || "{}");
    if (SORTS.some(x => x[0] === s.sort)) state.sort = s.sort;
    if (SIZE_ORDER.includes(s.size)) state.size = s.size;
  } catch (e) { /* private mode */ }
  const persist = () => { try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} };

  let page = null; // { root, colId, base }

  /* ---------- helpers ---------- */
  const products = () => AW.products || [];
  const collections = () => AW.collections || [];
  const colById = id => collections().find(c => c.id === id);
  const tees = n => n + (n === 1 ? " tee" : " tees");
  const pad = n => String(n).padStart(2, "0");
  const price = p => (AW.priceFor ? AW.priceFor(p) : p.price);
  const isNew = p => /^new$/i.test(String(p.badge || ""));
  const allSizes = () => {
    const set = new Set();
    products().forEach(p => (p.sizes || []).forEach(s => set.add(s)));
    return [...set].sort((a, b) => (SIZE_ORDER.indexOf(a) + 99) % 99 - (SIZE_ORDER.indexOf(b) + 99) % 99);
  };

  const modelShot = (p, side) => {
    if (!p) return "";
    if (ui().modelShot) return ui().modelShot(p, side);
    const imgs = p.images || [];
    return imgs.find(s => s.indexOf("/male-" + side + "-") > -1) || imgs[0] || "";
  };
  const leadFor = colId => {
    const map = LEAD[colId] || LEAD.signature;
    let p = AW.byId && AW.byId(map[0]);
    if (!p || FACE.includes(p.id)) p = products().find(x => x.collection === colId && !FACE.includes(x.id)) || p;
    return p ? { p, src: modelShot(p, map[1]) } : null;
  };

  const media = (src, o) => (ui().img
    ? ui().img(src, o)
    : '<div class="media media--cover ' + esc(o.className || "") + '" style="aspect-ratio:' + esc(o.ratio || "1/1") + '"><img src="' + esc(src) + '" alt="' + esc(o.alt || "") + '" width="1000" height="1000" loading="' + (o.eager ? "eager" : "lazy") + '" decoding="async"></div>');

  const altFor = (p, src) => (ui().altFor ? ui().altFor(p, src) : p.name);

  /* Sorting is stable: Featured keeps the catalogue order. */
  const ordered = list => {
    const l = list.map((p, i) => ({ p, i }));
    const by = {
      featured: (a, b) => a.i - b.i,
      newest: (a, b) => (isNew(b.p) - isNew(a.p)) || a.i - b.i,
      "price-asc": (a, b) => (price(a.p) - price(b.p)) || a.i - b.i,
      "price-desc": (a, b) => (price(b.p) - price(a.p)) || a.i - b.i,
    }[state.sort] || ((a, b) => a.i - b.i);
    return l.sort(by).map(x => x.p);
  };
  const filtered = (base, size) => (size ? base.filter(p => (p.sizes || []).includes(size)) : base.slice());

  /* The one card per page that gets to be big: a badged non-"New" tee (Signature, Bestseller...), never a face print. */
  const pickLead = list => (list.find(p => p.badge && !isNew(p) && !FACE.includes(p.id)) || list.find(p => !FACE.includes(p.id)) || list[0] || {}).id;

  const localCard = (p, i) => {
    const src = (p.images || [])[0] || "";
    return '<article class="card" data-reveal="up"><a class="card-link" href="#/product/' + encodeURIComponent(p.id) + '">'
      + media(src, { alt: p.name, ratio: "4/5", fit: "cover", eager: i < 2 })
      + '<div class="card-info"><h3 class="card-name">' + esc(p.name) + '</h3><span class="price">' + esc(AW.rand ? AW.rand(price(p)) : price(p)) + '</span></div></a></article>';
  };

  const card = (p, i, lg) => {
    const html = ui().card ? ui().card(p, { index: i, eager: i < 2, size: lg ? "lg" : "md" }) : localCard(p, i);
    const extra = "shop-cell" + (lg ? " shop-cell--lg" : "");
    const out = html.replace(/<article([^>]*?)class="/, '<article$1class="' + extra + " ");
    return out === html ? '<div class="' + extra + '">' + html + "</div>" : out;
  };

  /* ---------- editorial tile ---------- */
  const editorial = (key, wide) => {
    const e = EDIT[key] || EDIT.all;
    const p = AW.byId && AW.byId(e.product);
    if (!p || FACE.includes(p.id)) return "";
    const art = ui().artFor ? ui().artFor(p.id) : null;
    if (!art) return "";
    const toCol = e.to && colById(e.to);
    const href = toCol ? "#/shop/" + toCol.id : "#/product/" + encodeURIComponent(p.id);
    const label = toCol ? "Shop " + toCol.name : "See the " + p.name;
    return '<aside class="shop-edit' + (wide ? " shop-edit--wide" : "") + '" data-theme="dark" data-reveal="up" aria-label="' + esc(p.name) + ' print">'
      + '<div class="shop-edit-art">' + media(art, { alt: altFor(p, art), ratio: "1/1", fit: "contain", className: "shop-edit-media" }) + "</div>"
      + '<div class="shop-edit-copy">'
      + '<p class="shop-edit-fig"><span>Fig. ' + pad((products().indexOf(p) + 1) || 1) + '</span><span>The print, up close</span></p>'
      + '<p class="shop-edit-line">' + esc(e.line) + "</p>"
      + '<a class="shop-edit-link" href="' + esc(href) + '"><span>' + esc(label) + "</span>" + icon("arrow-right", 18) + "</a>"
      + "</div></aside>";
  };

  /* ---------- grid ---------- */
  function gridHTML(list) {
    const key = page.colId || "all";
    const n = list.length;
    if (!n) {
      return '<div class="shop-empty" role="status">'
        + '<p class="shop-empty-title">Nothing in that size yet. <em>Bold request.</em></p>'
        + '<p class="shop-empty-sub">Try another size, or see everything this page has.</p>'
        + (ui().btn ? ui().btn("Clear filters", { variant: "secondary", attrs: 'data-shop-clear' }) : '<button type="button" class="btn btn--secondary" data-shop-clear>Clear filters</button>')
        + "</div>";
    }
    // A short list becomes a composed spread instead of a grid with holes.
    if (n <= 2) {
      return '<div class="product-grid shop-grid shop-grid--few" data-stagger>'
        + card(list[0], 0, true)
        + '<p class="shop-few-note" data-reveal="fade"><span class="shop-few-fig">' + esc(tees(n)) + '</span>Small batch. <em>No filler.</em></p>'
        + (list[1] ? card(list[1], 1, false) : "")
        + "</div>";
    }
    const composed = state.sort === "featured";
    const lead = composed ? pickLead(list) : null;
    const at = page.colId ? 2 : 4; // editorial tile after the 4th (all) or 2nd (collection) card
    const showEdit = page.colId ? n >= 3 : n > at;
    let html = "";
    list.forEach((p, i) => {
      if (showEdit && i === at) html += editorial(key, composed && !!page.colId);
      html += card(p, i, p.id === lead);
    });
    if (showEdit && n === at) html += editorial(key, composed && !!page.colId);
    return '<div class="product-grid shop-grid' + (composed ? " shop-grid--composed" : " shop-grid--plain") + '" data-stagger>' + html + "</div>";
  }

  /* ---------- page markup ---------- */
  function headHTML(col, unknown, count) {
    const all = !col;
    const lead = leadFor(col ? col.id : "signature");
    const idx = col ? collections().indexOf(col) + 1 : 0;
    const title = col ? col.name : "Shop all";
    const tagline = col ? col.tagline : "Pick a statement. Wear it out loud.";
    const leadImg = lead && lead.src
      ? '<figure class="shop-hero-fig" data-parallax="0.06"><div class="shop-hero-wipe" data-reveal="img">'
        + media(lead.src, { alt: altFor(lead.p, lead.src), ratio: "5/4", fit: "cover", eager: true, className: "shop-hero-media" })
        + '</div><figcaption class="shop-hero-cap"><span>' + esc(lead.p.name) + '</span><span>' + (lead.src.indexOf("male-back") > -1 ? "Back print" : "Front print") + "</span></figcaption></figure>"
      : "";
    return '<header class="shop-head container">'
      + '<div class="shop-rule"><span>' + (all ? "The full line" : "Collection " + pad(idx) + " / " + pad(collections().length)) + "</span><span>Printed to order in small batches</span></div>"
      + (unknown ? '<p class="shop-note" role="note">We could not find that collection. Here is everything instead.</p>' : "")
      + '<div class="shop-head-grid' + (all ? " shop-head-grid--all" : "") + '">'
      + '<p class="shop-count eyebrow" data-shop-count aria-live="polite">' + esc(tees(count)) + "</p>"
      + '<h1 class="shop-title" data-reveal="lines" data-split="words">' + esc(title) + "</h1>"
      + '<p class="shop-tagline" data-reveal="up" data-reveal-delay="240">' + esc(tagline) + "</p>"
      + leadImg
      + "</div></header>";
  }

  function chipsHTML(colId) {
    const items = [["", "All"]].concat(collections().map(c => [c.id, c.name]));
    return items.map(([id, name]) => {
      const active = (colId || "") === id;
      const attrs = 'data-shop-go="' + esc(id ? "#/shop/" + id : "#/shop") + '"' + (active ? ' aria-current="page"' : "");
      return ui().chip ? ui().chip(name, { active, attrs }) : '<button type="button" class="chip" aria-pressed="' + active + '" ' + attrs + ">" + esc(name) + "</button>";
    }).join("");
  }

  function barHTML(colId) {
    const opts = SORTS.map(([v, l]) => '<option value="' + v + '"' + (state.sort === v ? " selected" : "") + ">" + esc(l) + "</option>").join("");
    return '<div class="shop-bar">'
      + '<div class="shop-bar-in container">'
      + '<nav class="shop-chips" aria-label="Collections"><div class="shop-chips-track">' + chipsHTML(colId) + "</div></nav>"
      + '<div class="shop-tools">'
      + '<span class="shop-bar-count" data-shop-count aria-hidden="true"></span>'
      + '<label class="shop-sort"><span class="shop-sort-k">Sort</span><select class="shop-sort-select" data-shop-sort aria-label="Sort by">' + opts + "</select>" + icon("chevron-down", 16) + "</label>"
      + '<button type="button" class="shop-filter-btn" data-shop-filter aria-haspopup="dialog" aria-expanded="false" aria-controls="shop-sheet">'
      + '<span class="shop-filter-k">Filter</span><span class="shop-filter-v" data-shop-size-label></span>' + icon("plus", 16) + "</button>"
      + "</div></div></div>";
  }

  function moreHTML(colId) {
    const others = collections().filter(c => c.id !== colId);
    if (!others.length) return "";
    const rows = others.map(c => {
      const i = collections().indexOf(c) + 1;
      const n = products().filter(p => p.collection === c.id).length;
      const lead = leadFor(c.id);
      return '<li><a class="shop-more-row" href="#/shop/' + esc(c.id) + '" data-reveal="up"' + (lead && lead.src ? ' data-peek="' + esc(lead.src) + '"' : "") + ">"
        + '<span class="shop-more-no">' + pad(i) + "</span>"
        + '<span class="shop-more-name">' + esc(c.name) + "</span>"
        + '<span class="shop-more-tag">' + esc(c.tagline || "") + "</span>"
        + '<span class="shop-more-n">' + esc(tees(n)) + "</span>"
        + '<span class="shop-more-arrow">' + icon("arrow-up-right", 28) + "</span></a></li>";
    }).join("");
    return '<section class="shop-more container" aria-labelledby="shop-more-h">'
      + '<div class="shop-rule"><span id="shop-more-h">' + (colId ? "Keep looking" : "Shop by collection") + "</span><span>" + pad(others.length) + (others.length === 1 ? " collection" : " collections") + "</span></div>"
      + '<ul class="shop-more-list" data-stagger="90">' + rows + "</ul>"
      + '<div class="shop-more-peek" aria-hidden="true"><img alt="" width="1000" height="1000" decoding="async"></div>'
      + "</section>";
  }

  /* ---------- painting the grid ---------- */
  function updateCounts() {
    if (!page) return;
    const n = filtered(page.base, state.size).length;
    AW.$$("[data-shop-count]", page.root).forEach(el => { el.textContent = tees(n); });
    const lab = AW.$("[data-shop-size-label]", page.root);
    if (lab) lab.textContent = state.size ? state.size : "";
    const btn = AW.$("[data-shop-filter]", page.root);
    if (btn) {
      btn.classList.toggle("is-active", !!state.size);
      btn.setAttribute("aria-label", state.size ? "Filter, size " + state.size + " selected" : "Filter by size");
    }
  }

  let paintTimer = 0;
  function paint(animate) {
    if (!page) return;
    const wrap = AW.$(".shop-grid-wrap", page.root);
    if (!wrap) return;
    const list = ordered(filtered(page.base, state.size));
    const swap = () => {
      wrap.innerHTML = gridHTML(list);
      updateCounts();
      if (AW.motion && AW.motion.refresh) { try { AW.motion.refresh(wrap); } catch (e) {} }
      if (ui().refreshMedia) ui().refreshMedia();
    };
    clearTimeout(paintTimer);
    if (!animate || rm()) { swap(); return; }
    // Hold the height so the page doesn't jump, fade out, swap, fade in. Scroll position stays put.
    wrap.style.minHeight = wrap.offsetHeight + "px";
    wrap.classList.add("is-swapping");
    paintTimer = setTimeout(() => {
      swap();
      requestAnimationFrame(() => {
        wrap.classList.remove("is-swapping");
        paintTimer = setTimeout(() => { wrap.style.minHeight = ""; }, 400);
      });
    }, 200);
  }

  /* ---------- filter sheet (mobile bottom sheet, desktop dropdown) ---------- */
  let sheet = null, release = null, pending = "", openedAt = 0;
  const desktop = () => window.matchMedia && matchMedia("(min-width: 900px)").matches;

  function ensureSheet() {
    if (sheet && document.contains(sheet)) return sheet;
    const host = document.getElementById("overlay-root") || document.body;
    sheet = document.createElement("div");
    sheet.className = "shop-sheet";
    sheet.hidden = true;
    sheet.innerHTML = '<div class="shop-sheet-scrim" data-shop-close></div>'
      + '<div class="shop-sheet-panel" id="shop-sheet" role="dialog" aria-modal="true" aria-labelledby="shop-sheet-h" tabindex="-1">'
      + '<div class="shop-sheet-head"><h2 class="shop-sheet-h" id="shop-sheet-h">Filter</h2>'
      + '<button type="button" class="shop-sheet-x" data-shop-close aria-label="Close filter">' + icon("close", 20) + "</button></div>"
      + '<div class="shop-sheet-body"><p class="shop-sheet-k" id="shop-sheet-size">Size</p>'
      + '<div class="shop-sheet-sizes" role="group" aria-labelledby="shop-sheet-size"></div>'
      + '<p class="shop-sheet-hint">Classic fit. If you like it roomy, size up.</p></div>'
      + '<div class="shop-sheet-foot">'
      + '<button type="button" class="shop-sheet-clear" data-shop-sheet-clear>Clear</button>'
      + (ui().btn ? ui().btn("Show", { variant: "primary", attrs: "data-shop-apply" }) : '<button type="button" class="btn btn--primary" data-shop-apply><span class="btn-label">Show</span></button>')
      + "</div></div>";
    host.appendChild(sheet);
    sheet.addEventListener("click", e => {
      const t = e.target;
      if (t.closest("[data-shop-close]")) return closeSheet();
      const s = t.closest("[data-shop-size]");
      if (s) { pending = pending === s.dataset.shopSize ? "" : s.dataset.shopSize; syncSheet(); return; }
      if (t.closest("[data-shop-sheet-clear]")) { pending = ""; syncSheet(); return; }
      if (t.closest("[data-shop-apply]")) { applySize(pending); closeSheet(); }
    });
    return sheet;
  }

  function syncSheet() {
    if (!sheet || !page) return;
    const box = AW.$(".shop-sheet-sizes", sheet);
    box.innerHTML = allSizes().map(s => {
      const n = filtered(page.base, s).length;
      const on = pending === s;
      return '<button type="button" class="shop-size' + (n ? "" : " is-none") + '" data-shop-size="' + esc(s) + '" aria-pressed="' + on + '" aria-label="' + esc(s + ", " + tees(n)) + '">' + esc(s) + "</button>";
    }).join("");
    const n = filtered(page.base, pending).length;
    const lab = AW.$("[data-shop-apply] .btn-label", sheet) || AW.$("[data-shop-apply]", sheet);
    if (lab) lab.textContent = "Show " + tees(n);
    const clr = AW.$("[data-shop-sheet-clear]", sheet);
    if (clr) clr.disabled = !pending;
  }

  function placeSheet() {
    if (!sheet || sheet.hidden || !page) return;
    const panel = AW.$(".shop-sheet-panel", sheet);
    const btn = AW.$("[data-shop-filter]", page.root);
    if (!desktop() || !btn) { panel.style.top = panel.style.right = ""; return; }
    const r = btn.getBoundingClientRect();
    panel.style.top = Math.round(r.bottom + 10) + "px";
    panel.style.right = Math.max(16, Math.round(document.documentElement.clientWidth - r.right)) + "px";
  }

  const onKey = e => { if (e.key === "Escape" && sheet && !sheet.hidden) { e.preventDefault(); closeSheet(); } };
  const onResize = () => placeSheet();

  function openSheet() {
    ensureSheet();
    pending = state.size;
    syncSheet();
    sheet.hidden = false;
    sheet.classList.toggle("is-drop", desktop());
    placeSheet();
    openedAt = Date.now();
    const btn = page && AW.$("[data-shop-filter]", page.root);
    if (btn) btn.setAttribute("aria-expanded", "true");
    if (ui().lockScroll) ui().lockScroll(true); else document.documentElement.style.overflow = "hidden";
    requestAnimationFrame(() => requestAnimationFrame(() => sheet && sheet.classList.add("is-open")));
    const panel = AW.$(".shop-sheet-panel", sheet);
    if (ui().trapFocus) release = ui().trapFocus(panel);
    else { const op = document.activeElement; panel.focus(); release = () => op && op.focus && op.focus(); }
    const first = AW.$('.shop-size[aria-pressed="true"]', sheet) || AW.$(".shop-size", sheet);
    if (first) first.focus({ preventScroll: true });
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize, { passive: true });
  }

  function closeSheet(noFocus) {
    if (!sheet || sheet.hidden) return;
    sheet.classList.remove("is-open");
    document.removeEventListener("keydown", onKey);
    window.removeEventListener("resize", onResize);
    if (ui().lockScroll) ui().lockScroll(false); else document.documentElement.style.overflow = "";
    const btn = page && AW.$("[data-shop-filter]", page.root);
    if (btn) btn.setAttribute("aria-expanded", "false");
    const r = release; release = null;
    if (r) { if (noFocus) { /* route change: no focus return */ } else r(); }
    const s = sheet;
    setTimeout(() => { if (!s.classList.contains("is-open")) s.hidden = true; }, rm() ? 0 : 420);
  }

  function applySize(size) {
    if (state.size === size) return;
    state.size = size;
    persist();
    paint(true);
  }

  /* ---------- hover peek on the collection rows (fine pointers only) ---------- */
  function bindPeek(root) {
    const band = AW.$(".shop-more", root);
    const peek = band && AW.$(".shop-more-peek", band);
    if (!peek || !window.matchMedia || !matchMedia("(hover: hover) and (pointer: fine) and (min-width: 1024px)").matches || rm()) return;
    const img = AW.$("img", peek);
    let x = 0, y = 0, tx = 0, ty = 0, raf = 0, on = false;
    const loop = () => {
      x += (tx - x) * 0.18; y += (ty - y) * 0.18;
      peek.style.transform = "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0)";
      raf = (on || Math.abs(tx - x) > 0.5 || Math.abs(ty - y) > 0.5) ? requestAnimationFrame(loop) : 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
    band.addEventListener("pointermove", e => {
      const r = band.getBoundingClientRect();
      tx = e.clientX - r.left + 28; ty = e.clientY - r.top - 140;
      if (!on) { x = tx; y = ty; }
      kick();
    }, { passive: true });
    band.addEventListener("pointerover", e => {
      const row = e.target.closest && e.target.closest(".shop-more-row");
      if (!row || !row.dataset.peek) return;
      if (img.getAttribute("src") !== row.dataset.peek) img.setAttribute("src", row.dataset.peek);
      on = true; peek.classList.add("is-on"); kick();
    });
    band.addEventListener("pointerout", e => {
      const row = e.target.closest && e.target.closest(".shop-more-row");
      const to = e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest(".shop-more-row");
      if (row && !to) { on = false; peek.classList.remove("is-on"); }
    });
  }

  /* ---------- the route ---------- */
  AW.route("shop", (app, arg) => {
    const want = arg && arg !== "all" ? arg : "";
    const col = want ? colById(want) : null;
    const unknown = !!want && !col;
    const base = col ? products().filter(p => p.collection === col.id) : products().slice();
    document.title = (col ? col.name : "Shop") + " | AWEZA";

    app.innerHTML = '<div class="shop' + (col ? " shop--col" : " shop--all") + '" data-col="' + esc(col ? col.id : "all") + '">'
      + headHTML(col, unknown, filtered(base, state.size).length)
      + barHTML(col ? col.id : "")
      + '<section class="shop-list container" aria-label="Products"><div class="shop-grid-wrap"></div></section>'
      + moreHTML(col ? col.id : "")
      + "</div>";

    const root = AW.$(".shop", app);
    page = { root, colId: col ? col.id : null, base };
    paint(false);

    // Keep the active chip in view inside its own scroller (never scrolls the page).
    const track = AW.$(".shop-chips-track", root);
    const act = track && AW.$('[aria-pressed="true"]', track);
    if (act && track.scrollWidth > track.clientWidth) track.scrollLeft = Math.max(0, act.offsetLeft - 16);

    root.addEventListener("click", e => {
      const go = e.target.closest("[data-shop-go]");
      if (go) {
        const h = go.getAttribute("data-shop-go");
        if (("#/shop" === h && (location.hash === "#/shop" || location.hash === "#/shop/all" || location.hash === "#/shop/")) || location.hash === h) return;
        if (AW.go) AW.go(h); else location.hash = h;
        return;
      }
      if (e.target.closest("[data-shop-filter]")) {
        if (sheet && !sheet.hidden && Date.now() - openedAt > 200) closeSheet(); else openSheet();
        return;
      }
      if (e.target.closest("[data-shop-clear]")) { applySize(""); }
    });
    const sel = AW.$("[data-shop-sort]", root);
    if (sel) sel.addEventListener("change", () => { state.sort = sel.value; persist(); paint(true); });
    bindPeek(root);
  });

  if (AW.on) AW.on("route", d => {
    if (!d || d.page !== "shop") { page = null; }
    closeSheet(true);
  });
})();
