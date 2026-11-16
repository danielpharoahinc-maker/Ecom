const { launch } = require('./lib.js');
(async () => { const { b, p, errs } = await launch({ profile: { commitments: ['sun', 'meals', 'train'], goalLog: [{ ts: Date.now() - 9 * 864e5, keys: ['sun', 'meals', 'train'] }], unlocked: { x: 1 } } });
  await p.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
  await p.evaluate(async () => { const s = await import('/js/state.js'); await s.addProof({ cKey: 'meals', kind: 'photo', note: 'oats and eggs', meal: { type: 'Breakfast', tags: ['Protein'] }, analysis: { score: 9, verdict: 'great', summary: 'Strong start.' } }, null, null); await s.addProof({ cKey: 'sun', kind: 'voice', note: 'outside' }, null, null); });
  await p.click('[data-settings]'); await p.click('[data-notion]'); await p.waitForTimeout(500);
  const t = await p.evaluate(() => navigator.clipboard.readText());
  console.log(t); console.log('---\nERR', errs); await b.close(); })();
