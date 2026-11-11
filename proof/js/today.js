// Today: the widget screen. Every widget does work when tapped. A commitment
// widget opens the camera already set to that commitment.
import { S, hydrateMedia, signOut, resetEverything } from './state.js';
import { commitment } from './data.js';
import { doneToday, streak } from './stats.js';
import { openCapture } from './capture.js';
import { openProof } from './proofview.js';
import { openSheet } from './sheet.js';
import { signOutLive } from './auth.js';
import { ic } from './icons.js';
import { esc, fmtDay, timeAgo, fmtDur, emit } from './util.js';
import { LIVE } from './config.js';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Morning' : h < 18 ? 'Afternoon' : 'Evening';
}

export function renderToday(el) {
  const P = S.profile;
  const done = doneToday(S.proofs);
  const n = P.commitments.filter((k) => done.has(k)).length;
  const st = streak(S.proofs);
  const last = S.proofs[0];
  const club = S.clubs[0];
  const todays = (k) => S.proofs.find((p) => p.cKey === k && done.has(k) && new Date(p.ts).toDateString() === new Date().toDateString());

  el.innerHTML = `
  <header class="page-top">
    <div>
      <p class="date">${fmtDay(Date.now())}</p>
      <h1 class="h1">${greeting()}, ${esc(P.name)}</h1>
    </div>
    <button class="avatar" data-settings aria-label="Settings">${esc(P.name[0].toUpperCase())}</button>
  </header>

  <section class="widgets">
    <button class="w w-day glass" data-go="stats">
      <span class="w-lab">Locked in today</span>
      <span class="w-big">${n}<small>/3</small></span>
      <span class="seg">${P.commitments.map((k) => `<i class="${done.has(k) ? 'on' : ''}"></i>`).join('')}</span>
    </button>

    <button class="w w-streak glass" data-go="stats">
      <span class="w-lab">Streak</span>
      <span class="w-big">${st}<small>${st === 1 ? 'day' : 'days'}</small></span>
      <span class="w-flame ${st ? 'lit' : ''}">${ic('flame', 30)}</span>
    </button>

    ${last ? `
    <article class="w w-last glass wide" data-open="${last.id}" tabindex="0" role="button" aria-label="Open your last proof">
      ${last.photoId ? `<img data-media="${last.photoId}" alt="">` : `<div class="w-last-voice" aria-hidden="true">${ic('wave', 64, 1.5)}</div>`}
      <div class="w-last-shade"></div>
      <div class="w-last-body">
        <span class="w-lab">Last proof</span>
        <b>${commitment(last.cKey).label}</b>
        ${last.note ? `<p>“${esc(last.note)}”</p>` : ''}
        <span class="w-meta">${timeAgo(last.ts)}${last.audioId ? ` <span class="pill">${ic('play', 12)} ${fmtDur(last.audioSecs || 0)}</span>` : ''}</span>
      </div>
    </article>` : `
    <button class="w w-empty glass wide" data-capture>
      <span class="w-empty-ic">${ic('camera', 30)}</span>
      <b>Post your first proof</b>
      <span>One photo, a few words. Takes 10 seconds.</span>
    </button>`}

    <div class="w-row wide">
      ${P.commitments.map((k) => {
        const c = commitment(k); const p = todays(k);
        return `<button class="w w-commit glass ${p ? 'done' : ''}" data-capture="${k}" aria-label="${c.label}: ${p ? 'done today, add another' : 'post proof'}">
          ${p?.photoId ? `<img data-media="${p.photoId}" alt="">` : ''}
          <span class="w-commit-ic">${p ? ic('check', 22, 2.4) : ic(c.icon, 22)}</span>
          <b>${c.label}</b>
          <small>${p ? 'Done' : 'Prove it'}</small>
        </button>`;
      }).join('')}
    </div>

    <div class="w w-quick glass wide">
      <button data-capture>${ic('camera', 24)}<span>Snap</span></button>
      <button data-talk>${ic('mic', 24)}<span>Talk</span></button>
    </div>

    <button class="w w-club glass wide" data-go="club">
      <span class="w-club-ic">${ic('club', 26)}</span>
      <span class="w-club-txt">
        <b>${club ? esc(club.name) : 'Lock in with your crew'}</b>
        <small>${club ? `${club.members.length} ${club.members.length === 1 ? 'member' : 'members'}. Invite code ${club.code}` : 'Start a club and invite your friends.'}</small>
      </span>
      ${ic('chevron', 20)}
    </button>
  </section>`;

  hydrateMedia(el);
  el.querySelectorAll('[data-capture]').forEach((b) => b.addEventListener('click', () => openCapture({ cKey: b.dataset.capture || undefined })));
  el.querySelector('[data-talk]').addEventListener('click', () => openCapture({ mode: 'voice' }));
  el.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => emit('proof:tab', b.dataset.go)));
  el.querySelector('[data-open]')?.addEventListener('click', (e) => openProof(e.currentTarget.dataset.open));
  el.querySelector('[data-settings]').addEventListener('click', settings);
}

function settings() {
  const u = S.user;
  openSheet(`
    <h2 class="h2">Account</h2>
    <div class="set-row glass"><span class="avatar">${esc(S.profile.name[0].toUpperCase())}</span>
      <span><b>${esc(S.profile.name)}</b><small>${esc(u?.email || `Signed in with ${u?.provider || 'Proof'}`)}</small></span></div>
    <p class="fine">${LIVE ? 'Synced to your Proof account.' : 'Local mode. Your proof is stored on this phone only. Clearing your browser data deletes it.'}</p>
    <button class="btn btn-glass" data-out>${ic('logout', 20)}<span>Sign out</span></button>
    <button class="btn btn-ghost danger" data-reset>${ic('trash', 20)}<span>Delete all my data</span></button>
  `, {
    onMount(body, close) {
      body.querySelector('[data-out]').addEventListener('click', async () => {
        await signOutLive(); await signOut(); close(); emit('proof:route');
      });
      body.querySelector('[data-reset]').addEventListener('click', async () => {
        if (!confirm('Delete every proof, photo, voice note and club on this phone? This can’t be undone.')) return;
        await signOutLive(); await resetEverything(); close(); emit('proof:route');
      });
    },
  });
}
