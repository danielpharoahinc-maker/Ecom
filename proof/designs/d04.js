// 4. THE CAIRN: stones stacked one on another, the way hikers mark a path. Pebble to celestial obelisk.
const C = require('./common.js');
const { n1, pts, rng, lin, rad, mix, lighten, darken, shadow, spark, atmosphere, eyes, mouth, blush, wrap } = C;

function stone(uid, cx, cy, w, h, c, rot = 0, i = 0) {
  return `<g transform="rotate(${rot} ${cx} ${cy})"><rect x="${n1(cx - w / 2)}" y="${n1(cy - h / 2)}" width="${w}" height="${h}" rx="${n1(Math.min(h, w) * 0.42)}" fill="${c}"/>`
    + `<rect x="${n1(cx - w / 2)}" y="${n1(cy - h / 2)}" width="${w}" height="${n1(h * 0.5)}" rx="${n1(Math.min(h, w) * 0.42)}" fill="#fff" opacity=".16"/>`
    + `<rect x="${n1(cx - w / 2)}" y="${n1(cy + h * 0.12)}" width="${w}" height="${n1(h * 0.38)}" rx="${n1(Math.min(h, w) * 0.3)}" fill="#000" opacity=".16"/></g>`;
}
function draw(L, uid) {
  const t = (L - 1) / 9, glowC = L >= 8 ? '#5ff0e0' : '#9fb8a0', aura = atmosphere(uid, L, L >= 8 ? '#5ff0e0' : '#b8d4b0', 150);
  let defs = aura.defs, b = aura.body + shadow(120, 56, 240);
  const g = ['#8d96a0', '#7a828c', '#9aa3ac', '#6f7882', '#a4acb4'], rune = '#5ff0e0';
  defs += rad(`${uid}core`, [[0, '#d9fff8', 0.95], [1, rune, 0]]);
  const R = rng(4);

  if (L <= 6) { // stones: 1, 2, 3, 3+moss, totem(4 stones), carved totem
    const stones = [[120, 214, 100, 46, g[0], 0], [118, 174, 80, 40, g[1], -3], [122, 138, 60, 34, g[2], 3], [120, 108, 40, 28, g[3], -2]];
    const count = L === 1 ? 1 : L === 2 ? 2 : L === 3 ? 3 : 4;
    const order = L === 1 ? [[120, 212, 92, 62, g[0], 0]] : stones.slice(0, count);
    order.forEach((s, i) => { b += stone(uid, ...s.slice(0, 5), s[5], i); });
    const faceStone = L === 1 ? [120, 212] : L <= 3 ? [order[0][0], order[0][1]] : [order[1][0], order[1][1]];
    if (L >= 4) { // moss + sprout
      b += `<path d="M82 196 q10 -9 22 -3 q9 5 14 -2" stroke="#7fbf5e" stroke-width="7" fill="none" stroke-linecap="round" opacity=".95"/><path d="M88 198 q6 -6 12 -2" stroke="#a9de7e" stroke-width="3" fill="none" stroke-linecap="round"/>`
        + `<path d="M120 ${count === 4 ? 94 : 124} q0 -14 -2 -22" stroke="#6bbf4e" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="112" cy="${count === 4 ? 76 : 106}" rx="8" ry="4.5" transform="rotate(-24 112 ${count === 4 ? 76 : 106})" fill="#8fd66a"/><ellipse cx="127" cy="${count === 4 ? 74 : 104}" rx="8" ry="4.5" transform="rotate(24 127 ${count === 4 ? 74 : 104})" fill="#a9e47e"/>`;
    }
    if (L >= 6) { // glowing runes
      defs += '';
      const runes = (x, y, s) => `<path d="M${x - s} ${y + s} L${x} ${y - s} L${x + s} ${y + s} M${x - s * 0.6} ${y + s * 0.2} H${x + s * 0.6}" stroke="${rune}" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".95"/>`;
      b += runes(86, 214, 6) + runes(154, 212, 6) + runes(96, 176, 5) + runes(144, 176, 5) + runes(120, 140, 4.5);
    }
    const fy = faceStone[1] - (L === 1 ? 2 : 0);
    b += eyes(120, fy - 2, 32, L === 1 ? 'sleepy' : 'calm', 1, '#1b1f24') + mouth(120, fy + 13, 'smile', '#1b1f24', 6) + blush(120, fy + 8, 50, '#ff8aa0', 0.26);
    if (L === 1) b += `<circle cx="96" cy="230" r="3" fill="#000" opacity=".2"/>`;
    return wrap(uid, defs, b, `The Cairn, stage ${L}`);
  }

  // 7+: standing stones. monolith (7), glowing runestone (8), temple pillar (9), celestial obelisk (10)
  const top = L === 7 ? 70 : L === 8 ? 62 : L === 9 ? 52 : 54, wBase = L === 7 ? 80 : 78;
  const slab = `${pts([[120 - wBase / 2 + 6, 236], [120 - wBase / 2 + 14, top + 18], [120 - 22, top], [120 + 22, top], [120 + wBase / 2 - 14, top + 18], [120 + wBase / 2 - 6, 236]])}`;
  defs += lin(`${uid}s`, [[0, '#a7b0ba'], [0.5, '#8a939e'], [1, '#6a727c']], 0, 0, 1, 0);
  if (L === 9) { // pillar: base, shaft, capital
    b += `<rect x="64" y="222" width="112" height="16" rx="4" fill="#8a939e"/><rect x="72" y="212" width="96" height="12" rx="3" fill="#9aa3ac"/><rect x="82" y="86" width="76" height="130" fill="url(#${uid}s)"/>`
      + `<rect x="74" y="72" width="92" height="16" rx="4" fill="#a4acb4"/><rect x="66" y="60" width="108" height="14" rx="4" fill="#b4bcc4"/>`
      + [96, 110, 130, 144].map((x) => `<rect x="${x}" y="92" width="3" height="120" fill="#000" opacity=".12"/>`).join('');
  } else {
    b += `<polygon points="${slab}" fill="url(#${uid}s)"/><polygon points="${pts([[120 - 22, top], [120 + 22, top], [120 + wBase / 2 - 14, top + 18], [120 - wBase / 2 + 14, top + 18]])}" fill="#fff" opacity=".18"/>`;
    if (L === 10) b += `<polygon points="${pts([[120, top - 30], [120 + 22, top], [120 - 22, top]])}" fill="#ffd96a"/><polygon points="${pts([[120, top - 30], [120 + 22, top], [120, top + 2]])}" fill="#fff" opacity=".4"/>` + spark(120, top - 44, 9, '#fff') + `<ellipse cx="120" cy="150" rx="84" ry="14" fill="none" stroke="${rune}" stroke-width="2" opacity=".8"/><ellipse cx="120" cy="150" rx="84" ry="14" fill="none" stroke="#fff" stroke-width=".8" opacity=".9" transform="rotate(-8 120 150)"/>`;
  }
  const cy = L === 9 ? 150 : 150;
  // runes down the sides
  const rr = (x, y, s) => `<path d="M${x - s} ${y + s} L${x} ${y - s} L${x + s} ${y + s} M${x - s * 0.6} ${y + s * 0.3} H${x + s * 0.6}" stroke="${rune}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  if (L >= 8) b += `<circle cx="120" cy="${cy}" r="${L === 8 ? 40 : 46}" fill="url(#${uid}core)"/>` + [[92, 96], [148, 96], [90, 196], [150, 196], [120, 90]].map(([x, y]) => rr(x, y, 5)).join('');
  else b += [[96, 100], [144, 100], [94, 200], [146, 200]].map(([x, y]) => rr(x, y, 4.5)).join('');
  b += eyes(120, cy, 34, L >= 8 ? 'bright' : 'calm', L >= 8 ? 1.15 : 1, '#101418') + mouth(120, cy + 16, L >= 8 ? 'grin' : 'smile', '#101418', 6.5) + blush(120, cy + 10, 56, '#ff8aa0', 0.25);
  // floating stones (8+)
  if (L >= 8) [[52, 110, 18, 12, -12], [190, 96, 22, 14, 10], [44, 190, 14, 10, 14], [196, 186, 16, 11, -8]].slice(0, L === 8 ? 2 : 4).forEach(([x, y, w, h, r]) => { b += stone(uid, x, y, w, h, g[R() * 4 | 0], r); });
  if (L >= 10) { [[64, 70], [180, 60], [30, 150], [210, 140]].forEach(([x, y]) => { b += spark(x, y, 5, '#fff'); }); }
  return wrap(uid, defs, b, `The Cairn, stage ${L}`);
}
module.exports = { id: 'cairn', name: 'The Cairn', tag: 'Stones stacked the way hikers mark a path. Pebble to celestial obelisk.', accent: '#86e0c8', stages: ['Pebble', 'Two Stones', 'Small Cairn', 'Mossy Cairn', 'Totem', 'Runed Totem', 'Monolith', 'Runestone', 'Temple Pillar', 'Celestial Obelisk'], draw };
