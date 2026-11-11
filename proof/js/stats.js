// Pure calculations over proofs. No drawing here: views use these numbers.
import { dayKey, daysAgo } from './util.js';

export function byDay(proofs) {
  const m = new Map();
  for (const p of proofs) {
    const k = dayKey(p.ts);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(p);
  }
  return m;
}

// Which commitments have proof today.
export function doneToday(proofs) {
  const k = dayKey();
  return new Set(proofs.filter((p) => dayKey(p.ts) === k).map((p) => p.cKey));
}

// Days in a row with at least one proof. Today doesn't break the streak
// until it's over, so a streak still counts if the last proof was yesterday.
export function streak(proofs) {
  const days = new Set(proofs.map((p) => dayKey(p.ts)));
  let n = 0;
  let i = days.has(dayKey()) ? 0 : 1;
  while (days.has(dayKey(daysAgo(i)))) { n++; i++; }
  return n;
}

export function bestStreak(proofs) {
  const days = [...new Set(proofs.map((p) => dayKey(p.ts)))].sort();
  let best = 0, cur = 0, prev = null;
  for (const d of days) {
    const t = new Date(`${d}T12:00`).getTime();
    cur = prev !== null && Math.round((t - prev) / 864e5) === 1 ? cur + 1 : 1;
    best = Math.max(best, cur);
    prev = t;
  }
  return best;
}

// The last n day keys, oldest first.
export const lastDays = (n) => Array.from({ length: n }, (_, i) => dayKey(daysAgo(n - 1 - i)));

// How many days the account has existed, capped at n.
export function activeDays(profile, n) {
  const since = Math.floor((Date.now() - (profile?.createdAt || Date.now())) / 864e5) + 1;
  return Math.max(1, Math.min(n, since));
}

// Share of commitment-days completed: 3 commitments x days.
export function consistency(proofs, profile, n = 30) {
  const days = activeDays(profile, n);
  const keys = new Set(lastDays(days));
  const done = new Set(proofs.filter((p) => keys.has(dayKey(p.ts))).map((p) => `${dayKey(p.ts)}|${p.cKey}`));
  return Math.round((done.size / (days * 3)) * 100);
}

// For each commitment: days done in the last n days.
export function perCommitment(proofs, profile, n = 30) {
  const days = activeDays(profile, n);
  const keys = new Set(lastDays(days));
  return profile.commitments.map((key) => {
    const done = new Set(proofs.filter((p) => p.cKey === key && keys.has(dayKey(p.ts))).map((p) => dayKey(p.ts)));
    return { key, done: done.size, of: days, pct: Math.round((done.size / days) * 100) };
  });
}

export function perfectDays(proofs, profile) {
  let n = 0;
  for (const list of byDay(proofs).values()) {
    const set = new Set(list.map((p) => p.cKey));
    if (profile.commitments.every((k) => set.has(k))) n++;
  }
  return n;
}

export const totalMinutes = (proofs) => proofs.reduce((s, p) => s + (p.mins || 0), 0);

// Number of commitments done per day for the last n days.
export function dailyDone(proofs, n) {
  const m = byDay(proofs);
  return lastDays(n).map((k) => ({ k, n: new Set((m.get(k) || []).map((p) => p.cKey)).size }));
}

export function timeOfDay(proofs) {
  const b = { Morning: 0, Midday: 0, Evening: 0, Night: 0 };
  for (const p of proofs) {
    const h = new Date(p.ts).getHours();
    if (h >= 4 && h < 11) b.Morning++;
    else if (h < 16 && h >= 11) b.Midday++;
    else if (h < 21 && h >= 16) b.Evening++;
    else b.Night++;
  }
  return b;
}
