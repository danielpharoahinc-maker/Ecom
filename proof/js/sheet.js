// Bottom sheet: slides up over the app, tap outside or swipe the grabber to close.
import { haptic } from './util.js';

const stack = [];
let skipPop = 0;
// The phone's Back button closes the top sheet instead of leaving the app.
window.addEventListener('popstate', () => {
  if (skipPop) { skipPop--; return; }
  const top = stack[stack.length - 1];
  if (top) top.close(true);
});

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
  const entry = { close: null };
  stack.push(entry);
  try { history.pushState({ sheet: true }, ''); } catch { /* ignore */ }
  const close = (fromBack = false) => {
    if (closed) return;
    closed = true;
    stack.splice(stack.indexOf(entry), 1);
    if (fromBack !== true) { try { skipPop++; history.back(); } catch { skipPop--; } }
    wrap.classList.remove('open');
    wrap.dispatchEvent(new Event('sheet:close'));
    setTimeout(() => {
      wrap.remove();
      if (!document.querySelector('.sheet-wrap, .cap')) document.body.classList.remove('noscroll');
    }, 280);
  };
  entry.close = close;
  wrap.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });

  // Drag the sheet down to dismiss it. Follows your finger; flicks close it too.
  const sheet = wrap.querySelector('.sheet');
  let y0 = null, dy = 0, t0 = 0;
  sheet.addEventListener('pointerdown', (e) => {
    if (e.target.closest('input, textarea, button, a, select') && !e.target.closest('.grabber')) return;
    if (sheet.scrollTop > 0 && !e.target.closest('.grabber')) return;
    y0 = e.clientY; dy = 0; t0 = Date.now();
  });
  sheet.addEventListener('pointermove', (e) => {
    if (y0 === null) return;
    dy = Math.max(0, e.clientY - y0);
    if (dy > 6) { sheet.style.transition = 'none'; sheet.style.transform = `translate(-50%, ${dy}px)`; }
  });
  const end = () => {
    if (y0 === null) return;
    const fast = dy / Math.max(1, Date.now() - t0) > 0.6;
    sheet.style.transition = ''; sheet.style.transform = '';
    y0 = null;
    if (dy > 110 || (fast && dy > 30)) close();
  };
  sheet.addEventListener('pointerup', end);
  sheet.addEventListener('pointercancel', end);
  const onKey = (e) => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); } };
  wrap.addEventListener('sheet:close', () => document.removeEventListener('keydown', onKey), { once: true });
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
