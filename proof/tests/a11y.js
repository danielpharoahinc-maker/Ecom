const { launch } = require('./lib.js'); const fs = require('fs');
const AXE = fs.readFileSync(__dirname + '/axe/package/axe.min.js', 'utf8');
(async () => {
  const { b, p } = await launch({ profile: { commitments: ['sun', 'meals', 'train', 'faith'], goalLog: [{ ts: Date.now() - 9 * 864e5, keys: ['sun', 'meals', 'train', 'faith'] }], unlocked: { x: 1 } } });
  const all = {};
  const scan = async (name) => {
    await p.evaluate(AXE);
    const r = await p.evaluate(async () => { const x = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'best-practice'] } }); return x.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, help: v.help, sample: v.nodes[0].target.join(' ').slice(0, 70) })); });
    all[name] = r; console.log(`\n[${name}] ${r.length} issue types`); r.forEach(v => console.log(`  ${v.impact} ${v.id} x${v.n}: ${v.help}  e.g. ${v.sample}`));
  };
  await scan('Today');
  await p.click('[data-settings]'); await p.waitForSelector('[data-ach]'); await p.waitForTimeout(700); await scan('Account sheet'); await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  await p.click('[data-tab=stats]'); await p.waitForSelector('.st-hero'); await scan('Stats');
  await p.click('[data-tab=club]'); await p.waitForTimeout(600); await scan('Club');
  await p.click('[data-tab=today]'); await p.click('[data-settings]'); await p.click('[data-ach]'); await p.waitForSelector('.ach'); await p.waitForTimeout(600); await scan('Achievements'); await p.click('[data-tab=ward]'); await p.waitForTimeout(900); await scan('Wardrobe'); await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  await p.click('.nu-btn'); await p.waitForSelector('.cam video'); await p.waitForTimeout(700); await scan('Camera'); await p.click('[data-shoot]'); await p.waitForSelector('.gpick-q'); await p.waitForTimeout(800); await scan('Review + goal cards');
  fs.writeFileSync(__dirname + '/a11y.json', JSON.stringify(all)); await b.close();
})();
