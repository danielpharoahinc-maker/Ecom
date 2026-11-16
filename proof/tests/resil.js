const { chromium, devices } = require('playwright');
const SUPA = 'https://kfnetfsyvhyysjjhpwue.supabase.co';
const user = { id: 'real-1', aud: 'authenticated', email: 'x@y.co', app_metadata: { provider: 'email' }, user_metadata: {} };
async function run(label, behave) {
  const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] }); const ctx = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block', permissions: ['camera', 'microphone'] });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); let hits = 0;
  await ctx.route(`${SUPA}/**`, r => { hits++; behave(r); });
  await p.goto('http://localhost:8765/');
  await p.evaluate(async ({ user }) => {
    localStorage.setItem('sb-kfnetfsyvhyysjjhpwue-auth-token', JSON.stringify({ access_token: 'a.b.c', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'r', user }));
    const db = await new Promise(r => { const q = indexedDB.open('proof-db', 1); q.onupgradeneeded = () => { const d = q.result; ['kv', 'media'].forEach(n => d.createObjectStore(n)); d.createObjectStore('proofs', { keyPath: 'id' }); d.createObjectStore('clubs', { keyPath: 'id' }); }; q.onsuccess = () => r(q.result); });
    const tx = db.transaction(['kv'], 'readwrite'); tx.objectStore('kv').put({ id: 'real-1', email: 'x@y.co', name: 'Danny', provider: 'email' }, 'user');
    tx.objectStore('kv').put({ name: 'Danny', commitments: ['meals', 'train', 'sun'], goalLog: [{ ts: Date.now() - 864e5 * 3, keys: ['meals', 'train', 'sun'] }], createdAt: Date.now() - 864e5 * 3, onboarded: true, tourDone: true, firstProofDone: true, inviteNudged: true, remindersAsked: true, lastReview: Date.now(), unlocked: {} }, 'profile');
    await new Promise(r => tx.oncomplete = r); }, { user });
  const t0 = Date.now(); await p.reload(); await p.waitForSelector('.cm-list', { timeout: 20000 }); const ttr = Date.now() - t0;
  await p.waitForTimeout(1500);
  await p.click('[data-add]'); await p.waitForSelector('.cam video'); await p.waitForTimeout(700); await p.click('[data-shoot]'); await p.waitForSelector('.gpick-q'); await p.click('[data-post]'); await p.waitForSelector('.done-screen,.qa-warn'); if (await p.locator('.qa-warn').count()) await p.click('[data-qa-anyway]'); await p.waitForSelector('.done-screen');
  const n = await p.evaluate(() => new Promise(r => { const q = indexedDB.open('proof-db', 1); q.onsuccess = () => { const g = q.result.transaction('proofs').objectStore('proofs').getAll(); g.onsuccess = () => r(g.result.length); }; }));
  await p.waitForTimeout(3800); if (await p.locator('.sheet-wrap').count()) await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  await p.click('[data-tab=club]'); await p.waitForTimeout(2500); const club = (await p.locator('#view').innerText()).replace(/\s+/g, ' ').slice(0, 70);
  console.log(`[${label}] Today appeared in ${ttr}ms | proof posted and saved on the phone: ${n === 1} | server calls attempted: ${hits} | Club tab says: "${club}" | page errors: ${errs.length}`);
  await b.close();
}
(async () => {
  await run('server unreachable', r => r.abort('connectionrefused'));
  await run('server very slow (8s)', r => setTimeout(() => r.fulfill({ status: 200, contentType: 'application/json', body: '[]', headers: { 'access-control-allow-origin': '*' } }).catch(() => {}), 8000));
  await run('server returns 500s', r => r.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"boom"}', headers: { 'access-control-allow-origin': '*' } }));
})();
