// Vault: your proof is locked away. Hold to open the door, then see what the
// coach makes of your week and every proof as a framed print, day by day.
import { S, hydrateMedia, mediaURL } from './state.js';
import { commitment } from './data.js';
import { byDay } from './stats.js';
import { coachReport } from './coach.js';
import { openProof } from './proofview.js';
import { openCapture } from './capture.js';
import { ic } from './icons.js';
import { esc, fmtShortDay, dayKey, fmtClock, haptic } from './util.js';

let opened = false; // once per visit: reopening the app locks it again
const HOLD_MS = 900;

export function renderVault(el) {
  if (!S.proofs.length) { opened = true; return renderInside(el, false); }
  return opened ? renderInside(el, false) : renderDoor(el);
}

/* ---------- The door ---------- */

function renderDoor(el) {
  const n = S.proofs.length;
  const bolts = Array.from({ length: 12 }, (_, i) => `<i style="transform:rotate(${i * 30}deg) translateY(-118px)"></i>`).join('');
  const ticks = Array.from({ length: 40 }, (_, i) => `<b style="transform:rotate(${i * 9}deg) translateY(-62px)" class="${i % 5 ? '' : 'big'}"></b>`).join('');
  el.innerHTML = `
  <header class="page-top"><div><p class="date">${n} ${n === 1 ? 'proof' : 'proofs'} locked inside</p><h1 class="title">Vault</h1></div></header>
  <section class="vault-stage">
    <div class="vault-door" aria-hidden="true">
      <div class="vd-bolts">${bolts}</div>
      <div class="vd-face">
        <div class="vd-ticks">${ticks}</div>
        <div class="vd-wheel">
          <svg viewBox="-60 -60 120 120"><g stroke="currentColor" stroke-width="7" stroke-linecap="round">
            <line x1="0" y1="-48" x2="0" y2="48"/><line x1="-41.6" y1="-24" x2="41.6" y2="24"/><line x1="-41.6" y1="24" x2="41.6" y2="-24"/></g>
            <circle r="16" fill="currentColor"/></svg>
        </div>
      </div>
    </div>
    <button class="vault-hold" data-hold aria-label="Hold to open your vault">
      <svg class="vh-ring" viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="20"/></svg>
      <span>${ic('lock', 18)}</span><b>Hold to open</b>
    </button>
  </section>`;

  const btn = el.querySelector('[data-hold]');
  const stage = el.querySelector('.vault-stage');
  let t = null;
  const open = () => {
    clearTimeout(t); t = null;
    haptic(30);
    stage.classList.add('opening');
    setTimeout(() => { opened = true; renderInside(el, true); window.scrollTo(0, 0); }, 900);
  };
  const start = (e) => {
    e.preventDefault();
    if (stage.classList.contains('opening')) return;
    stage.classList.add('holding');
    haptic(10);
    t = setTimeout(open, HOLD_MS);
  };
  const cancel = () => { if (!t) return; clearTimeout(t); t = null; stage.classList.remove('holding'); };
  btn.addEventListener('pointerdown', start);
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => btn.addEventListener(ev, cancel));
  btn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
}

/* ---------- Inside ---------- */

// A slight, stable tilt per photo, like prints laid out by hand.
const tilt = (id) => { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0; return ((Math.abs(h) % 7) - 3) * 0.45; };

function renderInside(el, animate) {
  const days = [...byDay(S.proofs).entries()];
  const today = dayKey();
  const r = S.proofs.length ? coachReport(S.proofs, S.profile) : null;
  const C = 2 * Math.PI * 34;

  el.innerHTML = `
  <header class="page-top">
    <div><p class="date">${S.proofs.length} ${S.proofs.length === 1 ? 'proof' : 'proofs'}</p><h1 class="title">Vault</h1></div>
    ${S.proofs.some((p) => p.photoId) ? `<button class="btn-pill" data-recap>${ic('play', 14)}<span>Recap</span></button>` : ''}
  </header>

  ${r ? `<section class="coach ${animate ? 'reveal' : ''}" aria-label="Your week">
    <div class="coach-top">
      <div class="coach-ring" role="img" aria-label="${r.score} out of 10">
        <svg viewBox="0 0 80 80"><circle class="track" cx="40" cy="40" r="34"/><circle class="fill" cx="40" cy="40" r="34" style="stroke-dasharray:${C};stroke-dashoffset:${C * (1 - r.score / 10)}"/></svg>
        <b>${r.score}<small>/10</small></b>
      </div>
      <div class="coach-head"><span class="lab">${r.span === 7 ? 'This week' : `Your first ${r.span} ${r.span === 1 ? 'day' : 'days'}`}</span><h2 class="h2">${r.rating}</h2></div>
    </div>
    <p class="coach-thinking" ${animate ? '' : 'hidden'}>Reading your week…</p>
    <ul class="coach-lines" ${animate ? 'hidden' : ''}>${r.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
    <p class="coach-focus" ${animate ? 'hidden' : ''}><b>Focus:</b> ${esc(r.focus)}</p>
  </section>` : ''}

  ${days.length ? days.map(([k, ps]) => `
    <section class="vday">
      <h2 class="vday-h">${k === today ? 'Today' : fmtShortDay(ps[0].ts)}</h2>
      <div class="prints">${ps.map((p) => `
        <button class="print" data-open="${p.id}" style="--tilt:${tilt(p.id)}deg" aria-label="${commitment(p.cKey).label} at ${fmtClock(p.ts)}">
          <span class="print-img">${p.photoId ? `<img data-media="${p.photoId}" alt="" loading="lazy">` : `<span class="print-voice">“${esc((p.note || 'Voice proof').slice(0, 60))}”</span>`}</span>
          <span class="print-cap">${ic(commitment(p.cKey).icon, 13)}<time>${fmtClock(p.ts)}</time></span>
        </button>`).join('')}</div>
    </section>`).join('') : `
    <div class="empty">
      <b>Nothing in your vault yet</b>
      <p>Every proof you post is locked in here, day by day.</p>
      <button class="btn btn-primary" data-capture>${ic('camera', 20)}<span>Post your first proof</span></button>
    </div>`}`;

  hydrateMedia(el);
  el.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => openProof(b.dataset.open)));
  el.querySelector('[data-capture]')?.addEventListener('click', () => openCapture());
  el.querySelector('[data-recap]')?.addEventListener('click', recap);
  if (animate && r) typeOut(el);
}

// "Thinking", then the lines appear word by word.
function typeOut(el) {
  const think = el.querySelector('.coach-thinking');
  const list = el.querySelector('.coach-lines');
  const focus = el.querySelector('.coach-focus');
  const items = [...list.querySelectorAll('li'), focus];
  const texts = items.map((n) => n.innerHTML);
  items.forEach((n) => { n.innerHTML = ''; });
  setTimeout(async () => {
    think.hidden = true; list.hidden = false; focus.hidden = false;
    for (let i = 0; i < items.length; i++) {
      const parts = texts[i].split(/(\s+)/);
      for (const part of parts) {
        if (!el.isConnected) return;
        items[i].innerHTML += part;
        if (part.trim()) await new Promise((res) => setTimeout(res, 28));
      }
    }
  }, 750);
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
