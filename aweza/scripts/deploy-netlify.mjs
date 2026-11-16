#!/usr/bin/env node
// Deploy AWEZA to Netlify through its API (no Git needed, no Netlify CLI needed).
//
//   NETLIFY_AUTH_TOKEN=...  NETLIFY_SITE_ID=...  node scripts/deploy-netlify.mjs
//
// It copies the site (leaving out docs/, scripts/, README), turns netlify.toml into Netlify's _headers and _redirects
// files, bundles the server programs in netlify/functions with esbuild (fetched with npx), zips each one with the
// data/ folder it reads, and uploads only what changed. Node 18+. Run it from the aweza/ folder.

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOKEN = process.env.NETLIFY_AUTH_TOKEN, SITE = process.env.NETLIFY_SITE_ID;
const API = "https://api.netlify.com/api/v1";
const SKIP = new Set(["docs", "scripts", ".git", "node_modules", "README.md", ".github"]);

const sha1 = b => crypto.createHash("sha1").update(b).digest("hex"), sha256 = b => crypto.createHash("sha256").update(b).digest("hex");
async function api(method, p, body, headers = {}) {
  const res = await fetch(API + p, { method, headers: { authorization: "Bearer " + TOKEN, "user-agent": "AWEZA-deploy/1.0", ...headers }, body });
  const text = await res.text(); let data; try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) throw new Error(`${method} ${p.split("?")[0]} -> HTTP ${res.status} ${typeof data === "string" ? data.slice(0, 160) : JSON.stringify(data).slice(0, 200)}`);
  return data;
}

// ---- copy the site -------------------------------------------------------------------------------------------
function walk(dir, base = dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (dir === base && SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, base, out); else if (e.isFile()) out.push("/" + path.relative(base, p).split(path.sep).join("/"));
  }
  return out;
}

// ---- netlify.toml -> _headers / _redirects (the part of the toml this site uses) -------------------------------
function tomlRules(text) {
  const headers = [], redirects = []; let cur = null, kind = "";
  for (let line of text.split("\n")) {
    line = line.trim(); if (!line || line.startsWith("#")) continue;
    if (line === "[[headers]]") { cur = { for: "", values: {} }; headers.push(cur); kind = "h"; continue; }
    if (line === "[headers.values]") { kind = "hv"; continue; }
    if (line === "[[redirects]]") { cur = {}; redirects.push(cur); kind = "r"; continue; }
    if (line.startsWith("[")) { kind = ""; continue; }
    const m = /^([A-Za-z_-]+)\s*=\s*(.+)$/.exec(line); if (!m) continue;
    const v = m[2].trim().replace(/^"(.*)"$/, "$1");
    if (kind === "h" && m[1] === "for") cur.for = v; else if (kind === "hv") cur.values[m[1]] = v; else if (kind === "r") cur[m[1]] = v;
  }
  return { headers, redirects };
}
const headersFile = hs => hs.map(h => `${h.for}\n${Object.entries(h.values).map(([k, v]) => `  ${k}: ${v}`).join("\n")}`).join("\n\n") + "\n";
const redirectsFile = rs => rs.filter(r => r.from && r.to && !/\.git|\.env/.test(r.from)).map(r => `${r.from} ${r.to} ${r.status || 301}${r.force === "true" ? "!" : ""}`).join("\n") + "\n";

// ---- a tiny zip writer (deflate) ------------------------------------------------------------------------------
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = b => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function zip(entries) {                                             // entries: [[name, Buffer]]
  const parts = [], central = []; let offset = 0;
  for (const [name, data] of entries) {
    const nm = Buffer.from(name), comp = zlib.deflateRawSync(data), crc = crc32(data);
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(8, 8); lh.writeUInt32LE(0x21000000 >>> 0, 10); lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(nm.length, 26);
    parts.push(lh, nm, comp);
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(8, 10); ch.writeUInt32LE(0x21000000 >>> 0, 12); ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(comp.length, 20); ch.writeUInt32LE(data.length, 24); ch.writeUInt16LE(nm.length, 28); ch.writeUInt32LE(offset, 42);
    central.push(ch, nm); offset += lh.length + nm.length + comp.length;
  }
  const cd = Buffer.concat(central), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, cd, end]);
}

// ---- functions: bundle + Lambda adapter --------------------------------------------------------------------------
const ADAPTER = `import impl from "./impl.mjs";
export const handler = async (event) => {
  const headers = new Headers(); for (const [k, v] of Object.entries(event.headers || {})) if (v != null) headers.set(k, String(v));
  const url = event.rawUrl || ("https://" + (event.headers && event.headers.host) + event.path);
  const init = { method: event.httpMethod, headers };
  if (!["GET", "HEAD"].includes(event.httpMethod) && event.body != null) init.body = event.isBase64Encoded ? Buffer.from(event.body, "base64") : event.body;
  const res = await impl(new Request(url, init));
  const out = {}; res.headers.forEach((v, k) => { out[k] = v; });
  return { statusCode: res.status, headers: out, body: await res.text() };
};
`;
function buildFunction(name, tmp) {
  const outfile = path.join(tmp, "fn-" + name + ".mjs");
  const r = spawnSync("npx", ["--yes", "esbuild@0.21", path.join(ROOT, "netlify/functions", name + ".mjs"), "--bundle", "--platform=node", "--format=esm", "--target=node18", "--outfile=" + outfile, "--log-level=error"], { stdio: ["ignore", "inherit", "inherit"], env: process.env });
  if (r.status !== 0) throw new Error("esbuild failed for " + name);
  const entries = [[name + ".mjs", Buffer.from(ADAPTER)], ["impl.mjs", fs.readFileSync(outfile)]];
  for (const f of ["products.js", "printify-variants.json"]) entries.push(["data/" + f, fs.readFileSync(path.join(ROOT, "data", f))]);
  return zip(entries);
}

async function main() {
  if (!TOKEN || !SITE) { console.error("Set NETLIFY_AUTH_TOKEN and NETLIFY_SITE_ID."); process.exit(1); }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "aweza-deploy-"));
  const files = {}, bytes = {};
  for (const f of walk(ROOT)) { if (f === "/netlify.toml" || f.startsWith("/netlify/")) continue; const b = fs.readFileSync(path.join(ROOT, f)); files[f] = sha1(b); bytes[f] = b; }
  const rules = tomlRules(fs.readFileSync(path.join(ROOT, "netlify.toml"), "utf8"));
  for (const [f, text] of [["/_headers", headersFile(rules.headers)], ["/_redirects", redirectsFile(rules.redirects)]]) { const b = Buffer.from(text); files[f] = sha1(b); bytes[f] = b; }
  const fnNames = fs.readdirSync(path.join(ROOT, "netlify/functions")).filter(f => f.endsWith(".mjs")).map(f => f.replace(/\.mjs$/, ""));
  const zips = {}, fnHash = {};
  for (const n of fnNames) { process.stdout.write("Bundling " + n + " ... "); zips[n] = buildFunction(n, tmp); fnHash[n] = sha256(zips[n]); console.log((zips[n].length / 1024).toFixed(0) + " KB"); }

  const d = await api("POST", `/sites/${SITE}/deploys`, JSON.stringify({ files, functions: fnHash, async: false }), { "content-type": "application/json" });
  console.log(`Deploy ${d.id}: uploading ${(d.required || []).length} of ${Object.keys(files).length} files and ${(d.required_functions || []).length} function(s)`);
  const needed = new Set(d.required || []);
  for (const [f, h] of Object.entries(files)) if (needed.has(h)) { await api("PUT", `/deploys/${d.id}/files${encodeURI(f)}`, bytes[f], { "content-type": "application/octet-stream" }); needed.delete(h); }
  for (const n of fnNames) if ((d.required_functions || []).includes(fnHash[n])) await api("PUT", `/deploys/${d.id}/functions/${n}?runtime=js`, zips[n], { "content-type": "application/zip" });
  for (let i = 0; i < 60; i++) {
    const s = await api("GET", `/deploys/${d.id}`);
    if (s.state === "ready") { console.log("\nLIVE: " + (s.ssl_url || s.url)); return; }
    if (s.state === "error") throw new Error("Netlify reported a deploy error: " + (s.error_message || ""));
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error("Timed out waiting for the deploy to finish");
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch(e => { console.error("Deploy failed:", e.message); process.exit(1); });
