// Pull to set your age. Drag down to get older, up to get younger; the number
// follows your finger, ticks as it changes, and springs back when you let go.
// Arrow keys, the mouse wheel and the +/- buttons work too.
import { haptic } from './util.js';

export const AGE_MIN = 10, AGE_MAX = 60;
const PX = 12; // pixels of pull per year

export function mountAgePull(el, { value = 15, onChange } = {}) {
  let age = value, touched = false;
  el.innerHTML = `
    <div class="ap" role="slider" tabindex="0" aria-label="Your age" aria-valuemin="${AGE_MIN}" aria-valuemax="${AGE_MAX}" aria-valuenow="${age}" aria-valuetext="${age} years old">
      <button type="button" class="ap-step" data-d="-1" aria-label="One year younger" tabindex="-1">−</button>
      <div class="ap-pull">
        <div class="ap-ring"><div class="ap-num"><b class="dim">${age}</b><small>years old</small></div></div>
        <div class="ap-grip" aria-hidden="true"><i></i></div>
      </div>
      <button type="button" class="ap-step" data-d="1" aria-label="One year older" tabindex="-1">+</button>
    </div>
    <p class="ap-hint">Pull down to set your age</p>
    <p class="ap-verdict" aria-live="polite" hidden></p>`;
  const root = el.querySelector('.ap'), pull = el.querySelector('.ap-pull'), num = el.querySelector('.ap-num b');
  const hint = el.querySelector('.ap-hint'), verdict = el.querySelector('.ap-verdict');

  const paint = () => {
    num.textContent = age;
    num.classList.toggle('dim', !touched);
    root.setAttribute('aria-valuenow', age); root.setAttribute('aria-valuetext', `${age} years old`);
    el.style.setProperty('--p', `${((age - AGE_MIN) / (AGE_MAX - AGE_MIN)) * 360}deg`);
    el.classList.toggle('touched', touched);
    el.classList.toggle('adult', touched && age >= 18);
    el.classList.toggle('minor', touched && age < 18 && age >= 13);
    el.classList.toggle('young', touched && age < 13);
    hint.hidden = touched;
    verdict.hidden = !touched;
    verdict.textContent = age < 13 ? 'Proof is for ages 13 and up.' : age < 18 ? 'Under 18: a parent or guardian needs to agree.' : '';
    verdict.hidden = !verdict.textContent;
  };
  const set = (n, buzz = true) => {
    n = Math.max(AGE_MIN, Math.min(AGE_MAX, n));
    if (n === age && touched) return;
    if (n !== age && buzz) { try { navigator.vibrate?.(5); } catch { /* ignore */ } }
    age = n; touched = true; paint();
    num.classList.remove('pop'); void num.offsetWidth; num.classList.add('pop');
    onChange?.({ age, touched });
  };

  let y0 = null, a0 = age;
  pull.addEventListener('pointerdown', (e) => { y0 = e.clientY; a0 = age; pull.setPointerCapture(e.pointerId); el.classList.add('pulling'); haptic(8); });
  pull.addEventListener('pointermove', (e) => {
    if (y0 === null) return;
    const dy = e.clientY - y0;
    set(a0 + Math.round(dy / PX));
    pull.style.setProperty('--dy', `${Math.max(-36, Math.min(80, dy * 0.45))}px`);
  });
  const end = () => { if (y0 === null) return; y0 = null; el.classList.remove('pulling'); pull.style.setProperty('--dy', '0px'); };
  pull.addEventListener('pointerup', end); pull.addEventListener('pointercancel', end);
  pull.addEventListener('wheel', (e) => { e.preventDefault(); set(age + (e.deltaY > 0 ? 1 : -1)); }, { passive: false });
  el.querySelectorAll('.ap-step').forEach((b) => b.addEventListener('click', () => { haptic(8); set((touched ? age : value) + +b.dataset.d); }));
  root.addEventListener('keydown', (e) => {
    const k = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1, PageDown: 5, PageUp: -5 }[e.key];
    if (k) { e.preventDefault(); set((touched ? age : value) + k); }
  });
  paint();
  return { get: () => ({ age, touched }), set: (n) => set(n, false) };
}
