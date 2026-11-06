/* AWEZA core: shared helpers, cart state, router, events. OWNED BY THE INTEGRATOR. Do not edit.
   Public API (use only these):
     AW.$(sel, el?)  AW.$$(sel, el?)  AW.esc(str)  AW.rand(n) -> "R649"
     AW.byId(id)  AW.colName(id)  AW.priceFor(product, size)  AW.config  AW.products  AW.collections
     AW.app                          the <main id="app"> element
     AW.route(name, fn(app, arg))    register a page. URLs are #/name/arg. Home is name "". Not-found is "404".
     AW.go(hash)                     navigate
     AW.cart.lines() -> [{id,size,qty}]  .add(id,size)  .setQty(i,q)  .remove(i)
            .count()  .subtotal()  .delivery()  .total()
     AW.on(evt, fn)  AW.emit(evt, detail)
       events: "route" {page,arg} after a page renders; "cart" after any cart change;
               "cart:added" {id,size} after add(); "toast" {msg}; "cart:open" request to open the bag
     AW.toast(msg)
   Script load order: data/products.js, js/core.js, other modules, then js/boot.js (calls AW.start()). */
(() => {
  const AW = window.AW;
  AW.$ = (s, el = document) => el.querySelector(s);
  AW.$$ = (s, el = document) => [...el.querySelectorAll(s)];
  AW.esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  AW.rand = n => "R" + Math.round(n).toLocaleString("en-ZA").replace(/[  ]/g, " ");
  AW.byId = id => AW.products.find(p => p.id === id);
  AW.colName = id => (AW.collections.find(c => c.id === id) || {}).name || "";

  const bus = new EventTarget();
  AW.on = (e, fn) => bus.addEventListener(e, ev => fn(ev.detail));
  AW.emit = (e, detail) => bus.dispatchEvent(new CustomEvent(e, { detail }));
  AW.toast = msg => AW.emit("toast", { msg });

  // Cart (saved in this browser)
  const KEY = "aweza-cart-v2";
  let lines = [];
  try { lines = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { lines = []; }
  if (!Array.isArray(lines)) lines = [];
  lines = lines.filter(l => l && AW.byId(l.id));
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch {} AW.emit("cart"); };
  AW.cart = {
    lines: () => lines.map(l => ({ ...l })),
    add(id, size) {
      const l = lines.find(x => x.id === id && x.size === size);
      l ? (l.qty = Math.min(l.qty + 1, 20)) : lines.push({ id, size, qty: 1 });
      save(); AW.emit("cart:added", { id, size });
    },
    setQty(i, q) { if (!lines[i]) return; if (q < 1) lines.splice(i, 1); else lines[i].qty = Math.min(q, 20); save(); },
    remove(i) { lines.splice(i, 1); save(); },
    count: () => lines.reduce((n, l) => n + l.qty, 0),
    subtotal: () => lines.reduce((n, l) => n + l.qty * AW.priceFor(AW.byId(l.id), l.size), 0),
    delivery() { const s = this.subtotal(); return !s || s >= AW.config.freeDeliveryOver ? 0 : AW.config.delivery; },
    total() { return this.subtotal() + this.delivery(); },
  };

  // Router
  const routes = {};
  AW.app = document.getElementById("app");
  AW.route = (name, fn) => { routes[name] = fn; };
  AW.go = h => { location.hash = h; };
  function render() {
    const [, page = "", arg] = (location.hash || "#/").split("/");
    const fn = routes[page] || routes["404"] || (app => { app.innerHTML = "<p style='padding:40px'>Not found</p>"; });
    AW.app.innerHTML = "";
    fn(AW.app, arg ? decodeURIComponent(arg) : undefined);
    window.scrollTo(0, 0);
    AW.emit("route", { page, arg });
  }
  AW.start = () => { window.addEventListener("hashchange", render); render(); AW.emit("cart"); };
})();
