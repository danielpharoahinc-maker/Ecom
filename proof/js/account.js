// Shared by sign-up and sign-in: the terms checkbox, saving that consent, and creating the account.
import { LIVE } from './config.js';
import { startAccount } from './auth.js';
import { uid } from './util.js';

export const consentHTML = () => `
  <div class="consent">
    <label class="chk"><input type="checkbox" name="agree"><span>I agree to the <a href="terms.html" target="_blank" rel="noopener">Terms</a> and <a href="privacy.html" target="_blank" rel="noopener">Privacy Policy</a></span></label>
  </div>`;

// True when the terms box is ticked.
export const consentOK = (root) => Boolean(root.querySelector('[name=agree]')?.checked);

export function saveConsent({ age = null, minor = false } = {}) {
  try { localStorage.setItem('proof:consent', JSON.stringify({ age, minor, terms: 1, ts: Date.now() })); } catch { /* private mode */ }
}

// A new account. Live: a guest account is created at once and the email is attached
// (the link in the email confirms it). Test mode: an account on this phone.
export async function createAccount(email) {
  if (!LIVE) return { user: { id: uid(), email, name: '', provider: 'email', local: true } };
  return startAccount(email);
}
