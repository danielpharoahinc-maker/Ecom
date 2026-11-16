const { launch } = require('./lib.js');
const ok = (l, c, x = '') => console.log((c ? 'PASS ' : 'FAIL ') + l + (x ? '  -> ' + x : ''));
(async () => {
  const { b, p, errs } = await launch({ profile: { commitments: ['meals', 'train', 'sun'], goalLog: [{ ts: Date.now() - 9 * 864e5, keys: ['meals', 'train', 'sun'] }] } });
  await p.addInitScript(() => { window.__vib = []; navigator.vibrate = (x) => { window.__vib.push(x); return true; }; });
  await p.reload(); await p.waitForSelector('.cm-list');
  const buddy = (await p.locator('.buddy-say').innerText()).trim();
  ok('buddy line on Today', buddy.length > 10, buddy);
  await p.click('[data-buddy]'); await p.waitForSelector('#ask-q'); ok('tapping the buddy opens Ask Proff', true); await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  // posting a meal
  await p.click('.nu-btn'); await p.waitForSelector('.cam video'); await p.waitForTimeout(800); await p.click('[data-shoot]'); await p.waitForSelector('.gpick-q', { timeout: 8000 });
  ok('goal cards after the photo, nothing on the camera', (await p.locator('.gtile').count()) === 4);
  ok('first goal is a food goal -> meal picker already showing', await p.locator('.meal-pick').isVisible());
  await p.locator('.gtile').nth(1).click(); await p.waitForTimeout(200); ok('switching to Train hides the meal picker', await p.locator('.meal-pick').isHidden());
  await p.locator('.gtile').first().click(); await p.waitForTimeout(250);
  ok('Meal goal selected -> meal picker appears', await p.locator('.meal-pick').isVisible(), (await p.locator('.gtile.on b').innerText()).trim());
  await p.click('[data-meal="Dinner"]'); await p.click('[data-tag="Protein"]'); await p.click('[data-tag="Veg or fruit"]');
  await p.fill('#note', 'chicken and rice'); await p.click('[data-post]'); await p.waitForSelector('.done-screen,.qa-warn'); if (await p.locator('.qa-warn').count()) await p.click('[data-qa-anyway]'); await p.waitForSelector('.done-screen');
  const saved = await p.evaluate(() => new Promise(r => { const q = indexedDB.open('proof-db', 1); q.onsuccess = () => { const g = q.result.transaction('proofs').objectStore('proofs').getAll(); g.onsuccess = () => r(g.result[0]); }; }));
  ok('meal saved with type + tags', saved.cKey === 'meals' && saved.meal.type === 'Dinner' && saved.meal.tags.join() === 'Protein,Veg or fruit', JSON.stringify(saved.meal));
  const vib = await p.evaluate(() => window.__vib.map(v => JSON.stringify(v)));
  ok('good-news vibration played on post', vib.some(v => /\[1[48],/.test(v)), vib.join(' | '));
  await p.click('.done-screen [data-close]'); await p.waitForSelector('.next-up');
  // bad-news vibration
  await p.evaluate(async () => { window.__vib.length = 0; const u = await import('/js/util.js'); u.toast('Couldn’t save that. Try again.'); });
  ok('bad-news vibration on a failure message', (await p.evaluate(() => window.__vib.map(v => JSON.stringify(v)))).some(v => v.includes('160')));
  await p.waitForTimeout(4300); ok('first proof triggers the skin-unlock celebration', await p.locator('.unlock').count() === 1, (await p.locator('.unlock-k').innerText().catch(() => '')).trim()); await p.keyboard.press('Escape'); await p.waitForTimeout(600);
  // sheets
  await p.click('[data-settings]'); await p.waitForSelector('.sheet-wrap.open'); await p.goBack(); await p.waitForTimeout(500);
  ok('Back button closes the sheet', (await p.locator('.sheet-wrap').count()) === 0);
  await p.click('[data-settings]'); await p.waitForSelector('.sheet-wrap.open'); await p.waitForTimeout(700);
  const g = await p.locator('.grabber').boundingBox(); await p.mouse.move(g.x + g.width / 2, g.y + 8); await p.mouse.down(); await p.mouse.move(g.x + g.width / 2, g.y + 240, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(700);
  ok('swipe down closes the sheet', (await p.locator('.sheet-wrap').count()) === 0);
  // vault + proof view with meal + undo delete
  await p.click('[data-tab=vault]'); await p.waitForSelector('[data-hold]'); await p.locator('[data-hold]').focus(); await p.keyboard.press('Enter'); await p.waitForSelector('.print', { timeout: 6000 });
  await p.locator('.print').first().click(); await p.waitForSelector('.pv-meal');
  ok('proof view shows the meal chips + a note about Claude', (await p.locator('.pv-meal').innerText()).includes('Dinner') && (await p.locator('.ai-wait').count()) === 1);
  await p.click('[data-more]'); await p.waitForTimeout(600);
  ok('delete hides it with an Undo toast', (await p.locator('.print').count()) === 0 && (await p.locator('.toast-act').count()) === 1);
  await p.click('.toast-act'); await p.waitForTimeout(500); ok('Undo brings it back', (await p.locator('.print').count()) === 1);
  console.log('ERR', errs); await b.close();
})();
