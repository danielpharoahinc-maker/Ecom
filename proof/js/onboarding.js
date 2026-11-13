// Onboarding: one question per screen, easy taps first. Short on purpose:
//   goal -> proof time -> goals (1 to 6) -> name -> camera & mic -> [free trial]
// and it ends with your first proof. The bar starts at 20% because creating the
// account counts. A draft is kept so leaving for the payment page and coming
// back picks up exactly where you were.
import { STEPS, CATALOG, MAX_GOALS, MIN_GOALS, needFor } from './data.js';
import { S, saveProfile, setUser, load } from './state.js';
import { mountAgePull } from './agepull.js';
import { consentHTML, consentOK, saveConsent, createAccount } from './account.js';
import { waitForLink } from './welcome.js';
import { restoreProfile } from './sync.js';
import { pushProfile, startCheckout, waitForAccess } from './billing.js';
import { proffSVG } from './proff.js';
import { PRICES, TRIAL_DAYS, PAYMENTS_LIVE, REQUIRE_CARD } from './config.js';
import { ic } from './icons.js';
import { esc, haptic, toast } from './util.js';

const HEAD_START = 20;
const DRAFT = 'proof:ob';
let i = 0;
let ans = {};
let steps = [];

const store = {
  get: (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
  del: (k) => { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};
const paidReturn = () => { try { return sessionStorage.getItem('proof:paid') === '1'; } catch { return false; } };

export const trialStepOn = () => PAYMENTS_LIVE && REQUIRE_CARD;

export function renderOnboarding(root, onDone) {
  // Already signed in (came back through the email link)? The account steps are done.
  steps = STEPS.filter((s) => (s.type !== 'trial' || trialStepOn()) && !((s.type === 'age' || s.type === 'account') && S.user));
  ans = { commitments: [], name: (S.user?.name || '').split(' ')[0] || '' };
  i = 0;
  const d = store.get(DRAFT);
  if (d && Date.now() - d.t < 3600e3) { ans = { ...ans, ...d.ans }; i = Math.min(d.i, steps.length - 1); }
  draw(root, onDone);
}

const pct = (n) => Math.round(HEAD_START + ((100 - HEAD_START) * n) / Math.max(1, steps.length - 1));
const draftProfile = () => ({ name: ans.name, goal: ans.goal, proofTime: ans.proofTime, commitments: ans.commitments, goalLog: [{ ts: Date.now(), keys: ans.commitments }] });

async function finish(onDone) {
  const now = Date.now();
  await saveProfile({
    name: ans.name, goal: ans.goal, proofTime: ans.proofTime, commitments: ans.commitments,
    goalLog: [{ ts: now, keys: ans.commitments }], createdAt: now, onboarded: true, tourDone: false, consent: store.get('proof:consent') || null,
  });
  store.del(DRAFT);
  try { sessionStorage.removeItem('proof:paid'); } catch { /* ignore */ }
  pushProfile().catch(() => {});
  onDone({ firstProof: true });
}

function draw(root, onDone) {
  const step = steps[i];
  const p = pct(i);
  store.set(DRAFT, { t: Date.now(), i, ans });
  root.innerHTML = `
  <section class="ob">
    <header class="ob-top">
      <button class="icon-btn" data-back aria-label="Back" ${i === 0 ? 'style="visibility:hidden"' : ''}>${ic('back', 22)}</button>
      <div class="ob-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p}">
        <div class="ob-bar"><i style="width:${pct(Math.max(0, i - 1))}%"></i></div>
        <span class="ob-pct">${p}% set up</span>
      </div>
      <span class="icon-btn" aria-hidden="true"></span>
    </header>
    <div class="ob-head">
      <h1 class="title">${step.title}</h1>
    </div>
    <div class="ob-body">${body(step)}</div>
  </section>`;

  requestAnimationFrame(() => requestAnimationFrame(() => {
    const bar = root.querySelector('.ob-bar i');
    if (bar) bar.style.width = `${p}%`;
  }));

  const next = () => { if (i + 1 >= steps.length) return finish(onDone); i++; draw(root, onDone); };
  root.querySelector('[data-back]').addEventListener('click', () => { if (i > 0) { i--; draw(root, onDone); } });

  if (step.type === 'choice') bindChoice(root, step, next);
  if (step.type === 'commit') bindCommit(root, next);
  if (step.type === 'name') bindName(root, next);
  if (step.type === 'age') bindAge(root, next);
  if (step.type === 'account') bindAccount(root, next, onDone, () => draw(root, onDone));
  if (step.type === 'perm') bindPerm(root, next);
  if (step.type === 'trial') bindTrial(root, next);
}

/* ---------- age: pull to set it ---------- */

function bindAge(root, next) {
  const cta = root.querySelector('[data-next]');
  const ctl = mountAgePull(root.querySelector('[data-agepull]'), {
    value: ans.age || 15,
    onChange: ({ age, touched }) => { ans.age = age; ans.ageSet = touched; cta.disabled = !(touched && age >= 13); store.set(DRAFT, { t: Date.now(), i, ans }); },
  });
  if (ans.ageSet && ans.age) { ctl.set(ans.age); cta.disabled = ans.age < 13; }
  cta.addEventListener('click', next);
}

/* ---------- account: terms, email, then you're in ---------- */

function bindAccount(root, next, onDone, redraw) {
  const form = root.querySelector('.acct'), btn = form.querySelector('[type=submit]'), err = form.querySelector('.form-err'), email = root.querySelector('#email');
  const minor = (ans.age || 18) < 18;
  const ok = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  const sync = () => { btn.disabled = !(consentOK(form) && ok(email.value.trim())); };
  form.addEventListener('input', sync); form.addEventListener('change', sync);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const addr = email.value.trim().toLowerCase();
    if (!ok(addr)) { err.textContent = 'Enter a full email address, like you@gmail.com.'; err.hidden = false; return; }
    err.hidden = true; btn.disabled = true; btn.textContent = 'One moment…';
    try {
      const res = await createAccount(addr);
      if (res.existing) {
        // That email already has an account: the link signs you in and brings your data back.
        return waitForLink(root.querySelector('.ob-body'), addr, {
          onUser: async (user) => {
            await setUser(user);
            if (await restoreProfile().catch(() => false)) { await load(); store.del(DRAFT); return onDone({ existing: true }); }
            saveConsent({ age: ans.age, minor }); next();
          },
          onBack: redraw,
        });
      }
      saveConsent({ age: ans.age, minor });
      haptic(20);
      await setUser(res.user);
      if (res.user && !res.user.local) toast('Link sent to your email. Tap it to save your account. Keep going.');
      next();
    } catch (e2) { err.textContent = e2.message || 'Couldn’t create your account. Try again.'; err.hidden = false; btn.disabled = false; btn.textContent = 'Create my account'; }
  });
  sync();
}

/* ---------- choice (one or two answers) ---------- */

function bindChoice(root, step, next) {
  const cta = root.querySelector('[data-next]');
  if (!step.multi) {
    root.querySelectorAll('.choice').forEach((b) => b.addEventListener('click', () => {
      haptic();
      root.querySelectorAll('.choice').forEach((x) => x.classList.remove('sel'));
      b.classList.add('sel');
      ans[step.id] = b.dataset.v;
      setTimeout(next, 260);
    }));
    return;
  }
  if (!Array.isArray(ans[step.id])) ans[step.id] = [];
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
}

/* ---------- goals: 1 to 6 ---------- */

function bindCommit(root, next) {
  const count = root.querySelector('.commit-count');
  const cta = root.querySelector('[data-next]');
  const sync = () => {
    const n = ans.commitments.length;
    count.textContent = n === 0 ? '' : `${n} ${n === 1 ? 'goal' : 'goals'}. You keep your streak by proving ${needFor(n)} a day.`;
    cta.disabled = n < MIN_GOALS;
    root.querySelectorAll('.ctile').forEach((t) => {
      const idx = ans.commitments.indexOf(t.dataset.k);
      t.classList.toggle('sel', idx >= 0);
      t.setAttribute('aria-pressed', idx >= 0);
      t.querySelector('.ctile-n').textContent = idx >= 0 ? idx + 1 : '';
    });
  };
  root.querySelectorAll('.ctile').forEach((t) => t.addEventListener('click', () => {
    haptic();
    const k = t.dataset.k;
    if (ans.commitments.includes(k)) ans.commitments = ans.commitments.filter((x) => x !== k);
    else if (ans.commitments.length < MAX_GOALS) ans.commitments.push(k);
    else toast(`${MAX_GOALS} is the limit. Tap one to swap it out.`);
    sync();
  }));
  cta.addEventListener('click', next);
  sync();
}

/* ---------- name ---------- */

function bindName(root, next) {
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

/* ---------- camera and microphone ---------- */

function bindPerm(root, next) {
  // One prompt per permission, like a native app: the phone shows its own
  // "Allow camera?" / "Allow microphone?" when the button is tapped.
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
    navigator.permissions?.query({ name: kind }).then((r) => { if (r.state !== 'prompt') show(kind, r.state); }).catch(() => {});
    root.querySelector(`[data-perm="${kind}"] button`).addEventListener('click', async () => {
      haptic();
      try {
        const s = await navigator.mediaDevices.getUserMedia(kind === 'camera' ? { video: true } : { audio: true });
        s.getTracks().forEach((t) => t.stop());
        show(kind, 'granted');
      } catch { show(kind, 'denied'); }
    });
  }
  cont.addEventListener('click', next);
}

/* ---------- free trial (card now, charged on day 30) ---------- */

function bindTrial(root, next) {
  let plan = ans.plan || 'monthly';
  const btn = root.querySelector('[data-card]');
  const note = root.querySelector('.trial-state');
  const money = () => (plan === 'yearly' ? `${PRICES.yearly} for the year` : `${PRICES.monthly} for the month`);
  const paint = () => {
    root.querySelectorAll('[data-plan]').forEach((b) => { b.classList.toggle('on', b.dataset.plan === plan); b.setAttribute('aria-checked', b.dataset.plan === plan); });
    root.querySelector('[data-charge]').textContent = money();
  };
  root.querySelectorAll('[data-plan]').forEach((b) => b.addEventListener('click', () => { haptic(); plan = b.dataset.plan; ans.plan = plan; paint(); }));
  paint();

  btn.addEventListener('click', async () => {
    btn.disabled = true; btn.textContent = 'Opening secure checkout…';
    store.set(DRAFT, { t: Date.now(), i, ans: { ...ans, plan } });
    const err = await startCheckout({ plan, trial: true }, draftProfile());
    if (err) { btn.disabled = false; btn.textContent = 'Add card and start free'; note.textContent = err; note.hidden = false; }
  });

  // Back from the payment page: wait for the bank, then carry on.
  if (paidReturn()) {
    btn.disabled = true; btn.textContent = 'Confirming your card…';
    (async function confirm() {
      if (await waitForAccess()) { toast('Your 30 days have started'); return next(); }
      btn.disabled = false; btn.textContent = 'Check again';
      note.textContent = 'Still waiting for the bank to confirm. Give it a minute, then tap Check again.';
      note.hidden = false;
      btn.onclick = () => { btn.disabled = true; btn.textContent = 'Confirming your card…'; confirm(); };
    })();
  }
}

/* ---------- markup ---------- */

function body(step) {
  if (step.type === 'choice') {
    const isSel = (v) => (Array.isArray(ans[step.id]) ? ans[step.id].includes(v) : ans[step.id] === v);
    return `<div class="choices">${step.options.map((o) => `
      <button class="choice ${isSel(o.v) ? 'sel' : ''}" data-v="${o.v}" ${step.multi ? 'aria-pressed="false"' : ''}>
        ${step.multi ? `<span class="choice-tick" aria-hidden="true">${ic('check', 14, 2.6)}</span>` : ''}
        <span class="choice-ic">${ic(o.icon, 26)}</span>
        <span class="choice-txt"><b>${o.label}</b></span>
      </button>`).join('')}</div>
      ${step.multi ? `<div class="ob-foot"><p class="commit-count" aria-live="polite"></p><button class="btn btn-primary" data-next disabled>Continue</button></div>` : ''}`;
  }

  if (step.type === 'commit') {
    return `<div class="ctiles">${CATALOG.map((c) => `
      <button class="ctile" data-k="${c.key}" aria-pressed="false">
        <span class="ctile-n" aria-hidden="true"></span>
        ${ic(c.icon, 26)}
        <b>${c.label}</b>
      </button>`).join('')}</div>
      <div class="proff-note">${proffSVG('talk', 52)}<p>Prove <b>half</b> of your goals in a day and your streak lives. Start with what you can really do. You can change them any time.</p></div>
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

  if (step.type === 'age') {
    return `<div class="age-step"><div data-agepull></div><div class="ob-foot"><button class="btn btn-primary" data-next disabled>Continue</button></div></div>`;
  }

  if (step.type === 'account') {
    return `<form class="acct" novalidate>
      ${consentHTML({ minor: (ans.age || 18) < 18 })}
      <label class="sr" for="email">Email</label>
      <input id="email" class="big-input" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" placeholder="you@example.com" required>
      <p class="form-err" role="alert" hidden></p>
      <div class="ob-foot"><button class="btn btn-primary" type="submit" disabled>Create my account</button></div>
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

  if (step.type === 'trial') {
    const ends = new Date(Date.now() + TRIAL_DAYS * 864e5).toLocaleDateString([], { day: 'numeric', month: 'long' });
    return `<div class="trial">
      <div class="pw-plans" role="radiogroup" aria-label="Plan after your free month">
        <button class="pw-plan" data-plan="monthly" role="radio"><span><b>Monthly</b><small>${PRICES.monthly} a month</small></span></button>
        <button class="pw-plan" data-plan="yearly" role="radio"><span><b>Yearly</b><small>${PRICES.yearly} a year</small></span><em>Save ${PRICES.yearlySaving}</em></button>
      </div>
      <ul class="trial-facts">
        <li>${ic('check', 18, 2.4)}<span><b>Today you pay nothing.</b> We check your card with R1 and refund it straight away.</span></li>
        <li>${ic('calendar', 18)}<span><b>${ends}:</b> your card is charged <b data-charge></b>, then renews until you cancel.</span></li>
        <li>${ic('clock', 18)}<span>We remind you 3 days before, in the app and by notification.</span></li>
        <li>${ic('close', 18, 2.2)}<span><b>Cancel any time</b> in Account. Cancel before ${ends} and you pay nothing.</span></li>
      </ul>
      <p class="form-err trial-state" role="alert" hidden></p>
      <div class="ob-foot">
        <button class="btn btn-primary" data-card>Add card and start free</button>
        <p class="fine">Secure payment by Paystack. Proof never sees your card details.</p>
      </div>
    </div>`;
  }
  return '';
}
