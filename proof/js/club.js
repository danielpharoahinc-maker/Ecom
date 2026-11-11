// Club: lock in together. Create a club, share a 6-letter code or link,
// friends join with it, everyone sees who has posted today.
//
// Local mode keeps clubs on this phone; members' proof appears once the
// server is connected (docs/BACKEND.md). The invite link already works:
// opening it starts sign-up and joins the club automatically.
import { S, saveClub, leaveClub, hydrateMedia } from './state.js';
import { commitment } from './data.js';
import { doneToday, streak } from './stats.js';
import { openSheet, confirmSheet } from './sheet.js';
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
  const since = new Date(); since.setHours(0, 0, 0, 0); since.setDate(since.getDate() - 1);
  const feed = S.proofs.filter((p) => p.ts >= since.getTime());

  el.innerHTML = `
  <header class="page-top">
    <div><p class="date">${club.members.length} ${club.members.length === 1 ? 'member' : 'members'}</p><h1 class="title">${esc(club.name)}</h1></div>
    <div class="top-actions">
      <button class="btn-pill" data-invite>${ic('plus', 14, 2.2)}<span>Invite</span></button>
      <button class="icon-btn round quiet" data-manage aria-label="Club settings">${ic('settings', 20)}</button>
    </div>
  </header>

  <section class="card board">
    <div class="sec-h"><h2 class="headline">Today</h2><span class="dim">${new Date().toLocaleDateString([], { weekday: 'long' })}</span></div>
    ${club.members.map((m) => {
      const isMe = m.id === 'me';
      const d = isMe ? me.commitments.map((k) => done.has(k)) : [false, false, false];
      const st = isMe ? streak(S.proofs) : 0;
      return `<div class="brow">
        <span class="avatar">${esc((isMe ? me.name : m.name)[0].toUpperCase())}</span>
        <span class="brow-n"><b>${esc(isMe ? me.name : m.name)}${isMe ? ' <span class="dim">(you)</span>' : ''}</b><small>${st} day streak</small></span>
        <span class="dots" aria-label="${d.filter(Boolean).length} of 3 done">${d.map((x) => `<i class="${x ? 'on' : ''}"></i>`).join('')}</span>
      </div>`;
    }).join('')}
    ${club.members.length < 3 ? `<button class="brow add" data-invite>
      <span class="avatar ghost">${ic('plus', 18)}</span>
      <span class="brow-n"><b>Add your crew</b><small>Clubs work best with 3 to 8 people</small></span>
    </button>` : ''}
  </section>

  ${feed.length ? `<section class="feed-sec">
    <h2 class="headline">Latest proof</h2>
    <div class="feed">${feed.map((p) => `
      <button class="fitem" data-open="${p.id}">
        ${p.photoId ? `<img data-media="${p.photoId}" alt="" loading="lazy">` : `<span class="fitem-voice">${ic('wave', 24, 1.5)}</span>`}
        <span class="fitem-t"><b>${esc(me.name)}</b> <span>${commitment(p.cKey).label}</span>${p.note ? `<small>“${esc(p.note)}”</small>` : ''}<small class="dim">${timeAgo(p.ts)}</small></span>
      </button>`).join('')}</div>
  </section>` : ''}`;

  hydrateMedia(el);
  el.querySelectorAll('[data-invite]').forEach((b) => b.addEventListener('click', () => invite(club)));
  el.querySelector('[data-manage]').addEventListener('click', () => manage(club));
  el.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => openProof(b.dataset.open)));
}

function manage(club) {
  openSheet(`
    <h2 class="h2">${esc(club.name)}</h2>
    <p class="sub">Invite code <b class="code-inline">${club.code}</b></p>
    ${LIVE ? '' : '<p class="fine">Test version: friends can join with the code, but you’ll only see each other’s proof once Proof’s server is switched on.</p>'}
    <div class="stack"><button class="btn btn-quiet danger" data-leave>Leave club</button></div>`, {
    onMount(body, close) {
      body.querySelector('[data-leave]').addEventListener('click', async () => {
        close();
        if (await confirmSheet(`Leave ${esc(club.name)}?`, 'You can rejoin later with the invite code.', 'Leave club')) {
          await leaveClub(club.id); toast('You left the club');
        }
      });
    },
  });
}

function renderEmpty(el) {
  el.innerHTML = `
  <header class="page-top"><div><p class="date">Multiplayer</p><h1 class="title">Club</h1></div></header>
  <div class="club-hero">
    <div class="club-stack" aria-hidden="true"><span>D</span><span>${ic('plus', 22)}</span><span>${ic('plus', 22)}</span></div>
    <h2 class="h2">Lock in together</h2>
    <p class="sub">A club is a small crew that posts proof every day. Everyone sees who showed up.</p>
  </div>
  <div class="club-actions">
    <button class="btn btn-primary" data-create>${ic('plus', 20)}<span>Start a club</span></button>
    <button class="btn btn-secondary" data-join>${ic('link', 20)}<span>Join with a code</span></button>
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
      <button class="btn btn-primary" type="submit">Create club</button>
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
      <button class="btn btn-primary" type="submit">Join club</button>
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

function invite(club) {
  const url = inviteLink(club.code);
  const text = `Lock in with me on Proof. Join ${club.name} with code ${club.code}`;
  openSheet(`
    <h2 class="h2">Invite your crew</h2>
    <p class="sub">Send them this code. They enter it under Club, then Join with a code.</p>
    <div class="code-box"><b class="code">${club.code}</b></div>
    <div class="stack">
      <button class="btn btn-primary" data-share>${ic('share', 20)}<span>Share invite</span></button>
      <button class="btn btn-secondary" data-copy>${ic('copy', 20)}<span>Copy code</span></button>
    </div>`, {
    onMount(body) {
      const share = body.querySelector('[data-share]');
      if (!navigator.share) share.hidden = true;
      share.addEventListener('click', async () => {
        try { await navigator.share({ title: 'Join my club on Proof', text, url }); } catch { /* cancelled or blocked */ }
      });
      body.querySelector('[data-copy]').addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(club.code); toast('Code copied'); }
        catch { const r = document.createRange(); r.selectNodeContents(body.querySelector('.code')); getSelection().removeAllRanges(); getSelection().addRange(r); toast('Code selected. Copy it.'); }
      });
    },
  });
}
