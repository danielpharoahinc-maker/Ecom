// One proof, full size: photo, what they said, voice playback, delete.
import { S, deleteProof, mediaURL } from './state.js';
import { commitment } from './data.js';
import { openSheet } from './sheet.js';
import { ic } from './icons.js';
import { esc, fmtDay, fmtClock, fmtDur, fmtMins, toast } from './util.js';

export async function openProof(id) {
  const p = S.proofs.find((x) => x.id === id);
  if (!p) return;
  const c = commitment(p.cKey);
  const [img, aud] = await Promise.all([mediaURL(p.photoId), mediaURL(p.audioId)]);
  openSheet(`
    ${img ? `<div class="pv-photo"><img src="${img}" alt="Proof photo for ${c.label}"></div>` : `<div class="pv-voice">${ic('wave', 72, 1.5)}</div>`}
    <div class="pv-head">
      <span class="pv-ic">${ic(c.icon, 22)}</span>
      <div><b>${c.label}</b><small>${fmtDay(p.ts)}, ${fmtClock(p.ts)}${p.mins ? `. ${fmtMins(p.mins)}` : ''}</small></div>
    </div>
    ${p.note ? `<p class="pv-note">“${esc(p.note)}”</p>` : ''}
    ${aud ? `<button class="btn btn-glass" data-play>${ic('play', 18)}<span>Play voice note ${fmtDur(p.audioSecs || 0)}</span></button><audio src="${aud}" hidden></audio>` : ''}
    <button class="btn btn-ghost danger" data-del>${ic('trash', 18)}<span>Delete this proof</span></button>
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
      body.querySelector('[data-del]').addEventListener('click', async () => {
        if (!confirm('Delete this proof? Your streak may change.')) return;
        await deleteProof(p.id);
        close();
        toast('Proof deleted');
      });
    },
  });
}
