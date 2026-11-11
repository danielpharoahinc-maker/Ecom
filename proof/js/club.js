// Club: lock in together. Create a club, share a 6-letter code or link,
// friends join with it, everyone sees who has posted today.
//
// Local mode keeps clubs on this phone; members' proof appears once the
// server is connected (docs/BACKEND.md). The invite link already works:
// opening it starts sign-up and joins the club automatically.
import { S, saveClub, leaveClub, hydrateMedia } from './state.js';
import { commitment } from './data.js';
import { doneToday, streak } from './stats.js';
import { openSheet } from './sheet.js';
import { openProof } from './proofview.js';
import { ic } from './icons.js';
import { esc, uid, toast, haptic, timeAgo } from './util.js';
import { LIVE } from './config.js';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O or 1/I mix-ups
const makeCode = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => ALPHABET[b % ALPHABET.length]).join('');
const inviteLink = (code) => `${location.origin}${location.pathname}?join=${code}`;

export function renderClub(el) {
  const club = S.clubs[0];
  if (!club) return renderEmpty(el);

  const me = S.profile;
  const done = doneToday(S.proofs);
  const feed = S.proofs.slice(0, 12);

  el.innerHTML = `
  <header class="page-top">
    <div><p class="date">${club.members.length} ${club.members.length === 1 ? 'member' : 'members'}</p><h1 class="h1">${esc(club.name)}</h1></div>
    <button class="btn-mini glass" data-invite>${ic('share', 16)}<span>Invite</span></button>
  </header>

  <section class="card glass invite-card">
    <div><span class="w-lab">Invite code</span><b class="code">${club.code}</b></div>
    <button class="icon-btn" data-copy aria-label="Copy invite link">${ic('copy', 20)}</button>
  </section>

  <section class="card glass">
    <div class="card-h"><h2 class="h3">Today’s board</h2><span class="dim">${new Date().toLocaleDateString([], { weekday: 'long' })}</span></div>
    <div class="board">
      ${club.members.map((m) => {
        const isMe = m.id === 'me';
        const d = isMe ? me.commitments.map((k) => done.has(k)) : [false, false, false];
        const st = isMe ? streak(S.proofs) : 0;
        return `<div class="brow">
          <span class="avatar">${esc((isMe ? me.name : m.name)[0].toUpperCase())}</span>
          <span class="brow-n"><b>${esc(isMe ? `${me.name} (you)` : m.name)}</b><small>${ic('flame', 12)} ${st} day streak</small></span>
          <span class="seg sm">${d.map((x) => `<i class="${x ? 'on' : ''}"></i>`).join('')}</span>
        </div>`;
      }).join('')}
      <button class="brow add" data-invite>
        <span class="avatar ghost">${ic('plus', 18)}</span>
        <span class="brow-n"><b>Add your crew</b><small>Clubs work best with 3 to 8 people</small></span>
      </button>
    </div>
  </section>

  <section class="card glass">
    <h2 class="h3">Club feed</h2>
    ${feed.length ? `<div class="feed">${feed.map((p) => `
      <button class="fitem" data-open="${p.id}">
        ${p.photoId ? `<img data-media="${p.photoId}" alt="" loading="lazy">` : `<span class="fitem-voice">${ic('wave', 28, 1.5)}</span>`}
        <span class="fitem-t"><b>${esc(me.name)}</b> <span>${commitment(p.cKey).label}</span>${p.note ? `<small>“${esc(p.note)}”</small>` : ''}<small class="dim">${timeAgo(p.ts)}</small></span>
      </button>`).join('')}</div>` : '<p class="dim">Proof from everyone in the club shows up here.</p>'}
    ${LIVE ? '' : '<p class="fine">Local mode: you see your own proof here. Friends’ proof appears once Proof’s server is switched on.</p>'}
  </section>

  <button class="btn btn-ghost danger" data-leave>Leave ${esc(club.name)}</button>`;

  hydrateMedia(el);
  el.querySelectorAll('[data-invite]').forEach((b) => b.addEventListener('click', () => invite(club)));
  el.querySelector('[data-copy]').addEventListener('click', () => copy(inviteLink(club.code)));
  el.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => openProof(b.dataset.open)));
  el.querySelector('[data-leave]').addEventListener('click', async () => {
    if (confirm(`Leave ${club.name}?`)) { await leaveClub(club.id); toast('You left the club'); }
  });
}

function renderEmpty(el) {
  el.innerHTML = `
  <header class="page-top"><div><p class="date">Multiplayer</p><h1 class="h1">Club</h1></div></header>
  <div class="club-hero">
    <div class="club-stack" aria-hidden="true"><span>D</span><span>${ic('plus', 22)}</span><span>${ic('plus', 22)}</span></div>
    <h2 class="h2">Lock in together</h2>
    <p class="sub">A club is a small crew that posts proof every day. Everyone sees who showed up.</p>
  </div>
  <div class="club-actions">
    <button class="btn btn-white" data-create>${ic('plus', 20)}<span>Start a club</span></button>
    <button class="btn btn-glass" data-join>${ic('link', 20)}<span>Join with a code</span></button>
  </div>`;
  el.querySelector('.club-stack span').textContent = (S.profile.name[0] || 'Y').toUpperCase();
  el.querySelector('[data-create]').addEventListener('click', create);
  el.querySelector('[data-join]').addEventListener('click', () => join());
}

function create() {
  openSheet(`
    <h2 class="h2">Name your club</h2>
    <p class="sub">Keep it short. Your crew sees it every day.</p>
    <form class="stack">
      <label class="sr" for="cname">Club name</label>
      <input id="cname" class="big-input" maxlength="24" placeholder="5am Club" required>
      <div class="suggest">${['5am Club', 'Lock In', 'The Standard', 'No Days Off'].map((s) => `<button type="button" data-s="${s}">${s}</button>`).join('')}</div>
      <button class="btn btn-white" type="submit">Create club</button>
    </form>`, {
    onMount(body, close) {
      const input = body.querySelector('#cname');
      body.querySelectorAll('[data-s]').forEach((b) => b.addEventListener('click', () => { input.value = b.dataset.s; input.focus(); }));
      body.querySelector('form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = input.value.trim();
        if (!name) return;
        const club = { id: uid(), name, code: makeCode(), createdAt: Date.now(), owner: true, members: [{ id: 'me' }] };
        await saveClub(club);
        close();
        haptic(20);
        setTimeout(() => invite(club), 320);
      });
      setTimeout(() => input.focus(), 300);
    },
  });
}

export function join(prefill = '') {
  openSheet(`
    <h2 class="h2">Join a club</h2>
    <p class="sub">Enter the 6-letter code your friend sent you.</p>
    <form class="stack">
      <label class="sr" for="ccode">Invite code</label>
      <input id="ccode" class="big-input code-input" maxlength="6" autocapitalize="characters" autocomplete="off" placeholder="ABC123" value="${esc(prefill)}" required>
      <button class="btn btn-white" type="submit">Join club</button>
    </form>`, {
    onMount(body, close) {
      const input = body.querySelector('#ccode');
      input.addEventListener('input', () => { input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
      body.querySelector('form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = input.value.trim();
        if (code.length !== 6) return toast('Codes are 6 characters.');
        if (S.clubs.some((c) => c.code === code)) { close(); return toast('You’re already in this club'); }
        // Local mode can't look the club up on a server, so it's saved by code;
        // the real name and members load once the server is connected.
        await saveClub({ id: uid(), name: `Club ${code}`, code, createdAt: Date.now(), owner: false, members: [{ id: 'me' }] });
        close();
        toast('You’re in. Post today to show up on the board.');
      });
      setTimeout(() => input.focus(), 300);
    },
  });
}

async function invite(club) {
  const url = inviteLink(club.code);
  const text = `Lock in with me on Proof. Join ${club.name} with code ${club.code}`;
  if (navigator.share) {
    try { await navigator.share({ title: 'Join my club on Proof', text, url }); return; } catch { /* cancelled */ }
  }
  copy(`${text}: ${url}`);
}

async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast('Invite link copied'); } catch { prompt('Copy this invite link', text); }
}
