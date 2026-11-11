// Stats: one summary, one 12-week picture, one bar per commitment.
import { S } from './state.js';
import { commitment } from './data.js';
import { streak, bestStreak, consistency, perCommitment, lastDays, byDay } from './stats.js';
import { ic } from './icons.js';
import { dayKey } from './util.js';

let showAll = false;

export function renderStats(el) {
  const P = S.profile;
  const st = streak(S.proofs), best = bestStreak(S.proofs);
  const cons = consistency(S.proofs, P, 30);
  const per = perCommitment(S.proofs, P, 30);

  el.innerHTML = `
  <header class="page-top"><div><p class="date">Last 30 days</p><h1 class="title">Stats</h1></div></header>

  <section class="card summary">
    <div><span class="lab">Streak</span><b class="num">${st}</b><small>${st === 1 ? 'day' : 'days'}. Best ${best}</small></div>
    <div><span class="lab">Consistency</span><b class="num">${cons}<i>%</i></b><small>of commitments kept</small></div>
  </section>

  <section class="days-sec" aria-label="Day by day">
    <div class="sec-h"><h2 class="headline">Day by day</h2>
      <span class="days-key">${P.commitments.map((k) => `<span>${ic(commitment(k).icon, 14)}</span>`).join('')}</span></div>
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
    const set = new Set((m.get(k) || []).map((p) => p.cKey));
    const n3 = P.commitments.filter((c) => set.has(c)).length;
    const d = new Date(`${k}T12:00`);
    return `<li class="day ${k === today ? 'is-today' : ''} ${n3 === 3 ? 'perfect' : ''}">
      <span class="day-d"><b>${k === today ? 'Today' : d.toLocaleDateString([], { weekday: 'short' })}</b><small>${d.toLocaleDateString([], { day: 'numeric', month: 'short' })}</small></span>
      <span class="day-marks">${P.commitments.map((c) => `<i class="${set.has(c) ? 'on' : ''}" title="${commitment(c).label}"></i>`).join('')}</span>
      <span class="day-n">${n3 === 3 ? 'Perfect' : `${n3}/3`}</span>
    </li>`;
  }).join('');
}
