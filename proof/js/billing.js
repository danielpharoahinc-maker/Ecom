// Free plan and Proof Pro.
// Everyone gets FREE_POSTS posts. After that, posting needs Pro; planning,
// the Vault, Stats and Club stay open so nobody loses their history.
//
// Note: in this version the count lives on the phone, so a determined person
// could reset it by clearing their data. Real enforcement moves to the server
// with payments (docs/BACKEND.md).
import { S, saveProfile } from './state.js';
import { FREE_POSTS, PRICES } from './config.js';
import { openSheet } from './sheet.js';
import { ic } from './icons.js';
import { toast, emit, haptic } from './util.js';
import { getClient } from './auth.js';

// Pro is a paid-until date set by the server after a real payment.
export const isPro = () => Boolean(S.profile?.proUntil && new Date(S.profile.proUntil) > new Date());

// Ask the server whether this person has paid (live mode only).
export async function refreshPro() {
  const c = await getClient().catch(() => null);
  if (!c || !S.user || !S.profile) return isPro();
  const { data } = await c.from('profiles').select('pro_until').eq('id', S.user.id).maybeSingle();
  if (data && data.pro_until !== (S.profile.proUntil ?? null)) {
    await saveProfile({ ...S.profile, proUntil: data.pro_until });
    emit('proof:changed');
  }
  return isPro();
}

// Live mode: create/update this person's row on the server after onboarding.
// Only the fields they're allowed to write; Pro and the post count stay server-side.
export async function pushProfile() {
  const c = await getClient().catch(() => null);
  if (!c || !S.user || !S.profile) return;
  const P = S.profile;
  const arr = (v) => (v == null ? null : [].concat(v).map(String));
  await c.from('profiles').upsert({
    id: S.user.id, name: P.name, goal: arr(P.goal), wake: P.wake ?? null, lockin: P.lockin ?? null,
    proof_time: arr(P.proofTime), crew: arr(P.crew), obstacle: arr(P.obstacle), commitments: P.commitments,
  });
}

// Coming back from Paystack (?paid=1): the payment confirmation can take a
// few seconds to reach the server, so check a few times.
export async function afterCheckout() {
  toast('Confirming your payment…');
  for (let i = 0; i < 8; i++) {
    if (await refreshPro()) { toast('You’re Pro. Keep going.'); return true; }
    await new Promise((r) => setTimeout(r, 2500));
  }
  toast('Payment is still processing. Pro switches on as soon as it clears.');
  return false;
}

async function startCheckout(plan, btn) {
  const c = await getClient().catch(() => null);
  if (!c) { toast('Payments open when Proof launches.'); return; }
  btn.disabled = true; btn.textContent = 'Opening secure checkout…';
  const { data, error } = await c.functions.invoke('create-checkout', { body: { plan } });
  if (error || !data?.url) {
    btn.disabled = false; btn.textContent = 'Continue with Pro';
    toast(data?.error || 'Couldn’t open checkout. Try again.');
    return;
  }
  location.href = data.url; // Paystack's secure payment page
}
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
      <p class="fine">Secure payment by Paystack. Cancel any time; Pro runs until the end of what you paid for. Your Vault, Stats, plans and Club stay free either way.</p>
    </div>`, {
    onMount(body, close) {
      body.querySelectorAll('[data-plan]').forEach((b) => b.addEventListener('click', () => {
        haptic(); plan = b.dataset.plan;
        body.querySelectorAll('[data-plan]').forEach((x) => {
          x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b);
        });
      }));
      body.querySelector('[data-buy]').addEventListener('click', (e) => startCheckout(plan, e.currentTarget));
    },
  });
}
