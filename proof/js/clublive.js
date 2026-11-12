// Club, live: real clubs on the server. Friends see who has proven what today,
// each other's proof, and can give one-tap respect. Everything the database
// shows you is already limited to your clubs by its own rules.
import { S } from './state.js';
import { getClient } from './auth.js';
import { commitment } from './data.js';
import { doneToday, streak, needFor } from './stats.js';
import { openSheet, confirmSheet } from './sheet.js';
import { inviteSheet } from './clubshare.js';
import { proffSVG } from './proff.js';
import { ic } from './icons.js';
import { esc, toast, haptic, timeAgo } from './util.js';

const BUCKET = 'proof-media';
const st = { clubs: [], sel: null, board: [], feed: [], urls: new Map(), resp: new Map(), phase: 'loading', error: '' };
let host = null;
let timer = null;
let busy = false;

const CACHE = 'proof:clubcache';
const readCache = () => { try { return JSON.parse(localStorage.getItem(CACHE) || 'null'); } catch { return null; } };
const writeCache = () => { try { localStorage.setItem(CACHE, JSON.stringify({ uid: S.user.id, clubs: st.clubs, sel: st.sel, board: st.board })); } catch { /* ignore */ } };
const savedSel = () => { try { return localStorage.getItem('proof:club'); } catch { return null; } };
const nameOf = (uid) => (uid === S.user.id ? S.profile.name : st.board.find((r) => r.user_id === uid)?.name || 'A friend');

export function renderClubLive(el) {
  host = el;
  // Show the last known club straight away, then update it quietly.
  const c = readCache();
  if (st.phase === 'loading' && c && c.uid === S.user?.id && c.sel) { st.clubs = c.clubs; st.sel = c.sel; st.board = c.board; st.feed = []; st.phase = 'ready'; }
  paint();
  refresh();
  if (!timer) timer = setInterval(() => { if (host?.isConnected && S.tab === 'club' && !document.hidden) refresh(); }, 60000);
}

export async function hasClub() {
  const c = await getClient().catch(() => null);
  if (!c || !S.user) return false;
  const { data } = await c.from('club_members').select('club_id').limit(1);
  return Boolean(data?.length);
}

/* ---------- loading ---------- */

async function refresh() {
  if (busy) return;
  busy = true;
  try {
    const c = await getClient();
    if (!c) throw new Error('offline');
    const { data: clubs, error } = await c.from('clubs').select('id, name, code, owner').order('created_at', { ascending: false });
    if (error) throw error;
    st.clubs = clubs || [];
    st.sel = st.clubs.find((x) => x.id === (st.sel?.id || savedSel())) || st.clubs[0] || null;
    if (!st.sel) { st.board = []; st.feed = []; st.phase = 'empty'; return; }

    let { data: board, error: e2 } = await c.rpc('club_board', { club: st.sel.id });
    if (e2) { ({ data: board } = await c.rpc('club_roster', { club: st.sel.id })); }
    st.board = board || [];

    const ids = st.board.map((r) => r.user_id);
    const since = new Date(Date.now() - 48 * 3600e3).toISOString();
    const { data: feed } = await c.from('proofs')
      .select('id, user_id, c_key, kind, note, created_at, photo_path')
      .in('user_id', ids).gte('created_at', since).order('created_at', { ascending: false }).limit(30);
    st.feed = feed || [];

    const paths = st.feed.map((p) => p.photo_path).filter((p) => p && !st.urls.has(p));
    if (paths.length) {
      const { data: signed } = await c.storage.from(BUCKET).createSignedUrls(paths, 3600);
      (signed || []).forEach((s) => { if (s.signedUrl) st.urls.set(s.path, s.signedUrl); });
    }
    st.resp = new Map();
    if (st.feed.length) {
      const { data: rs } = await c.from('respects').select('proof_id, user_id').in('proof_id', st.feed.map((p) => p.id));
      (rs || []).forEach((r) => {
        const o = st.resp.get(r.proof_id) || { n: 0, mine: false };
        o.n++; if (r.user_id === S.user.id) o.mine = true;
        st.resp.set(r.proof_id, o);
      });
    }
    st.phase = 'ready';
    writeCache();
  } catch (e) {
    if (st.phase !== 'ready') { st.phase = 'error'; st.error = 'Couldn’t reach your club. Check your connection.'; }
  } finally {
    busy = false;
    paint();
  }
}

/* ---------- drawing ---------- */

function paint() {
  if (!host?.isConnected) return;
  if (st.phase === 'loading') {
    host.innerHTML = `<header class="page-top"><div><p class="date">Multiplayer</p><h1 class="title">Club</h1></div></header><div class="skel-list" aria-busy="true" aria-label="Loading your club"><i></i><i></i><i></i></div>`;
    return;
  }
  if (st.phase === 'error') {
    host.innerHTML = `<header class="page-top"><div><p class="date">Multiplayer</p><h1 class="title">Club</h1></div></header>
      <div class="empty"><b>Club is offline</b><p>${esc(st.error)}</p><button class="btn btn-primary" data-retry>Try again</button></div>`;
    host.querySelector('[data-retry]').addEventListener('click', () => { st.phase = 'loading'; paint(); refresh(); });
    return;
  }
  if (st.phase === 'empty') return paintEmpty();

  const club = st.sel;
  const mine = S.profile;
  const have = mine.commitments.filter((k) => doneToday(S.proofs).has(k)).length;
  host.innerHTML = `
  <header class="page-top">
    <div><p class="date">${st.board.length} ${st.board.length === 1 ? 'member' : 'members'}</p><h1 class="title">${esc(club.name)}</h1></div>
    <div class="top-actions">
      <button class="btn-pill" data-invite>${ic('plus', 14, 2.2)}<span>Invite</span></button>
      <button class="icon-btn round quiet" data-manage aria-label="Club settings">${ic('settings', 20)}</button>
    </div>
  </header>
  ${st.clubs.length > 1 ? `<div class="filters" role="tablist">${st.clubs.map((x) => `<button class="${x.id === club.id ? 'on' : ''}" data-club="${x.id}">${esc(x.name)}</button>`).join('')}</div>` : ''}

  <section class="card board">
    <div class="sec-h"><h2 class="headline">Today</h2><span class="dim">${new Date().toLocaleDateString([], { weekday: 'long' })}</span></div>
    ${st.board.map((r) => {
    const me = r.user_id === S.user.id;
    const goals = me ? mine.commitments.length : (r.goals ?? 3);
    const done = me ? have : (r.done_today ?? 0);
    const stk = me ? streak(S.proofs, mine) : (r.streak ?? 0);
    return `<div class="brow">
        <span class="avatar">${esc((r.name || '?')[0].toUpperCase())}</span>
        <span class="brow-n"><b>${esc(r.name || 'Friend')}${me ? ' <span class="dim">(you)</span>' : ''}</b><small>${stk} day streak${done >= needFor(goals) ? '. Kept today' : ''}</small></span>
        <span class="dots" aria-label="${done} of ${goals} goals proven today">${Array.from({ length: goals }, (_, i) => `<i class="${i < done ? 'on' : ''}"></i>`).join('')}</span>
      </div>`;
  }).join('')}
    ${st.board.length < 3 ? `<button class="brow add" data-invite><span class="avatar ghost">${ic('plus', 18)}</span><span class="brow-n"><b>Add your crew</b></span></button>` : ''}
  </section>

  <section class="feed-sec">
    <h2 class="headline">Latest proof</h2>
    ${st.feed.length ? `<div class="feed">${st.feed.map((p) => feedItem(p)).join('')}</div>` : '<p class="dim">When anyone in the club posts proof, it shows up here. Be the first today.</p>'}
  </section>`;

  host.querySelectorAll('[data-invite]').forEach((b) => b.addEventListener('click', () => inviteSheet(club)));
  host.querySelector('[data-manage]').addEventListener('click', () => manage(club));
  host.querySelectorAll('[data-club]').forEach((b) => b.addEventListener('click', () => {
    st.sel = st.clubs.find((x) => x.id === b.dataset.club);
    try { localStorage.setItem('proof:club', st.sel.id); } catch { /* ignore */ }
    refresh();
  }));
  host.querySelectorAll('[data-respect]').forEach((b) => b.addEventListener('click', () => respect(b.dataset.respect)));
}

function feedItem(p) {
  const mine = p.user_id === S.user.id;
  const r = st.resp.get(p.id) || { n: 0, mine: false };
  const url = p.photo_path && st.urls.get(p.photo_path);
  const c = commitment(p.c_key);
  return `<article class="fcard">
    ${url ? `<img src="${esc(url)}" alt="${esc(nameOf(p.user_id))}’s ${esc(c.label)} proof" loading="lazy">` : `<span class="fitem-voice">${ic('wave', 24, 1.5)}</span>`}
    <div class="fcard-t">
      <span><b>${esc(nameOf(p.user_id))}</b> <span class="dim">${esc(c.label)}</span></span>
      ${p.note ? `<small>“${esc(p.note)}”</small>` : ''}
      <small class="dim">${timeAgo(Date.parse(p.created_at))}</small>
    </div>
    ${mine
    ? (r.n ? `<span class="respect-count">${ic('thumb', 14)}${r.n}</span>` : '')
    : `<button class="respect ${r.mine ? 'on' : ''}" data-respect="${p.id}" aria-pressed="${r.mine}" aria-label="${r.mine ? 'Take back respect' : 'Give respect'}">${ic('thumb', 16)}<span>${r.mine ? 'Respected' : 'Respect'}${r.n ? ` ${r.n}` : ''}</span></button>`}
  </article>`;
}

function paintEmpty() {
  host.innerHTML = `
  <header class="page-top"><div><p class="date">Multiplayer</p><h1 class="title">Club</h1></div></header>
  <div class="club-hero">
    <div class="club-stack" aria-hidden="true"><span></span><span>${ic('plus', 22)}</span><span>${ic('plus', 22)}</span></div>
    <h2 class="h2">Lock in together</h2>
  </div>
  <div class="club-actions">
    <button class="btn btn-primary" data-create>${ic('plus', 20)}<span>Start a club</span></button>
    <button class="btn btn-secondary" data-join>${ic('link', 20)}<span>Join with a code</span></button>
  </div>`;
  host.querySelector('.club-stack span').textContent = (S.profile.name[0] || 'Y').toUpperCase();
  host.querySelector('[data-create]').addEventListener('click', createLive);
  host.querySelector('[data-join]').addEventListener('click', () => joinLive());
}

/* ---------- actions ---------- */

async function respect(proofId) {
  const c = await getClient().catch(() => null);
  if (!c) return;
  haptic(10);
  const cur = st.resp.get(proofId) || { n: 0, mine: false };
  const next = { n: cur.n + (cur.mine ? -1 : 1), mine: !cur.mine };
  st.resp.set(proofId, next); paint(); // instant; undone below if the server says no
  const { error } = cur.mine
    ? await c.from('respects').delete().eq('proof_id', proofId).eq('user_id', S.user.id)
    : await c.from('respects').insert({ proof_id: proofId });
  if (error) { st.resp.set(proofId, cur); paint(); toast('Couldn’t save that. Try again.'); }
}

export function createLive() {
  openSheet(`
    <h2 class="h2">Name your club</h2>
    <form class="stack">
      <label class="sr" for="cname">Club name</label>
      <input id="cname" class="big-input" maxlength="24" placeholder="5am Club" required>
      <div class="suggest">${['5am Club', 'Lock In', 'The Standard', 'No Days Off'].map((s) => `<button type="button" data-s="${s}">${s}</button>`).join('')}</div>
      <p class="form-err" role="alert" hidden></p>
      <button class="btn btn-primary" type="submit">Create club</button>
    </form>`, {
    onMount(body, close) {
      const input = body.querySelector('#cname');
      const err = body.querySelector('.form-err');
      body.querySelectorAll('[data-s]').forEach((b) => b.addEventListener('click', () => { input.value = b.dataset.s; input.focus(); }));
      body.querySelector('form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = input.value.trim();
        if (!name) return;
        const btn = body.querySelector('[type=submit]'); btn.disabled = true; btn.textContent = 'Creating…';
        const c = await getClient().catch(() => null);
        const { data, error } = c ? await c.rpc('create_club', { club_name: name }) : { error: { message: 'offline' } };
        if (error || !data?.[0]) {
          err.textContent = /5 clubs/.test(error?.message || '') ? 'You can own up to 5 clubs.' : 'Couldn’t create the club. Check your connection and try again.';
          err.hidden = false; btn.disabled = false; btn.textContent = 'Create club';
          return;
        }
        haptic(20);
        const club = { id: data[0].id, name, code: data[0].code };
        st.sel = club; st.phase = 'loading';
        try { localStorage.setItem('proof:club', club.id); } catch { /* ignore */ }
        close();
        if (S.tab !== 'club') window.dispatchEvent(new CustomEvent('proof:tab', { detail: 'club' }));
        refresh();
        setTimeout(() => inviteSheet(club), 320);
      });
      setTimeout(() => input.focus(), 300);
    },
  });
}

export function joinLive(prefill = '') {
  openSheet(`
    <h2 class="h2">Join a club</h2>
    <form class="stack">
      <label class="sr" for="ccode">Invite code</label>
      <input id="ccode" class="big-input code-input" maxlength="6" autocapitalize="characters" autocomplete="off" placeholder="ABC234" value="${esc(prefill)}" required>
      <p class="form-err" role="alert" hidden></p>
      <button class="btn btn-primary" type="submit">Join club</button>
    </form>`, {
    onMount(body, close) {
      const input = body.querySelector('#ccode');
      const err = body.querySelector('.form-err');
      input.addEventListener('input', () => { input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
      body.querySelector('form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = input.value.trim();
        if (code.length !== 6) { err.textContent = 'Codes are 6 characters.'; err.hidden = false; return; }
        const btn = body.querySelector('[type=submit]'); btn.disabled = true; btn.textContent = 'Joining…';
        const c = await getClient().catch(() => null);
        const { data, error } = c ? await c.rpc('join_club', { invite: code }) : { error: { message: 'offline' } };
        if (error) {
          const m = error.message || '';
          err.textContent = /No club/.test(m) ? 'No club has that code. Check it and try again.' : /full/i.test(m) ? 'That club is full.' : 'Couldn’t join. Check your connection and try again.';
          err.hidden = false; btn.disabled = false; btn.textContent = 'Join club';
          return;
        }
        haptic(20);
        st.sel = { id: data }; st.phase = 'loading';
        close();
        if (S.tab !== 'club') window.dispatchEvent(new CustomEvent('proof:tab', { detail: 'club' }));
        refresh();
        toast('You’re in. Post today to show up on the board.');
      });
      setTimeout(() => input.focus(), 300);
    },
  });
}

function manage(club) {
  openSheet(`
    <div class="ask-head">${proffSVG('talk', 64)}<div><b class="h2">${esc(club.name)}</b><p>Invite code <b class="code-inline">${club.code}</b></p></div></div>
    <div class="stack">
      <button class="btn btn-secondary" data-invite>${ic('share', 20)}<span>Invite friends</span></button>
      <button class="btn btn-quiet danger" data-leave>Leave club</button>
    </div>`, {
    onMount(body, close) {
      body.querySelector('[data-invite]').addEventListener('click', () => { close(); setTimeout(() => inviteSheet(club), 320); });
      body.querySelector('[data-leave]').addEventListener('click', async () => {
        close();
        if (!(await confirmSheet(`Leave ${esc(club.name)}?`, 'You can rejoin later with the invite code.', 'Leave club'))) return;
        const c = await getClient().catch(() => null);
        const { error } = c ? await c.from('club_members').delete().eq('club_id', club.id).eq('user_id', S.user.id) : { error: true };
        if (error) return toast('Couldn’t leave. Try again.');
        st.sel = null; st.phase = 'loading'; toast('You left the club'); refresh();
      });
    },
  });
}
