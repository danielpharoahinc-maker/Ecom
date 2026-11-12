// Stats: one summary, one 12-week picture, one bar per commitment.
import { S } from './state.js';
import { commitment } from './data.js';
import { streak, bestStreak, consistency, perCommitment, lastDays, byDay, dayInfo, daysKept } from './stats.js';
import { ic } from './icons.js';
import { dayKey } from './util.js';

let showAll = false;

export function renderStats(el) {
  const P = S.profile;
  const st = streak(S.proofs, P), best = bestStreak(S.proofs, P), kept = daysKept(S.proofs, P);
  const cons = consistency(S.proofs, P, 30);
  const per = perCommitment(S.proofs, P, 30);

  el.innerHTML = `
  <header class="page-top"><div><p class="date">Last 30 days</p><h1 class="title">Stats</h1></div></header>

  <section class="card summary">
    <div><span class="lab">Streak</span><b class="num">${st}</b><small>${st === 1 ? 'day' : 'days'}. Best ${best}. Kept ${kept} ${kept === 1 ? 'day' : 'days'} in all</small></div>
    <div><span class="lab">Consistency</span><b class="num">${cons}<i>%</i></b><small>of commitments kept</small></div>
  </section>

  <section class="days-sec" aria-label="Day by day">
    <div class="sec-h"><h2 class="headline">Day by day</h2>
      <span class="dim small">Goal days, newest first</span></div>
    <ol class="days">${dayRows(P, showAll ? 30 : 10)}</ol>
    <button class="btn btn-quiet" data-more>${showAll ? 'Show fewer days' : 'Show 30 days'}</button>
  </section>

  <section class="card">
    <h2 class="headline">Each commitment</h2>
    ${per.map((c) => {
      const m = commitment(c.key);
      return `<div class="hbar">
        <span class="hbar-l">${ic(m.icon, 18)}<b>${m.label}</b></span>
        <span class="hbar-v">${c.done} of ${c.of} days</span>
        <span class="track"><i style="width:${c.pct}%"></i></span>
      </div>`;
    }).join('')}
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
