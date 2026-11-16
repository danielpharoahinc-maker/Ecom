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
  const t = (L - 1) / 9, out = [], defs = [];
  if (L >= 2) {
    defs.push(rad(`${uid}g`, [[0, color, 0.1 + t * 0.5], [1, color, 0]]));
    out.push(`<circle cx="120" cy="${y}" r="${n1(70 + t * 70)}" fill="url(#${uid}g)"/>`);
  }
  if (L >= 5) { // rotating rays
    const rays = 8 + (L - 5) * 2, R = 64 + t * 62, r = rng(L * 7 + 3), s = [];
    for (let i = 0; i < rays; i++) { const a = (i / rays) * Math.PI * 2 + 0.2, a2 = a + 0.09; s.push(`<path d="M120 ${y} L${n1(120 + Math.cos(a) * R)} ${n1(y + Math.sin(a) * R)} L${n1(120 + Math.cos(a2) * R)} ${n1(y + Math.sin(a2) * R)}Z"/>`); }
    out.push(`<g fill="${color}" opacity="${n1(0.05 + t * 0.12)}">${s.join('')}</g>`);
  }
  if (L >= 4) { // ring
    out.push(`<circle cx="120" cy="${y}" r="${n1(78 + t * 20)}" fill="none" stroke="${color}" stroke-opacity="${n1(0.18 + t * 0.3)}" stroke-width="${L >= 8 ? 2 : 1.2}" stroke-dasharray="${L >= 7 ? '2 7' : 'none'}"/>`);
  }
  if (L >= 3) { // sparkles
    const r = rng(L * 31 + 5), cnt = L - 1;
    for (let i = 0; i < cnt; i++) { const a = r() * Math.PI * 2, d = 62 + r() * 48; out.push(spark(n1(120 + Math.cos(a) * d), n1(y + Math.sin(a) * d * 0.9), n1(2.5 + r() * (2 + t * 4)), '#fff', n1(0.5 + r() * 0.5))); }
  }
  return { defs: defs.join(''), body: out.join('') };
}

// Cute eyes. mood: 'sleepy' | 'calm' | 'bright' | 'fierce'. size scales the whole pair.
function eyes(cx, cy, gap, mood = 'calm', size = 1, ink = '#14110f', shine = '#fff') {
  const l = cx - gap / 2, r = cx + gap / 2, rx = 5.2 * size, ry = (mood === 'sleepy' ? 2.2 : 6.6) * size;
  if (mood === 'sleepy') return `<path d="M${n1(l - rx)} ${cy} q${n1(rx)} ${n1(rx * 1.1)} ${n1(rx * 2)} 0M${n1(r - rx)} ${cy} q${n1(rx)} ${n1(rx * 1.1)} ${n1(rx * 2)} 0" stroke="${ink}" stroke-width="${n1(2.6 * size)}" fill="none" stroke-linecap="round"/>`;
  const e = (x) => `<ellipse cx="${n1(x)}" cy="${cy}" rx="${n1(rx)}" ry="${n1(ry)}" fill="${ink}"/><circle cx="${n1(x + 1.7 * size)}" cy="${n1(cy - 2.3 * size)}" r="${n1(1.9 * size)}" fill="${shine}"/>${mood === 'bright' ? `<circle cx="${n1(x - 1.6 * size)}" cy="${n1(cy + 2.4 * size)}" r="${n1(0.9 * size)}" fill="${shine}" opacity=".8"/>` : ''}`;
  const brow = mood === 'fierce' ? `<path d="M${n1(l - rx - 1)} ${n1(cy - ry - 3)} L${n1(l + rx)} ${n1(cy - ry + 1)}M${n1(r + rx + 1)} ${n1(cy - ry - 3)} L${n1(r - rx)} ${n1(cy - ry + 1)}" stroke="${ink}" stroke-width="${n1(2.6 * size)}" stroke-linecap="round"/>` : '';
  return e(l) + e(r) + brow;
}
const mouth = (cx, cy, kind = 'smile', ink = '#14110f', w = 7) => kind === 'grin'
  ? `<path d="M${cx - w} ${cy} q${w} ${n1(w * 1.5)} ${w * 2} 0z" fill="${ink}"/>`
  : kind === 'flat' ? `<path d="M${cx - w * 0.7} ${cy} h${n1(w * 1.4)}" stroke="${ink}" stroke-width="2.6" stroke-linecap="round"/>`
  : `<path d="M${cx - w} ${cy} q${w} ${n1(w * 0.95)} ${w * 2} 0" stroke="${ink}" stroke-width="2.8" fill="none" stroke-linecap="round"/>`;
const blush = (cx, cy, gap, c = '#ff8aa0', o = 0.35) => `<ellipse cx="${cx - gap / 2}" cy="${cy}" rx="5.5" ry="3.2" fill="${c}" opacity="${o}"/><ellipse cx="${cx + gap / 2}" cy="${cy}" rx="5.5" ry="3.2" fill="${c}" opacity="${o}"/>`;
const gem = (x, y, r, c) => `<polygon points="${pts([[x, y - r], [x + r, y - r * 0.2], [x + r * 0.62, y + r], [x - r * 0.62, y + r], [x - r, y - r * 0.2]])}" fill="${c}"/><polygon points="${pts([[x, y - r], [x + r, y - r * 0.2], [x, y + r * 0.1]])}" fill="#fff" opacity=".35"/>`;

// Wrap a design into a full SVG. `uid` keeps gradient ids unique when many sit on one page.
const wrap = (uid, defs, body, label) => `<svg viewBox="0 0 240 280" width="240" height="280" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg"><defs>${defs}</defs>${body}</svg>`;

module.exports = { n1, pts, rng, mix, lighten, darken, lin, rad, shadow, spark, atmosphere, eyes, mouth, blush, gem, wrap };
