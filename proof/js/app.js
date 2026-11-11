// Proof: start-up and the bottom tab bar.
//   Vault | Stats | + | Today | Club
import { S, load, setUser } from './state.js';
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
import { refreshPro, afterCheckout } from './billing.js';
import { mountProff, unmountProff, startTour, tourNeeded } from './proff.js';
import { askReminders, syncSoon } from './reminders.js';

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
      // Proff explains the app first, then (if they chose it) the first proof.
      // Proff explains the app, asks about reminders, then the first proof.
      setTimeout(() => startTour(() => askReminders({
        onDone: () => { if (o?.firstProof) setTimeout(() => openCapture(), 300); },
      })), 450);
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
      ${TABS.map((t) => t.id === 'add'
        ? `<button class="tab-add" data-add aria-label="Post proof">${ic('plus', 26, 2.4)}</button>`
        : `<button class="tab" data-tab="${t.id}" aria-label="${t.label}">${ic(t.icon, 24)}<span>${t.label}</span></button>`).join('')}
    </nav>`;
  app.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => {
    if (S.tab === b.dataset.tab) return window.scrollTo({ top: 0, behavior: 'smooth' });
    haptic(); S.tab = b.dataset.tab; draw(true);
  }));
  app.querySelector('[data-add]').addEventListener('click', () => openCapture());
  draw();
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
  tab.render(view);
  if (scrollTop) window.scrollTo(0, 0);
}

window.addEventListener('proof:changed', () => { if (S.profile?.onboarded && S.user) { draw(); mountProff(); } });
window.addEventListener('proof:tab', (e) => { S.tab = e.detail; draw(true); });
window.addEventListener('proof:route', () => route());

async function boot() {
  await load();
  // Coming back from Apple/Google/Microsoft in live mode.
  if (!S.user) {
    const live = await currentLiveUser().catch(() => null);
    if (live) await setUser(live);
  }
  // Home-screen shortcuts: ?action=snap or ?action=talk
  const action = params.get('action');
  route();
  // Back from Paystack checkout, or a normal open: ask the server about Pro.
  if (S.profile?.onboarded) {
    if (params.has('paid')) { history.replaceState(null, '', location.pathname); afterCheckout(); }
    else refreshPro().catch(() => {});
    syncSoon(); // keep the reminder server up to date with today
  }
  if (S.profile?.onboarded && action === 'snap') openCapture();
  if (S.profile?.onboarded && action === 'talk') openCapture({ mode: 'voice' });
}

boot();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
