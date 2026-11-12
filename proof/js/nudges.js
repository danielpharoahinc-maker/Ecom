// Gentle prompts at the right moments, one at a time:
//   after your first proof -> Proff asks about reminders, then the home screen
//   Sunday evening         -> the Sunday Review
//   day 2                  -> "bring one brother"
import { S, saveProfile } from './state.js';
import { reviewDue, openReview } from './review.js';
import { askReminders } from './reminders.js';
import { installBody, bindInstall, isInstalled, isIOSDevice } from './install.js';
import { newClub } from './club.js';
import { hasClub } from './clublive.js';
import { proffSVG } from './proff.js';
import { openSheet } from './sheet.js';
import { dayKey } from './util.js';
import { LIVE } from './config.js';

export function afterFirstProof() {
  askReminders({ onDone: offerInstall });
}

function offerInstall() {
  // iPhones already saw the home-screen steps while we asked about reminders.
  if (isInstalled() || isIOSDevice) return;
  openSheet(`
    <div class="ask-head">${proffSVG('talk', 70)}<div><b class="h2">Put me on your home screen</b><p>One tap to open, full screen, like a real app.</p></div></div>
    <div class="rem-install">${installBody()}</div>`, { tall: true, onMount: (body, close) => bindInstall(body, close) });
}

async function inviteDue() {
  const P = S.profile;
  if (!P?.onboarded || !P.tourDone || !P.firstProofDone || P.inviteNudged) return false;
  if (dayKey() <= dayKey(P.createdAt)) return false; // day 2 onward
  const has = LIVE ? await hasClub().catch(() => true) : S.clubs.length > 0;
  return !has;
}

function inviteNudge() {
  saveProfile({ ...S.profile, inviteNudged: true });
  openSheet(`
    <div class="ask-head">${proffSVG('cheer', 70)}<div><b class="h2">Bring one brother</b><p>Day 2. People who lock in with a friend stay far longer. Start a club and send him the code.</p></div></div>
    <div class="stack">
      <button class="btn btn-primary" data-start>Start a club</button>
      <button class="btn btn-quiet" data-close>Not now</button>
    </div>`, {
    onMount(body, close) {
      body.querySelector('[data-start]').addEventListener('click', () => { close(); setTimeout(newClub, 320); });
    },
  });
}

// Called on app open. Never stacks on top of something already showing.
export async function runNudges() {
  if (document.querySelector('.tour, .sheet-wrap, .cap')) return;
  const P = S.profile;
  if (!P?.onboarded || !P.tourDone) return;
  const offset = reviewDue();
  if (offset !== null) return openReview(offset);
  if (await inviteDue()) inviteNudge();
}
