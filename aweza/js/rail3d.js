/* AWEZA rail in 3D (Three.js). Upgrades the rail from js/rail.js when WebGL is available:
   every shirt becomes a soft 3D tee on a wooden hanger, hanging from a metal rail, with the real
   print artwork on its front and back. rail.js still owns the interaction and the layout maths;
   it publishes positions on "rail:layout" and this file eases the 3D shirts toward them.
   Without WebGL (or if anything fails) the photo rail stays as it is. */
(() => {
  const AW = window.AW;
  const T = window.THREE;
  AW.rail3d = { active: false };
  if (!T) return;

  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canWebGL = (() => { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; } })();
  if (!canWebGL) return;

  /* Print placement in shirt units (shirt spans x -0.95..0.95, y -0.70..0.66; chest is around y 0.3).
     w = print width, h = max print height, x/y = print centre. */
  const P = "images/prints/";
  const PRINTS = {
    "signature-lips":       { front: [{ src: "logo-italic-serif-black", x: -0.17, y: 0.30, w: 0.21 }], back: [{ src: "lips-logo", x: 0, y: 0.12, w: 0.62 }] },
    "ceo-of-bad-decisions": { front: [{ src: "logo-serif-black", x: -0.16, y: 0.30, w: 0.19 }],        back: [{ src: "ceo-print", x: 0, y: 0.06, w: 0.62 }] },
    "zero-exes":            { front: [{ src: "logo-bold-red", x: -0.16, y: 0.30, w: 0.16 }],           back: [{ src: "zero-exes-print", x: 0, y: 0.10, w: 0.68 }] },
    "sweet-cupcake":        { front: [{ src: "logo-bold-red", x: -0.15, y: 0.30, w: 0.22 }],           back: [{ src: "sweet-cupcake-print", x: 0, y: 0.03, w: 0.6, h: 0.78 }] },
    // Captain Save: its chest shield closely copies a famous superhero emblem, so it is not recreated in 3D.
    // The real product photos under the rail still show the actual print.
    "captain-save":         { front: [],                                                                back: [{ src: "logo-tagline-black", x: 0, y: 0.47, w: 0.2 }] },
    "need-a-hug":           { front: [{ src: "need-a-hug-print", x: 0, y: 0.19, w: 0.72 }],            back: [{ src: "logo-serif-black", x: 0, y: 0.48, w: 0.15 }] },
    "mini-lips":            { front: [{ src: "lips-logo", x: 0, y: -0.07, w: 0.12 }],                  back: [] },
  };

  /* ---------- the tee silhouette ---------- */
  const X0 = -0.95, X1 = 0.95, Y0 = -0.70, Y1 = 0.66; // texture area in shirt units
  function teePath(ctx, toX, toY) {
    const m = (x, y) => ctx.moveTo(toX(x), toY(y)), l = (x, y) => ctx.lineTo(toX(x), toY(y));
    const q = (cx, cy, x, y) => ctx.quadraticCurveTo(toX(cx), toY(cy), toX(x), toY(y));
    ctx.beginPath();
    m(-0.17, 0.62);
    q(0, 0.47, 0.17, 0.62);          // neckline
    q(0.30, 0.60, 0.42, 0.56);       // shoulder
    l(0.92, 0.30);                   // top of sleeve
    q(0.86, 0.17, 0.75, 0.06);       // sleeve opening
    l(0.48, 0.21);                   // underarm
    q(0.50, -0.20, 0.50, -0.66);     // side
    q(0, -0.70, -0.50, -0.66);       // hem
    q(-0.50, -0.20, -0.48, 0.21);
    l(-0.75, 0.06);
    q(-0.86, 0.17, -0.92, 0.30);
    l(-0.42, 0.56);
    q(-0.30, 0.60, -0.17, 0.62);
    ctx.closePath();
  }
  function teeShape() {
    const s = new T.Shape();
    teePath({ moveTo: (x, y) => s.moveTo(x, y), lineTo: (x, y) => s.lineTo(x, y), quadraticCurveTo: (a, b, x, y) => s.quadraticCurveTo(a, b, x, y), beginPath() {}, closePath() { s.closePath(); } }, x => x, y => y);
    return s;
  }

  const loadImg = src => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = P + src + ".jpg"; });
  const imgCache = {};
  const getImg = src => imgCache[src] || (imgCache[src] = loadImg(src));

  /* One face of the shirt as a canvas texture: the white tee plus its prints, transparent outside. */
  async function faceTexture(prints, renderer) {
    const CW = 1024, CH = Math.round(CW * (Y1 - Y0) / (X1 - X0));
    const c = document.createElement("canvas"); c.width = CW; c.height = CH;
    const g = c.getContext("2d");
    const toX = x => (x - X0) / (X1 - X0) * CW, toY = y => (Y1 - y) / (Y1 - Y0) * CH;
    teePath(g, toX, toY);
    g.fillStyle = "#ffffff"; g.fill();
    g.save(); teePath(g, toX, toY); g.clip();
    g.globalCompositeOperation = "multiply"; // print artwork has a white ground; multiply lets the shirt show through
    for (const pr of prints) {
      const im = await getImg(pr.src); if (!im) continue;
      let w = pr.w, h = w * im.height / im.width;
      if (pr.h && h > pr.h) { h = pr.h; w = h * im.width / im.height; }
      const pw = w / (X1 - X0) * CW, ph = h / (Y1 - Y0) * CH;
      g.drawImage(im, toX(pr.x) - pw / 2, toY(pr.y) - ph / 2, pw, ph);
    }
    g.restore();
    const tex = new T.CanvasTexture(c);
    tex.encoding = T.sRGBEncoding;
    tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return tex;
  }

  /* A face plane with a gentle bulge, so the cloth has body. */
  function facePlane() {
    const geo = new T.PlaneGeometry(X1 - X0, Y1 - Y0, 48, 36);
    geo.translate((X0 + X1) / 2, (Y0 + Y1) / 2, 0);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      const bx = Math.max(0, 1 - (x / 0.56) ** 2), by = Math.max(0, 1 - ((y + 0.03) / 0.72) ** 2);
      const sleeve = Math.max(0, 1 - ((Math.abs(x) - 0.68) / 0.26) ** 2) * Math.max(0, 1 - ((y - 0.2) / 0.16) ** 2);
      pos.setZ(i, 0.12 * bx * by + 0.03 * sleeve + 0.012);
    }
    geo.computeVertexNormals();
    return geo;
  }

  /* ---------- scene ---------- */
  let S = null; // live scene for the mounted rail

  function build(stage, list) {
    teardown();
    const canvas = document.createElement("canvas");
    canvas.className = "rail-gl";
    canvas.setAttribute("aria-hidden", "true");
    stage.prepend(canvas);
    let renderer;
    try { renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" }); }
    catch { canvas.remove(); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.setClearColor(0xffffff, 0);

    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(26, 1, 0.1, 100);
    camera.position.set(0, 0, 10);
    scene.add(new T.HemisphereLight(0xffffff, 0x8c8c8c, 0.62));
    const key = new T.DirectionalLight(0xffffff, 0.95); key.position.set(-3, 4, 4); scene.add(key);
    const fill = new T.DirectionalLight(0xffffff, 0.22); fill.position.set(4, -1, 3); scene.add(fill);
    const rim = new T.DirectionalLight(0xffffff, 0.4); rim.position.set(2, 2, -5); scene.add(rim);

    const metal = new T.MeshStandardMaterial({ color: 0xa7a7a7, metalness: 0.55, roughness: 0.32 });
    const wood = new T.MeshStandardMaterial({ color: 0xc9a273, roughness: 0.55 });
    const rail = new T.Mesh(new T.CylinderGeometry(0.028, 0.028, 60, 20), metal);
    rail.rotation.z = Math.PI / 2;
    scene.add(rail);

    const shape = teeShape();
    const core = new T.ExtrudeGeometry(shape, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3, curveSegments: 24 });
    core.translate(0, 0, -0.015);
    const coreMat = new T.MeshStandardMaterial({ color: 0xdedede, roughness: 0.95 });
    const plane = facePlane();
    const hangerGeo = new T.TubeGeometry(new T.CatmullRomCurve3([
      new T.Vector3(-0.47, 0.5, 0), new T.Vector3(-0.24, 0.6, 0), new T.Vector3(0, 0.655, 0), new T.Vector3(0.24, 0.6, 0), new T.Vector3(0.47, 0.5, 0)]), 40, 0.024, 10, false);
    const stemGeo = new T.CylinderGeometry(0.009, 0.009, 0.11, 10);
    const hookGeo = new T.TorusGeometry(0.055, 0.009, 10, 32, Math.PI * 1.35);
    const HOOK_TOP = 0.835; // hook top in shirt units; the group pivots here, on the rail

    const tees = list.map((p, i) => {
      const group = new T.Group();
      const body = new T.Group(); body.position.y = -HOOK_TOP; group.add(body);
      body.add(new T.Mesh(core, coreMat));
      const front = new T.Mesh(plane, new T.MeshStandardMaterial({ color: 0xf7f7f5, roughness: 0.88, alphaTest: 0.5, transparent: false }));
      const back = new T.Mesh(plane, new T.MeshStandardMaterial({ color: 0xf7f7f5, roughness: 0.88, alphaTest: 0.5, transparent: false }));
      back.rotation.y = Math.PI;
      front.visible = back.visible = false;   // shown once their print texture is ready
      body.add(front, back);
      const hanger = new T.Mesh(hangerGeo, wood); hanger.position.z = 0; body.add(hanger);
      const stem = new T.Mesh(stemGeo, metal); stem.position.y = 0.71; body.add(stem);
      const hook = new T.Mesh(hookGeo, metal); hook.position.set(0.02, 0.78, 0); hook.rotation.z = -0.4; body.add(hook);
      scene.add(group);
      const pr = PRINTS[p.id] || { front: [], back: [] };
      faceTexture(pr.front, renderer).then(t => { front.material.map = t; front.material.needsUpdate = true; front.visible = true; wake(); });
      faceTexture(pr.back, renderer).then(t => { back.material.map = t; back.material.needsUpdate = true; back.visible = true; wake(); });
      return { group, cur: { x: 0, ry: 1.3, s: 0.94 }, tgt: { x: 0, ry: 1.3, s: 0.94 }, seed: i * 1.7 };
    });

    S = { stage, canvas, renderer, scene, camera, rail, tees, w: 280, sel: null, turned: false, spin: 0, raf: 0, visible: true, last: 0, still: 0 };
    stage.classList.add("is-3d");
    AW.rail3d.active = true;

    S.io = new IntersectionObserver(([e]) => { if (!S) return; S.visible = e.isIntersecting; if (S.visible) wake(); }, { rootMargin: "60px" });
    S.io.observe(stage);
    S.ro = new ResizeObserver(() => { resize(); wake(); });
    S.ro.observe(stage);
    resize();
  }

  function resize() {
    if (!S) return;
    const r = S.stage.getBoundingClientRect();
    const W = Math.max(1, r.width), H = Math.max(1, r.height);
    S.renderer.setSize(W, H, false);
    S.camera.aspect = W / H; S.camera.updateProjectionMatrix();
    // world units per CSS pixel on the z=0 plane
    S.upp = 2 * S.camera.position.z * Math.tan(T.MathUtils.degToRad(S.camera.fov / 2)) / H;
    S.H = H;
    S.rail.position.y = H / 2 * S.upp - 9 * S.upp;
  }

  function onLayout({ items, sel, w }) {
    if (!S) return;
    S.w = w;
    if (sel !== S.sel) { S.sel = sel; S.turned = false; }
    items.forEach((it, i) => {
      const t = S.tees[i]; if (!t) return;
      t.tgt.x = it.x;
      t.tgt.ry = -it.ang * Math.PI / 180;
      t.tgt.s = it.s;
    });
    wake();
  }

  function wake() { if (S && !S.raf && S.visible) { S.still = 0; S.last = performance.now(); S.raf = requestAnimationFrame(frame); } }

  function frame(now) {
    if (!S) return;
    S.raf = 0;
    const dt = Math.min(0.05, (now - S.last) / 1000); S.last = now;
    const k = reduced() ? 1 : 1 - Math.exp(-dt * 7.5);
    const scaleBase = S.w * S.upp * 1.3 / 1.9;
    let moving = false;
    S.spin += ((S.turned ? Math.PI : 0) - S.spin) * k;
    S.tees.forEach((t, i) => {
      const c = t.cur, g = t.tgt;
      const ex = g.x - c.x, er = g.ry - c.ry, es = g.s - c.s;
      c.x += ex * k; c.ry += er * k; c.s += es * k;
      if (Math.abs(ex) > 0.3 || Math.abs(er) > 0.002 || Math.abs(es) > 0.0005) moving = true;
      const grp = t.group;
      grp.position.set(c.x * S.upp, S.rail.position.y, Math.abs(c.ry) < 0.6 ? 0.12 : 0);
      grp.rotation.y = c.ry + (i === S.sel ? S.spin : 0);
      grp.rotation.z = reduced() ? 0 : Math.sin(now / 1300 + t.seed) * 0.012;  // the faintest sway
      grp.scale.setScalar(scaleBase * c.s);
    });
    if (Math.abs(S.spin - (S.turned ? Math.PI : 0)) > 0.002) moving = true;
    S.renderer.render(S.scene, S.camera);
    // keep the gentle sway alive while on screen, but rest the GPU when the page is idle a while
    S.still = moving ? 0 : S.still + dt;
    if (S.visible && !document.hidden && (moving || (!reduced() && S.still < 8))) S.raf = requestAnimationFrame(frame);
  }

  function teardown() {
    if (!S) return;
    cancelAnimationFrame(S.raf);
    S.io && S.io.disconnect(); S.ro && S.ro.disconnect();
    S.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } });
    S.renderer.dispose();
    S.canvas.remove();
    S.stage.classList.remove("is-3d");
    S = null;
    AW.rail3d.active = false;
  }

  AW.on("rail:mount", ({ stage, list }) => { try { build(stage, list); } catch (e) { teardown(); } });
  AW.on("rail:layout", d => onLayout(d));
  AW.on("rail:turn", ({ back }) => { if (S) { S.turned = back; wake(); } });
  AW.on("route", ({ page }) => { if (page !== "" && page !== "shop" && page !== "product") teardown(); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) wake(); });
  // Keep the sway going after any touch or pointer movement on the rail.
  document.addEventListener("pointermove", () => { if (S) { S.still = 0; wake(); } }, { passive: true });
})();
