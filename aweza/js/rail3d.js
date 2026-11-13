/* AWEZA rail in 3D (Three.js). Upgrades the rail from js/rail.js when WebGL is available:
   every shirt becomes a real 3D tee on a wooden hanger, hanging from a metal rail, wearing its own
   front and back photos. rail.js still owns the interaction and the layout maths;
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

  /* ---------- photo-real hanging shots ----------
     When a shirt has swung round to face you and settled, the 3D shirt crossfades into a photo-real shot of
     the same tee on a hanger (Higgsfield renders made from the Printify mockups, transparent background).
     Two fronts use the real Printify hanger photo instead, with its white background cut away.
     top/bottom/cx: where the hook top, the hem and the centre sit in the image, as fractions. */
  const PH = "images/hang-real/", PR = "images/hang/";
  const M = {"captain-save-back": {"top": 0.0125, "bottom": 0.975, "cx": 0.4994}, "ceo-of-bad-decisions-back": {"top": 0.0098, "bottom": 0.9696, "cx": 0.4989}, "ceo-of-bad-decisions-front": {"top": 0.0116, "bottom": 0.9696, "cx": 0.4994}, "need-a-hug-back": {"top": 0.0116, "bottom": 0.9812, "cx": 0.4994}, "signature-lips-back": {"top": 0.0133, "bottom": 0.9767, "cx": 0.4833}, "signature-lips-front": {"top": 0.01, "bottom": 0.9578, "cx": 0.4896}, "sweet-cupcake-front": {"top": 0.0071, "bottom": 0.9723, "cx": 0.4994}, "zero-exes-back": {"top": 0.0143, "bottom": 0.983, "cx": 0.4961}, "zero-exes-front": {"top": 0.0125, "bottom": 0.9696, "cx": 0.4989}, "captain-save-front-real": {"top": 0.0, "bottom": 0.97, "cx": 0.5258}, "need-a-hug-front-real": {"top": 0.0, "bottom": 0.97, "cx": 0.5258}, "black-out-front": {"top": 0.0122, "bottom": 0.9656, "cx": 0.4882}, "black-out-back": {"top": 0.0078, "bottom": 0.9733, "cx": 0.4868}, "time-of-your-life-front": {"top": 0.02, "bottom": 0.9656, "cx": 0.4938}, "time-of-your-life-back": {"top": 0.0089, "bottom": 0.9744, "cx": 0.484}};
  const shot = id => ({ src: PH + id + ".webp", m: M[id], aspect: 0.8, real: false });
  // real Printify hanger photo, white background cut away so it sits cleanly on the wall
  const real = id => ({ src: PH + id + "-front-real.webp", m: M[id + "-front-real"], aspect: 640 / 801, real: false });
  const PHOTOS = {
    // Fronts only. The backs changed (neck AWEZA, big AWEZA backs), so at rest the 3D shirt itself shows them.
    "signature-lips":       { front: shot("signature-lips-front") },
    "ceo-of-bad-decisions": { front: shot("ceo-of-bad-decisions-front") },
    "zero-exes":            { front: shot("zero-exes-front") },
    "sweet-cupcake":        { front: shot("sweet-cupcake-front") },
    "need-a-hug":           { front: real("need-a-hug") },
    "captain-save":         { front: real("captain-save") },
    "black-out":            { front: shot("black-out-front") },
    "time-of-your-life":    { front: shot("time-of-your-life-front") },
  };

  // Warm the cache for the hanging-shot photos once the rail is drawn and the browser is idle, and not at all on a
  // data-saver or very slow connection (each photo is also fetched when its shirt settles, so nothing breaks).
  const warmPhotos = () => {
    const c = navigator.connection; if (c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || ""))) return;
    Object.values(PHOTOS).forEach(p => Object.values(p).forEach(v => { const i = new Image(); i.decoding = "async"; i.src = v.src; }));
  };
  AW.on("rail:ready", () => (window.requestIdleCallback ? window.requestIdleCallback(warmPhotos, { timeout: 4000 }) : setTimeout(warmPhotos, 2000)));

  /* ---------- the shirt on its hanger ----------
     models/tee-hanger.json: one 3D tee on a wooden hanger, made with Higgsfield (multi-image to 3D) and shared by
     every design. Each design wraps its own photos onto it: images/tex/<id>-front.jpg on the front-facing side and
     <id>-back.jpg on the back. Those textures are the hanging shots above, warped to this model's outline, so the
     prints sit where they do on the real tee. Positions are int16 within min/max; the file is JSON so any static
     host serves it. */
  const TEX = "images/tex/";
  const HOOK_TO_HEM = 1.535;  // shirt units from the hook top to the hem (the photo overlay lines up on this)
  let modelPromise = null;
  const b64 = (str, C) => { const bin = atob(str), u8 = new Uint8Array(bin.length); for (let k = 0; k < bin.length; k++) u8[k] = bin.charCodeAt(k); return new C(u8.buffer); };
  function loadModel() {
    if (modelPromise) return modelPromise;
    modelPromise = fetch("models/tee-hanger.json").then(r => { if (!r.ok) throw new Error("model " + r.status); return r.json(); }).then(j => {
      const q = b64(j.pos, Int16Array), idx = b64(j.idx, Uint16Array), mn = j.min, mx = j.max;
      const n = q.length / 3, pos = new Float32Array(n * 3);
      const k = HOOK_TO_HEM / (mx[1] - mn[1]);
      // shirt units, pivot at the hook top, centred on x and z
      const cxm = (mn[0] + mx[0]) / 2, czm = (mn[2] + mx[2]) / 2;
      for (let v = 0; v < n; v++) for (let a = 0; a < 3; a++) {
        const t = (q[v * 3 + a] + 32767) / 65534, w = mn[a] + t * (mx[a] - mn[a]);
        pos[v * 3 + a] = (a === 0 ? w - cxm : a === 1 ? w - mx[1] : w - czm) * k;
      }
      // weld duplicated vertices (texture seams in the source) so the cloth shades smoothly
      const key = new Map(), canon = new Uint32Array(n);
      for (let v = 0; v < n; v++) { const s = q[v * 3] + "," + q[v * 3 + 1] + "," + q[v * 3 + 2]; if (!key.has(s)) key.set(s, v); canon[v] = key.get(s); }
      const tri = idx.length / 3, fn = new Float32Array(tri * 3), acc = new Float32Array(n * 3);
      const A = new T.Vector3(), B = new T.Vector3(), C = new T.Vector3(), e1 = new T.Vector3(), e2 = new T.Vector3();
      let out = 0;
      for (let f = 0; f < tri; f++) {
        A.fromArray(pos, idx[f * 3] * 3); B.fromArray(pos, idx[f * 3 + 1] * 3); C.fromArray(pos, idx[f * 3 + 2] * 3);
        e1.subVectors(B, A); e2.subVectors(C, A); e1.cross(e2);
        fn[f * 3] = e1.x; fn[f * 3 + 1] = e1.y; fn[f * 3 + 2] = e1.z;
        out += e1.x * (A.x + B.x + C.x) / 3 + e1.y * ((A.y + B.y + C.y) / 3 + HOOK_TO_HEM / 2) + e1.z * (A.z + B.z + C.z) / 3;
      }
      if (out < 0) { for (let f = 0; f < tri; f++) { const t = idx[f * 3 + 1]; idx[f * 3 + 1] = idx[f * 3 + 2]; idx[f * 3 + 2] = t; } for (let f = 0; f < fn.length; f++) fn[f] = -fn[f]; }
      for (let f = 0; f < tri; f++) for (let c = 0; c < 3; c++) { const v = canon[idx[f * 3 + c]]; acc[v * 3] += fn[f * 3]; acc[v * 3 + 1] += fn[f * 3 + 1]; acc[v * 3 + 2] += fn[f * 3 + 2]; }
      const nor = new Float32Array(n * 3);
      for (let v = 0; v < n; v++) { const c = canon[v] * 3, x = acc[c], y = acc[c + 1], z = acc[c + 2], l = Math.hypot(x, y, z) || 1; nor[v * 3] = x / l; nor[v * 3 + 1] = y / l; nor[v * 3 + 2] = z / l; }
      // split the faces: the side you see from the front takes the front photo, the rest the back photo
      // Decided by depth, not by which way a face points: a fold on the front stays on the front.
      const x0 = (mn[0] - cxm) * k, x1 = (mx[0] - cxm) * k, y0 = -HOOK_TO_HEM;
      const GX = 40, GY = 60, zLo = new Float32Array(GX * GY).fill(1e9), zHi = new Float32Array(GX * GY).fill(-1e9);
      const cell = (x, y) => Math.min(GX - 1, Math.max(0, Math.floor((x - x0) / (x1 - x0) * GX))) + GX * Math.min(GY - 1, Math.max(0, Math.floor((y - y0) / HOOK_TO_HEM * GY)));
      for (let v = 0; v < n; v++) { const c = cell(pos[v * 3], pos[v * 3 + 1]), z = pos[v * 3 + 2]; if (z < zLo[c]) zLo[c] = z; if (z > zHi[c]) zHi[c] = z; }
      const fi = [], bi = [];
      for (let f = 0; f < tri; f++) {
        const a = idx[f * 3] * 3, b = idx[f * 3 + 1] * 3, c = idx[f * 3 + 2] * 3;
        const x = (pos[a] + pos[b] + pos[c]) / 3, y = (pos[a + 1] + pos[b + 1] + pos[c + 1]) / 3, z = (pos[a + 2] + pos[b + 2] + pos[c + 2]) / 3;
        const g = cell(x, y), mid = (zLo[g] + zHi[g]) / 2;
        const front = zHi[g] - zLo[g] < 0.02 ? fn[f * 3 + 2] >= 0 : z >= mid;
        (front ? fi : bi).push(idx[f * 3], idx[f * 3 + 1], idx[f * 3 + 2]);
      }
      const uvF = new Float32Array(n * 2), uvB = new Float32Array(n * 2);
      for (let v = 0; v < n; v++) {
        const u = (pos[v * 3] - x0) / (x1 - x0), vv = (pos[v * 3 + 1] - y0) / HOOK_TO_HEM;
        uvF[v * 2] = u; uvF[v * 2 + 1] = vv; uvB[v * 2] = 1 - u; uvB[v * 2 + 1] = vv;
      }
      const P = new T.BufferAttribute(pos, 3), N = new T.BufferAttribute(nor, 3);
      const geo = (ix, uv) => { const g = new T.BufferGeometry(); g.setAttribute("position", P); g.setAttribute("normal", N); g.setAttribute("uv", new T.BufferAttribute(uv, 2)); g.setIndex(ix); g.computeBoundingSphere(); return g; };
      return [geo(fi, uvF), geo(bi, uvB)];
    });
    return modelPromise;
  }
  const texLoader = new T.TextureLoader();
  const loadTex = (src, renderer) => new Promise(res => texLoader.load(src, t => { t.encoding = T.sRGBEncoding; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); res(t); }, undefined, () => res(null)));

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
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;

    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(26, 1, 0.1, 100);
    camera.position.set(0, 0, 10);
    scene.add(new T.HemisphereLight(0xffffff, 0x8ea6c0, 0.7));
    const key = new T.DirectionalLight(0xffffff, 0.95); key.position.set(-3, 4, 4); scene.add(key);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 4;
    scene.add(key.target);
    // a white wall just behind the rail that only shows the shirts' soft shadows
    const wall = new T.Mesh(new T.PlaneGeometry(80, 40), new T.ShadowMaterial({ color: 0x2f5a8a, opacity: 0.13 }));
    wall.position.z = -0.75; wall.receiveShadow = true; scene.add(wall);
    const fill = new T.DirectionalLight(0xffffff, 0.22); fill.position.set(4, -1, 3); scene.add(fill);
    const rim = new T.DirectionalLight(0xffffff, 0.4); rim.position.set(2, 2, -5); scene.add(rim);

    const metal = new T.MeshStandardMaterial({ color: 0xaeb9c2, metalness: 0.6, roughness: 0.3 });
    const rail = new T.Mesh(new T.CylinderGeometry(0.028, 0.028, 60, 20), metal);
    rail.rotation.z = Math.PI / 2;
    rail.castShadow = true;
    scene.add(rail);

    const tees = list.map((p, i) => {
      const group = new T.Group();
      const cloth = () => new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0, side: T.DoubleSide });
      const front = new T.Mesh(undefined, cloth()), back = new T.Mesh(undefined, cloth());
      front.visible = back.visible = false;   // shown once the model and the photos are in
      [front, back].forEach(m => { m.castShadow = true; m.receiveShadow = true; group.add(m); });
      scene.add(group);
      return { group, front, back, id: p.id, cur: { x: 0, ry: 1.3, s: 0.94 }, tgt: { x: 0, ry: 1.3, s: 0.94 },
               vel: { x: 0, ry: 0, s: 0 }, swing: 0, swingV: 0, lift: 0, liftV: 0, seed: i * 1.7 };
    });

    let pending = tees.length;
    const oneDone = () => { if (--pending === 0) { wake(); requestAnimationFrame(() => requestAnimationFrame(() => AW.emit("rail:ready"))); } };
    loadModel().then(([gf, gb]) => {
      if (!S || S.tees !== tees) return;
      tees.forEach(t => {
        t.front.geometry = gf; t.back.geometry = gb;
        Promise.all([loadTex(TEX + t.id + "-front.jpg", renderer), loadTex(TEX + t.id + "-back.jpg", renderer)]).then(([tf, tb]) => {
          if (!S || S.tees !== tees) return;
          t.front.material.map = tf; t.back.material.map = tb;
          t.front.material.needsUpdate = t.back.material.needsUpdate = true;
          t.front.visible = t.back.visible = true;
          wake();
          oneDone();
        });
      });
    }).catch(() => { teardown(); AW.emit("rail:ready"); });   // no model: fall back to the photo rail

    const photo = document.createElement("img");
    photo.className = "rail-photo"; photo.alt = ""; photo.setAttribute("aria-hidden", "true"); photo.decoding = "async";
    stage.appendChild(photo);
    S = { stage, canvas, renderer, scene, camera, rail, tees, photo, w: 280, sel: null, turned: false, spin: 0, spinV: 0, userRot: 0, userRotV: 0, dragging: false, dragBase: 0, raf: 0, visible: true, last: 0, still: 0 };
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
    const key = S.scene.children.find(o => o.isDirectionalLight && o.castShadow);
    if (key) {
      const hw = W / 2 * S.upp + 1, hh = H / 2 * S.upp + 1, c = key.shadow.camera;
      c.left = -hw; c.right = hw; c.top = hh; c.bottom = -hh; c.near = 0.5; c.far = 20; c.updateProjectionMatrix();
    }
  }

  function onLayout({ items, sel, w }) {
    if (!S) return;
    S.w = w;
    if (sel !== S.sel) {
      const prev = S.sel;
      S.sel = sel; S.turned = false; S.userRot = 0; S.userRotV = 0; S.dragging = false;
      if (sel != null && !reduced()) {
        const dir = prev == null ? 1 : Math.sign(sel - prev) || 1;
        S.tees.forEach((t, i) => {
          const d = i - sel;
          if (d === 0) { t.swingV += 1.6 * dir; t.liftV += 0.9; }          // pulled off the rail: a lift and a swing
          else if (Math.abs(d) <= 3) t.swingV += (0.9 / Math.abs(d)) * Math.sign(d);  // neighbours get nudged aside
        });
      }
    }
    items.forEach((it, i) => {
      const t = S.tees[i]; if (!t) return;
      t.tgt.x = it.x;
      t.tgt.ry = -it.ang * Math.PI / 180;
      t.tgt.s = it.s;
      if (!S.placed) { t.cur.x = t.tgt.x; t.cur.ry = t.tgt.ry; t.cur.s = t.tgt.s; }   // first layout: start in place, no fly-in
    });
    S.placed = true;
    wake();
  }

  function wake() { if (S && !S.raf && S.visible) { S.still = 0; S.last = performance.now(); S.raf = requestAnimationFrame(frame); } }

  function spring(c, v, g, k, d, dt) { const a = k * (g - c) - d * v; v += a * dt; return [c + v * dt, v]; }

  function frame(now) {
    if (!S) return;
    S.raf = 0;
    const elapsed = Math.min(0.1, (now - S.last) / 1000); S.last = now;
    const steps = Math.max(1, Math.ceil(elapsed / 0.016)), dt = elapsed / steps;   // fixed small steps keep the springs stable
    const still = reduced();
    const scaleBase = S.w * S.upp * 1.3 / 1.9;
    let moving = false;
    // turning round: a spring with a little overshoot, like a shirt spun on its hook
    const spinG = S.turned ? Math.PI : 0;
    for (let n = 0; n < steps; n++) {
      if (still) { S.spin = spinG; S.spinV = 0; } else [S.spin, S.spinV] = spring(S.spin, S.spinV, spinG, 46, 9.5, dt);
      if (!S.dragging && S.userRotV) {
        S.userRot += S.userRotV * dt;
        S.userRotV *= Math.exp(-2.6 * dt);                 // friction: a big flick spins on, a small one stops soon
        if (Math.abs(S.userRotV) < 0.02) S.userRotV = 0;
      }
      S.tees.forEach((t, i) => {
        const c = t.cur, g = t.tgt, v = t.vel;
        if (still) { c.x = g.x; c.ry = g.ry; c.s = g.s; v.x = v.ry = v.s = 0; t.swing = t.swingV = t.lift = t.liftV = 0; return; }
        [c.x, v.x] = spring(c.x, v.x, g.x, 70, 13, dt);
        [c.ry, v.ry] = spring(c.ry, v.ry, g.ry, 70, 11.5, dt);   // slightly under-damped: a small overshoot as it swings round
        [c.s, v.s] = spring(c.s, v.s, g.s, 70, 14, dt);
        [t.lift, t.liftV] = spring(t.lift, t.liftV, i === S.sel ? 0.035 : 0, 55, 9, dt);
        [t.swing, t.swingV] = spring(t.swing, t.swingV, 0, 38, 2.6, dt);   // pendulum on the hook
      });
    }
    if (Math.abs(S.spin - spinG) > 0.002 || Math.abs(S.spinV) > 0.01 || S.userRotV || S.dragging) moving = true;
    S.tees.forEach((t, i) => {
      const c = t.cur, g = t.tgt, v = t.vel;
      if (Math.abs(g.x - c.x) > 0.3 || Math.abs(v.x) > 2 || Math.abs(g.ry - c.ry) > 0.002 || Math.abs(v.ry) > 0.01 ||
          Math.abs(g.s - c.s) > 0.0005 || Math.abs(t.swing) > 0.002 || Math.abs(t.swingV) > 0.01 || Math.abs(t.liftV) > 0.005) moving = true;
      const grp = t.group;
      grp.position.set(c.x * S.upp, S.rail.position.y + t.lift * scaleBase, Math.abs(c.ry) < 0.6 ? 0.12 : 0);
      grp.rotation.y = c.ry + (i === S.sel ? S.spin + S.userRot : 0);
      grp.rotation.z = (still ? 0 : Math.sin(now / 1300 + t.seed) * 0.012) + t.swing * 0.09;
      grp.scale.setScalar(scaleBase * c.s);
    });
    S.renderer.render(S.scene, S.camera);
    placePhoto(scaleBase);
    S.still = moving ? 0 : S.still + elapsed;
    if (S.visible && !document.hidden && (moving || (!still && S.still < 8))) S.raf = requestAnimationFrame(frame);
  }

  /* Crossfade the settled shirt into its photo-real shot, lined up hook-to-hem with the 3D shirt. */
  function placePhoto(scaleBase) {
    const img = S.photo; if (!img) return;
    const t = S.sel != null ? S.tees[S.sel] : null;
    const set = t && PHOTOS[t.id];
    let a = ((S.spin + S.userRot) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;   // facing angle in (-pi, pi]
    const facingFront = Math.abs(a) < 0.07, facingBack = Math.PI - Math.abs(a) < 0.07;
    const ph = set && (facingFront ? set.front : facingBack ? set.back : null);
    const spinG = S.turned ? Math.PI : 0;
    const settled = t && !S.dragging && Math.abs(S.userRotV) < 0.05 && Math.abs(t.tgt.ry - t.cur.ry) < 0.03 && Math.abs(t.vel.ry) < 0.12 &&
      Math.abs(S.spin - spinG) < 0.04 && Math.abs(S.spinV) < 0.15 && Math.abs(t.swing) < 0.06;
    const holding = ph && !S.dragging && Math.abs(S.userRotV) < 0.05 && img.classList.contains("is-on") && img.getAttribute("src") === ph.src &&
      Math.abs(t.tgt.ry - t.cur.ry) < 0.2 && Math.abs(S.spin - spinG) < 0.3;
    if (!ph || !(settled || holding)) { if (img.classList.contains("is-on")) img.classList.remove("is-on"); return; }
    if (img.getAttribute("src") !== ph.src) { img.classList.remove("is-on"); img.setAttribute("src", ph.src); img.classList.toggle("is-real", ph.real); }
    const W = S.stage.clientWidth;
    const hookToHem = 1.535 * scaleBase * t.cur.s / S.upp;            // px, from the hook top to the hem of the 3D shirt
    const h = hookToHem / (ph.m.bottom - ph.m.top), w = h * ph.aspect;
    const railPx = 9 - t.lift * scaleBase / S.upp;
    img.style.width = w.toFixed(1) + "px";
    img.style.height = h.toFixed(1) + "px";
    img.style.transform = `translate(${(W / 2 + t.cur.x - w * ph.m.cx).toFixed(1)}px, ${(railPx - 4 - ph.m.top * h).toFixed(1)}px)`;
    if (img.complete && img.naturalWidth) img.classList.add("is-on"); else img.onload = () => { if (S && S.photo === img) wake(); };
  }

  function teardown() {
    if (!S) return;
    cancelAnimationFrame(S.raf);
    S.io && S.io.disconnect(); S.ro && S.ro.disconnect();
    S.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } });
    S.renderer.dispose();
    S.canvas.remove();
    S.photo && S.photo.remove();
    S.stage.classList.remove("is-3d");
    S = null;
    AW.rail3d.active = false;
  }

  AW.on("rail:mount", ({ stage, list }) => { try { build(stage, list); } catch (e) { teardown(); } });
  AW.on("rail:layout", d => onLayout(d));
  AW.on("rail:turn", ({ back }) => { if (S) { S.turned = back; S.userRotV = 0; S.userRot = Math.round(S.userRot / (Math.PI * 2)) * Math.PI * 2; wake(); } });
  AW.on("rail:spin", d => {
    if (!S || S.sel == null) return;
    if (d.phase === "start") { S.dragging = true; S.dragBase = S.userRot; S.userRotV = 0; }
    else if (d.phase === "move") { S.dragging = true; S.userRot = S.dragBase + d.angle; }
    else if (d.phase === "end") { S.dragging = false; S.userRotV = Math.max(-14, Math.min(14, d.velocity || 0)); }
    else if (d.phase === "nudge") { S.userRot += d.angle; }
    wake();
  });
  AW.on("route", ({ page }) => { if (page !== "" && page !== "shop" && page !== "product") teardown(); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) wake(); });
  // Keep the sway going after any touch or pointer movement on the rail.
  document.addEventListener("pointermove", () => { if (S) { S.still = 0; wake(); } }, { passive: true });
})();
