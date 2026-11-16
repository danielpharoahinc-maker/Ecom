// 3. THE EMBER: a flame that you keep alive. Spark to solar phoenix.
const C = require('./common.js');
const { n1, rng, lin, rad, mix, lighten, darken, shadow, spark, atmosphere, eyes, mouth, blush, wrap } = C;

const flame = (cx, by, h, w, sway = 0) => `M${n1(cx + sway)} ${n1(by - h)} C${n1(cx + w * 0.12)} ${n1(by - h * 0.72)} ${n1(cx + w * 0.64)} ${n1(by - h * 0.5)} ${n1(cx + w * 0.5)} ${n1(by - h * 0.18)} C${n1(cx + w * 0.4)} ${n1(by + 5)} ${n1(cx - w * 0.4)} ${n1(by + 5)} ${n1(cx - w * 0.5)} ${n1(by - h * 0.18)} C${n1(cx - w * 0.64)} ${n1(by - h * 0.5)} ${n1(cx - w * 0.12)} ${n1(by - h * 0.72)} ${n1(cx + sway)} ${n1(by - h)}Z`;
const feather = (x, y, len, ang, wd, c1, c2, uid, i) => `<g transform="rotate(${ang} ${x} ${y})"><path d="M${x} ${y} C${n1(x - wd)} ${n1(y - len * 0.4)} ${n1(x - wd * 0.6)} ${n1(y - len * 0.85)} ${x} ${n1(y - len)} C${n1(x + wd * 0.6)} ${n1(y - len * 0.85)} ${n1(x + wd)} ${n1(y - len * 0.4)} ${x} ${y}Z" fill="url(#${uid}f${i % 2})"/></g>`;

function draw(L, uid) {
  const t = (L - 1) / 9, gold = L >= 9, aura = atmosphere(uid, L, gold ? '#fff0a0' : '#ff9d3a', 150);
  let defs = aura.defs, b = aura.body;
  const o1 = gold ? '#ffb020' : '#ff4d1a', o2 = gold ? '#ffd23f' : '#ff8a24', o3 = gold ? '#fff2a8' : '#ffc23a', core = gold ? '#ffffff' : '#fff1b0';
  defs += lin(`${uid}a`, [[0, o2], [1, o1]], 0, 0, 0, 1) + lin(`${uid}b`, [[0, o3], [1, o2]], 0, 0, 0, 1) + lin(`${uid}c`, [[0, core], [1, o3]], 0, 0, 0, 1)
    + lin(`${uid}f0`, [[0, o2], [1, o1]], 0, 0, 0, 1) + lin(`${uid}f1`, [[0, o3], [1, o2]], 0, 0, 0, 1)
    + lin(`${uid}wood`, [[0, '#8b5a2e'], [1, '#4d2f16']], 0, 0, 1, 0) + rad(`${uid}glow`, [[0, o3, 0.9], [1, o1, 0]]);
  b += shadow(120, 56, 240);
  const ground = (y) => `<ellipse cx="120" cy="${y}" rx="60" ry="9" fill="url(#${uid}glow)" opacity=".7"/>`;

  // base objects
  if (L === 1) b += `<ellipse cx="120" cy="228" rx="16" ry="6" fill="#2a2522"/>`;
  if (L === 2) b += `<path d="M82 232 Q76 196 104 184 Q140 172 160 196 Q172 226 150 236Z" fill="#2b2624"/><path d="M104 184 Q128 176 148 190" stroke="#ff7a2a" stroke-width="3" fill="none"/><path d="M94 208 L112 214 L104 226 M140 200 L148 216" stroke="#ff7a2a" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".9"/>`;
  if (L === 3) b += `<rect x="104" y="196" width="32" height="40" rx="5" fill="#f1e6cf"/><rect x="104" y="196" width="32" height="8" rx="4" fill="#fff" opacity=".5"/><path d="M110 204 q-2 10 2 14" stroke="#e6d6b5" stroke-width="3" fill="none"/>${ground(236)}`;
  if (L === 4) b += `<path d="M110 200 L130 200 L136 236 L104 236Z" fill="url(#${uid}wood)"/><rect x="100" y="194" width="40" height="9" rx="3" fill="#2f2a2a"/><rect x="100" y="194" width="40" height="3" fill="#fff" opacity=".2"/>${ground(238)}`;
  if (L >= 5 && L <= 6) b += `${ground(238)}<g><rect x="70" y="222" width="100" height="16" rx="8" fill="#5b3a1e" transform="rotate(-8 120 230)"/><rect x="70" y="222" width="100" height="16" rx="8" fill="#6d4624" transform="rotate(8 120 230)"/></g>`;
  if (L >= 7) b += ground(238);

  // wings / plumage
  if (L >= 7) {
    const n = L === 7 ? 3 : L === 8 ? 4 : L === 9 ? 5 : 6, len = 50 + (L - 7) * 12, spread = 20 + (L - 7) * 4;
    for (let i = 0; i < n; i++) { const a = 38 + i * spread, k = i; b += feather(106, 168, len + (n - i) * 3, -a, 9 + L, 0, 0, uid, k) + feather(134, 168, len + (n - i) * 3, a, 9 + L, 0, 0, uid, k); }
  }
  if (L >= 8) for (let i = 0; i < (L - 6); i++) b += feather(120, 214, 38 + i * 10, (i - (L - 7) / 2) * 12, 8, 0, 0, uid, i + 1).replace('rotate(', 'rotate(180 120 214) rotate(');

  // the flame
  const sizes = { 1: [46, 30], 2: [58, 40], 3: [70, 46], 4: [86, 56], 5: [112, 78], 6: [128, 86], 7: [124, 84], 8: [120, 82], 9: [124, 86], 10: [130, 92] }[L];
  const base = L === 1 ? 226 : L === 2 ? 190 : L === 3 ? 202 : L === 4 ? 198 : L === 5 || L === 6 ? 226 : 230;
  const [h, w] = sizes;
  b += `<path d="${flame(120, base, h, w, 3)}" fill="url(#${uid}a)"/>`;
  if (L >= 6) { // side tongues
    b += `<path d="${flame(120 - w * 0.42, base - 6, h * 0.5, w * 0.34, -6)}" fill="url(#${uid}a)"/><path d="${flame(120 + w * 0.42, base - 6, h * 0.55, w * 0.34, 6)}" fill="url(#${uid}a)"/>`;
  }
  b += `<path d="${flame(120, base - 2, h * 0.82, w * 0.74, 2)}" fill="url(#${uid}b)"/><path d="${flame(120, base - 4, h * 0.56, w * 0.46, 1)}" fill="url(#${uid}c)"/>`;
  // face on the inner flame
  const fy = base - h * 0.34;
  if (L >= 2) b += eyes(120, n1(fy), n1(w * 0.4), L === 2 ? 'calm' : L >= 6 ? 'bright' : 'calm', L >= 8 ? 1.15 : 0.95, '#4a1a08') + mouth(120, n1(fy + 13), L >= 5 ? 'grin' : 'smile', '#4a1a08', 5.5) + blush(120, n1(fy + 9), n1(w * 0.58), '#ff4d1a', 0.3);
  else b += eyes(120, n1(base - 18), 14, 'sleepy', 0.7, '#4a1a08');
  // crest for phoenix
  if (L >= 8) b += `<path d="M112 ${n1(base - h + 6)} q-6 -16 -16 -22 M120 ${n1(base - h)} q0 -20 -2 -30 M128 ${n1(base - h + 6)} q6 -16 16 -22" stroke="url(#${uid}a)" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  // sparks flying up
  const r = rng(L * 13 + 2); for (let i = 0; i < Math.min(10, 2 + L); i++) b += `<circle cx="${n1(70 + r() * 100)}" cy="${n1(60 + r() * 120)}" r="${n1(1.2 + r() * 2.2)}" fill="${o3}" opacity="${n1(0.4 + r() * 0.6)}"/>`;
  // sun disc behind the solar phoenix
  if (L >= 10) b = `<circle cx="120" cy="140" r="64" fill="#fff4b0" opacity=".16"/><circle cx="120" cy="140" r="86" fill="none" stroke="#fff4b0" stroke-opacity=".5" stroke-width="2"/>` + b + `<ellipse cx="120" cy="${n1(base - h - 22)}" rx="30" ry="7" fill="none" stroke="#fff" stroke-width="2.4"/>`;
  return wrap(uid, defs, b, `The Ember, stage ${L}`);
}
module.exports = { id: 'ember', name: 'The Ember', tag: 'A flame you keep alive. Spark to solar phoenix.', accent: '#ff8a24', stages: ['Spark', 'Ember', 'Candle Flame', 'Torch', 'Bonfire Imp', 'Blaze', 'Flame Sprite', 'Phoenix Chick', 'Phoenix', 'Solar Phoenix'], draw };
