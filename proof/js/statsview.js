// Stats: one summary, one 12-week picture, one bar per commitment.
import { S } from './state.js';
import { commitment } from './data.js';
import { streak, bestStreak, consistency, perCommitment, lastDays, byDay } from './stats.js';
import { ic } from './icons.js';
import { dayKey } from './util.js';

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

  <section class="card">
    <div class="sec-h"><h2 class="headline">Last 12 weeks</h2>
      <span class="legend" aria-hidden="true">${[0, 1, 2, 3].map((l) => `<i class="l${l}"></i>`).join('')}</span></div>
    ${heatmap()}
    <p class="dim small">Each square is a day. Brighter means more of your three commitments done.</p>
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
}

function heatmap() {
  const days = lastDays(84);
  const m = byDay(S.proofs);
  const today = dayKey();
  const cell = 22, gap = 5;
  const firstDow = (new Date(`${days[0]}T12:00`).getDay() + 6) % 7; // Monday first
  const cells = days.map((k, i) => {
    const idx = i + firstDow;
    const n = new Set((m.get(k) || []).map((p) => p.cKey)).size;
    return `<rect class="l${Math.min(3, n)}${k === today ? ' today' : ''}" x="${Math.floor(idx / 7) * (cell + gap)}" y="${(idx % 7) * (cell + gap)}" width="${cell}" height="${cell}" rx="3"><title>${k}: ${n} of 3</title></rect>`;
  }).join('');
  const cols = Math.ceil((days.length + firstDow) / 7);
  return `<svg class="heat" viewBox="0 0 ${cols * (cell + gap) - gap} ${7 * (cell + gap) - gap}" role="img" aria-label="Commitments done per day over the last 12 weeks">${cells}</svg>`;
}
