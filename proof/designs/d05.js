// 5. THE SPROUT: a seed you grow. Seed to world tree.
const C = require('./common.js');
const { n1, pts, rng, lin, rad, mix, lighten, darken, shadow, spark, atmosphere, eyes, mouth, blush, wrap } = C;

const leaf = (x, y, s, r, c1, c2) => `<g transform="rotate(${r} ${x} ${y})"><path d="M${x} ${y} C${n1(x - s * 0.8)} ${n1(y - s * 0.4)} ${n1(x - s * 0.5)} ${n1(y - s * 1.3)} ${x} ${n1(y - s * 1.5)} C${n1(x + s * 0.5)} ${n1(y - s * 1.3)} ${n1(x + s * 0.8)} ${n1(y - s * 0.4)} ${x} ${y}Z" fill="${c1}"/><path d="M${x} ${y} L${x} ${n1(y - s * 1.3)}" stroke="${c2}" stroke-width="1.2" opacity=".6"/></g>`;
const puff = (uid, x, y, r, i) => `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(r)}" fill="url(#${uid}l${i % 2})"/>`;

function draw(L, uid) {
  const t = (L - 1) / 9, aura = atmosphere(uid, L, L >= 8 ? '#b9ff8a' : '#8fe07a', 140);
  let defs = aura.defs, b = aura.body + shadow(120, 62, 240);
  const g1 = L >= 10 ? '#7fe0a0' : '#4fb35a', g2 = L >= 10 ? '#d9ffc0' : '#8fdc6a';
  defs += lin(`${uid}l0`, [[0, g2], [1, g1]], 0, 0, 0, 1) + lin(`${uid}l1`, [[0, lighten(g2, 0.15)], [1, darken(g1, 0.1)]], 0, 0, 0, 1)
    + lin(`${uid}bark`, [[0, '#9a6a3c'], [0.6, '#7a4f2a'], [1, '#573719']], 0, 0, 1, 0) + lin(`${uid}pot`, [[0, '#e08a5c'], [1, '#a95a38']], 0, 0, 1, 1)
    + lin(`${uid}seed`, [[0, '#b98550'], [1, '#7a5230']], 0, 0, 0, 1) + rad(`${uid}fly`, [[0, '#fff7a8', 1], [1, '#fff7a8', 0]]);
  const R = rng(L + 40);
  const soil = (w) => `<ellipse cx="120" cy="236" rx="${w}" ry="${n1(w * 0.2)}" fill="#5a3b22"/><ellipse cx="120" cy="232" rx="${w * 0.88}" ry="${n1(w * 0.14)}" fill="#7a5230"/>`;

  if (L <= 2) {
    b += soil(54);
    b += `<ellipse cx="120" cy="212" rx="34" ry="30" fill="url(#${uid}seed)"/><ellipse cx="108" cy="198" rx="10" ry="6" fill="#fff" opacity=".25" transform="rotate(-24 108 198)"/>`;
    if (L === 2) { b += `<path d="M120 184 Q120 160 124 150" stroke="#5aa94f" stroke-width="4" fill="none" stroke-linecap="round"/>` + leaf(122, 152, 22, -40, g2, g1) + leaf(122, 156, 20, 44, g1, g1); }
    b += eyes(120, 212, 22, L === 1 ? 'sleepy' : 'calm', 0.95, '#2a1a0a') + mouth(120, 226, 'smile', '#2a1a0a', 5.5) + blush(120, 222, 38, '#ff7a6a', 0.3);
    return wrap(uid, defs, b, `The Sprout, stage ${L}`);
  }
  if (L <= 4) { // potted seedling / sapling
    const ph = L === 3 ? 58 : 70, pw = L === 3 ? 76 : 88, top = 236 - ph;
    const stem = L === 3 ? 120 : 148;
    b += `<path d="M${120 - pw / 2} ${top} L${120 + pw / 2} ${top} L${120 + pw / 2 - 8} 236 L${120 - pw / 2 + 8} 236Z" fill="url(#${uid}pot)"/><rect x="${120 - pw / 2 - 5}" y="${top - 8}" width="${pw + 10}" height="14" rx="5" fill="#f0a070"/><rect x="${120 - pw / 2 - 5}" y="${top - 8}" width="${pw + 10}" height="5" rx="2.5" fill="#fff" opacity=".3"/>`;
    b += `<path d="M120 ${top - 6} Q118 ${top - 40} 120 ${top - (L === 3 ? 60 : 96)}" stroke="#5aa94f" stroke-width="${L === 3 ? 5 : 6}" fill="none" stroke-linecap="round"/>`;
    const cnt = L === 3 ? 3 : 6, ty = top - (L === 3 ? 60 : 96);
    for (let i = 0; i < cnt; i++) { const side = i % 2 ? 1 : -1, yy = ty + 6 + Math.floor(i / 2) * 22; b += leaf(120, i === cnt - 1 ? ty : yy, 24 + (L - 3) * 4, i === cnt - 1 ? 0 : side * (44 + (i % 3) * 6), i % 2 ? g2 : g1, g1); }
    b += eyes(120, top + ph * 0.45, 30, 'calm', 1, '#4a1f0a') + mouth(120, top + ph * 0.45 + 16, L === 4 ? 'grin' : 'smile', '#4a1f0a', 6) + blush(120, top + ph * 0.45 + 10, 50, '#d84a3a', 0.3);
    return wrap(uid, defs, b, `The Sprout, stage ${L}`);
  }
  // trees: 5 young, 6 blossom, 7 fruit, 8 great, 9 ancient, 10 world
  const k = L - 5, trunkW = 30 + k * 6, trunkTop = 160 - k * 6, canR = 40 + k * 6;
  const cx = 120, cy = trunkTop - 28 - k * 3;
  // roots
  b += soil(66 + k * 3);
  if (L >= 8) b += `<path d="M${cx - trunkW / 2} 232 Q${cx - trunkW} 238 ${cx - trunkW - 22} 240 M${cx + trunkW / 2} 232 Q${cx + trunkW} 238 ${cx + trunkW + 22} 240" stroke="#7a4f2a" stroke-width="6" fill="none" stroke-linecap="round"/>`;
  if (L >= 10) b += `<path d="M${cx - trunkW - 22} 240 Q${cx - trunkW} 238 ${cx - trunkW / 2} 232 M${cx + trunkW + 22} 240 Q${cx + trunkW} 238 ${cx + trunkW / 2} 232" stroke="#ffe27a" stroke-width="2" fill="none" opacity=".9"/>`;
  // trunk
  b += `<path d="M${cx - trunkW / 2} 236 Q${cx - trunkW / 2 + 4} ${trunkTop + 40} ${cx - trunkW / 2 + 8} ${trunkTop} L${cx + trunkW / 2 - 8} ${trunkTop} Q${cx + trunkW / 2 - 4} ${trunkTop + 40} ${cx + trunkW / 2} 236Z" fill="url(#${uid}bark)"/>`;
  b += `<path d="M${cx - trunkW * 0.2} 230 q-3 -30 0 -60 M${cx + trunkW * 0.22} 228 q3 -26 0 -54" stroke="#3a2210" stroke-width="2" fill="none" opacity=".35"/>`;
  if (L >= 9) b += `<path d="M${cx - 8} ${trunkTop} q-22 -10 -34 -34 M${cx + 8} ${trunkTop} q22 -10 34 -34" stroke="url(#${uid}bark)" stroke-width="12" fill="none" stroke-linecap="round"/>`;
  // canopy
  const puffs = [[0, 0, 1], [-1, 0.45, 0.82], [1, 0.45, 0.82], [-0.55, -0.55, 0.78], [0.55, -0.55, 0.78], [0, -0.85, 0.7], [-1.3, 0.05, 0.6], [1.3, 0.05, 0.6]].slice(0, L === 5 ? 5 : 8);
  puffs.forEach(([dx, dy, s], i) => { b += puff(uid, cx + dx * canR * 0.85, cy + dy * canR * 0.8, canR * 0.62 * s, i); });
  if (L >= 6 && L <= 7) { const colr = L === 6 ? '#ffb6d0' : '#e83a3a'; for (let i = 0; i < (L === 6 ? 14 : 9); i++) { const a = R() * 6.28, d = R() * canR * 1.1; b += `<circle cx="${n1(cx + Math.cos(a) * d)}" cy="${n1(cy + Math.sin(a) * d * 0.8)}" r="${L === 6 ? 3.4 : 4.4}" fill="${colr}"/><circle cx="${n1(cx + Math.cos(a) * d - 1)}" cy="${n1(cy + Math.sin(a) * d * 0.8 - 1)}" r="1.2" fill="#fff" opacity=".7"/>`; } }
  if (L >= 8) { for (let i = 0; i < (L === 8 ? 8 : 14); i++) { const a = R() * 6.28, d = 30 + R() * 80; b += `<circle cx="${n1(cx + Math.cos(a) * d)}" cy="${n1(cy + Math.sin(a) * d * 0.9)}" r="${n1(2 + R() * 2)}" fill="url(#${uid}fly)"/><circle cx="${n1(cx + Math.cos(a) * d)}" cy="${n1(cy + Math.sin(a) * d * 0.9)}" r="1.4" fill="#fffbd0"/>`; } }
  if (L >= 9) b += [[-56, 36], [60, 40], [-30, 52], [34, 56]].map(([dx, dy]) => `<path d="M${cx + dx} ${cy + dy - 12} v16" stroke="#6bbf4e" stroke-width="1.6"/><circle cx="${cx + dx}" cy="${cy + dy + 6}" r="3.4" fill="#ffe27a"/>`).join('');
  if (L >= 10) { for (let i = 0; i < 9; i++) b += spark(n1(cx - canR + R() * canR * 2), n1(cy - canR * 0.6 + R() * canR * 1.3), n1(2.4 + R() * 3), '#fffbd0', 0.95); b += `<circle cx="${cx}" cy="${cy}" r="${canR + 26}" fill="none" stroke="#ffe27a" stroke-opacity=".55" stroke-width="1.6" stroke-dasharray="2 6"/>`; }
  // face on trunk
  const fy = trunkTop + 38;
  b += `<ellipse cx="${cx}" cy="${fy - 2}" rx="${n1(trunkW * 0.42)}" ry="22" fill="#000" opacity=".12"/>` + eyes(cx, fy, n1(trunkW * 0.46), L >= 8 ? 'bright' : 'calm', 1, '#2a1306') + mouth(cx, fy + 14, L >= 8 ? 'grin' : 'smile', '#2a1306', 6) + blush(cx, fy + 8, n1(trunkW * 0.8), '#e86a4a', 0.3);
  return wrap(uid, defs, b, `The Sprout, stage ${L}`);
}
module.exports = { id: 'sprout', name: 'The Sprout', tag: 'A seed you grow. Seed to world tree.', accent: '#8fe07a', stages: ['Seed', 'Sprout', 'Seedling', 'Sapling', 'Young Tree', 'Blossom Tree', 'Fruit Tree', 'Great Tree', 'Ancient Tree', 'World Tree'], draw };
