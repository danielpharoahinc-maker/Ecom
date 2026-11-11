// The coach: reads your real numbers and writes feedback in plain sentences.
// Rules and templates only, so it costs nothing to run and never makes
// anything up: every sentence comes from a number in your own data.
import { commitment } from './data.js';
import { byDay, streak } from './stats.js';
import { dayKey, daysAgo } from './util.js';

const RATING = [
  [10, 'Perfect week'], [9, 'Elite'], [8, 'Locked in'], [7, 'Strong'], [6, 'Solid'],
  [5, 'Halfway there'], [3, 'Building'], [1, 'Restarting'], [0, 'Day one starts now'],
];
const rating = (s) => RATING.find(([min]) => s >= min)[1];

// Same day, same wording; a new day can pick a different phrasing.
function pick(options, salt) {
  let h = 0;
  for (const ch of dayKey() + salt) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return options[h % options.length];
}

function weekStats(proofs, keys, from, to) {
  const m = byDay(proofs.filter((p) => p.cKey !== 'moment'));
  const per = Object.fromEntries(keys.map((k) => [k, 0]));
  let doneSlots = 0, days = 0;
  for (let i = from; i <= to; i++) {
    const set = new Set((m.get(dayKey(daysAgo(i))) || []).map((p) => p.cKey));
    keys.forEach((k) => { if (set.has(k)) { per[k]++; doneSlots++; } });
    days++;
  }
  return { per, doneSlots, slots: days * keys.length, days };
}

export function coachReport(proofs, profile) {
  const keys = profile.commitments;
  const age = Math.floor((Date.now() - (profile.createdAt || Date.now())) / 864e5) + 1;
  const span = Math.min(7, age);
  const now = weekStats(proofs, keys, 0, span - 1);
  const before = age > 7 ? weekStats(proofs, keys, 7, Math.min(13, age - 1)) : null;
  const score = Math.round((now.doneSlots / now.slots) * 10);
  const st = streak(proofs);

  const ranked = keys.map((k) => ({ k, n: now.per[k], c: commitment(k) })).sort((a, b) => b.n - a.n);
  const best = ranked[0], worst = ranked[ranked.length - 1];
  const lines = [];
  const daysWord = (n) => `${n} ${n === 1 ? 'day' : 'days'}`;

  if (now.doneSlots === 0) {
    lines.push(pick([
      'Nothing posted yet this week. One proof today changes that.',
      'Clean slate. The first proof is the hardest, so make it a small one.',
    ], 'zero'));
  } else {
    if (best.n > 0) {
      lines.push(pick([
        `${best.c.label} is your strongest: ${best.n} of ${span} days.`,
        `You showed up for ${best.c.label.toLowerCase()} ${daysWord(best.n)} out of ${span}. That's the habit forming.`,
        `${best.c.label} leads the way at ${best.n}/${span}.`,
      ], 'best'));
    }
    if (worst.k !== best.k && worst.n < best.n) {
      lines.push(worst.n === 0
        ? pick([
          `${worst.c.label} hasn't happened yet this week. Pick a time for it today.`,
          `${worst.c.label} is at zero. Make it the first thing you prove tomorrow.`,
        ], 'worst0')
        : pick([
          `${worst.c.label} is lagging at ${worst.n}/${span}. That's where your points are.`,
          `The gap is ${worst.c.label.toLowerCase()}: ${daysWord(worst.n)} so far.`,
        ], 'worst'));
    }
    if (before) {
      const prev = Math.round((before.doneSlots / before.slots) * 10);
      if (score > prev) lines.push(`Up from ${prev}/10 last week. Keep the direction.`);
      else if (score < prev) lines.push(`Down from ${prev}/10 last week. One strong day pulls it back.`);
      else lines.push(`Same as last week, ${prev}/10. Consistency is a result too.`);
    }
    if (st >= 3) lines.push(pick([`${st} days in a row. Don't break it today.`, `Your streak is ${st}. Protect it.`], 'streak'));
  }

  const focus = worst.n < span
    ? `Prove ${worst.c.label.toLowerCase()} first tomorrow, before anything else.`
    : 'Keep all three. Same time, every day.';

  return { score, rating: rating(score), lines: lines.slice(0, 3), focus, span };
}
