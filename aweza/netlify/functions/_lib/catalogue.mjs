// Shared catalogue + order logic for the AWEZA Netlify functions.
// Loads data/products.js (a browser script) inside a vm sandbox, and
// data/printify-variants.json, so the server prices orders from the same
// source of truth as the storefront. Node built-ins only.
//
// The _lib folder has no index/_lib.mjs file, so Netlify does not deploy it
// as a function; esbuild bundles this module into each function importing it.

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

export const PROVINCES = [
  "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo",
  "Mpumalanga", "Northern Cape", "North West", "Western Cape",
];

export const LIMITS = { maxLines: 20, maxQty: 20 };

// Resolve the data/ folder for `netlify dev`, production (included_files
// lands next to the bundled function under LAMBDA_TASK_ROOT) and local tests.
function dataDirCandidates() {
  const out = [];
  if (process.env.AWEZA_DATA_DIR) out.push(process.env.AWEZA_DATA_DIR);
  let here = "";
  try { here = path.dirname(fileURLToPath(import.meta.url)); } catch { /* bundled without url */ }
  if (here) {
    // walk up from this file (or the bundled function file) looking for data/
    let dir = here;
    for (let i = 0; i < 6; i++) { out.push(path.join(dir, "data")); dir = path.dirname(dir); }
  }
  if (process.env.LAMBDA_TASK_ROOT) out.push(path.join(process.env.LAMBDA_TASK_ROOT, "data"));
  out.push(path.join(process.cwd(), "data"));
  return out;
}

function findDataDir() {
  for (const dir of dataDirCandidates()) {
    try {
      if (fs.existsSync(path.join(dir, "products.js")) && fs.existsSync(path.join(dir, "printify-variants.json"))) return dir;
    } catch { /* try next */ }
  }
  throw new Error("catalogue data folder not found");
}

let cached = null;

/** Load the catalogue. Cached per function instance (warm starts reuse it). */
export function loadCatalogue({ fresh = false } = {}) {
  if (cached && !fresh) return cached;
  const dir = findDataDir();
  const src = fs.readFileSync(path.join(dir, "products.js"), "utf8");
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  // products.js does `window.AW = window.AW || {}` then uses bare `AW`.
  // In the sandbox, bare `AW` must resolve, so expose window as the global too.
  vm.runInContext("var window = this.window; var AW = window.AW = window.AW || {};\n" + src, sandbox, {
    filename: "products.js",
    timeout: 1000,
  });
  const AW = sandbox.window.AW || {};
  const products = Array.isArray(AW.products) ? AW.products : [];
  const config = AW.config || {};
  if (!products.length || typeof config.delivery !== "number") throw new Error("catalogue failed to load");
  const upcharge = config.sizeUpcharge || {};
  // Re-implement priceFor here rather than call the sandboxed one, so a
  // change in products.js cannot run arbitrary logic on the server. It
  // mirrors AW.priceFor exactly: base price + size upcharge, in Rand.
  const priceFor = (p, size) => p.price + ((size && upcharge[size]) || 0);
  const variants = JSON.parse(fs.readFileSync(path.join(dir, "printify-variants.json"), "utf8"));
  const byId = new Map(products.map(p => [p.id, p]));
  cached = { products, config, priceFor, variants, byId, dataDir: dir };
  return cached;
}

// ---------- validation ----------

export class ValidationError extends Error {
  constructor(message) { super(message); this.name = "ValidationError"; }
}

const CTRL = /[\u0000-\u001f\u007f]/;
const str = (v, field, { min = 1, max = 120, optional = false } = {}) => {
  if (v == null || v === "") {
    if (optional) return "";
    throw new ValidationError(`Please fill in your ${field}.`);
  }
  if (typeof v !== "string") throw new ValidationError(`Please check your ${field}.`);
  const s = v.trim().replace(/\s+/g, " ");
  if (!optional && s.length < min) throw new ValidationError(`Please fill in your ${field}.`);
  if (s.length > max) throw new ValidationError(`Your ${field} is too long.`);
  if (CTRL.test(s)) throw new ValidationError(`Please check your ${field}.`);
  return s;
};

/**
 * Validate the order object from the browser (DIRECTION §11) and return a
 * clean, server-trusted order. Browser totals are ignored entirely.
 */
export function validateOrder(input, cat = loadCatalogue(), { skipDrop = false } = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new ValidationError("Something is off with your order. Refresh and try again.");
  const { byId, variants } = cat;

  const rawLines = input.lines;
  if (!Array.isArray(rawLines) || rawLines.length < 1) throw new ValidationError("Your bag is empty.");
  if (rawLines.length > LIMITS.maxLines) throw new ValidationError(`That is a lot of shirts. Keep it to ${LIMITS.maxLines} lines per order.`);

  const merged = new Map();
  for (const l of rawLines) {
    if (!l || typeof l !== "object") throw new ValidationError("Something is off with your bag. Refresh and try again.");
    const p = typeof l.id === "string" ? byId.get(l.id) : null;
    if (!p) throw new ValidationError("One of the items in your bag is no longer available. Remove it and try again.");
    const size = l.size;
    const pv = variants[p.id];
    if (typeof size !== "string" || !p.sizes.includes(size) || !pv || !pv.sizes || !pv.sizes[size]) {
      throw new ValidationError(`${p.name} is not available in size ${String(size).slice(0, 8)}. Pick another size.`);
    }
    const qty = l.qty;
    if (!Number.isInteger(qty) || qty < 1 || qty > LIMITS.maxQty) throw new ValidationError(`Quantities must be between 1 and ${LIMITS.maxQty}.`);
    const key = `${p.id}|${size}`;
    const prev = merged.get(key);
    const total = (prev ? prev.qty : 0) + qty;
    if (total > LIMITS.maxQty) throw new ValidationError(`Quantities must be between 1 and ${LIMITS.maxQty}.`);
    merged.set(key, { id: p.id, size, qty: total });
  }
  const lines = [...merged.values()];

  const c = input.customer || {};
  const email = str(c.email, "email address", { max: 254 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new ValidationError("Please enter a valid email address.");
  const phoneRaw = str(c.phone, "mobile number", { max: 24 });
  if (!/^\+?[\d\s()-]+$/.test(phoneRaw)) throw new ValidationError("Please enter a valid mobile number.");
  const digits = phoneRaw.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 15) throw new ValidationError("Please enter a valid mobile number.");
  const phone = phoneRaw.startsWith("+") ? "+" + digits : digits;
  const firstName = str(c.firstName, "first name", { max: 60 });
  const lastName = str(c.lastName, "last name", { max: 60 });

  const a = input.address || {};
  const line1 = str(a.line1, "street address", { min: 3, max: 120 });
  const line2 = str(a.line2, "apartment or complex", { max: 120, optional: true });
  const suburb = str(a.suburb, "suburb", { max: 80, optional: true });
  const city = str(a.city, "city", { min: 2, max: 80 });
  const province = typeof a.province === "string" ? a.province.trim() : "";
  if (!PROVINCES.includes(province)) throw new ValidationError("Please choose your province.");
  const postalCode = typeof a.postalCode === "string" || typeof a.postalCode === "number" ? String(a.postalCode).trim() : "";
  if (!/^\d{4}$/.test(postalCode)) throw new ValidationError("Postal codes have 4 digits.");
  if (a.country != null && a.country !== "ZA") throw new ValidationError("We only deliver within South Africa for now.");

  const notes = str(input.notes, "delivery notes", { max: 300, optional: true });
  const ref = typeof input.ref === "string" && REF_RE.test(input.ref) ? input.ref : "";

  // Limited drop: after its end date the shop stops taking orders (end of day, South African time).
  const drop = cat.config.drop;
  if (!skipDrop && drop && drop.ends && Date.parse(drop.ends + "T23:59:59+02:00") < Date.now()) {
    throw new ValidationError(`${drop.name || "This drop"} has closed. Thanks for the love.`);
  }

  return {
    lines,
    customer: { email, phone, firstName, lastName },
    address: { line1, line2, suburb, city, province, postalCode, country: "ZA" },
    notes,
    ref,
  };
}

/** Server-side money. Rand integers in, cents out. Never trusts the browser. */
export function priceOrder(lines, cat = loadCatalogue(), ref = "") {
  const { byId, config, priceFor } = cat;
  let subtotal = 0;
  const priced = lines.map(l => {
    const p = byId.get(l.id);
    if (!p) throw new ValidationError("One of the items in your bag is no longer available.");
    const unit = priceFor(p, l.size);
    subtotal += unit * l.qty;
    return { ...l, name: p.name, unit };
  });
  // Multi-buy, mirroring AW.dealDiscount in js/core.js: sets of deal.qty tees (dearest base prices together)
  // cost deal.price; size extras are paid on top.
  const deals = (Array.isArray(config.deals) ? config.deals : []).filter(d => Number.isInteger(d.qty) && d.qty > 1 && Number.isInteger(d.price) && d.price > 0);
  const units = [];
  priced.forEach(l => { const p = byId.get(l.id); if (!p.noDeal) for (let k = 0; k < l.qty; k++) units.push(p.price); });
  units.sort((a, b) => b - a);
  const best = new Array(units.length + 1).fill(0);
  for (let i = 1; i <= units.length; i++) {
    best[i] = best[i - 1];
    for (const d of deals) if (i >= d.qty) best[i] = Math.max(best[i], best[i - d.qty] + Math.max(0, units.slice(i - d.qty, i).reduce((a, b) => a + b, 0) - d.price));
  }
  let discount = best[units.length];
  // Refer a friend: a well-formed code takes a flat amount off an order that is big enough.
  const rf = config.referral;
  const referral = rf && ref && REF_RE.test(ref) && subtotal - discount >= rf.minSubtotal ? rf.amount : 0;
  discount += referral;
  const net = subtotal - discount;
  const delivery = !net || net >= config.freeDeliveryOver ? 0 : config.delivery;
  const total = net + delivery;
  return {
    lines: priced,
    subtotal, discount, referral, delivery, total,
    subtotalCents: subtotal * 100,
    discountCents: discount * 100,
    deliveryCents: delivery * 100,
    totalCents: total * 100,
    currency: "ZAR",
  };
}

// ---------- compact fulfilment payload carried in Yoco metadata ----------
// Yoco documents metadata as "map from string to any" with no published size
// limit, so we keep it small (a few hundred bytes) and store it as one JSON
// string. MAX_METADATA_CHARS is a self-imposed guard.

export const MAX_METADATA_CHARS = 3000;
export const REF_RE = /^[A-Za-z0-9]{4,16}$/;

export function packOrder(order, pricing, cat = loadCatalogue()) {
  const { variants } = cat;
  const o = {
    v: 1,
    l: order.lines.map(l => [l.id, l.size, l.qty, variants[l.id].sizes[l.size].variant_id]),
    c: [order.customer.firstName, order.customer.lastName, order.customer.email, order.customer.phone],
    a: [order.address.line1, order.address.line2, order.address.suburb, order.address.city, order.address.province, order.address.postalCode],
    t: pricing.totalCents,
  };
  if (order.notes) o.n = order.notes;
  if (order.ref) o.r = order.ref;
  return JSON.stringify(o);
}

export function unpackOrder(json) {
  const o = typeof json === "string" ? JSON.parse(json) : json;
  if (!o || o.v !== 1 || !Array.isArray(o.l) || !Array.isArray(o.c) || !Array.isArray(o.a)) throw new Error("unrecognised order metadata");
  return {
    lines: o.l.map(([id, size, qty, variantId]) => ({ id, size, qty, variantId })),
    customer: { firstName: o.c[0], lastName: o.c[1], email: o.c[2], phone: o.c[3] },
    address: { line1: o.a[0], line2: o.a[1], suburb: o.a[2], city: o.a[3], province: o.a[4], postalCode: o.a[5], country: "ZA" },
    notes: o.n || "",
    ref: o.r || "",
    totalCents: o.t,
  };
}
