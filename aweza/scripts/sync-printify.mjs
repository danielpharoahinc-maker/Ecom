#!/usr/bin/env node
// Regenerate data/printify-variants.json from the AWEZA Printify shop.
//
//   PRINTIFY_API_TOKEN=... node scripts/sync-printify.mjs            # write file
//   PRINTIFY_API_TOKEN=... node scripts/sync-printify.mjs --dry-run  # print diff only
//
// Read-only against Printify: it only GETs products. White, enabled variants
// only. Output shape (unchanged contract):
//   { "<catalogue id>": { printify_product_id, blueprint_id, print_provider_id,
//       sizes: { "<size>": { variant_id, cost_usd_cents } } } }
// Node 18+, no dependencies.

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

// ---- Printify product id -> AWEZA catalogue id --------------------------
// Most Printify titles are generic ("Unisex Heavy Cotton Tee"), so title
// matching alone is not enough. Add a line here when you create a product.
const OVERRIDES = {
  "6adf97ca78edb91ce70d22c8": "ceo-of-bad-decisions",
  "6adf973a87d17f67bf09cf72": "signature-lips",
  "6adf96a8260c17a8ff05d494": "zero-exes",
  "6adf9615c392daed6500e7f0": "captain-save",
  "6adf952c250930614e0f5c15": "sweet-cupcake",
  "6adf93fe250930614e0f5b4f": "need-a-hug",
  "6adf3e096048caed7507d374": "mini-lips",
};
const COLOUR = "White";
const API = "https://api.printify.com/v1";
const DEFAULT_SHOP_ID = "29483178";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_FILE = path.join(ROOT, "data", "printify-variants.json");
const PRODUCTS_JS = path.join(ROOT, "data", "products.js");

const argv = process.argv.slice(2);
const args = new Set(argv);
// --out <file> writes somewhere else (e.g. to preview the result); default is data/.
const outIdx = argv.indexOf("--out");
const OUT = outIdx >= 0 && argv[outIdx + 1] ? path.resolve(argv[outIdx + 1]) : DATA_FILE;
const DRY = args.has("--dry-run") || args.has("-n");
if (args.has("--help") || args.has("-h")) {
  console.log("Usage: PRINTIFY_API_TOKEN=... [PRINTIFY_SHOP_ID=...] node scripts/sync-printify.mjs [--dry-run] [--out file]");
  process.exit(0);
}

const die = (msg, code = 1) => { console.error("sync-printify: " + msg); process.exit(code); };

const token = process.env.PRINTIFY_API_TOKEN;
if (!token) die("PRINTIFY_API_TOKEN is not set. Create a token in Printify > Account > Connections and export it first.");
let shop = (process.env.PRINTIFY_SHOP_ID || "").trim();
if (!shop) { shop = DEFAULT_SHOP_ID; console.warn(`sync-printify: PRINTIFY_SHOP_ID not set, using the AWEZA shop ${DEFAULT_SHOP_ID}.`); }

function loadCatalogue() {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext("var window = this.window; var AW = window.AW = window.AW || {};\n" + fs.readFileSync(PRODUCTS_JS, "utf8"), sandbox, { timeout: 1000 });
  return sandbox.window.AW.products || [];
}

async function get(url) {
  for (let attempt = 1; ; attempt++) {
    let res;
    try {
      res = await fetch(url, { headers: { authorization: `Bearer ${token}`, "user-agent": "AWEZA-sync/1.0" } });
    } catch (e) {
      die(`could not reach Printify (${(e.cause && e.cause.code) || e.message}). Check your connection; behind a proxy run with NODE_USE_ENV_PROXY=1.`);
    }
    if (res.status === 401 || res.status === 403) die(`Printify said ${res.status}: the API token is wrong or expired, lacks the products.read scope, or the shop id is not on this account.`);
    if (res.status === 404) die(`Printify said 404: shop ${shop} was not found for this token. Check PRINTIFY_SHOP_ID.`);
    if (res.status === 429) {
      const wait = Math.min(60, Number(res.headers.get("retry-after")) || 5 * attempt);
      if (attempt >= 4) die("Printify rate limit (429) hit repeatedly. Wait a minute and run the script again.");
      console.warn(`sync-printify: rate limited (429), waiting ${wait}s...`);
      await new Promise(r => setTimeout(r, wait * 1000));
      continue;
    }
    if (!res.ok) die(`Printify request failed with HTTP ${res.status}.`);
    return res.json();
  }
}

async function fetchAllProducts() {
  const all = [];
  for (let page = 1; page <= 50; page++) {
    const data = await get(`${API}/shops/${encodeURIComponent(shop)}/products.json?limit=50&page=${page}`);
    const list = Array.isArray(data.data) ? data.data : [];
    all.push(...list);
    if (!data.next_page_url || page >= (data.last_page || page) || !list.length) break;
  }
  return all;
}

const norm = s => String(s || "").toLowerCase().replace(/[’'`]/g, "").replace(/\b(t-?shirt|tee|unisex)\b/g, "").replace(/[^a-z0-9]+/g, " ").trim();

function matchId(p, catalogue, previous) {
  if (OVERRIDES[p.id]) return OVERRIDES[p.id];
  const prev = Object.entries(previous).find(([, v]) => v && v.printify_product_id === p.id);
  if (prev) return prev[0];
  const t = norm(p.title);
  const hit = catalogue.find(c => norm(c.name) === t || norm(c.id) === t);
  return hit ? hit.id : null;
}

function sizeOf(variant, p) {
  // Prefer option ids; fall back to the "Colour / Size" title.
  const sizeOpt = (p.options || []).find(o => o.type === "size");
  const colourOpt = (p.options || []).find(o => o.type === "color");
  let colour = null, size = null;
  for (const id of variant.options || []) {
    const s = sizeOpt && sizeOpt.values.find(v => v.id === id);
    const c = colourOpt && colourOpt.values.find(v => v.id === id);
    if (s) size = s.title;
    if (c) colour = c.title;
  }
  if (!size || !colour) {
    const [c, s] = String(variant.title || "").split(" / ");
    colour = colour || c; size = size || s;
  }
  return { colour: (colour || "").trim(), size: (size || "").trim() };
}

function build(products, catalogue, previous) {
  const out = {};
  const warnings = [];
  for (const p of products) {
    if (p.is_deleted) continue;
    const id = matchId(p, catalogue, previous);
    if (!id) { warnings.push(`unmatched Printify product ${p.id} "${p.title}" (add it to OVERRIDES)`); continue; }
    const cat = catalogue.find(c => c.id === id);
    if (!cat) warnings.push(`${id} is mapped but not in data/products.js`);
    if (out[id]) { warnings.push(`${id} matched more than one Printify product; keeping the first`); continue; }
    const sizes = {};
    for (const v of p.variants || []) {
      if (!v.is_enabled) continue;
      const { colour, size } = sizeOf(v, p);
      if (colour.toLowerCase() !== COLOUR.toLowerCase() || !size) continue;
      sizes[size] = { variant_id: v.id, cost_usd_cents: v.cost };
    }
    if (!Object.keys(sizes).length) { warnings.push(`${id}: no enabled ${COLOUR} variants`); continue; }
    if (cat) {
      const missing = cat.sizes.filter(s => !sizes[s]);
      if (missing.length) warnings.push(`${id}: storefront sizes without a Printify variant: ${missing.join(", ")} (these will be rejected at checkout)`);
    }
    out[id] = { printify_product_id: p.id, blueprint_id: p.blueprint_id, print_provider_id: p.print_provider_id, sizes };
  }
  for (const c of catalogue) if (!out[c.id]) warnings.push(`${c.id} is in the catalogue but has no Printify product`);
  return { out, warnings };
}

function diff(before, after) {
  const lines = [];
  const ids = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const id of ids) {
    const a = before[id], b = after[id];
    if (!a) { lines.push(`+ ${id} (new, ${Object.keys(b.sizes).length} sizes)`); continue; }
    if (!b) { lines.push(`- ${id} (removed)`); continue; }
    for (const k of ["printify_product_id", "blueprint_id", "print_provider_id"]) if (a[k] !== b[k]) lines.push(`~ ${id}.${k}: ${a[k]} -> ${b[k]}`);
    const sizes = new Set([...Object.keys(a.sizes || {}), ...Object.keys(b.sizes || {})]);
    for (const s of sizes) {
      const x = (a.sizes || {})[s], y = (b.sizes || {})[s];
      if (!x) lines.push(`+ ${id}.${s}: variant ${y.variant_id}, $${(y.cost_usd_cents / 100).toFixed(2)}`);
      else if (!y) lines.push(`- ${id}.${s}`);
      else if (x.variant_id !== y.variant_id || x.cost_usd_cents !== y.cost_usd_cents)
        lines.push(`~ ${id}.${s}: variant ${x.variant_id} -> ${y.variant_id}, cost ${x.cost_usd_cents} -> ${y.cost_usd_cents}`);
    }
  }
  return lines;
}

const catalogue = loadCatalogue();
let previous = {};
try { previous = JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); } catch { previous = {}; }

const products = await fetchAllProducts();
const { out, warnings } = build(products, catalogue, previous);
for (const w of warnings) console.warn("warning: " + w);

const changes = diff(previous, out);
const text = JSON.stringify(out, null, 1); // matches the existing file's formatting
console.log(`sync-printify: ${products.length} Printify products, ${Object.keys(out).length} mapped.`);
if (!changes.length) console.log("No changes.");
else console.log(changes.join("\n"));

if (DRY) {
  console.log("Dry run: nothing written.");
} else if (!Object.keys(out).length) {
  die("Nothing mapped; refusing to overwrite data/printify-variants.json.");
} else if (changes.length || OUT !== DATA_FILE) {
  fs.writeFileSync(OUT, text);
  console.log(`Wrote ${path.relative(ROOT, OUT)}.`);
}
