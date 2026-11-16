// 6. THE SENTINEL: a robot you build, upgrade and finally ascend. Scrap bot to celestial automaton.
const C = require('./common.js');
const { n1, pts, rng, lin, rad, mix, lighten, darken, shadow, spark, atmosphere, eyes, mouth, blush, gem, wrap } = C;

const PAL = [null,
  { b: ['#a8744a', '#6a4326'], t: '#c7894f', glow: '#7ad7ff' }, { b: ['#b8bdc4', '#7c838d'], t: '#d3d8de', glow: '#7ad7ff' },
  { b: ['#c9d0d8', '#8993a0'], t: '#e3e8ee', glow: '#6fe1ff' }, { b: ['#c9d0d8', '#8993a0'], t: '#e3e8ee', glow: '#6fe1ff' },
  { b: ['#d6dde5', '#96a2b0'], t: '#eef2f6', glow: '#4ff0e6' }, { b: ['#f2dc8a', '#b98a22'], t: '#fff0b8', glow: '#4ff0e6' },
  { b: ['#f2dc8a', '#b98a22'], t: '#fff0b8', glow: '#7affc8' }, { b: ['#f6e6a4', '#c4952a'], t: '#fff6d2', glow: '#9dfff0' },
  { b: ['#f8ecb4', '#c9992e'], t: '#fffbe6', glow: '#b6fff6' }, { b: ['#ffffff', '#d9c680'], t: '#ffffff', glow: '#ffe9a0' },
];
function draw(L, uid) {
  const p = PAL[L], t = (L - 1) / 9, aura = atmosphere(uid, L, p.glow, 150);
  let defs = aura.defs, b = aura.body;
  defs += lin(`${uid}m`, [[0, p.t], [0.5, p.b[0]], [1, p.b[1]]], 0, 0, 0.5, 1) + lin(`${uid}d`, [[0, darken(p.b[1], 0.3)], [1, darken(p.b[1], 0.55)]], 0, 0, 0, 1) + rad(`${uid}c`, [[0, '#fff', 1], [0.4, p.glow, 0.9], [1, p.glow, 0]]) + lin(`${uid}scr`, [[0, '#0e1a22'], [1, '#08111a']], 0, 0, 0, 1);
  const big = L >= 9 ? 1.1 : 1, fy = L >= 10 ? -12 : 0;
  b += shadow(120, 54 * big, 240);
  b += `<g transform="translate(${n1(120 * (1 - big))} ${n1(236 * (1 - big) + fy)}) scale(${big})">`;
  // wings (7+)
  if (L >= 7) {
    const span = L === 7 ? 1 : L === 8 ? 1.15 : L === 9 ? 1.3 : 1.5, wing = (s) => [0, 1, 2, 3].map((i) => `<path d="M${120 + s * 46} ${150 - i * 4} L${n1(120 + s * (74 + i * 12 * span))} ${n1(110 - i * 14 * span)} L${n1(120 + s * (62 + i * 10 * span))} ${n1(130 - i * 8)}Z" fill="${L >= 10 ? '#fff6c8' : p.b[0]}" opacity="${L >= 10 ? 0.85 : 1}"/>`).join('');
    b += wing(-1) + wing(1);
    if (L >= 10) b += `<path d="M${120 - 46} 150 L${120 - 110} 100 M${120 + 46} 150 L${120 + 110} 100" stroke="${p.glow}" stroke-width="2" opacity=".8"/>`;
  }
  // cape (9+)
  if (L >= 9) b += `<path d="M84 150 Q60 220 74 236 L166 236 Q180 220 156 150Z" fill="#b8302f" opacity=".95"/><path d="M84 150 Q70 200 76 230" stroke="#fff" stroke-opacity=".25" stroke-width="3" fill="none"/>`;
  // legs
  b += `<rect x="92" y="212" width="20" height="24" rx="6" fill="url(#${uid}d)"/><rect x="128" y="212" width="20" height="24" rx="6" fill="url(#${uid}d)"/><rect x="86" y="228" width="32" height="10" rx="5" fill="url(#${uid}m)"/><rect x="122" y="228" width="32" height="10" rx="5" fill="url(#${uid}m)"/>`;
  // torso
  b += `<rect x="80" y="150" width="80" height="68" rx="16" fill="url(#${uid}m)"/><rect x="80" y="150" width="80" height="14" rx="7" fill="#fff" opacity=".28"/>`;
  if (L >= 4) b += `<path d="M92 160 L148 160 L142 204 L98 204Z" fill="${p.b[1]}" opacity=".28"/><path d="M92 160 L148 160" stroke="#fff" stroke-opacity=".4" stroke-width="2"/>`;
  b += `<circle cx="120" cy="184" r="${L >= 8 ? 13 : 9}" fill="${L >= 8 ? `url(#${uid}c)` : '#1b2a33'}"/>${L >= 8 ? '' : `<circle cx="120" cy="184" r="4" fill="${p.glow}"/>`}`;
  // arms
  b += `<rect x="60" y="156" width="20" height="46" rx="10" fill="url(#${uid}d)"/><rect x="160" y="156" width="20" height="46" rx="10" fill="url(#${uid}d)"/><circle cx="70" cy="204" r="9" fill="url(#${uid}m)"/><circle cx="170" cy="204" r="9" fill="url(#${uid}m)"/>`;
  // shoulder pads (4+)
  if (L >= 4) b += `<path d="M54 160 Q56 140 80 144 L82 164Z" fill="url(#${uid}m)"/><path d="M186 160 Q184 140 160 144 L158 164Z" fill="url(#${uid}m)"/>`;
  if (L >= 9) b += `<rect x="46" y="138" width="14" height="26" rx="4" fill="${p.b[1]}"/><rect x="180" y="138" width="14" height="26" rx="4" fill="${p.b[1]}"/>`;
  // head
  b += `<rect x="76" y="86" width="88" height="66" rx="20" fill="url(#${uid}m)"/><rect x="76" y="86" width="88" height="16" rx="8" fill="#fff" opacity=".3"/>`;
  b += `<rect x="86" y="100" width="68" height="40" rx="13" fill="url(#${uid}scr)"/><rect x="86" y="100" width="68" height="12" rx="6" fill="#fff" opacity=".07"/>`;
  // face: glowing eyes on the screen
  const eye = (x) => L === 1 ? `<rect x="${x - 6}" y="112" width="12" height="4" rx="2" fill="${p.glow}" opacity=".7"/>` : `<rect x="${x - 5.5}" y="${L >= 5 ? 108 : 110}" width="11" height="${L >= 5 ? 18 : 14}" rx="5.5" fill="${p.glow}"/><rect x="${x - 3}" y="${L >= 5 ? 111 : 113}" width="3.5" height="4" rx="1.5" fill="#fff"/>`;
  b += eye(106) + eye(134);
  b += `<path d="M110 132 q10 8 20 0" stroke="${p.glow}" stroke-width="2.6" fill="none" stroke-linecap="round"/>` + `<ellipse cx="94" cy="132" rx="4" ry="2.4" fill="${p.glow}" opacity=".35"/><ellipse cx="146" cy="132" rx="4" ry="2.4" fill="${p.glow}" opacity=".35"/>`;
  if (L === 1) b += `<path d="M80 100 l8 8 l-10 6" stroke="#4a2a14" stroke-width="2.2" fill="none"/><circle cx="90" cy="144" r="2" fill="#4a2a14"/><circle cx="150" cy="96" r="2" fill="#4a2a14"/>`; // rust
  // antenna
  if (L >= 2) b += `<rect x="117" y="68" width="6" height="20" rx="3" fill="url(#${uid}d)"/><circle cx="120" cy="64" r="${L >= 5 ? 7 : 5}" fill="${p.glow}"/><circle cx="118" cy="62" r="2" fill="#fff"/>`;
  else b += `<path d="M120 86 q-6 -10 6 -18" stroke="#6a4326" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  if (L >= 5) b += `<rect x="62" y="108" width="14" height="28" rx="6" fill="url(#${uid}d)"/><rect x="164" y="108" width="14" height="28" rx="6" fill="url(#${uid}d)"/>`; // ear thrusters
  if (L >= 6) b += `<rect x="108" y="150" width="24" height="6" rx="3" fill="${p.b[1]}"/>` + gem(120, 160, 4, '#e03a4a');
  // halo (10)
  if (L >= 10) b += `<ellipse cx="120" cy="64" rx="38" ry="8" fill="none" stroke="#ffe9a0" stroke-width="3.4"/><ellipse cx="120" cy="64" rx="38" ry="8" fill="none" stroke="#fff" stroke-width="1"/>`;
  b += '</g>';
  return wrap(uid, defs, b, `The Sentinel, stage ${L}`);
}
module.exports = { id: 'sentinel', name: 'The Sentinel', tag: 'A robot you upgrade. Scrap bot to celestial automaton.', accent: '#6fe1ff', stages: ['Scrap Bot', 'Tin Bot', 'Steel Bot', 'Armoured Bot', 'Jet Bot', 'Gilded Bot', 'Winged Guardian', 'Core Mech', 'Titan', 'Celestial Automaton'], draw };
