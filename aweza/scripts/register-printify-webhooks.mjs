#!/usr/bin/env node
// Tell Printify to call your site when a parcel ships or is delivered, so customers get their tracking by email.
//
//   PRINTIFY_API_TOKEN=...  node scripts/register-printify-webhooks.mjs https://your-domain.com
//   PRINTIFY_API_TOKEN=...  node scripts/register-printify-webhooks.mjs --list
//
// It makes up a signing secret (or uses PRINTIFY_WEBHOOK_SECRET if you set one), registers the two events, and prints
// the secret ONCE. Put that secret in Netlify as PRINTIFY_WEBHOOK_SECRET and redeploy. Never commit it or the token.
// Node 18+, no packages. Run it from your own computer.

import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const API = "https://api.printify.com/v1", SHOP = process.env.PRINTIFY_SHOP_ID || "29483178";
const TOPICS = ["order:shipment:created", "order:shipment:delivered"];

async function call(method, path, body) {
  const res = await fetch(API + path, { method, headers: { authorization: `Bearer ${process.env.PRINTIFY_API_TOKEN}`, "content-type": "application/json", "user-agent": "AWEZA-setup/1.0" }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Printify said ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
  return data;
}
const listOf = d => (Array.isArray(d) ? d : Array.isArray(d && d.data) ? d.data : []);

export async function register(site, secret = crypto.randomBytes(20).toString("hex")) {
  const url = new URL("/.netlify/functions/printify-webhook", site).href;
  if (!url.startsWith("https://")) throw new Error("The site address must start with https://");
  const existing = listOf(await call("GET", `/shops/${SHOP}/webhooks.json`));
  const done = [], skipped = [];
  for (const topic of TOPICS) {
    const have = existing.find(w => w.topic === topic && w.url === url);
    if (have) { skipped.push(topic); continue; }
    await call("POST", `/shops/${SHOP}/webhooks.json`, { topic, url, secret });
    done.push(topic);
  }
  return { url, secret, done, skipped };
}

async function main() {
  if (!process.env.PRINTIFY_API_TOKEN) { console.error("Set PRINTIFY_API_TOKEN first (Printify, Account, Connections)."); process.exit(1); }
  const arg = process.argv[2];
  if (arg === "--list") { for (const w of listOf(await call("GET", `/shops/${SHOP}/webhooks.json`))) console.log(w.topic.padEnd(28), w.url, "id", w.id); return; }
  if (!arg || !/^https:\/\//.test(arg)) { console.error("Usage: node scripts/register-printify-webhooks.mjs https://your-domain.com   (or --list)"); process.exit(1); }
  const r = await register(arg, process.env.PRINTIFY_WEBHOOK_SECRET || undefined);
  console.log("Address Printify will call:", r.url);
  if (r.done.length) console.log("Registered:", r.done.join(", "));
  if (r.skipped.length) console.log("Already registered (left alone; its secret is unchanged):", r.skipped.join(", "));
  if (r.done.length) { console.log("\nPUT THIS IN NETLIFY (Environment variables, secret), then redeploy:\n  PRINTIFY_WEBHOOK_SECRET=" + r.secret + "\n(shown once; do not share or commit it)"); }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch(e => { console.error(e.message); process.exit(1); });
