// Pure calculations over proofs. No drawing here: views use these numbers.
//
// The rule: a day keeps your streak when you prove at least HALF of your goals.
// Goals can change, so every day is judged against the goals you had that day
// (profile.goalLog), and changing goals never rewrites your past.
import { dayKey, daysAgo } from './util.js';
import { needFor } from './data.js';
import { S } from './state.js';

export { needFor };
const counted = (proofs) => proofs.filter((p) => p.cKey !== 'moment');

export function byDay(proofs) {
  const m = new Map();
  for (const p of proofs) {
    const k = dayKey(p.ts);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(p);
  }
  return m;
}

// Which goals have proof today.
export function doneToday(proofs) {
  const k = dayKey();
  return new Set(counted(proofs).filter((p) => dayKey(p.ts) === k).map((p) => p.cKey));
}

// The history of goal sets, oldest first. Old accounts get one entry.
export function goalLog(profile) {
  const log = (profile?.goalLog || []).slice().sort((a, b) => a.ts - b.ts);
  return log.length ? log : [{ ts: profile?.createdAt || 0, keys: profile?.commitments || [] }];
}

// The goals in force on one day. Proof for any goal you had that day counts;
// how many you need comes from the set you ended the day with.
export function goalsOnDay(profile, k) {
  const log = goalLog(profile);
  const start = new Date(`${k}T00:00:00`).getTime();
  const end = new Date(`${k}T23:59:59.999`).getTime();
  const active = new Set();
  let last = log[0];
  log.forEach((e, i) => {
    const to = i + 1 < log.length ? log[i + 1].ts : Infinity;
    if (e.ts <= end && to > start) { e.keys.forEach((x) => active.add(x)); last = e; }
  });
  if (!active.size) log[0].keys.forEach((x) => active.add(x));
  return { keys: last.keys, active, n: last.keys.length, need: needFor(last.keys.length) };
}

export function dayInfo(profile, byDayMap, k) {
  const g = goalsOnDay(profile, k);
  const done = new Set((byDayMap.get(k) || []).map((p) => p.cKey).filter((c) => g.active.has(c)));
  return { k, n: done.size, N: g.n, need: g.need, keys: g.keys, done, ok: g.n > 0 && done.size >= g.need };
}

// Days in a row that kept the streak. Today can't break it until it's over.
export function streak(proofs, profile = S.profile) {
  const m = byDay(counted(proofs));
  let n = 0;
  for (let i = 0; i < 4000; i++) {
    if (dayInfo(profile, m, dayKey(daysAgo(i))).ok) n++;
    else if (i > 0) break;
  }
  return n;
}

export function bestStreak(proofs, profile = S.profile) {
  const m = byDay(counted(proofs));
  const first = [...m.keys()].sort()[0];
  if (!first) return 0;
  const days = Math.round((Date.now() - new Date(`${first}T12:00`).getTime()) / 864e5) + 1;
  let best = 0, cur = 0;
  for (let i = days - 1; i >= 0; i--) {
    if (dayInfo(profile, m, dayKey(daysAgo(i))).ok) { cur++; best = Math.max(best, cur); } else cur = 0;
  }
  return best;
}

// Days that kept the streak, all time.
export function daysKept(proofs, profile = S.profile) {
  const m = byDay(counted(proofs));
  return [...m.keys()].filter((k) => dayInfo(profile, m, k).ok).length;
}

// The last n day keys, oldest first.
export const lastDays = (n) => Array.from({ length: n }, (_, i) => dayKey(daysAgo(n - 1 - i)));
export const ageDays = (profile) => Math.floor((Date.now() - (profile?.createdAt || Date.now())) / 864e5) + 1;

// Share of goal slots you filled over the last n days.
export function consistency(proofs, profile, n = 30) {
  const m = byDay(counted(proofs));
  let done = 0, slots = 0;
  for (const k of lastDays(Math.max(1, Math.min(n, ageDays(profile))))) {
    const d = dayInfo(profile, m, k);
    done += Math.min(d.n, d.N); slots += d.N;
  }
  return slots ? Math.round((done / slots) * 100) : 0;
}

// For each current goal: days done out of the days you had it.
export function perCommitment(proofs, profile, n = 30) {
  const m = byDay(counted(proofs));
  const days = lastDays(Math.max(1, Math.min(n, ageDays(profile))));
  return profile.commitments.map((key) => {
    let done = 0, of = 0;
    for (const k of days) {
      if (!goalsOnDay(profile, k).active.has(key)) continue;
      of++;
      if ((m.get(k) || []).some((p) => p.cKey === key)) done++;
    }
    return { key, done, of, pct: of ? Math.round((done / of) * 100) : 0 };
  });
}
