// Access, the 30-day trial and Proof Pro.
//
// Everyone gets TRIAL_DAYS free. With payments live and a card required, the
// card is added up front (a R1 check, refunded at once) and charged on day 30
// unless cancelled. After the trial, posting needs Pro; the Vault, Stats,
// plans and Club stay open so nobody loses their history.
//
// The server decides who has access (profiles.pro_until, set only by the
// payment webhook). The app asks it; this file never grants anything itself.
import { S, saveProfile } from './state.js';
import { daysKept } from './stats.js';
import { TRIAL_DAYS, PRICES, PAYMENTS_LIVE } from './config.js';
import { getClient } from './auth.js';
import { openSheet } from './sheet.js';
import { ic } from './icons.js';
import { toast, emit, haptic } from './util.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tz = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Johannesburg'; } catch { return 'Africa/Johannesburg'; } };
const fmtDate = (d) => d.toLocaleDateString([], { day: 'numeric', month: 'long' });

/* ---------- who has access ---------- */

export function accessEnds() {
  const server = S.profile?.proUntil || S.access?.proUntil;
  if (server) return new Date(server);
  // Payments off: the free trial simply runs from sign-up.
  if (!PAYMENTS_LIVE && S.profile?.createdAt) return new Date(S.profile.createdAt + TRIAL_DAYS * 864e5);
  return null;
}
export const hasAccess = () => { const e = accessEnds(); return Boolean(e && e > new Date()); };
export const canPost = hasAccess;
export const serverAccess = () => Boolean(S.access?.proUntil && new Date(S.access.proUntil) > new Date());
export const daysLeft = () => Math.max(0, Math.ceil(((accessEnds() || 0) - Date.now()) / 864e5));

// trial (card on file) | trial-free (no card) | active | cancelled | ended
export function planState() {
  const sub = S.profile?.sub || S.access?.sub;
  const ends = accessEnds();
  if (!hasAccess()) return { kind: 'ended', ends };
  if (sub?.status === 'active') return { kind: 'active', ends, plan: sub.plan };
  if (sub?.status === 'trial') return { kind: 'trial', ends, plan: sub.plan, chargeOn: sub.chargeOn ? new Date(sub.chargeOn) : ends };
  if (sub?.status === 'cancelled') return { kind: 'cancelled', ends };
  return { kind: 'trial-free', ends };
}

// Ask the server what this person has paid for.
export async function refreshAccess() {
  const c = await getClient().catch(() => null);
  if (!c || !S.user) return hasAccess();
  const [prof, bill] = await Promise.all([
    c.from('profiles').select('pro_until').eq('id', S.user.id).maybeSingle(),
    c.rpc('my_billing').then((r) => r, () => ({ data: null })),
  ]);
  const b = Array.isArray(bill.data) ? bill.data[0] : bill.data;
  const next = {
    proUntil: prof.data?.pro_until || null,
    sub: b ? { status: b.status, plan: b.plan, chargeOn: b.charge_on } : null,
  };
  S.access = next;
  if (S.profile && (S.profile.proUntil !== next.proUntil || JSON.stringify(S.profile.sub) !== JSON.stringify(next.sub))) {
    await saveProfile({ ...S.profile, proUntil: next.proUntil, sub: next.sub });
    emit('proof:changed');
  }
  return hasAccess();
}

// After paying, the bank's confirmation takes a few seconds to reach the server.
export async function waitForAccess(tries = 8) {
  for (let n = 0; n < tries; n++) {
    await refreshAccess();
    if (serverAccess()) return true;
    await sleep(2500);
  }
  return false;
}

// Coming back from the payment page (?paid=1).
export async function afterCheckout() {
  toast('Confirming your payment…');
  if (await waitForAccess()) { toast('You’re all set. Keep going.'); return true; }
  toast('Still processing. Your access switches on as soon as the bank confirms.');
  return false;
}

/* ---------- saving the profile on the server ---------- */

// Returns an error message, or null. Works before and after the club/goals
// upgrade: if the newer columns aren't there yet it saves the basics.
export async function pushProfile(profile = S.profile, strict = false) {
  const c = await getClient().catch(() => null);
  if (!c || !S.user || !profile) return strict ? 'Not connected.' : null;
  const arr = (v) => (v == null ? null : [].concat(v).map(String));
  // The server only accepts your own row, so use the id of the real login, never a stored copy.
  const { data: sess } = await c.auth.getSession();
  if (!sess.session) return strict ? 'You’re signed out.' : null;
  const base = { id: sess.session.user.id, name: profile.name, goal: arr(profile.goal), proof_time: arr(profile.proofTime), commitments: profile.commitments };
  let { error } = await c.from('profiles').upsert({ ...base, goal_log: profile.goalLog || null, tz: tz() });
  if (error && /column|schema cache/i.test(error.message)) ({ error } = await c.from('profiles').upsert(base));
  return error ? error.message : null;
}

/* ---------- checkout and managing the subscription ---------- */

export async function startCheckout({ plan, trial = false }, profileDraft) {
  const c = await getClient().catch(() => null);
  if (!PAYMENTS_LIVE || !c) return 'Payments open soon.';
  // The server needs your profile row before it can give you access.
  if (profileDraft) {
    const err = await pushProfile(profileDraft, true);
    if (err) return 'Couldn’t save your details. Check your connection and try again.';
  }
  const { data, error } = await c.functions.invoke('create-checkout', { body: { plan, trial } });
  if (error || !data?.url) return data?.error || 'Couldn’t open checkout. Try again.';
  location.href = data.url; // Paystack's secure payment page
  return null;
}

async function openManage(btn) {
  const c = await getClient().catch(() => null);
  if (!c) return toast('Open Proof online to manage your subscription.');
  btn.disabled = true;
  const { data, error } = await c.functions.invoke('manage-subscription');
  btn.disabled = false;
  if (error || !data?.url) return toast(data?.error || 'Couldn’t open your subscription page. Try again.');
  location.href = data.url;
}

/* ---------- screens ---------- */

export function paywall({ reason = 'ended' } = {}) {
  let plan = 'monthly';
  const kept = daysKept(S.proofs, S.profile);
  openSheet(`
    <div class="pw">
      <h2 class="h2">${reason === 'ended' ? 'Your 30 days are up' : 'Proof Pro'}</h2>
      <p class="sub">${kept ? `You’ve kept your streak on ${kept} ${kept === 1 ? 'day' : 'days'}. ` : ''}Pro keeps you going. Your Vault, Stats, plans and Club stay yours either way.</p>
      <ul class="pw-list">
        <li>${ic('camera', 18)}<span>Post proof and moments every day</span></li>
        <li>${ic('club', 18)}<span>Clubs with your whole crew</span></li>
        <li>${ic('play', 18)}<span>30-day recap and the Sunday Review</span></li>
        <li>${ic('stats', 18)}<span>Your full history and stats</span></li>
      </ul>
      <div class="pw-plans" role="radiogroup" aria-label="Plan">
        <button class="pw-plan on" data-plan="monthly" role="radio" aria-checked="true"><span><b>Monthly</b><small>${PRICES.monthly} a month</small></span></button>
        <button class="pw-plan" data-plan="yearly" role="radio" aria-checked="false"><span><b>Yearly</b><small>${PRICES.yearly} a year</small></span><em>Save ${PRICES.yearlySaving}</em></button>
      </div>
      <button class="btn btn-primary" data-buy ${PAYMENTS_LIVE ? '' : 'disabled'}>${PAYMENTS_LIVE ? 'Continue with Pro' : 'Payments open soon'}</button>
      <p class="fine">Secure payment by Paystack. Cancel any time in Account.</p>
    </div>`, {
    onMount(body) {
      body.querySelectorAll('[data-plan]').forEach((b) => b.addEventListener('click', () => {
        haptic(); plan = b.dataset.plan;
        body.querySelectorAll('[data-plan]').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); });
      }));
      body.querySelector('[data-buy]').addEventListener('click', async (e) => {
        const btn = e.currentTarget; btn.disabled = true; btn.textContent = 'Opening secure checkout…';
        const err = await startCheckout({ plan, trial: false });
        if (err) { btn.disabled = false; btn.textContent = 'Continue with Pro'; toast(err); }
      });
    },
  });
}

// Account > Subscription: plain facts about what you pay and when.
export function subscriptionSheet() {
  const st = planState();
  const price = (p) => (p === 'yearly' ? `${PRICES.yearly} a year` : `${PRICES.monthly} a month`);
  const facts = {
    trial: `Free until <b>${fmtDate(st.ends || new Date())}</b>. On <b>${fmtDate(st.chargeOn || new Date())}</b> your card is charged ${price(st.plan)}. Cancel before then and you pay nothing.`,
    'trial-free': `Your free trial has <b>${daysLeft()} ${daysLeft() === 1 ? 'day' : 'days'}</b> left.${PAYMENTS_LIVE ? '' : ' Payments open soon; nothing is charged.'}`,
    active: `You’re on Proof Pro (${price(st.plan)}). It renews until you cancel.`,
    cancelled: `Your subscription is cancelled. You keep Pro until <b>${fmtDate(st.ends || new Date())}</b> and won’t be charged again.`,
    ended: 'Your free trial is over. Pick a plan to keep posting.',
  }[st.kind];
  openSheet(`
    <h2 class="h2">Subscription</h2>
    <p class="sub sub-facts">${facts}</p>
    <div class="stack">
      ${st.kind === 'trial' || st.kind === 'active' ? '<button class="btn btn-secondary" data-manage>Manage or cancel</button>' : ''}
      ${st.kind === 'ended' || st.kind === 'cancelled' || st.kind === 'trial-free' ? '<button class="btn btn-primary" data-plans>See plans</button>' : ''}
    </div>`, {
    onMount(body, close) {
      body.querySelector('[data-manage]')?.addEventListener('click', (e) => openManage(e.currentTarget));
      body.querySelector('[data-plans]')?.addEventListener('click', () => { close(); setTimeout(() => paywall({ reason: 'info' }), 320); });
    },
  });
}

// A heads-up on Today in the last week of the trial: never a surprise charge.
export function trialBanner() {
  const st = planState();
  if (st.kind === 'ended') return { html: '<button class="free-bar" data-sub><span>Your free trial is over</span><b>See plans</b></button>', open: () => paywall() };
  if (st.kind === 'trial' && daysLeft() <= 7) {
    return { html: `<button class="free-bar" data-sub><span>Your free month ends ${fmtDate(st.chargeOn || st.ends)}. Your card is charged then.</span><b>Manage</b></button>`, open: subscriptionSheet };
  }
  if (st.kind === 'trial-free' && PAYMENTS_LIVE && daysLeft() <= 7) {
    return { html: `<button class="free-bar" data-sub><span>${daysLeft()} ${daysLeft() === 1 ? 'day' : 'days'} left of your free trial</span><b>See plans</b></button>`, open: () => paywall({ reason: 'info' }) };
  }
  return null;
}
