/* AWEZA storefront: hash-routed single page app, no build step. */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const app = $("#app");
  const rand = n => "R" + n.toLocaleString("en-ZA");
  const byId = id => PRODUCTS.find(p => p.id === id);
  const colName = id => (COLLECTIONS.find(c => c.id === id) || {}).name || "";
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- Placeholder shirt artwork (swap for Printify mockups later) ---------- */
  const TEE = "M140 72 L98 84 L44 132 L76 182 L110 164 L110 344 L290 344 L290 164 L324 182 L356 132 L302 84 L260 72 Q200 112 140 72 Z";
  const TEE_BACK = "M140 72 L98 84 L44 132 L76 182 L110 164 L110 344 L290 344 L290 164 L324 182 L356 132 L302 84 L260 72 Q200 84 140 72 Z";

  function graphicText(p, cx, cy, maxW, maxH) {
    const lines = p.graphic.split("\n");
    const longest = Math.max(...lines.map(l => l.length));
    const size = Math.min(maxH / (lines.length * 0.95), maxW / (longest * 0.48));
    const start = cy - ((lines.length - 1) * size * 0.95) / 2 + size * 0.35;
    return `<text x="${cx}" text-anchor="middle" font-family="Anton, Impact, sans-serif" font-size="${size.toFixed(1)}" fill="${p.ink}" letter-spacing="1">${
      lines.map((l, i) => `<tspan x="${cx}" y="${(start + i * size * 0.95).toFixed(1)}">${esc(l)}</tspan>`).join("")
    }</text>`;
  }
  const shade = p => (p.colour === "#111111" ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.06)");
  const bg = "#f5f5f5";

  const views = {
    front: p => `<svg viewBox="0 0 400 400" role="img" aria-label="${esc(p.name)} front"><rect width="400" height="400" fill="${bg}"/>
      <ellipse cx="200" cy="356" rx="120" ry="10" fill="rgba(0,0,0,.07)"/>
      <path d="${TEE}" fill="${p.colour}" stroke="rgba(0,0,0,.12)" stroke-width="1.5"/>
      <path d="M140 72 Q200 112 260 72" fill="none" stroke="${shade(p)}" stroke-width="8"/>
      <path d="M110 164 L110 240 M290 164 L290 240" stroke="${shade(p)}" stroke-width="4"/>
      ${graphicText(p, 200, 210, 130, 120)}</svg>`,
    back: p => `<svg viewBox="0 0 400 400" role="img" aria-label="${esc(p.name)} back"><rect width="400" height="400" fill="${bg}"/>
      <ellipse cx="200" cy="356" rx="120" ry="10" fill="rgba(0,0,0,.07)"/>
      <path d="${TEE_BACK}" fill="${p.colour}" stroke="rgba(0,0,0,.12)" stroke-width="1.5"/>
      <path d="M140 72 Q200 84 260 72" fill="none" stroke="${shade(p)}" stroke-width="6"/>
      <text x="200" y="112" text-anchor="middle" font-family="Anton, Impact, sans-serif" font-size="14" letter-spacing="3" fill="${p.ink}">AWEZA</text>
      <text x="200" y="128" text-anchor="middle" font-family="Inter, sans-serif" font-size="7" letter-spacing="2" fill="${p.ink}" opacity=".7">DESIGNED IN SOUTH AFRICA</text></svg>`,
    detail: p => `<svg viewBox="110 130 180 180" role="img" aria-label="${esc(p.name)} print detail"><rect x="0" y="0" width="400" height="400" fill="${p.colour}"/>
      ${graphicText(p, 200, 210, 130, 120)}</svg>`,
    label: p => `<svg viewBox="0 0 400 400" role="img" aria-label="AWEZA neck label"><rect width="400" height="400" fill="${p.colour}"/>
      <path d="M40 120 Q200 230 360 120" fill="none" stroke="${shade(p)}" stroke-width="26"/>
      <rect x="150" y="196" width="100" height="56" rx="3" fill="${p.colour === "#111111" ? "#f4f4f4" : "#111"}"/>
      <text x="200" y="231" text-anchor="middle" font-family="Anton, Impact, sans-serif" font-size="24" letter-spacing="2" fill="${p.colour === "#111111" ? "#111" : "#fff"}">AWEZA</text>
      <text x="200" y="300" text-anchor="middle" font-family="Inter, sans-serif" font-size="13" fill="${p.ink}" opacity=".6">100% COTTON · ${esc(p.colourName.toUpperCase())}</text></svg>`,
  };
  const VIEW_ORDER = ["front", "back", "detail", "label"];

  /* ---------- Cart (saved in this browser) ---------- */
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem("aweza-cart") || "[]"); } catch { cart = []; }
  cart = cart.filter(l => byId(l.id));
  const save = () => { try { localStorage.setItem("aweza-cart", JSON.stringify(cart)); } catch {} };
  const count = () => cart.reduce((n, l) => n + l.qty, 0);
  const subtotal = () => cart.reduce((n, l) => n + l.qty * byId(l.id).price, 0);
  const FREE_DELIVERY = 800, DELIVERY = 99;

  function addToCart(id, size) {
    const line = cart.find(l => l.id === id && l.size === size);
    line ? line.qty++ : cart.push({ id, size, qty: 1 });
    save(); renderCart(); openDrawer("cart");
  }

  function renderCart() {
    const n = count();
    const badge = $("#cartCount");
    badge.hidden = n === 0; badge.textContent = n;
    $("#cartBtn").setAttribute("aria-label", `Open cart, ${n} item${n === 1 ? "" : "s"}`);

    if (!cart.length) {
      $("#cartItems").innerHTML = `<div class="cart-empty"><p>Your bag is empty.</p><a class="btn" href="#/shop" data-close>Shop tees</a></div>`;
      $("#cartFoot").innerHTML = ""; return;
    }
    $("#cartItems").innerHTML = cart.map((l, i) => {
      const p = byId(l.id);
      return `<div class="cart-line">
        <a class="thumb" href="#/product/${p.id}" data-close>${views.front(p)}</a>
        <div><h3>${esc(p.name)}</h3><div class="meta">${esc(p.colourName)} · Size ${l.size}</div><div class="meta">${rand(p.price)}</div>
          <div class="row"><div class="qty"><button data-dec="${i}" aria-label="Decrease">−</button><span>${l.qty}</span><button data-inc="${i}" aria-label="Increase">+</button></div>
          <button class="remove" data-rm="${i}">Remove</button></div></div></div>`;
    }).join("");
    const sub = subtotal(), del = sub >= FREE_DELIVERY ? 0 : DELIVERY;
    $("#cartFoot").innerHTML = `
      <div class="sum"><span>Subtotal</span><span>${rand(sub)}</span></div>
      <div class="sum"><span>Delivery</span><span>${del ? rand(del) : "Free"}</span></div>
      ${del ? `<p class="note">Add ${rand(FREE_DELIVERY - sub)} more for free delivery.</p>` : ""}
      <div class="sum total"><span>Total</span><span>${rand(sub + del)}</span></div>
      <button class="btn block" id="checkoutBtn">Checkout</button>`;
  }

  $("#cartItems").addEventListener("click", e => {
    const t = e.target.closest("button"); if (!t) return;
    if (t.dataset.inc) cart[+t.dataset.inc].qty++;
    else if (t.dataset.dec) { const l = cart[+t.dataset.dec]; if (--l.qty < 1) cart.splice(+t.dataset.dec, 1); }
    else if (t.dataset.rm) cart.splice(+t.dataset.rm, 1);
    else return;
    save(); renderCart();
  });
  $("#cartFoot").addEventListener("click", e => {
    // Checkout gets wired to PayFast / Yoco / Paystack once the payment account is set up.
    if (e.target.id === "checkoutBtn") toast("Checkout is coming soon. Payments not connected yet.");
  });

  /* ---------- Drawers ---------- */
  function openDrawer(which) {
    closeDrawers();
    $(which === "cart" ? "#cartDrawer" : "#menuDrawer").classList.add("open");
    $("#overlay").classList.add("show"); document.body.classList.add("locked");
  }
  function closeDrawers() {
    $("#cartDrawer").classList.remove("open"); $("#menuDrawer").classList.remove("open");
    $("#overlay").classList.remove("show"); document.body.classList.remove("locked");
  }
  $("#cartBtn").onclick = () => openDrawer("cart");
  $("#menuBtn").onclick = () => openDrawer("menu");
  $("#overlay").onclick = closeDrawers;
  document.addEventListener("click", e => { if (e.target.closest("[data-close]")) closeDrawers(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeDrawers(); });

  let toastTimer;
  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
  }

  /* ---------- Nav ---------- */
  const navItems = [["New & Featured", "#/shop"], ...COLLECTIONS.map(c => [c.name, `#/shop/${c.id}`])];
  $("#navLinks").innerHTML = navItems.map(([n, h]) => `<a href="${h}">${n}</a>`).join("");
  $("#menuLinks").innerHTML = navItems.map(([n, h]) => `<a href="${h}" data-close>${n}<span>›</span></a>`).join("");

  /* ---------- Views ---------- */
  const card = p => `<a class="card" href="#/product/${p.id}">
    <div class="img">${views.front(p)}</div>
    <div class="info">${p.badge ? `<div class="badge">${p.badge}</div>` : ""}<h3>${esc(p.name)}</h3>
    <div class="sub">${esc(colName(p.collection))} · ${esc(p.colourName)}</div><div class="price">${rand(p.price)}</div></div></a>`;

  function home() {
    const feature = PRODUCTS.find(p => p.id === "aweza-core");
    const art = (c, i) => {
      const p = PRODUCTS.filter(x => x.collection === c.id)[0];
      return views.front({ ...p, colour: i % 2 ? "#f4f4f4" : "#111111", ink: i % 2 ? "#111" : "#fff" }).replace(`fill="${bg}"`, `fill="${i % 2 ? "#e9e9e9" : "#1c1c1c"}"`).replace("<svg ", `<svg preserveAspectRatio="xMidYMid slice" `);
    };
    app.innerHTML = `
      <section class="hero"><div class="hero-art" aria-hidden="true">AWEZA</div>
        <div class="hero-inner"><h1>Made in Mzansi.<br>Worn everywhere.</h1>
          <p>Bold tees for teens and adults who rep where they're from. Designed in South Africa, printed on demand.</p>
          <div class="ctas"><a class="btn light" href="#/shop">Shop all</a><a class="btn outline" href="#/shop/mzansi">Mzansi Originals</a></div></div></section>
      <section class="section"><div class="section-head"><h2>Shop by collection</h2></div>
        <div class="collections">${COLLECTIONS.map((c, i) => `
          <a class="collection-card ${i % 2 ? "light" : ""}" href="#/shop/${c.id}"><div class="art">${art(c, i)}</div>
          <div class="label"><p>${esc(c.tagline)}</p><h3>${esc(c.name)}</h3><span class="btn sm ${i % 2 ? "" : "light"}">Shop</span></div></a>`).join("")}</div></section>
      <section class="section"><div class="section-head"><h2>Trending now</h2><a href="#/shop">View all</a></div>
        <div class="shelf">${PRODUCTS.filter(p => p.badge).concat(PRODUCTS.filter(p => !p.badge)).slice(0, 8).map(card).join("")}</div></section>
      <section class="hero" style="min-height:60vh"><div class="hero-art" aria-hidden="true">ZA</div>
        <div class="hero-inner"><h1>The Core Tee</h1><p>Our everyday essential. ${rand(feature.price)}.</p>
        <div class="ctas"><a class="btn light" href="#/product/${feature.id}">Shop now</a></div></div></section>`;
  }

  function shop(colId) {
    const col = COLLECTIONS.find(c => c.id === colId);
    const list = col ? PRODUCTS.filter(p => p.collection === col.id) : PRODUCTS;
    app.innerHTML = `
      <div class="shop-head"><h1>${col ? esc(col.name) : "All Tees"}</h1><div class="count">${list.length} products</div></div>
      <div class="chips"><a class="chip ${col ? "" : "active"}" href="#/shop">All</a>${COLLECTIONS.map(c =>
        `<a class="chip ${col && col.id === c.id ? "active" : ""}" href="#/shop/${c.id}">${esc(c.name)}</a>`).join("")}</div>
      <div class="grid">${list.map(card).join("")}</div>`;
  }

  function product(id) {
    const p = byId(id);
    if (!p) return notFound();
    let size = null;
    const chev = d => `<svg viewBox="0 0 24 24"><path d="${d}"/></svg>`;
    const related = PRODUCTS.filter(x => x.collection === p.collection && x.id !== p.id);
    app.innerHTML = `
      <div class="pdp">
        <div class="gallery">
          <div class="thumbs">${VIEW_ORDER.map((v, i) => `<button data-go="${i}" class="${i ? "" : "on"}" aria-label="View ${v}">${views[v](p)}</button>`).join("")}</div>
          <div style="position:relative;min-width:0">
            <div class="slides" id="slides">${VIEW_ORDER.map(v => `<div class="slide">${views[v](p)}</div>`).join("")}</div>
            <button class="arrow prev" aria-label="Previous image">${chev("M15 5l-7 7 7 7")}</button>
            <button class="arrow next" aria-label="Next image">${chev("M9 5l7 7-7 7")}</button>
            <span class="swipe-hint" id="swipeHint">Swipe for more ›</span>
          </div>
          <div class="dots">${VIEW_ORDER.map((_, i) => `<button data-go="${i}" class="${i ? "" : "on"}" aria-label="Image ${i + 1}"></button>`).join("")}</div>
        </div>
        <div class="buybox">
          <a class="crumb" href="#/shop/${p.collection}">${esc(colName(p.collection))}</a>
          <h1>${esc(p.name)}</h1><div class="colour">${esc(p.colourName)}</div>
          <div class="price">${rand(p.price)}</div>
          <div class="size-head"><span>Select size</span><a href="#/help">Size guide</a></div>
          <div class="sizes" id="sizes">${SIZES.map(s => `<button data-size="${s}">${s}</button>`).join("")}</div>
          <div class="size-err" id="sizeErr" aria-live="polite"></div>
          <div class="actions" id="actions"><button class="btn block" id="addBtn">Add to Bag</button></div>
          <p class="desc">${esc(DESCRIPTION)}</p>
          <ul style="margin:12px 0 28px 20px;color:#444"><li>Colour: ${esc(p.colourName)}</li><li>Unisex, relaxed fit</li><li>Collection: ${esc(colName(p.collection))}</li></ul>
          <details><summary>Delivery & Returns</summary><p>Each tee is printed when you order it. Delivery across South Africa, free on orders over ${rand(FREE_DELIVERY)}. Returns accepted within 30 days for misprints or damaged items.</p></details>
          <details><summary>Size & Fit</summary><p>Unisex sizing. If you're between sizes or like a loose fit, go one size up.</p></details>
        </div>
      </div>
      ${related.length ? `<section class="section"><div class="section-head"><h2>You might also like</h2></div><div class="shelf">${related.map(card).join("")}</div></section>` : ""}
      <div class="sticky-buy" id="stickyBuy"><span class="p">${rand(p.price)}</span><button class="btn" id="stickyAdd">Add to Bag</button></div>`;

    // Swipe gallery
    const slides = $("#slides"), dots = app.querySelectorAll(".dots button"), thumbs = app.querySelectorAll(".thumbs button");
    const current = () => Math.round(slides.scrollLeft / slides.clientWidth);
    const go = i => slides.scrollTo({ left: Math.max(0, Math.min(VIEW_ORDER.length - 1, i)) * slides.clientWidth, behavior: "smooth" });
    slides.addEventListener("scroll", () => {
      const i = current();
      dots.forEach((d, j) => d.classList.toggle("on", i === j));
      thumbs.forEach((d, j) => d.classList.toggle("on", i === j));
      if (i > 0) $("#swipeHint")?.remove();
    }, { passive: true });
    app.querySelectorAll("[data-go]").forEach(b => b.onclick = () => go(+b.dataset.go));
    $(".arrow.prev").onclick = () => go(current() - 1);
    $(".arrow.next").onclick = () => go(current() + 1);

    // Sizes + add to bag
    $("#sizes").addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      size = b.dataset.size;
      $("#sizes").querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b));
      $("#sizes").classList.remove("error"); $("#sizeErr").textContent = "";
    });
    const add = () => {
      if (!size) {
        $("#sizes").classList.add("error"); $("#sizeErr").textContent = "Please select a size.";
        $("#sizes").scrollIntoView({ behavior: "smooth", block: "center" }); return;
      }
      addToCart(p.id, size);
    };
    $("#addBtn").onclick = add; $("#stickyAdd").onclick = add;

    // Sticky add-to-bag bar on phones once the main button scrolls away
    const sticky = $("#stickyBuy");
    new IntersectionObserver(([en]) => sticky.classList.toggle("show", !en.isIntersecting && en.boundingClientRect.top < 0))
      .observe($("#actions"));
  }

  function help() {
    app.innerHTML = `<div class="page"><h1>Help</h1>
      <h2>Delivery</h2><p>Every AWEZA tee is printed on demand when you order. Delivery takes roughly 5–10 working days in South Africa. Free delivery on orders over ${rand(FREE_DELIVERY)}, otherwise ${rand(DELIVERY)}.</p>
      <h2>Returns</h2><p>Misprinted or damaged? Contact us within 30 days and we'll replace it.</p>
      <h2>Size guide</h2><p>Unisex fit. Chest width (cm, laid flat): XS 46 · S 49 · M 52 · L 55 · XL 58 · XXL 61. Placeholder measurements: update to match your blank supplier.</p></div>`;
  }
  function notFound() { app.innerHTML = `<div class="page"><h1>Not found</h1><p>That page doesn't exist. <a href="#/shop" style="text-decoration:underline">Shop all tees</a>.</p></div>`; }

  /* ---------- Router ---------- */
  function route() {
    const [, page, arg] = (location.hash || "#/").split("/");
    closeDrawers();
    if (!page) home();
    else if (page === "shop") shop(arg);
    else if (page === "product") product(arg);
    else if (page === "help") help();
    else notFound();
    document.querySelectorAll(".nav-links a").forEach(a => a.classList.toggle("active", a.getAttribute("href") === location.hash));
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);
  $("#year").textContent = new Date().getFullYear();
  renderCart(); route();
})();
