// Free plan and Proof Pro.
// Everyone gets FREE_POSTS posts. After that, posting needs Pro; planning,
// the Vault, Stats and Club stay open so nobody loses their history.
//
// Note: in this version the count lives on the phone, so a determined person
// could reset it by clearing their data. Real enforcement moves to the server
// with payments (docs/BACKEND.md).
import { S, saveProfile } from './state.js';
import { FREE_POSTS, PRICES, LIVE } from './config.js';
import { openSheet } from './sheet.js';
import { ic } from './icons.js';
import { toast, emit, haptic } from './util.js';

export const isPro = () => Boolean(S.profile?.pro);
export const postsUsed = () => S.profile?.postsUsed ?? S.proofs.length;
export const postsLeft = () => Math.max(0, FREE_POSTS - postsUsed());
export const canPost = () => isPro() || postsLeft() > 0;

export function paywall({ reason = 'limit' } = {}) {
  let plan = 'yearly';
  openSheet(`
    <div class="pw">
      <span class="pw-mark">Pro</span>
      <h2 class="h2">${reason === 'limit' ? 'Your free week is done' : 'Proof Pro'}</h2>
      <p class="sub">${reason === 'limit'
        ? `You’ve posted ${FREE_POSTS} times. Keep your streak alive with Pro.`
        : `${postsLeft()} of ${FREE_POSTS} free posts left.`}</p>
      <ul class="pw-list">
        <li>${ic('camera', 18)}<span>Unlimited proof and moments</span></li>
        <li>${ic('club', 18)}<span>Clubs with your whole crew</span></li>
        <li>${ic('play', 18)}<span>30-day recap of your progress</span></li>
        <li>${ic('stats', 18)}<span>Your full history and stats</span></li>
      </ul>
      <div class="pw-plans" role="radiogroup" aria-label="Plan">
        <button class="pw-plan on" data-plan="yearly" role="radio" aria-checked="true">
          <span><b>Yearly</b><small>${PRICES.yearly} a year</small></span><em>Save ${PRICES.yearlySaving}</em></button>
        <button class="pw-plan" data-plan="monthly" role="radio" aria-checked="false">
          <span><b>Monthly</b><small>${PRICES.monthly} a month</small></span></button>
      </div>
      <button class="btn btn-primary" data-buy>Continue with Pro</button>
      ${LIVE ? '' : '<button class="btn btn-quiet" data-test-unlock>Test version: unlock Pro</button>'}
      <p class="fine">Your Vault, Stats, plans and Club stay free either way.</p>
    </div>`, {
    onMount(body, close) {
      body.querySelectorAll('[data-plan]').forEach((b) => b.addEventListener('click', () => {
        haptic(); plan = b.dataset.plan;
        body.querySelectorAll('[data-plan]').forEach((x) => {
          x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b);
        });
      }));
      body.querySelector('[data-buy]').addEventListener('click', () => {
        // Payments need a payment provider and a parent's account (docs/BACKEND.md).
        toast(`Payments switch on in the live version (${plan === 'yearly' ? PRICES.yearly + '/year' : PRICES.monthly + '/month'}).`);
      });
      body.querySelector('[data-test-unlock]')?.addEventListener('click', async () => {
        await saveProfile({ ...S.profile, pro: true });
        close(); toast('Pro unlocked for testing'); emit('proof:changed');
      });
    },
  });
}
