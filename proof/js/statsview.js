// Stats: the data centre. Hand-drawn SVG charts, no chart library.
import { S } from './state.js';
import { commitment } from './data.js';
import {
  streak, bestStreak, consistency, perCommitment, perfectDays, totalMinutes,
  dailyDone, timeOfDay, lastDays, byDay,
} from './stats.js';
import { ic } from './icons.js';
import { fmtMins } from './util.js';

let range = 7;

export function renderStats(el) {
  const P = S.profile;
  const st = streak(S.proofs), best = bestStreak(S.proofs);
  const cons = consistency(S.proofs, P, 30);
  const mins = totalMinutes(S.proofs);
  const per = perCommitment(S.proofs, P, 30);
  const tod = timeOfDay(S.proofs);
  const todMax = Math.max(1, ...Object.values(tod));

  el.innerHTML = `
  <header class="page-top"><div><p class="date">Last 30 days</p><h1 class="h1">Stats</h1></div></header>

  <section class="kpis">
    <div class="kpi glass"><span class="w-lab">Current streak</span><b>${st}</b><small>Best ${best}</small></div>
    <div class="kpi glass"><span class="w-lab">Consistency</span><b>${cons}<i>%</i></b><small>of commitments kept</small></div>
    <div class="kpi glass"><span class="w-lab">Locked in</span><b>${mins >= 60 ? Math.floor(mins / 60) : mins}<i>${mins >= 60 ? 'h' : 'm'}</i></b><small>${fmtMins(mins)} total</small></div>
    <div class="kpi glass"><span class="w-lab">Perfect days</span><b>${perfectDays(S.proofs, P)}</b><small>all three done</small></div>
  </section>

  <section class="card glass">
    <div class="card-h"><h2 class="h3">Commitments per day</h2>
      <div class="seg-ctl" role="tablist">
        <button class="${range === 7 ? 'on' : ''}" data-r="7">7 days</button>
        <button class="${range === 30 ? 'on' : ''}" data-r="30">30 days</button>
      </div>
    </div>
    ${barChart(dailyDone(S.proofs, range))}
  </section>

  <section class="card glass">
    <h2 class="h3">Last 12 weeks</h2>
    ${heatmap()}
    <div class="legend"><span>Less</span>${[0, 1, 2, 3].map((l) => `<i class="l${l}"></i>`).join('')}<span>More</span></div>
  </section>

  <section class="card glass">
    <h2 class="h3">Each commitment</h2>
    ${per.map((c) => {
      const m = commitment(c.key);
      return `<div class="hbar">
        <span class="hbar-l">${ic(m.icon, 18)}<b>${m.label}</b></span>
        <span class="hbar-v">${c.done}/${c.of} days</span>
        <span class="track"><i style="width:${c.pct}%"></i></span>
      </div>`;
    }).join('')}
  </section>

  <section class="card glass">
    <h2 class="h3">When you post</h2>
    <div class="tod">${Object.entries(tod).map(([k, v]) => `
      <div class="tod-col"><span class="tod-bar"><i style="height:${(v / todMax) * 100}%"></i></span><b>${v}</b><small>${k}</small></div>`).join('')}
    </div>
  </section>`;

  el.querySelectorAll('[data-r]').forEach((b) => b.addEventListener('click', () => { range = +b.dataset.r; renderStats(el); }));
}

function barChart(data) {
  const W = 320, H = 130, pad = 18;
  const bw = (W - 8) / data.length;
  const gap = data.length > 10 ? 2 : 8;
  const bars = data.map((d, i) => {
    const h = (d.n / 3) * (H - pad - 6);
    const x = 4 + i * bw + gap / 2;
    const y = H - pad - h;
    const label = data.length <= 7
      ? new Date(`${d.k}T12:00`).toLocaleDateString([], { weekday: 'narrow' })
      : (i % 5 === 4 ? new Date(`${d.k}T12:00`).getDate() : '');
    return `<rect x="${x}" y="${H - pad - (H - pad - 6)}" width="${bw - gap}" height="${H - pad - 6}" fill="rgba(255,255,255,.05)"/>
      ${d.n ? `<rect x="${x}" y="${y}" width="${bw - gap}" height="${h}" fill="url(#bg)"/>` : ''}
      <text x="${x + (bw - gap) / 2}" y="${H - 3}" text-anchor="middle">${label}</text>`;
  }).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Commitments completed per day">
    <defs><linearGradient id="bg" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#1c3a8a"/><stop offset="1" stop-color="#ffffff"/></linearGradient></defs>
    ${[1, 2, 3].map((g) => `<line x1="0" x2="${W}" y1="${H - pad - (g / 3) * (H - pad - 6)}" y2="${H - pad - (g / 3) * (H - pad - 6)}" stroke="rgba(255,255,255,.06)" stroke-dasharray="2 4"/>`).join('')}
    ${bars}</svg>`;
}

function heatmap() {
  // 12 columns (weeks) x 7 rows, ending this week.
  const days = lastDays(84);
  const m = byDay(S.proofs);
  const cell = 22, gap = 4;
  const firstDow = (new Date(`${days[0]}T12:00`).getDay() + 6) % 7; // Monday = 0
  const cells = days.map((k, i) => {
    const idx = i + firstDow;
    const col = Math.floor(idx / 7), row = idx % 7;
    const n = new Set((m.get(k) || []).map((p) => p.cKey)).size;
    return `<rect class="l${Math.min(3, n)}" x="${col * (cell + gap)}" y="${row * (cell + gap)}" width="${cell}" height="${cell}"><title>${k}: ${n} of 3</title></rect>`;
  }).join('');
  const cols = Math.ceil((days.length + firstDow) / 7);
  return `<svg class="heat" viewBox="0 0 ${cols * (cell + gap) - gap} ${7 * (cell + gap) - gap}" role="img" aria-label="Proof posted per day over 12 weeks">${cells}</svg>`;
}
