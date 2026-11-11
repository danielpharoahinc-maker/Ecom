// First screen: Continue with Apple / Google / Microsoft / email.
import { signIn } from './auth.js';
import { setUser } from './state.js';
import { LOGO, ic } from './icons.js';
import { $, toast, haptic } from './util.js';
import { LIVE } from './config.js';

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
      <form class="email-form" hidden>
        <label class="sr" for="email">Email</label>
        <input id="email" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com" required>
        <button class="btn btn-primary" type="submit">Continue</button>
      </form>
      <p class="fine">${LIVE ? 'By continuing you agree to the Terms and Privacy Policy.' : 'Test version: your account and proof are saved in this browser.'}</p>
    </div>
  </section>`;

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
  $('.email-form', root).addEventListener('submit', (e) => {
    e.preventDefault();
    go('email', $('#email', root).value.trim());
  });
}
