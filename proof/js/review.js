// The Sunday Review: your week scored out of 10, your best photos, and the one
// goal that needs the most love. Rules and your own numbers only; no AI.
// It opens by itself on Sunday evening (and Monday if you missed it), once a
// week, and is always available from the Vault.
import { S, saveProfile, hydrateMedia } from './state.js';
import { weekReport } from './coach.js';
import { commitment } from './data.js';
import { openSheet } from './sheet.js';
import { openProof } from './proofview.js';
import { proffSVG } from './proff.js';
import { openGoals } from './goals.js';
import { ic } from './icons.js';
import { dayKey, daysAgo, esc, fmtClock, fmtShortDay, toast } from './util.js';

// How many days ago did the most recent Sunday end? (0 = today is Sunday)
export const sundayOffset = (now = new Date()) => now.getDay();
export const weekKeyFor = (offset) => dayKey(daysAgo(offset));

// Open on its own: Sunday from 5 pm, or any time Monday, once per week.
export function reviewDue(now = new Date()) {
  const P = S.profile;
  if (!P?.onboarded || !S.proofs.length) return null;
  const dow = now.getDay();
  if (!(dow === 0 && now.getHours() >= 17) && dow !== 1) return null;
  const offset = dow === 0 ? 0 : 1;
  const key = weekKeyFor(offset);
  if (P.lastReview === key) return null;
  // Needs a few days of history to say anything useful.
  if (Math.floor((now.getTime() - (P.createdAt || now.getTime())) / 864e5) < 3) return null;
  return offset;
}

// The best three photos of the week: ones you described, across different goals.
export function bestPhotos(proofs, startTs, endTs, n = 3) {
  const inWeek = proofs.filter((p) => p.photoId && p.ts >= startTs && p.ts <= endTs);
  const score = (p) => (p.cKey !== 'moment' ? 2 : 0) + (p.note ? 1 : 0) + (p.audioId ? 1 : 0);
  const sorted = inWeek.slice().sort((a, b) => score(b) - score(a) || b.ts - a.ts);
  const picked = [];
  for (const p of sorted) if (picked.length < n && !picked.some((x) => x.cKey === p.cKey)) picked.push(p);
  for (const p of sorted) if (picked.length < n && !picked.includes(p)) picked.push(p);
  return picked.sort((a, b) => a.ts - b.ts);
}

const advice = (w) => {
  const c = w.c.label.toLowerCase();
  if (w.n === 0) return `${w.c.label} didn’t happen this week. Pick one fixed time for it and put it in tomorrow’s plan.`;
  return `${w.c.label} happened ${w.n} of ${w.of} days. Attach it to something you already do every day, like “after breakfast, ${c}”.`;
};

export function openReview(offset = sundayOffset()) {
  const P = S.profile;
  const r = weekReport(S.proofs, P, offset, 7);
  const start = new Date(daysAgo(offset + 6)).setHours(0, 0, 0, 0);
  const end = new Date(daysAgo(offset)).setHours(23, 59, 59, 999);
  const photos = bestPhotos(S.proofs, start, end);
  const key = weekKeyFor(offset);
  const C = 2 * Math.PI * 34;
  const noWeak = r.weak.n / r.weak.of >= 0.7;
  const delta = r.prevScore === null ? '' : r.score > r.prevScore ? `Up from ${r.prevScore}/10 last week.` : r.score < r.prevScore ? `Down from ${r.prevScore}/10 last week.` : `Same as last week.`;

  openSheet(`
    <div class="rv">
      <div class="ask-head">${proffSVG(r.score >= 7 ? 'cheer' : 'talk', 64)}<div><b class="h2">Sunday Review</b><p>${fmtShortDay(start)} to ${fmtShortDay(end)}</p></div></div>
      <div class="coach-top rv-score">
        <div class="coach-ring" role="img" aria-label="${r.score} out of 10">
          <svg viewBox="0 0 80 80"><circle class="track" cx="40" cy="40" r="34"/><circle class="fill" cx="40" cy="40" r="34" style="stroke-dasharray:${C};stroke-dashoffset:${C * (1 - r.score / 10)}"/></svg>
          <b>${r.score}<small>/10</small></b>
        </div>
        <div class="coach-head"><h2 class="h2">${r.rating}</h2><p class="dim">${r.kept} of 7 days kept your streak. ${delta}</p></div>
      </div>
      ${photos.length ? `<div><h3 class="headline">Your best moments</h3>
        <div class="prints rv-prints">${photos.map((p) => `
          <button class="print" data-open="${p.id}" style="--tilt:0deg" aria-label="${commitment(p.cKey).label} at ${fmtClock(p.ts)}">
            <span class="print-img"><img data-media="${p.photoId}" alt="Proof photo"></span>
            <span class="print-cap">${ic(commitment(p.cKey).icon, 13)}<time>${esc(fmtShortDay(p.ts))}</time></span>
          </button>`).join('')}</div></div>` : ''}
      <div class="rv-goals">
        <h3 class="headline">Goal by goal</h3>
        ${r.ranked.map((g) => `<div class="hbar"><span class="hbar-l">${ic(g.c.icon, 18)}<b>${g.c.label}</b></span><span class="hbar-v">${g.n} of ${g.of} days</span><span class="track"><i style="width:${Math.round((g.n / g.of) * 100)}%"></i></span></div>`).join('')}
      </div>
      <div class="rv-focus">
        <h3 class="headline">${noWeak ? 'No weak spot this week' : 'Where the points are'}</h3>
        <p>${noWeak ? 'Every goal is above 70%. Keep the rhythm, or add a stretch goal.' : esc(advice(r.weak))}</p>
        ${noWeak
    ? '<button class="btn btn-secondary" data-more>Add a goal</button>'
    : `<button class="btn btn-primary" data-focus>Make ${esc(r.weak.c.label)} next week’s focus</button>`}
      </div>
      <button class="btn btn-quiet" data-close>Close</button>
    </div>`, {
    tall: true,
    async onMount(body, close) {
      hydrateMedia(body);
      body.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => { close(); setTimeout(() => openProof(b.dataset.open), 320); }));
      body.querySelector('[data-focus]')?.addEventListener('click', async () => {
        await saveProfile({ ...S.profile, focus: { key: r.weak.k, week: key } });
        close(); toast(`Focus set: ${r.weak.c.label}`);
        window.dispatchEvent(new CustomEvent('proof:changed'));
      });
      body.querySelector('[data-more]')?.addEventListener('click', () => { close(); setTimeout(openGoals, 320); });
    },
  });
  // Seen it once, even if you only glance: don't pop up again this week.
  if (P.lastReview !== key) saveProfile({ ...S.profile, lastReview: key });
}

// The focus you set last Sunday, for Today.
export function focusLine() {
  const f = S.profile?.focus;
  if (!f || !S.profile.commitments.includes(f.key)) return '';
  const ageDaysSince = (Date.now() - new Date(`${f.week}T12:00`).getTime()) / 864e5;
  if (ageDaysSince > 9) return '';
  return `<p class="focus-line">${ic('target', 14)}<span>Focus this week: <b>${esc(commitment(f.key).label)}</b></span></p>`;
}
