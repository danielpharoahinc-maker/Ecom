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
  };

  /* ---------- photo-real hanging shots ----------
     When a shirt has swung round to face you and settled, the 3D shirt crossfades into a photo-real shot of
     the same tee on a hanger (Higgsfield renders made from the Printify mockups, transparent background).
     Two fronts use the real Printify hanger photo instead, with its white background cut away.
     top/bottom/cx: where the hook top, the hem and the centre sit in the image, as fractions. */
  const PH = "images/hang-real/", PR = "images/hang/";
  const M = {"captain-save-back": {"top": 0.0125, "bottom": 0.975, "cx": 0.4994}, "ceo-of-bad-decisions-back": {"top": 0.0098, "bottom": 0.9696, "cx": 0.4989}, "ceo-of-bad-decisions-front": {"top": 0.0116, "bottom": 0.9696, "cx": 0.4994}, "need-a-hug-back": {"top": 0.0116, "bottom": 0.9812, "cx": 0.4994}, "signature-lips-back": {"top": 0.0107, "bottom": 0.9812, "cx": 0.4961}, "signature-lips-front": {"top": 0.0107, "bottom": 0.9696, "cx": 0.4994}, "sweet-cupcake-front": {"top": 0.0071, "bottom": 0.9723, "cx": 0.4994}, "zero-exes-back": {"top": 0.0143, "bottom": 0.983, "cx": 0.4961}, "zero-exes-front": {"top": 0.0125, "bottom": 0.9696, "cx": 0.4989}, "captain-save-front-real": {"top": 0.0, "bottom": 0.97, "cx": 0.5258}, "need-a-hug-front-real": {"top": 0.0, "bottom": 0.97, "cx": 0.5258}};
  const shot = id => ({ src: PH + id + ".webp", m: M[id], aspect: 0.8, real: false });
  // real Printify hanger photo, white background cut away so it sits cleanly on the wall
  const real = id => ({ src: PH + id + "-front-real.webp", m: M[id + "-front-real"], aspect: 640 / 801, real: false });
  const PHOTOS = {
    "signature-lips":       { front: shot("signature-lips-front"),       back: shot("signature-lips-back") },
    "ceo-of-bad-decisions": { front: shot("ceo-of-bad-decisions-front"), back: shot("ceo-of-bad-decisions-back") },
    "zero-exes":            { front: shot("zero-exes-front"),            back: shot("zero-exes-back") },
    "sweet-cupcake":        { front: shot("sweet-cupcake-front") },
    "need-a-hug":           { front: real("need-a-hug"),                 back: shot("need-a-hug-back") },
    "captain-save":         { front: real("captain-save"),               back: shot("captain-save-back") },
  };
  Object.values(PHOTOS).forEach(p => Object.values(p).forEach(v => { const i = new Image(); i.decoding = "async"; i.src = v.src; })); // warm the cache

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

  /* ---------- Blender shirt ----------
     models/tee-draped.glb: a tee built in Blender from front and back panels sewn at the sides and
     shoulders, then dropped under gravity with a cloth simulation so it hangs with real folds.
     Two primitives: front panel (material 0) and back panel (material 1), with UVs that line up with
     the print textures above. Metres in the file; the site works in shirt units (0.52 m each). */
  const BLENDER_M = 0.52;
  let glbPromise = null;
  function loadTeeGLB() {
    if (glbPromise) return glbPromise;
    // The GLB is shipped base64-encoded inside JSON so any static host (including the preview link) serves it.
    glbPromise = fetch("models/tee-draped.json").then(r => { if (!r.ok) throw new Error("model " + r.status); return r.json(); }).then(j => {
      const bin = atob(j.glb_base64), u8 = new Uint8Array(bin.length);
      for (let k = 0; k < bin.length; k++) u8[k] = bin.charCodeAt(k);
      return u8.buffer;
    }).then(buf => {
      const dv = new DataView(buf);
      if (dv.getUint32(0, true) !== 0x46546c67) throw new Error("not a glb");
      const jsonLen = dv.getUint32(12, true);
      const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, jsonLen)));
      const binStart = 20 + jsonLen + 8;
      const COMP = { 5126: Float32Array, 5123: Uint16Array, 5125: Uint32Array };
      const SIZE = { SCALAR: 1, VEC2: 2, VEC3: 3 };
      const acc = i => {
        const a = json.accessors[i], v = json.bufferViews[a.bufferView], C = COMP[a.componentType];
        return new C(buf.slice(binStart + (v.byteOffset || 0) + (a.byteOffset || 0), binStart + (v.byteOffset || 0) + (a.byteOffset || 0) + a.count * SIZE[a.type] * C.BYTES_PER_ELEMENT));
      };
      const geos = [null, null];
      json.meshes[0].primitives.forEach(pr => {
        const pos = acc(pr.attributes.POSITION), nor = acc(pr.attributes.NORMAL), uv = acc(pr.attributes.TEXCOORD_0);
        for (let k = 0; k < pos.length; k++) pos[k] /= BLENDER_M;          // metres -> shirt units
        for (let k = 1; k < uv.length; k += 2) uv[k] = 1 - uv[k];         // glTF flips V; our canvases do not
        const g = new T.BufferGeometry();
        g.setAttribute("position", new T.BufferAttribute(pos, 3));
        g.setAttribute("normal", new T.BufferAttribute(nor, 3));
        g.setAttribute("uv", new T.BufferAttribute(uv, 2));
        g.setIndex(new T.BufferAttribute(acc(pr.indices), 1));
        geos[pr.material === 1 ? 1 : 0] = g;
      });
      if (!geos[0] || !geos[1]) throw new Error("missing panel");
      return geos;
    });
    return glbPromise;
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
    const wood = new T.MeshStandardMaterial({ color: 0xc9a273, roughness: 0.55 });
    const rail = new T.Mesh(new T.CylinderGeometry(0.028, 0.028, 60, 20), metal);
    rail.rotation.z = Math.PI / 2;
    rail.castShadow = true;
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
      const coreMesh = new T.Mesh(core, coreMat); body.add(coreMesh);
      const cotton = () => new T.MeshPhysicalMaterial({ color: 0xf6f6f4, roughness: 0.9, sheen: 0.45, sheenRoughness: 0.8, sheenColor: new T.Color(0xffffff), alphaTest: 0.5, side: T.FrontSide });
      const front = new T.Mesh(plane, cotton());
      const back = new T.Mesh(plane, cotton());
      back.rotation.y = Math.PI;
      front.visible = back.visible = false;   // shown once their print texture is ready
      body.add(front, back);
      const hanger = new T.Mesh(hangerGeo, wood); hanger.position.z = 0; body.add(hanger);
      const stem = new T.Mesh(stemGeo, metal); stem.position.y = 0.71; body.add(stem);
      const hook = new T.Mesh(hookGeo, metal); hook.position.set(0.02, 0.78, 0); hook.rotation.z = -0.4; body.add(hook);
      [coreMesh, front, back, hanger, stem, hook].forEach(m => { m.castShadow = true; m.receiveShadow = true; });
      scene.add(group);
      const pr = PRINTS[p.id] || { front: [], back: [] };
      faceTexture(pr.front, renderer).then(t => { front.material.map = t; front.material.needsUpdate = true; front.visible = true; wake(); });
      faceTexture(pr.back, renderer).then(t => { back.material.map = t; back.material.needsUpdate = true; back.visible = true; wake(); });
      return { group, coreMesh, front, back, id: p.id, cur: { x: 0, ry: 1.3, s: 0.94 }, tgt: { x: 0, ry: 1.3, s: 0.94 },
               vel: { x: 0, ry: 0, s: 0 }, swing: 0, swingV: 0, lift: 0, liftV: 0, seed: i * 1.7 };
    });

    loadTeeGLB().then(([gf, gb]) => {
      if (!S || S.tees !== tees) return;
      tees.forEach(t => {
        t.coreMesh.visible = false;               // the Blender panels have their own thickness and seams
        t.front.geometry = gf; t.back.geometry = gb;
        t.back.rotation.y = 0;                    // the Blender back panel is already in place
        [t.front, t.back].forEach(m => { m.material.alphaTest = 0; m.material.side = T.DoubleSide; m.material.needsUpdate = true; });
      });
      S.blender = true;
      wake();
    }).catch(() => { /* keep the built-in shirt shape */ });

    const photo = document.createElement("img");
    photo.className = "rail-photo"; photo.alt = ""; photo.setAttribute("aria-hidden", "true"); photo.decoding = "async";
    stage.appendChild(photo);
    S = { stage, canvas, renderer, scene, camera, rail, tees, photo, w: 280, sel: null, turned: false, spin: 0, spinV: 0, raf: 0, visible: true, last: 0, still: 0 };
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
      S.sel = sel; S.turned = false;
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
    if (Math.abs(S.spin - spinG) > 0.002 || Math.abs(S.spinV) > 0.01) moving = true;
    S.tees.forEach((t, i) => {
      const c = t.cur, g = t.tgt, v = t.vel;
      if (Math.abs(g.x - c.x) > 0.3 || Math.abs(v.x) > 2 || Math.abs(g.ry - c.ry) > 0.002 || Math.abs(v.ry) > 0.01 ||
          Math.abs(g.s - c.s) > 0.0005 || Math.abs(t.swing) > 0.002 || Math.abs(t.swingV) > 0.01 || Math.abs(t.liftV) > 0.005) moving = true;
      const grp = t.group;
      grp.position.set(c.x * S.upp, S.rail.position.y + t.lift * scaleBase, Math.abs(c.ry) < 0.6 ? 0.12 : 0);
      grp.rotation.y = c.ry + (i === S.sel ? S.spin : 0);
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
    const ph = set && (S.turned ? set.back : set.front);
    const spinG = S.turned ? Math.PI : 0;
    const settled = t && Math.abs(t.tgt.ry - t.cur.ry) < 0.03 && Math.abs(t.vel.ry) < 0.12 &&
      Math.abs(S.spin - spinG) < 0.04 && Math.abs(S.spinV) < 0.15 && Math.abs(t.swing) < 0.06;
    const holding = ph && img.classList.contains("is-on") && img.getAttribute("src") === ph.src &&
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
  AW.on("rail:turn", ({ back }) => { if (S) { S.turned = back; wake(); } });
  AW.on("route", ({ page }) => { if (page !== "" && page !== "shop" && page !== "product") teardown(); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) wake(); });
  // Keep the sway going after any touch or pointer movement on the rail.
  document.addEventListener("pointermove", () => { if (S) { S.still = 0; wake(); } }, { passive: true });
})();
