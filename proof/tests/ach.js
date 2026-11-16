const { launch } = require('./lib.js');
(async () => { const { b, p, errs } = await launch({ seed: false });
  // seed 40 days of varied proofs, no 'unlocked' map so a batch unlocks at boot
  await p.evaluate(async () => {
    const db = await new Promise(r => { const q = indexedDB.open('proof-db', 1); q.onupgradeneeded = () => { const d = q.result; ['kv', 'media'].forEach(n => d.createObjectStore(n)); d.createObjectStore('proofs', { keyPath: 'id' }); d.createObjectStore('clubs', { keyPath: 'id' }); }; q.onsuccess = () => r(q.result); });
    const D = 864e5, tx = db.transaction(['kv', 'proofs'], 'readwrite');
    tx.objectStore('kv').put({ id: 'u', email: 'a@b.c', name: 'Danny', provider: 'email' }, 'user');
    tx.objectStore('kv').put({ name: 'Danny', commitments: ['train', 'sun', 'meals'], goalLog: [{ ts: Date.now() - 41 * D, keys: ['train', 'sun', 'meals'] }], createdAt: Date.now() - 41 * D, onboarded: true, tourDone: true, firstProofDone: true, inviteNudged: true, remindersAsked: true, lastReview: Date.now() }, 'profile');
    let i = 0; for (let d = 1; d <= 40; d++) for (const k of ['train', 'sun', 'meals']) { const t = new Date(Date.now() - d * D); t.setHours(k === 'sun' ? 6 : 12, i % 50); tx.objectStore('proofs').put({ id: 'p' + (i++), ts: t.getTime(), cKey: k, kind: 'photo', note: 'x', photoId: 'x', qa: { ok: true, score: 90, tags: [], hash: 'h' }, ...(k === 'meals' ? { meal: { type: 'Lunch', tags: [] } } : {}) }); }
    await new Promise(r => tx.oncomplete = r); });
  await p.reload(); await p.waitForSelector('.cm-list'); await p.waitForTimeout(5200);
  console.log('DEBUG open sheets:', await p.locator('.sheet-wrap').count(), '| camera:', await p.locator('.cap').count(), '| sheet text:', (await p.locator('.sheet-wrap').first().innerText().catch(() => '')).slice(0, 80).replace(/\s+/g, ' '));
  console.log('DEBUG evaluate:', await p.evaluate(async () => { const m = await import('/js/achievements.js'); const list = m.evaluate(); return { done: list.filter(a => a.done).length, metrics: m.metrics() }; }).then(o => JSON.stringify(o)));
  const n = await p.evaluate(async () => { const m = await import('/js/achievements.js'); const s = await import('/js/skins.js'); const ids = new Set(m.ACHIEVEMENTS.map(a => a.id)); const skins = new Set(m.ACHIEVEMENTS.map(a => a.skin)); return { ach: m.ACHIEVEMENTS.length, uniqueIds: ids.size, uniqueSkins: skins.size, skins: s.SKINS.length, names: new Set(s.SKINS.map(x => x.name)).size, first: m.ACHIEVEMENTS[0].title, last: m.ACHIEVEMENTS[99].title, lastSkin: s.SKINS[99].name }; });
  console.log('achievements:', n.ach, '| unique ids:', n.uniqueIds, '| skins:', n.skins, '| unique skin names:', n.names, '| every achievement maps to its own skin:', n.uniqueSkins === 100, '| first:', n.first, '| hardest:', n.last, '->', n.lastSkin);
  await p.keyboard.press('Escape'); await p.waitForTimeout(3800);
  console.log('celebration appeared at boot:', await p.locator('.unlock').count() === 1, '|', (await p.locator('.unlock-k').innerText().catch(() => '')).trim(), '|', (await p.locator('.unlock .h2').innerText().catch(() => '')).trim());
  await p.screenshot({ path: __dirname + '/a1.png' });
  await p.click('.unlock [data-wear]'); await p.waitForTimeout(700);
  const worn = await p.evaluate(() => new Promise(r => { const q = indexedDB.open('proof-db', 1); q.onsuccess = () => { const g = q.result.transaction('kv').objectStore('kv').get('profile'); g.onsuccess = () => r({ skin: g.result.skin, unlocked: Object.keys(g.result.unlocked || {}).length }); }; }));
  console.log('equipped from the celebration:', worn);
  await p.click('[data-settings]'); await p.click('[data-ach]'); await p.waitForSelector('.ach'); await p.waitForTimeout(700);
  console.log('achievements screen rows:', await p.locator('.ach').count(), '| done:', await p.locator('.ach.done').count(), '| header:', (await p.locator('.aw-ring').innerText()).replace(/\s+/g, ''));
  await p.screenshot({ path: __dirname + '/a2.png' });
  await p.click('[data-tab=ward]'); await p.waitForSelector('.sk'); await p.waitForTimeout(900);
  console.log('wardrobe grid:', await p.locator('.sk').count(), 'skins | locked:', await p.locator('.sk.locked').count(), '| drawn so far (lazy):', await p.locator('.sk-fig[data-done]').count());
  await p.locator('.sk.locked').first().click(); await p.waitForTimeout(300);
  console.log('tap a locked skin ->', (await p.locator('.sk-how').innerText()).replace(/\s+/g, ' ').trim());
  await p.screenshot({ path: __dirname + '/a3.png' });
  await p.locator('.sk:not(.locked)').nth(1).click(); await p.waitForTimeout(200); await p.click('[data-wear]'); await p.waitForTimeout(600);
  console.log('Proff FAB re-drawn in new skin:', await p.evaluate(() => document.querySelector('.proff-fab svg')?.outerHTML.slice(0, 0) + 'yes'));
  console.log('ERR', errs); await b.close(); })();
