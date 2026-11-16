// First screen. A new person taps "Get started" and goes straight into setup;
// the account comes at the end. Someone who already has an account signs in here
// with their email (and accepts the terms) and gets a link, no code to type.
import { signIn, sendEmailCode, signedInElsewhere } from './auth.js';
import { setUser } from './state.js';
import { ic, WORDMARK } from './icons.js';
import { $, toast, haptic } from './util.js';
import { LIVE } from './config.js';
import { pendingInvite } from './invite.js';
import { consentHTML, consentOK } from './account.js';
import { proffSVG } from './proff.js';

const EMAIL_OK = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

export function renderWelcome(root, onDone, opts = {}) {
  if (opts.mode === 'signin') return signinView(root, onDone, opts);
  root.innerHTML = `
  <main class="welcome intro">
    <div class="intro-top" aria-hidden="true">${WORDMARK(34)}</div>
    <div class="intro-stage">
      ${pendingInvite() ? `<p class="invite-banner">${ic('club', 18)}<span>You’re invited to a club. Set up Proof and you’ll be added.</span></p>` : ''}
      <div class="say say-big" aria-live="polite"><h1 class="title"><span data-type></span><i class="caret"></i></h1></div>
      <div class="intro-proff" data-pf>${proffSVG('talk', 210)}</div>
    </div>
    <div class="auth">
      <button class="btn btn-primary" data-start>Let’s go</button>
      <button class="btn btn-quiet" data-have>I already have an account</button>
    </div>
  </main>`;
  typeLines(root, ['Hi, I’m Proff.', 'This is Proof. I’ll ask you a few quick questions to set it up.']);
  $('[data-start]', root).addEventListener('click', () => { haptic(12); opts.onStart?.(); });
  $('[data-have]', root).addEventListener('click', () => { haptic(8); signinView(root, onDone, { ...opts, canBack: true }); });
}

// Proff types out what he says, then waves. Skipped for people who want less motion.
function typeLines(root, lines) {
  const out = $('[data-type]', root), pf = $('[data-pf]', root);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { out.textContent = lines.join(' '); return; }
  let li = 0, ci = 0, text = '';
  const tick = () => {
    if (!document.body.contains(out)) return;
    const line = lines[li];
    if (ci < line.length) { text += line[ci++]; out.textContent = text; return setTimeout(tick, 32); }
    li++; ci = 0;
    if (li >= lines.length) { pf.innerHTML = proffSVG('cheer', 210); return; }
    pf.innerHTML = proffSVG('talk', 210); text = ''; setTimeout(tick, 650);
  };
  tick();
}

function signinView(root, onDone, opts) {
  root.innerHTML = `
  <main class="welcome">
    <div class="welcome-art" aria-hidden="true"><div class="brand">${WORDMARK(72)}</div></div>
    <div class="welcome-copy"><h1 class="display">Welcome back.</h1></div>
    <div class="auth">
      <form class="email-form" novalidate>
        ${consentHTML()}
        <label class="sr" for="email">Email</label>
        <input id="email" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" placeholder="you@example.com" required>
        <p class="form-err" role="alert" hidden></p>
        <button class="btn btn-primary" type="submit" disabled>${LIVE ? 'Send me a sign-in link' : 'Sign in'}</button>
      </form>
      ${opts.canBack ? '<button class="btn btn-quiet" data-back>Back</button>' : ''}
    </div>
  </main>`;
  const form = $('.email-form', root), err = $('.form-err', form), btn = form.querySelector('[type=submit]'), email = $('#email', root);
  const sync = () => { btn.disabled = !(consentOK(form) && EMAIL_OK(email.value.trim())); };
  form.addEventListener('input', sync); form.addEventListener('change', sync);
  $('[data-back]', root)?.addEventListener('click', () => renderWelcome(root, onDone, { ...opts, mode: undefined }));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const addr = email.value.trim().toLowerCase();
    if (!EMAIL_OK(addr)) { err.textContent = 'Enter a full email address, like you@gmail.com.'; err.hidden = false; return; }
    err.hidden = true; btn.disabled = true;
    try {
      if (!LIVE) { const r = await signIn('email', addr); await setUser(r.user); return onDone(); }
      btn.textContent = 'Sending…';
      await sendEmailCode(addr);
      waitForLink($('.auth', root), addr, {
        onUser: async (user) => { await setUser(user); onDone(); },
        onBack: () => signinView(root, onDone, opts),
      });
    } catch (e2) { err.textContent = e2.message || 'Couldn’t send the link. Try again.'; err.hidden = false; btn.disabled = false; btn.textContent = 'Send me a sign-in link'; }
  });
}

// "Check your email": the link signs you in, and this screen notices by itself.
export function waitForLink(box, email, { onUser, onBack }) {
  box.innerHTML = `
    <div class="wait-step">
      <h2 class="h2">Check your email</h2>
      <p class="sub">Tap the link we sent to <b class="email-shown"></b>. You’ll be signed in.</p>
      <div class="code-links">
        <button type="button" class="link-btn" data-resend disabled>Send again</button>
        <button type="button" class="link-btn" data-change>Use a different email</button>
      </div>
    </div>`;
  $('.email-shown', box).textContent = email; // text, never HTML
  const resend = $('[data-resend]', box);
  let wait = 45, timer;
  const tick = () => { resend.disabled = wait > 0; resend.textContent = wait > 0 ? `Send again in ${wait}s` : 'Send again'; if (wait-- <= 0) clearInterval(timer); };
  const startTimer = () => { wait = 45; clearInterval(timer); tick(); timer = setInterval(tick, 1000); };
  startTimer();
  const watch = setInterval(async () => {
    if (!document.body.contains(box.querySelector('.wait-step'))) return clearInterval(watch);
    const user = await signedInElsewhere().catch(() => null);
    if (user) { clearInterval(watch); clearInterval(timer); onUser(user); }
  }, 2500);
  resend.addEventListener('click', async () => {
    resend.disabled = true;
    try { await sendEmailCode(email); toast('Sent again.'); startTimer(); } catch (e) { toast(e.message); resend.disabled = false; }
  });
  $('[data-change]', box).addEventListener('click', () => { clearInterval(timer); clearInterval(watch); onBack?.(); });
}
