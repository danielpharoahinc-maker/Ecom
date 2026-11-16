const { chromium, devices } = require('playwright');
const SUPA = 'https://kfnetfsyvhyysjjhpwue.supabase.co'; const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const user = { id: 'real-1', aud: 'authenticated', email: 'x@y.co', app_metadata: { provider: 'email' }, user_metadata: {} };
(async () => {
  for (const mode of ['ok', 'not_configured', 'notion_error']) {
    const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' }); await ctx.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await ctx.route(`${SUPA}/**`, async r => { const u = new URL(r.request().url()); const m = r.request().method(); if (m === 'OPTIONS') return r.fulfill({ status: 200, headers: cors });
      const J = (o, s = 200) => r.fulfill({ status: s, headers: cors, contentType: 'application/json', body: JSON.stringify(o) });
      if (u.pathname.endsWith('/auth/v1/user')) return J(user);
      if (u.pathname === '/functions/v1/notion-log') return mode === 'ok' ? J({ status: 'ok', url: 'https://notion.so/x' }) : mode === 'not_configured' ? J({ status: 'not_configured' }) : J({ status: 'notion_error' }, 502);
      if (u.pathname === '/rest/v1/profiles' && m === 'GET') return J([{ id: 'real-1', pro_until: new Date(Date.now() + 20 * 864e5).toISOString() }]);
      if (u.pathname === '/rest/v1/rpc/my_billing') return J([]);
      if (u.pathname === '/rest/v1/proofs' && m === 'GET') return J([]);
      return r.fulfill({ status: 201, headers: cors, body: '' }); });
    await p.goto('http://localhost:8765/');
    await p.evaluate(async ({ user }) => {
      localStorage.setItem('sb-kfnetfsyvhyysjjhpwue-auth-token', JSON.stringify({ access_token: 'a.b.c', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'r', user }));
      const db = await new Promise(r => { const q = indexedDB.open('proof-db', 1); q.onupgradeneeded = () => { const d = q.result; ['kv', 'media'].forEach(n => d.createObjectStore(n)); d.createObjectStore('proofs', { keyPath: 'id' }); d.createObjectStore('clubs', { keyPath: 'id' }); }; q.onsuccess = () => r(q.result); });
      const tx = db.transaction(['kv'], 'readwrite'); tx.objectStore('kv').put({ id: 'real-1', email: 'x@y.co', name: 'Danny', provider: 'email' }, 'user');
      tx.objectStore('kv').put({ name: 'Danny', commitments: ['meals', 'train'], goalLog: [{ ts: Date.now() - 864e5 * 3, keys: ['meals', 'train'] }], createdAt: Date.now() - 864e5 * 3, onboarded: true, tourDone: true, firstProofDone: true, inviteNudged: true, remindersAsked: true, lastReview: Date.now(), unlocked: {} }, 'profile'); await new Promise(r => tx.oncomplete = r); }, { user });
    await p.reload(); await p.waitForSelector('.cm-list'); await p.waitForTimeout(1200);
    await p.click('[data-settings]'); await p.waitForSelector('[data-notion]'); await p.click('[data-notion]'); await p.waitForTimeout(900);
    const toast = (await p.locator('.toast').innerText()).trim(); const clip = await p.evaluate(() => navigator.clipboard.readText().catch(() => ''));
    console.log(`[${mode}] toast: "${toast}" | log copied as fallback: ${clip.startsWith('# Lock-in log')} | errors: ${errs.length}`);
    await b.close();
  }
})();
