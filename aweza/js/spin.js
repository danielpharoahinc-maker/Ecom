/* AWEZA home extras under the rail (after rail.js and rail3d.js):
   1. a bold sliding-type band (Diesel Bad Guide style): huge words slide sideways as you scroll;
   2. the scroll-spin shirt (Ribant style): a pinned 3D tee turns front to back as you scroll, one tee after another.
   Both are decoration only. The rail and checkout never depend on them. Without WebGL or with reduced motion the
   shirt becomes a still block of text and the band stops sliding. */
(() => {
  const AW = window.AW, T = window.THREE;
  if (!AW) return;
  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SPIN_IDS = ["signature-lips", "ceo-of-bad-decisions", "zero-exes"];
  const LINES = { "signature-lips": "The front is <em>polite.</em>", "ceo-of-bad-decisions": "The back says what you <em>meant.</em>", "zero-exes": "Walk away. The joke <em>lands.</em>" };
  const FRONT = ["Front.", "Polite.", "Front."], BACK = ["Back.", "Loud.", "Back."];
  let cleanup = [];

  const bandHTML = () => {
    const a = ["Bad decisions club", "No filter", "Say it with your back", "Time of your life"];
    const row = (items, hot) => items.map((t, i) => `<span class="${hot === i ? "sb-hot" : ""}">${t}</span><i>✱</i>`).join("");
    return `<section class="sb" aria-label="AWEZA: bad decisions club, no filter, say it with your back">
      <div class="sb-row" data-dir="-1" aria-hidden="true">${row(a, 0)}${row(a, 0)}</div>
      <div class="sb-row sb-row--outline" data-dir="1" aria-hidden="true">${row(a.slice().reverse(), 1)}${row(a.slice().reverse(), 1)}</div>
    </section>`;
  };

  function mountBand(root) {
    const rows = [...root.querySelectorAll(".sb-row")];
    if (!rows.length || reduced()) return;
    let raf = 0, visible = false;
    const upd = () => {
      raf = 0;
      const r = root.getBoundingClientRect(), vh = innerHeight;
      const p = (vh - r.top) / (vh + r.height);                 // 0 as it enters, 1 as it leaves
      rows.forEach(row => {
        const dir = Number(row.dataset.dir) || 1, half = row.scrollWidth / 2, travel = Math.min(half, innerWidth * 1.2);
        const x = (dir < 0 ? -p : p - 1) * travel;
        row.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;
      });
    };
    const req = () => { if (!raf && visible) raf = requestAnimationFrame(upd); };
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) req(); }, { rootMargin: "100px" });
    io.observe(root);
    addEventListener("scroll", req, { passive: true }); addEventListener("resize", req);
    cleanup.push(() => { io.disconnect(); removeEventListener("scroll", req); removeEventListener("resize", req); cancelAnimationFrame(raf); });
    upd();
  }

  function spinHTML() {
    const dots = SPIN_IDS.map(() => "<span></span>").join("");
    return `<section class="sp" aria-label="Turn the shirt: front and back">
      <div class="sp-pin">
        <canvas class="sp-canvas" aria-hidden="true"></canvas>
        <p class="sp-hint" aria-hidden="true">Keep scrolling</p>
        <div class="sp-copy">
          <p class="sp-kicker">Say it with your back</p>
          <h2 class="sp-line"></h2>
          <p class="sp-name"></p>
          <a class="sp-cta" href="#/">See the tee</a>
        </div>
        <div class="sp-side" aria-hidden="true">${dots}</div>
      </div>
    </section>`;
  }

  function mountSpin(root) {
    const pin = root.querySelector(".sp-pin"), canvas = root.querySelector(".sp-canvas");
    const line = root.querySelector(".sp-line"), nameEl = root.querySelector(".sp-name"), cta = root.querySelector(".sp-cta");
    const dots = [...root.querySelectorAll(".sp-side span")];
    const list = SPIN_IDS.map(id => AW.byId(id)).filter(Boolean);
    const setCopy = i => {
      const p = list[i]; if (!p) return;
      line.innerHTML = LINES[p.id] || "";
      nameEl.textContent = `${p.name} · ${AW.rand(p.price)}`;
      cta.setAttribute("href", "#/product/" + p.id);
      dots.forEach((d, k) => d.classList.toggle("is-on", k === i));
    };
    setCopy(0);
    const R = AW.rail3d;
    const still = () => { root.classList.add("sp--static"); };
    if (!T || !R || !R.loadModel || reduced() || !list.length) return still();
    let renderer;
    try { renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" }); } catch { return still(); }
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.outputEncoding = T.sRGBEncoding; renderer.setClearColor(0xffffff, 0);
    const scene = new T.Scene(), camera = new T.PerspectiveCamera(26, 1, 0.1, 100);
    camera.position.set(0, 0, 10);
    scene.add(new T.HemisphereLight(0xffffff, 0x8ea6c0, 0.75));
    const key = new T.DirectionalLight(0xffffff, 0.95); key.position.set(-3, 4, 4); scene.add(key);
    const rim = new T.DirectionalLight(0xffffff, 0.45); rim.position.set(2, 2, -5); scene.add(rim);
    const fill = new T.DirectionalLight(0xffffff, 0.25); fill.position.set(4, -1, 3); scene.add(fill);

    const tees = list.map(p => {
      const g = new T.Group();
      const mat = () => new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0, side: T.DoubleSide });
      const f = new T.Mesh(undefined, mat()), b = new T.Mesh(undefined, mat());
      f.visible = b.visible = false; g.add(f); g.add(b); g.visible = false; scene.add(g);
      return { id: p.id, g, f, b };
    });
    let ready = false, raf = 0, visible = false, disposed = false, lastIdx = -1;
    R.loadModel().then(([gf, gb]) => {
      if (disposed) return;
      return Promise.all(tees.map(t => {
        t.f.geometry = gf; t.b.geometry = gb;
        return Promise.all([R.loadTex(R.TEX + t.id + "-front.jpg", renderer), R.loadTex(R.TEX + t.id + "-back.jpg", renderer)]).then(([tf, tb]) => {
          if (disposed) return;
          t.f.material.map = tf; t.b.material.map = tb; t.f.material.needsUpdate = t.b.material.needsUpdate = true; t.f.visible = t.b.visible = true;
        });
      })).then(() => { ready = true; req(); });
    }).catch(still);

    const resize = () => {
      const r = pin.getBoundingClientRect(), W = Math.max(1, r.width), H = Math.max(1, r.height);
      renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix();
    };
    const ease = x => x * x * (3 - 2 * x);
    const draw = () => {
      raf = 0;
      if (!ready || disposed) return;
      const r = root.getBoundingClientRect(), total = Math.max(1, r.height - innerHeight);
      const p = Math.min(0.9999, Math.max(0, -r.top / total)), n = tees.length, x = p * n, idx = Math.min(n - 1, Math.floor(x)), local = x - idx;
      const turn = ease(Math.min(1, Math.max(0, (local - 0.08) / 0.84)));           // hold at the front, turn, hold at the back
      const edge = Math.min(1, local / 0.1, (1 - local) / 0.1), pop = ease(Math.max(0, edge));   // shrink away between shirts
      const H = innerHeight, narrow = innerWidth < 700;
      const scale = (narrow ? 1.85 : 2.45) * (0.55 + 0.45 * pop);
      tees.forEach((t, i) => {
        t.g.visible = i === idx;
        if (i !== idx) return;
        t.g.scale.setScalar(scale);
        t.g.position.set(narrow ? 0 : 0.9, HOOK / 2 * scale - 0.05 + (narrow ? 0.55 : 0), 0);
        t.g.rotation.set(0, turn * Math.PI + (1 - turn) * 0.0 + Math.sin(performance.now() / 1400) * 0.015, Math.sin(local * 6.28) * 0.02);
        t.g.rotation.x = 0;
      });
      if (idx !== lastIdx) { lastIdx = idx; setCopy(idx); }
      root.querySelector(".sp-hint").textContent = turn < 0.5 ? "Keep scrolling" : "Now the back";
      renderer.render(scene, camera);
    };
    const HOOK = 1.535;
    const req = () => { if (!raf && visible && ready) raf = requestAnimationFrame(draw); };
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; req(); }, { rootMargin: "50px" });
    io.observe(root);
    const ro = new ResizeObserver(() => { resize(); req(); }); ro.observe(pin); resize();
    addEventListener("scroll", req, { passive: true });
    cleanup.push(() => {
      disposed = true; cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); removeEventListener("scroll", req);
      scene.traverse(o => { if (o.geometry && o.geometry !== undefined) { /* shared geometry: owned by rail3d */ } if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } });
      renderer.dispose();
    });
  }

  function mount({ stage }) {
    cleanup.forEach(fn => { try { fn(); } catch (e) { /* ignore */ } }); cleanup = [];
    const app = stage && stage.closest("#app");
    const pick = app && app.querySelector(".pick");
    if (!pick) return;
    try {
      pick.insertAdjacentHTML("afterend", bandHTML() + spinHTML());
      mountBand(app.querySelector(".sb"));
      mountSpin(app.querySelector(".sp"));
    } catch (e) { /* the rail still works without the extras */ }
  }
  AW.on("rail:mount", mount);
  AW.on("route", ({ page }) => { if (page !== "" && page !== "shop" && page !== "product") { cleanup.forEach(fn => { try { fn(); } catch (e) { /* ignore */ } }); cleanup = []; } });
})();
