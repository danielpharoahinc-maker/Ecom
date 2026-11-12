// Invite sheet: share the 6-letter code, the same way for local and live clubs.
import { openSheet } from './sheet.js';
import { ic } from './icons.js';
import { esc, toast } from './util.js';

export const inviteLink = (code) => `${location.origin}${location.pathname}?join=${code}`;

export function inviteSheet(club) {
  const url = inviteLink(club.code);
  const text = `Lock in with me on Proof. Join ${club.name} with code ${club.code}`;
  openSheet(`
    <h2 class="h2">Invite your crew</h2>
    <p class="sub">Send them this code, or the link. They open it, sign in, and they’re in ${esc(club.name)}.</p>
    <div class="code-box"><b class="code">${club.code}</b></div>
    <div class="stack">
      <button class="btn btn-primary" data-share>${ic('share', 20)}<span>Share invite</span></button>
      <button class="btn btn-secondary" data-copy>${ic('copy', 20)}<span>Copy invite link</span></button>
    </div>`, {
    onMount(body) {
      const share = body.querySelector('[data-share]');
      if (!navigator.share) share.hidden = true;
      share.addEventListener('click', async () => {
        try { await navigator.share({ title: 'Join my club on Proof', text, url }); } catch { /* cancelled or blocked */ }
      });
      body.querySelector('[data-copy]').addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(`${text}: ${url}`); toast('Invite copied'); }
        catch { const r = document.createRange(); r.selectNodeContents(body.querySelector('.code')); getSelection().removeAllRanges(); getSelection().addRange(r); toast('Code selected. Copy it.'); }
      });
    },
  });
}
