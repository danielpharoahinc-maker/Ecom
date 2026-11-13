// Shared by sign-up and sign-in: the terms checkbox (and parent consent for under
// 18s), saving that consent, and creating the account.
import { LIVE } from './config.js';
import { startAccount } from './auth.js';
import { uid } from './util.js';

export const consentHTML = ({ minor = false } = {}) => `
  <div class="consent">
    <label class="chk"><input type="checkbox" name="agree"><span>I agree to the <a href="terms.html" target="_blank" rel="noopener">Terms</a> and <a href="privacy.html" target="_blank" rel="noopener">Privacy Policy</a></span></label>
    ${minor ? '<label class="chk"><input type="checkbox" name="parent"><span>My parent or guardian agrees to me using Proof</span></label>' : ''}
  </div>`;

// True when every box that has to be ticked is ticked.
export const consentOK = (root) => {
  const a = root.querySelector('[name=agree]'), p = root.querySelector('[name=parent]');
  return Boolean(a?.checked && (!p || p.checked));
};

export function saveConsent({ age = null, minor = false } = {}) {
  try { localStorage.setItem('proof:consent', JSON.stringify({ age, minor, terms: 1, ts: Date.now() })); } catch { /* private mode */ }
}

// A new account. Live: a guest account is created at once and the email is attached
// (the link in the email confirms it). Test mode: an account on this phone.
export async function createAccount(email) {
  if (!LIVE) return { user: { id: uid(), email, name: '', provider: 'email', local: true } };
  return startAccount(email);
}
