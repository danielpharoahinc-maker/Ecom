/* AWEZA motion system. Agent 07. Owns js/motion.js + css/motion.css (prefix .mo-*).
   Contract: DIRECTION §9. Content is visible by default; hidden states only exist under html.mo-ready,
   which this file adds once it is running. Any failure removes mo-ready again.

   Data attributes (put them in your markup, motion.js does the rest):
     data-reveal="up|fade|scale|left|right|img|lines"   reveal once at 15% visible (adds .is-in)
     data-reveal-delay="120"                             extra ms
     data-stagger="70"  (on a parent)                    children entering together cascade (max 8 steps)
     data-split="words|chars"                            with data-reveal="lines"
     data-parallax="0.12"                                -0.3..0.3, translateY = (centre - viewport centre) * f
     data-marquee="60"                                   px/s (negative = reverse); children become a flex row
     data-magnetic=".3"                                  0..1, fine pointers only
     data-count-to="1500" data-count-format="rand"       count up on reveal (data-count-pad="2" for "07")
     data-bag-target                                     fly-to-bag destination (nav puts it on the bag button)
     data-cursor="View|Zoom|Drag|none"                   label for the custom cursor disc (.card-media = "View")
     data-no-curtain                                     on an <a href="#/..."> to skip the page curtain
   JS: AW.motion = { refresh(root), flyToBag(el) -> Promise, scrollTo(target, opts), stop(), start(),
                     lenis, reduced, ready (Promise, resolves when the intro is gone), intro (boolean) }
   Events emitted on the AW bus: "motion:intro-done". */
(() => {
  const AW = (window.AW = window.AW || {});
  const doc = document;
  const html = doc.documentElement;
  const G = window.gsap, ST = window.ScrollTrigger, LenisLib = window.Lenis;
  const mm = q => (window.matchMedia ? window.matchMedia(q) : { matches: false, addEventListener() {} });
  const mqReduce = mm("(prefers-reduced-motion: reduce)");
  const mqFine = mm("(hover: hover) and (pointer: fine)");
  const hasIO = "IntersectionObserver" in window;
  const hasWAAPI = typeof Element !== "undefined" && typeof Element.prototype.animate === "function";
  const EASE = {
    out: "cubic-bezier(.16,1,.3,1)", inOut: "cubic-bezier(.65,0,.35,1)",
    in: "cubic-bezier(.7,0,.84,0)", spring: "cubic-bezier(.34,1.56,.64,1)",
  };
  const DUR = { 1: 120, 2: 240, 3: 420, 4: 720, 5: 1100 };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const now = () => (window.performance ? performance.now() : Date.now());
  const raf = window.requestAnimationFrame ? fn => window.requestAnimationFrame(fn) : fn => setTimeout(fn, 16);
  const warn = (where, e) => { try { console.warn("[motion] " + where, e); } catch (_) {} };
  const safe = (fn, where) => function () { try { return fn.apply(this, arguments); } catch (e) { warn(where || "handler", e); } };

  let readyResolve;
  const ready = new Promise(r => { readyResolve = r; });

  /* ---------- public API (defined synchronously) ---------- */
  const M = (AW.motion = {
    lenis: null,
    get reduced() { return reduced; },
    ready,
    intro: false,
    refresh: root => { try { scan(root || doc); } catch (e) { warn("refresh", e); } },
    flyToBag: el => { try { return flyToBag(el); } catch (e) { warn("flyToBag", e); return Promise.resolve(); } },
    scrollTo: (t, o) => { try { return scrollTo(t, o); } catch (e) { warn("scrollTo", e); } },
    stop: () => { try { stopScroll(); } catch (e) { warn("stop", e); } },
    start: () => { try { startScroll(); } catch (e) { warn("start", e); } },
  });

  let reduced = !!mqReduce.matches;
  let cssOk = false;
  let enabled = false; // mo-ready active

  /* ---------- shared ticker (gsap.ticker if present, else rAF on demand) ---------- */
  const tasks = new Set();
  let rafId = 0, gsapHooked = false;
  function runTasks(t) { tasks.forEach(fn => { try { fn(t); } catch (e) { tasks.delete(fn); warn("tick", e); } }); }
  function loop(t) { rafId = 0; runTasks(t); if (tasks.size && !gsapHooked) rafId = raf(loop); }
  function addTask(fn) {
    tasks.add(fn);
    if (G && G.ticker) {
      if (!gsapHooked) { gsapHooked = true; G.ticker.add(time => runTasks(time * 1000)); }
    } else if (!rafId) rafId = raf(loop);
  }
  const removeTask = fn => tasks.delete(fn);

  /* ---------- reveals ---------- */
  const seen = new WeakSet();
  const firstSeen = new WeakMap();
  let io = null;
  let hold = 0;
  const held = new Set();

  function revealObserver() {
    if (io || !hasIO) return io;
    io = new IntersectionObserver(safe(entries => {
      const batch = [];
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        const vh = (en.rootBounds && en.rootBounds.height) || window.innerHeight;
        if (en.intersectionRatio >= 0.15 || en.intersectionRect.height >= vh * 0.25) batch.push(en.target);
      });
      if (batch.length) revealBatch(batch);
    }, "reveal-io"), { threshold: [0, 0.15], rootMargin: "0px 0px -8% 0px" });
    return io;
  }

  function prepReveal(el) {
    if (seen.has(el)) return;
    seen.add(el);
    if (reduced || !enabled) { el.classList.add("is-in"); return; }
    if (el.getAttribute("data-reveal") === "lines") split(el);
    if (el.hasAttribute("data-count-to")) prepCount(el);
    if (io) io.observe(el); else reveal(el, 0);
  }

  function revealBatch(list) {
    if (hold > 0) { list.forEach(el => held.add(el)); return; }
    list = list.filter(el => el.isConnected && !el.classList.contains("is-in"));
    list.sort((a, b) => (a.compareDocumentPosition(b) & 4 ? -1 : 1)); // DOM order
    const groups = new Map();
    list.forEach(el => {
      const parent = el.parentElement && el.parentElement.closest("[data-stagger]");
      let extra = 0;
      if (parent) {
        const n = groups.get(parent) || 0;
        groups.set(parent, n + 1);
        const step = parseFloat(parent.getAttribute("data-stagger"));
        extra = Math.min(n, 8) * (isFinite(step) && step > 0 ? step : 70);
      }
      reveal(el, extra);
    });
  }

  function reveal(el, extra) {
    if (!el || el.classList.contains("is-in")) return;
    if (io) io.unobserve(el);
    const own = parseFloat(el.getAttribute("data-reveal-delay"));
    const delay = (isFinite(own) ? own : 0) + (extra || 0);
    const type = el.getAttribute("data-reveal");
    if (delay) el.style.setProperty("--mo-delay", delay + "ms");
    let total = DUR[4];
    if (type === "lines") total = lineDelays(el, delay) + DUR[5];
    else if (type === "img") total = DUR[5] * 1.35;
    el.classList.add("is-in");
    if (el.hasAttribute("data-count-to")) setTimeout(() => runCount(el), delay);
    setTimeout(() => { el.classList.add("mo-done"); el.style.removeProperty("--mo-delay"); }, delay + total + 80);
  }

  function holdReveals() { hold++; }
  function releaseReveals() {
    hold = Math.max(0, hold - 1);
    if (!hold && held.size) { const list = [...held]; held.clear(); revealBatch(list); }
  }

  /* Safety net: anything in the viewport but still hidden for 3s is shown. Also adopts missed nodes. */
  function safetyNet() {
    if (!enabled) return;
    const t = now(), vh = window.innerHeight, vw = window.innerWidth;
    const list = doc.querySelectorAll("[data-reveal]:not(.is-in)");
    for (let i = 0; i < list.length && i < 300; i++) {
      const el = list[i];
      if (!seen.has(el)) prepReveal(el);
      const r = el.getBoundingClientRect();
      const inView = r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw;
      if (!inView) { firstSeen.delete(el); continue; }
      const f = firstSeen.get(el);
      if (f == null) firstSeen.set(el, t);
      else if (t - f > 3000) { held.delete(el); reveal(el, 0); }
    }
  }

  /* ---------- split text ---------- */
  const SKIP_SPLIT = /^(SCRIPT|STYLE|SVG|svg|TEXTAREA|INPUT|SELECT|BUTTON|IMG|BR)$/;
  function split(el) {
    if (el.hasAttribute("data-split-done")) return;
    const mode = el.getAttribute("data-split") === "chars" ? "chars" : "words";
    const label = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (!label || label.length > 600) { el.setAttribute("data-split-done", "skip"); return; }
    const interactive = !!el.querySelector("a,button,input,select,textarea,[tabindex]");
    const walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode: n => {
        for (let p = n.parentNode; p && p !== el; p = p.parentNode) if (SKIP_SPLIT.test(p.nodeName) || (p.classList && p.classList.contains("visually-hidden"))) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const parts = node.nodeValue.split(/([ \t\n\r\f]+)/);
      if (parts.length === 1 && !parts[0]) return;
      const frag = doc.createDocumentFragment();
      parts.forEach(part => {
        if (!part) return;
        if (/^[ \t\n\r\f]+$/.test(part)) { frag.appendChild(doc.createTextNode(" ")); return; }
        const mask = doc.createElement("span");
        mask.className = "mo-split-mask";
        if (!interactive) mask.setAttribute("aria-hidden", "true");
        if (mode === "chars" && part.length <= 12) {
          Array.from(part).forEach(ch => {
            const s = doc.createElement("span");
            s.className = "mo-split-piece mo-split-char";
            s.textContent = ch;
            mask.appendChild(s);
          });
        } else {
          const s = doc.createElement("span");
          s.className = "mo-split-piece";
          s.textContent = part;
          mask.appendChild(s);
        }
        frag.appendChild(mask);
      });
      node.parentNode.replaceChild(frag, node);
    });
    if (!interactive) {
      if (/^H[1-6]$/.test(el.nodeName) || el.hasAttribute("role")) {
        if (!el.hasAttribute("aria-label")) el.setAttribute("aria-label", label);
      } else {
        const sr = doc.createElement("span");
        sr.className = "mo-sr";
        sr.textContent = label;
        el.insertBefore(sr, el.firstChild);
      }
    }
    el.setAttribute("data-split-done", mode);
  }

  /* Assign per-piece delays at reveal time, grouped by visual line. Returns the last piece's delay. */
  function lineDelays(el, base) {
    const masks = el.querySelectorAll(".mo-split-mask");
    if (!masks.length) return 0;
    const chars = el.getAttribute("data-split-done") === "chars";
    let last = 0;
    if (chars) {
      const pieces = el.querySelectorAll(".mo-split-piece");
      const step = pieces.length > 18 ? Math.max(14, 720 / pieces.length) : 40;
      pieces.forEach((p, i) => { const d = base + i * step; p.style.transitionDelay = d + "ms"; last = d; });
      return last - base;
    }
    let line = -1, top = -1e9, inLine = 0;
    masks.forEach(m => {
      const r = m.getBoundingClientRect();
      if (r.top > top + r.height * 0.5) { line++; top = r.top; inLine = 0; } else inLine++;
      const d = base + line * 95 + Math.min(inLine, 10) * 16;
      const p = m.firstElementChild;
      if (p) p.style.transitionDelay = d + "ms";
      last = Math.max(last, d);
    });
    return last - base;
  }

  /* ---------- count up ---------- */
  function countFmt(el) {
    const raw = el.getAttribute("data-count-to") || "0";
    const dec = (raw.split(".")[1] || "").length;
    const fmt = el.getAttribute("data-count-format");
    const pad = parseInt(el.getAttribute("data-count-pad"), 10) || 0;
    return v => {
      if (fmt === "rand" && AW.rand) return AW.rand(v);
      if (pad) return String(Math.round(v)).padStart(pad, "0");
      if (dec) return v.toFixed(dec);
      return Math.round(v).toLocaleString("en-ZA").replace(/[  ]/g, " ");
    };
  }
  function prepCount(el) {
    const to = parseFloat(el.getAttribute("data-count-to"));
    if (!isFinite(to)) return;
    el.setAttribute("data-mo-count", "");
    el.textContent = countFmt(el)(0);
  }
  function runCount(el) {
    const to = parseFloat(el.getAttribute("data-count-to"));
    if (!isFinite(to)) return;
    const f = countFmt(el);
    if (reduced) { el.textContent = f(to); return; }
    const dur = 1400, t0 = now();
    const step = t => {
      const p = clamp((t - t0) / dur, 0, 1);
      const e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      el.textContent = f(to * e);
      if (p >= 1) { removeTask(step); el.removeAttribute("data-mo-count"); }
    };
    addTask(step);
  }

  /* ---------- parallax ---------- */
  const px = new Map();
  let pIO = null, pVisible = 0, pLastY = -1, pDirty = true;
  function initParallax(el) {
    if (px.has(el)) return;
    let f = parseFloat(el.getAttribute("data-parallax"));
    if (!isFinite(f)) f = 0.12;
    px.set(el, { f: clamp(f, -0.3, 0.3), cur: 0, vis: false });
    if (!pIO && hasIO) pIO = new IntersectionObserver(safe(entries => {
      entries.forEach(en => { const s = px.get(en.target); if (s) s.vis = en.isIntersecting; });
      pVisible = 0; px.forEach(s => { if (s.vis) pVisible++; });
      pDirty = true;
      if (pVisible) addTask(parallaxTick);
    }, "parallax-io"), { rootMargin: "25% 0px 25% 0px" });
    if (pIO) pIO.observe(el);
  }
  function parallaxTick() {
    const y = window.scrollY;
    if (y === pLastY && !pDirty) return;
    pLastY = y; pDirty = false;
    const vh = window.innerHeight, narrow = window.innerWidth < 600;
    const writes = [];
    let moving = false, any = false;
    px.forEach((s, el) => {
      if (!el.isConnected) { px.delete(el); if (pIO) pIO.unobserve(el); return; }
      if (!s.vis) return;
      any = true;
      if (el.hasAttribute("data-reveal") && !el.classList.contains("mo-done")) return;
      let f = s.f;
      if (reduced || (narrow && Math.abs(f) > 0.15)) f = 0;
      const r = el.getBoundingClientRect();
      const target = (r.top + r.height / 2 - s.cur - vh / 2) * f;
      let next = s.cur + (target - s.cur) * 0.22;
      if (Math.abs(target - next) < 0.08) next = target; else moving = true;
      writes.push([el, s, next]);
    });
    writes.forEach(([el, s, v]) => { s.cur = v; el.style.translate = v ? "0 " + v.toFixed(2) + "px" : ""; });
    if (moving) pDirty = true;
    if (!any) removeTask(parallaxTick);
  }

  /* ---------- marquee ---------- */
  const marquees = new Map();
  let mqRO = null, mqIO = null;
  const STRIP = ["data-reveal", "data-parallax", "data-magnetic", "data-marquee", "data-count-to", "id"];
  function initMarquee(host) {
    if (marquees.has(host) || host.querySelector(":scope > .mo-marquee-track")) return;
    const s = { host, speed: parseFloat(host.getAttribute("data-marquee")) || 60, anim: null, width: 0, vis: true, hover: false, focus: false, rateTask: null };
    host.classList.add("mo-marquee");
    const track = doc.createElement("div");
    track.className = "mo-marquee-track";
    const group = doc.createElement("div");
    group.className = "mo-marquee-group";
    while (host.firstChild) group.appendChild(host.firstChild);
    track.appendChild(group);
    host.appendChild(track);
    s.track = track; s.group = group;
    marquees.set(host, s);
    host.addEventListener("pointerenter", e => { if (e.pointerType === "mouse") { s.hover = true; mqState(s); } }, { passive: true });
    host.addEventListener("pointerleave", () => { s.hover = false; mqState(s); }, { passive: true });
    host.addEventListener("focusin", () => { s.focus = true; mqState(s); });
    host.addEventListener("focusout", e => { if (!host.contains(e.relatedTarget)) { s.focus = false; mqState(s); } });
    if (!mqRO && "ResizeObserver" in window) mqRO = new ResizeObserver(safe(list => list.forEach(en => {
      const m = marquees.get(en.target); if (m && Math.abs(en.contentRect.width - m.width) > 1) buildMarquee(m);
    }), "marquee-ro"));
    if (mqRO) mqRO.observe(host);
    if (!mqIO && hasIO) mqIO = new IntersectionObserver(safe(list => list.forEach(en => {
      const m = marquees.get(en.target); if (m) { m.vis = en.isIntersecting; mqState(m); }
    }), "marquee-io"), { rootMargin: "100px 0px" });
    if (mqIO) mqIO.observe(host);
    buildMarquee(s);
  }
  function buildMarquee(s) {
    const { host, track, group } = s;
    let progress = 0;
    if (s.anim) { const t = s.anim.currentTime || 0, d = s.anim.effect.getTiming().duration || 1; progress = (t % d) / d; s.anim.cancel(); s.anim = null; }
    track.querySelectorAll(":scope > .mo-marquee-clone").forEach(c => c.remove());
    s.width = host.clientWidth;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    const gw = group.getBoundingClientRect().width;
    if (!gw) return;
    const dist = gw + gap;
    const copies = Math.max(1, Math.ceil(s.width / dist) + 1);
    for (let i = 0; i < copies; i++) {
      const c = group.cloneNode(true);
      c.classList.add("mo-marquee-clone");
      c.setAttribute("aria-hidden", "true");
      c.setAttribute("inert", "");
      c.querySelectorAll("*").forEach(n => STRIP.forEach(a => n.removeAttribute(a)));
      c.querySelectorAll("a,button,input,select,textarea,[tabindex]").forEach(n => n.setAttribute("tabindex", "-1"));
      track.appendChild(c);
    }
    if (reduced || !hasWAAPI) return;
    const rev = s.speed < 0;
    const from = rev ? -dist : 0, to = rev ? 0 : -dist;
    s.anim = track.animate(
      [{ transform: `translate3d(${from}px,0,0)` }, { transform: `translate3d(${to}px,0,0)` }],
      { duration: (dist / Math.abs(s.speed)) * 1000, iterations: Infinity, easing: "linear" }
    );
    s.anim.currentTime = progress * s.anim.effect.getTiming().duration;
    s.rate = 1;
    mqState(s, true);
  }
  function mqState(s, instant) {
    const a = s.anim;
    if (!a) return;
    if (!s.vis || doc.hidden || reduced) { a.pause(); return; }
    const target = s.hover || s.focus ? 0 : 1;
    if (a.playState !== "running") a.play();
    if (instant) { a.playbackRate = target; s.rate = target; return; }
    if (s.rateTask) removeTask(s.rateTask);
    s.rateTask = () => {
      s.rate += (target - s.rate) * 0.09;
      if (Math.abs(target - s.rate) < 0.01) { s.rate = target; removeTask(s.rateTask); s.rateTask = null; }
      a.playbackRate = s.rate;
    };
    addTask(s.rateTask);
  }

  /* ---------- magnetic ---------- */
  const mags = new WeakSet();
  function initMagnetic(el) {
    if (mags.has(el)) return;
    mags.add(el);
    const st = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, rect: null, task: null };
    const strength = () => { const v = parseFloat(el.getAttribute("data-magnetic")); return clamp(isFinite(v) ? v : 0.3, 0, 1); };
    const active = () => mqFine.matches && !reduced && !(el.hasAttribute("data-reveal") && !el.classList.contains("mo-done"));
    const ensure = () => {
      if (st.task) return;
      st.task = () => {
        st.vx = (st.vx + (st.tx - st.x) * 0.16) * 0.72;
        st.vy = (st.vy + (st.ty - st.y) * 0.16) * 0.72;
        st.x += st.vx; st.y += st.vy;
        const settled = Math.abs(st.tx - st.x) < 0.05 && Math.abs(st.ty - st.y) < 0.05 && Math.abs(st.vx) < 0.05 && Math.abs(st.vy) < 0.05;
        if (settled) { st.x = st.tx; st.y = st.ty; }
        el.style.translate = st.x || st.y ? `${st.x.toFixed(2)}px ${st.y.toFixed(2)}px` : "";
        if (settled) { removeTask(st.task); st.task = null; }
      };
      addTask(st.task);
    };
    el.addEventListener("pointerenter", e => { if (e.pointerType !== "mouse" || !active()) return; st.rect = el.getBoundingClientRect(); }, { passive: true });
    el.addEventListener("pointermove", e => {
      if (e.pointerType !== "mouse" || !active()) return;
      const r = st.rect || (st.rect = el.getBoundingClientRect());
      const nx = clamp((e.clientX - (r.left + r.width / 2)) / (r.width / 2 || 1), -1, 1);
      const ny = clamp((e.clientY - (r.top + r.height / 2)) / (r.height / 2 || 1), -1, 1);
      const max = Math.min(16, 12 * (strength() / 0.3));
      st.tx = nx * max; st.ty = ny * max * 0.6;
      ensure();
    }, { passive: true });
    el.addEventListener("pointerleave", () => { st.rect = null; st.tx = 0; st.ty = 0; if (st.x || st.y) ensure(); }, { passive: true });
  }

  /* ---------- custom cursor (fine pointers only, never hides the native cursor) ---------- */
  let cursor = null, cLabel = null;
  const cur = { x: -100, y: -100, tx: -100, ty: -100, on: false, task: null, lx: -1, ly: -1 };
  function cursorTarget(node) {
    if (!node || !node.closest) return null;
    if (node.closest("input,textarea,select,[contenteditable]")) return null;
    const t = node.closest("[data-cursor], .card-media");
    if (!t) return null;
    const label = t.getAttribute("data-cursor");
    if (label === "none" || label === "") return label === "" ? "View" : null;
    return label || "View";
  }
  function setCursor(label) {
    if (!cursor) return;
    if (label) { if (cLabel.textContent !== label) cLabel.textContent = label; cursor.classList.add("is-on"); cur.on = true; }
    else { cursor.classList.remove("is-on"); cur.on = false; }
  }
  function initCursor() {
    if (cursor || !mqFine.matches || reduced || !cssOk) return;
    cursor = doc.createElement("div");
    cursor.className = "mo-cursor";
    cursor.setAttribute("aria-hidden", "true");
    cLabel = doc.createElement("span");
    cLabel.className = "mo-cursor-label";
    cursor.appendChild(cLabel);
    doc.body.appendChild(cursor);
    cur.task = () => {
      cur.x += (cur.tx - cur.x) * 0.2; cur.y += (cur.ty - cur.y) * 0.2;
      cursor.style.transform = `translate3d(${cur.x.toFixed(1)}px,${cur.y.toFixed(1)}px,0)`;
      if (Math.abs(cur.tx - cur.x) < 0.1 && Math.abs(cur.ty - cur.y) < 0.1) removeTask(cur.task);
    };
    doc.addEventListener("pointermove", e => {
      if (e.pointerType !== "mouse" || reduced) return;
      cur.tx = e.clientX; cur.ty = e.clientY; cur.lx = e.clientX; cur.ly = e.clientY;
      if (!cur.on) { cur.x = cur.tx; cur.y = cur.ty; }
      setCursor(cursorTarget(e.target));
      addTask(cur.task);
    }, { passive: true });
    doc.addEventListener("pointerdown", () => cursor.classList.add("is-down"), { passive: true });
    doc.addEventListener("pointerup", () => cursor.classList.remove("is-down"), { passive: true });
    doc.documentElement.addEventListener("pointerleave", () => setCursor(null), { passive: true });
    let pending = false;
    window.addEventListener("scroll", () => {
      if (pending || cur.lx < 0) return;
      pending = true;
      raf(() => { pending = false; setCursor(cursorTarget(doc.elementFromPoint(cur.lx, cur.ly))); });
    }, { passive: true });
  }
  function destroyCursor() { if (cursor) { cursor.remove(); cursor = null; removeTask(cur.task); } }

  /* ---------- scanning + mutation observer ---------- */
  function each(rootEl, sel, fn) {
    if (rootEl.nodeType === 1 && rootEl.matches(sel)) fn(rootEl);
    if (rootEl.querySelectorAll) rootEl.querySelectorAll(sel).forEach(fn);
  }
  function scan(rootEl) {
    if (!rootEl || (rootEl.nodeType !== 1 && rootEl.nodeType !== 9)) return;
    if (rootEl.nodeType === 1 && (rootEl.classList.contains("mo-marquee-clone") || rootEl.closest(".mo-marquee-clone"))) return;
    each(rootEl, "[data-reveal]", safe(prepReveal, "reveal"));
    each(rootEl, "[data-count-to]:not([data-reveal])", safe(el => {
      if (seen.has(el)) return;
      seen.add(el);
      if (reduced || !enabled || !io) return;
      prepCount(el); io.observe(el);
    }, "count"));
    each(rootEl, "[data-parallax]", safe(initParallax, "parallax"));
    each(rootEl, "[data-marquee]", safe(initMarquee, "marquee"));
    each(rootEl, "[data-magnetic]", safe(initMagnetic, "magnetic"));
  }
  let pendingNodes = new Set(), scanQueued = false;
  function queueScan(node) {
    pendingNodes.add(node);
    if (scanQueued) return;
    scanQueued = true;
    raf(safe(() => {
      scanQueued = false;
      const list = [...pendingNodes];
      pendingNodes = new Set();
      list.forEach(n => { if (n.isConnected && !(list.some(o => o !== n && o.contains(n)))) scan(n); });
    }, "scan"));
  }
  function observeRoots() {
    if (!("MutationObserver" in window)) return;
    const mo = new MutationObserver(safe(records => {
      records.forEach(r => r.addedNodes.forEach(n => {
        if (n.nodeType !== 1) return;
        const c = n.classList;
        if (c && (c.contains("mo-split-mask") || c.contains("mo-sr") || c.contains("mo-marquee-clone") || c.contains("mo-marquee-track"))) return;
        queueScan(n);
      }));
    }, "mutation"));
    const roots = ["app", "nav-root", "footer-root", "cart-root", "overlay-root"].map(id => doc.getElementById(id)).filter(Boolean);
    (roots.length ? roots : [doc.body]).forEach(r => mo.observe(r, { childList: true, subtree: true }));
  }

  /* ---------- Lenis + ScrollTrigger ---------- */
  let lenis = null, stopCount = 0;
  function isScrollable(node) {
    if (node === doc.body) return false;
    const v = node.scrollHeight > node.clientHeight + 1, h = node.scrollWidth > node.clientWidth + 1;
    if (!v && !h) return false;
    const cs = getComputedStyle(node);
    return (v && /(auto|scroll)/.test(cs.overflowY)) || (h && /(auto|scroll)/.test(cs.overflowX));
  }
  function preventLenis(node) {
    try {
      if (node.hasAttribute("aria-modal") || node.getAttribute("role") === "dialog") return true;
      return isScrollable(node);
    } catch (_) { return false; }
  }
  const lenisTask = t => { if (lenis) lenis.raf(t); };
  function initLenis() {
    if (lenis || !LenisLib || reduced || !mqFine.matches) return;
    try {
      lenis = new LenisLib({ lerp: 0.1, smoothWheel: true, syncTouch: false, wheelMultiplier: 1, prevent: preventLenis });
    } catch (e) { warn("lenis", e); lenis = null; return; }
    M.lenis = lenis;
    if (ST) lenis.on("scroll", ST.update);
    lenis.on("scroll", () => { pDirty = true; });
    if (stopCount > 0) lenis.stop();
    addTask(lenisTask);
  }
  function destroyLenis() {
    if (!lenis) return;
    removeTask(lenisTask);
    try { lenis.destroy(); } catch (_) {}
    lenis = null; M.lenis = null;
  }
  function stopScroll() { stopCount++; if (lenis) lenis.stop(); }
  function startScroll() { stopCount = Math.max(0, stopCount - 1); if (!stopCount && lenis) lenis.start(); }
  function scrollTo(target, opts) {
    opts = opts || {};
    const immediate = reduced || !!opts.immediate;
    if (lenis) return lenis.scrollTo(target, Object.assign({}, opts, { immediate, force: opts.force !== false }));
    let y = null;
    if (typeof target === "number") y = target;
    else {
      const el = typeof target === "string" ? doc.querySelector(target) : target;
      if (el && el.getBoundingClientRect) y = el.getBoundingClientRect().top + window.scrollY;
    }
    if (y == null) return;
    window.scrollTo({ top: Math.max(0, y + (opts.offset || 0)), behavior: immediate ? "auto" : "smooth" });
  }
  let stTimer = 0;
  function stRefresh(delay) {
    if (!ST) return;
    clearTimeout(stTimer);
    stTimer = setTimeout(() => raf(() => { try { ST.refresh(); } catch (e) { warn("ST.refresh", e); } }), delay == null ? 160 : delay);
  }

  /* ---------- glyph ---------- */
  function lipsSVG(cls) {
    return `<svg class="${cls}" viewBox="0 0 64 40" aria-hidden="true" focusable="false"><path fill="currentColor" d="M1 19.5C7 11 14 4.5 21 4.5c4.2 0 7.4 2.6 11 5.3 3.6-2.7 6.8-5.3 11-5.3 7 0 14 6.5 20 15-7.8 1.6-14.4 1.2-20.4.4-4.2-.6-7.3-1.4-10.6-1.4s-6.4.8-10.6 1.4C15.4 20.7 8.8 21.1 1 19.5Z"/><path fill="currentColor" d="M1.5 21.6c7.4 1.5 14 1.7 20.4.9 3.9-.5 7-1.1 10.1-1.1s6.2.6 10.1 1.1c6.4.8 13 .6 20.4-.9C57 31.4 45.6 36.5 32 36.5S7 31.4 1.5 21.6Z"/></svg>`;
  }

  /* ---------- page curtain ---------- */
  let curtain = null, covering = false, navigating = false, routeGuard = 0, firstRoute = true;
  function buildCurtain() {
    if (curtain || !cssOk) return;
    curtain = doc.createElement("div");
    curtain.className = "mo-curtain";
    curtain.setAttribute("aria-hidden", "true");
    curtain.innerHTML = `<div class="mo-curtain-mark">${lipsSVG("mo-curtain-lips")}<span class="mo-curtain-line">Time of your life.</span></div>`;
    doc.body.appendChild(curtain);
  }
  const normHash = h => (!h || h === "#" ? "#/" : h);
  function onLinkClick(e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest && e.target.closest('a[href^="#/"]');
    if (!a || a.hasAttribute("data-no-curtain") || a.hasAttribute("download") || (a.target && a.target !== "_self")) return;
    const href = a.getAttribute("href");
    if (normHash(href) === normHash(location.hash)) return;
    if (reduced || !curtain || !hasWAAPI || !enabled) return;
    e.preventDefault();
    if (navigating) return;
    navigating = true;
    covering = true;
    curtain.classList.add("is-active");
    const mark = curtain.firstElementChild;
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      clearTimeout(routeGuard);
      routeGuard = setTimeout(() => { if (covering) uncover(); }, 1500); // never leave the curtain down
      location.hash = href;
    };
    const anim = curtain.animate([{ transform: "translate3d(0,100%,0)" }, { transform: "translate3d(0,0,0)" }], { duration: DUR[2], easing: EASE.in, fill: "forwards" });
    mark.animate([{ opacity: 0, transform: "translate3d(0,24px,0) scale(.86)" }, { opacity: 1, transform: "none" }], { duration: DUR[2] + 60, easing: EASE.out, fill: "both" });
    anim.onfinish = go;
    setTimeout(go, DUR[2] + 40);
  }
  function uncover() {
    if (!curtain) return;
    covering = false;
    navigating = false;
    clearTimeout(routeGuard);
    const mark = curtain.firstElementChild;
    curtain.getAnimations().forEach(a => a.cancel());
    mark.getAnimations().forEach(a => a.cancel());
    const anim = curtain.animate([{ transform: "translate3d(0,0,0)" }, { transform: "translate3d(0,-100%,0)" }], { duration: DUR[3], easing: EASE.out, fill: "forwards" });
    mark.animate([{ transform: "none", opacity: 1 }, { transform: "translate3d(0,-60px,0)", opacity: 0 }], { duration: DUR[3] * 0.8, easing: EASE.out, fill: "forwards" });
    const end = () => { curtain.classList.remove("is-active"); curtain.getAnimations().forEach(a => a.cancel()); mark.getAnimations().forEach(a => a.cancel()); };
    anim.onfinish = end;
    setTimeout(end, DUR[3] + 120);
  }
  function enterApp() {
    const app = AW.app || doc.getElementById("app");
    if (!app || !hasWAAPI || reduced) return null;
    return app.animate([{ opacity: 0, transform: "translate3d(0,16px,0)" }, { opacity: 1, transform: "none" }], { duration: DUR[3], easing: EASE.out });
  }
  function onRoute() {
    if (lenis) { try { lenis.scrollTo(0, { immediate: true, force: true }); } catch (_) {} }
    const wasFirst = firstRoute;
    firstRoute = false;
    let enter = null;
    if (!wasFirst && enabled) {
      enter = enterApp();
      if (covering) uncover();
      const app = AW.app || doc.getElementById("app");
      if (app && app.focus) { try { app.focus({ preventScroll: true }); } catch (_) {} }
    }
    // prune observers holding detached nodes
    px.forEach((s, el) => { if (!el.isConnected) { px.delete(el); if (pIO) pIO.unobserve(el); } });
    marquees.forEach((s, host) => { if (!host.isConnected) { if (s.anim) s.anim.cancel(); marquees.delete(host); if (mqRO) mqRO.unobserve(host); if (mqIO) mqIO.unobserve(host); } });
    pDirty = true;
    if (ST) {
      raf(() => { try { ST.refresh(); } catch (e) { warn("ST.refresh", e); } });
      if (enter) enter.onfinish = () => stRefresh(0);
    }
  }

  /* ---------- first-visit intro ---------- */
  function isHome() { const h = location.hash; return !h || h === "#" || h === "#/"; }
  function maybeIntro() {
    let seenIntro = true;
    try { seenIntro = sessionStorage.getItem("aw-intro") === "1"; if (!seenIntro) sessionStorage.setItem("aw-intro", "1"); } catch (_) { seenIntro = true; }
    if (seenIntro || reduced || !isHome() || !hasWAAPI || !cssOk) { readyResolve(); return; }
    M.intro = true;
    holdReveals();
    const el = doc.createElement("div");
    el.className = "mo-intro";
    el.setAttribute("aria-hidden", "true");
    const chars = "AWEZA".split("").map(c => `<span class="mo-intro-ch">${c}</span>`).join("");
    el.innerHTML =
      `<span class="mo-intro-meta">Drop 01 / 2026</span>` +
      `<div class="mo-intro-inner">` +
        `<div class="mo-intro-lipswrap">${lipsSVG("mo-intro-lips")}</div>` +
        `<div class="mo-intro-word"><span class="mo-intro-mask">${chars}<sup class="mo-intro-ch mo-intro-tm">™</sup></span></div>` +
        `<p class="mo-intro-line">Time of your life.</p>` +
      `</div>` +
      `<span class="mo-intro-skip">Tap to skip</span>` +
      `<span class="mo-intro-bar"></span>`;
    doc.body.appendChild(el);
    const $ = s => el.querySelector(s);
    const anims = [];
    const A = (node, k, o) => { if (node) anims.push(node.animate(k, Object.assign({ fill: "both" }, o))); };
    el.querySelectorAll(".mo-intro-ch").forEach((c, i) => A(c, [{ transform: "translate3d(0,110%,0)" }, { transform: "none" }], { duration: 640, delay: 60 + i * 40, easing: EASE.out }));
    A($(".mo-intro-lipswrap"), [{ transform: "scale(0) rotate(-14deg)", opacity: 0 }, { transform: "scale(1) rotate(0deg)", opacity: 1 }], { duration: 520, delay: 380, easing: EASE.spring });
    A($(".mo-intro-line"), [{ opacity: 0, transform: "translate3d(0,10px,0)" }, { opacity: 1, transform: "none" }], { duration: 420, delay: 560, easing: EASE.out });
    A($(".mo-intro-meta"), [{ opacity: 0 }, { opacity: 1 }], { duration: 400, delay: 200, easing: EASE.out });
    A($(".mo-intro-skip"), [{ opacity: 0 }, { opacity: 1 }], { duration: 400, delay: 300, easing: EASE.out });
    A($(".mo-intro-bar"), [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { duration: 940, delay: 0, easing: EASE.inOut });
    let leaving = false;
    const finish = () => {
      if (!el.isConnected) return;
      el.remove();
      M.intro = false;
      readyResolve();
      if (AW.emit) { try { AW.emit("motion:intro-done"); } catch (_) {} }
      removeSkip();
    };
    const leave = fast => {
      if (leaving) return;
      leaving = true;
      clearTimeout(autoT);
      releaseReveals();
      const d = fast ? 380 : 460;
      const out = el.animate([{ transform: "translate3d(0,0,0)" }, { transform: "translate3d(0,-100%,0)" }], { duration: d, easing: EASE.inOut, fill: "forwards" });
      const inner = $(".mo-intro-inner");
      if (inner) inner.animate([{ transform: "none" }, { transform: "translate3d(0,-22vh,0)" }], { duration: d, easing: EASE.inOut, fill: "forwards" });
      out.onfinish = finish;
      setTimeout(finish, d + 200);
    };
    const skip = () => leave(true);
    const evs = ["keydown", "pointerdown", "wheel", "touchstart"];
    const removeSkip = () => evs.forEach(n => window.removeEventListener(n, skip, true));
    evs.forEach(n => window.addEventListener(n, skip, { capture: true, passive: true }));
    const autoT = setTimeout(() => leave(false), 940);
    setTimeout(() => { if (el.isConnected) { if (!leaving) releaseReveals(); finish(); } }, 2400); // hard guard
  }

  /* ---------- fly to bag ---------- */
  function flyToBag(fromEl) {
    if (reduced || !fromEl || !hasWAAPI || !cssOk) return Promise.resolve();
    let src = fromEl;
    if (src.nodeName !== "IMG") {
      const imgs = [...src.querySelectorAll("img")];
      src = imgs.find(i => i.offsetWidth && getComputedStyle(i).opacity !== "0") || imgs[0] || src;
    }
    const targets = [...doc.querySelectorAll("[data-bag-target]")];
    const target = targets.find(t => t.getClientRects().length) || null;
    if (!target) return Promise.resolve();
    const r = src.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    if (!r.width || !r.height || r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) return Promise.resolve();
    const tr = target.getBoundingClientRect();
    const size = Math.min(r.width, r.height, 420);
    const x0 = r.left + r.width / 2, y0 = r.top + r.height / 2;
    const x1 = clamp(tr.left + tr.width / 2, 12, vw - 12), y1 = clamp(tr.top + tr.height / 2, 12, vh - 12);
    const cx = x0 + (x1 - x0) * 0.35, cy = Math.min(y0, y1) - Math.max(80, Math.abs(y0 - y1) * 0.35);
    const ghost = doc.createElement("div");
    ghost.className = "mo-fly";
    ghost.setAttribute("aria-hidden", "true");
    ghost.style.cssText = `width:${size}px;height:${size}px;left:${x0 - size / 2}px;top:${y0 - size / 2}px;`;
    if (src.nodeName === "IMG") {
      const img = doc.createElement("img");
      img.src = src.currentSrc || src.src;
      img.alt = "";
      img.decoding = "async";
      img.style.objectFit = getComputedStyle(src).objectFit || "cover";
      ghost.appendChild(img);
    }
    doc.body.appendChild(ghost);
    const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2); // in-out cubic, matches --ease-in-out
    const frames = [];
    const N = 18;
    for (let i = 0; i <= N; i++) {
      const t = ease(i / N), u = 1 - t;
      const x = u * u * x0 + 2 * u * t * cx + t * t * x1;
      const y = u * u * y0 + 2 * u * t * cy + t * t * y1;
      const s = 1 + (0.15 - 1) * t;
      const o = t < 0.6 ? 1 : 1 - ((t - 0.6) / 0.4) * 0.8;
      frames.push({ offset: i / N, transform: `translate3d(${(x - x0).toFixed(1)}px,${(y - y0).toFixed(1)}px,0) scale(${s.toFixed(3)}) rotate(${(-14 * t).toFixed(2)}deg)`, opacity: o });
    }
    return new Promise(resolve => {
      let done = false;
      const end = () => {
        if (done) return;
        done = true;
        ghost.remove();
        try { target.animate([{ scale: "1" }, { scale: ".86" }, { scale: "1" }], { duration: 300, easing: EASE.out }); } catch (_) {}
        resolve();
      };
      const a = ghost.animate(frames, { duration: 480, easing: "linear", fill: "forwards" });
      a.onfinish = end;
      setTimeout(end, 700);
    });
  }

  /* ---------- mode switching (reduced motion can change live) ---------- */
  function revealAll() {
    doc.querySelectorAll("[data-reveal]").forEach(el => { el.classList.add("is-in", "mo-done"); });
    doc.querySelectorAll("[data-mo-count]").forEach(el => { el.textContent = countFmt(el)(parseFloat(el.getAttribute("data-count-to")) || 0); el.removeAttribute("data-mo-count"); });
  }
  function applyMode() {
    reduced = !!mqReduce.matches;
    html.classList.toggle("mo-reduced", reduced);
    if (reduced) {
      html.classList.remove("mo-ready");
      enabled = false;
      revealAll();
      destroyLenis();
      destroyCursor();
      px.forEach((s, el) => { s.cur = 0; el.style.translate = ""; });
      marquees.forEach(s => { if (s.anim) { s.anim.cancel(); s.anim = null; } });
    } else {
      enabled = cssOk && hasIO;
      html.classList.toggle("mo-ready", enabled);
      revealObserver();
      initLenis();
      initCursor();
      marquees.forEach(s => buildMarquee(s));
      pDirty = true;
      px.forEach(s => { if (s.vis) addTask(parallaxTick); });
    }
  }

  /* ---------- boot ---------- */
  try {
    cssOk = (getComputedStyle(html).getPropertyValue("--mo-css") || "").trim() === "1";
    if (G && ST && G.registerPlugin) { G.registerPlugin(ST); try { ST.config({ ignoreMobileResize: true }); } catch (_) {} }
    if (G && G.ticker && G.ticker.lagSmoothing) G.ticker.lagSmoothing(0);
    html.classList.toggle("mo-reduced", reduced);
    enabled = !reduced && cssOk && hasIO;
    if (enabled) { html.classList.add("mo-ready"); revealObserver(); }
    if (!reduced) initLenis();
    const onModeChange = safe(applyMode, "mode");
    if (mqReduce.addEventListener) mqReduce.addEventListener("change", onModeChange);
    else if (mqReduce.addListener) mqReduce.addListener(onModeChange);
    const onFine = safe(() => { if (mqFine.matches) { initLenis(); initCursor(); } else { destroyLenis(); destroyCursor(); } }, "pointer");
    if (mqFine.addEventListener) mqFine.addEventListener("change", onFine);

    const bootDom = safe(() => {
      buildCurtain();
      initCursor();
      observeRoots();
      scan(doc);
      maybeIntro();
      setInterval(safe(safetyNet, "safety"), 1000);
    }, "boot");
    if (doc.body) bootDom(); else doc.addEventListener("DOMContentLoaded", bootDom);

    doc.addEventListener("click", safe(onLinkClick, "curtain"));
    doc.addEventListener("visibilitychange", safe(() => marquees.forEach(s => mqState(s, true)), "visibility"));
    if (AW.on) AW.on("route", safe(onRoute, "route"));
    else window.addEventListener("hashchange", safe(onRoute, "route"));
    // ScrollTrigger housekeeping: image loads in #app (capture: load does not bubble), fonts, resize.
    const app = doc.getElementById("app");
    if (app && ST) app.addEventListener("load", e => { if (e.target && e.target.nodeName === "IMG") stRefresh(); }, true);
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(safe(() => { marquees.forEach(s => buildMarquee(s)); stRefresh(0); pDirty = true; }, "fonts"));
    window.addEventListener("resize", () => { pDirty = true; }, { passive: true });
    window.addEventListener("scroll", () => { pDirty = true; }, { passive: true });
    window.addEventListener("load", () => stRefresh(0));
  } catch (e) {
    warn("disabled", e);
    html.classList.remove("mo-ready");
    html.classList.add("mo-failed");
    readyResolve();
  }
})();
