/* AWEZA pages: footer (#footer-root) and content routes
   (about, help, size-guide, returns, terms, privacy, 404).
   OWNED BY AGENT 08. Prefixes: .ft-* (footer), .pg-* (pages).
   Legal copy here is a DRAFT for the owner's review. It is not legal advice. */
(() => {
  const AW = window.AW;
  if (!AW) return;
  const esc = s => (AW.esc ? AW.esc(s) : String(s));
  const R = n => (AW.rand ? AW.rand(n) : "R" + n);
  const cfg = AW.config || {};
  const U = () => AW.ui || {};
  const ph = t => `<span class="pg-ph">[${esc(t)}]</span>`;
  const ART = "images/brand/art/";

  /* ---------- small helpers with local fallbacks ---------- */
  const LOCAL_ICONS = {
    "arrow-right": '<path d="M4 12h15M13 6l6 6-6 6"/>',
    "arrow-up-right": '<path d="M7 17L17 7M9 7h8v8"/>',
    "arrow-up": '<path d="M12 20V5M6 11l6-6 6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    instagram: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".6" fill="currentColor"/>',
    tiktok: '<path d="M14 4v10.5a3.5 3.5 0 1 1-3.5-3.5M14 4c.4 2.6 2.2 4.3 5 4.5"/>',
    facebook: '<path d="M14.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.6-1.5h1.5V4.4c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.4H9.2v3h2.5V21"/>',
    whatsapp: '<path d="M4 20l1.2-4.1A8 8 0 1 1 8.3 19z"/><path d="M9.2 8.6c.2-.4.4-.4.7-.4h.5c.2 0 .4.1.5.4l.7 1.6c.1.2 0 .4-.1.6l-.5.6c.6 1.1 1.5 2 2.7 2.6l.6-.6c.2-.2.4-.2.6-.1l1.5.7c.3.1.4.3.4.5v.4c0 .4-.2.8-.6 1-.7.4-1.7.4-2.9-.1a8.7 8.7 0 0 1-4-3.9c-.6-1.2-.6-2.4-.1-3.3z" fill="currentColor" stroke="none"/>',
  };
  const icon = (name, size = 20, label) => {
    if (name !== "arrow-up" && U().icon) { try { return U().icon(name, { size, label }); } catch (e) {} }
    const body = LOCAL_ICONS[name] || "";
    const a = label ? `role="img" aria-label="${esc(label)}"` : 'aria-hidden="true"';
    return `<svg class="pg-ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" ${a}>${body}</svg>`;
  };
  // The lips glyph, drawn locally so it is always available (and always red via CSS).
  const lips = (cls = "") => `<svg class="pg-lips ${cls}" viewBox="0 0 48 24" aria-hidden="true" focusable="false"><path d="M1 12.5C6 6 10.5 2 16.5 2c3 0 5.4 1.6 7.5 3.6C26.1 3.6 28.5 2 31.5 2 37.5 2 42 6 47 12.5 41.5 19 34 23 24 23S6.5 19 1 12.5z" fill="currentColor"/><path d="M4.5 12.6c6 1.6 12.5 2.3 19.5 2.3s13.5-.7 19.5-2.3" fill="none" stroke="var(--c-bg)" stroke-width="1.6" stroke-linecap="round"/></svg>`;
  const btn = (label, o = {}) => {
    if (U().btn) { try { return U().btn(label, o); } catch (e) {} }
    const cls = `btn btn--${o.variant || "primary"}${o.size ? " btn--" + o.size : ""}`;
    const ic = o.iconAfter ? " " + icon(o.iconAfter, 18) : "";
    return o.href ? `<a class="${cls}" href="${o.href}" ${o.attrs || ""}><span>${esc(label)}</span>${ic}</a>`
                  : `<button type="button" class="${cls}" ${o.attrs || ""}><span>${esc(label)}</span>${ic}</button>`;
  };
  // Image: use the shared helper when it exists so the tile trick is consistent.
  const img = (src, o = {}) => {
    if (U().img) { try { return U().img(src, o); } catch (e) {} }
    const fit = o.fit || (/\/(front|back|folded)\.jpg$/.test(src) ? "contain" : "cover");
    return `<div class="media media--${fit} ${o.className || ""}" style="aspect-ratio:${o.ratio || "1/1"}"><img src="${src}" alt="${esc(o.alt || "")}" width="1000" height="1000" ${o.eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'} decoding="async"></div>`;
  };
  // Art (white-backed JPG prints): plain <img>, multiplied onto the surface in CSS.
  const art = (file, alt, cls = "", w = 1000, h = 1000, eager = false) =>
    `<img class="pg-art ${cls}" src="${ART}${file}" alt="${esc(alt)}" width="${w}" height="${h}" ${eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;

  const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];
  const products = () => AW.products || [];
  const allSizes = () => {
    const set = new Set(); products().forEach(p => (p.sizes || []).forEach(s => set.add(s)));
    return SIZE_ORDER.filter(s => set.has(s));
  };
  const sizeRange = () => { const s = allSizes(); return s.length ? `${s[0]} to ${s[s.length - 1]}` : "S to 5XL"; };
  const upcharge = () => {
    const u = cfg.sizeUpcharge || {}; const keys = SIZE_ORDER.filter(k => u[k]);
    if (!keys.length) return null;
    const v = keys.map(k => u[k]); return { from: keys[0], min: Math.min(...v), max: Math.max(...v) };
  };
  const fitOf = p => (/retail/i.test(p.fit || "") ? "retail" : "classic");
  const productLinks = fit => products().filter(p => fitOf(p) === fit)
    .map(p => `<a class="pg-chiplink" href="#/product/${encodeURIComponent(p.id)}">${esc(p.name)}</a>`).join("");
  const delivery = R(cfg.delivery || 179);
  const freeOver = R(cfg.freeDeliveryOver || 2000);

  /* ---------- editorial page template ---------- */
  // sections: [{ id, title, html }]
  function shell(o) {
    const secs = o.sections || [];
    const indexed = o.index !== false && secs.length > 2;
    const meta = (o.meta || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join("");
    const nav = indexed ? `
      <nav class="pg-index" aria-label="On this page">
        <p class="pg-index-label">On this page</p>
        <ol>${secs.map((s, i) => `<li><a href="#/${o.route}" data-pg-jump="${s.id}"><span class="pg-index-n">${String(i + 1).padStart(2, "0")}</span>${esc(s.title)}</a></li>`).join("")}</ol>
      </nav>` : "";
    const body = secs.map((s, i) => `
      <section class="pg-sec" id="pg-${s.id}" aria-labelledby="pg-${s.id}-h">
        <div class="pg-sec-head" data-reveal="up">
          <span class="pg-sec-n" aria-hidden="true">${o.legal ? "§ " : ""}${String(i + 1).padStart(2, "0")}</span>
          <h2 class="pg-sec-title" id="pg-${s.id}-h">${esc(s.title)}</h2>
        </div>
        <div class="pg-prose" data-reveal="up">${s.html}</div>
      </section>`).join("");
    return `
    <article class="pg pg--${o.key}${indexed ? " pg--indexed" : ""}">
      <header class="pg-head container">
        <div class="pg-rule"><span>AWEZA / ${esc(o.label)}</span><span>${esc(o.folio)}</span></div>
        <div class="pg-head-grid">
          <div class="pg-head-main">
            <h1 class="pg-title" data-reveal="lines" data-split="words">${o.title}</h1>
            ${o.sub ? `<p class="pg-sub" data-reveal="up" data-reveal-delay="160">${o.sub}</p>` : ""}
          </div>
          ${meta ? `<dl class="pg-meta" data-reveal="fade" data-reveal-delay="240">${meta}</dl>` : ""}
        </div>
      </header>
      ${o.draft ? draftBanner() : ""}
      ${o.lead ? `<div class="pg-lead container" data-reveal="up">${o.lead}</div>` : ""}
      <div class="pg-body container">
        ${nav}
        <div class="pg-main">${body}</div>
      </div>
      ${o.after || ""}
    </article>`;
  }
  function draftBanner() {
    return `
      <aside class="pg-draft container" role="note" aria-label="Draft notice">
        <div class="pg-draft-inner">
          <span class="pg-draft-sticker" aria-hidden="true">Draft</span>
          <p><strong>Draft: for owner review.</strong> This is a starting point, not legal advice, and it doesn't claim legal compliance. Have a South African attorney check it and fill every ${ph("bracketed")} item before launch.</p>
        </div>
      </aside>`;
  }
  const bizInfo = (cls = "pg-biz") => `
    <dl class="${cls}">
      <div><dt>Business name</dt><dd>${ph("Registered business name")}</dd></div>
      <div><dt>Registration no.</dt><dd>${ph("Registration number")}</dd></div>
      <div><dt>VAT no.</dt><dd>${ph("VAT number if registered")}</dd></div>
      <div><dt>Address</dt><dd>${ph("Physical address")}</dd></div>
      <div><dt>Email</dt><dd>${ph("Email")}</dd></div>
      <div><dt>Phone</dt><dd>${ph("Phone")}</dd></div>
    </dl>`;
  const list = items => `<ul class="pg-list">${items.map(i => `<li>${i}</li>`).join("")}</ul>`;
  const steps = items => `<ol class="pg-steps">${items.map(i => `<li><div>${i}</div></li>`).join("")}</ol>`;
  const qa = items => `<div class="pg-faq">${items.map(([q, a], i) => `
    <details class="accordion pg-qa">
      <summary><span class="pg-qa-q">${esc(q)}</span></summary>
      <div class="accordion-body pg-qa-a">${a}</div>
    </details>`).join("")}</div>`;
  const setTitle = t => { document.title = t ? `${t} | AWEZA` : "AWEZA"; };

  /* ---------- page lifecycle ---------- */
  let cleanups = [];
  let pending = null; // setup to run after core scrolls to top and emits "route"
  const teardown = () => { cleanups.forEach(f => { try { f(); } catch (e) {} }); cleanups = []; };
  const page = (name, title, render) => AW.route(name, (app, arg) => {
    teardown();
    setTitle(title);
    app.innerHTML = render(arg);
    const root = app.firstElementChild;
    pending = { root, arg };
  });

  AW.on("route", () => {
    const p = pending; pending = null;
    if (!p) { teardown(); return; }
    setupPage(p.root, p.arg);
  });

  const reduced = () => (AW.motion && AW.motion.reduced) || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function scrollToEl(el) {
    if (!el) return;
    const off = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 64;
    const y = el.getBoundingClientRect().top + window.scrollY - off - 24;
    if (AW.motion && AW.motion.scrollTo && AW.motion.lenis) { AW.motion.scrollTo(y); return; }
    window.scrollTo({ top: y, behavior: reduced() ? "auto" : "smooth" });
  }

  function setupPage(root, arg) {
    if (!root || !root.classList.contains("pg")) return;
    // In-page index: jump without touching the hash (the router owns it).
    const onClick = e => {
      const j = e.target.closest("[data-pg-jump]");
      if (j) {
        e.preventDefault();
        const t = root.querySelector("#pg-" + j.dataset.pgJump);
        scrollToEl(t);
        const h = t && t.querySelector(".pg-sec-title");
        if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
        return;
      }
      const u = e.target.closest("[data-pg-unit]");
      if (u) setUnit(root, u.dataset.pgUnit);
    };
    root.addEventListener("click", onClick);
    cleanups.push(() => root.removeEventListener("click", onClick));

    // Highlight the section in view.
    const links = [...root.querySelectorAll(".pg-index a")];
    if (links.length && "IntersectionObserver" in window) {
      const vis = new Set();
      const io = new IntersectionObserver(entries => {
        entries.forEach(en => en.isIntersecting ? vis.add(en.target) : vis.delete(en.target));
        const first = [...root.querySelectorAll(".pg-sec")].find(s => vis.has(s));
        if (!first) return;
        const id = first.id.replace(/^pg-/, "");
        links.forEach(a => {
          const on = a.dataset.pgJump === id;
          a.classList.toggle("is-current", on);
          on ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current");
        });
      }, { rootMargin: "-30% 0px -60% 0px" });
      root.querySelectorAll(".pg-sec").forEach(s => io.observe(s));
      cleanups.push(() => io.disconnect());
    }

    if (root.classList.contains("pg--size")) {
      let u = "cm"; try { u = localStorage.getItem("aw-units") || "cm"; } catch (e) {}
      setUnit(root, u, true);
    }
    // Deep link: #/help/faq, #/help/delivery ...
    if (arg) {
      const t = root.querySelector("#pg-" + CSS.escape(arg));
      if (t) {
        const qd = t.querySelector("details");
        requestAnimationFrame(() => setTimeout(() => scrollToEl(t), 60));
        if (qd && arg === "faq") qd.open = true;
      }
    }
  }

  /* ---------- size guide data (inches are the source; cm = round(in * 2.54)) ---------- */
  const FITS = {
    classic: {
      sizes: ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"],
      width: [18, 20, 22, 24, 26, 28, 30, 32],
      length: [28, 29, 30, 31, 32, 33, 34, 35],
    },
    retail: { // approximate published figures; confirm against the supplier chart
      sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"],
      width: [16.5, 18, 20, 22, 24, 26, 28, 30, 32],
      length: [27, 28, 29, 30, 31, 32, 33, 34, 35],
    },
  };
  const fmt = (inch, unit) => unit === "in" ? String(inch).replace(".5", "½") : String(Math.round(inch * 2.54));
  function sizeTable(key, unit = "cm") {
    const f = FITS[key];
    const rows = f.sizes.map((s, i) => `<tr><th scope="row">${s}</th><td data-in="${f.width[i]}">${fmt(f.width[i], unit)}</td><td data-in="${f.length[i]}">${fmt(f.length[i], unit)}</td></tr>`).join("");
    return `
      <div class="pg-table-wrap">
        <table class="pg-table">
          <caption class="pg-vh">${key === "classic" ? "Classic fit" : "Retail fit"} measurements</caption>
          <thead><tr><th scope="col">Size</th><th scope="col">A. Chest width <span class="pg-unit-l">(cm)</span></th><th scope="col">B. Length <span class="pg-unit-l">(cm)</span></th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }
  function setUnit(root, unit, silent) {
    unit = unit === "in" ? "in" : "cm";
    root.querySelectorAll("td[data-in]").forEach(td => { td.textContent = fmt(parseFloat(td.dataset.in), unit); });
    root.querySelectorAll(".pg-unit-l").forEach(s => { s.textContent = `(${unit})`; });
    root.querySelectorAll("[data-pg-unit]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.pgUnit === unit)));
    const live = root.querySelector(".pg-units-live");
    if (live && !silent) live.textContent = unit === "cm" ? "Showing centimetres" : "Showing inches";
    try { localStorage.setItem("aw-units", unit); } catch (e) {}
  }
  const measureSVG = `
    <svg class="pg-measure" viewBox="0 0 320 300" role="img" aria-labelledby="pg-measure-t">
      <title id="pg-measure-t">How to measure: A is chest width straight across, just under the armpits. B is length, from the highest point of the shoulder to the hem.</title>
      <path class="pg-measure-tee" d="M118 26c8 10 24 16 42 16s34-6 42-16l52 20 44 44-34 34-26-18v172H82V106l-26 18-34-34 44-44z"/>
      <path class="pg-measure-collar" d="M118 26c8 10 24 16 42 16s34-6 42-16"/>
      <g class="pg-measure-a">
        <path d="M90 118h140"/><path d="M98 112l-8 6 8 6M222 112l8 6-8 6"/>
        <circle cx="160" cy="118" r="11"/><text x="160" y="122.5">A</text>
      </g>
      <g class="pg-measure-b">
        <path d="M268 40v238" class="pg-measure-guide"/>
        <path d="M262 50l6-10 6 10M262 268l6 10 6-10"/>
        <path d="M202 26h66M238 278h30" class="pg-measure-tick"/>
        <circle cx="268" cy="160" r="11"/><text x="268" y="164.5">B</text>
      </g>
    </svg>`;

  /* ---------- pages ---------- */
  page("about", "About", () => {
    const sig = AW.byId && AW.byId("signature-lips");
    let shot = null;
    if (sig) {
      shot = (U().modelShot && (() => { try { return U().modelShot(sig, "back"); } catch (e) { return null; } })())
        || (sig.images || []).find(s => /male-back-/.test(s)) || (sig.images || [])[0];
    }
    const shotAlt = sig ? (U().altFor ? U().altFor(sig, shot) : `${sig.name}, worn back`) : "";
    const n = products().length;
    return `
    <article class="pg pg--about">
      <header class="pg-head container">
        <div class="pg-rule"><span>AWEZA / About</span><span>No. 01</span></div>
        <div class="pg-about-hero">
          <h1 class="pg-title pg-about-title" data-reveal="lines" data-split="words">Loud shirts. <em class="t-accent">Quiet</em> standards.</h1>
          <figure class="pg-about-lips" data-reveal="scale" data-parallax="0.06">
            ${art("lips-logo.jpg", "The AWEZA lips: red lips with AWEZA across the teeth and Time Of Your Life in script", "pg-art--lips", 724, 644, true)}
            <figcaption class="pg-cap">Fig. 01 &nbsp;The lips. Where it started.</figcaption>
          </figure>
          <p class="pg-about-intro" data-reveal="up">AWEZA is a South African tee label with a big mouth. We design bold prints, put most of them on the back, and print every tee to order on clean white cotton.</p>
        </div>
      </header>

      <section class="pg-about-quote container" aria-label="Our line">
        <blockquote data-reveal="lines" data-split="words"><p>The front is polite. The back says <em>what you meant.</em></p></blockquote>
      </section>

      <section class="pg-about-spread container" aria-labelledby="pg-about-made">
        ${shot ? `<figure class="pg-about-shot" data-reveal="img">${img(shot, { alt: shotAlt, ratio: "4/5", fit: "cover", className: "pg-about-media" })}
          <figcaption class="pg-cap">Fig. 02 &nbsp;${esc(sig.name)}, worn.</figcaption></figure>` : ""}
        <div class="pg-about-copy" data-reveal="up">
          <p class="pg-eyebrow">Printed in small batches</p>
          <h2 class="pg-h" id="pg-about-made">Printed when you order. Not before.</h2>
          <p>Nothing sits in a warehouse waiting for a sale. Your tee is printed after you check out, then shipped to your door. Less waste, sharper prints, no pile of unsold stock.</p>
          <p class="pg-about-stat"><span class="pg-big">${n || "7"}</span><span>designs in the current drop. Each one earned its place.</span></p>
        </div>
      </section>

      <section class="pg-about-rules container" aria-labelledby="pg-about-rules-h">
        <div class="pg-rule pg-rule--soft"><span id="pg-about-rules-h">House rules</span><span>04 of 04</span></div>
        <ol class="pg-rules" data-stagger>
          <li data-reveal="up"><span class="pg-rules-n">01</span><h3>Humour on the back.</h3><p>The joke is the print. Everything around it stays calm, so it lands.</p></li>
          <li data-reveal="up"><span class="pg-rules-n">02</span><h3>Quality on the inside.</h3><p>Heavy cotton that keeps its shape after the wash. Sizes ${esc(sizeRange())}.</p></li>
          <li data-reveal="up"><span class="pg-rules-n">03</span><h3>Designed in South Africa.</h3><p>Made for braais, weddings, taxi queues and the morning after. Mostly the morning after.</p></li>
          <li data-reveal="up"><span class="pg-rules-n">04</span><h3>Few drops. All meant.</h3><p>We release a handful of designs at a time. If it isn't funny twice, it doesn't ship.</p></li>
        </ol>
      </section>

      <section class="pg-about-founder container" aria-labelledby="pg-about-founder-h">
        <figure class="pg-about-mark" data-reveal="fade">
          ${art("logo-tagline-black.jpg", "The AWEZA wordmark with Time of your life beneath it", "pg-art--mark", 348, 179)}
          <figcaption class="pg-cap">Fig. 03 &nbsp;The wordmark.</figcaption>
        </figure>
        <div class="pg-about-note" data-reveal="up">
          <p class="pg-eyebrow" id="pg-about-founder-h">From the founder</p>
          <p class="pg-about-q">${ph("A line or two from the founder about why AWEZA exists, in their own words.")}</p>
          <p class="pg-about-sign">${ph("Founder")}, founder. ${ph("City")}, ${ph("year started")}.</p>
        </div>
      </section>

      <section class="pg-about-end container" aria-label="Shop">
        <p class="pg-about-end-line" data-reveal="lines" data-split="words">Time of your <em>life.</em></p>
        <div data-reveal="up">${btn("Shop the drop", { href: "#/shop", variant: "primary", size: "lg", iconAfter: "arrow-right" })}</div>
      </section>
    </article>`;
  });

  page("help", "Help", () => {
    const up = upcharge();
    const sections = [
      { id: "delivery", title: "Delivery", html: `
        <div class="pg-figs">
          <div class="pg-fig"><span class="pg-big">${delivery}</span><span class="pg-fig-l">Flat delivery, anywhere in South Africa</span></div>
          <div class="pg-fig"><span class="pg-big">${freeOver}</span><span class="pg-fig-l">Spend this and delivery is free</span></div>
          <div class="pg-fig"><span class="pg-big pg-big--ph">[X–Y]</span><span class="pg-fig-l">Working days, door to door</span></div>
        </div>
        <p>Every tee is printed after you order, then shipped to you anywhere in South Africa. Allow ${ph("X–Y")} working days from order to delivery. You'll get a tracking link by email when it ships.</p>` },
      { id: "payments", title: "Payments", html: `
        <p>Card payments are processed securely by our payment provider, Yoco. We never see or store your card number. Prices are in Rand ${ph("and include VAT, if registered")}.</p>
        <p class="pg-note">Payments are launching soon. Your bag is saved on this device until then.</p>` },
      { id: "orders", title: "Orders", html: `
        <p>Printed to order means we start fast. Need to change a size or address? Email ${ph("Email")} within ${ph("X hours")} of ordering and we'll fix it before it goes to print.</p>
        <p>Something wrong when it arrives? See <a href="#/returns">Returns</a>. We sort out misprints and defects.</p>` },
      { id: "faq", title: "FAQ", html: qa([
        ["How do your tees fit?", `<p>Most tees are a classic fit: straight, roomy, heavy cotton. A few are a slimmer retail fit. Each product page says which. Full numbers in the <a href="#/size-guide">size guide</a>.</p>`],
        ["I'm between sizes. Now what?", `<p>Size up for a relaxed fit. Size down if you like it close.</p>`],
        ["Why do bigger sizes cost more?", up ? `<p>Sizes ${esc(up.from)} and up use more fabric, so they cost ${R(up.min)}${up.max !== up.min ? " to " + R(up.max) : ""} more. The price updates when you pick a size.</p>` : `<p>They don't. One price for every size.</p>`],
        ["How do I wash it?", `<p>Cold wash, inside out. No bleach, no hot tumble dry. Iron inside out and never on the print. That's how the print stays sharp.</p>`],
        ["Where's my order?", `<p>Your tracking link arrives by email when your tee ships. No link after ${ph("X")} working days? Email ${ph("Email")} with your order number.</p>`],
        ["Can I change or cancel my order?", `<p>Yes, if it hasn't gone to print. Email us within ${ph("X hours")} of ordering. Once it's printed, it's yours.</p>`],
        ["Do you deliver outside South Africa?", `<p>Not yet. South Africa only for now. ${ph("Owner to update when international shipping opens")}.</p>`],
        ["Can I send a tee as a gift?", `<p>Yes. Put their name and address at checkout and add a note for the courier. Gift wrapping isn't available yet.</p>`],
        ["Will the print crack?", `<p>Wash it the way we said above and it stays sharp much longer. ${ph("Owner to confirm the print method, e.g. direct-to-garment")}.</p>`],
        ["Do you do custom or bulk orders?", `<p>Not on the site yet. Email ${ph("Email")} with what you have in mind.</p>`],
      ]) },
      { id: "contact", title: "Contact", html: `
        <p>Email ${ph("Email")} or WhatsApp ${ph("Phone")}. We reply within ${ph("1 working day")}, faster if it's a good joke.</p>
        ${bizInfo()}` },
    ];
    return shell({
      key: "help", route: "help", label: "Help desk", folio: "No. 02",
      title: "Help <em class=\"t-accent\">desk.</em>", sub: "Short answers. No hold music.",
      meta: [["Delivery", delivery + " flat"], ["Free over", freeOver], ["Sizes", esc(sizeRange())]],
      sections,
    });
  });

  page("size-guide", "Size Guide", () => {
    const sections = [
      { id: "classic", title: "Classic fit", html: `
        <p>Straight cut, heavy cotton, room to move. Our standard.</p>
        ${sizeTable("classic")}
        <p class="pg-used"><span class="pg-used-l">Used on</span>${productLinks("classic") || "All tees"}</p>` },
      { id: "retail", title: "Retail fit", html: `
        <p>Softer, lighter jersey with a slimmer, closer cut.</p>
        ${sizeTable("retail")}
        <p class="pg-note">Approximate. Confirm against the supplier chart before launch.</p>
        ${productLinks("retail") ? `<p class="pg-used"><span class="pg-used-l">Used on</span>${productLinks("retail")}</p>` : ""}` },
      { id: "measure", title: "How to measure", html: `
        <div class="pg-measure-wrap">
          ${measureSVG}
          <div>
            ${steps([
              "<strong>Grab a tee you already love.</strong> Lay it flat and smooth it out.",
              "<strong>A. Chest width.</strong> Measure straight across, just under the armpits.",
              "<strong>B. Length.</strong> From the highest point of the shoulder down to the hem.",
              "<strong>Compare.</strong> Pick the size with the closest numbers.",
            ])}
          </div>
        </div>` },
      { id: "between", title: "Between sizes?", html: `<p class="pg-say">Size up for a relaxed fit.</p><p>Size down if you like it close. Measurements can vary by about 2.5 cm (1 in) from tee to tee.</p>` },
    ];
    return shell({
      key: "size", route: "size-guide", label: "Size guide", folio: "No. 03",
      title: "Size <em class=\"t-accent\">guide.</em>", sub: "Classic fit. If you like it roomy, size up.",
      meta: [["Sizes", esc(sizeRange())], ["Measured", "Garment, laid flat"]],
      lead: `
        <div class="pg-units" role="group" aria-label="Units">
          <span class="pg-units-l">Units</span>
          <button type="button" class="pg-unit" data-pg-unit="cm" aria-pressed="true">cm</button>
          <button type="button" class="pg-unit" data-pg-unit="in" aria-pressed="false">in</button>
          <span class="pg-units-live pg-vh" aria-live="polite"></span>
        </div>`,
      sections,
    });
  });

  page("returns", "Returns", () => shell({
    key: "returns", route: "returns", label: "Returns", folio: "No. 04", legal: true, draft: true,
    title: "Returns<em class=\"t-accent\">.</em>", sub: "If we got it wrong, we make it right.",
    meta: [["Version", "Draft 0.1"], ["Last updated", ph("date")], ["Report within", ph("X") + " days"]],
    sections: [
      { id: "short", title: "The short version", html: list([
        "Defect, misprint or wrong item? We replace it or refund you.",
        `Tell us within ${ph("X")} days of delivery, with a photo.`,
        `Each tee is printed for you, so we don't accept change-of-mind returns ${ph("owner to decide")}.`,
      ]) },
      { id: "covered", title: "What's covered", html: list([
        "Faulty tees: holes, loose seams, fabric flaws.",
        "Misprints: smudged, faded, cut off or placed wrong.",
        "The wrong design, colour or size from what you ordered.",
        "Parcels damaged on the way to you.",
      ]) },
      { id: "not", title: "What isn't", html: `${list([
        `Change of mind, or ordering the wrong size. Check the <a href="#/size-guide">size guide</a> first. ${ph("Owner to decide: offer exchanges at the customer's cost?")}`,
        "Damage from wear, or from washing against the care label.",
      ])}<p>None of this limits your rights under the Consumer Protection Act (see below).</p>` },
      { id: "how", title: "How to return", html: steps([
        `<strong>Email us.</strong> Write to ${ph("Email")} within ${ph("X")} days of delivery. Include your order number.`,
        "<strong>Send a photo.</strong> One of the problem, one of the size label.",
        `<strong>We reply within ${ph("2 working days")}.</strong> With a replacement, or a refund if you prefer.`,
        `<strong>Keep it for now.</strong> You may not need to send it back. ${ph("Owner to confirm with the fulfilment partner")}.`,
      ]) },
      { id: "cpa", title: "Defective goods and the CPA", html: `<p>The Consumer Protection Act gives you the right to return defective goods within six months of delivery for a repair, replacement or refund. We honour that, and nothing on this page takes it away.</p>` },
      { id: "cooling", title: "Cooling-off period", html: `
        <p>The Electronic Communications and Transactions Act gives a seven-day cooling-off period on many online purchases. It may not apply to goods made to a customer's specifications.</p>
        <p class="pg-flag"><strong>For owner and legal review:</strong> decide whether printed-to-order stock designs count as "made to specification". Until confirmed, assume the cooling-off right applies and state how returns under it work: ${ph("process, who pays return delivery, refund within 30 days")}.</p>` },
      { id: "refunds", title: "Refunds", html: `<p>Approved refunds go back to the card you paid with within ${ph("X")} working days. Delivery fees are refunded when the mistake was ours.</p>` },
    ],
  }));

  page("terms", "Terms", () => shell({
    key: "terms", route: "terms", label: "Terms of sale", folio: "No. 05", legal: true, draft: true,
    title: "The fine <em class=\"t-accent\">print.</em>", sub: "Terms of sale. Plain words where we can.",
    meta: [["Version", "Draft 0.1"], ["Last updated", ph("date")], ["Law", "South Africa"]],
    sections: [
      { id: "who", title: "Who we are", html: `<p>This site is run by the business below. These details are required under section 43 of the Electronic Communications and Transactions Act.</p>${bizInfo()}` },
      { id: "site", title: "Using this site", html: `<p>By ordering, you agree to these terms. You must be 18 or older, or have a parent or guardian's permission. Please give us accurate contact and delivery details.</p>` },
      { id: "orders", title: "Orders and pricing", html: list([
        `All prices are in South African Rand ${ph("and include VAT at 15%, if registered")}. Bigger sizes may cost more; the price shows when you choose a size.`,
        "Your order is accepted when we email you a confirmation. Until then, we may decline it.",
        "If a price is clearly wrong, we'll tell you and you can cancel for a full refund.",
      ]) },
      { id: "payment", title: "Payment", html: `<p>Card payments are processed by our payment provider, Yoco, over a secure connection. We don't receive or store your full card details. Payment is taken when you place your order.</p>` },
      { id: "delivery", title: "Delivery", html: `<p>We deliver within South Africa only. Delivery costs ${delivery} and is free on orders of ${freeOver} or more. Tees are printed to order, so allow ${ph("X–Y")} working days. Delivery dates are estimates. Ownership and risk pass to you on delivery.</p>` },
      { id: "returns", title: "Returns and refunds", html: `<p>See our <a href="#/returns">returns policy</a>. Your rights under the Consumer Protection Act and the ECT Act are not affected.</p>` },
      { id: "ip", title: "Our designs", html: `<p>The AWEZA name, the lips and every print on this site belong to ${ph("Registered business name")}. Buying a tee doesn't give you the right to copy or sell the designs.</p>` },
      { id: "liability", title: "Liability", html: `<p>As far as the law allows, we aren't liable for indirect or consequential loss. Nothing here limits liability that the Consumer Protection Act says we can't limit. ${ph("Attorney to review this clause")}.</p>` },
      { id: "privacy", title: "Privacy", html: `<p>How we handle your information is set out in our <a href="#/privacy">privacy policy</a>.</p>` },
      { id: "law", title: "Governing law", html: `<p>These terms are governed by the laws of the Republic of South Africa. ${ph("Attorney to confirm jurisdiction wording")}.</p>` },
      { id: "changes", title: "Changes", html: `<p>We may update these terms. The version on the site when you order is the one that applies to that order.</p>` },
      { id: "contact", title: "Contact", html: `<p>Questions? Email ${ph("Email")} or call ${ph("Phone")}.</p>` },
    ],
  }));

  page("privacy", "Privacy", () => shell({
    key: "privacy", route: "privacy", label: "Privacy", folio: "No. 06", legal: true, draft: true,
    title: "Privacy<em class=\"t-accent\">.</em>", sub: "We keep what we need. Nothing else.",
    meta: [["Version", "Draft 0.1"], ["Last updated", ph("date")], ["Written for", "POPIA"]],
    sections: [
      { id: "who", title: "Who's responsible", html: `<p>The responsible party under the Protection of Personal Information Act (POPIA) is the business below.</p>${bizInfo()}<p>Information Officer: ${ph("name")}, ${ph("email")}. ${ph("Register the Information Officer with the Information Regulator")}.</p>` },
      { id: "collect", title: "What we collect", html: list([
        "<strong>Contact details:</strong> name, email address and mobile number.",
        "<strong>Delivery address:</strong> where your tee should go.",
        "<strong>Order details:</strong> what you bought, sizes, amounts and order history.",
        "<strong>Payment confirmation:</strong> whether a payment succeeded. Never your full card number.",
        "<strong>Newsletter:</strong> your email, only if you sign up.",
        `<strong>Technical data:</strong> basic logs our host keeps, such as IP address and browser. ${ph("Owner to confirm")}.`,
      ]) },
      { id: "why", title: "Why we use it", html: list([
        "To take, print and deliver your order.",
        "To answer you when you contact us.",
        "To keep the records that tax and consumer law require.",
        "To send drop news, only if you opted in. Unsubscribe any time.",
      ]) + "<p>We don't sell your information. Ever.</p>" },
      { id: "share", title: "Who we share it with", html: `<p>We share only what each partner needs to do its job, under agreements that require them to protect it:</p>${list([
        "<strong>Yoco</strong>, our payment provider, to process card payments.",
        "<strong>Printify</strong> and its print partners, to print and pack your tee.",
        `<strong>Couriers</strong>, to deliver it. ${ph("Name the courier(s)")}.`,
        `<strong>Our website host</strong> ${ph("name")}, to run this site.`,
      ])}` },
      { id: "abroad", title: "Sending data abroad", html: `<p>Our print and fulfilment partner is based outside South Africa, so your order and delivery details are sent abroad to make your tee. POPIA allows this when it's needed to fulfil your order and the recipient is bound to protect it. ${ph("Attorney to confirm the section 72 basis")}.</p>` },
      { id: "keep", title: "How long we keep it", html: `<p>Order records: ${ph("5 years")}, for tax. Newsletter email: until you unsubscribe. Everything else: only as long as we need it, then it's deleted.</p>` },
      { id: "security", title: "Keeping it safe", html: `<p>The site uses an encrypted connection (HTTPS). Card details go straight to our payment provider. Access to order data is limited to the people who need it. ${ph("Owner to describe any other safeguards")}.</p>` },
      { id: "rights", title: "Your rights", html: `${list([
        "Ask what information we hold about you, and get a copy.",
        "Ask us to correct or delete it.",
        "Object to us using it, including for marketing.",
        "Withdraw consent you gave, such as for the newsletter.",
        `Complain to the Information Regulator: <a href="https://inforegulator.org.za" target="_blank" rel="noopener">inforegulator.org.za</a>.`,
      ])}<p>Email ${ph("email")} to use any of these rights. We reply within ${ph("30 days")}.</p>` },
      { id: "browser", title: "Cookies and your browser", html: `<p>We don't use tracking or advertising cookies ${ph("owner to update if analytics are added")}. Your bag is stored in your own browser (local storage) so it's still there when you come back. A small note also remembers if you've seen the intro. Clear your browser data to remove both.</p>` },
      { id: "kids", title: "Under 18s", html: `<p>If you're under 18, ask a parent or guardian to place the order. We don't knowingly collect children's information without their consent.</p>` },
      { id: "changes", title: "Changes", html: `<p>If this policy changes, we'll update the date at the top.</p>` },
    ],
  }));

  page("404", "Page not found", () => `
    <article class="pg pg--404">
      <div class="pg-404 container">
        <div class="pg-rule"><span>AWEZA / Error</span><span>No. 404</span></div>
        <div class="pg-404-grid">
          <figure class="pg-404-lips" data-reveal="scale">
            ${art("lips-logo.jpg", "The AWEZA lips", "pg-art--lips", 724, 644, true)}
          </figure>
          <div class="pg-404-copy">
            <p class="pg-404-code" aria-hidden="true">404</p>
            <h1 class="pg-title pg-404-title" data-reveal="lines" data-split="words">This page made a bad <em class="t-accent">decision.</em></h1>
            <p class="pg-sub" data-reveal="up">It happens to the best of us. The tees are fine.</p>
            <div class="pg-404-cta" data-reveal="up">
              ${btn("Back to the shop", { href: "#/shop", variant: "primary", size: "lg", iconAfter: "arrow-right" })}
              <a class="pg-textlink" href="#/">Or go home</a>
            </div>
          </div>
        </div>
      </div>
    </article>`);

  /* ---------- footer ---------- */
  const SOCIAL = [
    ["instagram", "Instagram"], // [Add link]
    ["tiktok", "TikTok"],       // [Add link]
    ["facebook", "Facebook"],   // [Add link]
    ["whatsapp", "WhatsApp"],   // [Add link]
  ];
  function footerHTML() {
    const cols = AW.collections || [];
    const col = (id, title, links) => `
      <details class="ft-col" data-ft-col>
        <summary class="ft-col-h"><span>${esc(title)}</span>${icon("plus", 18)}</summary>
        <ul class="ft-links">${links}</ul>
      </details>`;
    const li = (href, label) => `<li><a href="${href}">${esc(label)}</a></li>`;
    const year = new Date().getFullYear();
    return `
    <footer class="ft" data-theme="dark" aria-labelledby="ft-label">
      <h2 id="ft-label" class="pg-vh">Footer</h2>
      <div class="ft-inner container">
        <section class="ft-news" id="ft-news" aria-labelledby="ft-news-h">
          <div class="ft-news-copy">
            <p class="ft-eyebrow">The drop list</p>
            <h3 class="ft-news-h" id="ft-news-h" data-reveal="lines" data-split="words">First dibs on new drops.</h3>
            <p class="ft-news-sub">No spam. Just statements.</p>
          </div>
          <form class="ft-form" novalidate>
            <label class="ft-label" for="ft-email">Email address</label>
            <div class="ft-field">
              <input class="ft-input" id="ft-email" name="email" type="email" inputmode="email" autocomplete="email" placeholder="you@example.co.za" required aria-describedby="ft-err">
              <button class="ft-submit" type="submit"><span>Sign up</span>${icon("arrow-right", 18)}</button>
            </div>
            <p class="ft-err" id="ft-err" role="alert" hidden></p>
            <p class="ft-fine">One email per drop, roughly. Unsubscribe any time. <a href="#/privacy">Privacy</a>.</p>
          </form>
          <div class="ft-thanks" tabindex="-1" hidden>
            <p class="ft-thanks-h">You're on the list.</p>
            <p class="ft-news-sub">We'll be in touch when the next drop lands.</p>
          </div>
        </section>

        <nav class="ft-nav" aria-label="Footer">
          ${col("shop", "Shop", li("#/shop", "Shop all") + cols.map(c => li(`#/shop/${encodeURIComponent(c.id)}`, c.name)).join(""))}
          ${col("help", "Help", li("#/help/delivery", "Delivery") + li("#/returns", "Returns") + li("#/size-guide", "Size guide") + li("#/help/faq", "FAQ"))}
          ${col("aweza", "AWEZA", li("#/about", "About") + li("#/terms", "Terms") + li("#/privacy", "Privacy"))}
          <div class="ft-col ft-col--follow">
            <p class="ft-col-h ft-col-h--static">Follow</p>
            <ul class="ft-social">
              ${SOCIAL.map(([k, n]) => `<!-- [Add link] ${n} --><li><a href="#" data-ft-social aria-label="AWEZA on ${n}">${icon(k, 22)}</a></li>`).join("")}
            </ul>
          </div>
        </nav>

        <section class="ft-biz" aria-labelledby="ft-biz-h">
          <p class="ft-eyebrow" id="ft-biz-h">Business details</p>
          ${bizInfo("ft-biz-dl")}
          <p class="ft-biz-links"><a href="#/terms">Terms</a><a href="#/privacy">Privacy</a><a href="#/returns">Returns</a></p>
        </section>
      </div>

      <div class="ft-mega" aria-hidden="true">
        <p class="ft-mega-word" data-reveal="lines" data-split="chars">AWEZA</p><span class="ft-mega-tm">™</span>
      </div>

      <div class="ft-base container">
        <p class="ft-line">${lips("ft-lips")}<span>Time of your life.</span></p>
        <p class="ft-legal">© ${year} AWEZA <span aria-hidden="true">/</span> Secure card payments. Prices in Rand.</p>
        <button type="button" class="ft-top" data-ft-top>Back to top ${icon("arrow-up", 16)}</button>
      </div>
    </footer>`;
  }

  function mountFooter() {
    const ftRoot = document.getElementById("footer-root");
    if (!ftRoot || ftRoot.dataset.ftMounted) return;
    ftRoot.dataset.ftMounted = "1";
    ftRoot.innerHTML = footerHTML();
    const ft = ftRoot.firstElementChild;
    const form = ft.querySelector(".ft-form");
    const input = ft.querySelector(".ft-input");
    const err = ft.querySelector(".ft-err");
    const thanks = ft.querySelector(".ft-thanks");
    const showErr = msg => {
      err.textContent = msg; err.hidden = !msg;
      input.setAttribute("aria-invalid", msg ? "true" : "false");
      form.classList.toggle("is-error", !!msg);
    };
    const valid = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
    form.addEventListener("submit", e => {
      e.preventDefault();
      const v = input.value.trim();
      if (!v) { showErr("Add your email first. We'll wait."); input.focus(); return; }
      if (!valid(v)) { showErr("That email looks off. Check it and try again."); input.focus(); return; }
      showErr("");
      // TODO: connect email provider. Nothing is stored or sent yet.
      form.hidden = true; thanks.hidden = false; thanks.focus();
      AW.toast && AW.toast("You're on the list. Sharp.");
    });
    input.addEventListener("input", () => { if (!err.hidden && valid(input.value.trim())) showErr(""); });

    ft.addEventListener("click", e => {
      if (e.target.closest("[data-ft-social]")) { e.preventDefault(); AW.toast && AW.toast("Socials coming soon."); return; }
      if (e.target.closest("[data-ft-top]")) {
        if (AW.motion && AW.motion.lenis && AW.motion.scrollTo) AW.motion.scrollTo(0);
        else window.scrollTo({ top: 0, behavior: reduced() ? "auto" : "smooth" });
        const app = document.getElementById("app"); app && app.focus({ preventScroll: true });
      }
      // Columns are always open on desktop: ignore summary toggles there.
      const sum = e.target.closest(".ft-col-h");
      if (sum && sum.tagName === "SUMMARY" && mq.matches) e.preventDefault();
    });

    // Accordions below 900px, open columns above.
    const mq = window.matchMedia("(min-width: 900px)");
    const sync = () => ft.querySelectorAll("details[data-ft-col]").forEach(d => {
      const s = d.querySelector("summary");
      if (mq.matches) { d.open = true; s.setAttribute("tabindex", "-1"); s.setAttribute("aria-disabled", "true"); }
      else { d.open = false; s.removeAttribute("tabindex"); s.removeAttribute("aria-disabled"); }
    });
    sync();
    mq.addEventListener ? mq.addEventListener("change", sync) : mq.addListener(sync);
    // Collection names may be rewritten by the brand agent before start; refresh links on first route.
    AW.motion && AW.motion.refresh && AW.motion.refresh(ft);
  }
  if (document.getElementById("footer-root")) mountFooter();
  else document.addEventListener("DOMContentLoaded", mountFooter);
})();
