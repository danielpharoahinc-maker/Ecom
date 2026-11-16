// 8. THE HELM: a helmet-character. Dented tin pot to crown of a king.
const C = require('./common.js');
const { n1, rng, lin, rad, lighten, darken, shadow, spark, atmosphere, eyes, mouth, blush, gem, wrap } = C;
const MAT = [null, ['#8a8f96', '#4a4e55'], ['#a3a9b1', '#5e646c'], ['#b9c0c9', '#6b7480'], ['#c6ced8', '#74808e'], ['#d4a373', '#8c5a2c'], ['#e8c25a', '#a8761c'], ['#e8c25a', '#a8761c'], ['#f6dc7a', '#b98a22'], ['#fff0a8', '#c89a28'], ['#ffffff', '#d9c680']];
function draw(L, uid) {
  const [m1, m2] = MAT[L], aura = atmosphere(uid, L, L >= 6 ? '#ffd86a' : '#8fd0ff', 140);
  let defs = aura.defs, b = aura.body + shadow(120, 56, 240);
  defs += lin(`${uid}m`, [[0, lighten(m1, 0.3)], [0.4, m1], [1, m2]], 0, 0, 0.6, 1) + lin(`${uid}s`, [[0, '#101820'], [1, '#05090f']], 0, 0, 0, 1) + lin(`${uid}pl`, [[0, '#d83a4a'], [1, '#8a1a2a']], 0, 0, 0, 1) + lin(`${uid}cl`, [[0, '#c0392b'], [1, '#7a1a14']], 0, 0, 0, 1);
  // cape (6+) behind
  if (L >= 6) b += `<path d="M64 170 Q40 230 62 238 L178 238 Q200 230 176 170Z" fill="url(#${uid}cl)"/>`;
  // plume (4+)
  if (L >= 4) { const ph = 22 + (L - 4) * 5; b += `<path d="M120 62 Q${n1(150 + (L - 4) * 4)} ${n1(62 - ph)} ${n1(184 + (L - 4) * 2)} ${n1(86 - ph * 0.4)} Q150 ${n1(80 - ph * 0.3)} 124 80Z" fill="${L >= 8 ? '#ffe9a0' : 'url(#' + uid + 'pl)'}"/>`; }
  // pauldrons (3+)
  if (L >= 3) b += `<path d="M44 188 Q44 160 80 168 L84 204 Q56 210 44 188Z" fill="url(#${uid}m)"/><path d="M196 188 Q196 160 160 168 L156 204 Q184 210 196 188Z" fill="url(#${uid}m)"/>`;
  if (L >= 7) b += `<path d="M44 188 l-6 -16 l16 6Z M196 188 l6 -16 l-16 6Z" fill="${m2}"/>`;
  // body/gorget
  b += `<path d="M76 168 Q120 188 164 168 L168 226 Q120 244 72 226Z" fill="url(#${uid}m)"/><path d="M82 184 Q120 200 158 184" stroke="${m2}" stroke-width="2" fill="none" opacity=".6"/>`;
  if (L >= 5) b += gem(120, 214, 7, L >= 8 ? '#5af0ff' : '#e03a4a');
  // helmet dome
  const h = 74 + (L >= 7 ? 6 : 0);
  b += `<path d="M64 150 C64 ${150 - h - 14} 176 ${150 - h - 14} 176 150 L176 160 L64 160Z" fill="url(#${uid}m)"/><ellipse cx="102" cy="104" rx="16" ry="30" fill="#fff" opacity=".18" transform="rotate(20 102 104)"/>`;
  // visor slot with face
  b += `<rect x="72" y="118" width="96" height="40" rx="14" fill="url(#${uid}s)"/>` + eyes(120, 138, 38, L >= 8 ? 'bright' : L >= 4 ? 'fierce' : 'calm', 1, '#ffe9a0') + `<path d="M108 152 q12 6 24 0" stroke="#ffe9a0" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
  // dents (1-2), ridge (3+), nasal
  if (L <= 2) b += `<path d="M82 96 q10 -4 14 8 M148 90 q6 6 2 14" stroke="${m2}" stroke-width="3" fill="none"/><circle cx="90" cy="112" r="2" fill="${m2}"/><circle cx="150" cy="112" r="2" fill="${m2}"/>`;
  if (L >= 3) b += `<path d="M120 ${n1(150 - h - 6)} L120 118" stroke="${m2}" stroke-width="6" stroke-linecap="round"/><path d="M120 ${n1(150 - h - 6)} L120 118" stroke="${lighten(m1, 0.3)}" stroke-width="2" stroke-linecap="round"/>`;
  b += `<rect x="64" y="154" width="112" height="10" rx="5" fill="${m2}"/><rect x="64" y="154" width="112" height="4" rx="2" fill="#fff" opacity=".3"/>`;
  // wings on helmet (7+)
  if (L >= 7) { const w = 20 + (L - 7) * 8; b += `<path d="M66 112 Q${n1(40 - w)} ${n1(96 - w * 0.5)} ${n1(26 - w * 0.4)} ${n1(70 - w * 0.4)} Q${n1(54 - w * 0.4)} 104 70 126Z M174 112 Q${n1(200 + w)} ${n1(96 - w * 0.5)} ${n1(214 + w * 0.4)} ${n1(70 - w * 0.4)} Q${n1(186 + w * 0.4)} 104 170 126Z" fill="${L >= 9 ? '#fff6c8' : m1}"/>`; }
  // crown (8+)
  if (L >= 8) { const ct = 20 + (L - 8) * 6; b += `<path d="M82 ${n1(150 - h - 6)} l8 -${ct} l14 14 l16 -${ct + 8} l16 ${ct + 8} l14 -14 l8 ${ct}Z" fill="#ffd86a"/><path d="M82 ${n1(150 - h - 6)} h76" stroke="#fff3b0" stroke-width="3"/>` + gem(120, n1(150 - h - 16), 5, '#ff4a5a') + gem(96, n1(150 - h - 12), 3.4, '#5af0ff') + gem(144, n1(150 - h - 12), 3.4, '#5af0ff'); }
  if (L >= 10) b += `<ellipse cx="120" cy="${n1(150 - h - 52)}" rx="46" ry="9" fill="none" stroke="#fff3b0" stroke-width="2.6"/>`;
  return wrap(uid, defs, b, `The Helm, stage ${L}`);
}
module.exports = { id: 'helm', name: 'The Helm', tag: 'A helmet that earns its crown.', accent: '#e8c25a', stages: ['Dented Pot', 'Tin Helm', 'Iron Helm', 'Plumed Helm', 'Bronze Helm', 'Gold Helm', 'Knight Cape', 'Winged Helm', 'King', 'Emperor'], draw };
