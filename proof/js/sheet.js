// Bottom sheet: slides up over the app, tap outside or swipe the grabber to close.
import { haptic } from './util.js';

export function openSheet(html, { onMount, tall = false } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap';
  wrap.innerHTML = `<div class="sheet-bg" data-close></div>
    <div class="sheet glass ${tall ? 'tall' : ''}" role="dialog" aria-modal="true">
      <div class="grabber" data-close aria-hidden="true"></div>
      <div class="sheet-body">${html}</div>
    </div>`;
  document.body.appendChild(wrap);
  document.body.classList.add('noscroll');
  requestAnimationFrame(() => wrap.classList.add('open'));
  haptic();

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    wrap.classList.remove('open');
    wrap.dispatchEvent(new Event('sheet:close'));
    setTimeout(() => {
      wrap.remove();
      if (!document.querySelector('.sheet-wrap, .cap')) document.body.classList.remove('noscroll');
    }, 280);
  };
  wrap.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
  const onKey = (e) => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); } };
  document.addEventListener('keydown', onKey);

  const body = wrap.querySelector('.sheet-body');
  onMount?.(body, close);
  return close;
}

// In-page "Are you sure?" (browser confirm() boxes are blocked in some views).
export function confirmSheet(title, detail, action = 'Delete') {
  return new Promise((resolve) => {
    let answered = false;
    openSheet(`
      <h2 class="h2">${title}</h2>
      <p class="sub">${detail}</p>
      <div class="stack">
        <button class="btn btn-danger" data-yes>${action}</button>
        <button class="btn btn-quiet" data-close>Cancel</button>
      </div>`, {
      onMount(body, close) {
        body.closest('.sheet-wrap').addEventListener('sheet:close', () => { if (!answered) resolve(false); });
        body.querySelector('[data-yes]').addEventListener('click', () => { answered = true; resolve(true); close(); });
      },
    });
  });
}
