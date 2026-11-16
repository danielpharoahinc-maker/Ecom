// Menus grow out of the thing you tapped, so your eyes follow where they came from.
// Remembers the last tap, then sheets scale up from that point and the camera opens
// as a circle spreading from it. Skipped for people who ask for less motion.
let last = null;
document.addEventListener('pointerdown', (e) => {
  const el = e.target.closest?.('button, a, [role=button], .cm, .avatar, .tab, [data-open]');
  if (el) last = { x: e.clientX, y: e.clientY, rect: el.getBoundingClientRect(), t: Date.now() };
}, true);

export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const EASE = 'cubic-bezier(.32,.72,0,1)';

// The last tap if it just happened, else null (keyboard, programmatic opens).
export function tapOrigin() {
  if (!last || Date.now() - last.t > 900 || reduced()) return null;
  const r = last.rect;
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

// A sheet grows from the origin point to its place.
export function growSheet(sheet, o) {
  const r = sheet.getBoundingClientRect();
  sheet.style.transformOrigin = `${o.x - r.left}px ${o.y - r.top}px`;
  return sheet.animate([
    { transform: 'translate(-50%, 0) scale(.06)', opacity: 0, borderRadius: '44px' },
    { opacity: 1, offset: .3 },
    { transform: 'translate(-50%, 0) scale(1)', opacity: 1 },
  ], { duration: 520, easing: EASE });
}
export function shrinkSheet(sheet, o) {
  const r = sheet.getBoundingClientRect();
  sheet.style.transformOrigin = `${o.x - r.left}px ${o.y - r.top}px`;
  return sheet.animate([
    { transform: 'translate(-50%, 0) scale(1)', opacity: 1 },
    { opacity: 0, offset: .8 },
    { transform: 'translate(-50%, 0) scale(.06)', opacity: 0 },
  ], { duration: 320, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' });
}

// A full screen opens as a circle spreading from the origin.
export function circleReveal(el, o) {
  const R = Math.hypot(Math.max(o.x, innerWidth - o.x), Math.max(o.y, innerHeight - o.y)) + 8;
  return el.animate([
    { clipPath: `circle(0px at ${o.x}px ${o.y}px)` },
    { clipPath: `circle(${R}px at ${o.x}px ${o.y}px)` },
  ], { duration: 560, easing: EASE });
}
