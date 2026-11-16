// Account > Connect Claude. Creates a Proof API key so your own Claude can read your
// proof and review your meals, and shows a message you can paste into Claude.
import { S, saveProfile } from './state.js';
import { getClient } from './auth.js';
import { openSheet } from './sheet.js';
import { proffSVG } from './proff.js';
import { ic } from './icons.js';
import { CONFIG, LIVE } from './config.js';
import { esc, toast, feel, haptic } from './util.js';

export const apiBase = () => `${CONFIG.supabaseUrl}/functions/v1/proof-api`;

export const setupMessage = (key) => `I track my daily goals and meals in an app called Proof. You can read my Proof data with its API.

Base URL: ${apiBase()}
Auth header: Authorization: Bearer ${key}

Start with GET ${apiBase()}?r=help to see what you can do. Today, please:
1. Get my meals that still need a review (r=meals&pending=true), look at each photo and judge how good the meal is.
2. Save a review for each one (POST r=analysis with proof_id, score 0-10, verdict, summary, tips).
3. Get my day as a ready-made log (r=daily_log) and add it to my Lock-in plan in Notion.`;

async function copy(text, done) {
  try { await navigator.clipboard.writeText(text); toast(done); feel('good'); }
  catch { toast('Couldn’t copy. Press and hold the text to copy it.'); }
}

export function openConnectClaude() {
  openSheet(`
    <div class="ask-head">${proffSVG('talk', 64)}<div><b class="h2">Connect Claude</b><p>Claude reviews your meals and sees your progress.</p></div></div>
    <div class="cc-body" aria-live="polite"><p class="dim">Loading…</p></div>`, {
    tall: true,
    async onMount(body) {
      const box = body.querySelector('.cc-body');
      const c = LIVE ? await getClient().catch(() => null) : null;
      const sess = c ? (await c.auth.getSession()).data.session : null;
      if (!c || !sess) { box.innerHTML = '<p class="ai-wait">Sign in to your Proof account first, then you can create a key.</p>'; return; }
      const render = async (fresh) => {
        const { data: keys, error } = await c.rpc('list_api_keys');
        if (error) { box.innerHTML = `<p class="form-err">Couldn’t load your keys: ${esc(error.message)}</p>`; return; }
        if ((keys || []).length === 0 && S.profile.apiConnected) saveProfile({ ...S.profile, apiConnected: false });
        box.innerHTML = `
          ${fresh ? `<div class="cc-key">
            <b>Your key. Shown once.</b>
            <code data-key>${esc(fresh)}</code>
            <div class="stack">
              <button class="btn btn-primary" data-copy-msg>Copy setup message for Claude</button>
              <button class="btn btn-secondary" data-copy-key>Copy key only</button>
            </div>
            <p class="fine">Anyone with this key can see your proof and photos. Don’t share it. Revoke it below any time.</p>
          </div>` : ''}
          ${(keys || []).length ? `<h2 class="cat-h">Your keys</h2><ul class="cc-keys">${keys.map((k) => `
            <li><span><b>${esc(k.label)}</b><small>…${esc(k.key_hint)} · made ${new Date(k.created_at).toLocaleDateString([], { day: 'numeric', month: 'short' })}${k.last_used_at ? ` · used ${new Date(k.last_used_at).toLocaleDateString([], { day: 'numeric', month: 'short' })}` : ' · not used yet'}</small></span>
            <button class="btn-pill danger" data-revoke="${k.id}">Revoke</button></li>`).join('')}</ul>` : ''}
          <div class="stack"><button class="btn ${fresh || (keys || []).length ? 'btn-quiet' : 'btn-primary'}" data-create>${ic('plus', 18)}<span>Create API key for Claude</span></button></div>`;
        box.querySelector('[data-create]').addEventListener('click', async (e) => {
          e.currentTarget.disabled = true; haptic(12);
          const { data, error: e2 } = await c.rpc('create_api_key', { key_label: 'Claude' });
          if (e2 || !data) { toast(`Couldn’t create the key: ${e2?.message || 'try again'}`); e.currentTarget.disabled = false; return; }
          await saveProfile({ ...S.profile, apiConnected: true });
          feel('great'); render(data);
        });
        box.querySelector('[data-copy-msg]')?.addEventListener('click', () => copy(setupMessage(fresh), 'Copied. Paste it into Claude.'));
        box.querySelector('[data-copy-key]')?.addEventListener('click', () => copy(fresh, 'Key copied'));
        box.querySelectorAll('[data-revoke]').forEach((b) => b.addEventListener('click', async () => {
          b.disabled = true; await c.rpc('revoke_api_key', { key_id: b.dataset.revoke }); toast('Key revoked'); feel('warn'); render();
        }));
      };
      render();
    },
  });
}
