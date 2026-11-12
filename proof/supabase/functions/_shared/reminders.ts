// Which reminders are due for one person right now. Pure logic, no I/O,
// so it can be tested on its own (supabase/test/reminders.test.mjs).

export type Row = {
  tz: string; times: string[]; streak_saver: boolean; sunday_review?: boolean; club_pings?: boolean;
  plan_items: { at: string; text: string }[]; plan_day: string | null;
  last_posted_on: string | null; sent: Record<string, true>;
};
export type Push = { key: string; title: string; body: string; tag: string };

const WINDOW = 6; // minutes: the job runs every 5, so allow a little slack
const QUIET_START = 22 * 60, QUIET_END = 6 * 60;

export function localNow(tz: string, now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now).map((p) => [p.type, p.value]));
  return { day: `${parts.year}-${parts.month}-${parts.day}`, mins: +parts.hour * 60 + +parts.minute };
}

const toMins = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const pad = (n: number) => String(n).padStart(2, '0');
const hhmm = (mins: number) => `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;
const isDue = (at: number, now: number) => at <= now && at > now - WINDOW;

// Proff's voice. Same wording for the same day, varied across days.
const pick = (opts: string[], seed: string) => { let h = 0; for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0; return opts[h % opts.length]; };

// trial: set when a card is on file and the first charge is coming (local day, e.g. 2026-12-12).
export type Trial = { chargeDay: string; amount: string } | null;
const dayDiff = (a: string, b: string) => Math.round((Date.parse(a) - Date.parse(b)) / 864e5);

export function dueReminders(row: Row, now = new Date(), trial: Trial = null): { day: string; due: Push[] } {
  const { day, mins } = localNow(row.tz || 'Africa/Johannesburg', now);
  const posted = row.last_posted_on === day;
  const sent = row.sent || {};
  const due: Push[] = [];
  const add = (p: Push) => { if (!sent[p.key]) due.push(p); };

  for (const t of row.times || []) {
    const at = toMins(t);
    if (posted || at >= QUIET_START || at < QUIET_END || !isDue(at, mins)) continue;
    add({ key: `${day}|checkin|${t}`, tag: 'checkin', title: 'Proff',
      body: pick(['Time to post proof. Nothing’s in yet today.', 'Proof time. Snap it, say it, post it.', 'Your commitments are waiting. One photo is all it takes.'], day + t) });
  }
  if (row.streak_saver && !posted && isDue(20 * 60, mins)) {
    add({ key: `${day}|streak`, tag: 'streak', title: 'Proff',
      body: pick(['Your streak ends at midnight. One proof keeps it alive.', 'Don’t break it tonight. Post one proof before bed.'], day) });
  }
  // Sunday evening: your week is ready.
  if (row.sunday_review !== false && new Date(`${day}T12:00:00Z`).getUTCDay() === 0 && isDue(19 * 60, mins)) {
    add({ key: `${day}|sunday`, tag: 'sunday', title: 'Sunday Review', body: 'Your week is ready. See your score and your best photos.' });
  }
  // Billing notice: three days before the first real charge. Never a surprise.
  if (trial && dayDiff(trial.chargeDay, day) === 3 && isDue(10 * 60, mins)) {
    add({ key: `${day}|trial3`, tag: 'trial', title: 'Your free month ends soon', body: `On ${trial.chargeDay} your card is charged ${trial.amount}. Cancel any time in Account.` });
  }
  if (row.plan_day === day) {
    for (const it of row.plan_items || []) {
      if (!/^\d{2}:\d{2}$/.test(it.at)) continue;
      const at = toMins(it.at) - 10;
      if (at < 0 || !isDue(at, mins)) continue;
      add({ key: `${day}|plan|${it.at}|${it.text}`, tag: `plan-${it.at}`, title: `${it.text} at ${it.at}`, body: 'In 10 minutes. Post proof when it’s done.' });
    }
  }
  return { day, due };
}

export const keepToday = (sent: Record<string, true>, day: string) =>
  Object.fromEntries(Object.entries(sent || {}).filter(([k]) => k.startsWith(day)));
export { hhmm };

// "Sipho proved Train": a friend proved a goal. At most 2 a day, never in
// quiet hours, never about missed days, and switchable off.
export function clubPing(row: Row, who: string, goal: string, proofId: string, now = new Date()): Push | null {
  const { day, mins } = localNow(row.tz || 'Africa/Johannesburg', now);
  if (row.club_pings === false) return null;
  if (mins >= QUIET_START || mins < QUIET_END) return null;
  const sent = row.sent || {};
  if (sent[`${day}|club|${proofId}`]) return null;
  if (Object.keys(sent).filter((k) => k.startsWith(`${day}|club|`)).length >= 2) return null;
  return { key: `${day}|club|${proofId}`, tag: `club-${proofId}`, title: `${who} proved ${goal}`, body: 'Tap to give them respect.' };
}
