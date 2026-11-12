// First screen: Continue with Apple / Google / Microsoft / email.
import { signIn, sendEmailCode, startAccount, signedInElsewhere } from './auth.js';
import { setUser } from './state.js';
import { LOGO, ic, WORDMARK } from './icons.js';
import { $, toast, haptic } from './util.js';
import { LIVE, SIGN_IN } from './config.js';
import { pendingInvite } from './invite.js';

export function renderWelcome(root, onDone) {
  root.innerHTML = `
  <section class="welcome">
    <div class="welcome-art" aria-hidden="true">
      <div class="brand">${WORDMARK(84)}</div>
    </div>
    <div class="welcome-copy">
      ${pendingInvite() ? `<p class="invite-banner">${ic('club', 18)}<span>You’re invited to a club. Sign in and you’ll be added.</span></p>` : ''}
      <h1 class="display">Lock in.<br>Post proof.<br>Every day.</h1>
    </div>
    <div class="auth">
      <fieldset class="consent">
        <legend class="sr">Age and agreement</legend>
        <label class="chk"><input type="radio" name="age" value="adult"><span>I’m 18 or older</span></label>
        <label class="chk"><input type="radio" name="age" value="minor"><span>I’m under 18 and my parent or guardian agrees to me using Proof</span></label>
        <label class="chk"><input type="checkbox" name="agree"><span>I agree to the <a href="terms.html" target="_blank" rel="noopener">Terms</a> and <a href="privacy.html" target="_blank" rel="noopener">Privacy Policy</a></span></label>
      </fieldset>
      <button class="btn btn-primary" data-p="apple">${LOGO.apple}<span>Continue with Apple</span></button>
      <button class="btn btn-secondary" data-p="google">${LOGO.google}<span>Continue with Google</span></button>
      <button class="btn btn-secondary" data-p="microsoft">${LOGO.microsoft}<span>Continue with Microsoft</span></button>
      <button class="btn btn-quiet" data-p="email">${ic('mail', 20)}<span>Continue with email</span></button>
      <form class="email-form" hidden novalidate>
        <label class="sr" for="email">Email</label>
        <input id="email" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" placeholder="you@example.com" required>
        <p class="form-err" role="alert" hidden></p>
        <button class="btn btn-primary" type="submit">Continue</button>
      </form>
      ${LIVE ? '' : '<p class=\"fine\">Test version: your account and proof are saved in this browser.</p>'}
    </div>
  </section>`;

  // Consent comes first: nothing below works until age and agreement are given.
  const gate = () => {
    const ok = root.querySelector('[name=age]:checked') && root.querySelector('[name=agree]').checked;
    root.querySelectorAll('.auth .btn').forEach((b) => { b.disabled = !ok; });
    if (ok) { try { localStorage.setItem('proof:consent', JSON.stringify({ age: root.querySelector('[name=age]:checked').value, terms: 1, ts: Date.now() })); } catch { /* ignore */ } }
  };
  root.querySelectorAll('.consent input').forEach((i) => i.addEventListener('change', gate));
  gate();

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
    btn.disabled = true; btn.textContent = 'One moment…';
    try {
      const res = await startAccount(email);
      if (res.existing) return waitStep(root, email, onDone);
      haptic(20);
      await setUser(res.user);
      toast('Link sent to your email. Tap it to save your account. Keep playing.');
      onDone();
    } catch (e2) {
      showErr(e2.message);
      btn.disabled = false; btn.textContent = 'Continue';
    }
  });
}

// Returning accounts only: the link in the email signs you in. No code to type.
function waitStep(root, email, onDone) {
  const auth = $('.auth', root);
  auth.innerHTML = `
    <div class="wait-step">
      <h2 class="h2">Check your email</h2>
      <p class="sub">Tap the link we sent to <b class="email-shown"></b>. You’ll be signed in.</p>
      <div class="code-links">
        <button type="button" class="link-btn" data-resend disabled>Send again</button>
        <button type="button" class="link-btn" data-change>Use a different email</button>
      </div>
    </div>`;
  $('.email-shown', auth).textContent = email; // text, never HTML
  const resend = $('[data-resend]', auth);
  let wait = 45, timer;
  const tick = () => { resend.disabled = wait > 0; resend.textContent = wait > 0 ? `Send again in ${wait}s` : 'Send again'; if (wait-- <= 0) clearInterval(timer); };
  const startTimer = () => { wait = 45; clearInterval(timer); tick(); timer = setInterval(tick, 1000); };
  startTimer();
  // The link signs you in; this screen notices and moves on by itself.
  const watch = setInterval(async () => {
    if (!document.body.contains(auth.querySelector('.wait-step'))) return clearInterval(watch);
    const user = await signedInElsewhere().catch(() => null);
    if (user) { clearInterval(watch); clearInterval(timer); await setUser(user); onDone(); }
  }, 2500);
  resend.addEventListener('click', async () => {
    resend.disabled = true;
    try { await sendEmailCode(email); toast('Sent again.'); startTimer(); } catch (e) { toast(e.message); resend.disabled = false; }
  });
  $('[data-change]', auth).addEventListener('click', () => { clearInterval(timer); clearInterval(watch); renderWelcome(root, onDone); });
}
