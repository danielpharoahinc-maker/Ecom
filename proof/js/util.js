// Small helpers used everywhere.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// Always escape anything a person typed before putting it into HTML.
export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// "2026-11-11" in the person's own timezone. Days are the unit of a streak.
export function dayKey(t = Date.now()) {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Noon on the day `n` days ago (noon avoids daylight-saving edge cases).
export function daysAgo(n) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d.getTime();
}

export function timeAgo(ts) {
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  const d = Math.floor(s / 86400);
  return d === 1 ? 'Yesterday' : `${d} days ago`;
}

export const fmtClock = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
export const fmtDay = (ts) => new Date(ts).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
export const fmtShortDay = (ts) => new Date(ts).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
export const fmtDur = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

export function fmtMins(m) {
  if (!m) return '0 min';
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

// Haptics. Android phones vibrate with patterns. iPhones ignore the vibrate call in web
// apps, but Safari plays a real tap when a hidden switch input is toggled, so that is
// used instead (iOS 17.4 and newer).
let tapEl;
function iosTap() {
  try {
    if (!tapEl) {
      tapEl = document.createElement('label');
      tapEl.setAttribute('aria-hidden', 'true');
      tapEl.style.cssText = 'position:fixed;left:-99px;top:-99px;width:1px;height:1px;opacity:0;pointer-events:none';
      tapEl.innerHTML = '<input type="checkbox" switch tabindex="-1">';
      document.body.appendChild(tapEl);
    }
    tapEl.click();
  } catch { /* no haptics here */ }
}
const canVibrate = () => typeof navigator.vibrate === 'function';
export const haptic = (ms = 8) => { try { if (canVibrate()) navigator.vibrate(ms); else if (ms >= 10) iosTap(); } catch { /* not supported */ } };

// Meaningful feelings: good news, great news, a warning, bad news.
const FEEL = {
  tick: { vib: 6, taps: [0] },
  good: { vib: [14, 50, 22], taps: [0, 85] },
  great: { vib: [18, 40, 18, 40, 60], taps: [0, 80, 170] },
  warn: { vib: [30, 60, 30], taps: [0, 110] },
  bad: { vib: [70, 40, 70, 40, 160], taps: [0, 60, 120, 260] },
};
export function feel(kind = 'tick') {
  const f = FEEL[kind] || FEEL.tick;
  try {
    if (canVibrate()) navigator.vibrate(f.vib);
    else f.taps.forEach((t) => setTimeout(iosTap, t));
  } catch { /* not supported */ }
}

let toastTimer;
export function toast(msg, { action, label = 'Undo', ms } = {}) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast glass';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = msg;
  if (/couldn’t|can’t|isn’t available|failed|blocked|signed out|too many|wrong|try again|not allowed/i.test(msg)) feel('bad');
  if (action) {
    const b = document.createElement('button');
    b.className = 'toast-act'; b.textContent = label;
    b.addEventListener('click', () => { el.classList.remove('show'); clearTimeout(toastTimer); action(); });
    el.append(b);
  }
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms || (action ? 5000 : 2200));
}

// Fires an app-wide event; views listen for it and redraw.
export const emit = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }));
