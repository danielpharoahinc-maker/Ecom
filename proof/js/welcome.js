// First screen: Continue with Apple / Google / Microsoft / email.
import { signIn, sendEmailCode, verifyEmailCode } from './auth.js';
import { setUser } from './state.js';
import { LOGO, ic } from './icons.js';
import { $, toast, haptic } from './util.js';
import { LIVE, SIGN_IN } from './config.js';

export function renderWelcome(root, onDone) {
  root.innerHTML = `
  <section class="welcome">
    <div class="welcome-art" aria-hidden="true">
      <div class="stamp">
        <span class="stamp-word">Proof</span>
        <span class="stamp-line">Day 1</span>
      </div>
    </div>
    <div class="welcome-copy">
      <h1 class="display">Lock in.<br>Post proof.<br>Every day.</h1>
      <p class="lede">Three commitments. One photo and a few words each. Your crew sees it.</p>
    </div>
    <div class="auth">
      <button class="btn btn-primary" data-p="apple">${LOGO.apple}<span>Continue with Apple</span></button>
      <button class="btn btn-secondary" data-p="google">${LOGO.google}<span>Continue with Google</span></button>
      <button class="btn btn-secondary" data-p="microsoft">${LOGO.microsoft}<span>Continue with Microsoft</span></button>
      <button class="btn btn-quiet" data-p="email">${ic('mail', 20)}<span>Continue with email</span></button>
      <form class="email-form" hidden novalidate>
        <label class="sr" for="email">Email</label>
        <input id="email" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" placeholder="you@example.com" required>
        <p class="form-err" role="alert" hidden></p>
        <button class="btn btn-primary" type="submit">${LIVE ? 'Send me a code' : 'Continue'}</button>
      </form>
      <p class="fine">${LIVE ? 'We’ll email you a 6-digit code. No password needed.' : 'Test version: your account and proof are saved in this browser.'}</p>
    </div>
  </section>`;

  // Live mode: only show the sign-in options that are set up on the server.
  if (LIVE) {
    root.querySelectorAll('[data-p]').forEach((b) => { if (!SIGN_IN.includes(b.dataset.p)) b.remove(); });
    const only = SIGN_IN.length === 1 && SIGN_IN[0] === 'email';
    if (only) {
      root.querySelector('[data-p="email"]')?.remove();
      root.querySelector('.email-form').hidden = false;
    }
  }

  const go = async (provider, email = '') => {
    haptic();
    try {
      const res = await signIn(provider, email);
      if (res.pending) { if (res.message) toast(res.message); return; }
      await setUser(res.user);
      onDone();
    } catch (err) {
      toast(err.message || 'Sign-in failed. Try again.');
    }
  };

  root.querySelectorAll('[data-p]').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.p !== 'email') return go(b.dataset.p);
    const f = $('.email-form', root);
    f.hidden = false;
    b.hidden = true;
    $('#email', root).focus();
  }));

  const form = $('.email-form', root);
  const err = $('.form-err', form);
  const showErr = (m) => { err.textContent = m; err.hidden = !m; };
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#email', root).value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return showErr('Enter a full email address, like you@gmail.com.');
    showErr('');
    if (!LIVE) return go('email', email);
    const btn = form.querySelector('button');
    btn.disabled = true; btn.textContent = 'Sending…';
    try {
      await sendEmailCode(email);
      codeStep(root, email, onDone);
    } catch (e2) {
      showErr(e2.message);
      btn.disabled = false; btn.textContent = 'Send me a code';
    }
  });
}

// Step 2: type the 6-digit code from the email.
function codeStep(root, email, onDone) {
  const auth = $('.auth', root);
  auth.innerHTML = `
    <form class="code-form" novalidate>
      <h2 class="h2">Check your email</h2>
      <p class="sub">We sent a 6-digit code to <b class="email-shown"></b>. It can take a minute, and sometimes lands in spam.</p>
      <label class="sr" for="otp">6-digit code</label>
      <input id="otp" class="otp" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]*" maxlength="6" placeholder="000000">
      <p class="form-err" role="alert" hidden></p>
      <button class="btn btn-primary" type="submit" disabled>Sign in</button>
      <div class="code-links">
        <button type="button" class="link-btn" data-resend disabled>Send a new code</button>
        <button type="button" class="link-btn" data-change>Use a different email</button>
      </div>
    </form>`;
  $('.email-shown', auth).textContent = email; // set as text, never HTML
  const form = $('.code-form', auth);
  const input = $('#otp', auth);
  const btn = form.querySelector('[type=submit]');
  const err = $('.form-err', form);
  const resend = $('[data-resend]', auth);
  const showErr = (m) => { err.textContent = m; err.hidden = !m; };

  let wait = 30, timer;
  const tick = () => {
    resend.disabled = wait > 0;
    resend.textContent = wait > 0 ? `Send a new code in ${wait}s` : 'Send a new code';
    if (wait-- <= 0) clearInterval(timer);
  };
  const startTimer = () => { wait = 30; clearInterval(timer); tick(); timer = setInterval(tick, 1000); };
  startTimer();

  const verify = async () => {
    const code = input.value.replace(/\D/g, '');
    if (code.length !== 6) return;
    btn.disabled = true; btn.textContent = 'Checking…'; showErr('');
    try {
      const user = await verifyEmailCode(email, code);
      clearInterval(timer);
      haptic(20);
      await setUser(user);
      onDone();
    } catch (e) {
      showErr(e.message);
      btn.disabled = false; btn.textContent = 'Sign in';
      input.select();
    }
  };
  input.addEventListener('input', () => {
    input.value = input.value.replace(/\D/g, '').slice(0, 6);
    btn.disabled = input.value.length !== 6;
    if (input.value.length === 6) verify(); // auto-fill from the email or SMS bar
  });
  form.addEventListener('submit', (e) => { e.preventDefault(); verify(); });
  resend.addEventListener('click', async () => {
    resend.disabled = true;
    try { await sendEmailCode(email); toast('New code sent'); startTimer(); } catch (e) { showErr(e.message); resend.disabled = false; }
  });
  $('[data-change]', auth).addEventListener('click', () => { clearInterval(timer); renderWelcome(root, onDone); });
  setTimeout(() => input.focus(), 50);
}
