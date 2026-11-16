// Age: an iOS-style scroll wheel. Spin it, it ticks with every year, and the
// numbers curve away from the middle. Arrow keys work too.
import { haptic } from './util.js';

export const AGE_MIN = 10, AGE_MAX = 60;
const ROW = 46;

export function mountAgePull(el, { value = 15, onChange } = {}) {
  const ages = Array.from({ length: AGE_MAX - AGE_MIN + 1 }, (_, i) => AGE_MIN + i);
  let age = value, touched = false, ready = false, idx = ages.indexOf(value);
  el.innerHTML = `
    <div class="wheel-wrap">
      <div class="wheel" role="slider" tabindex="0" aria-label="Your age" aria-valuemin="${AGE_MIN}" aria-valuemax="${AGE_MAX}" aria-valuenow="${age}">
        <ul>${ages.map((a) => `<li data-a="${a}">${a}</li>`).join('')}</ul>
      </div>
      <div class="wheel-band" aria-hidden="true"><span>years old</span></div>
    </div>
    <p class="ap-hint">Scroll to set your age</p>
    <p class="ap-verdict" aria-live="polite" hidden></p>`;
  const wheel = el.querySelector('.wheel'), items = [...wheel.querySelectorAll('li')];
  const hint = el.querySelector('.ap-hint'), verdict = el.querySelector('.ap-verdict');

  const curve = () => {
    const f = wheel.scrollTop / ROW;
    for (let i = Math.max(0, Math.round(f) - 4); i <= Math.min(items.length - 1, Math.round(f) + 4); i++) {
      const d = i - f, ad = Math.abs(d);
      items[i].style.transform = `translateZ(0) rotateX(${Math.max(-70, Math.min(70, -d * 22))}deg) scale(${Math.max(.7, 1 - ad * .1)})`;
      items[i].style.opacity = String(Math.max(.15, 1 - ad * .3));
      items[i].classList.toggle('on', ad < .5);
    }
  };
  const paint = () => {
    el.classList.toggle('touched', touched);
    el.classList.toggle('adult', touched && age >= 18);
    el.classList.toggle('minor', touched && age < 18 && age >= 13);
    el.classList.toggle('young', touched && age < 13);
    wheel.setAttribute('aria-valuenow', age);
    hint.hidden = touched;
    verdict.textContent = !touched ? '' : age < 13 ? 'Proof is for ages 13 and up.' : age < 18 ? 'Under 18: a parent or guardian needs to agree.' : '';
    verdict.hidden = !verdict.textContent;
  };
  const pick = (i, fromUser) => {
    i = Math.max(0, Math.min(ages.length - 1, i));
    if (i === idx && (touched || !fromUser)) return;
    if (i !== idx) haptic(10);
    idx = i; age = ages[i];
    if (fromUser) touched = true;
    paint();
    if (fromUser) onChange?.({ age, touched });
  };
  let raf = 0, settle = 0;
  wheel.addEventListener('scroll', () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => { curve(); if (ready) pick(Math.round(wheel.scrollTop / ROW), true); });
    clearTimeout(settle);
    settle = setTimeout(() => { if (ready) wheel.scrollTo({ top: idx * ROW, behavior: 'smooth' }); }, 120); // for browsers without snap
  }, { passive: true });
  wheel.addEventListener('keydown', (e) => {
    const k = { ArrowDown: 1, ArrowUp: -1, PageDown: 5, PageUp: -5 }[e.key];
    if (k) { e.preventDefault(); wheel.scrollTo({ top: (idx + k) * ROW, behavior: 'smooth' }); }
  });
  const set = (n) => { const i = ages.indexOf(n); if (i < 0) return; wheel.scrollTop = i * ROW; idx = i; age = n; touched = true; curve(); paint(); };
  requestAnimationFrame(() => { wheel.scrollTop = idx * ROW; curve(); paint(); setTimeout(() => { ready = true; }, 60); });
  return { get: () => ({ age, touched }), set };
}
