const { chromium, devices } = require('playwright'); const fs = require('fs');
exports.launch = async (o = {}) => {
  const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const ctx = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block', permissions: ['camera', 'microphone'] });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  if (o.local !== false) await p.route('**/js/config.js', r => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('/home/user/Ecom/proof/js/config.js', 'utf8').replace(/supabaseAnonKey: '[^']*'/, "supabaseAnonKey: ''") }));
  await p.goto('http://localhost:8765/');
  if (o.seed !== false) {
    await p.evaluate(async (prof) => {
      const db = await new Promise(r => { const q = indexedDB.open('proof-db', 1); q.onupgradeneeded = () => { const d = q.result; ['kv', 'media'].forEach(n => d.createObjectStore(n)); d.createObjectStore('proofs', { keyPath: 'id' }); d.createObjectStore('clubs', { keyPath: 'id' }); }; q.onsuccess = () => r(q.result); });
      const D = 864e5; const tx = db.transaction(['kv', 'proofs'], 'readwrite');
      tx.objectStore('kv').put({ id: 'u', email: 'a@b.c', name: 'Danny', provider: 'email' }, 'user');
      tx.objectStore('kv').put({ name: 'Danny', commitments: ['train', 'build', 'faith'], goalLog: [{ ts: Date.now() - 9 * D, keys: ['train', 'build', 'faith'] }], createdAt: Date.now() - 9 * D, onboarded: true, tourDone: true, firstProofDone: true, inviteNudged: true, remindersAsked: true, lastReview: Date.now(), ...prof }, 'profile');
      await new Promise(r => tx.oncomplete = r);
    }, o.profile || {});
    await p.reload(); await p.waitForSelector('.cm-list');
  }
  return { b, ctx, p, errs };
};
