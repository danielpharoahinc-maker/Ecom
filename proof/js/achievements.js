// 100 achievements, Opal-style: progress rings, tiers, and a reward for each, a new skin
// for Proff. Easy ones unlock plain skins, hard ones unlock the fancy ones (crowns last).
import { S, saveProfile } from './state.js';
import { streak, bestStreak, daysKept, byDay, dayInfo, lastDays, ageDays } from './stats.js';
import { weekReport } from './coach.js';
import { isFood } from './data.js';
import { dayKey } from './util.js';

const KEYS = {
  training: ['train', 'run', 'walk', 'stretch', 'cold'],
  mind: ['read', 'study', 'lang', 'code', 'deep', 'journal', 'meditate', 'plan', 'nophone'],
  faith: ['faith', 'gratitude', 'serve'],
  work: ['build', 'create', 'sales', 'money'],
  sunwake: ['sun', 'wake'],
};

// [metric, category, weight per unit, targets, names, description(n)]
const TIERS = [
  ['streak', 'Streaks', 3, [3, 7, 14, 21, 30, 45, 60, 75, 90, 100, 150, 200, 300, 365],
    ['Spark', 'One week strong', 'Fortnight', 'Three weeks', 'A full month', 'Habit formed', 'Two months', 'Seventy-five', 'Ninety days', 'Triple digits', 'Unshakeable', 'Two hundred', 'Three hundred', 'A whole year'], (n) => `Keep a ${n} day streak`],
  ['proofs', 'Proof', 0.9, [1, 10, 25, 50, 100, 150, 250, 400, 600, 1000],
    ['First proof', 'Ten down', 'Quarter century', 'Half a hundred', 'Century', '150 club', 'Relentless', 'Four hundred', 'Machine', 'One thousand'], (n) => `Post ${n} ${n === 1 ? 'proof' : 'proofs'}`],
  ['perfect', 'Perfect days', 5, [1, 3, 7, 14, 30, 60, 100],
    ['Perfect day', 'Hat trick', 'Seven perfect', 'Flawless fortnight', 'Perfectionist', 'Sixty perfect', 'One hundred perfect'], (n) => `Prove every goal on ${n} ${n === 1 ? 'day' : 'days'}`],
  ['perfectRun', 'Perfect days', 7, [3, 7, 14],
    ['Three in a row', 'Perfect week', 'Perfect fortnight'], (n) => `Prove every goal ${n} days in a row`],
  ['kept', 'Streaks', 2, [5, 10, 20, 30, 50, 75, 100, 150, 200],
    ['Five kept', 'Ten kept', 'Twenty kept', 'Thirty kept', 'Fifty kept', 'Seventy-five kept', 'Hundred kept', '150 kept', 'Two hundred kept'], (n) => `Keep your streak on ${n} days in all`],
  ['weeks', 'Weeks', 12, [1, 3, 5, 10],
    ['Good week', 'Hot streak', 'Consistency', 'Ten great weeks'], (n) => `Score 8 out of 10 or more in ${n} ${n === 1 ? 'week' : 'weeks'}`],
  ['stamped', 'Proff’s stamp', 1.5, [1, 10, 25, 50, 100],
    ['First stamp', 'Stamp collector', 'Sharp eye', 'Proff’s favourite', 'Stamp master'], (n) => `Get ${n} ${n === 1 ? 'photo' : 'photos'} stamped by Proff`],
  ['meals', 'Food', 1.6, [1, 5, 10, 20, 40, 75, 120],
    ['First meal', 'Fuel up', 'Ten meals', 'Clean eater', 'Meal prep pro', 'Kitchen king', 'Nutrition nerd'], (n) => `Log ${n} ${n === 1 ? 'meal' : 'meals'}`],
  ['claude', 'Food', 3, [1, 5, 10, 25],
    ['Claude’s first look', 'Reviewed', 'Fed back', 'Claude’s regular'], (n) => `Get ${n} ${n === 1 ? 'meal' : 'meals'} reviewed by Claude`],
  ['morning', 'Mornings', 2, [1, 5, 10, 25, 50],
    ['Early bird', 'Dawn patrol', 'Rise and grind', 'Early club', 'Sunrise soldier'], (n) => `Post ${n} ${n === 1 ? 'proof' : 'proofs'} before 7 am`],
  ['sunwake', 'Mornings', 2.5, [1, 7, 21, 50],
    ['First light', 'Sun seeker', 'Solar powered', 'Daybreak devotee'], (n) => `Post ${n} sunlight or early-wake ${n === 1 ? 'proof' : 'proofs'}`],
  ['training', 'Body', 1.6, [1, 10, 25, 50, 100],
    ['First rep', 'Gym rat', 'Iron habit', 'Athlete', 'Beast mode'], (n) => `Post ${n} training ${n === 1 ? 'proof' : 'proofs'}`],
  ['mind', 'Mind', 1.8, [1, 10, 25, 50],
    ['Open mind', 'Brain gains', 'Deep thinker', 'Scholar'], (n) => `Post ${n} mind ${n === 1 ? 'proof' : 'proofs'}`],
  ['faith', 'Faith', 1.8, [1, 10, 30, 60],
    ['First prayer', 'Rooted', 'Faithful', 'Steadfast'], (n) => `Post ${n} faith ${n === 1 ? 'proof' : 'proofs'}`],
  ['work', 'Work', 1.8, [1, 10, 25, 50],
    ['First move', 'Builder', 'Operator', 'Founder energy'], (n) => `Post ${n} work ${n === 1 ? 'proof' : 'proofs'}`],
  ['distinct', 'Range', 8, [3, 6, 10, 15],
    ['Well rounded', 'Six ways', 'Ten ways', 'Life maxer'], (n) => `Prove ${n} different goals`],
  ['voice', 'Proof', 3, [1, 10], ['Say it out loud', 'Voice of reason'], (n) => `Post ${n} voice ${n === 1 ? 'proof' : 'proofs'}`],
  ['moments', 'Proof', 2, [1, 10], ['Snapshot', 'Storyteller'], (n) => `Save ${n} ${n === 1 ? 'Moment' : 'Moments'}`],
];
const SINGLES = [
  { metric: 'setup', cat: 'Start', w: -1, title: 'Welcome to Proof', desc: 'Finish setting up', target: 1 },
  { metric: 'club', cat: 'Clubs', w: 4, title: 'Not alone', desc: 'Join or start a club', target: 1 },
  { metric: 'claudeOn', cat: 'Food', w: 5, title: 'Connected', desc: 'Connect Claude to Proof', target: 1 },
];

const raw = [];
for (const [metric, cat, w, targets, names, desc] of TIERS) {
  targets.forEach((n, i) => raw.push({ id: `${metric}-${n}`, metric, cat, title: names[i], desc: desc(n), target: n, diff: n * w }));
}
for (const s of SINGLES) raw.push({ id: s.metric, metric: s.metric, cat: s.cat, title: s.title, desc: s.desc, target: s.target, diff: s.w });
// Easiest first; skin i is the reward for the i-th easiest achievement.
export const ACHIEVEMENTS = raw.sort((a, b) => a.diff - b.diff).map((a, i) => ({ ...a, skin: i }));

/* ---------- numbers ---------- */

function perfectStats(P) {
  const m = byDay(S.proofs.filter((p) => p.cKey !== 'moment'));
  const start = dayKey(P.createdAt || Date.now());
  const today = dayKey();
  let perfect = 0, run = 0, best = 0;
  for (const k of lastDays(Math.min(400, Math.max(1, ageDays(P)))).filter((d) => d >= start && d !== today)) {
    const d = dayInfo(P, m, k);
    if (d.N && d.n >= d.N) { perfect++; run++; best = Math.max(best, run); } else run = 0;
  }
  return { perfect, perfectRun: best };
}

export function metrics() {
  const P = S.profile;
  const goal = S.proofs.filter((p) => p.cKey !== 'moment');
  const count = (keys) => goal.filter((p) => keys.includes(p.cKey)).length;
  const { perfect, perfectRun } = perfectStats(P);
  let weeks = 0;
  for (let w = 0; w * 7 < Math.min(180, ageDays(P)); w++) if (weekReport(S.proofs, P, w * 7, 7).score >= 8) weeks++;
  return {
    streak: bestStreak(S.proofs, P), kept: daysKept(S.proofs, P), perfect, perfectRun, weeks,
    proofs: goal.length, stamped: S.proofs.filter((p) => p.qa?.ok).length,
    meals: S.proofs.filter((p) => p.meal || isFood(p.cKey)).length, claude: S.proofs.filter((p) => p.analysis).length,
    morning: goal.filter((p) => new Date(p.ts).getHours() < 7).length, sunwake: count(KEYS.sunwake),
    training: count(KEYS.training), mind: count(KEYS.mind), faith: count(KEYS.faith), work: count(KEYS.work),
    distinct: new Set(goal.map((p) => p.cKey)).size, voice: S.proofs.filter((p) => p.audioId).length,
    moments: S.proofs.filter((p) => p.cKey === 'moment').length,
    setup: P?.onboarded ? 1 : 0, club: P?.joinedClub ? 1 : 0, claudeOn: P?.apiConnected ? 1 : 0,
  };
}

export function evaluate() {
  const m = metrics(), got = S.profile?.unlocked || {};
  return ACHIEVEMENTS.map((a) => {
    const value = m[a.metric] || 0;
    return { ...a, value, pct: Math.min(1, value / a.target), done: value >= a.target || Boolean(got[a.id]) };
  });
}

// Records new unlocks and returns them (once each).
export async function checkUnlocks() {
  if (!S.profile?.onboarded) return [];
  const got = { ...(S.profile.unlocked || {}) };
  const fresh = evaluate().filter((a) => a.done && !got[a.id]);
  if (!fresh.length) return [];
  fresh.forEach((a) => { got[a.id] = Date.now(); });
  await saveProfile({ ...S.profile, unlocked: got });
  return fresh;
}
export const unlockedSkins = () => new Set(evaluate().filter((a) => a.done).map((a) => a.skin));
