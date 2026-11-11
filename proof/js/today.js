// Today: four things only. Header, your three commitments, today's plan,
// and a box to talk (or type) your plan. Say "gym at 6, then school,
// work on the business after school and read before bed" and it becomes a list.
import { S, hydrateMedia, signOut, resetEverything, getPlan, savePlan } from './state.js';
import { commitment } from './data.js';
import { doneToday, streak } from './stats.js';
import { openCapture } from './capture.js';
import { openProof } from './proofview.js';
import { isPro, postsLeft, paywall } from './billing.js';
import { FREE_POSTS } from './config.js';
import { openSheet, confirmSheet } from './sheet.js';
import { signOutLive } from './auth.js';
import { parsePlan } from './planner.js';
import { getDictation } from './speech.js';
import { ic } from './icons.js';
import { esc, fmtDay, fmtClock, emit, haptic, toast } from './util.js';
import { LIVE } from './config.js';

let dictation; // resolved once, reused
const dictationReady = getDictation().then((d) => { dictation = d; return d; });

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Morning' : h < 18 ? 'Afternoon' : 'Evening';
}

export async function renderToday(el) {
  const P = S.profile;
  const done = doneToday(S.proofs);
  const st = streak(S.proofs);
  const plan = await getPlan();
  const todayStr = new Date().toDateString();
  const proofFor = (k) => S.proofs.find((p) => p.cKey === k && new Date(p.ts).toDateString() === todayStr);
  const left = plan.filter((i) => !i.done).length;
  const todays = S.proofs.filter((p) => new Date(p.ts).toDateString() === todayStr);

  el.innerHTML = `
  <header class="page-top">
    <div>
      <p class="date">${fmtDay(Date.now())}</p>
      <h1 class="title">${greeting()}, ${esc(P.name)}</h1>
    </div>
    <button class="avatar" data-settings aria-label="Account">${esc(P.name[0].toUpperCase())}</button>
  </header>

  <section class="cm-sec" aria-label="Your three commitments">
    <div class="sec-h">
      <h2 class="headline">${done.size >= 3 ? 'All three proven' : `${P.commitments.filter((k) => done.has(k)).length} of 3 proven`}</h2>
      <span class="streak-line ${st ? 'on' : ''}">${ic('flame', 15)}${st} day streak</span>
    </div>
    <div class="cm-list">
      ${P.commitments.map((k) => {
        const c = commitment(k); const p = proofFor(k);
        return `<button class="cm ${p ? 'done' : ''}" data-capture="${k}" aria-label="${c.label}: ${p ? 'proven today, add another' : 'post proof'}">
          <span class="cm-ic">${p ? ic('check', 18, 2.4) : ic(c.icon, 20)}</span>
          <span class="cm-txt"><b>${c.label}</b><small>${p ? `Proven at ${fmtClock(p.ts)}` : c.hint}</small></span>
          ${p?.photoId ? `<img class="cm-shot" data-media="${p.photoId}" alt="">` : `<span class="cm-go">${ic('camera', 18)}</span>`}
        </button>`;
      }).join('')}
    </div>
  </section>

  ${!isPro() && postsLeft() <= 7 ? `<button class="free-bar" data-pro>
    <span class="free-meter"><i style="width:${(postsLeft() / FREE_POSTS) * 100}%"></i></span>
    <span>${postsLeft() ? `${postsLeft()} free ${postsLeft() === 1 ? 'post' : 'posts'} left` : 'Free posts used up'}</span><b>Get Pro</b>
  </button>` : ''}

  <section class="plan-sec" aria-label="Today's plan">
    ${plan.length ? `
      <div class="sec-h"><h2 class="headline">Today’s plan</h2><span class="dim">${left ? `${left} to go` : 'All done'}</span></div>
      <ul class="plan-list">${plan.map((it) => {
        const c = it.cKey ? commitment(it.cKey) : null;
        return `<li class="pi ${it.done ? 'done' : ''}" data-id="${it.id}">
          <button class="pi-check" data-check aria-label="${it.done ? 'Mark not done' : 'Mark done'}">${it.done ? ic('check', 14, 2.6) : ''}</button>
          <span class="pi-body">${it.when ? `<span class="pi-when">${esc(it.when)}</span>` : ''}<span class="pi-text">${esc(it.text)}</span></span>
          ${c ? `<span class="pi-tag" title="${c.label}">${ic(c.icon, 15)}</span>` : ''}
          <button class="pi-x" data-del aria-label="Remove">${ic('close', 14)}</button>
        </li>`;
      }).join('')}</ul>` : `
      <div class="plan-empty">
        <h2 class="headline">What’s the plan today?</h2>
        <p class="dim">Say it the way you’d tell a friend. “Gym at 6, then school, work on the business after school, read before bed.”</p>
      </div>`}

    <form class="talkbox" data-talkbox>
      <label class="sr" for="plan-in">Add to your plan</label>
      <textarea id="plan-in" rows="1" placeholder="${plan.length ? 'Add more' : 'Talk or type your plan'}" enterkeyhint="done"></textarea>
      <button type="button" class="talk-mic" data-mic aria-label="Talk your plan" hidden>${ic('mic', 22)}</button>
      <button type="submit" class="talk-send" data-send aria-label="Add to plan" hidden>${ic('check', 20, 2.4)}</button>
    </form>
  </section>

  <section class="day-sec" aria-label="Your day in photos">
    <div class="sec-h"><h2 class="headline">Your day</h2><span class="dim">${todays.length ? `${todays.length} ${todays.length === 1 ? 'photo' : 'photos'}` : 'Moments don’t affect your streak'}</span></div>
    <div class="day-strip">
      <button class="ds-add" data-moment aria-label="Add a photo from your day">${ic('plus', 20, 2.2)}<span>Moment</span></button>
      ${todays.map((p) => `<button class="ds-shot" data-open="${p.id}" aria-label="${commitment(p.cKey).label} photo">
        ${p.photoId ? `<img data-media="${p.photoId}" alt="">` : `<span class="ds-voice">${ic('wave', 20, 1.5)}</span>`}
      </button>`).join('')}
    </div>
  </section>`;

  hydrateMedia(el);
  el.querySelectorAll('[data-capture]').forEach((b) => b.addEventListener('click', () => openCapture({ cKey: b.dataset.capture })));
  el.querySelector('[data-settings]').addEventListener('click', settings);
  el.querySelector('[data-pro]')?.addEventListener('click', () => paywall({ reason: postsLeft() ? 'info' : 'limit' }));
  el.querySelector('[data-moment]').addEventListener('click', () => openCapture({ cKey: 'moment' }));
  el.querySelectorAll('.ds-shot').forEach((b) => b.addEventListener('click', () => openProof(b.dataset.open)));
  bindPlan(el, plan, done);
  bindTalk(el, plan);
}

function bindPlan(el, plan, done) {
  el.querySelectorAll('.pi').forEach((row) => {
    const it = plan.find((x) => x.id === row.dataset.id);
    row.querySelector('[data-check]').addEventListener('click', async () => {
      haptic();
      // Ticking a linked item that hasn't been proven yet: offer to prove it.
      if (!it.done && it.cKey && !done.has(it.cKey)) return proveIt(it, plan, el);
      it.done = !it.done;
      await savePlan(plan);
      renderToday(el);
    });
    row.querySelector('[data-del]').addEventListener('click', async () => {
      await savePlan(plan.filter((x) => x.id !== it.id));
      renderToday(el);
    });
  });
}

function proveIt(it, plan, el) {
  const c = commitment(it.cKey);
  openSheet(`
    <h2 class="h2">Prove it?</h2>
    <p class="sub">“${esc(it.text)}” counts toward ${esc(c.label)}. Post a photo and it ticks itself off.</p>
    <div class="stack">
      <button class="btn btn-primary" data-prove>${ic('camera', 20)}<span>Post proof</span></button>
      <button class="btn btn-quiet" data-tick>Just tick it off</button>
    </div>`, {
    onMount(body, close) {
      body.querySelector('[data-prove]').addEventListener('click', () => { close(); openCapture({ cKey: it.cKey }); });
      body.querySelector('[data-tick]').addEventListener('click', async () => {
        it.done = true; await savePlan(plan); close(); renderToday(el);
      });
    },
  });
}

function bindTalk(el, plan) {
  const form = el.querySelector('[data-talkbox]');
  const input = form.querySelector('textarea');
  const mic = form.querySelector('[data-mic]');
  const send = form.querySelector('[data-send]');
  let base = '';
  let listening = false;

  const grow = () => { input.style.height = 'auto'; input.style.height = `${Math.min(input.scrollHeight, 140)}px`; };
  const sync = () => { send.hidden = !input.value.trim(); mic.hidden = !dictation || !!input.value.trim() && !listening; };
  input.addEventListener('input', () => { grow(); sync(); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });

  const commit = async () => {
    const text = input.value.trim();
    if (!text) return;
    const items = parsePlan(text, S.profile.commitments);
    if (!items.length) return toast('Couldn’t find any plans in that. Try “gym at 6, then read”.');
    await savePlan([...(await getPlan()), ...items]);
    haptic(15);
    toast(items.length === 1 ? 'Added to your plan' : `${items.length} things added to your plan`);
    renderToday(el);
  };
  form.addEventListener('submit', (e) => { e.preventDefault(); if (listening) dictation.stop(); commit(); });

  dictationReady.then((d) => {
    if (!d || !el.contains(form)) return;
    sync();
    d.on('partial', (t) => { if (listening) { input.value = (base + t).trim(); grow(); } });
    d.on('final', (t) => { if (listening) { base = `${(base + t).trim()} `; input.value = base.trim(); grow(); } });
    d.on('state', (s) => {
      const was = listening;
      listening = s === 'listening';
      form.classList.toggle('live', listening);
      mic.innerHTML = listening ? ic('stop', 20, 2) : ic('mic', 22);
      mic.setAttribute('aria-label', listening ? 'Stop and add' : 'Talk your plan');
      if (s === 'denied') toast('Microphone is off. You can type your plan instead.');
      if (was && !listening && el.contains(form)) commit();
      sync();
    });
    mic.addEventListener('click', () => {
      haptic(12);
      if (listening) return d.stop();
      base = input.value ? `${input.value.trim()} ` : '';
      input.placeholder = 'Listening…';
      d.start(); // straight from the click
    });
  });
}

function settings() {
  const u = S.user;
  openSheet(`
    <h2 class="h2">Account</h2>
    <div class="set-row"><span class="avatar">${esc(S.profile.name[0].toUpperCase())}</span>
      <span><b>${esc(S.profile.name)}</b><small>${esc(u?.email || `Signed in with ${u?.provider || 'Proof'}`)}</small></span></div>
    <button class="set-row set-plan" data-plan-row><span><b>${isPro() ? 'Proof Pro' : 'Free plan'}</b><small>${isPro() ? 'Unlimited posts' : `${postsLeft()} of ${FREE_POSTS} free posts left`}</small></span>${isPro() ? '' : '<span class="btn-pill">Get Pro</span>'}</button>
    <p class="fine">${LIVE ? 'Synced to your Proof account.' : 'Test version: your proof is saved in this browser only.'}</p>
    <div class="stack">
      <button class="btn btn-secondary" data-out>${ic('logout', 20)}<span>Sign out</span></button>
      <button class="btn btn-quiet danger" data-reset>${ic('trash', 18)}<span>Delete all my data</span></button>
    </div>`, {
    onMount(body, close) {
      body.querySelector('[data-plan-row]').addEventListener('click', () => { if (!isPro()) { close(); paywall({ reason: 'info' }); } });
      body.querySelector('[data-out]').addEventListener('click', async () => {
        await signOutLive(); await signOut(); close(); emit('proof:route');
      });
      body.querySelector('[data-reset]').addEventListener('click', async () => {
        close();
        const ok = await confirmSheet('Delete everything?', 'Every proof, photo, voice note, plan and club in this browser goes. This can’t be undone.', 'Delete everything');
        if (!ok) return;
        await signOutLive(); await resetEverything(); emit('proof:route');
      });
    },
  });
}
