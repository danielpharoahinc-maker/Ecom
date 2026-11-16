#!/usr/bin/env node
// AWEZA setup CLI: connects Printify, Paystack, Resend and your site, and checks that everything works.
//
//   node scripts/aweza.mjs doctor [--site https://your-domain.com]   check every connection (safe, read-only)
//   node scripts/aweza.mjs setup                                     guided set-up (asks a few questions)
//   node scripts/aweza.mjs webhooks https://your-domain.com          register the Printify shipped/delivered events
//   node scripts/aweza.mjs status | orders [N] | launch | deploy   run the whole business from one place
//   node scripts/aweza.mjs sync                                      refresh Printify product ids and costs
//
// Keys are read from environment variables (never from files, never printed):
//   PRINTIFY_API_TOKEN   PAYSTACK_SECRET_KEY   RESEND_API_KEY   (and optional PRINTIFY_SHOP_ID, SITE_URL)
// Node 18+, no packages. Run it from your own computer in the aweza/ folder.

import readline from "node:readline";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { register } from "./register-printify-webhooks.mjs";

let SITE_ARG = "";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHOP = process.env.PRINTIFY_SHOP_ID || "29483178";
const ok = m => console.log("  \x1b[32m✔\x1b[0m " + m), bad = m => console.log("  \x1b[31m✖\x1b[0m " + m), note = m => console.log("  • " + m), head = m => console.log("\n\x1b[1m" + m + "\x1b[0m");
let problems = 0; const fail = m => { problems++; bad(m); };

async function api(url, token, opts = {}) {
  try {
    const res = await fetch(url, { ...opts, headers: { authorization: "Bearer " + token, "content-type": "application/json", "user-agent": "AWEZA-cli/1.0", ...(opts.headers || {}) } });
    const text = await res.text(); let data; try { data = JSON.parse(text); } catch { data = text; }
    return { status: res.status, data };
  } catch (e) { return { status: 0, data: String(e && e.message) }; }
}

// ---------------------------------------------------------------- doctor
async function checkPrintify() {
  head("Printify");
  const t = process.env.PRINTIFY_API_TOKEN;
  if (!t) return fail("PRINTIFY_API_TOKEN is not set (Printify, Account, Connections, Generate token).");
  const shops = await api("https://api.printify.com/v1/shops.json", t);
  if (shops.status !== 200) return fail(`Printify refused the token (HTTP ${shops.status}). Make a new one.`);
  const shop = (Array.isArray(shops.data) ? shops.data : []).find(s => String(s.id) === String(SHOP));
  shop ? ok(`Connected. Shop "${shop.title}" (${SHOP}), channel ${shop.sales_channel}`) : fail(`Token works but shop ${SHOP} was not found in it.`);
  const prods = await api(`https://api.printify.com/v1/shops/${SHOP}/products.json?limit=50`, t);
  const list = (prods.data && prods.data.data) || [];
  ok(`${list.length} product(s) in the shop`);
  let map = {}; try { map = JSON.parse(fs.readFileSync(path.join(ROOT, "data/printify-variants.json"), "utf8")); } catch { return fail("data/printify-variants.json is missing: run `node scripts/aweza.mjs sync`."); }
  const byId = new Map(list.map(p => [p.id, p]));
  let drift = 0;
  for (const [slug, v] of Object.entries(map)) {
    const p = byId.get(v.printify_product_id);
    if (!p) { fail(`${slug}: product ${v.printify_product_id} is no longer in Printify`); continue; }
    for (const [size, sv] of Object.entries(v.sizes)) {
      const live = p.variants.find(x => x.id === sv.variant_id && x.is_enabled);
      if (!live) { drift++; bad(`${slug} ${size}: variant is disabled or gone in Printify`); }
      else if (live.cost !== sv.cost_usd_cents) { drift++; bad(`${slug} ${size}: cost changed $${(sv.cost_usd_cents / 100).toFixed(2)} -> $${(live.cost / 100).toFixed(2)}`); }
    }
  }
  const mapped = new Set(Object.values(map).map(v => v.printify_product_id));
  for (const p of list) if (!mapped.has(p.id)) note(`New in Printify and not on the site yet: "${p.title}" (${p.id})`);
  drift ? (problems++, note("Fix: node scripts/aweza.mjs sync")) : ok("Product ids and costs match the site");
  const wh = await api(`https://api.printify.com/v1/shops/${SHOP}/webhooks.json`, t);
  const hooks = Array.isArray(wh.data) ? wh.data : (wh.data && wh.data.data) || [];
  const site = SITE_ARG || process.env.SITE_URL || "";
  const mine = site ? new URL("/.netlify/functions/printify-webhook", site).href : "";
  const ours = ["order:shipment:created", "order:shipment:delivered"].filter(tp => hooks.some(h => h.topic === tp && h.url === mine));
  if (mine) ours.length === 2 ? ok("Shipped and delivered events go to your site") : note("Shipped/delivered events do NOT go to your site yet: node scripts/aweza.mjs webhooks " + site);
  else note("Add --site to check that Printify's shipped/delivered events go to your site.");
  const foreign = [...new Set(hooks.filter(h => h.url !== mine).map(h => { try { return new URL(h.url).hostname; } catch { return h.url; } }))];
  if (foreign.length) { problems++; bad(`Another service receives this shop's order events: ${foreign.join(", ")} (${hooks.filter(h => h.url !== mine).length} subscriptions). If you are not using it, disconnect it in Printify (My stores / Connections).`); }
  note("Printify can't be checked for a saved card or Premium by the API: look at printify.com/app/account/payment/details");
}

async function checkPaystack() {
  head("Paystack");
  const k = process.env.PAYSTACK_SECRET_KEY;
  if (!k) return note("PAYSTACK_SECRET_KEY is not set here (it lives in Netlify; set it in this shell only to test the connection).");
  if (!/^sk_(test|live)_/.test(k)) return fail("PAYSTACK_SECRET_KEY must start with sk_test_ or sk_live_ (the SECRET key, not pk_).");
  note(k.startsWith("sk_live_") ? "LIVE key: real money" : "TEST key: no real money (use this until you have placed a test order)");
  const r = await api("https://api.paystack.co/balance", k);
  if (r.status === 401 || r.status === 403) fail(`Paystack rejected the key (HTTP ${r.status}).`);
  else if (r.status === 0) fail("Could not reach Paystack: " + r.data);
  else ok("Paystack accepted the key");
}

async function checkResend() {
  head("Email (Resend)");
  const k = process.env.RESEND_API_KEY;
  if (!k) return note("RESEND_API_KEY is not set here. Emails stay off until it (and MAIL_FROM) are set in Netlify.");
  const r = await api("https://api.resend.com/domains", k);
  if (r.status === 200) {
    const d = (r.data && r.data.data) || [];
    d.length ? d.forEach(x => (x.status === "verified" ? ok : bad)(`Domain ${x.name}: ${x.status}`)) : fail("Key works but no domain is added yet (Resend, Domains).");
    if (d.some(x => x.status !== "verified")) problems++;
  } else if (r.status === 401 && JSON.stringify(r.data).includes("restricted")) ok("Key is valid (send-only); domain status can't be read with it");
  else fail(`Resend rejected the key (HTTP ${r.status}).`);
}

async function checkSite(site) {
  head("Your live site: " + site);
  const u = p => new URL(p, site).href;
  const get = async p => { try { const r = await fetch(u(p), { redirect: "manual" }); return r; } catch (e) { return { status: 0, headers: new Headers(), err: String(e.message) }; } };
  const home = await get("/");
  if (!home.status) return fail("Cannot reach the site: " + home.err);
  home.status === 200 ? ok("Home page loads over HTTPS") : fail(`Home page answered HTTP ${home.status}`);
  home.headers.get("content-security-policy") ? ok("Security headers are on (Content-Security-Policy)") : fail("Security headers are missing: is netlify.toml deployed?");
  const priv = await get("/data/printify-variants.json"); priv.status === 404 ? ok("Wholesale cost file is not public") : fail(`/data/printify-variants.json is PUBLIC (HTTP ${priv.status})`);
  const fn = async (name, method = "POST") => { try { const r = await fetch(u("/.netlify/functions/" + name), { method, headers: { "content-type": "application/json" }, body: method === "POST" ? "{}" : undefined }); return r.status; } catch { return 0; } };
  const co = await fn("create-checkout", "GET"); co === 405 ? ok("Checkout function is live") : fail(`Checkout function answered ${co} (expected 405 for a GET)`);
  const yw = await fn("paystack-webhook"); yw === 401 ? ok("Paystack webhook is live and rejects unsigned calls") : yw === 500 ? fail("Paystack webhook says PAYSTACK_SECRET_KEY is not set in Netlify") : fail(`Paystack webhook answered ${yw}`);
  const pw = await fn("printify-webhook"); pw === 401 ? ok("Printify webhook is live and rejects unsigned calls") : pw === 500 ? fail("Printify webhook says PRINTIFY_WEBHOOK_SECRET is not set in Netlify") : fail(`Printify webhook answered ${pw}`);
  const tr = await fn("track-order"); tr === 404 || tr === 429 ? ok("Tracking function is live") : fail(`Tracking function answered ${tr}`);
}

async function doctor(args) {
  const i = args.indexOf("--site"); const site = (i >= 0 ? args[i + 1] : process.env.SITE_URL) || ""; SITE_ARG = site;
  console.log("AWEZA doctor: read-only checks. Nothing is changed.");
  head("This computer"); Number(process.versions.node.split(".")[0]) >= 18 ? ok("Node " + process.versions.node) : fail("Node 18 or newer is needed");
  await checkPrintify(); await checkPaystack(); await checkResend();
  site ? await checkSite(site) : (head("Your live site"), note("Add --site https://your-domain.com (or set SITE_URL) to test the live site."));
  head("Result"); problems ? console.log(`  ${problems} thing(s) need attention (see ✖ above).`) : console.log("  All good.");
  process.exitCode = problems ? 1 : 0;
}

// ---------------------------------------------------------------- setup (survey style)
function ask(q, { secret = false, def = "" } = {}) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    process.stdout.write(q + (def ? ` [${def}]` : "") + ": ");
    if (secret) rl._writeToOutput = s => { if (/[\r\n]/.test(s)) process.stdout.write(s); else process.stdout.write("*".repeat(s.length)); };
    rl.question("", a => { rl.close(); if (secret) process.stdout.write("\n"); resolve(a.trim() || def); });
  });
}
async function choose(q, options) {
  console.log("\n" + q); options.forEach((o, i) => console.log(`  ${i + 1}) ${o}`));
  for (;;) { const a = Number(await ask("Pick a number")); if (a >= 1 && a <= options.length) return a - 1; }
}
const yes = async q => (await choose(q, ["Yes", "No"])) === 0;

async function setup() {
  console.log("\x1b[1mAWEZA setup\x1b[0m: a few questions, then I connect everything.\n");
  if (!process.env.PRINTIFY_API_TOKEN) process.env.PRINTIFY_API_TOKEN = await ask("Printify API token (Account, Connections)", { secret: true });
  await checkPrintify();
  const site = await ask("\nYour site address, e.g. https://getaweza.com (blank = not live yet)", { def: process.env.SITE_URL || "" });
  const out = {};
  if (await yes("Refresh Printify product ids and costs into the site now?")) {
    const r = spawnSync(process.execPath, [path.join(ROOT, "scripts/sync-printify.mjs")], { stdio: "inherit", env: process.env }); r.status === 0 ? ok("Synced") : fail("Sync failed (see above)");
  }
  if (site) {
    if (await yes("Register the Printify shipped/delivered events for " + site + "?")) {
      try { const r = await register(site); ok("Printify will call " + r.url); if (r.done.length) out.PRINTIFY_WEBHOOK_SECRET = r.secret; } catch (e) { fail(e.message); }
    }
    note("Paystack webhook (cannot be set by API): in the Paystack dashboard open Settings > API Keys & Webhooks and paste this as the Live and Test webhook URL:");
    note("  " + new URL("/.netlify/functions/paystack-webhook", site).href);
    out.PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || await ask("Paystack SECRET key (sk_test_... first, blank to skip)", { secret: true });
  }
  if (await yes("Check email (Resend) now?")) { process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || await ask("Resend API key", { secret: true }); await checkResend(); out.RESEND_API_KEY = process.env.RESEND_API_KEY; if (site) out.MAIL_FROM = "AWEZA <orders@" + new URL(site).hostname.replace(/^www\./, "") + ">"; }
  if (site) out.SITE_URL = site; out.PRINTIFY_API_TOKEN = process.env.PRINTIFY_API_TOKEN; out.PRINTIFY_SHOP_ID = SHOP;
  head("Put these in Netlify (Site configuration, Environment variables, mark as secret), then redeploy");
  for (const [k, v] of Object.entries(out)) console.log(`  ${k}=${v}`);
  note("These are secrets: do not paste them anywhere public or commit them.");
  if (spawnSync("netlify", ["--version"], { stdio: "ignore" }).status === 0 && await yes("Set them in Netlify automatically (needs `netlify login` and `netlify link` done)?")) {
    for (const [k, v] of Object.entries(out)) { const r = spawnSync("netlify", ["env:set", k, v, "--secret"], { stdio: "ignore" }); (r.status === 0 ? ok : bad)(k); }
  }
  console.log("\nNext: redeploy, then run:  node scripts/aweza.mjs doctor --site " + (site || "https://your-domain"));
}

// ---------------------------------------------------------------- orders / status / launch / deploy
const PF = "https://api.printify.com/v1";
async function orders(args) {
  const t = process.env.PRINTIFY_API_TOKEN; if (!t) { console.error("Set PRINTIFY_API_TOKEN first."); process.exit(1); }
  const n = Number(args[0]) || 10;
  const r = await api(`${PF}/shops/${SHOP}/orders.json?limit=${n}`, t);
  if (r.status !== 200) return fail(`Printify answered ${r.status}`);
  const list = r.data.data || []; head(`Latest ${list.length} order(s) of ${r.data.total ?? list.length}`);
  for (const o of list) {
    const ship = (o.shipments || [])[0];
    console.log(`  ${String(o.id).slice(-8)}  ${String(o.created_at || "").slice(0, 10)}  ${(o.status || "").padEnd(12)} ${o.address_to ? o.address_to.first_name + " " + (o.address_to.last_name || "") : ""}${ship && ship.tracking_number ? "  tracking " + ship.tracking_number : ""}`);
  }
}
async function status(args) {
  console.log("AWEZA status");
  await orders(["5"]);
  const t = process.env.PRINTIFY_API_TOKEN;
  if (t) { const p = await api(`${PF}/shops/${SHOP}/products.json?limit=50`, t); head("Shop"); p.status === 200 ? note(`${(p.data.data || []).length} products, ${(p.data.data || []).filter(x => x.visible).length} visible`) : fail("products " + p.status); }
  await doctor(args);
}
function launch(args) {
  const E = n => !!process.env[n], items = [
    ["Printify token", E("PRINTIFY_API_TOKEN")], ["Paystack secret key", E("PAYSTACK_SECRET_KEY")], ["Resend key", E("RESEND_API_KEY")],
    ["Site URL set", E("SITE_URL")], ["Printify webhook secret", E("PRINTIFY_WEBHOOK_SECRET")],
  ];
  head("Keys available to this CLI"); for (const [n, v] of items) v ? ok(n) : note(n + ": not set here");
  head("Only you can do these (cannot be automated)");
  ["Netlify billing/credits so deploys work", "Buy awezaclothing.com and add it in Netlify", "Printify card + Premium (printify.com/app/account/payment/details)", "Paystack: finish business verification (Settings > Business) and paste the webhook URL (Settings > API Keys & Webhooks)", "Resend: verify the domain DNS records", "Revoke the Amboras token in Printify > Connections", "Turn on 2FA everywhere"].forEach(x => note("[ ] " + x));
  head("Then run, in order"); ["deploy", "webhooks https://awezaclothing.com", "doctor --site https://awezaclothing.com", "status"].forEach(x => note("node scripts/aweza.mjs " + x));
}

// ---------------------------------------------------------------- main
const [cmd, ...rest] = process.argv.slice(2);
if (cmd === "orders") await orders(rest);
else if (cmd === "status") await status(rest);
else if (cmd === "launch") launch(rest);
else if (cmd === "deploy") { process.exitCode = spawnSync(process.execPath, [path.join(ROOT, "scripts/deploy-netlify.mjs"), ...rest], { stdio: "inherit", env: process.env }).status; }
else if (cmd === "doctor") await doctor(rest);
else if (cmd === "setup") await setup();
else if (cmd === "webhooks") { if (!process.env.PRINTIFY_API_TOKEN) { console.error("Set PRINTIFY_API_TOKEN first."); process.exit(1); } const r = await register(rest[0] || process.env.SITE_URL || ""); console.log("Printify will call", r.url, "\nRegistered:", r.done.join(", ") || "nothing new", r.done.length ? "\nPRINTIFY_WEBHOOK_SECRET=" + r.secret + "\n(put it in Netlify; shown once)" : ""); }
else if (cmd === "sync") { process.exitCode = spawnSync(process.execPath, [path.join(ROOT, "scripts/sync-printify.mjs"), ...rest], { stdio: "inherit", env: process.env }).status; }
else console.log("AWEZA CLI\n  status                orders + shop + every connection in one view\n  orders [N]            latest Printify orders and tracking\n  launch                what is left before going live\n  deploy                publish the site + functions to Netlify\n  doctor [--site URL]   check every connection (read-only)\n  setup                 guided set-up\n  webhooks URL          register Printify shipped/delivered events\n  sync                  refresh Printify ids and costs");
