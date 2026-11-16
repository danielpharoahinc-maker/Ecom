// 2. THE CRYSTAL: a stone that is polished by your effort. Rough pebble to a star-lit gem.
const C = require('./common.js');
const { n1, pts, rng, lin, rad, mix, lighten, darken, shadow, spark, atmosphere, eyes, mouth, blush, wrap } = C;

function shard(x, y, s, c, r = 0) { // a floating diamond shard
  return `<g transform="rotate(${r} ${x} ${y})"><polygon points="${pts([[x, y - s * 1.5], [x + s * 0.8, y], [x, y + s * 1.5], [x - s * 0.8, y]])}" fill="${c}"/><polygon points="${pts([[x, y - s * 1.5], [x + s * 0.8, y], [x, y]])}" fill="#fff" opacity=".4"/></g>`;
}
function crystal(uid, cx, base, h, w, c, facets, id) {
  const ap = [cx, base - h], sl = [cx - w / 2, base - h * 0.7], sr = [cx + w / 2, base - h * 0.7], bl = [cx - w * 0.42, base], br = [cx + w * 0.42, base], bm = [cx, base + 4];
  let s = `<polygon points="${pts([ap, sl, bl, bm])}" fill="${lighten(c, 0.28)}"/>`
    + `<polygon points="${pts([ap, sr, br, bm])}" fill="${darken(c, 0.2)}"/>`
    + `<polygon points="${pts([ap, sl, sr])}" fill="${lighten(c, 0.5)}" opacity=".95"/>`
    + `<polygon points="${pts([sl, sr, br, bm, bl])}" fill="${c}" opacity=".9"/>`;
  if (facets >= 1) s += `<polygon points="${pts([ap, [cx - w * 0.16, base - h * 0.62], [cx + w * 0.16, base - h * 0.62]])}" fill="#fff" opacity=".28"/>`
    + `<path d="M${n1(cx - w * 0.16)} ${n1(base - h * 0.62)} L${n1(cx - w * 0.2)} ${base - 6} M${n1(cx + w * 0.16)} ${n1(base - h * 0.62)} L${n1(cx + w * 0.2)} ${base - 6}" stroke="#fff" stroke-opacity=".3" stroke-width="1.2"/>`;
  if (facets >= 2) s += `<path d="M${n1(sl[0])} ${n1(sl[1])} L${n1(cx - w * 0.16)} ${n1(base - h * 0.62)} M${n1(sr[0])} ${n1(sr[1])} L${n1(cx + w * 0.16)} ${n1(base - h * 0.62)}" stroke="#fff" stroke-opacity=".5" stroke-width="1.3"/>`
    + `<polygon points="${pts([sl, [cx - w * 0.16, base - h * 0.62], [cx - w * 0.3, base - h * 0.3]])}" fill="#fff" opacity=".16"/>`;
  return s;
}

function draw(L, uid) {
  const t = (L - 1) / 9, aura = atmosphere(uid, L, L < 6 ? '#8fe6e0' : L < 10 ? '#9ff3ff' : '#ffd0f4', 150);
  let defs = aura.defs, b = aura.body + shadow(120, 58, 240);
  const dull = '#8aa7b8', vivid = L >= 10 ? '#7ae3ff' : '#2fd4c4';
  const c = mix(dull, vivid, Math.min(1, Math.max(0, (L - 3) / 5)));

  if (L <= 2) { // rough pebble
    const body = 'M62 214 Q52 168 78 138 Q108 112 148 124 Q184 140 182 184 Q180 224 138 232 Q92 238 62 214Z';
    defs += lin(`${uid}r`, [[0, '#a3a9b3'], [1, '#575d68']], 0.2, 0, 0.8, 1);
    b += `<path d="${body}" fill="url(#${uid}r)"/><path d="M78 138 Q108 112 148 124 Q120 132 98 150 Q80 160 76 178Z" fill="#fff" opacity=".22"/>`
      + `<path d="M138 140 l-10 22 l12 8 l-8 24" stroke="#3d424c" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/>`
      + `<circle cx="92" cy="206" r="3" fill="#3d424c" opacity=".35"/><circle cx="150" cy="212" r="2.4" fill="#3d424c" opacity=".35"/>`;
    if (L === 2) b += crystal(uid, 160, 142, 38, 22, '#bfe8ee', 0);
    b += eyes(112, 182, 34, L === 1 ? 'sleepy' : 'calm', 1, '#1d2026') + mouth(112, 198, 'smile', '#1d2026', 6) + blush(112, 192, 52, '#ff8aa0', 0.28);
    return wrap(uid, defs, b, `The Crystal, stage ${L}`);
  }

  const h = 124 + t * 36 + (L >= 9 ? 10 : 0), w = 92 + t * 24, base = 226;
  // side crystals (7+)
  if (L >= 7) b += `<g opacity=".95">${crystal(uid, 66, base - 2, 70 + t * 16, 44, mix(c, '#5b7bd6', 0.25), 1)}${crystal(uid, 176, base - 2, 82 + t * 18, 48, mix(c, '#c46bdc', 0.25), 1)}</g>`;
  // geode rock (8+)
  if (L >= 8) {
    defs += rad(`${uid}core`, [[0, '#ffffff', 1], [0.4, '#b6fff4', 0.8], [1, '#35d0c0', 0]]);
    b += `<path d="M44 232 Q40 206 70 200 L170 200 Q200 206 196 232 Q150 244 120 244 Q80 244 44 232Z" fill="#4a4358"/><path d="M60 214 Q64 206 80 204 L160 204 Q178 206 182 214Z" fill="#6c6480"/>`
      + `<path d="M70 210 l6 -9 l6 9 l7 -11 l7 11 l7 -9 l7 9 l7 -11 l7 11 l7 -9 l6 9" fill="none" stroke="#b6fff4" stroke-width="2.2" stroke-linejoin="round" opacity=".9"/>`;
  }
  b += `<g>${crystal(uid, 120, base, h, w, c, L >= 5 ? 2 : L >= 4 ? 1 : 0)}</g>`;
  // gloss (4+)
  if (L >= 4) b += `<path d="M${n1(120 - w * 0.34)} ${n1(base - h * 0.62)} L${n1(120 - w * 0.2)} ${n1(base - h * 0.2)}" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".45"/>`;
  // prism rainbow + beams (6+)
  if (L >= 6) {
    defs += lin(`${uid}p`, [[0, '#ff5d8f', 0.5], [0.25, '#ffd24a', 0.45], [0.5, '#5dff9b', 0.4], [0.75, '#4ac6ff', 0.45], [1, '#a46bff', 0.5]], 0, 0, 1, 1);
    b += `<polygon points="${pts([[120, base - h], [120 - w / 2, base - h * 0.7], [120 - w * 0.42, base], [120, base + 4], [120 + w * 0.42, base], [120 + w / 2, base - h * 0.7]])}" fill="url(#${uid}p)" opacity="${n1(0.25 + t * 0.3)}"/>`;
    ['#ff5d8f', '#ffd24a', '#5dff9b', '#4ac6ff'].forEach((col, i) => { b += `<path d="M${n1(120 + w * 0.3)} ${n1(base - h * 0.5)} L${n1(210)} ${n1(base - h * 0.62 + i * 9)}" stroke="${col}" stroke-width="2.2" opacity=".6" stroke-linecap="round"/>`; });
  }
  // glowing core (8+)
  if (L >= 8) b += `<circle cx="120" cy="${n1(base - h * 0.42)}" r="${n1(34 + t * 10)}" fill="url(#${uid}core)" opacity=".85"/>`;
  // face
  const fy = base - h * 0.4;
  b += eyes(120, n1(fy), 34, L >= 5 ? 'bright' : 'calm', L >= 8 ? 1.15 : 1, '#0f2a30') + mouth(120, n1(fy + 17), L >= 6 ? 'grin' : 'smile', '#0f2a30', L >= 6 ? 6.5 : 6) + blush(120, n1(fy + 11), 54, '#ff8aa0', 0.32);
  // orbiting shards (9+)
  if (L >= 9) { const r = rng(9); for (let i = 0; i < (L === 9 ? 5 : 8); i++) { const a = (i / (L === 9 ? 5 : 8)) * Math.PI * 2 + 0.4, d = 78 + r() * 22; b += shard(n1(120 + Math.cos(a) * d), n1(150 + Math.sin(a) * d * 0.7), n1(5 + r() * 4), L === 10 ? ['#ffd0f4', '#9ff3ff', '#fff'][i % 3] : '#bff7ff', n1(r() * 40 - 20)); } }
  // star on the brow (10)
  if (L >= 10) b += spark(120, n1(base - h * 0.78), 12, '#fff', 1) + spark(120, n1(base - h * 0.78), 6, '#ffd0f4', 1) + `<circle cx="120" cy="150" r="102" fill="none" stroke="#ffd0f4" stroke-opacity=".25" stroke-width="1" stroke-dasharray="1 6"/>`;
  return wrap(uid, defs, b, `The Crystal, stage ${L}`);
}
module.exports = { id: 'crystal', name: 'The Crystal', tag: 'A stone polished by your effort. Rough pebble to a star-lit gem.', accent: '#5fe3d6', stages: ['Rough Pebble', 'Chipped Quartz', 'Raw Crystal', 'Polished Gem', 'Cut Gem', 'Prism', 'Twin Crystal', 'Geode Heart', 'Crystal Titan', 'Starstone'], draw };
