const { chromium, devices } = require('playwright'); const fs = require('fs');
const SUPA = 'https://kfnetfsyvhyysjjhpwue.supabase.co'; const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const user = { id: 'real-1', aud: 'authenticated', email: 'x@y.co', app_metadata: { provider: 'email' }, user_metadata: {} };
(async () => {
  for (const mode of ['configured', 'not_configured']) {
    const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] }); const ctx = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block', permissions: ['camera', 'microphone'] });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); const calls = []; let profile = true;
    await ctx.route(`${SUPA}/**`, async r => { const u = new URL(r.request().url()); const m = r.request().method(); if (m === 'OPTIONS') return r.fulfill({ status: 200, headers: cors }); calls.push(m + ' ' + u.pathname);
      const J = (o, s = 200) => r.fulfill({ status: s, headers: cors, contentType: 'application/json', body: JSON.stringify(o) });
      if (u.pathname.endsWith('/auth/v1/user')) return J(user);
      if (u.pathname === '/functions/v1/analyze-meal') return mode === 'configured' ? J({ status: 'ok', analysis: { score: 8, verdict: 'good', summary: 'Solid protein, add a vegetable.', tips: ['Add greens'], by: 'claude', at: new Date().toISOString() } }) : J({ status: 'not_configured' });
      if (u.pathname.startsWith('/storage/v1/object/')) return J({ Key: 'ok' });
      if (u.pathname === '/rest/v1/proofs' && m === 'POST') return J({ id: 'srv-1' });
      if (u.pathname === '/rest/v1/proofs' && m === 'GET') return J([]);
      if (u.pathname === '/rest/v1/profiles' && m === 'GET') return J([{ id: 'real-1', pro_until: new Date(Date.now() + 20 * 864e5).toISOString() }]);
      if (u.pathname === '/rest/v1/rpc/my_billing') return J([]);
      return r.fulfill({ status: 201, headers: cors, body: '' }); });
    await p.goto('http://localhost:8765/');
    await p.evaluate(async ({ user }) => {
      localStorage.setItem('sb-kfnetfsyvhyysjjhpwue-auth-token', JSON.stringify({ access_token: 'a.b.c', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'r', user }));
      const db = await new Promise(r => { const q = indexedDB.open('proof-db', 1); q.onupgradeneeded = () => { const d = q.result; ['kv', 'media'].forEach(n => d.createObjectStore(n)); d.createObjectStore('proofs', { keyPath: 'id' }); d.createObjectStore('clubs', { keyPath: 'id' }); }; q.onsuccess = () => r(q.result); });
      const tx = db.transaction(['kv'], 'readwrite'); tx.objectStore('kv').put({ id: 'real-1', email: 'x@y.co', name: 'Danny', provider: 'email' }, 'user');
      tx.objectStore('kv').put({ name: 'Danny', commitments: ['meals', 'train'], goalLog: [{ ts: Date.now() - 864e5 * 3, keys: ['meals', 'train'] }], createdAt: Date.now() - 864e5 * 3, onboarded: true, tourDone: true, firstProofDone: true, inviteNudged: true, remindersAsked: true, lastReview: Date.now(), unlocked: {} }, 'profile');
      await new Promise(r => tx.oncomplete = r); }, { user });
    await p.reload(); await p.waitForSelector('.cm-list'); await p.waitForTimeout(1500);
    await p.click('[data-add]'); await p.waitForSelector('.cam video'); await p.waitForTimeout(800); await p.click('[data-shoot]'); await p.waitForSelector('.gpick-q');
    await p.click('[data-post]'); await p.waitForSelector('.done-screen,.qa-warn'); if (await p.locator('.qa-warn').count()) await p.click('[data-qa-anyway]'); await p.waitForSelector('.done-screen'); await p.waitForTimeout(3500);
    const saved = await p.evaluate(() => new Promise(r => { const q = indexedDB.open('proof-db', 1); q.onsuccess = () => { const g = q.result.transaction('proofs').objectStore('proofs').getAll(); g.onsuccess = () => r(g.result[0]); }; }));
    console.log(`[${mode}] analyze-meal called after upload:`, calls.includes('POST /functions/v1/analyze-meal'), '| review stored on the proof:', saved.analysis ? `${saved.analysis.score}/10 ${saved.analysis.verdict}` : 'none', '| stops retrying for 12h:', await p.evaluate(() => !!localStorage.getItem('proof:review-off')), '| errors:', errs.length);
    await b.close();
  }
})();
