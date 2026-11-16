// 7. THE HATCHLING: an egg that hatches and grows into a dragon.
const C = require('./common.js');
const { n1, rng, lin, rad, lighten, darken, shadow, spark, atmosphere, eyes, mouth, blush, wrap } = C;
const PAL = ['#f3e6c8', '#f3e6c8', '#9be08a', '#7fd0a0', '#4fc2b0', '#3aa8d8', '#7a8cf0', '#a678f0', '#e06ad0', '#f2c24a'];
function draw(L, uid) {
  const col = PAL[L - 1], dk = darken(col, 0.28), lt = lighten(col, 0.3), aura = atmosphere(uid, L, L >= 9 ? '#ffd86a' : lt, 140);
  let defs = aura.defs, b = aura.body + shadow(120, 60, 240);
  defs += lin(`${uid}b`, [[0, lt], [0.55, col], [1, dk]], 0, 0, 0.3, 1) + lin(`${uid}w`, [[0, lighten(col, 0.5)], [1, col]], 0, 0, 0, 1) + lin(`${uid}f`, [[0, '#ffe08a'], [1, '#ff7a2a']], 0, 0, 0, 1) + lin(`${uid}egg`, [[0, '#fff6dc'], [1, '#d9c79a']], 0, 0, 1, 1);
  const spots = (cx, cy, r, n, c) => { const R = rng(L * 7 + 3); let s = ''; for (let i = 0; i < n; i++) s += `<ellipse cx="${n1(cx + (R() - 0.5) * r * 1.5)}" cy="${n1(cy + (R() - 0.5) * r * 1.6)}" rx="${n1(3 + R() * 4)}" ry="${n1(2 + R() * 3)}" fill="${c}" opacity=".6"/>`; return s; };
  if (L <= 2) { // egg, then cracked egg
    b += `<path d="M120 80 C168 80 188 150 188 190 C188 226 158 238 120 238 C82 238 52 226 52 190 C52 150 72 80 120 80Z" fill="url(#${uid}egg)"/>` + spots(120, 170, 70, 7, '#b8a06a');
    b += `<ellipse cx="96" cy="130" rx="12" ry="22" fill="#fff" opacity=".28" transform="rotate(14 96 130)"/>`;
    if (L === 2) b += `<path d="M66 156 L84 142 L98 160 L116 140 L134 160 L152 142 L172 158" stroke="#5a4326" stroke-width="3" fill="none" stroke-linejoin="round"/><path d="M84 142 L90 126 M134 160 L130 176" stroke="#5a4326" stroke-width="2" fill="none"/>`;
    b += eyes(120, 196, 34, L === 1 ? 'sleepy' : 'calm', 1.05, '#3a2a14') + mouth(120, 212, 'smile', '#3a2a14', 6) + blush(120, 206, 56, '#e0805a', 0.28);
    return wrap(uid, defs, b, `The Hatchling, stage ${L}`);
  }
  const s = 0.9 + (L - 3) * 0.045, wingSpan = Math.max(0, L - 3), horns = L >= 4;
  b += `<g transform="translate(${n1(120 * (1 - s))} ${n1(238 * (1 - s))}) scale(${s})">`;
  // egg shell base (stages 3-4), tail
  b += `<path d="M168 214 Q214 214 210 176 Q206 196 188 198" fill="${col}"/><path d="M210 176 l12 -12 l-4 18Z" fill="${dk}"/>`;
  // wings
  if (L >= 4) { const W = (sd) => { const w = 22 + wingSpan * 6; return `<path d="M${120 + sd * 44} 160 Q${120 + sd * (70 + w)} ${120 - w * 0.6} ${120 + sd * (86 + w)} ${110 - w * 0.4} Q${120 + sd * (84 + w * 0.5)} ${150} ${120 + sd * 52} 186Z" fill="${L >= 9 ? 'url(#' + uid + 'f)' : dk}"/><path d="M${120 + sd * 46} 164 Q${120 + sd * (64 + w * 0.6)} 140 ${120 + sd * (84 + w * 0.9)} 114" stroke="${lt}" stroke-width="2" fill="none" opacity=".6"/>`; }; b += W(-1) + W(1); }
  // body
  b += `<ellipse cx="120" cy="186" rx="58" ry="54" fill="url(#${uid}b)"/><ellipse cx="120" cy="204" rx="34" ry="34" fill="url(#${uid}w)"/>`;
  for (let i = 0; i < 5; i++) b += `<path d="M${n1(96 + i * 0)} ${196 + i * 7} q24 6 48 0" stroke="${col}" stroke-width="1.6" fill="none" opacity=".55"/>`;
  b += `<ellipse cx="68" cy="222" rx="14" ry="9" fill="${dk}"/><ellipse cx="172" cy="222" rx="14" ry="9" fill="${dk}"/><path d="M60 224 l-3 6 M68 226 l-1 6 M76 224 l2 6" stroke="${lt}" stroke-width="2.4" stroke-linecap="round"/>`;
  // spikes
  if (L >= 5) for (let i = 0; i < 4; i++) b += `<path d="M${112 + i * 0} ${140 + i * 0}Z"/>`;
  if (L >= 5) for (let i = 0; i < 3 + (L > 7 ? 2 : 0); i++) b += `<path d="M${108 + i * 12} 138 l4 -${n1(10 + (L - 4) * 1.8)} l4 ${n1(10 + (L - 4) * 1.8)}Z" fill="${L >= 9 ? '#ffd86a' : dk}"/>`;
  // head
  b += `<ellipse cx="120" cy="126" rx="52" ry="44" fill="url(#${uid}b)"/>` + `<ellipse cx="120" cy="138" rx="26" ry="18" fill="url(#${uid}w)"/><circle cx="111" cy="138" r="2.2" fill="${dk}"/><circle cx="129" cy="138" r="2.2" fill="${dk}"/>`;
  b += `<path d="M82 94 L72 ${n1(70 - (L - 3) * 4)} L98 88Z M158 94 L168 ${n1(70 - (L - 3) * 4)} L142 88Z" fill="${L >= 9 ? '#ffd86a' : lighten(dk, 0.2)}"/>`;
  if (L >= 6) b += `<path d="M112 84 L120 ${n1(60 - L * 1.6)} L128 84Z" fill="${L >= 9 ? '#ffd86a' : lt}"/>`;
  b += eyes(120, 116, 38, L >= 7 ? 'fierce' : 'bright', 1.1, '#1a2230') + mouth(120, 150, 'smile', dk, 5) + blush(120, 134, 70, '#ff8a7a', 0.28);
  // fire breath (7+)
  if (L >= 7) { const fl = (L - 6) * 8; b += `<path d="M148 150 q${14 + fl} -6 ${26 + fl * 1.6} -14 q-10 16 ${-4} 22 q-${12 + fl} 4 -${22 + fl * 1.5} 0Z" fill="url(#${uid}f)" opacity=".95"/><path d="M152 150 q${12 + fl} -3 ${20 + fl} -8 q-6 10 -2 14 q-${10 + fl} 2 -${18 + fl} -6Z" fill="#fff1b0" opacity=".8"/>`; }
  // crown / halo (10)
  if (L >= 10) b += `<path d="M86 86 l8 -20 l12 14 l14 -22 l14 22 l12 -14 l8 20Z" fill="#ffd86a"/><circle cx="120" cy="64" r="4" fill="#ff4a5a"/><ellipse cx="120" cy="52" rx="48" ry="9" fill="none" stroke="#fff3b0" stroke-width="2.4" opacity=".9"/>`;
  b += '</g>';
  return wrap(uid, defs, b, `The Hatchling, stage ${L}`);
}
module.exports = { id: 'hatchling', name: 'The Hatchling', tag: 'An egg that hatches. Dragon at the end.', accent: '#7fd0a0', stages: ['Egg', 'Cracking', 'Hatchling', 'Whelp', 'Drake', 'Fire Drake', 'Storm Drake', 'Elder Drake', 'Inferno Dragon', 'Crowned Dragon'], draw };
