// Achievements and the wardrobe: your progress, and the 100 Proff skins you earn with it.
import { S, saveProfile } from './state.js';
import { ACHIEVEMENTS, evaluate, checkUnlocks } from './achievements.js';
import { SKINS, skinById } from './skins.js';
import { proffSVG } from './proff.js';
import { openSheet } from './sheet.js';
import { ic } from './icons.js';
import { esc, emit, feel, toast, haptic } from './util.js';
import { sfx } from './fx.js';

// Proffs are drawn only when they scroll into view: 100 drawings at once would be slow.
function lazyProffs(root, scroller) {
  const draw = (el) => { if (!el.dataset.done) { el.innerHTML = proffSVG(el.dataset.pose || 'rest', +el.dataset.size || 56, +el.dataset.skin); el.dataset.done = '1'; } };
  if (!('IntersectionObserver' in window)) { root.querySelectorAll('[data-skin]').forEach(draw); return; }
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { draw(e.target); io.unobserve(e.target); } }), { root: scroller, rootMargin: '200px' });
  root.querySelectorAll('[data-skin]').forEach((el) => io.observe(el));
}

export async function equip(id) {
  await saveProfile({ ...S.profile, skin: id });
  emit('proof:changed'); haptic(12); sfx('stamp'); feel('good');
}

export function openAchievements(tab = 'ach') {
  openSheet(`<div class="aw"></div>`, {
    tall: true,
    onMount(body) {
      const box = body.querySelector('.aw'), scroller = body.closest('.sheet');
      let sel = S.profile.skin || 0;
      const paint = () => {
        const list = evaluate(), done = list.filter((a) => a.done).length;
        const have = new Set(list.filter((a) => a.done).map((a) => a.skin));
        const bySkin = Object.fromEntries(list.map((a) => [a.skin, a]));
        box.innerHTML = `
          <div class="aw-top">
            <div class="aw-ring" style="--p:${(done / 100) * 360}deg"><b>${done}</b><small>/100</small></div>
            <div><b class="h2">${tab === 'ach' ? 'Achievements' : 'Wardrobe'}</b><p class="dim">${done} unlocked · ${100 - done} to go</p></div>
          </div>
          <div class="seg" role="tablist"><button role="tab" class="${tab === 'ach' ? 'on' : ''}" data-tab="ach">Achievements</button><button role="tab" class="${tab === 'ward' ? 'on' : ''}" data-tab="ward">Wardrobe</button></div>
          ${tab === 'ach' ? achievements(list) : wardrobe(have, bySkin)}`;
        box.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { haptic(8); tab = b.dataset.tab; paint(); scroller.scrollTo({ top: 0 }); }));
        lazyProffs(box, scroller);
        box.querySelectorAll('.sk').forEach((b) => b.addEventListener('click', () => { haptic(8); sel = +b.dataset.id; paint(); }));
        box.querySelector('[data-wear]')?.addEventListener('click', async () => { await equip(sel); paint(); toast(`${skinById(sel).name} is on`); });
      };
      const achievements = (list) => {
        const cats = [...new Set(ACHIEVEMENTS.map((a) => a.cat))];
        return cats.map((c) => {
          const items = list.filter((a) => a.cat === c).sort((a, b) => a.target - b.target);
          return `<h3 class="cat-h">${esc(c)}</h3><ul class="ach-list">${items.map((a) => `
            <li class="ach ${a.done ? 'done' : ''}">
              <span class="ach-ring" style="--p:${a.pct * 360}deg">${a.done ? ic('check', 16, 3) : `<i>${Math.round(a.pct * 100)}%</i>`}</span>
              <span class="ach-txt"><b>${esc(a.title)}</b><small>${esc(a.desc)}${a.done ? '' : ` · ${Math.min(a.value, a.target)}/${a.target}`}</small></span>
              <span class="ach-rew ${a.done ? '' : 'locked'}" data-skin="${a.skin}" data-size="44" title="${esc(skinById(a.skin).name)}"></span>
            </li>`).join('')}</ul>`;
        }).join('');
      };
      const wardrobe = (have, bySkin) => {
        const k = skinById(sel), a = bySkin[sel], ok = have.has(sel), worn = (S.profile.skin || 0) === sel;
        return `<div class="sk-prev ${ok ? '' : 'locked'}">
            <span class="sk-big" data-skin="${sel}" data-size="132" data-pose="${ok ? 'cheer' : 'rest'}"></span>
            <b class="h2">${esc(k.name)}</b>
            ${ok ? `<button class="btn ${worn ? 'btn-secondary' : 'btn-primary'}" data-wear ${worn ? 'disabled' : ''}>${worn ? 'Wearing it' : 'Wear this skin'}</button>`
              : `<p class="sk-how">${ic('lock', 16)} <span>${esc(a?.title || '')}: ${esc(a?.desc || '')}${a ? ` (${Math.min(a.value, a.target)}/${a.target})` : ''}</span></p>`}
          </div>
          <div class="sk-grid">${SKINS.map((s) => `<button class="sk ${have.has(s.id) ? '' : 'locked'} ${s.id === sel ? 'sel' : ''} ${(S.profile.skin || 0) === s.id ? 'worn' : ''}" data-id="${s.id}" aria-label="${esc(s.name)}${have.has(s.id) ? '' : ', locked'}">
            <span class="sk-fig" data-skin="${s.id}" data-size="52"></span>${have.has(s.id) ? '' : `<i class="sk-lock">${ic('lock', 12)}</i>`}</button>`).join('')}</div>`;
      };
      paint();
    },
  });
}

// "Skin unlocked!"
export function celebrate(fresh) {
  const skins = fresh.map((a) => a.skin), top = Math.max(...skins), k = skinById(top);
  sfx('stamp'); feel('great');
  openSheet(`
    <div class="unlock">
      <span class="unlock-fig" data-skin="${top}" data-size="150" data-pose="cheer"></span>
      <p class="unlock-k">${fresh.length === 1 ? 'Skin unlocked' : `${fresh.length} skins unlocked`}</p>
      <b class="h2">${esc(k.name)}</b>
      <ul class="unlock-list">${fresh.slice(0, 3).map((a) => `<li>${ic('check', 14, 3)}<span><b>${esc(a.title)}</b> ${esc(a.desc)}</span></li>`).join('')}${fresh.length > 3 ? `<li class="more">and ${fresh.length - 3} more</li>` : ''}</ul>
      <div class="stack">
        <button class="btn btn-primary" data-wear>Wear it</button>
        <button class="btn btn-secondary" data-all>See all skins</button>
        <button class="btn btn-quiet" data-close>Later</button>
      </div>
    </div>`, {
    onMount(body, close) {
      lazyProffs(body, body.closest('.sheet'));
      body.querySelector('[data-wear]').addEventListener('click', async () => { await equip(top); close(); });
      body.querySelector('[data-all]').addEventListener('click', () => { close(); setTimeout(() => openAchievements('ward'), 340); });
    },
  });
}

// Check for new unlocks; wait politely while the camera is open.
let busy = false;
export async function runUnlocks() {
  if (busy) return; busy = true;
  try {
    if (document.querySelector('.cap, .sheet-wrap')) { setTimeout(() => { busy = false; runUnlocks(); }, 2500); return; }
    const fresh = await checkUnlocks();
    if (fresh.length) celebrate(fresh);
  } finally { busy = busy && false; }
}
