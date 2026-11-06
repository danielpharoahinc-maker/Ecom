/* AWEZA home page. OWNED BY AGENT 03. Prefix: .home-*
   Route "" (#/). Sections: lips hero, collections, marquee, the rail, the back story,
   signature spotlight, next drop teaser, promise strip.
   Desktop signature moments (GSAP + ScrollTrigger, >=1024px, no reduced motion):
   pinned lips sequence that opens onto collection 01, and a pinned horizontal product rail.
   Everything renders static and complete without JS libraries. */
(() => {
  const AW = window.AW;
  if (!AW || !AW.route) return;

  /* ---------- copy (brand agent may refine; keep it here) ---------- */
  const COPY = {
    title: "AWEZA | Bold Graphic Tees from South Africa",
    heroEyebrow: "Designed in South Africa. Printed to order.",
    heroLines: ["Say it", "with your", "<em>back.</em>"],
    heroLabel: "Say it with your back.",
    heroSupport: "Heavy cotton. Loud prints. Zero apologies.",
    heroCta: "Shop the drop",
    brandLine: "Time of your life.",
    drop: "Drop 01 / 2026",
    fig1: "Fig. 01: The Signature",
    colsLabel: "The collections",
    colsNote: "Three ways to say it",
    colCta: "Shop the collection",
    railEyebrow: "The line-up",
    railTitle: "Pick your <em>statement.</em>",
    railSub: n => `${n} tees. Each one printed when you order it.`,
    railCta: "Shop all",
    storyFig: "Fig. 02: The back story",
    storyTitle: "The front is polite. The back says what you <em>meant.</em>",
    storyBody: "Most of our prints live on the back. You walk away, the joke lands.",
    spotFig: "Fig. 03: The original",
    spotFallback: "The lips that started it all.",
    spotBody: "Hand-drawn lips, AWEZA across the teeth, printed big on the back. The one everything else answers to.",
    spotSticker: "The original",
    spotCta: "View the tee",
    spotLine: "The Signature Line",
    nextLabel: "Drop 02 / Coming soon",
    nextTitle: "Next drop.",
    nextAccent: "Still cooking.",
    nextBody: "Something hot is coming off the grill. Get first dibs before it lands.",
    nextCta: "Get first dibs",
    fig3: "Fig. 04: Work in progress",
  };
  const MARQUEE = ["Bad decisions", "Good cotton", "No filter", "Made in Mzansi", "Say it with your back", "Printed to order", "Time of your life"];
  const PROMISES = () => [
    { icon: "truck", title: "Delivery across SA", body: `Free over ${AW.rand(AW.config.freeDeliveryOver)}. Tracked to your door.` },
    { icon: "shield", title: "Secure checkout", body: "Card payments, handled properly." },
    { icon: "return", title: "Printed to order", body: "Made when you order. No dead stock, no shortcuts." },
    { icon: "ruler", title: `Sizes ${sizeRange()}`, body: "Classic fit. If you like it roomy, size up." },
  ];

  const FACE = ["need-a-hug", "sweet-cupcake"];            // real faces: never in marketing areas
  const STORY_IDS = ["ceo-of-bad-decisions", "zero-exes", "signature-lips"];
  const PANEL_MAP = {                                       // DIRECTION §6
    signature: { id: "signature-lips", side: "back", hover: "male-sleeve" },
    "bad-decisions": { id: "ceo-of-bad-decisions", side: "back", hover: "back" },
    "no-filter": { id: "captain-save", side: "front", hover: "front" },
  };
  const LIPS = "images/brand/art/lips-logo.jpg";
  const CEO_ART = "images/brand/art/ceo-print.jpg";
  const HOTDOG = "images/brand/art/hotdog-print.jpg";

  /* ---------- defensive helpers (prefer AW.ui) ---------- */
  const U = () => AW.ui || {};
  const esc = AW.esc;
  const pad = n => String(n).padStart(2, "0");
  const reducedMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
  const isReduced = () => reducedMQ.matches || !!(AW.motion && AW.motion.reduced);

  const fitFor = src => (U().fitFor ? U().fitFor(src) : (/\/(front|back|folded)\.jpg$/.test(src) ? "contain" : "cover"));
  const modelShot = (p, side) => {
    if (U().modelShot) return U().modelShot(p, side);
    const im = p.images || [];
    return im.find(s => s.includes(`/male-${side}-`)) || im.find(s => s.includes("/male-")) || im[0];
  };
  const altFor = (p, src) => {
    if (U().altFor) return U().altFor(p, src);
    const f = (src.split("/").pop() || "").replace(".jpg", "");
    const v = /male-back/.test(f) ? "worn back" : /male-front/.test(f) ? "worn front" : /duo/.test(f) ? "two models"
      : /sleeve/.test(f) ? "sleeve detail" : /collar/.test(f) ? "collar detail" : f.replace(/-\d+$/, "");
    return `${p.name}, ${v} view`;
  };
  const findImg = (p, name) => (p.images || []).find(s => s.endsWith(`/${name}.jpg`));

  const ICONS = {
    "arrow-right": '<path d="M4 12h15M13 6l6 6-6 6"/>',
    "arrow-up-right": '<path d="M7 17L17 7M8 7h9v9"/>',
    truck: '<path d="M2 6h11v10H2zM13 10h4l4 3v3h-8z"/><circle cx="6" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
    shield: '<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
    return: '<path d="M4 9h11a5 5 0 010 10H9"/><path d="M8 5L4 9l4 4"/>',
    ruler: '<path d="M3 16L16 3l5 5L8 21z"/><path d="M7 12l2 2M10 9l2 2M13 6l2 2"/>',
    lips: '<path fill="currentColor" stroke="none" d="M12 7.2c1.6-1.9 4.6-2.4 6.6-.7 1.2 1 2.5 2.9 4.4 4.4-1.8 3.9-5.9 7.3-11 7.3S2.8 14.8 1 10.9c1.9-1.5 3.2-3.4 4.4-4.4 2-1.7 5-1.2 6.6.7zM4.2 11c2.5.9 5.1 1.4 7.8 1.4s5.3-.5 7.8-1.4c-2.6.4-5.2.6-7.8.6s-5.2-.2-7.8-.6z"/>',
  };
  const icon = (name, size = 20) => {
    if (U().icon) return U().icon(name, { size });
    return `<svg class="home-ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[name] || ""}</svg>`;
  };
  const btn = (label, o = {}) => {
    if (U().btn) return U().btn(label, o);
    const cls = `btn btn--${o.variant || "primary"}${o.size ? " btn--" + o.size : ""}`;
    const inner = `<span class="btn__label">${esc(label)}</span>${o.iconAfter ? icon(o.iconAfter, 18) : ""}`;
    return o.href ? `<a class="${cls}" href="${esc(o.href)}" ${o.attrs || ""}>${inner}</a>`
      : `<button type="button" class="${cls}" ${o.attrs || ""}>${inner}</button>`;
  };
  const price = p => (U().price ? U().price(p) : `<span class="price" data-price="${AW.priceFor(p)}">${AW.rand(AW.priceFor(p))}</span>`);
  const card = (p, o) => {
    if (U().card) return U().card(p, o);
    const src = modelShot(p, "back");
    return `<article class="card home-fcard" data-reveal="up"><a class="card-link" href="#/product/${esc(p.id)}">
      <div class="home-fcard__media"><img src="${esc(src)}" alt="${esc(altFor(p, src))}" width="1000" height="1000" loading="lazy" decoding="async"></div>
      <div class="home-fcard__info"><span class="home-fcard__name">${esc(p.name)}</span><span class="home-fcard__col">${esc(AW.colName(p.collection))}</span>${price(p)}</div>
    </a></article>`;
  };
  const sizeRange = () => {
    const order = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];
    const all = new Set(AW.products.flatMap(p => p.sizes || []));
    const have = order.filter(s => all.has(s));
    return have.length ? `${have[0]} to ${have[have.length - 1]}` : "XS to 5XL";
  };
  const pimg = (src, alt, { eager = false, cls = "", lazySrc = false } = {}) =>
    `<img class="${cls} home-fit--${fitFor(src)}" ${lazySrc ? `data-src="${esc(src)}"` : `src="${esc(src)}"`} alt="${esc(alt)}" width="1000" height="1000" ${eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;

  /* ---------- sections ---------- */
  function hero(sig) {
    const portalSrc = sig ? modelShot(sig, "back") : "";
    const col1 = AW.collections[0];
    return `
    <section class="home-hero ui-grain" aria-labelledby="home-hero-title">
      <div class="home-hero__stage">
        <div class="home-hero__meta">
          <span class="home-label">${esc(COPY.drop)}</span>
          <span class="home-hero__rule" aria-hidden="true"></span>
          <span class="home-label home-hero__eyebrow">${esc(COPY.heroEyebrow)}</span>
        </div>
        <h1 class="home-hero__title" id="home-hero-title" aria-label="${esc(COPY.heroLabel)}">
          ${COPY.heroLines.map((l, i) => `<span class="home-hero__line home-hero__line--${i + 1}" aria-hidden="true"><span class="home-hero__line-in" data-reveal="lines" data-split="words" data-reveal-delay="${120 + i * 90}">${l}</span></span>`).join("")}
        </h1>
        <figure class="home-hero__lips">
          <div class="home-hero__lips-par" data-parallax="0.08">
            <img class="home-hero__lips-img" src="${LIPS}" alt="AWEZA signature red lips with AWEZA written across the teeth" width="724" height="644" loading="eager" fetchpriority="high" decoding="async">
          </div>
        </figure>
        <p class="home-hero__fig"><span class="home-hero__fig-rule" aria-hidden="true"></span><span class="home-label">${esc(COPY.fig1)}</span></p>
        <div class="home-hero__foot">
          <p class="home-hero__brandline">${esc(COPY.brandLine)}</p>
          <p class="home-hero__support">${esc(COPY.heroSupport)}</p>
          <div class="home-hero__cta">${btn(COPY.heroCta, { href: "#/shop/all", iconAfter: "arrow-right", size: "lg", attrs: "data-magnetic" })}</div>
        </div>
        <span class="home-hero__scroll home-label" aria-hidden="true"><span class="home-hero__scroll-bar"></span>Scroll</span>
        ${portalSrc && col1 ? `
        <div class="home-hero__portal" aria-hidden="true">
          <img src="${esc(portalSrc)}" alt="" width="1000" height="1000" loading="lazy" decoding="async">
          <div class="home-hero__portal-copy">
            <span class="home-label">01 / ${esc(pad(AW.collections.length))}</span>
            <span class="home-hero__portal-name">${esc(col1.name)}</span>
          </div>
        </div>` : ""}
      </div>
    </section>`;
  }

  function panelImages(col) {
    const m = PANEL_MAP[col.id];
    let p = m && AW.byId(m.id);
    if (!p || p.collection !== col.id) p = AW.products.find(x => x.collection === col.id && !FACE.includes(x.id));
    if (!p) return null;
    const side = m ? m.side : (U().printSide ? U().printSide(p) : "back");
    const primary = modelShot(p, side) || p.images[0];
    const hover = (m && findImg(p, m.hover)) || findImg(p, side) || null;
    return { p, primary, hover };
  }

  function collections() {
    const total = AW.collections.length;
    const panels = AW.collections.map((c, i) => {
      const im = panelImages(c);
      const n = AW.products.filter(p => p.collection === c.id).length;
      const dark = i % 3 === 1;
      return `
      <a class="home-col home-col--${(i % 3) + 1}${dark ? " home-col--dark" : ""}" href="#/shop/${esc(c.id)}" ${dark ? 'data-theme="dark"' : ""} data-reveal="up" aria-label="${esc(c.name)}: ${esc(COPY.colCta)}, ${n} tees">
        <span class="home-col__top"><span class="home-col__num">${pad(i + 1)}<span class="home-col__of">/${pad(total)}</span></span><span class="home-label">${n} tee${n === 1 ? "" : "s"}</span></span>
        <span class="home-col__media" data-reveal="img">
          ${im ? pimg(im.primary, altFor(im.p, im.primary), { eager: i === 0, cls: "home-col__img" }) : ""}
          ${im && im.hover ? pimg(im.hover, altFor(im.p, im.hover), { cls: "home-col__img home-col__img--alt", lazySrc: true }) : ""}
        </span>
        <span class="home-col__body">
          <span class="home-col__name" data-reveal="lines" data-split="words">${esc(c.name)}</span>
          <span class="home-col__tag">${esc(c.tagline || "")}</span>
          <span class="home-col__cta">${esc(COPY.colCta)} ${icon("arrow-right", 18)}</span>
        </span>
      </a>`;
    }).join("");
    return `
    <section class="home-cols" aria-labelledby="home-cols-title">
      <div class="home-cols__head">
        <h2 class="home-label" id="home-cols-title">${esc(COPY.colsLabel)}</h2>
        <span class="home-cols__rule" aria-hidden="true"></span>
        <span class="home-cols__note">${esc(COPY.colsNote)}</span>
      </div>
      <div class="home-cols__row" data-stagger="110">${panels}</div>
    </section>`;
  }

  function marquee() {
    const items = MARQUEE.map(t => `<span class="home-marquee__item">${esc(t)}</span><span class="home-marquee__lips" aria-hidden="true">${icon("lips", 34)}</span>`).join("");
    return `
    <section class="home-marquee" aria-label="${esc(MARQUEE.join(". "))}">
      <div class="home-marquee__track" data-marquee="50" aria-hidden="true"><div class="home-marquee__set">${items}</div></div>
    </section>`;
  }

  function rail() {
    const list = AW.products;
    const n = list.length;
    const cards = list.map((p, i) => `<div class="home-rail__item home-rail__item--${(i % 4) + 1}">${card(p, { size: i % 4 === 1 || i % 4 === 3 ? "lg" : "md", index: i, eager: false })}</div>`).join("");
    return `
    <section class="home-rail" aria-labelledby="home-rail-title">
      <div class="home-rail__pin">
        <header class="home-rail__head">
          <span class="home-label">${esc(COPY.railEyebrow)}</span>
          <h2 class="home-rail__title" id="home-rail-title" data-reveal="lines" data-split="words">${COPY.railTitle}</h2>
          <p class="home-rail__sub">${esc(COPY.railSub(n))}</p>
          <div class="home-rail__count" aria-hidden="true"><span class="home-rail__now">01</span><span class="home-rail__sep">/</span><span>${pad(n)}</span></div>
          <div class="home-rail__progress" aria-hidden="true"><span></span></div>
          ${btn(COPY.railCta, { href: "#/shop/all", variant: "link", iconAfter: "arrow-right" })}
        </header>
        <div class="home-rail__viewport">
          <div class="home-rail__track product-grid" data-stagger>${cards}</div>
        </div>
      </div>
    </section>`;
  }

  function story() {
    const list = STORY_IDS.map(id => AW.byId(id)).filter(Boolean);
    const rows = list.map((p, i) => {
      const shot = modelShot(p, "back");
      return `<li class="home-story__item">
        <a class="home-story__link" href="#/product/${esc(p.id)}" data-peek="${esc(shot)}" data-peek-alt="${esc(altFor(p, shot))}">
          <span class="home-story__idx">${pad(i + 1)}</span>
          <span class="home-story__name">${esc(p.name)}</span>
          <span class="home-story__price">${price(p)}</span>
          <span class="home-story__thumb">${pimg(shot, altFor(p, shot))}</span>
          <span class="home-story__arrow">${icon("arrow-up-right", 22)}</span>
        </a></li>`;
    }).join("");
    return `
    <section class="home-story" aria-labelledby="home-story-title">
      <div class="home-story__art" data-reveal="img">
        <img src="${CEO_ART}" alt="The CEO of Bad Decisions back print, in red serif capitals" width="1107" height="946" loading="lazy" decoding="async">
      </div>
      <div class="home-story__text">
        <div class="home-story__sticky">
          <span class="home-label">${esc(COPY.storyFig)}</span>
          <h2 class="home-story__title" id="home-story-title" data-reveal="lines" data-split="words">${COPY.storyTitle}</h2>
          <p class="home-story__body" data-reveal="up">${esc(COPY.storyBody)}</p>
          <ol class="home-story__list" data-stagger>${rows}</ol>
        </div>
      </div>
      <div class="home-story__peek" aria-hidden="true"><img alt="" width="1000" height="1000" decoding="async"></div>
    </section>`;
  }

  function spotlight(sig) {
    if (!sig) return "";
    const col = AW.collections.find(c => c.id === sig.collection) || {};
    return `
    <section class="home-spot ui-grain" data-theme="dark" aria-labelledby="home-spot-title">
      <div class="home-spot__panel" data-reveal="img">
        <div class="home-spot__art" data-parallax="0.1">
          <img src="${LIPS}" alt="Close-up of the AWEZA signature lips and teeth" width="724" height="644" loading="lazy" decoding="async">
        </div>
        <span class="home-spot__sticker" aria-hidden="true">${esc(COPY.spotSticker)}</span>
      </div>
      <div class="home-spot__text">
        <span class="home-label">${esc(COPY.spotFig)}</span>
        <h2 class="home-spot__title" id="home-spot-title" data-reveal="lines" data-split="words">${esc(col.tagline || COPY.spotFallback)}</h2>
        <div class="home-spot__buy" data-reveal="up">
          <p class="home-spot__body">${esc(COPY.spotBody)}</p>
          <div class="home-spot__row"><span class="home-spot__pname">${esc(sig.name)}</span><span class="home-spot__price">${price(sig)}</span></div>
          <div class="home-spot__btns">
            ${btn(COPY.spotCta, { href: `#/product/${sig.id}`, variant: "inverse", iconAfter: "arrow-right", attrs: "data-magnetic" })}
            ${btn(col.name || COPY.spotLine, { href: `#/shop/${sig.collection}`, variant: "link", iconAfter: "arrow-right" })}
          </div>
        </div>
      </div>
    </section>`;
  }

  function nextDrop() {
    return `
    <section class="home-next" aria-labelledby="home-next-title">
      <div class="home-next__type">
        <span class="home-label">${esc(COPY.nextLabel)}</span>
        <h2 class="home-next__title" id="home-next-title"><span data-reveal="lines" data-split="words">${esc(COPY.nextTitle)}</span> <em class="home-next__accent" data-reveal="lines" data-split="words" data-reveal-delay="160">${esc(COPY.nextAccent)}</em></h2>
      </div>
      <figure class="home-next__art" data-reveal="img">
        <img src="${HOTDOG}" alt="Teaser artwork for the next AWEZA drop" width="644" height="1400" loading="lazy" decoding="async">
        <figcaption class="home-label">${esc(COPY.fig3)}</figcaption>
      </figure>
      <div class="home-next__copy" data-reveal="up">
        <p>${esc(COPY.nextBody)}</p>
        ${btn(COPY.nextCta, { variant: "secondary", iconAfter: "arrow-right", attrs: "data-home-dibs" })}
      </div>
    </section>`;
  }

  function promise() {
    return `
    <section class="home-promise" aria-label="Our promise">
      <ul class="home-promise__list" data-stagger>
        ${PROMISES().map((it, i) => `<li class="home-promise__item" data-reveal="up">
          <span class="home-promise__top"><span class="home-label">${pad(i + 1)}</span>${icon(it.icon, 24)}</span>
          <strong class="home-promise__title">${esc(it.title)}</strong>
          <span class="home-promise__body">${esc(it.body)}</span>
        </li>`).join("")}
      </ul>
    </section>`;
  }

  /* ---------- lifecycle ---------- */
  let cleanups = [];
  const cleanup = () => { cleanups.forEach(fn => { try { fn(); } catch (e) { /* ignore */ } }); cleanups = []; };
  AW.on("route", d => { if (!d || d.page !== "") cleanup(); });

  AW.route("", app => {
    cleanup();
    document.title = COPY.title;
    const sig = AW.byId("signature-lips");
    app.innerHTML = `<div class="home">${hero(sig)}${collections()}${marquee()}${rail()}${story()}${spotlight(sig)}${nextDrop()}${promise()}</div>`;
    const root = app.firstElementChild;
    bindClicks(root);
    bindHoverSwap(root);
    bindPeek(root);
    bindRefreshOnLoad(root);
    let raf = requestAnimationFrame(() => { raf = 0; setupScroll(root); });
    cleanups.push(() => raf && cancelAnimationFrame(raf));
  });

  function bindClicks(root) {
    root.addEventListener("click", e => {
      const dibs = e.target.closest("[data-home-dibs]");
      if (!dibs) return;
      e.preventDefault();
      const target = document.querySelector(".ft-news") || document.getElementById("footer-root");
      if (!target) return;
      if (AW.motion && AW.motion.scrollTo) AW.motion.scrollTo(target);
      else target.scrollIntoView({ behavior: isReduced() ? "auto" : "smooth", block: "start" });
      const input = target.querySelector("input[type=email], input");
      if (input) setTimeout(() => { try { input.focus({ preventScroll: true }); } catch (err) { input.focus(); } }, isReduced() ? 0 : 900);
    });
  }

  // Load the hover image for a collection panel only when someone can actually hover it.
  function bindHoverSwap(root) {
    const load = e => {
      const col = e.target.closest && e.target.closest(".home-col");
      if (!col) return;
      const alt = col.querySelector("img[data-src]");
      if (alt) { alt.src = alt.dataset.src; alt.removeAttribute("data-src"); }
    };
    if (window.matchMedia("(hover: hover)").matches) root.addEventListener("pointerover", load, { passive: true });
    root.addEventListener("focusin", load);
  }

  // Back Story: preview image follows the cursor (fine pointers only).
  function bindPeek(root) {
    const peek = root.querySelector(".home-story__peek");
    const list = root.querySelector(".home-story__list");
    if (!peek || !list || isReduced() || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const img = peek.querySelector("img");
    let x = 0, y = 0, tx = 0, ty = 0, on = false, raf = 0, rot = 0;
    const tick = () => {
      x += (tx - x) * 0.16; y += (ty - y) * 0.16;
      const vr = Math.max(-8, Math.min(8, (tx - x) * 0.06));
      rot += (vr - rot) * 0.2;
      peek.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${rot}deg)`;
      if (on || Math.abs(tx - x) > 0.5 || Math.abs(ty - y) > 0.5) raf = requestAnimationFrame(tick); else raf = 0;
    };
    const start = () => { if (!raf) raf = requestAnimationFrame(tick); };
    const move = e => { tx = e.clientX; ty = e.clientY; start(); };
    list.addEventListener("pointerover", e => {
      const a = e.target.closest("[data-peek]");
      if (!a || e.pointerType !== "mouse") return;
      if (img.getAttribute("src") !== a.dataset.peek) img.src = a.dataset.peek;
      if (!on) { x = tx = e.clientX; y = ty = e.clientY; }
      on = true; peek.classList.add("is-on"); start();
    });
    list.addEventListener("pointerout", e => {
      const a = e.target.closest("[data-peek]");
      if (a && !a.contains(e.relatedTarget)) { on = false; peek.classList.remove("is-on"); }
    });
    list.addEventListener("pointermove", move, { passive: true });
    cleanups.push(() => { on = false; if (raf) cancelAnimationFrame(raf); });
  }

  function bindRefreshOnLoad(root) {
    let t = 0;
    const onLoad = e => {
      if (e.target.tagName !== "IMG") return;
      e.target.classList.add("is-loaded");
      clearTimeout(t);
      t = setTimeout(() => { if (window.ScrollTrigger && document.contains(root)) window.ScrollTrigger.refresh(); }, 200);
    };
    root.addEventListener("load", onLoad, true);
    root.querySelectorAll("img").forEach(im => { if (im.complete && im.naturalWidth) im.classList.add("is-loaded"); });
    cleanups.push(() => clearTimeout(t));
  }

  /* ---------- desktop scroll choreography ---------- */
  function setupScroll(root) {
    const G = window.gsap, ST = window.ScrollTrigger;
    if (!G || !ST || !G.matchMedia || !document.contains(root)) return;
    try { G.registerPlugin(ST); } catch (e) { return; }
    const mm = G.matchMedia();
    mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
      if (AW.motion && AW.motion.reduced) return;
      const offs = [heroSequence(root, G), railSequence(root, G)];
      return () => offs.forEach(fn => fn && fn());
    });
    cleanups.push(() => mm.revert());
    ST.refresh();
  }

  function heroSequence(root, G) {
    const hero = root.querySelector(".home-hero");
    const stage = hero && hero.querySelector(".home-hero__stage");
    const lips = hero && hero.querySelector(".home-hero__lips");
    if (!stage || !lips) return null;
    hero.classList.add("home-hero--pinned");
    const portal = hero.querySelector(".home-hero__portal");
    const pimg = portal && portal.querySelector("img");
    if (pimg && pimg.loading === "lazy") pimg.loading = "eager";
    const lines = hero.querySelectorAll(".home-hero__line");
    const fades = hero.querySelectorAll(".home-hero__meta, .home-hero__foot, .home-hero__fig, .home-hero__scroll");
    // Mouth centre relative to the stage, recomputed on refresh (lips transform-origin is the mouth).
    const mouth = () => {
      const s = stage.getBoundingClientRect(), r = lips.getBoundingClientRect();
      return { x: r.left - s.left + r.width * 0.5, y: r.top - s.top + r.height * 0.53, w: s.width, h: s.height };
    };
    const circle = (rad) => () => { const m = mouth(); return `circle(${rad === "max" ? Math.hypot(Math.max(m.x, m.w - m.x), Math.max(m.y, m.h - m.y)) + 40 : rad}px at ${m.x}px ${m.y}px)`; };

    const tl = G.timeline({
      defaults: { ease: "none" },
      scrollTrigger: { trigger: hero, start: "top top", end: "+=120%", pin: stage, scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true },
    });
    tl.fromTo(lips, { scale: 0.82, rotate: -4 }, { scale: 1.25, rotate: 3, duration: 1 }, 0)
      .to(lines[0] || {}, { xPercent: -38, duration: 0.8 }, 0)
      .to(lines[1] || {}, { xPercent: 30, duration: 0.8 }, 0)
      .to(lines[2] || {}, { xPercent: 70, duration: 0.8 }, 0)
      .to(lines, { opacity: 0, duration: 0.25 }, 0.5)
      .to(fades, { opacity: 0, y: -24, duration: 0.3 }, 0.05);
    if (portal) {
      tl.fromTo(portal, { clipPath: circle(0) }, { clipPath: circle("max"), duration: 0.42, ease: "power2.in" }, 0.62)
        .fromTo(pimg, { scale: 1.25 }, { scale: 1, duration: 0.42 }, 0.62)
        .fromTo(portal.querySelector(".home-hero__portal-copy"), { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.2 }, 0.84);
    }
    return () => {
      hero.classList.remove("home-hero--pinned");
      if (tl.scrollTrigger) tl.scrollTrigger.kill(true);
      tl.kill();
      G.set([lips, ...lines, ...fades, portal, pimg].filter(Boolean), { clearProps: "all" });
    };
  }

  function railSequence(root, G) {
    const rail = root.querySelector(".home-rail");
    const pin = rail && rail.querySelector(".home-rail__pin");
    const track = rail && rail.querySelector(".home-rail__track");
    const view = rail && rail.querySelector(".home-rail__viewport");
    if (!pin || !track || !view) return null;
    rail.classList.add("home-rail--h");
    const now = rail.querySelector(".home-rail__now");
    const bar = rail.querySelector(".home-rail__progress span");
    const items = track.children.length;
    const dist = () => Math.max(0, track.scrollWidth - view.clientWidth);
    let last = -1;
    const tw = G.to(track, {
      x: () => -dist(), ease: "none",
      scrollTrigger: {
        trigger: pin, start: "top top", end: () => "+=" + dist(), pin: true, scrub: 0.7, invalidateOnRefresh: true,
        onUpdate: self => {
          const i = Math.min(items - 1, Math.round(self.progress * (items - 1)));
          if (i !== last && now) { last = i; now.textContent = pad(i + 1); }
          if (bar) bar.style.transform = `scaleX(${self.progress})`;
        },
      },
    });
    return () => {
      rail.classList.remove("home-rail--h");
      if (tw.scrollTrigger) tw.scrollTrigger.kill(true);
      tw.kill();
      G.set(track, { clearProps: "all" });
      if (now) now.textContent = "01";
      if (bar) bar.style.transform = "";
    };
  }
})();
