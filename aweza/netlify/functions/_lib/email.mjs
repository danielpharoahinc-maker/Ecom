// Customer emails (order confirmed, on its way, delivered) sent through Resend (https://resend.com).
// Switched on by two environment variables: RESEND_API_KEY and MAIL_FROM (e.g. "AWEZA <orders@your-domain>").
// If they are not set, nothing is sent and nothing breaks: the order flow carries on and Printify's own emails
// (if left on) still reach the customer.

import { fetchWithTimeout } from "./http.mjs";

const RESEND_URL = "https://api.resend.com/emails";

export const mailEnabled = () => !!(process.env.RESEND_API_KEY && process.env.MAIL_FROM);

export const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const rand = cents => "R" + String(Math.round(cents / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

/** @returns {{ok:true,id?:string}|{ok:false,retryable:boolean,status:number}} */
export async function sendMail({ to, subject, html, text, idempotencyKey }) {
  if (!mailEnabled()) return { ok: false, retryable: false, status: 0, skipped: true };
  const body = { from: process.env.MAIL_FROM, to: [to], subject, html, text };
  if (process.env.MAIL_REPLY_TO) body.reply_to = process.env.MAIL_REPLY_TO;
  try {
    const res = await fetchWithTimeout(RESEND_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "content-type": "application/json",
        ...(idempotencyKey ? { "idempotency-key": String(idempotencyKey).slice(0, 200) } : {}),
      },
      body: JSON.stringify(body),
    }, 8000);
    const data = await res.json().catch(() => ({}));
    if (res.ok) return { ok: true, id: data && data.id };
    return { ok: false, status: res.status, retryable: res.status === 429 || res.status >= 500 };
  } catch {
    return { ok: false, status: 0, retryable: true };
  }
}

// ---------- templates ----------
const RED = "#d7191f", INK = "#0a0a0a", MUTED = "#555555";

function layout({ preheader, heading, bodyHtml, cta, footer }) {
  const button = cta ? `<p style="margin:26px 0 8px"><a href="${esc(cta.url)}" style="display:inline-block;background:${RED};color:#ffffff;text-decoration:none;font:700 16px/1 Arial,Helvetica,sans-serif;padding:16px 28px;border-radius:999px">${esc(cta.label)}</a></p>` : "";
  return `<!doctype html><html><body style="margin:0;background:#f4f4f2"><span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader || "")}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f2"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px">
<tr><td style="padding:26px 28px 6px;font:400 26px Georgia,'Times New Roman',serif;color:${INK}">AWEZA<sup style="font-size:10px">™</sup></td></tr>
<tr><td style="padding:8px 28px 28px;font:400 16px/1.55 Arial,Helvetica,sans-serif;color:${INK}">
<h1 style="margin:10px 0 14px;font:400 30px/1.1 Georgia,'Times New Roman',serif;color:${INK}">${heading}</h1>
${bodyHtml}${button}
<p style="margin:26px 0 0;font-size:13px;color:${MUTED}">${footer || "Time of your life."}</p>
</td></tr></table></td></tr></table></body></html>`;
}

const itemRows = items => items.map(i => `<tr><td style="padding:6px 0;color:${INK}">${i.qty} × ${esc(i.name)}${i.size ? `, size ${esc(i.size)}` : ""}</td><td align="right" style="padding:6px 0;color:${INK}">${i.price != null ? rand(i.price) : ""}</td></tr>`).join("");
const itemText = items => items.map(i => `  ${i.qty} x ${i.name}${i.size ? ", size " + i.size : ""}${i.price != null ? "  " + rand(i.price) : ""}`).join("\n");
const trackUrl = (siteUrl, ref, token) => `${siteUrl}/#/track/${encodeURIComponent(ref)}${token ? "." + token : ""}`;
const subj = (s, test) => (test ? "[TEST] " : "") + s;

/** Order confirmed. pricing = server pricing (cents); eta = {text} or null. */
export function confirmationEmail({ siteUrl, ref, token, first, items, pricing, eta, test }) {
  const url = trackUrl(siteUrl, ref, token);
  const rows = [["Subtotal", rand(pricing.subtotalCents)]];
  if (pricing.discountCents) rows.push(["Discounts", "-" + rand(pricing.discountCents)]);
  rows.push(["Delivery", pricing.deliveryCents ? rand(pricing.deliveryCents) : "Free"]);
  const totals = rows.map(([k, v]) => `<tr><td style="padding:3px 0;color:${MUTED}">${esc(k)}</td><td align="right" style="padding:3px 0;color:${INK}">${esc(v)}</td></tr>`).join("");
  const html = layout({
    preheader: `Order ${ref} is in. We're printing it now.`,
    heading: `Paid. Good <em style="color:${RED}">decision.</em>`,
    bodyHtml: `<p style="margin:0 0 14px">Hi ${esc(first || "there")}, thanks for your order. We print every tee fresh, then ship it to your door.</p>
<p style="margin:0 0 6px;font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:${MUTED}">Order number</p>
<p style="margin:0 0 18px;font:700 20px 'Courier New',monospace;color:${RED}">${esc(ref)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e3e3e3;border-bottom:1px solid #e3e3e3;margin:0 0 12px">${itemRows(items)}</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${totals}<tr><td style="padding:8px 0 0;font-weight:700">Total</td><td align="right" style="padding:8px 0 0;font:700 20px Georgia,serif;color:${RED}">${rand(pricing.totalCents)}</td></tr></table>
${eta ? `<p style="margin:18px 0 0"><b>Estimated arrival:</b> ${esc(eta)}</p>` : ""}
<p style="margin:12px 0 0;color:${MUTED}">We'll email you again with your tracking number as soon as your parcel ships.</p>`,
    cta: { label: "Track your order", url },
  });
  const text = `Hi ${first || "there"}, thanks for your order. We print every tee fresh, then ship it to your door.\n\nOrder number: ${ref}\n\n${itemText(items)}\n\nTotal: ${rand(pricing.totalCents)}\n${eta ? "Estimated arrival: " + eta + "\n" : ""}\nTrack your order: ${url}\n\nWe'll email you again with your tracking number as soon as your parcel ships.\n\nAWEZA. Time of your life.`;
  return { subject: subj(`Your AWEZA order ${ref} is in`, test), html, text };
}

/** Parcel shipped. shipments = [{carrier, number, url}]. */
export function shippedEmail({ siteUrl, ref, token, first, items, shipments, test }) {
  const url = trackUrl(siteUrl, ref, token);
  const ships = shipments.map(s => `<div style="background:#f6f6f4;border-radius:10px;padding:14px 16px;margin:0 0 12px"><p style="margin:0 0 4px;font-weight:700">${esc(s.carrier)}</p>${s.number ? `<p style="margin:0 0 8px;color:${MUTED}">Tracking number <b style="font-family:'Courier New',monospace;color:${INK}">${esc(s.number)}</b></p>` : ""}${s.url ? `<a href="${esc(s.url)}" style="color:${RED};font-weight:700">Track the parcel</a>` : ""}</div>`).join("");
  const html = layout({
    preheader: `Order ${ref} is on its way.`,
    heading: `On its <em style="color:${RED}">way.</em>`,
    bodyHtml: `<p style="margin:0 0 14px">Hi ${esc(first || "there")}, your parcel has left the printer and is with the courier.</p>
${ships}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 0">${itemRows(items)}</table>
<p style="margin:14px 0 0;color:${MUTED}">Courier updates can take a day or two to show up after it ships. International parcels to South Africa can take a while, so please be patient with us.</p>`,
    cta: { label: "See your order", url },
  });
  const text = `Hi ${first || "there"}, your parcel has left the printer and is with the courier.\n\n${shipments.map(s => `${s.carrier}${s.number ? "\nTracking number: " + s.number : ""}${s.url ? "\nTrack the parcel: " + s.url : ""}`).join("\n\n")}\n\n${itemText(items)}\n\nSee your order: ${url}\n\nOrder number: ${ref}\nAWEZA. Time of your life.`;
  return { subject: subj(`Your AWEZA order ${ref} is on its way`, test), html, text };
}

/** Parcel delivered. */
export function deliveredEmail({ siteUrl, ref, token, first, test }) {
  const url = trackUrl(siteUrl, ref, token);
  const html = layout({
    preheader: `Order ${ref} has been delivered.`,
    heading: `Delivered. <em style="color:${RED}">Enjoy.</em>`,
    bodyHtml: `<p style="margin:0 0 14px">Hi ${esc(first || "there")}, your AWEZA order has been delivered. We hope you love it.</p><p style="margin:0;color:${MUTED}">Something not right? Reply to this email with your order number (${esc(ref)}) and a photo, and we'll sort it out.</p>`,
    cta: { label: "View your order", url },
  });
  const text = `Hi ${first || "there"}, your AWEZA order has been delivered. We hope you love it.\n\nSomething not right? Reply to this email with your order number (${ref}) and a photo.\n\nView your order: ${url}\n\nAWEZA. Time of your life.`;
  return { subject: subj(`Your AWEZA order ${ref} has been delivered`, test), html, text };
}
