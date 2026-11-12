// Your goals: pick 1 to 6 and change them whenever life changes.
// Past days keep the goals you had then, so editing never rewrites your history.
import { S, setGoals } from './state.js';
import { CATALOG, MAX_GOALS, MIN_GOALS, needFor } from './data.js';
import { pushProfile } from './billing.js';
import { openSheet } from './sheet.js';
import { proffSVG } from './proff.js';
import { ic } from './icons.js';
import { haptic, toast } from './util.js';

export function openGoals() {
  let picked = [...S.profile.commitments];
  openSheet(`
    <div class="ask-head">${proffSVG('talk', 64)}<div><b class="h2">Your goals</b><p class="goal-rule"></p></div></div>
    <div class="ctiles">${CATALOG.map((c) => `
      <button class="ctile" data-k="${c.key}" aria-pressed="false">
        <span class="ctile-n" aria-hidden="true"></span>
        ${ic(c.icon, 26)}<b>${c.label}</b><small>${c.hint}</small>
      </button>`).join('')}</div>
    <p class="fine goal-note" aria-live="polite"></p>
    <div class="stack"><button class="btn btn-primary" data-save>Save goals</button></div>`, {
    tall: true,
    onMount(body, close) {
      const rule = body.querySelector('.goal-rule');
      const note = body.querySelector('.goal-note');
      const save = body.querySelector('[data-save]');
      const original = S.profile.commitments.join();
      const sync = () => {
        const n = picked.length;
        rule.textContent = n ? `${n} ${n === 1 ? 'goal' : 'goals'}. Prove ${needFor(n)} a day to keep your streak.` : 'Pick at least one.';
        note.textContent = picked.some((k) => !S.profile.commitments.includes(k)) || S.profile.commitments.some((k) => !picked.includes(k))
          ? 'Your past days keep the goals you had then.' : '';
        save.disabled = n < MIN_GOALS || n > MAX_GOALS || picked.join() === original;
        body.querySelectorAll('.ctile').forEach((t) => {
          const idx = picked.indexOf(t.dataset.k);
          t.classList.toggle('sel', idx >= 0);
          t.setAttribute('aria-pressed', idx >= 0);
          t.querySelector('.ctile-n').textContent = idx >= 0 ? idx + 1 : '';
        });
      };
      body.querySelectorAll('.ctile').forEach((t) => t.addEventListener('click', () => {
        haptic();
        const k = t.dataset.k;
        if (picked.includes(k)) picked = picked.filter((x) => x !== k);
        else if (picked.length < MAX_GOALS) picked.push(k);
        else toast(`${MAX_GOALS} is the limit. Tap one to swap it out.`);
        sync();
      }));
      save.addEventListener('click', async () => {
        await setGoals(picked);
        pushProfile().catch(() => {});
        close();
        toast('Goals saved');
      });
      sync();
    },
  });
}
