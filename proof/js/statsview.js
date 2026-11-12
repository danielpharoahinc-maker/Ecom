// Stats: what you've built, where you're strong, where you slip, and when you show up.
import { S } from './state.js';
import { commitment } from './data.js';
import { streak, bestStreak, consistency, perCommitment, lastDays, byDay, dayInfo, daysKept, ageDays } from './stats.js';
import { weekReport } from './coach.js';
import { ic } from './icons.js';
import { dayKey, daysAgo, esc } from './util.js';

let showAll = false;
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const dow = (k) => (new Date(`${k}T12:00`).getDay() + 6) % 7; // Monday = 0
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

/* ---------- Numbers ---------- */

function facts(P) {
  const goal = S.proofs.filter((p) => p.cKey !== 'moment');
  const m = byDay(goal);
  const start = dayKey(P.createdAt || Date.now());
  const today = dayKey();
  const days = lastDays(Math.min(365, Math.max(1, ageDays(P)))).filter((k) => k >= start);
  let perfect = 0;
  const wd = Array.from({ length: 7 }, () => ({ kept: 0, of: 0 }));
  for (const k of days) {
    if (k === today) continue; // today isn't over, so it can't count against you
    const d = dayInfo(P, m, k);
    if (d.N && d.n >= d.N) perfect++;
    wd[dow(k)].of++; if (d.ok) wd[dow(k)].kept++;
  }
  const hours = [0, 0, 0, 0, 0]; // 5-11, 11-15, 15-19, 19-24, 0-5
  for (const p of goal) {
    const h = new Date(p.ts).getHours();
    hours[h >= 5 && h < 11 ? 0 : h >= 11 && h < 15 ? 1 : h >= 15 && h < 19 ? 2 : h >= 19 ? 3 : 4]++;
  }
  const photos = S.proofs.filter((p) => p.qa);
  const approved = photos.filter((p) => p.qa.ok).length;
  const avg = photos.length ? Math.round(photos.reduce((a, p) => a + (p.qa.score || 0), 0) / photos.length) : null;
  return {
    perfect, wd, hours, photos: photos.length, approved, avg,
    total: goal.length, pics: S.proofs.filter((p) => p.photoId).length,
    voice: S.proofs.filter((p) => p.audioId).length, moments: S.proofs.filter((p) => p.cKey === 'moment').length,
  };
}

// The last 10 weeks of week scores, oldest first.
function weeks(P) {
  const out = [];
  for (let i = 9; i >= 0; i--) {
    const off = i * 7;
    if (ageDays(P) <= off) { out.push(null); continue; }
    out.push(weekReport(S.proofs, P, off, 7).score);
  }
  return out;
}

// Plain-language read of your numbers.
function insights(P, f, per) {
  const out = [];
  const best = f.wd.map((x, i) => ({ i, r: x.of >= 3 ? x.kept / x.of : null, ...x })).filter((x) => x.r !== null);
  if (best.length >= 3) {
    const hi = best.reduce((a, b) => (b.r > a.r ? b : a)), lo = best.reduce((a, b) => (b.r < a.r ? b : a));
    if (hi.i !== lo.i && hi.r - lo.r >= 0.25) {
      out.push(`${FULL[lo.i]}s are your weak day: you kept ${lo.kept} of ${lo.of}.`);
      out.push(`${FULL[hi.i]}s are your strongest: you kept ${hi.kept} of ${hi.of}.`);
    }
  }
  const tot = f.hours.reduce((a, b) => a + b, 0);
  if (tot >= 6) {
    const names = ['mornings', 'around midday', 'in the afternoon', 'in the evening', 'late at night'];
    const top = f.hours.indexOf(Math.max(...f.hours));
    out.push(`You prove most ${names[top]} (${Math.round((f.hours[top] / tot) * 100)}%).`);
    if (f.hours[4] / tot >= 0.2) out.push('A fifth of your proof lands after midnight. Earlier is easier to keep up.');
  }
  const sorted = per.filter((c) => c.of >= 5).sort((a, b) => a.pct - b.pct);
  if (sorted.length >= 2 && sorted[0].pct < sorted[sorted.length - 1].pct - 15) out.push(`${commitment(sorted[0].key).label} is the one slipping: ${sorted[0].pct}% of days.`);
  if (f.photos >= 5) out.push(f.approved === f.photos ? 'Every photo you posted got Proff’s stamp.' : `Proff stamped ${f.approved} of ${f.photos} photos. Better light and a steady hand fix most misses.`);
  return out.slice(0, 4);
}

/* ---------- Pictures ---------- */

function heat(P) {
  const m = byDay(S.proofs.filter((p) => p.cKey !== 'moment'));
  const start = dayKey(P.createdAt || Date.now());
  const today = dayKey();
  const cols = 12, cell = 17, gap = 4;
  const end = new Date(); end.setHours(12, 0, 0, 0);
  const lastMon = new Date(end); lastMon.setDate(end.getDate() - ((end.getDay() + 6) % 7)); // this week's Monday
  const first = new Date(lastMon); first.setDate(first.getDate() - 7 * (cols - 1));
  let rects = '';
  for (let c = 0; c < cols; c++) for (let r = 0; r < 7; r++) {
    const d = new Date(first); d.setDate(first.getDate() + c * 7 + r);
    const k = dayKey(d.getTime());
    if (k > today) continue;
    let cls = 'l0';
    if (k >= start) { const i = dayInfo(P, m, k); cls = !i.n ? 'l0' : i.n >= i.N ? 'l3' : i.ok ? 'l2' : 'l1'; }
    else cls = 'l-';
    rects += `<rect class="${cls} ${k === today ? 'now' : ''}" x="${c * (cell + gap)}" y="${r * (cell + gap)}" width="${cell}" height="${cell}" rx="3"><title>${k}</title></rect>`;
  }
  const w = cols * (cell + gap) - gap, h = 7 * (cell + gap) - gap;
  return `<svg class="heat" viewBox="0 0 ${w} ${h}" role="img" aria-label="Your last 12 weeks, one square per day">${rects}</svg>`;
}

function weekBars(ws) {
  const have = ws.filter((x) => x !== null);
  if (have.length < 2) return '<p class="dim">Your weekly scores show up after your second week.</p>';
  return `<div class="wbars" role="img" aria-label="Weekly scores out of 10">${ws.map((s, i) => `<div class="wb ${i === ws.length - 1 ? 'now' : ''}"><i style="height:${s === null ? 0 : Math.max(4, s * 10)}%"></i><b>${s === null ? '' : s}</b></div>`).join('')}</div>`;
}

/* ---------- Screen ---------- */

export function renderStats(el) {
  const P = S.profile;
  const st = streak(S.proofs, P), best = bestStreak(S.proofs, P), kept = daysKept(S.proofs, P);
  const cons = consistency(S.proofs, P, 30);
  const per = perCommitment(S.proofs, P, 30);
  const f = facts(P);
  const ws = weeks(P);
  const ins = insights(P, f, per);
  const hmax = Math.max(1, ...f.hours);
  const HN = ['Morning', 'Midday', 'Afternoon', 'Evening', 'Night'];

  el.innerHTML = `
  <header class="page-top"><div><p class="date">${plural(ageDays(P), 'day')} with Proof</p><h1 class="title">Stats</h1></div></header>

  <section class="card st-hero">
    <div class="st-streak"><b class="num">${st}</b><span><i>${ic('flame', 18)}</i>day streak</span></div>
    <div class="st-mini">
      <div><b>${best}</b><small>Best streak</small></div>
      <div><b>${kept}</b><small>Days kept</small></div>
      <div><b>${f.perfect}</b><small>Perfect days</small></div>
      <div><b>${cons}<i>%</i></b><small>Consistency</small></div>
    </div>
  </section>

  ${ins.length ? `<section class="card st-ins"><h2 class="headline">What I’m seeing</h2><ul>${ins.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></section>` : ''}

  <section class="card">
    <div class="sec-h"><h2 class="headline">Last 12 weeks</h2><span class="legend" aria-hidden="true"><i class="l0"></i><i class="l1"></i><i class="l2"></i><i class="l3"></i></span></div>
    ${heat(P)}
  </section>

  <section class="card">
    <h2 class="headline">Week score</h2>
    ${weekBars(ws)}
  </section>

  <section class="card">
    <h2 class="headline">Each goal, last 30 days</h2>
    ${per.map((c) => {
      const m = commitment(c.key);
      return `<div class="hbar">
        <span class="hbar-l">${ic(m.icon, 18)}<b>${m.label}</b></span>
        <span class="hbar-v">${c.pct}%</span>
        <span class="track"><i style="width:${c.pct}%"></i></span>
      </div>`;
    }).join('')}
  </section>

  <section class="card">
    <h2 class="headline">Best day of the week</h2>
    <div class="wd">${f.wd.map((x, i) => `<div class="wd-c"><span class="wd-b"><i style="height:${x.of ? Math.max(6, Math.round((x.kept / x.of) * 100)) : 0}%"></i></span><small>${DOW[i][0]}</small></div>`).join('')}</div>
  </section>

  <section class="card">
    <h2 class="headline">When you show up</h2>
    ${f.hours.map((n, i) => `<div class="hbar"><span class="hbar-l"><b>${HN[i]}</b></span><span class="hbar-v">${n}</span><span class="track"><i style="width:${Math.round((n / hmax) * 100)}%"></i></span></div>`).join('')}
  </section>

  <section class="card st-q">
    <h2 class="headline">Proff’s stamp</h2>
    ${f.photos ? `<div class="st-mini"><div><b>${f.approved}<i>/${f.photos}</i></b><small>Photos approved</small></div><div><b>${f.avg}</b><small>Average quality</small></div></div>` : '<p class="dim">Post a photo and Proff will check it.</p>'}
  </section>

  <section class="card">
    <h2 class="headline">All time</h2>
    <div class="st-mini st-tot"><div><b>${f.total}</b><small>Proofs</small></div><div><b>${f.pics}</b><small>Photos</small></div><div><b>${f.voice}</b><small>Voice notes</small></div><div><b>${f.moments}</b><small>Moments</small></div></div>
  </section>

  <section class="days-sec" aria-label="Day by day">
    <div class="sec-h"><h2 class="headline">Day by day</h2></div>
    <ol class="days">${dayRows(P, showAll ? 30 : 10)}</ol>
    <button class="btn btn-quiet" data-more>${showAll ? 'Show fewer days' : 'Show 30 days'}</button>
  </section>`;

  el.querySelector('[data-more]').addEventListener('click', () => { showAll = !showAll; renderStats(el); });
}

// One row per day, newest first: the date, a mark per commitment, the count.
function dayRows(P, n) {
  const m = byDay(S.proofs.filter((p) => p.cKey !== 'moment'));
  const today = dayKey();
  const start = dayKey(P.createdAt || Date.now());
  return lastDays(n).reverse().filter((k) => k >= start).map((k) => {
    const d = dayInfo(P, m, k);
    const dt = new Date(`${k}T12:00`);
    const marks = d.keys.map((c) => `<i class="${d.done.has(c) ? 'on' : ''}" title="${commitment(c).label}"></i>`).join('');
    return `<li class="day ${k === today ? 'is-today' : ''} ${d.n >= d.N ? 'perfect' : d.ok ? 'kept' : ''}">
      <span class="day-d"><b>${k === today ? 'Today' : dt.toLocaleDateString([], { weekday: 'short' })}</b><small>${dt.toLocaleDateString([], { day: 'numeric', month: 'short' })}</small></span>
      <span class="day-marks ${d.N > 4 ? 'tight' : ''}">${marks}</span>
      <span class="day-n">${d.n >= d.N ? 'Perfect' : d.ok ? 'Kept' : `${d.n}/${d.N}`}</span>
    </li>`;
  }).join('');
}
