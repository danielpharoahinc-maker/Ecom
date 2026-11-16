// One proof, full size: photo, what they said, voice playback, delete.
import { S, deleteProof, mediaURL } from './state.js';
import { commitment } from './data.js';
import { openSheet, confirmSheet } from './sheet.js';
import { ic } from './icons.js';
import { esc, fmtDay, fmtClock, fmtDur, toast } from './util.js';

const VERDICT = { great: 'Great meal', good: 'Good meal', ok: 'Okay meal', poor: 'Not a good one' };
function aiCard(p) {
  const a = p.analysis;
  if (!a) return p.meal ? `<p class="ai-wait">${S.profile?.apiConnected ? 'Claude hasn’t reviewed this meal yet. Ask Claude to check your Proof meals.' : 'Connect Claude in Account to get this meal reviewed.'}</p>` : '';
  const s = Math.max(0, Math.min(10, Math.round(a.score ?? 0)));
  return `<div class="ai-card v-${esc(a.verdict || 'ok')}">
    <div class="ai-top"><b>Claude’s take</b><span class="ai-score">${s}<small>/10</small></span></div>
    <p class="ai-verdict">${esc(VERDICT[a.verdict] || a.verdict || '')}</p>
    ${a.summary ? `<p class="ai-sum">${esc(a.summary)}</p>` : ''}
    ${(a.tips || []).length ? `<ul class="ai-tips">${a.tips.slice(0, 4).map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
  </div>`;
}

export async function openProof(id) {
  const p = S.proofs.find((x) => x.id === id);
  if (!p) return;
  const c = commitment(p.cKey);
  const [img, aud] = await Promise.all([mediaURL(p.photoId), mediaURL(p.audioId)]);
  openSheet(`
    ${img ? `<div class="pv-photo"><img src="${img}" alt="Proof photo for ${c.label}"></div>` : ''}
    <div class="pv-head">
      <span class="pv-ic">${ic(c.icon, 20)}</span>
      <div><b>${c.label}</b><small>${fmtDay(p.ts)}, ${fmtClock(p.ts)}</small></div>
      <button class="icon-btn round quiet" data-more aria-label="Delete this proof">${ic('trash', 18)}</button>
    </div>
    ${p.meal ? `<div class="pv-meal"><span class="mp on">${esc(p.meal.type)}</span>${(p.meal.tags || []).map((t) => `<span class="mp">${esc(t)}</span>`).join('')}</div>` : ''}
    ${p.note ? `<p class="pv-note">“${esc(p.note)}”</p>` : ''}
    ${aiCard(p)}
    ${aud ? `<button class="btn btn-secondary" data-play>${ic('play', 18)}<span>Play voice note ${fmtDur(p.audioSecs || 0)}</span></button><audio src="${aud}" hidden></audio>` : ''}
  `, {
    tall: true,
    onMount(body, close) {
      const a = body.querySelector('audio');
      const b = body.querySelector('[data-play]');
      if (a && b) {
        const label = b.querySelector('span').textContent;
        b.addEventListener('click', () => (a.paused ? a.play() : a.pause()));
        a.addEventListener('play', () => { b.innerHTML = `${ic('pause', 18)}<span>Pause</span>`; });
        a.addEventListener('pause', () => { b.innerHTML = `${ic('play', 18)}<span>${label}</span>`; });
        body.closest('.sheet-wrap').addEventListener('sheet:close', () => a.pause());
      }
      body.querySelector('[data-more]').addEventListener('click', async () => {
        close();
        // Hidden at once, really deleted after 5 seconds unless you tap Undo.
        S.proofs = S.proofs.filter((x) => x.id !== p.id);
        window.dispatchEvent(new Event('proof:changed'));
        let undone = false;
        const timer = setTimeout(async () => {
          if (undone) return;
          S.proofs.push(p);
          await deleteProof(p.id);
        }, 5200);
        toast('Proof deleted', { action: () => {
          undone = true; clearTimeout(timer);
          S.proofs.push(p); S.proofs.sort((a, b) => b.ts - a.ts);
          window.dispatchEvent(new Event('proof:changed'));
        } });
      });
    },
  });
}
