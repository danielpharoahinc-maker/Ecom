// Onboarding: one question per screen, four big visual options, tap to go on.
// The progress bar starts at 20% (the account already counts as a step), and
// the easiest questions come first so it climbs fast.
import { STEPS, CATALOG, LABEL, commitment } from './data.js';
import { S, saveProfile } from './state.js';
import { pushProfile } from './billing.js';
import { ic } from './icons.js';
import { esc, haptic, toast } from './util.js';

const HEAD_START = 20;
let i = 0;
let ans = {};

export function renderOnboarding(root, onDone) {
  i = 0;
  ans = { commitments: [], name: (S.user?.name || '').split(' ')[0] || '' };
  draw(root, onDone);
}

const pct = (step) => Math.round(HEAD_START + ((100 - HEAD_START) * step) / (STEPS.length - 1));

function draw(root, onDone) {
  const step = STEPS[i];
  const p = pct(i);
  root.innerHTML = `
  <section class="ob">
    <header class="ob-top">
      <button class="icon-btn" data-back aria-label="Back" ${i === 0 ? 'style="visibility:hidden"' : ''}>${ic('back', 22)}</button>
      <div class="ob-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p}">
        <div class="ob-bar"><i style="width:${pct(Math.max(0, i - 1))}%"></i></div>
        <span class="ob-pct">${i === 0 ? 'Account created. ' : ''}${p}% set up</span>
      </div>
      <span class="icon-btn" aria-hidden="true"></span>
    </header>
    <div class="ob-head">
      <h1 class="title">${step.title}</h1>
      <p class="sub">${step.sub}</p>
    </div>
    <div class="ob-body">${body(step)}</div>
  </section>`;

  // Animate the bar from the previous value to the new one.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const bar = root.querySelector('.ob-bar i');
    if (bar) bar.style.width = `${p}%`;
  }));

  const next = () => { i++; draw(root, onDone); };
  root.querySelector('[data-back]').addEventListener('click', () => { if (i > 0) { i--; draw(root, onDone); } });

  if (step.type === 'choice' && step.multi) {
    // Pick up to `multi` answers, then Continue.
    if (!Array.isArray(ans[step.id])) ans[step.id] = [];
    const cta = root.querySelector('[data-next]');
    const sync = () => {
      const picked = ans[step.id];
      root.querySelectorAll('.choice').forEach((b) => {
        const on = picked.includes(b.dataset.v);
        b.classList.toggle('sel', on);
        b.setAttribute('aria-pressed', on);
      });
      cta.disabled = picked.length === 0;
      root.querySelector('.commit-count').textContent = picked.length === step.multi ? 'Two is the limit. Tap one to swap it.' : picked.length ? 'Add one more, or continue.' : '';
    };
    root.querySelectorAll('.choice').forEach((b) => b.addEventListener('click', () => {
      haptic();
      const picked = ans[step.id];
      const v = b.dataset.v;
      if (picked.includes(v)) ans[step.id] = picked.filter((x) => x !== v);
      else if (picked.length < step.multi) picked.push(v);
      else toast('Pick up to two. Tap one to remove it first.');
      sync();
    }));
    cta.addEventListener('click', next);
    sync();
  } else if (step.type === 'choice') {
    root.querySelectorAll('.choice').forEach((b) => b.addEventListener('click', () => {
      haptic();
      root.querySelectorAll('.choice').forEach((x) => x.classList.remove('sel'));
      b.classList.add('sel');
      const v = b.dataset.v;
      ans[step.id] = isNaN(+v) ? v : +v;
      setTimeout(next, 260);
    }));
  }

  if (step.type === 'commit') {
    const count = root.querySelector('.commit-count');
    const cta = root.querySelector('[data-next]');
    const sync = () => {
      const n = ans.commitments.length;
      count.textContent = n === 3 ? 'Locked. These are your three.' : `${n} of 3 picked`;
      cta.disabled = n !== 3;
      root.querySelectorAll('.ctile').forEach((t) => {
        const on = ans.commitments.includes(t.dataset.k);
        t.classList.toggle('sel', on);
        t.setAttribute('aria-pressed', on);
        const n2 = ans.commitments.indexOf(t.dataset.k);
        t.querySelector('.ctile-n').textContent = on ? n2 + 1 : '';
      });
    };
    root.querySelectorAll('.ctile').forEach((t) => t.addEventListener('click', () => {
      haptic();
      const k = t.dataset.k;
      if (ans.commitments.includes(k)) ans.commitments = ans.commitments.filter((x) => x !== k);
      else if (ans.commitments.length < 3) ans.commitments.push(k);
      else toast('Three is the limit. Tap one to swap it out.');
      sync();
    }));
    cta.addEventListener('click', next);
    sync();
  }

  if (step.type === 'name') {
    const input = root.querySelector('#name');
    const cta = root.querySelector('[data-next]');
    const sync = () => { cta.disabled = input.value.trim().length < 2; };
    input.addEventListener('input', sync);
    root.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      if (input.value.trim().length < 2) return;
      ans.name = input.value.trim().slice(0, 24);
      next();
    });
    sync();
    setTimeout(() => input.focus(), 300);
  }

  if (step.type === 'perm') {
    // Ask for each one separately, like a native app: the phone shows its own
    // "Allow camera?" / "Allow microphone?" prompt when the button is tapped.
    const cont = root.querySelector('[data-next]');
    const show = (kind, state) => {
      const row = root.querySelector(`[data-perm="${kind}"]`);
      const btn = row.querySelector('button');
      row.dataset.state = state;
      btn.disabled = state === 'granted';
      btn.textContent = state === 'granted' ? 'Allowed' : state === 'denied' ? 'Try again' : 'Allow';
      row.querySelector('.perm-note').hidden = state !== 'denied';
      const both = ['camera', 'microphone'].every((k) => root.querySelector(`[data-perm="${k}"]`).dataset.state === 'granted');
      cont.textContent = both ? 'Continue' : 'Skip for now';
      cont.classList.toggle('btn-primary', both);
      cont.classList.toggle('btn-quiet', !both);
    };
    for (const kind of ['camera', 'microphone']) {
      show(kind, 'prompt');
      // If the browser already knows the answer, show it without asking.
      navigator.permissions?.query({ name: kind }).then((r) => { if (r.state !== 'prompt') show(kind, r.state); }).catch(() => {});
      root.querySelector(`[data-perm="${kind}"] button`).addEventListener('click', async () => {
        haptic();
        try {
          const s = await navigator.mediaDevices.getUserMedia(kind === 'camera' ? { video: true } : { audio: true });
          s.getTracks().forEach((t) => t.stop());
          show(kind, 'granted');
        } catch {
          show(kind, 'denied');
        }
      });
    }
    cont.addEventListener('click', next);
  }

  if (step.type === 'plan') {
    const finish = async (first) => {
      await saveProfile({
        name: ans.name,
        goal: ans.goal, wake: ans.wake, lockin: ans.lockin,
        proofTime: ans.proofTime, crew: ans.crew, obstacle: ans.obstacle,
        commitments: ans.commitments,
        createdAt: Date.now(),
        onboarded: true,
      });
      pushProfile().catch(() => {}); // live mode: save to the server too
      onDone({ firstProof: first });
    };
    root.querySelector('[data-first]').addEventListener('click', () => finish(true));
    root.querySelector('[data-skip]').addEventListener('click', () => finish(false));
  }
}

function body(step) {
  if (step.type === 'choice') {
    const isSel = (v) => (Array.isArray(ans[step.id]) ? ans[step.id].includes(v) : ans[step.id] === v);
    return `<div class="choices">${step.options.map((o) => `
      <button class="choice ${isSel(o.v) ? 'sel' : ''}" data-v="${o.v}" ${step.multi ? 'aria-pressed="false"' : ''}>
        ${step.multi ? `<span class="choice-tick" aria-hidden="true">${ic('check', 14, 2.6)}</span>` : ''}
        ${step.visual === 'bar'
          ? `<span class="choice-bar" aria-hidden="true"><i style="height:${o.fill}%"></i></span>`
          : `<span class="choice-ic">${ic(o.icon, 26)}</span>`}
        <span class="choice-txt"><b>${o.label}</b><small>${o.hint}</small></span>
      </button>`).join('')}</div>
      ${step.multi ? `<div class="ob-foot"><p class="commit-count" aria-live="polite"></p><button class="btn btn-primary" data-next disabled>Continue</button></div>` : ''}`;
  }

  if (step.type === 'commit') {
    return `<div class="ctiles">${CATALOG.map((c) => `
      <button class="ctile" data-k="${c.key}" aria-pressed="false">
        <span class="ctile-n" aria-hidden="true"></span>
        ${ic(c.icon, 26)}
        <b>${c.label}</b><small>${c.hint}</small>
      </button>`).join('')}</div>
      <div class="ob-foot">
        <p class="commit-count" aria-live="polite"></p>
        <button class="btn btn-primary" data-next disabled>Continue</button>
      </div>`;
  }

  if (step.type === 'name') {
    return `<form class="name-form">
      <label class="sr" for="name">Your name</label>
      <input id="name" class="big-input" maxlength="24" autocomplete="given-name" placeholder="First name" value="${esc(ans.name)}">
      <div class="ob-foot"><button class="btn btn-primary" data-next type="submit">Continue</button></div>
    </form>`;
  }

  if (step.type === 'perm') {
    const row = (kind, icon, title, why) => `
      <div class="perm-row" data-perm="${kind}">
        <span class="perm-ic">${ic(icon, 24)}</span>
        <span class="perm-txt"><b>${title}</b><small>${why}</small>
          <small class="perm-note" hidden>Blocked. Turn it on in your phone’s Settings for this app, then tap Try again.</small></span>
        <button class="perm-btn">Allow</button>
      </div>`;
    return `<div class="perm">
      ${row('camera', 'camera', 'Camera', 'Take the photo that proves it. Nothing posts until you tap Post.')}
      ${row('microphone', 'mic', 'Microphone', 'Say what you did, or talk through your plan.')}
      <div class="ob-foot"><button class="btn btn-quiet" data-next>Skip for now</button></div>
    </div>`;
  }

  if (step.type === 'plan') {
    const goals = [].concat(ans.goal || []).map((g) => LABEL.goal[g]?.label.toLowerCase()).filter(Boolean); const wake = LABEL.wake[ans.wake];
    const lock = LABEL.lockin[ans.lockin]; const pts = [].concat(ans.proofTime || []).map((v) => LABEL.proofTime[v]).filter(Boolean);
    return `<div class="plan">
      <div class="plan-card">
        <div class="plan-name"><span class="avatar lg">${esc((ans.name || '?')[0].toUpperCase())}</span>
          <div><b>${esc(ans.name)}</b><small>Building ${goals.length ? goals.join(' and ') : 'discipline'}</small></div></div>
        <div class="plan-lock">
          <span class="lab">Daily lock-in</span>
          <div class="lock-bar"><i style="width:${lock?.fill ?? 25}%"></i></div>
          <span class="lock-v">${lock?.label ?? '1 hour'}</span>
        </div>
        <div class="plan-commits">${ans.commitments.map((k) => {
          const c = commitment(k);
          return `<div class="pc">${ic(c.icon, 24)}<b>${c.label}</b></div>`;
        }).join('')}</div>
        <div class="plan-meta">
          <div>${ic(wake?.icon || 'sun', 20)}<span>Up ${wake ? wake.label.toLowerCase() : ''}</span></div>
          <div>${ic(pts[0]?.icon || 'clock', 20)}<span>${pts.length ? `${pts[0].phrase}${pts[1] ? ` and ${pts[1].label.toLowerCase()}` : ''}` : 'Proof every day'}</span></div>
        </div>
        <div class="plan-week">
          <span class="lab">Week 1 target: 21 proofs</span>
          <div class="week-row">${Array.from({ length: 7 }, (_, d) => `<i class="${d === 0 ? 'now' : ''}"></i>`).join('')}</div>
        </div>
      </div>
      <div class="ob-foot">
        <button class="btn btn-primary" data-first>${ic('camera', 20)}<span>Post my first proof</span></button>
        <button class="btn btn-quiet" data-skip>Go to the app</button>
      </div>
    </div>`;
  }
  return '';
}
