// The coach: reads your real numbers and writes feedback in plain sentences.
// Rules and templates only, so it costs nothing to run and never makes
// anything up: every sentence comes from a number in your own data.
import { commitment } from './data.js';
import { byDay, dayInfo, streak, ageDays } from './stats.js';
import { dayKey, daysAgo } from './util.js';

const RATING = [
  [10, 'Perfect week'], [9, 'Elite'], [8, 'Locked in'], [7, 'Strong'], [6, 'Solid'],
  [5, 'Halfway there'], [3, 'Building'], [1, 'Restarting'], [0, 'Day one starts now'],
];
export const rating = (s) => RATING.find(([min]) => s >= min)[1];

// Same day, same wording; a new day can pick a different phrasing.
function pick(options, salt) {
  let h = 0;
  for (const ch of dayKey() + salt) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return options[h % options.length];
}

// Days from `from` to `to`, counted back from today (0 = today).
// Every day is judged against the goals you had that day.
export function weekStats(proofs, profile, from, to) {
  const m = byDay(proofs.filter((p) => p.cKey !== 'moment'));
  const per = {};
  let doneSlots = 0, slots = 0, days = 0, kept = 0;
  for (let i = from; i <= to; i++) {
    const d = dayInfo(profile, m, dayKey(daysAgo(i)));
    d.keys.forEach((key) => {
      per[key] = per[key] || { n: 0, of: 0 };
      per[key].of++;
      if (d.done.has(key)) per[key].n++;
    });
    doneSlots += Math.min(d.n, d.N); slots += d.N; days++; if (d.ok) kept++;
  }
  return { per, doneSlots, slots, days, kept };
}

// endOffset: how many days ago the week ends (0 = this week ends today).
export function weekReport(proofs, profile, endOffset = 0, span = 7) {
  const keys = profile.commitments;
  const now = weekStats(proofs, profile, endOffset, endOffset + span - 1);
  const before = weekStats(proofs, profile, endOffset + span, endOffset + span * 2 - 1);
  const hasBefore = ageDays(profile) > endOffset + span;
  const score = now.slots ? Math.round((now.doneSlots / now.slots) * 10) : 0;
  const prevScore = hasBefore && before.slots ? Math.round((before.doneSlots / before.slots) * 10) : null;

  const ranked = keys.map((k) => ({ k, c: commitment(k), n: now.per[k]?.n || 0, of: now.per[k]?.of || span }))
    .sort((a, b) => b.n / b.of - a.n / a.of);
  const best = ranked[0], weak = ranked[ranked.length - 1];
  return { score, rating: rating(score), prevScore, ranked, best, weak, span, kept: now.kept, now };
}

export function coachReport(proofs, profile) {
  const span = Math.min(7, ageDays(profile));
  const r = weekReport(proofs, profile, 0, span);
  const st = streak(proofs, profile);
  const { best, weak } = r;
  const lines = [];
  const daysWord = (n) => `${n} ${n === 1 ? 'day' : 'days'}`;

  if (r.now.doneSlots === 0) {
    lines.push(pick([
      'Nothing posted yet this week. One proof today changes that.',
      'Clean slate. The first proof is the hardest, so make it a small one.',
    ], 'zero'));
  } else {
    if (best.n > 0) {
      lines.push(pick([
        `${best.c.label} is your strongest: ${best.n} of ${best.of} days.`,
        `You showed up for ${best.c.label.toLowerCase()} ${daysWord(best.n)} out of ${best.of}. That’s the habit forming.`,
        `${best.c.label} leads the way at ${best.n}/${best.of}.`,
      ], 'best'));
    }
    if (weak.k !== best.k && weak.n / weak.of < best.n / best.of) {
      lines.push(weak.n === 0
        ? pick([
          `${weak.c.label} hasn’t happened yet this week. Pick a time for it today.`,
          `${weak.c.label} is at zero. Make it the first thing you prove tomorrow.`,
        ], 'worst0')
        : pick([
          `${weak.c.label} is lagging at ${weak.n}/${weak.of}. That’s where your points are.`,
          `The gap is ${weak.c.label.toLowerCase()}: ${daysWord(weak.n)} so far.`,
        ], 'worst'));
    }
    if (r.prevScore !== null) {
      if (r.score > r.prevScore) lines.push(`Up from ${r.prevScore}/10 last week. Keep the direction.`);
      else if (r.score < r.prevScore) lines.push(`Down from ${r.prevScore}/10 last week. One strong day pulls it back.`);
      else lines.push(`Same as last week, ${r.prevScore}/10. Consistency is a result too.`);
    }
    if (st >= 3) lines.push(pick([`${st} days in a row. Keep showing up.`, `Your streak is ${st}. That’s a record of days you showed up.`], 'streak'));
  }

  const focus = weak.n < weak.of
    ? `Prove ${weak.c.label.toLowerCase()} first tomorrow, before anything else.`
    : 'Keep every goal. Same time, every day.';

  return { score: r.score, rating: r.rating, lines: lines.slice(0, 3), focus, span };
}
