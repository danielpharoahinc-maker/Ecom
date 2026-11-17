// Shared drawing toolkit for the Proff designs. Pure functions that return SVG strings.
// Every stage is drawn on a 240 x 280 canvas; the figure stands on y = 236.
const n1 = (n) => Math.round(n * 10) / 10;
const pts = (a) => a.map((p) => `${n1(p[0])},${n1(p[1])}`).join(' ');

// A small deterministic random so every render is identical.
const rng = (seed) => { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };

// Colour helpers: mix two hex colours, lighten, darken.
const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const toHex = (a) => '#' + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
const lighten = (c, t) => mix(c, '#ffffff', t);
const darken = (c, t) => mix(c, '#000000', t);

const lin = (id, stops, x1 = 0, y1 = 0, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</linearGradient>`;
const rad = (id, stops, cx = 0.5, cy = 0.5, r = 0.5) => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</radialGradient>`;

// Ground shadow under the figure.
const shadow = (cx = 120, w = 64, y = 238) => `<ellipse cx="${cx}" cy="${y}" rx="${w}" ry="${n1(w * 0.14)}" fill="#000" opacity=".35"/>`;

// Sparkle (four-point star).
const spark = (x, y, r, c = '#fff', o = 1) => `<path d="M${x} ${y - r} Q${x + r * 0.16} ${y - r * 0.16} ${x + r} ${y} Q${x + r * 0.16} ${y + r * 0.16} ${x} ${y + r} Q${x - r * 0.16} ${y + r * 0.16} ${x - r} ${y} Q${x - r * 0.16} ${y - r * 0.16} ${x} ${y - r}Z" fill="${c}" opacity="${o}"/>`;

// The achievement atmosphere: grows with the level so you can SEE progress even before the
// creature itself changes. level 1 = nothing, level 10 = a full radiant aura.
function atmosphere(uid, L, color, y = 140) {
  const t = (L - 1) / 9, out = [];
  if (L >= 3) out.push(`<circle cx="120" cy="${y}" r="${n1(72 + t * 44)}" fill="${color}" opacity="${n1(0.07 + t * 0.14)}"/>`);
  if (L >= 5) out.push(`<circle cx="120" cy="${y}" r="${n1(88 + t * 24)}" fill="none" stroke="${color}" stroke-width="${L >= 8 ? 4 : 3}" opacity="${n1(0.35 + t * 0.4)}" ${L >= 7 ? 'stroke-dasharray="10 12" stroke-linecap="round"' : ''}/>`);
  if (L >= 2) { const r = rng(L * 31 + 5), cnt = Math.min(8, L); for (let i = 0; i < cnt; i++) { const a = (i / cnt) * 6.283 + 0.4, d = 92 + r() * 22; out.push(spark(n1(120 + Math.cos(a) * d), n1(y + Math.sin(a) * d * 0.85), n1(4 + r() * 3 + t * 4), L >= 6 ? '#ffd23f' : '#f3f1ec', 1)); } }
  return { defs: '', body: out.join('') };
}

// Cute eyes. mood: 'sleepy' | 'calm' | 'bright' | 'fierce'. size scales the whole pair.
function eyes(cx, cy, gap, mood = 'calm', size = 1, ink = '#14110f', shine = '#fff') {
  const l = cx - gap / 2, r = cx + gap / 2, R = 8.6 * size;
  if (mood === 'sleepy') return `<path d="M${n1(l - R * 0.8)} ${cy} q${n1(R * 0.8)} ${n1(R)} ${n1(R * 1.6)} 0M${n1(r - R * 0.8)} ${cy} q${n1(R * 0.8)} ${n1(R)} ${n1(R * 1.6)} 0" stroke="${ink}" stroke-width="${n1(3.4 * size)}" fill="none" stroke-linecap="round"/>`;
  const e = (x) => `<ellipse cx="${n1(x)}" cy="${cy}" rx="${n1(R)}" ry="${n1(R * 1.12)}" fill="#fff"/><ellipse cx="${n1(x)}" cy="${n1(cy + R * 0.1)}" rx="${n1(R * 0.56)}" ry="${n1(R * 0.7)}" fill="${ink}"/><circle cx="${n1(x + R * 0.2)}" cy="${n1(cy - R * 0.22)}" r="${n1(R * 0.2)}" fill="#fff"/>`;
  const brow = mood === 'fierce' ? `<path d="M${n1(l - R - 2)} ${n1(cy - R * 1.2)} L${n1(l + R + 1)} ${n1(cy - R * 0.7)}M${n1(r + R + 2)} ${n1(cy - R * 1.2)} L${n1(r - R - 1)} ${n1(cy - R * 0.7)}" stroke="${ink}" stroke-width="${n1(4 * size)}" stroke-linecap="round"/>` : '';
  return e(l) + e(r) + brow;
}
const mouth = (cx, cy, kind = 'smile', ink = '#14110f', w = 7) => kind === 'grin'
  ? `<path d="M${cx - w} ${cy} q${w} ${n1(w * 1.5)} ${w * 2} 0z" fill="${ink}"/>`
  : kind === 'flat' ? `<path d="M${cx - w * 0.7} ${cy} h${n1(w * 1.4)}" stroke="${ink}" stroke-width="2.6" stroke-linecap="round"/>`
  : `<path d="M${cx - w} ${cy} q${w} ${n1(w * 0.95)} ${w * 2} 0" stroke="${ink}" stroke-width="2.8" fill="none" stroke-linecap="round"/>`;
const blush = () => '';
const gem = (x, y, r, c) => `<polygon points="${pts([[x, y - r], [x + r, y - r * 0.2], [x + r * 0.62, y + r], [x - r * 0.62, y + r], [x - r, y - r * 0.2]])}" fill="${c}"/><polygon points="${pts([[x, y - r], [x + r, y - r * 0.2], [x, y + r * 0.1]])}" fill="#fff" opacity=".35"/>`;

// Wrap a design into a full SVG. `uid` keeps gradient ids unique when many sit on one page.
// FLAT STYLE: every gradient becomes its mid-tone solid, glossy highlights are dropped.
function flatten(defs, body) {
  const solid = {}, glow = new Set();
  for (const m of defs.matchAll(/<(?:linear|radial)Gradient id="([^"]+)"[^>]*>(.*?)<\/(?:linear|radial)Gradient>/g)) {
    const stops = [...m[2].matchAll(/offset="([\d.]+)" stop-color="(#[0-9a-fA-F]{6})" stop-opacity="([\d.]+)"/g)].map((x) => [+x[1], x[2], +x[3]]);
    if (stops.some((x) => x[2] < 0.99)) { glow.add(m[1]); continue; }
    const pick = stops.reduce((a, x) => (Math.abs(x[0] - 0.45) < Math.abs(a[0] - 0.45) ? x : a), stops[0]);
    solid[m[1]] = pick[1];
  }
  let o = body.replace(/<[a-z]+ [^>]*fill="url\(#([^)]+)\)"[^>]*\/>/g, (el, id) => (glow.has(id) ? '' : el));
  o = o.replace(/url\(#([^)]+)\)/g, (_, id) => solid[id] || '#888');
  o = o.replace(/<(?:ellipse|rect|path|circle)[^>]*fill="#fff"[^>]*opacity="\.[0-4]\d?"[^>]*\/>/g, '');
  return o;
}
const wrap = (uid, defs, body, label) => `<svg viewBox="0 0 240 280" width="240" height="280" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">${flatten(defs, body)}</svg>`;

module.exports = { n1, pts, rng, mix, lighten, darken, lin, rad, shadow, spark, atmosphere, eyes, mouth, blush, gem, wrap };
