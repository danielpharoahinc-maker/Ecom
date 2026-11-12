// Proof: start-up and the bottom tab bar.
//   Vault | Stats | + | Today | Club
import { S, load, setUser, signOut } from './state.js';
import { LIVE } from './config.js';
import { currentLiveUser } from './auth.js';
import { renderWelcome } from './welcome.js';
import { renderOnboarding } from './onboarding.js';
import { renderToday } from './today.js';
import { renderVault } from './vault.js';
import { renderStats } from './statsview.js';
import { renderClub, join } from './club.js';
import { openCapture } from './capture.js';
import { ic } from './icons.js';
import { haptic } from './util.js';
import { refreshAccess, afterCheckout } from './billing.js';
import { mountProff, unmountProff, startTour, tourNeeded } from './proff.js';
import { syncSoon } from './reminders.js';
import { startSync, restoreProfile } from './sync.js';
import { afterFirstProof, runNudges } from './nudges.js';

const app = document.getElementById('app');

const TABS = [
  { id: 'vault', label: 'Vault', icon: 'vault', render: renderVault },
  { id: 'stats', label: 'Stats', icon: 'stats', render: renderStats },
  { id: 'add' },
  { id: 'today', label: 'Today', icon: 'today', render: renderToday },
  { id: 'club', label: 'Club', icon: 'club', render: renderClub },
];

// An invite link looks like ...?join=ABC123. Remember it through sign-up.
const params = new URLSearchParams(location.search);
// Kept in sessionStorage so it survives the Apple/Google/Microsoft redirect.
const JOIN_KEY = 'proof:join';
let pendingJoin = params.get('join')?.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || '';
try {
  if (pendingJoin) sessionStorage.setItem(JOIN_KEY, pendingJoin);
  else pendingJoin = sessionStorage.getItem(JOIN_KEY) || '';
} catch { /* private mode: keep it in memory only */ }
if (params.has('join')) history.replaceState(null, '', location.pathname);

function route(opts = {}) {
  if (!S.user) { unmountProff(); return renderWelcome(app, () => route()); }
  if (!S.profile?.onboarded) {
    unmountProff();
    return renderOnboarding(app, (o) => {
      S.tab = 'today';
      route();
      // Proff explains the app, then you post your first proof.
      setTimeout(() => startTour(() => { if (o?.firstProof) setTimeout(() => openCapture(), 300); }), 450);
    });
  }
  shell();
  mountProff();
  if (tourNeeded() && !opts.fromOnboarding) setTimeout(() => startTour(), 600);
  if (pendingJoin) {
    const code = pendingJoin;
    pendingJoin = '';
    try { sessionStorage.removeItem(JOIN_KEY); } catch { /* ignore */ }
    S.tab = 'club'; draw();
    setTimeout(() => join(code), 300);
  }
  if (opts.capture) openCapture();
}

function shell() {
  app.innerHTML = `
    <main id="view" class="view" tabindex="-1"></main>
    <nav class="tabbar glass" aria-label="Main">
      <span class="bubble" aria-hidden="true"></span>
      ${TABS.map((t) => t.id === 'add'
        ? `<button class="tab tab-add" data-add aria-label="Post proof">${ic('plus', 26, 2.2)}<span>Post</span></button>`
        : `<button class="tab" data-tab="${t.id}" aria-label="${t.label}">${ic(t.icon, 24)}<span>${t.label}</span></button>`).join('')}
    </nav>`;
  app.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => {
    if (S.tab === b.dataset.tab) return window.scrollTo({ top: 0, behavior: 'smooth' });
    haptic(); S.tab = b.dataset.tab; draw(true);
  }));
  app.querySelector('[data-add]').addEventListener('click', () => { haptic(); bubbleTo(app.querySelector('[data-add]')); openCapture(); });
  window.addEventListener('capture:closed', () => bubbleTo(null));
  window.addEventListener('resize', () => bubbleTo(null, true));
  draw();
}

// The glass bubble sits over whichever tab you are on. Tapping + moves it to +.
function bubbleTo(el, instant = false) {
  const nav = app.querySelector('.tabbar'), bub = nav?.querySelector('.bubble');
  if (!bub) return;
  const target = el || nav.querySelector(`[data-tab="${S.tab}"]`);
  if (!target) return;
  if (instant) bub.style.transition = 'none';
  bub.style.width = target.offsetWidth + 'px';
  bub.style.transform = `translateX(${target.offsetLeft}px)`;
  if (instant) requestAnimationFrame(() => { bub.style.transition = ''; });
}

function draw(scrollTop = false) {
  const view = document.getElementById('view');
  if (!view) return;
  const tab = TABS.find((t) => t.id === S.tab) || TABS[3];
  app.querySelectorAll('[data-tab]').forEach((b) => {
    const on = b.dataset.tab === tab.id;
    b.classList.toggle('on', on);
    if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  bubbleTo(null, !app.querySelector('.bubble')?.style.width);
  const paint = () => { tab.render(view); if (scrollTop) window.scrollTo(0, 0); };
  if (scrollTop && document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) document.startViewTransition(paint);
  else paint();
}

window.addEventListener('proof:changed', () => { if (S.profile?.onboarded && S.user) { draw(); mountProff(); } });
window.addEventListener('proof:tab', (e) => { S.tab = e.detail; draw(true); });
window.addEventListener('proof:route', () => route());
window.addEventListener('proof:first', () => setTimeout(afterFirstProof, 900));
// Tapping a notification can ask for the club tab.
const fromHash = () => { if (location.hash === '#club' && S.profile?.onboarded) { S.tab = 'club'; draw(true); history.replaceState(null, '', location.pathname); } };
window.addEventListener('hashchange', fromHash);

async function boot() {
  await load();
  // Live mode: the real login is the source of truth. A leftover test-mode account
  // (a different id) can't use clubs, cloud backup or reminders, so it is replaced.
  if (LIVE) {
    const live = await currentLiveUser().catch(() => null);
    if (live) {
      if (!S.user || S.user.id !== live.id) await setUser({ ...live, email: live.email || (S.user?.id === live.id ? S.user.email : '') });
    } else if (S.user) { await signOut(); }
  }
  // A new phone: bring your goals and proof back from your account.
  if (S.user && !S.profile?.onboarded) await restoreProfile().then((ok) => ok && load()).catch(() => {});
  // Home-screen shortcuts: ?action=snap or ?action=talk
  const action = params.get('action');
  // Back from the payment page in the middle of onboarding: tell the card step.
  if (params.has('paid') && !S.profile?.onboarded) { try { sessionStorage.setItem('proof:paid', '1'); } catch { /* ignore */ } }
  route();
  // Back from Paystack checkout, or a normal open: ask the server about Pro.
  if (params.has('paid')) {
    history.replaceState(null, '', location.pathname);
    // Mid-onboarding the card step finishes the job; otherwise confirm here.
    if (S.profile?.onboarded) afterCheckout();
  }
  if (S.profile?.onboarded) {
    if (!params.has('paid')) refreshAccess().catch(() => {});
    syncSoon(); // keep the reminder server up to date with today
    startSync(); // save proof to your account, pull it back on a new phone
    fromHash();
    setTimeout(runNudges, 2200);
  }
  if (S.profile?.onboarded && action === 'snap') openCapture();
  if (S.profile?.onboarded && action === 'talk') openCapture({ mode: 'voice' });
}

boot();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
