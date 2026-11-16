// 10. THE KOI: a fish that climbs the falls and becomes a dragon.
const C = require('./common.js');
const { n1, rng, lin, rad, lighten, darken, shadow, spark, atmosphere, eyes, mouth, blush, wrap } = C;
const PAL = [['#d8dde4', '#7a8794'], ['#ffb27a', '#d8602a'], ['#ff8a5c', '#c13a1a'], ['#ff6a5c', '#a81f2a'], ['#ffe0a0', '#e08a2a'], ['#ffd86a', '#c07a1c'], ['#7fe0d0', '#1f8a8a'], ['#5ac8f0', '#1f6aa8'], ['#a98cff', '#4a2aa8'], ['#fff3b0', '#e0a02a']];
function draw(L, uid) {
  const [c1, c2] = PAL[L - 1], aura = atmosphere(uid, L, c1, 140);
  let defs = aura.defs, b = aura.body;
  defs += lin(`${uid}b`, [[0, lighten(c1, 0.35)], [0.5, c1], [1, c2]], 0, 0, 0, 1) + lin(`${uid}fin`, [[0, c1], [1, c2]], 0, 0, 1, 0) + rad(`${uid}wat`, [[0, '#6fd0ff', 0.35], [1, '#6fd0ff', 0]]);
  // water ripples
  b += `<ellipse cx="120" cy="232" rx="92" ry="14" fill="url(#${uid}wat)"/><ellipse cx="120" cy="232" rx="70" ry="9" fill="none" stroke="#9fe0ff" stroke-opacity=".5" stroke-width="2"/><ellipse cx="120" cy="232" rx="50" ry="6" fill="none" stroke="#9fe0ff" stroke-opacity=".4" stroke-width="1.6"/>`;
  const tilt = L >= 7 ? -6 : 0, big = L >= 7 ? 1.02 : 0.9 + L * 0.015;
  b += `<g transform="rotate(${tilt} 120 150) translate(${n1(120 * (1 - big))} ${n1(150 * (1 - big))}) scale(${big})">`;
  // dragon whiskers (7+)
  if (L >= 7) b += `<path d="M168 138 q30 -8 36 -30 M168 148 q34 6 40 26" stroke="${c1}" stroke-width="3.4" fill="none" stroke-linecap="round"/><circle cx="204" cy="108" r="3.4" fill="${lighten(c1, 0.4)}"/><circle cx="208" cy="174" r="3.4" fill="${lighten(c1, 0.4)}"/>`;
  // tail
  const tl = 22 + L * 2;
  b += `<path d="M60 150 Q22 ${n1(150 - tl)} 14 ${n1(112 - tl * 0.4)} Q38 130 52 146 Q30 160 ${n1(14)} ${n1(196 + tl * 0.4)} Q${n1(30 + 0)} ${n1(150 + tl)} 60 154Z" fill="url(#${uid}fin)" opacity=".92"/>`;
  // dorsal fin
  b += `<path d="M84 100 Q112 ${n1(72 - L * 2)} 150 96 Q124 108 84 100Z" fill="url(#${uid}fin)"/>`;
  // body
  b += `<ellipse cx="120" cy="150" rx="68" ry="54" fill="url(#${uid}b)"/>`;
  // pattern: patches grow, scales appear, then dragon scales/gold
  if (L === 1) b += `<ellipse cx="108" cy="128" rx="40" ry="14" fill="#fff" opacity=".28"/>`;
  if (L >= 2) { const R = rng(L * 5); const n = Math.min(6, L + 1); for (let i = 0; i < n; i++) b += `<ellipse cx="${n1(88 + R() * 70)}" cy="${n1(118 + R() * 44)}" rx="${n1(12 + R() * 12)}" ry="${n1(8 + R() * 9)}" fill="${L >= 6 ? '#fff' : '#fff6ea'}" opacity="${L >= 6 ? 0.55 : 0.85}"/>`; }
  if (L >= 4) for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) b += `<path d="M${n1(84 + c * 14 + (r % 2) * 7)} ${n1(128 + r * 12)} q6 7 12 0" stroke="${c2}" stroke-width="1.2" fill="none" opacity=".35"/>`;
  b += `<path d="M96 196 Q120 214 150 196" fill="${lighten(c1, 0.5)}" opacity=".5"/><ellipse cx="108" cy="124" rx="20" ry="9" fill="#fff" opacity=".3" transform="rotate(-18 108 124)"/>`;
  // pectoral fin
  b += `<path d="M112 168 Q96 ${n1(196 + L)} 124 190 Q128 178 120 168Z" fill="url(#${uid}fin)" opacity=".95"/>`;
  // face on the head end (right)
  b += eyes(152, 142, 24, L >= 7 ? 'fierce' : 'bright', 1.05, '#1a1a2a') + mouth(162, 160, 'smile', darken(c2, 0.4), 4.5) + blush(158, 154, 46, '#ff6a5a', 0.3);
  // horns (7+) and mane (8+)
  if (L >= 7) b += `<path d="M146 104 l-2 -${n1(16 + (L - 7) * 3)} l12 12Z M160 108 l4 -${n1(14 + (L - 7) * 3)} l6 14Z" fill="${lighten(c1, 0.3)}"/>`;
  if (L >= 8) b += `<path d="M100 100 q-10 -18 4 -30 q-2 16 12 24 q-6 -22 10 -32 q-2 18 12 26Z" fill="${c1}" opacity=".9"/>`;
  // crown/halo
  if (L >= 10) b += `<path d="M134 100 l6 -16 l9 10 l9 -14 l9 14 l9 -10 l6 16Z" fill="#ffd86a"/><ellipse cx="158" cy="76" rx="34" ry="7" fill="none" stroke="#fff3b0" stroke-width="2.4"/>`;
  b += '</g>';
  // waterfall spray from L>=5 and clouds from L>=9
  if (L >= 5) for (let i = 0; i < Math.min(8, L); i++) b += `<circle cx="${n1(40 + i * 24)}" cy="${n1(226 - (i % 3) * 8)}" r="${n1(2 + (i % 2) * 1.4)}" fill="#bfeaff" opacity=".8"/>`;
  if (L >= 9) b += `<g opacity=".85" fill="#fff"><ellipse cx="46" cy="226" rx="26" ry="9"/><ellipse cx="190" cy="230" rx="30" ry="10"/><ellipse cx="66" cy="218" rx="16" ry="8"/></g>`;
  return wrap(uid, defs, b, `The Koi, stage ${L}`);
}
module.exports = { id: 'koi', name: 'The Koi', tag: 'Climbs the falls and becomes a dragon.', accent: '#ff8a5c', stages: ['Pond Fish', 'Little Koi', 'Orange Koi', 'Red Koi', 'Pearl Koi', 'Golden Koi', 'Jade Koi', 'Azure Koi', 'Cloud Dragon', 'Celestial Dragon'], draw };
