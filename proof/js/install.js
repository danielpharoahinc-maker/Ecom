// "Add to Home Screen" guide, shown during onboarding. Asks Safari or Chrome,
// then draws the exact buttons to tap. Android Chrome gets a one-tap Install.
import { ic } from './icons.js';
import { haptic } from './util.js';

const ua = navigator.userAgent;
const isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isChromeIOS = /CriOS/.test(ua);
const isAndroid = /Android/.test(ua);
const isSafari = isIOS && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);

export const isIOSDevice = isIOS;
export const isInstalled = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;

// Android Chrome offers its own install prompt; keep it for our button.
let deferred = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; });

const hl = (inner, label = '') => `<span class="mk-hl" ${label ? `aria-label="${label}"` : ''}>${inner}</span>`;
const appIcon = '<img class="mk-app" src="icons/icon-180.png" alt="">';
const url = `<span class="mk-url">${location.host || 'proof-lockin.netlify.app'}</span>`;

const GUIDES = {
  safari: [
    { t: 'Tap the Share button', s: 'At the bottom of the screen. On newer iPhones, tap ··· first, then Share.',
      mock: `<div class="mk mk-bottom">${url}<div class="mk-row">${ic('back', 18)}${ic('chevron', 18)}${hl(ic('share', 20), 'Share')}${ic('book', 18)}${ic('tabs', 18)}</div></div>` },
    { t: 'Tap “Add to Home Screen”', s: 'Scroll down the list if you don’t see it.',
      mock: `<div class="mk mk-sheet"><div class="mk-item">Copy ${ic('copy', 16)}</div><div class="mk-item">Add to Reading List ${ic('book', 16)}</div>${hl(`<div class="mk-item">Add to Home Screen ${ic('addhome', 16)}</div>`)}</div>` },
    { t: 'Tap “Add”', s: 'Top right. Proof now sits on your home screen.',
      mock: `<div class="mk mk-add"><div class="mk-row mk-head"><span>Cancel</span><b>Add to Home Screen</b>${hl('<b class="mk-blue">Add</b>')}</div><div class="mk-row mk-appline">${appIcon}<span>Proof</span></div></div>` },
  ],
  chromeIOS: [
    { t: 'Tap the Share button', s: 'At the right end of the address bar, at the top.',
      mock: `<div class="mk mk-top"><div class="mk-row">${url}${hl(ic('share', 18), 'Share')}</div></div>` },
    { t: 'Tap “Add to Home Screen”', s: 'Scroll down the list if you don’t see it.',
      mock: `<div class="mk mk-sheet"><div class="mk-item">Copy ${ic('copy', 16)}</div><div class="mk-item">Find in Page</div>${hl(`<div class="mk-item">Add to Home Screen ${ic('addhome', 16)}</div>`)}</div>` },
    { t: 'Tap “Add”', s: 'Top right. Proof now sits on your home screen.',
      mock: `<div class="mk mk-add"><div class="mk-row mk-head"><span>Cancel</span><b>Add to Home Screen</b>${hl('<b class="mk-blue">Add</b>')}</div><div class="mk-row mk-appline">${appIcon}<span>Proof</span></div></div>` },
  ],
  chromeAndroid: [
    { t: 'Tap the ⋮ menu', s: 'Top right, next to the address bar.',
      mock: `<div class="mk mk-top"><div class="mk-row">${url}${ic('tabs', 16)}${hl(ic('dotsv', 18), 'Menu')}</div></div>` },
    { t: 'Tap “Add to Home screen”', s: 'Some phones call it “Install app”.',
      mock: `<div class="mk mk-sheet"><div class="mk-item">New tab</div><div class="mk-item">History</div>${hl(`<div class="mk-item">Add to Home screen ${ic('addhome', 16)}</div>`)}</div>` },
    { t: 'Tap “Install”', s: 'Proof now sits on your home screen and in your apps.',
      mock: `<div class="mk mk-dialog"><b>Install app?</b><div class="mk-row mk-appline">${appIcon}<span>Proof</span></div><div class="mk-row mk-actions"><span>Cancel</span>${hl('<b class="mk-blue">Install</b>')}</div></div>` },
  ],
};

export function installBody() {
  if (isAndroid && deferred) {
    return `<div class="inst">
      <div class="inst-one"><img class="inst-icon" src="icons/icon-180.png" alt="Proof icon"><p>Your phone can install Proof in one tap.</p></div>
      <div class="ob-foot"><button class="btn btn-primary" data-install>${ic('addhome', 20)}<span>Install Proof</span></button>
      <button class="btn btn-quiet" data-later>Later</button></div></div>`;
  }
  const guess = isSafari ? 'safari' : 'chrome';
  return `<div class="inst">
    <p class="inst-q">Which browser are you using right now?</p>
    <div class="inst-pick" role="radiogroup" aria-label="Browser">
      ${[['safari', 'Safari', 'compass'], ['chrome', 'Chrome', 'globe']].map(([v, l, icon]) => `
        <button class="inst-opt ${v === guess ? 'on' : ''}" data-b="${v}" role="radio" aria-checked="${v === guess}">
          ${ic(icon, 26)}<b>${l}</b>${v === guess && (isSafari || isChromeIOS || isAndroid) ? '<small>You’re on this</small>' : ''}</button>`).join('')}
    </div>
    <ol class="inst-steps" data-steps></ol>
    <div class="ob-foot"><button class="btn btn-primary" data-done>It’s on my home screen</button>
    <button class="btn btn-quiet" data-later>I’ll do it later</button></div></div>`;
}

export function bindInstall(root, next) {
  root.querySelector('[data-later]')?.addEventListener('click', next);
  root.querySelector('[data-done]')?.addEventListener('click', next);
  root.querySelector('[data-install]')?.addEventListener('click', async () => {
    deferred.prompt();
    await deferred.userChoice.catch(() => null);
    deferred = null;
    next();
  });
  const list = root.querySelector('[data-steps]');
  if (!list) return;
  const show = (b) => {
    const key = b === 'safari' ? 'safari' : (isIOS ? 'chromeIOS' : 'chromeAndroid');
    list.innerHTML = GUIDES[key].map((g, n) => `
      <li class="inst-step"><span class="inst-n">${n + 1}</span>
        <div class="inst-txt"><b>${g.t}</b><small>${g.s}</small></div>${g.mock}</li>`).join('');
  };
  root.querySelectorAll('[data-b]').forEach((btn) => btn.addEventListener('click', () => {
    haptic();
    root.querySelectorAll('[data-b]').forEach((x) => { x.classList.toggle('on', x === btn); x.setAttribute('aria-checked', x === btn); });
    show(btn.dataset.b);
  }));
  show(root.querySelector('[data-b].on').dataset.b);
}
