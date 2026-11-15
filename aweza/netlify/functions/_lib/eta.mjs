// Server copy of the delivery estimate in js/core.js (AW.eta): a window of working days from the order date.
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ymd = d => d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0") + "-" + String(d.getUTCDate()).padStart(2, "0");

export function etaText(config, now = Date.now()) {
  const c = config && config.shipping; if (!c || !Array.isArray(c.days)) return "";
  const start = new Date(now + 2 * 3600 * 1000);                       // South African time (UTC+2)
  const md = String(start.getUTCMonth() + 1).padStart(2, "0") + "-" + String(start.getUTCDate()).padStart(2, "0");
  const pk = c.peak, peak = !!pk && (pk.from <= pk.to ? md >= pk.from && md <= pk.to : md >= pk.from || md <= pk.to);
  const extra = peak ? pk.extra : 0, hol = c.holidays || [];
  const add = n => { const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())); while (n > 0) { d.setUTCDate(d.getUTCDate() + 1); if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6 && !hol.includes(ymd(d))) n--; } return d; };
  const fmt = d => DAYS[d.getUTCDay()] + " " + d.getUTCDate() + " " + MONTHS[d.getUTCMonth()];
  return fmt(add(c.days[0] + extra)) + " to " + fmt(add(c.days[1] + extra));
}
