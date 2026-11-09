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
    glbPromise = fetch("models/tee-draped.glb").then(r => { if (!r.ok) throw new Error("glb " + r.status); return r.arrayBuffer(); }).then(buf => {
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
    scene.add(new T.HemisphereLight(0xffffff, 0x8c8c8c, 0.62));
    const key = new T.DirectionalLight(0xffffff, 0.95); key.position.set(-3, 4, 4); scene.add(key);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 4;
    scene.add(key.target);
    // a white wall just behind the rail that only shows the shirts' soft shadows
    const wall = new T.Mesh(new T.PlaneGeometry(80, 40), new T.ShadowMaterial({ opacity: 0.13 }));
    wall.position.z = -0.75; wall.receiveShadow = true; scene.add(wall);
    const fill = new T.DirectionalLight(0xffffff, 0.22); fill.position.set(4, -1, 3); scene.add(fill);
    const rim = new T.DirectionalLight(0xffffff, 0.4); rim.position.set(2, 2, -5); scene.add(rim);

    const metal = new T.MeshStandardMaterial({ color: 0xa7a7a7, metalness: 0.55, roughness: 0.32 });
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
      return { group, coreMesh, front, back, cur: { x: 0, ry: 1.3, s: 0.94 }, tgt: { x: 0, ry: 1.3, s: 0.94 }, seed: i * 1.7 };
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
    const key = S.scene.children.find(o => o.isDirectionalLight && o.castShadow);
    if (key) {
      const hw = W / 2 * S.upp + 1, hh = H / 2 * S.upp + 1, c = key.shadow.camera;
      c.left = -hw; c.right = hw; c.top = hh; c.bottom = -hh; c.near = 0.5; c.far = 20; c.updateProjectionMatrix();
    }
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
      if (!S.placed) { t.cur.x = t.tgt.x; t.cur.ry = t.tgt.ry; t.cur.s = t.tgt.s; }   // first layout: start in place, no fly-in
    });
    S.placed = true;
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
