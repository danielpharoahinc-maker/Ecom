// Vault: every proof you've posted, day by day, plus a 30-day recap player.
import { S, hydrateMedia, mediaURL } from './state.js';
import { commitment } from './data.js';
import { byDay } from './stats.js';
import { openProof } from './proofview.js';
import { openCapture } from './capture.js';
import { ic } from './icons.js';
import { fmtShortDay, dayKey, fmtClock } from './util.js';

export function renderVault(el) {
  const days = [...byDay(S.proofs).entries()];
  const today = dayKey();

  el.innerHTML = `
  <header class="page-top">
    <div><p class="date">${S.proofs.length} ${S.proofs.length === 1 ? 'proof' : 'proofs'}</p><h1 class="title">Vault</h1></div>
    ${S.proofs.some((p) => p.photoId) ? `<button class="btn-pill" data-recap>${ic('play', 14)}<span>Recap</span></button>` : ''}
  </header>
  ${days.length ? days.map(([k, ps]) => `
    <section class="vday">
      <h2 class="vday-h">${k === today ? 'Today' : fmtShortDay(ps[0].ts)}</h2>
      <div class="vgrid">${ps.map((p) => `
        <button class="vcell" data-open="${p.id}" aria-label="${commitment(p.cKey).label} at ${fmtClock(p.ts)}">
          ${p.photoId ? `<img data-media="${p.photoId}" alt="" loading="lazy">` : `<span class="vcell-voice">“${(p.note || 'Voice proof').slice(0, 60).replace(/</g, '&lt;')}”</span>`}
          <span class="vcell-tag">${ic(commitment(p.cKey).icon, 13)}</span>
        </button>`).join('')}</div>
    </section>`).join('') : `
    <div class="empty">
      <b>Nothing in your vault yet</b>
      <p>Every proof you post is kept here, day by day.</p>
      <button class="btn btn-primary" data-capture>${ic('camera', 20)}<span>Post your first proof</span></button>
    </div>`}`;

  hydrateMedia(el);
  el.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => openProof(b.dataset.open)));
  el.querySelector('[data-capture]')?.addEventListener('click', () => openCapture());
  el.querySelector('[data-recap]')?.addEventListener('click', recap);
}

// Full-screen slideshow of the last 30 days of photos, oldest first.
async function recap() {
  const since = Date.now() - 30 * 864e5;
  const shots = S.proofs.filter((p) => p.photoId && p.ts >= since).reverse();
  if (!shots.length) return;
  const urls = await Promise.all(shots.map((p) => mediaURL(p.photoId)));
  const ov = document.createElement('div');
  ov.className = 'recap';
  ov.innerHTML = `
    <div class="recap-bars">${shots.map(() => '<i><b></b></i>').join('')}</div>
    <img alt="">
    <div class="recap-cap"><b></b><span></span></div>
    <button class="icon-btn glass round recap-x" aria-label="Close recap">${ic('close', 20)}</button>
    <div class="recap-end" hidden><p class="recap-num">${shots.length}</p><p>proofs in 30 days</p><span class="recap-brand">Proof</span></div>`;
  document.body.appendChild(ov);
  document.body.classList.add('noscroll');
  const img = ov.querySelector('img');
  const bars = ov.querySelectorAll('.recap-bars i');
  let i = 0, t;
  const end = () => { clearTimeout(t); ov.remove(); document.body.classList.remove('noscroll'); };
  const show = () => {
    if (i >= shots.length) { ov.querySelector('.recap-end').hidden = false; img.hidden = true; t = setTimeout(end, 2600); return; }
    const p = shots[i];
    img.src = urls[i];
    img.style.animation = 'none'; void img.offsetWidth; img.style.animation = '';
    ov.querySelector('.recap-cap b').textContent = commitment(p.cKey).label;
    ov.querySelector('.recap-cap span').textContent = fmtShortDay(p.ts);
    bars.forEach((b, j) => b.classList.toggle('done', j < i));
    bars[i].classList.add('run');
    i++;
    t = setTimeout(show, 1100);
  };
  ov.querySelector('.recap-x').addEventListener('click', end);
  show();
}
