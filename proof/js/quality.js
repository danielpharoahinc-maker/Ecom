// Photo check, on the phone, with no AI and nothing sent anywhere. It judges
// whether a photo is a *good* proof: in focus, lit properly, lens not covered,
// and not the same photo you already posted. It cannot know WHAT is in the photo.
const SIZE = 480;       // focus is judged at this size, so real blur shows up
const DUP = 5;          // how different two photos must be (out of 64) to count as new

function grey(canvas) {
  const { width: w, height: h } = canvas;
  const px = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
  const g = new Float32Array(w * h);
  for (let i = 0, j = 0; i < px.length; i += 4, j++) g[j] = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
  return { g, w, h };
}

// A 64-bit fingerprint of what the picture looks like, tolerant of re-saving and small shifts.
function dHash(bmp) {
  const c = document.createElement('canvas'); c.width = 9; c.height = 8;
  c.getContext('2d').drawImage(bmp, 0, 0, 9, 8);
  const { g } = grey(c);
  let bits = '';
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += g[y * 9 + x] > g[y * 9 + x + 1] ? '1' : '0';
  return bits;
}
const ham = (a, b) => { let n = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++; return n; };

export const THRESHOLDS = { blur: 40, dark: 42, bright: 232, flat: 12 };

export async function checkPhoto(blob, known = []) {
  const bmp = await createImageBitmap(blob);
  const s = Math.min(1, SIZE / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.max(8, Math.round(bmp.width * s)); c.height = Math.max(8, Math.round(bmp.height * s));
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  const { g, w, h } = grey(c);

  let sum = 0;
  for (let i = 0; i < g.length; i++) sum += g[i];
  const mean = sum / g.length;
  let v = 0;
  for (let i = 0; i < g.length; i++) v += (g[i] - mean) ** 2;
  const std = Math.sqrt(v / g.length);

  // Focus: how much fine edge detail there is (variance of the Laplacian).
  let lm = 0, lv = 0, n = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    const l = 4 * g[i] - g[i - 1] - g[i + 1] - g[i - w] - g[i + w];
    lm += l; lv += l * l; n++;
  }
  const sharp = lv / n - (lm / n) ** 2;

  const hash = dHash(bmp);
  const dupe = known.some((k) => k && k.length === 64 && ham(hash, k) <= DUP);
  bmp.close?.();

  const T = THRESHOLDS;
  const problems = [];
  if (std < T.flat) problems.push('This looks blank or covered. Is something over the lens?');
  else {
    if (mean < T.dark) problems.push('It’s too dark to see anything. Find more light.');
    else if (mean > T.bright) problems.push('It’s washed out. Move away from the glare.');
    if (sharp < T.blur) problems.push('It’s blurry. Hold still and tap again.');
  }
  if (dupe) problems.push('This looks like a photo you already posted. Proof has to be new.');

  const tags = [];
  if (!problems.length) { tags.push('In focus'); if (mean >= 70 && mean <= 200) tags.push('Well lit'); tags.push('Fresh'); }
  const score = Math.max(0, Math.min(100, Math.round(100 - problems.length * 35 + Math.min(10, Math.max(0, (sharp - T.blur) / 20)))));
  return { ok: !problems.length, problems, tags, score, hash, metrics: { mean: Math.round(mean), std: Math.round(std), sharp: Math.round(sharp) } };
}
