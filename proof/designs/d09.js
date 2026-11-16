// 9. THE ORB: a spirit/planet you grow. Pebble-sized light to a living galaxy.
const C = require('./common.js');
const { n1, rng, lin, rad, lighten, darken, shadow, spark, atmosphere, eyes, mouth, blush, wrap } = C;
const PAL = [['#c9d2de', '#6c7a8e'], ['#7fd6ff', '#2a6fb0'], ['#6ee6b0', '#1f8a68'], ['#ffd36a', '#c0701c'], ['#ff9a6a', '#b0361f'], ['#ff7ac8', '#8a2a8c'], ['#b28cff', '#4a2a9c'], ['#7aa8ff', '#1f2a8a'], ['#9dfff0', '#1f6a8a'], ['#fff3b0', '#c07a2a']];
function draw(L, uid) {
  const [c1, c2] = PAL[L - 1], aura = atmosphere(uid, L, c1, 130);
  let defs = aura.defs, b = aura.body + shadow(120, 50, 240);
  const r = 46 + L * 2.6, cy = 134;
  defs += rad(`${uid}o`, [[0, lighten(c1, 0.55), 1], [0.45, c1, 1], [1, c2, 1]], 0.35, 0.3, 0.8) + rad(`${uid}h`, [[0, c1, 0.8], [1, c1, 0]]) + lin(`${uid}r`, [[0, lighten(c1, 0.4)], [1, c2]], 0, 0, 1, 0);
  const R = rng(L * 11);
  // outer halo
  b += `<circle cx="120" cy="${cy}" r="${n1(r + 22)}" fill="url(#${uid}h)"/>`;
  // orbiting moons (behind), count grows
  const moons = Math.max(0, L - 2);
  const moonAt = (i) => { const a = (i / Math.max(1, moons)) * 6.283 + L; return [120 + Math.cos(a) * (r + 30 + (i % 2) * 8), cy + Math.sin(a) * (r * 0.32 + 14)]; };
  const behind = [], front = [];
  for (let i = 0; i < moons; i++) { const [mx, my] = moonAt(i); (my < cy ? behind : front).push(`<circle cx="${n1(mx)}" cy="${n1(my)}" r="${n1(5 + (i % 3) * 2)}" fill="${i % 2 ? lighten(c1, 0.3) : c2}"/><circle cx="${n1(mx - 1.6)}" cy="${n1(my - 1.6)}" r="1.6" fill="#fff" opacity=".6"/>`); }
  b += behind.join('');
  if (L >= 4) b += `<ellipse cx="120" cy="${cy}" rx="${n1(r + 34)}" ry="${n1(r * 0.26 + 6)}" fill="none" stroke="${c1}" stroke-opacity=".35" stroke-width="1.5"/>`;
  // rings (back half)
  const ringW = L >= 6 ? 3 : 0;
  if (L >= 6) for (let i = 0; i < Math.min(3, L - 5); i++) b += `<path d="M${n1(120 - r - 18 - i * 8)} ${cy + 4} A${n1(r + 18 + i * 8)} ${n1(r * 0.28 + i * 3)} 0 0 1 ${n1(120 + r + 18 + i * 8)} ${cy + 4}" fill="none" stroke="url(#${uid}r)" stroke-width="${6 - i}" opacity=".8"/>`;
  // body
  b += `<circle cx="120" cy="${cy}" r="${r}" fill="url(#${uid}o)"/>`;
  if (L >= 2) { for (let i = 0; i < L; i++) { const a = R() * 6.28, d = R() * r * 0.7; b += `<ellipse cx="${n1(120 + Math.cos(a) * d)}" cy="${n1(cy + Math.sin(a) * d)}" rx="${n1(5 + R() * 9)}" ry="${n1(3 + R() * 5)}" fill="${c2}" opacity=".28" transform="rotate(${n1(R() * 60 - 30)} ${n1(120 + Math.cos(a) * d)} ${n1(cy + Math.sin(a) * d)})"/>`; } }
  if (L >= 5) b += `<path d="M${120 - r} ${cy - 8} q${r * 0.5} 14 ${r} 0 t${r} 0" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="3"/><path d="M${120 - r + 6} ${cy + 22} q${r * 0.5} 12 ${r - 6} 0 t${r - 6} 0" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="2.4"/>`;
  b += `<ellipse cx="${n1(120 - r * 0.38)}" cy="${n1(cy - r * 0.45)}" rx="${n1(r * 0.24)}" ry="${n1(r * 0.14)}" fill="#fff" opacity=".45" transform="rotate(-30 ${n1(120 - r * 0.38)} ${n1(cy - r * 0.45)})"/>`;
  b += eyes(120, cy + 6, n1(r * 0.62), L >= 8 ? 'bright' : L === 1 ? 'sleepy' : 'calm', 1.1, '#1a2230') + mouth(120, cy + 24, L >= 4 ? 'grin' : 'smile', '#1a2230', 6) + blush(120, cy + 16, n1(r * 1.15), '#ff7a8a', 0.28);
  // front rings / moons
  if (L >= 6) for (let i = 0; i < Math.min(3, L - 5); i++) b += `<path d="M${n1(120 - r - 18 - i * 8)} ${cy + 4} A${n1(r + 18 + i * 8)} ${n1(r * 0.28 + i * 3)} 0 0 0 ${n1(120 + r + 18 + i * 8)} ${cy + 4}" fill="none" stroke="url(#${uid}r)" stroke-width="${6 - i}"/>`;
  b += front.join('');
  // stars/galaxy swirl (8+)
  if (L >= 8) for (let i = 0; i < 14; i++) { const a = i * 0.7, d = 20 + i * 5; b += `<circle cx="${n1(120 + Math.cos(a) * d * 1.3)}" cy="${n1(cy + Math.sin(a) * d * 0.9)}" r="${n1(1 + (i % 3) * 0.7)}" fill="#fff" opacity=".85"/>`; }
  if (L >= 9) b += `<path d="M120 ${cy - r - 36} l4 12 l12 4 l-12 4 l-4 12 l-4 -12 l-12 -4 l12 -4Z" fill="#fff3b0"/>`;
  if (L >= 10) b += `<ellipse cx="120" cy="${cy - r - 22}" rx="34" ry="7" fill="none" stroke="#fff3b0" stroke-width="2.6"/>`;
  return wrap(uid, defs, b, `The Orb, stage ${L}`);
}
module.exports = { id: 'orb', name: 'The Orb', tag: 'A pebble of light that becomes a galaxy.', accent: '#b28cff', stages: ['Pebble', 'Dew', 'Moss Moon', 'Sun Drop', 'Ember World', 'Ringed World', 'Violet Planet', 'Midnight Planet', 'Aurora World', 'Star'], draw };
