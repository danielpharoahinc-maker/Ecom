const { chromium, devices } = require('playwright');
const SUPA = 'https://kfnetfsyvhyysjjhpwue.supabase.co'; const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const user = { id: 'real-1', aud: 'authenticated', email: 'x@y.co', app_metadata: { provider: 'email' }, user_metadata: {} };
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' }); await ctx.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  let keys = []; let profile = null; const KEY = 'proof_' + 'a'.repeat(64);
  await ctx.route(`${SUPA}/**`, async r => { const u = new URL(r.request().url()); const m = r.request().method(); if (m === 'OPTIONS') return r.fulfill({ status: 200, headers: cors });
    const J = (o, s = 200) => r.fulfill({ status: s, headers: cors, contentType: 'application/json', body: JSON.stringify(o) });
    if (u.pathname.endsWith('/auth/v1/user')) return J(user);
    if (u.pathname === '/rest/v1/rpc/list_api_keys') return J(keys);
    if (u.pathname === '/rest/v1/rpc/create_api_key') { keys = [{ id: 'k1', label: 'Claude', key_hint: 'aaaa', created_at: new Date().toISOString(), last_used_at: null }]; return J(KEY); }
    if (u.pathname === '/rest/v1/rpc/revoke_api_key') { keys = []; return r.fulfill({ status: 204, headers: cors, body: '' }); }
    if (u.pathname === '/rest/v1/profiles' && m === 'GET') return J(profile ? [{ id: 'real-1', pro_until: new Date(Date.now() + 20 * 864e5).toISOString() }] : []);
    if (u.pathname === '/rest/v1/profiles' && m === 'POST') { profile = true; return r.fulfill({ status: 201, headers: cors, body: '' }); }
    if (u.pathname === '/rest/v1/rpc/my_billing') return J([]);
    if (['/rest/v1/proofs'].includes(u.pathname) && m === 'GET') return J([]);
    return r.fulfill({ status: 201, headers: cors, body: '' }); });
  await p.goto('http://localhost:8765/');
  await p.evaluate(async ({ user }) => {
    localStorage.setItem('sb-kfnetfsyvhyysjjhpwue-auth-token', JSON.stringify({ access_token: 'a.b.c', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'r', user }));
    const db = await new Promise(r => { const q = indexedDB.open('proof-db', 1); q.onupgradeneeded = () => { const d = q.result; ['kv', 'media'].forEach(n => d.createObjectStore(n)); d.createObjectStore('proofs', { keyPath: 'id' }); d.createObjectStore('clubs', { keyPath: 'id' }); }; q.onsuccess = () => r(q.result); });
    const tx = db.transaction(['kv'], 'readwrite'); tx.objectStore('kv').put({ id: 'real-1', email: 'x@y.co', name: 'Danny', provider: 'email' }, 'user');
    tx.objectStore('kv').put({ name: 'Danny', commitments: ['meals', 'train', 'sun'], goalLog: [{ ts: Date.now() - 864e5 * 3, keys: ['meals', 'train', 'sun'] }], createdAt: Date.now() - 864e5 * 3, onboarded: true, tourDone: true, firstProofDone: true, inviteNudged: true, remindersAsked: true, lastReview: Date.now() }, 'profile');
    await new Promise(r => tx.oncomplete = r); }, { user });
  await p.reload(); await p.waitForSelector('.cm-list', { timeout: 15000 }); await p.waitForTimeout(800);
  await p.click('[data-settings]'); await p.waitForSelector('[data-claude]'); await p.click('[data-claude]'); await p.waitForSelector('[data-create]');
  console.log('no keys yet -> primary button:', (await p.locator('[data-create]').innerText()).trim());
  await p.click('[data-create]'); await p.waitForSelector('[data-key]');
  const key = (await p.locator('[data-key]').innerText()).trim();
  console.log('key shown once:', key === KEY, '| copy buttons:', await p.locator('[data-copy-msg]').count());
  await p.screenshot({ path: __dirname + '/c1.png' });
  await p.click('[data-copy-msg]'); await p.waitForTimeout(400);
  const clip = await p.evaluate(() => navigator.clipboard.readText().catch(() => 'n/a'));
  console.log('setup message copied has URL + key + Notion step:', clip.includes('/functions/v1/proof-api') && clip.includes(KEY) && /Notion/.test(clip));
  console.log('profile flagged as connected:', await p.evaluate(() => new Promise(r => { const q = indexedDB.open('proof-db', 1); q.onsuccess = () => { const g = q.result.transaction('kv').objectStore('kv').get('profile'); g.onsuccess = () => r(g.result.apiConnected); }; })));
  await p.keyboard.press('Escape'); await p.waitForTimeout(500); await p.click('[data-settings]'); await p.click('[data-claude]'); await p.waitForSelector('[data-revoke]');
  console.log('reopened: key listed, full value NOT shown:', !(await p.locator('.cc-keys').innerText()).includes(KEY), '|', (await p.locator('.cc-keys li').innerText()).replace(/\s+/g, ' ').slice(0, 60));
  await p.click('[data-revoke]'); await p.waitForTimeout(800); console.log('revoked -> list empty:', await p.locator('.cc-keys li').count() === 0);
  console.log('ERR', errs); await b.close();
})();
