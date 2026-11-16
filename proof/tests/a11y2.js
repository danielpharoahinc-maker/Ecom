const { launch } = require('./lib.js'); const fs = require('fs');
const AXE = fs.readFileSync(__dirname + '/axe/package/axe.min.js', 'utf8');
(async () => {
  const { b, p } = await launch({ seed: false });
  const scan = async (name) => { await p.waitForTimeout(900); await p.evaluate(AXE); const r = await p.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'best-practice'] } })).violations.map(v => `${v.impact} ${v.id} x${v.nodes.length} e.g. ${v.nodes[0].target.join(' ').slice(0, 60)}`)); console.log(`[${name}]`, r.length ? r : 'clean'); };
  await p.waitForSelector('[data-start]'); await p.waitForTimeout(3600); await scan('Intro (Proff speaking)');
  await p.click('[data-have]'); await p.waitForSelector('.email-form'); await scan('Returning sign-in'); await p.click('[data-back]'); await p.waitForSelector('[data-start]');
  await p.click('[data-start]'); await p.waitForSelector('.ob'); await scan('Onboarding: goal');
  await p.locator('.choice').first().click(); await p.click('[data-next]'); await p.waitForTimeout(300); await p.locator('.choice').nth(2).click(); await p.click('[data-next]'); await p.waitForTimeout(400); await scan('Onboarding: when');
  for (const k of ['train', 'build', 'faith']) await p.locator(`.ctile[data-k="${k}"]`).click(); await scan('Onboarding: 33 goals'); await p.click('[data-next]'); await p.waitForTimeout(300);
  await p.fill('#name', 'Danny'); await scan('Onboarding: name'); await p.click('[data-next]'); await p.waitForSelector('.wheel'); await p.waitForTimeout(700); await scan('Onboarding: age wheel');
  await p.locator('.wheel').evaluate(e => e.scrollTo({ top: 8 * 46 })); await p.waitForTimeout(500); await p.click('[data-next]'); await p.waitForSelector('.acct'); await scan('Onboarding: account');
  await b.close();
})();
