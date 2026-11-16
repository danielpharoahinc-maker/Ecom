const { launch } = require('./lib.js');
(async () => { const { b, p, errs } = await launch({ seed: false });
  await p.click('[data-start]'); await p.waitForSelector('.ob');
  await p.locator('.choice').first().click(); await p.click('[data-next]'); await p.waitForTimeout(300); await p.locator('.choice').nth(2).click(); await p.click('[data-next]'); await p.waitForTimeout(300);
  for (const k of ['train', 'build', 'faith']) await p.locator(`.ctile[data-k="${k}"]`).click(); await p.click('[data-next]'); await p.waitForTimeout(300);
  await p.fill('#name', 'Danny'); await p.click('[data-next]'); await p.waitForSelector('.wheel'); await p.waitForTimeout(700);
  await p.locator('.wheel li.on').click(); await p.waitForTimeout(400); // 15 is already in the middle: tap it to confirm
  console.log('age 15 -> message shown:', JSON.stringify((await p.locator('.ap-verdict').innerText()).trim()), '| Continue enabled:', !(await p.locator('[data-next]').isDisabled()));
  await p.locator('.wheel').evaluate(e => e.scrollTo({ top: 2 * 46 })); await p.waitForTimeout(600);
  console.log('age 12 -> message:', (await p.locator('.ap-verdict').innerText()).trim(), '| Continue disabled:', await p.locator('[data-next]').isDisabled());
  await p.locator('.wheel').evaluate(e => e.scrollTo({ top: 5 * 46 })); await p.waitForTimeout(600); await p.click('[data-next]'); await p.waitForSelector('.acct');
  console.log('account step: parent box present:', await p.locator('[name=parent]').count(), '| only the terms box:', await p.locator('.acct input[type=checkbox]').count() === 1);
  await p.fill('#email', 'a@b.co'); await p.check('[name=agree]'); console.log('terms + email is enough -> Create enabled:', !(await p.locator('.acct [type=submit]').isDisabled()));
  console.log('ERR', errs); await b.close(); })();
