/* AWEZA product page (PDP). Owner: agent 05. Prefix .pdp-*
   Route: #/product/<id>. Gallery (scroll-snap, swipe), size radiogroup, Add to Bag,
   sticky mobile buy bar, full-screen zoom (.pdp-zoom in #overlay-root), editorial strip, related. */
(() => {
  const AW = window.AW;
  if (!AW || !AW.route) return;

  /* ---------- helpers with local fallbacks (ui.js may be missing while building) ---------- */
  const U = () => AW.ui || {};
  const esc = s => (AW.esc ? AW.esc(s) : String(s));
  const rand = n => (AW.rand ? AW.rand(n) : "R" + n);
  const reduced = () => !!((AW.motion && AW.motion.reduced) ||
    (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches));
  const base = src => (src.split("/").pop() || "").replace(/\.\w+$/, "");

  const ICONS = {
    "arrow-left": '<path d="M19 12H5M11 18l-6-6 6-6"/>',
    "arrow-right": '<path d="M5 12h14M13 6l6 6-6 6"/>',
    "arrow-up-right": '<path d="M7 17 17 7M8 7h9v9"/>',
    "chevron-down": '<path d="m6 9 6 6 6-6"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    ruler: '<path d="M3 15.5 15.5 3 21 8.5 8.5 21z"/><path d="m7 12 2 2M10 9l2 2M13 6l2 2"/>',
    truck: '<path d="M2 6h12v10H2zM14 10h4l3 3v3h-7"/><circle cx="6" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
    "return": '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
    shield: '<path d="M12 3 4.5 6v6c0 4.4 3.2 7.8 7.5 9 4.3-1.2 7.5-4.6 7.5-9V6z"/><path d="m9 12 2 2 4-4"/>',
    zoom: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.4-4.4M11 8v6M8 11h6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
  };
  const icon = (name, size = 20) => {
    const u = U();
    if (u.icon) { try { const s = u.icon(name, { size }); if (s) return s; } catch (e) { /* fall through */ } }
    return `<svg class="pdp-ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[name] || ""}</svg>`;
  };
  const fitFor = src => (U().fitFor ? U().fitFor(src) : (/(^|\/)(male-|collar|hanging)/.test(src) ? "cover" : "contain"));
  const printSide = p => (U().printSide ? U().printSide(p) : (["captain-save", "need-a-hug", "mini-lips"].includes(p.id) ? "front" : "back"));
  const artFor = id => {
    if (U().artFor) return U().artFor(id);
    const m = { "ceo-of-bad-decisions": "ceo-print", "zero-exes": "zero-exes-print", "need-a-hug": "need-a-hug-print",
      "sweet-cupcake": "sweet-cupcake-print", "captain-save": "captain-save-sheet", "signature-lips": "lips-logo" };
    return m[id] ? `images/brand/art/${m[id]}.jpg` : null;
  };
  const altFor = (p, src) => {
    if (U().altFor) return U().altFor(p, src);
    const b = base(src);
    const v = /^male-front/.test(b) ? "worn front" : /^male-back/.test(b) ? "worn back" : /^male-duo/.test(b) ? "two models"
      : /sleeve/.test(b) ? "sleeve detail" : b === "collar" ? "collar detail" : b === "hanging-1" ? "hanging" : b;
    return `${p.name}, ${v} view`;
  };
  const img = (src, o = {}) => {
    const u = U();
    if (u.img) return u.img(src, o);
    const fit = o.fit || fitFor(src);
    return `<div class="media media--${fit} ${o.className || ""}" style="aspect-ratio:${o.ratio || "1/1"}"><img src="${esc(src)}" alt="${esc(o.alt || "")}" width="1000" height="1000" ${o.eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'} decoding="async" onload="this.parentNode.classList.add('is-loaded')"></div>`;
  };
  const card = (p, o) => {
    const u = U();
    if (u.card) return u.card(p, o);
    const src = p.images[0];
    return `<article class="card" data-reveal="up"><a class="card-link" href="#/product/${esc(p.id)}">${img(src, { ratio: "4/5", alt: altFor(p, src) })}<div class="card-info"><p>${esc(p.name)}</p><p>${esc(AW.colName(p.collection))}</p><p class="price">${rand(p.price)}</p></div></a></article>`;
  };
  const lockScroll = on => {
    const u = U();
    if (u.lockScroll) return u.lockScroll(on);
    document.documentElement.style.overflow = on ? "hidden" : "";
  };
  const trapFocus = el => {
    const u = U();
    if (u.trapFocus) return u.trapFocus(el);
    const onKey = e => {
      if (e.key !== "Tab") return;
      const f = [...el.querySelectorAll('button:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])')].filter(n => n.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  };
  const pad2 = n => String(n).padStart(2, "0");
  const overlayRoot = () => document.getElementById("overlay-root") || document.body;

  /* ---------- per-page state + cleanup ---------- */
  let cleanups = [];
  let currentId = null;
  const cleanup = () => { cleanups.forEach(fn => { try { fn(); } catch (e) { /* ignore */ } }); cleanups = []; };
  let closeZoom = null;
  AW.on("route", d => {
    if (closeZoom) closeZoom(true);
    if (!d || d.page !== "product" || d.arg !== currentId) { cleanup(); currentId = null; }
  });

  /* ---------- slides ---------- */
  function slidesFor(p) {
    const list = (p.images || []).map(src => ({ src, kind: "photo", alt: altFor(p, src) }));
    const art = artFor(p.id);
    if (art) list.push({ src: art, kind: "art", alt: `${p.name}: the print artwork` });
    return list;
  }
  const sideIndex = (slides, side) => {
    let i = slides.findIndex(s => s.kind === "photo" && new RegExp(`^male-${side}`).test(base(s.src)));
    if (i < 0) i = slides.findIndex(s => s.kind === "photo" && base(s.src) === side);
    return i;
  };
  const sideOf = s => {
    if (!s || s.kind !== "photo") return "";
    const b = base(s.src);
    return /front/.test(b) ? "front" : /back/.test(b) ? "back" : "";
  };

  function slideHTML(p, s, i) {
    const inner = s.kind === "art"
      ? `<figure class="pdp-art"><img src="${esc(s.src)}" alt="${esc(s.alt)}" width="1000" height="1000" loading="lazy" decoding="async"><figcaption class="pdp-art-cap"><span>Fig. ${pad2(i + 1)}</span><span>The print</span></figcaption></figure>`
      : img(s.src, { ratio: "1/1", alt: s.alt, eager: i === 0, className: "pdp-slide-media", sizes: "(min-width:1024px) 52vw, 100vw" });
    return `<li class="pdp-slide${s.kind === "art" ? " pdp-slide--art" : ""}" data-i="${i}" role="group" aria-roledescription="slide" aria-label="${i + 1} of ${"{N}"}">
      <button type="button" class="pdp-slide-btn" data-zoom="${i}" tabindex="-1" aria-label="Zoom image ${i + 1}: ${esc(s.alt)}">${inner}</button></li>`;
  }

  /* ---------- render ---------- */
  function notFound(app) {
    document.title = "Not found | AWEZA";
    app.innerHTML = `<section class="pdp-missing container">
      <p class="pdp-missing-label">Error 404 · Product</p>
      <h1 class="pdp-missing-title">This tee made a <em>bad decision.</em></h1>
      <p class="pdp-missing-copy">It isn't here. The rest of the shop is.</p>
      <a class="btn btn--primary btn--lg" href="#/shop">Back to the shop ${icon("arrow-right")}</a>
    </section>`;
  }

  AW.route("product", (app, id) => {
    cleanup();
    const p = id && AW.byId(id);
    if (!p) { currentId = id; notFound(app); return; }
    currentId = id;
    document.title = `${p.name} | AWEZA`;

    const slides = slidesFor(p);
    const N = slides.length;
    const col = (AW.collections || []).find(c => c.id === p.collection) || { name: AW.colName(p.collection), tagline: "" };
    const idx = AW.products.indexOf(p);
    const frontI = sideIndex(slides, "front"), backI = sideIndex(slides, "back");
    const ups = (AW.config && AW.config.sizeUpcharge) || {};
    const sizes = p.sizes || [];
    const badgeRed = /new|best/i.test(p.badge || "");
    const conf = AW.config || {};
    const side = printSide(p);

    // Editorial image: male-duo, else first male-back-*
    const edSrc = (p.images || []).find(s => /\/male-duo\.jpg$/.test(s)) || (p.images || []).find(s => /\/male-back-/.test(s));
    const related = AW.products.filter(x => x.id !== p.id)
      .sort((a, b) => (b.collection === p.collection) - (a.collection === p.collection))
      .slice(0, 4);

    const slidesMarkup = slides.map((s, i) => slideHTML(p, s, i).replace("{N}", N)).join("");
    const thumbs = slides.map((s, i) => `<li><button type="button" class="pdp-thumb${i === 0 ? " is-active" : ""}" data-go="${i}" aria-label="Show image ${i + 1}"${i === 0 ? ' aria-current="true"' : ""}>
        ${s.kind === "art" ? `<span class="pdp-thumb-art"><img src="${esc(s.src)}" alt="" width="1000" height="1000" loading="lazy" decoding="async"></span>` : img(s.src, { ratio: "1/1", alt: "", className: "pdp-thumb-media" })}
      </button></li>`).join("");
    const dashes = slides.map((s, i) => `<span class="pdp-dash${i === 0 ? " is-active" : ""}"></span>`).join("");

    const sizeBtns = sizes.map((s, i) => `<button type="button" class="pdp-size" role="radio" aria-checked="false" tabindex="${i === 0 ? 0 : -1}" data-size="${esc(s)}">
        <span class="pdp-size-l">${esc(s)}</span>${ups[s] ? `<span class="pdp-size-up">+${rand(ups[s])}</span>` : ""}</button>`).join("");

    app.innerHTML = `
    <article class="pdp" data-pdp="${esc(p.id)}">
      <div class="pdp-top container">
        <section class="pdp-gallery" aria-roledescription="carousel" aria-label="${esc(p.name)} images">
          <ol class="pdp-thumbs" aria-label="Image thumbnails">${thumbs}</ol>
          <div class="pdp-stage">
            <ul class="pdp-track" tabindex="0" aria-label="Product images. Use left and right arrow keys to browse.">${slidesMarkup}</ul>
            ${frontI > -1 && backI > -1 ? `<div class="pdp-sides" role="group" aria-label="Jump to side">
              <button type="button" class="pdp-side" data-side="front" data-go="${frontI}" aria-pressed="${sideOf(slides[0]) === "front"}">Front</button>
              <button type="button" class="pdp-side" data-side="back" data-go="${backI}" aria-pressed="${sideOf(slides[0]) === "back"}">Back</button>
            </div>` : ""}
            ${p.badge ? `<span class="pdp-sticker${badgeRed ? " pdp-sticker--red" : ""}">${esc(p.badge)}</span>` : ""}
            <div class="pdp-ctrl">
              <button type="button" class="pdp-arrow" data-step="-1" aria-label="Previous image">${icon("arrow-left", 18)}</button>
              <p class="pdp-count" aria-live="polite"><span class="pdp-count-i">01</span><span class="pdp-count-sep">/</span><span>${pad2(N)}</span></p>
              <button type="button" class="pdp-arrow" data-step="1" aria-label="Next image">${icon("arrow-right", 18)}</button>
            </div>
            <div class="pdp-dashes" aria-hidden="true">${dashes}</div>
            <span class="pdp-zoomhint" aria-hidden="true">${icon("zoom", 16)} Zoom in</span>
          </div>
        </section>

        <section class="pdp-info" aria-label="Product details">
          <div class="pdp-panel">
            <div class="pdp-meta">
              <a class="pdp-col" href="#/shop/${esc(p.collection)}">${esc(col.name)}</a>
              <span class="pdp-no">No. ${pad2(idx + 1)} / ${pad2(AW.products.length)}</span>
            </div>
            <div class="pdp-title">
              <h1 class="pdp-name">${esc(p.name)}</h1>
              <p class="pdp-price" data-price><span class="pdp-price-v">${rand(AW.priceFor(p))}</span></p>
            </div>
            <p class="pdp-tax">${esc(p.colourName || "White")} · Print on the ${side} · VAT included</p>

            <div class="pdp-buy">
              <div class="pdp-size-head">
                <p class="pdp-size-label" id="pdp-size-label">Size <span class="pdp-size-chosen" aria-live="polite"></span></p>
                <a class="pdp-guide" href="#/size-guide">${icon("ruler", 16)}<span>Size guide</span></a>
              </div>
              <div class="pdp-sizes${sizes.length > 8 ? " pdp-sizes--5" : ""}" role="radiogroup" aria-labelledby="pdp-size-label">${sizeBtns}</div>
              <p class="pdp-msg" role="status" aria-live="polite"></p>
              <button type="button" class="btn btn--primary btn--lg btn--block pdp-add" data-magnetic="0.2">
                <span class="pdp-add-in">
                  <span class="pdp-add-a">Add to Bag <span class="pdp-add-p">${rand(AW.priceFor(p))}</span></span>
                  <span class="pdp-add-b" aria-hidden="true">${icon("check", 18)} Added</span>
                </span>
              </button>
              <p class="pdp-fit">Classic fit. If you like it roomy, size up.${sizes.some(z => ups[z]) ? `<span class="pdp-up-note">2XL and up cost a little more. More shirt, more ink.</span>` : ""}</p>
              <p class="pdp-note">${icon("truck", 16)}<span>Free delivery over ${rand(conf.freeDeliveryOver || 2000)}. Printed to order.</span></p>
            </div>

            <p class="pdp-summary">${esc(p.summary || "")}</p>

            <div class="pdp-accs">
              <details class="accordion pdp-acc" open>
                <summary>Details</summary>
                <div class="accordion-body pdp-acc-body"><ul class="pdp-specs">
                  <li><span>Fit</span><span>${esc(p.fit || "Classic fit")}</span></li>
                  <li><span>Colour</span><span>${esc(p.colourName || "White")}</span></li>
                  <li><span>Print</span><span>${side === "back" ? "Statement on the back" : "Statement on the front"}</span></li>
                  <li><span>Made</span><span>Printed to order in small batches</span></li>
                </ul></div>
              </details>
              <details class="accordion pdp-acc">
                <summary>Delivery</summary>
                <div class="accordion-body pdp-acc-body"><p>Flat ${rand(conf.delivery || 179)} anywhere in South Africa. Free over ${rand(conf.freeDeliveryOver || 2000)}. Each tee is printed when you order it, so give it a few extra days.</p><p><a class="pdp-link" href="#/help">Delivery and FAQ</a></p></div>
              </details>
              <details class="accordion pdp-acc">
                <summary>Returns</summary>
                <div class="accordion-body pdp-acc-body"><p>Wrong size or a print problem? We'll sort it out. Read the fine print before you send anything back.</p><p><a class="pdp-link" href="#/returns">Returns policy</a></p></div>
              </details>
              <details class="accordion pdp-acc">
                <summary>Care</summary>
                <div class="accordion-body pdp-acc-body"><p>Wash cold, inside out. Hang to dry. Never iron the print. It took a stand; let it keep standing.</p></div>
              </details>
            </div>

            <ul class="pdp-trust">
              <li>${icon("truck", 18)}<span>Delivery across SA</span></li>
              <li>${icon("return", 18)}<span>Easy returns</span></li>
              <li>${icon("shield", 18)}<span>Secure checkout</span></li>
            </ul>
          </div>
        </section>
      </div>

      ${edSrc ? `<section class="pdp-ed" aria-label="${esc(col.name)}">
        <div class="pdp-ed-media" data-reveal="img">${img(edSrc, { ratio: "16/10", fit: "cover", alt: altFor(p, edSrc), className: "pdp-ed-img" })}</div>
        <div class="pdp-ed-copy container">
          <p class="pdp-ed-fig">Fig. ${pad2(N + 1)} · ${esc(col.name)}</p>
          <blockquote class="pdp-ed-quote" data-reveal="lines" data-split="words">${esc(col.tagline || "Time of your life.")}</blockquote>
          <a class="pdp-ed-link" href="#/shop/${esc(p.collection)}">See the whole line ${icon("arrow-right", 18)}</a>
        </div>
      </section>` : ""}

      ${related.length ? `<section class="pdp-rel container" aria-labelledby="pdp-rel-title">
        <div class="pdp-rel-head">
          <p class="pdp-rel-label">More from AWEZA</p>
          <h2 class="pdp-rel-title" id="pdp-rel-title" data-reveal="lines">Complete the <em>statement.</em></h2>
          <a class="pdp-rel-all" href="#/shop">Shop all ${icon("arrow-right", 16)}</a>
        </div>
        <div class="product-grid pdp-rel-grid" data-stagger>${related.map((r, i) => card(r, { index: i })).join("")}</div>
      </section>` : ""}
    </article>`;

    bind(app, p, slides);
  });

  /* ---------- behaviour ---------- */
  function bind(app, p, slides) {
    const root = app.querySelector(".pdp");
    const track = root.querySelector(".pdp-track");
    const slideEls = [...track.children];
    const N = slides.length;
    const countI = root.querySelector(".pdp-count-i");
    const dashEls = [...root.querySelectorAll(".pdp-dash")];
    const thumbEls = [...root.querySelectorAll(".pdp-thumb")];
    const sideEls = [...root.querySelectorAll(".pdp-side")];
    const arrows = [...root.querySelectorAll(".pdp-arrow")];
    let cur = 0;

    // mark loaded images when ui.js isn't there to do it
    root.querySelectorAll(".media img").forEach(im => {
      const done = () => im.parentNode && im.parentNode.classList.add("is-loaded");
      if (im.complete && im.naturalWidth) done(); else im.addEventListener("load", done, { once: true });
    });

    const setActive = i => {
      if (i === cur && countI.textContent === pad2(i + 1)) return;
      cur = i;
      countI.textContent = pad2(i + 1);
      dashEls.forEach((d, k) => d.classList.toggle("is-active", k === i));
      thumbEls.forEach((t, k) => {
        t.classList.toggle("is-active", k === i);
        if (k === i) { t.setAttribute("aria-current", "true"); } else t.removeAttribute("aria-current");
      });
      const sd = sideOf(slides[i]);
      sideEls.forEach(b => b.setAttribute("aria-pressed", String(b.dataset.side === sd)));
      arrows[0] && (arrows[0].disabled = i === 0);
      arrows[1] && (arrows[1].disabled = i === N - 1);
      // keep active thumb in view on desktop rail
      const t = thumbEls[i];
      const rail = t && t.closest(".pdp-thumbs");
      if (rail && rail.scrollHeight > rail.clientHeight) {
        const top = t.offsetTop - rail.clientHeight / 2 + t.offsetHeight / 2;
        rail.scrollTo({ top, behavior: reduced() ? "auto" : "smooth" });
      }
    };
    arrows[0] && (arrows[0].disabled = true);

    const goTo = (i, smooth = true) => {
      i = Math.max(0, Math.min(N - 1, i));
      const el = slideEls[i];
      if (!el) return;
      track.scrollTo({ left: el.offsetLeft, behavior: smooth && !reduced() ? "smooth" : "auto" });
      setActive(i);
    };

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const w = track.clientWidth || 1;
        setActive(Math.max(0, Math.min(N - 1, Math.round(track.scrollLeft / w))));
      });
    };
    track.addEventListener("scroll", onScroll, { passive: true });

    track.addEventListener("keydown", e => {
      if (e.key === "ArrowRight") { e.preventDefault(); goTo(cur + 1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); goTo(cur - 1); }
      else if (e.key === "Home") { e.preventDefault(); goTo(0); }
      else if (e.key === "End") { e.preventDefault(); goTo(N - 1); }
      else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openZoom(p, slides, cur, i => goTo(i, false), track); }
    });

    // Desktop: mouse drag on the track feels natural on a big image
    let drag = null;
    track.addEventListener("pointerdown", e => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      drag = { x: e.clientX, left: track.scrollLeft, moved: false };
    });
    const onMove = e => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (Math.abs(dx) > 6) { drag.moved = true; track.classList.add("is-dragging"); }
      if (drag.moved) track.scrollLeft = drag.left - dx;
    };
    const onUp = e => {
      if (!drag) return;
      const moved = drag.moved, dx = e.clientX - drag.x;
      track.classList.remove("is-dragging");
      drag = null;
      if (moved) {
        track.dataset.justDragged = "1";
        setTimeout(() => delete track.dataset.justDragged, 60);
        goTo(Math.abs(dx) > 60 ? cur + (dx < 0 ? 1 : -1) : cur);
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp);
    cleanups.push(() => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); });

    // Re-align on resize (slide width changes)
    const onResize = () => goTo(cur, false);
    window.addEventListener("resize", onResize, { passive: true });
    cleanups.push(() => window.removeEventListener("resize", onResize));

    /* ----- sizes ----- */
    const sizeWrap = root.querySelector(".pdp-sizes");
    const sizeBtns = [...root.querySelectorAll(".pdp-size")];
    const chosenEl = root.querySelector(".pdp-size-chosen");
    const msg = root.querySelector(".pdp-msg");
    const priceV = root.querySelector(".pdp-price-v");
    const addP = root.querySelector(".pdp-add-p");
    let size = null;

    const setPrice = () => {
      const v = rand(AW.priceFor(p, size));
      if (priceV.textContent === v) return;
      priceV.textContent = v;
      addP.textContent = v;
      if (!reduced()) { priceV.classList.remove("is-swap"); void priceV.offsetWidth; priceV.classList.add("is-swap"); }
      if (bar) bar.querySelector(".pdp-bar-price").textContent = v;
    };
    const choose = (btn, focus) => {
      size = btn.dataset.size;
      sizeBtns.forEach(b => { const on = b === btn; b.setAttribute("aria-checked", String(on)); b.tabIndex = on ? 0 : -1; });
      if (focus) btn.focus();
      chosenEl.textContent = `· ${size}`;
      msg.textContent = "";
      sizeWrap.classList.remove("is-error");
      setPrice();
      if (bar) bar.querySelector(".pdp-bar-size").textContent = `Size ${size}`;
    };
    sizeWrap.addEventListener("click", e => {
      const b = e.target.closest(".pdp-size");
      if (b) choose(b, false);
    });
    sizeWrap.addEventListener("keydown", e => {
      const i = sizeBtns.indexOf(document.activeElement);
      if (i < 0) return;
      const k = e.key;
      let n = -1;
      if (k === "ArrowRight" || k === "ArrowDown") n = (i + 1) % sizeBtns.length;
      else if (k === "ArrowLeft" || k === "ArrowUp") n = (i - 1 + sizeBtns.length) % sizeBtns.length;
      else if (k === "Home") n = 0;
      else if (k === "End") n = sizeBtns.length - 1;
      else if (k === " " || k === "Enter") { e.preventDefault(); choose(sizeBtns[i], true); return; }
      if (n > -1) { e.preventDefault(); choose(sizeBtns[n], true); }
    });

    const shake = () => {
      msg.textContent = "Pick a size first. We'll wait.";
      sizeWrap.classList.add("is-error");
      sizeWrap.classList.remove("is-shake"); void sizeWrap.offsetWidth; sizeWrap.classList.add("is-shake");
    };

    /* ----- add to bag ----- */
    const addBtn = root.querySelector(".pdp-add");
    let doneT = 0;
    const currentImg = () => {
      const s = slideEls[cur];
      return (s && s.querySelector("img")) || root.querySelector(".pdp-track img");
    };
    const add = fromBar => {
      if (!size) {
        if (fromBar) {
          const top = sizeWrap.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.3;
          if (AW.motion && AW.motion.scrollTo) AW.motion.scrollTo(Math.max(0, top));
          else window.scrollTo({ top: Math.max(0, top), behavior: reduced() ? "auto" : "smooth" });
          setTimeout(shake, reduced() ? 0 : 380);
          setTimeout(() => sizeBtns[0] && sizeBtns[0].focus({ preventScroll: true }), reduced() ? 0 : 420);
        } else shake();
        return;
      }
      AW.cart.add(p.id, size);
      if (AW.motion && AW.motion.flyToBag) { try { AW.motion.flyToBag(currentImg()); } catch (e) { /* ignore */ } }
      [addBtn, bar && bar.querySelector(".pdp-bar-add")].forEach(b => b && b.classList.add("pdp-is-added"));
      clearTimeout(doneT);
      doneT = setTimeout(() => [addBtn, bar && bar.querySelector(".pdp-bar-add")].forEach(b => b && b.classList.remove("pdp-is-added")), 1600);
    };
    addBtn.addEventListener("click", () => add(false));
    cleanups.push(() => clearTimeout(doneT));

    /* ----- gallery clicks (delegated) ----- */
    root.addEventListener("click", e => {
      const go = e.target.closest("[data-go]");
      if (go) { goTo(+go.dataset.go); return; }
      const st = e.target.closest("[data-step]");
      if (st) { goTo(cur + +st.dataset.step); return; }
      const z = e.target.closest("[data-zoom]");
      if (z) { if (track.dataset.justDragged) return; openZoom(p, slides, +z.dataset.zoom, i => goTo(i, false), z); }
    });

    /* ----- sticky mobile buy bar ----- */
    const bar = document.createElement("div");
    bar.className = "pdp-bar";
    bar.setAttribute("aria-hidden", "true");
    const thumbSrc = p.images[0];
    bar.innerHTML = `<div class="pdp-bar-in">
      <span class="pdp-bar-thumb">${img(thumbSrc, { ratio: "1/1", alt: "", fit: "cover" })}</span>
      <span class="pdp-bar-txt"><span class="pdp-bar-name">${esc(p.name)}</span><span class="pdp-bar-sub"><span class="pdp-bar-price">${rand(AW.priceFor(p))}</span><span class="pdp-bar-size">Select a size</span></span></span>
      <button type="button" class="btn btn--primary pdp-bar-add" tabindex="-1"><span class="pdp-add-in"><span class="pdp-add-a">Add to Bag</span><span class="pdp-add-b" aria-hidden="true">${icon("check", 16)} Added</span></span></button>
    </div>`;
    overlayRoot().appendChild(bar);
    const barImg = bar.querySelector("img");
    if (barImg) { const d = () => barImg.parentNode.classList.add("is-loaded"); barImg.complete ? d() : barImg.addEventListener("load", d, { once: true }); }
    bar.querySelector(".pdp-bar-add").addEventListener("click", () => add(true));
    cleanups.push(() => bar.remove());

    let pastBtn = false, footerIn = false, bagOpen = false;
    const syncBar = () => {
      const show = pastBtn && !footerIn && !bagOpen;
      bar.classList.toggle("is-shown", show);
      bar.setAttribute("aria-hidden", String(!show));
      bar.querySelector(".pdp-bar-add").tabIndex = show ? 0 : -1;
    };
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(es => es.forEach(en => {
        footerIn = en.isIntersecting;
        syncBar();
      }), { threshold: 0 });
      // root extended far downward: the button only "leaves" once it is above the viewport
      const io2 = new IntersectionObserver(es => es.forEach(en => { pastBtn = !en.isIntersecting; syncBar(); }),
        { threshold: 0, rootMargin: "0px 0px 100000px 0px" });
      io2.observe(addBtn);
      const ft = document.getElementById("footer-root");
      if (ft) io.observe(ft);
      cleanups.push(() => { io.disconnect(); io2.disconnect(); });
    }
    // Hide while the bag drawer is open
    const cartRoot = document.getElementById("cart-root");
    // bag drawer (agent 06) toggles data-state on .bag (opening/open/closing/closed) + [hidden]
    const bagIsOpen = () => {
      if (!cartRoot) return false;
      const st = cartRoot.querySelector("[data-state]");
      if (st) return /^open/.test(st.getAttribute("data-state")) && !st.hidden;
      const d = cartRoot.querySelector('[role="dialog"]');
      return !!(d && d.getClientRects().length && !d.closest("[hidden],[aria-hidden='true']"));
    };
    let alive = true;
    cleanups.push(() => { alive = false; });
    AW.on("cart:open", () => { if (alive) { bagOpen = true; syncBar(); } });
    AW.on("cart:added", () => { if (alive) { bagOpen = true; syncBar(); setTimeout(() => { if (alive) { bagOpen = bagIsOpen(); syncBar(); } }, 900); } });
    AW.on("cart:close", () => { if (alive) { bagOpen = false; syncBar(); } });
    if (cartRoot && "MutationObserver" in window) {
      const mo = new MutationObserver(() => { bagOpen = bagIsOpen(); syncBar(); });
      mo.observe(cartRoot, { subtree: true, childList: true, attributes: true, attributeFilter: ["class", "aria-hidden", "hidden", "data-open", "open"] });
      cleanups.push(() => mo.disconnect());
    }

    if (AW.motion && AW.motion.refresh) { try { AW.motion.refresh(root); } catch (e) { /* ignore */ } }
  }

  /* ---------- zoom viewer ---------- */
  function openZoom(p, slides, start, onIndex, opener) {
    if (closeZoom) closeZoom(true);
    const N = slides.length;
    let i = start, zoomed = false, pan = { x: 0, y: 0 }, last = null, downAt = null, moved = false;
    const el = document.createElement("div");
    el.className = "pdp-zoom";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-label", `${p.name} image viewer`);
    el.innerHTML = `
      <div class="pdp-zoom-top">
        <p class="pdp-zoom-name">${esc(p.name)}</p>
        <p class="pdp-zoom-count" aria-live="polite"></p>
        <button type="button" class="pdp-zoom-btn pdp-zoom-close" aria-label="Close image viewer">${icon("close", 22)}</button>
      </div>
      <div class="pdp-zoom-stage" tabindex="-1"><div class="pdp-zoom-frame"><img class="pdp-zoom-img" alt="" width="1000" height="1000" draggable="false"></div></div>
      <div class="pdp-zoom-bottom">
        <button type="button" class="pdp-zoom-btn" data-zs="-1" aria-label="Previous image">${icon("arrow-left", 20)}</button>
        <p class="pdp-zoom-hint">Tap the image to zoom. Drag to look around.</p>
        <button type="button" class="pdp-zoom-btn" data-zs="1" aria-label="Next image">${icon("arrow-right", 20)}</button>
      </div>`;
    overlayRoot().appendChild(el);
    const stage = el.querySelector(".pdp-zoom-stage");
    const frame = el.querySelector(".pdp-zoom-frame");
    const im = el.querySelector(".pdp-zoom-img");
    const count = el.querySelector(".pdp-zoom-count");

    const apply = () => {
      im.style.transform = zoomed ? `translate(${pan.x}px, ${pan.y}px) scale(2)` : "";
      el.classList.toggle("is-zoomed", zoomed);
    };
    const clampPan = () => {
      const r = frame.getBoundingClientRect();
      const mx = r.width / 2, my = r.height / 2;
      pan.x = Math.max(-mx, Math.min(mx, pan.x));
      pan.y = Math.max(-my, Math.min(my, pan.y));
    };
    const show = n => {
      i = (n + N) % N;
      const s = slides[i];
      zoomed = false; pan = { x: 0, y: 0 }; apply();
      im.src = s.src;
      im.alt = s.alt;
      frame.classList.toggle("is-art", s.kind === "art");
      frame.classList.toggle("is-contain", s.kind === "art" || fitFor(s.src) === "contain");
      count.textContent = `${pad2(i + 1)} / ${pad2(N)}`;
      if (!reduced()) { frame.classList.remove("is-in"); void frame.offsetWidth; frame.classList.add("is-in"); }
    };

    const panTo = e => {
      // pointer position -> pan (mouse follows); 2x scale means half-size range
      const r = frame.getBoundingClientRect();
      const fx = (e.clientX - r.left) / r.width - 0.5, fy = (e.clientY - r.top) / r.height - 0.5;
      pan.x = -fx * r.width; pan.y = -fy * r.height; clampPan(); apply();
    };
    frame.addEventListener("pointerdown", e => {
      downAt = { x: e.clientX, y: e.clientY, t: Date.now() };
      last = { x: e.clientX, y: e.clientY };
      moved = false;
      try { frame.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ }
    });
    frame.addEventListener("pointermove", e => {
      if (zoomed && e.pointerType === "mouse" && !downAt) { panTo(e); return; }
      if (!downAt) return;
      const dx = e.clientX - last.x, dy = e.clientY - last.y;
      if (Math.abs(e.clientX - downAt.x) > 8 || Math.abs(e.clientY - downAt.y) > 8) moved = true;
      if (zoomed) { pan.x += dx; pan.y += dy; clampPan(); apply(); }
      last = { x: e.clientX, y: e.clientY };
    });
    frame.addEventListener("pointerup", e => {
      if (!downAt) return;
      const dx = e.clientX - downAt.x, dy = e.clientY - downAt.y;
      downAt = null;
      if (!moved) {
        zoomed = !zoomed;
        if (zoomed && e.pointerType === "mouse") panTo(e);
        else { pan = { x: 0, y: 0 }; apply(); }
      } else if (!zoomed && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
        show(i + (dx < 0 ? 1 : -1));
      }
    });
    frame.addEventListener("pointercancel", () => { downAt = null; });
    // stage clicks outside the image close nothing (avoid accidental closes); only buttons / Esc close

    el.addEventListener("click", e => {
      const b = e.target.closest("[data-zs]");
      if (b) show(i + +b.dataset.zs);
      if (e.target.closest(".pdp-zoom-close")) close();
    });
    const onKey = e => {
      if (e.key === "Escape") { e.preventDefault(); close(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); show(i + 1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); show(i - 1); }
    };
    el.addEventListener("keydown", onKey);

    const release = trapFocus(el) || (() => {});
    lockScroll(true);
    if (AW.motion && AW.motion.stop && !U().lockScroll) { try { AW.motion.stop(); } catch (e) { /* ignore */ } }
    show(i);
    requestAnimationFrame(() => el.classList.add("is-open"));
    el.querySelector(".pdp-zoom-close").focus({ preventScroll: true });

    function close(instant) {
      if (!el.isConnected) return;
      closeZoom = null;
      release();
      lockScroll(false);
      if (AW.motion && AW.motion.start && !U().lockScroll) { try { AW.motion.start(); } catch (e) { /* ignore */ } }
      if (onIndex && !instant) onIndex(i);
      el.classList.remove("is-open");
      const rm = () => el.remove();
      if (instant || reduced()) rm(); else setTimeout(rm, 300);
      if (!instant && opener && opener.isConnected) {
        opener.focus({ preventScroll: true });
      }
    }
    closeZoom = close;
  }
})();
