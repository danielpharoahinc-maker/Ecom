// Small touches that make Proof feel alive: a soft "stamp" sound, a tick, and
// haptics. Sound is OFF by default (gyms, classrooms) and switchable in Account.
// No audio files: sounds are made on the spot with the Web Audio API.
import { S } from './state.js';

let ctx;
const on = () => Boolean(S.profile?.sounds) && !matchMedia('(prefers-reduced-motion: reduce)').matches;
function tone(freq, t0, dur, gain, type = 'sine', slideTo) {
  const a = ctx.createOscillator(), g = ctx.createGain();
  a.type = type; a.frequency.setValueAtTime(freq, t0);
  if (slideTo) a.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  a.connect(g).connect(ctx.destination); a.start(t0); a.stop(t0 + dur + 0.02);
}
export function sfx(kind) {
  if (!on()) return;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;
    if (kind === 'stamp') { tone(150, t, 0.16, 0.5, 'sine', 60); tone(880, t + 0.05, 0.22, 0.12, 'triangle'); tone(1320, t + 0.12, 0.28, 0.08, 'triangle'); }
    else if (kind === 'tick') tone(1000, t, 0.06, 0.08, 'triangle');
  } catch { /* no audio: fine */ }
}
export const buzz = (p) => { try { navigator.vibrate?.(p); } catch { /* ignore */ } };
// Count a number up, so a streak feels earned.
export function countUp(el, to, ms = 650) {
  if (!el || to < 1 || matchMedia('(prefers-reduced-motion: reduce)').matches) { if (el) el.textContent = to; return; }
  const t0 = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - t0) / ms);
    el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
    if (k < 1 && el.isConnected) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
