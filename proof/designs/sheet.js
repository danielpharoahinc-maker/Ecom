// Renders contact sheets of a design's 10 stages so they can be reviewed as images.
//   node sheet.js d01 [d02 ...]   -> writes out/<id>.html and out/<id>.png
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
(async () => {
  const ids = process.argv.slice(2); fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  for (const id of ids) {
    const d = require(`./${id}.js`);
    const tiles = d.stages.map((name, i) => `<figure><div class="art" style="--a:${d.accent}">${d.draw(i + 1, `${id}s${i + 1}`)}</div><figcaption><b>${i + 1}</b> ${name}</figcaption></figure>`).join('');
    const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#0b0b0d;font:600 14px system-ui;color:#eee;padding:20px}h1{margin:0 0 4px;font-size:22px}p{margin:0 0 16px;color:#999;font-weight:400}.g{display:grid;grid-template-columns:repeat(5,230px);gap:12px}figure{margin:0}.art{background:radial-gradient(circle at 50% 45%,color-mix(in srgb,var(--a) 22%,#17161a),#121114 70%);border-radius:14px;height:270px;display:grid;place-items:center;overflow:hidden}svg{width:230px;height:270px}figcaption{padding:6px 4px;color:#cfcfcf}figcaption b{color:var(--a);margin-right:6px}</style><h1>${d.name}</h1><p>${d.tag}</p><div class="g">${tiles}</div>`;
    fs.writeFileSync(path.join(__dirname, 'out', `${id}.html`), html);
    await p.setContent(html); await p.setViewportSize({ width: 1260, height: 700 }); await p.waitForTimeout(150);
    await p.screenshot({ path: path.join(__dirname, 'out', `${id}.png`), fullPage: true });
    console.log('wrote', id);
  }
  await b.close();
})();
