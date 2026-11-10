/* AWEZA one-page store: a clothes rail.
   Shirts hang sideways on a rail, the way they hang in a cupboard. Running a finger (or the mouse)
   along the rail turns the shirt under it toward you. Tapping a shirt brings it round to face you and
   opens its details below. Once a shirt is open, swiping left or right moves to the next one.
   Also owns the minimal header and footer, and a small AW.motion stand-in for the bag and checkout. */
(() => {
  const AW = window.AW;
  const esc = AW.esc;
  const ORDER = ["signature-lips", "ceo-of-bad-decisions", "zero-exes", "captain-save", "need-a-hug", "sweet-cupcake"];
  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* The bag, checkout and help pages call these if present. No page-wide motion system any more. */
  AW.motion = {
    reduced: reduced(), lenis: null, intro: false, ready: Promise.resolve(),
    refresh() {}, stop() {}, start() {},
    scrollTo(t) { const y = typeof t === "number" ? t : (t && t.getBoundingClientRect ? t.getBoundingClientRect().top + scrollY - 70 : 0); window.scrollTo({ top: y, behavior: reduced() ? "auto" : "smooth" }); },
    flyToBag() { const b = document.querySelector(".mh-bag"); if (b) { b.classList.remove("is-bump"); void b.offsetWidth; b.classList.add("is-bump"); } return Promise.resolve(); },
  };

  /* ---------- header ---------- */
  function mountHeader() {
    const root = document.getElementById("nav-root");
    if (!root) return;
    root.innerHTML = `
      <header class="mh">
        <a class="mh-logo" href="#/" aria-label="AWEZA, home">AWEZA<sup>™</sup></a>
        <button type="button" class="mh-bag" data-bag-target aria-label="Bag, 0 items">
          <span>Bag</span><span class="mh-count" aria-hidden="true">0</span>
        </button>
      </header>`;
    const bag = root.querySelector(".mh-bag"), count = root.querySelector(".mh-count");
    bag.addEventListener("click", () => AW.emit("cart:open"));
    const sync = () => {
      const n = AW.cart.count();
      count.textContent = n;
      bag.classList.toggle("has-items", n > 0);
      bag.setAttribute("aria-label", `Bag, ${n} item${n === 1 ? "" : "s"}`);
    };
    AW.on("cart", sync); sync();
  }

  /* ---------- footer ---------- */
  function mountFooter() {
    const old = document.getElementById("footer-root");
    if (old) old.hidden = true;
    let f = document.getElementById("mini-foot");
    if (!f) { f = document.createElement("div"); f.id = "mini-foot"; (old || document.body).insertAdjacentElement("afterend", f); }
    const c = AW.config;
    f.innerHTML = `
      <footer class="mf">
        <div class="mf-facts">
          <p><strong>Delivery</strong> ${AW.rand(c.delivery)} anywhere in South Africa. Free over ${AW.rand(c.freeDeliveryOver)}.</p>
          <p><strong>Printed to order</strong> Every tee is printed when you buy it, so nothing sits in a warehouse.</p>
          <p><strong>Payment</strong> Card, Apple Pay or Google Pay through a secure checkout. Prices in Rand.</p>
        </div>
        <nav class="mf-links" aria-label="Help">
          <a href="#/size-guide">Size guide</a>
          <a href="#/help">Help</a>
          <a href="#/returns">Returns</a>
          <a href="#/terms">Terms</a>
          <a href="#/privacy">Privacy</a>
          <a href="#/about">About</a>
        </nav>
        <p class="mf-sign"><span class="mf-mark">AWEZA<sup>™</sup></span> Time of your life.</p>
      </footer>`;
  }

  /* ---------- the rail ---------- */
  let st = null; // live state for the current render

  function railMarkup(list) {
    return `
      <section class="rail" aria-label="The rail. ${list.length} tees">
        <p class="rail-tag">Time of your life.</p>
        <p class="rail-hint" id="rail-hint">Run your finger along the rail. Tap a shirt to see it.</p>
        <div class="rail-focusbar" hidden>
          <button type="button" class="rf-back">All tees</button>
          <span class="rf-name" aria-live="polite"></span>
          <span class="rf-steps">
            <button type="button" class="rf-step" data-step="-1" aria-label="Previous tee">&#8249;</button>
            <button type="button" class="rf-step" data-step="1" aria-label="Next tee">&#8250;</button>
          </span>
        </div>
        <div class="rail-stage" role="listbox" aria-label="Tees" aria-describedby="rail-hint" tabindex="0">
          <div class="rail-bar" aria-hidden="true"></div>
          ${list.map((p, i) => `
            <button type="button" class="rail-tee" role="option" aria-selected="false" data-i="${i}" tabindex="-1"
              aria-label="${esc(p.name)}, ${AW.rand(p.price)}">
              <img src="images/hang/${p.id}.jpg" alt="" width="640" height="801" draggable="false"
                ${i < 4 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">
            </button>`).join("")}
        </div>
        <p class="rail-spinhint" aria-hidden="true">Drag sideways to turn it</p>
        <div class="rail-dots" aria-hidden="true">${list.map(() => "<span></span>").join("")}</div>
      </section>
      <section class="pick" aria-live="polite"></section>`;
  }

  function dims() {
    const vw = innerWidth, focused = st && st.sel != null;
    const w = focused
      ? (vw < 600 ? Math.min(vw * 0.98, 440) : Math.min(vw * 0.42, 600))          // the tapped shirt takes the stage
      : (vw < 600 ? Math.min(vw * 0.64, 280) : Math.min(vw * 0.26, 360));          // open shirt width on the rail
    const gap = vw < 600 ? 30 : Math.min(58, vw / 22);                        // spacing of sideways shirts
    return { w, gap };
  }

  /* Lay the shirts out. c = index the layout opens around; o = how open it is (0 closed, .55 peek, 1 facing you). */
  function layout() {
    if (!st) return;
    const { tees, n } = st;
    const { w, gap } = dims();
    const A = 76; // sideways angle in degrees
    const mid = (n - 1) / 2;
    const c = st.sel != null ? st.sel : st.focus;
    const o = st.sel != null ? 1 : st.focus != null ? 0.55 : 0;
    const shift = st.sel != null ? -(st.sel - mid) * gap : 0;   // centre the open shirt
    const items = [];
    tees.forEach((el, i) => {
      let x = (i - mid) * gap + shift, ang = i < mid ? A : i > mid ? -A : A * 0.98, z = 50 - Math.abs(i - mid), s = 0.94;
      if (c != null) {
        const d = i - c;
        ang = d < 0 ? A : -A;
        z = 100 - Math.abs(d) * 4;
        if (d === 0) { ang = A * (1 - o) * (st.side || 1); s = 0.94 + o * 0.06; z = 200; }
        else x += Math.sign(d) * (o * w * 0.5 + (o ? 10 : 0) + (st.sel != null ? 70 + Math.abs(d) * 18 : 0));
      }
      items.push({ x, ang, s });
      el.style.setProperty("--x", x.toFixed(1) + "px");
      el.style.setProperty("--ry", ang.toFixed(1) + "deg");
      el.style.setProperty("--s", s.toFixed(3));
      el.style.zIndex = z;
      el.classList.toggle("is-open", st.sel === i);
      el.classList.toggle("is-peek", st.sel == null && st.focus === i);
      el.setAttribute("aria-selected", st.sel === i ? "true" : "false");
    });
    st.dots.forEach((d, i) => d.classList.toggle("is-on", i === c));
    st.root.querySelector(".rail").style.setProperty("--rl-fw", w.toFixed(0) + "px");   // focus mode sizes the stage to the shirt
    AW.emit("rail:layout", { items, sel: st.sel, focus: st.focus, w });
  }

  function setFocusUI() {
    const rail = st.root.querySelector(".rail");
    rail.classList.toggle("rail--focus", st.sel != null);
    const bar = st.root.querySelector(".rail-focusbar");
    if (bar) {
      bar.hidden = st.sel == null;
      if (st.sel != null) {
        bar.querySelector(".rf-name").textContent = st.list[st.sel].name;
        bar.querySelector('[data-step="-1"]').disabled = st.sel === 0;
        bar.querySelector('[data-step="1"]').disabled = st.sel === st.n - 1;
      }
    }
  }

  function unselect() {
    if (!st || st.sel == null) return;
    st.sel = null; st.focus = null;
    layout(); setFocusUI();
    st.root.querySelector(".pick").innerHTML = "";
  }

  function select(i, opts = {}) {
    if (!st) return;
    i = Math.max(0, Math.min(st.n - 1, i));
    st.side = st.sel != null && i < st.sel ? -1 : 1;
    st.sel = i; st.focus = null;
    layout(); setFocusUI();
    renderPick(st.list[i], opts);
    st.stage.setAttribute("aria-activedescendant", "");
    if (opts.scroll) AW.motion.scrollTo(st.root.querySelector(".pick"));
  }

  function renderPick(p, opts) {
    const box = st.root.querySelector(".pick");
    const photos = p.images.filter(s => /male-|front|back/.test(s)).slice(0, 6);
    box.innerHTML = `
      <div class="pick-in" data-id="${esc(p.id)}">
        <div class="pick-head">
          <h1 class="pick-name">${esc(p.name)}</h1>
          <p class="pick-price" data-price>${AW.rand(p.price)}</p>
        </div>
        <p class="pick-sum">${esc(p.summary)}</p>
        <fieldset class="pick-sizes">
          <legend>Size</legend>
          <button type="button" class="pick-guide" aria-haspopup="dialog">Size guide</button>
          <div class="pick-size-row">
            ${p.sizes.map(s => {
              const up = AW.config.sizeUpcharge[s];
              return `<button type="button" class="pick-size" data-size="${esc(s)}" aria-pressed="false">${esc(s)}${up ? `<small>+R${up}</small>` : ""}</button>`;
            }).join("")}
          </div>
          <p class="pick-note" role="status"></p>
        </fieldset>
        <button type="button" class="pick-add">Add to bag</button>
        ${AW.rail3d && AW.rail3d.active ? `<button type="button" class="pick-turn" aria-pressed="false">Turn it around</button>` : ""}
        <div class="pick-photos" aria-label="Photos of the ${esc(p.name)}">
          ${photos.map((src, k) => `<img src="${esc(src)}" alt="${esc((AW.ui && AW.ui.altFor) ? AW.ui.altFor(p, src) : p.name)}" width="1000" height="1000" loading="${k < 2 ? "eager" : "lazy"}" decoding="async">`).join("")}
        </div>
        <p class="pick-step">
          <button type="button" class="pick-nav" data-step="-1" ${st.sel === 0 ? "disabled" : ""}>Previous</button>
          <span>${st.sel + 1} of ${st.n}</span>
          <button type="button" class="pick-nav" data-step="1" ${st.sel === st.n - 1 ? "disabled" : ""}>Next</button>
        </p>
      </div>`;
    let size = null;
    const note = box.querySelector(".pick-note"), price = box.querySelector("[data-price]");
    const choose = s => {
      const b = box.querySelector(`.pick-size[data-size="${s}"]`); if (!b) return;
      size = s;
      box.querySelectorAll(".pick-size").forEach(x => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
      price.textContent = AW.rand(AW.priceFor(p, size));
      note.textContent = "";
    };
    box.querySelectorAll(".pick-size").forEach(b => b.addEventListener("click", () => choose(b.dataset.size)));
    const guideBtn = box.querySelector(".pick-guide");
    guideBtn.addEventListener("click", () => openSizeGuide(p, size, s => { choose(s); box.querySelector(`.pick-size[data-size="${s}"]`).focus(); }, guideBtn));
    box.querySelector(".pick-add").addEventListener("click", () => {
      if (!size) { note.textContent = "Pick a size first."; box.querySelector(".pick-size").focus(); return; }
      AW.cart.add(p.id, size);
      AW.motion.flyToBag();
    });
    const turn = box.querySelector(".pick-turn");
    if (turn) turn.addEventListener("click", () => {
      const back = turn.getAttribute("aria-pressed") !== "true";
      turn.setAttribute("aria-pressed", back ? "true" : "false");
      turn.textContent = back ? "Show the front" : "Turn it around";
      AW.emit("rail:turn", { back });
      if (back) st.root.querySelector(".rail-stage").scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "center" });
    });
    box.querySelectorAll(".pick-nav").forEach(b => b.addEventListener("click", () => select(st.sel + Number(b.dataset.step))));
    if (opts.focusName) box.querySelector(".pick-name").focus?.();
  }

  /* ---------- size guide sheet (opened from beside the sizes) ----------
     Same measurements as the Size guide page: garment laid flat, inches are the source. */
  const SIZE_CHART = {
    sizes: ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"],
    width: [18, 20, 22, 24, 26, 28, 30, 32],
    length: [28, 29, 30, 31, 32, 33, 34, 35],
  };
  let guideUnit = "cm";
  try { guideUnit = localStorage.getItem("aw-size-unit") === "in" ? "in" : "cm"; } catch {}

  function openSizeGuide(p, current, onPick, opener) {
    const root = document.getElementById("overlay-root") || document.body;
    const fmt = inch => guideUnit === "in" ? String(inch) : String(Math.round(inch * 2.54));
    const sizes = p.sizes.filter(s => SIZE_CHART.sizes.includes(s));
    const wrap = document.createElement("div");
    wrap.className = "sg";
    wrap.innerHTML = `
      <div class="sg-scrim" data-close></div>
      <div class="sg-sheet" role="dialog" aria-modal="true" aria-labelledby="sg-title">
        <div class="sg-head">
          <h2 id="sg-title">Size guide</h2>
          <button type="button" class="sg-x" data-close aria-label="Close size guide">Close</button>
        </div>
        <p class="sg-sub">${esc(p.name)}. Classic unisex fit, measured with the tee laid flat.</p>
        <div class="sg-units" role="group" aria-label="Units">
          <button type="button" data-unit="cm" aria-pressed="${guideUnit === "cm"}">cm</button>
          <button type="button" data-unit="in" aria-pressed="${guideUnit === "in"}">inches</button>
        </div>
        <table class="sg-table">
          <caption class="sg-cap">Tap a size to choose it.</caption>
          <thead><tr><th scope="col">Size</th><th scope="col">Chest width (A)</th><th scope="col">Length (B)</th></tr></thead>
          <tbody>${sizes.map(s => {
            const i = SIZE_CHART.sizes.indexOf(s);
            return `<tr class="${s === current ? "is-on" : ""}"><th scope="row"><button type="button" class="sg-pick" data-size="${s}" aria-label="Choose ${s}">${s}</button></th>
              <td data-in="${SIZE_CHART.width[i]}">${fmt(SIZE_CHART.width[i])}</td><td data-in="${SIZE_CHART.length[i]}">${fmt(SIZE_CHART.length[i])}</td></tr>`;
          }).join("")}</tbody>
        </table>
        <ul class="sg-how">
          <li><strong>A, chest width:</strong> straight across, just under the armpits.</li>
          <li><strong>B, length:</strong> from the top of the shoulder to the hem.</li>
          <li>Compare with a tee you already like. Between sizes? Go one up for a looser fit.</li>
        </ul>
        <a class="sg-more" href="#/size-guide">Full size guide</a>
      </div>`;
    root.appendChild(wrap);
    const sheet = wrap.querySelector(".sg-sheet");
    const prevFocus = opener || document.activeElement;
    const release = AW.ui && AW.ui.trapFocus ? AW.ui.trapFocus(sheet) : null;
    if (AW.ui && AW.ui.lockScroll) AW.ui.lockScroll(true);
    void wrap.offsetWidth;            // commit the closed state, then slide in
    wrap.classList.add("is-open");
    const close = () => {
      document.removeEventListener("keydown", onKey);
      wrap.classList.remove("is-open");
      if (typeof release === "function") release();
      if (AW.ui && AW.ui.lockScroll) AW.ui.lockScroll(false);
      setTimeout(() => wrap.remove(), reduced() ? 0 : 260);
    };
    const onKey = e => { if (e.key === "Escape") { close(); prevFocus && prevFocus.focus && prevFocus.focus(); } };
    document.addEventListener("keydown", onKey);
    wrap.addEventListener("click", e => {
      if (e.target.closest("[data-close]")) { close(); prevFocus && prevFocus.focus && prevFocus.focus(); return; }
      const u = e.target.closest("[data-unit]");
      if (u) {
        guideUnit = u.dataset.unit;
        try { localStorage.setItem("aw-size-unit", guideUnit); } catch {}
        wrap.querySelectorAll("[data-unit]").forEach(b => b.setAttribute("aria-pressed", String(b === u)));
        wrap.querySelectorAll("td[data-in]").forEach(td => { td.textContent = fmt(Number(td.dataset.in)); });
        return;
      }
      const pk = e.target.closest(".sg-pick");
      if (pk) { close(); onPick(pk.dataset.size); return; }
      if (e.target.closest(".sg-more")) close();
    });
    setTimeout(() => { const f = wrap.querySelector(".sg-x"); f && f.focus(); }, 30);
  }

  function bindStage() {
    const stage = st.stage;
    const idxAt = clientX => {
      const r = stage.getBoundingClientRect();
      // Map the finger to the shirt drawn nearest to it.
      let best = 0, bd = Infinity;
      st.tees.forEach((el, i) => { const b = el.getBoundingClientRect(); const d = Math.abs((b.left + b.right) / 2 - clientX); if (d < bd) { bd = d; best = i; } });
      return clientX < r.left || clientX > r.right ? null : best;
    };
    let down = null;
    const turnRange = () => Math.max(420, stage.clientWidth * 1.5);   // about one and a half stage widths of dragging = one full turn
    stage.addEventListener("pointerdown", e => {
      down = { x: e.clientX, y: e.clientY, t: Date.now(), moved: false, id: e.pointerId, lastX: e.clientX, lastT: performance.now(), v: 0, spinning: false };
      if (st.sel != null) AW.emit("rail:spin", { phase: "start" });
      if (st.sel == null && e.pointerType !== "mouse") { st.focus = idxAt(e.clientX); layout(); }
    });
    stage.addEventListener("pointermove", e => {
      if (down && Math.abs(e.clientX - down.x) > 8) down.moved = true;
      if (st.sel != null) {
        if (!down) return;
        const dx = e.clientX - down.x, dy = e.clientY - down.y;
        if (!down.spinning && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) down.spinning = true;
        if (down.spinning) {
          const now = performance.now(), dtm = Math.max(1, now - down.lastT);
          down.v = 0.7 * down.v + 0.3 * ((e.clientX - down.lastX) / dtm);   // px per ms, smoothed
          down.lastX = e.clientX; down.lastT = now;
          AW.emit("rail:spin", { phase: "move", angle: dx / turnRange() * Math.PI * 2 });
        }
        return;
      }
      if (e.pointerType === "mouse" || down) {
        const i = idxAt(e.clientX);
        if (i !== st.focus) { st.focus = i; layout(); }
      }
    });
    const end = e => {
      if (!down) return;
      const dx = e.clientX - down.x, dy = e.clientY - down.y, quick = Date.now() - down.t < 600;
      const wasMoved = down.moved, spun = down.spinning, flick = down.v; down = null;
      if (st.sel != null) {   // let go of a turn: it carries on a little with the speed of the swipe
        // px/ms -> radians per second, so a quick flick keeps turning and a slow drag just stops
        AW.emit("rail:spin", { phase: "end", velocity: spun ? flick / turnRange() * Math.PI * 2 * 1000 : 0 });
        return;
      }
      if (st.sel == null && wasMoved) { const i = st.focus != null ? st.focus : idxAt(e.clientX); if (i != null) select(i); return; }
      if (!wasMoved && quick) {
        const t = e.target.closest(".rail-tee");
        const i = t ? Number(t.dataset.i) : idxAt(e.clientX);
        if (i != null) select(i);
      }
    };
    stage.addEventListener("pointerup", end);
    stage.addEventListener("pointercancel", () => { down = null; if (st.sel != null) AW.emit("rail:spin", { phase: "end", velocity: 0 }); else { st.focus = null; layout(); } });
    stage.addEventListener("pointerleave", e => { if (e.pointerType === "mouse" && st.sel == null) { st.focus = null; layout(); } });
    stage.addEventListener("click", e => e.preventDefault()); // selection happens on pointerup
    const bar = st.root.querySelector(".rail-focusbar");
    bar.querySelector(".rf-back").addEventListener("click", unselect);
    bar.querySelectorAll(".rf-step").forEach(b => b.addEventListener("click", () => select(st.sel + Number(b.dataset.step))));
    stage.addEventListener("keydown", e => {
      if (e.key === "Escape" && st.sel != null) { e.preventDefault(); unselect(); return; }
      if (st.sel != null && (e.key === "a" || e.key === "d")) { AW.emit("rail:spin", { phase: "nudge", angle: (e.key === "d" ? 1 : -1) * Math.PI / 8 }); return; }
      const cur = st.sel != null ? st.sel : st.focus != null ? st.focus : -1;
      if (e.key === "ArrowRight") { e.preventDefault(); select(cur + 1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); select(cur < 0 ? 0 : cur - 1); }
      else if (e.key === "Home") { e.preventDefault(); select(0); }
      else if (e.key === "End") { e.preventDefault(); select(st.n - 1); }
      else if ((e.key === "Enter" || e.key === " ") && cur < 0) { e.preventDefault(); select(0); }
    });
  }

  /* A short sweep along the rail on arrival, so it's obvious the shirts move. */
  function sweep() {
    if (reduced() || !st) return;
    const token = st;
    let i = 0;
    const tick = () => {
      if (st !== token || st.sel != null || st.touched) { if (st === token && st.sel == null) { st.focus = null; layout(); } return; }
      if (i >= st.n) { st.focus = null; layout(); return; }
      st.focus = i++; layout();
      setTimeout(tick, 150);
    };
    setTimeout(tick, 350);
  }

  function renderHome(app, preselect) {
    document.title = "AWEZA | Graphic tees from South Africa";
    const list = ORDER.map(id => AW.byId(id)).filter(Boolean).concat(AW.products.filter(p => !ORDER.includes(p.id)));
    app.innerHTML = railMarkup(list);
    const root = app;
    st = {
      root, list, n: list.length, sel: null, focus: null, side: 1, touched: false,
      stage: root.querySelector(".rail-stage"),
      tees: [...root.querySelectorAll(".rail-tee")],
      dots: [...root.querySelectorAll(".rail-dots span")],
    };
    st.stage.addEventListener("pointerdown", () => { st.touched = true; }, { once: true });
    bindStage();
    AW.emit("rail:mount", { stage: st.stage, list });
    const pre = preselect ? list.findIndex(p => p.id === preselect) : -1;
    if (pre >= 0) select(pre);
    else {
      layout();
      root.querySelector(".pick").innerHTML = "";
      sweep();
    }
  }

  let resizeT;
  window.addEventListener("resize", () => { clearTimeout(resizeT); resizeT = setTimeout(layout, 120); });

  AW.route("", app => renderHome(app));
  AW.route("shop", app => renderHome(app));
  AW.route("product", (app, id) => renderHome(app, id));
  AW.on("route", ({ page }) => { if (page !== "" && page !== "shop" && page !== "product") st = null; });

  mountHeader();
  mountFooter();
})();
