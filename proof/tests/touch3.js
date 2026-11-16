const { launch } = require('./lib.js');
(async () => {
  const { b, p, errs } = await launch();
  const cdp = await p.context().newCDPSession(p);
  const drag = async (x, y0, dy) => { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0 }] }); for (let i = 1; i <= 12; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y0 + (dy * i) / 12 }] }); await new Promise(r => setTimeout(r, 14)); } await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); };
  await p.click('[data-settings]'); await p.waitForSelector('.sheet-wrap.open'); await p.waitForTimeout(800);
  const g = await p.locator('.grabber').boundingBox(); const x = g.x + g.width / 2;
  await drag(x, g.y + g.height / 2, 260); await p.waitForTimeout(900);
  console.log('finger drag down on the grabber closes the sheet:', (await p.locator('.sheet-wrap').count()) === 0);
  // flick: short fast drag
  await p.click('[data-settings]'); await p.waitForSelector('.sheet-wrap.open'); await p.waitForTimeout(800);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: g.y + g.height / 2 }] });
  for (let i = 1; i <= 4; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: g.y + g.height / 2 + i * 14 }] }); await new Promise(r => setTimeout(r, 8)); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(900);
  console.log('a quick flick on the handle closes it:', (await p.locator('.sheet-wrap').count()) === 0);
  // small slow drag springs back
  await p.click('[data-settings]'); await p.waitForSelector('.sheet-wrap.open'); await p.waitForTimeout(800);
  await drag(x, g.y + g.height / 2, 40); await p.waitForTimeout(900);
  console.log('a small drag springs back (stays open):', (await p.locator('.sheet-wrap').count()) === 1);
  console.log('ERR', errs); await b.close();
})();
