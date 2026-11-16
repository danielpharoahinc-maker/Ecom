// 1. THE SEAL: Proff's stamp, grown up. From a plain wooden rubber stamp to an eternal gold seal.
const C = require('./common.js');
const { n1, lin, rad, mix, lighten, darken, shadow, spark, atmosphere, eyes, mouth, blush, gem, wrap } = C;

const MAT = [ // wood handle, metal (hi, mid, lo), block face
  null,
  { h: ['#c99a6a', '#8f6540'], m: ['#efe9dc', '#cfc7b6', '#a79e8a'], ink: '#b3261e' },      // 1 wood + bone
  { h: ['#c99a6a', '#8f6540'], m: ['#efe9dc', '#cfc7b6', '#a79e8a'], ink: '#b3261e' },      // 2 inked
  { h: ['#a9763a', '#6f4a22'], m: ['#f0d283', '#cf9f43', '#8f6217'], ink: '#a11d1d' },      // 3 brass
  { h: ['#a9763a', '#6f4a22'], m: ['#f0d283', '#cf9f43', '#8f6217'], ink: '#a11d1d' },      // 4 engraved brass
  { h: ['#dfe5ec', '#9aa6b6'], m: ['#f4f7fb', '#c3ccd8', '#808c9c'], ink: '#9e1b32' },      // 5 silver + wax
  { h: ['#ffe49a', '#c68f1a'], m: ['#fff0b3', '#f0c23b', '#a8740c'], ink: '#9e1b32' },      // 6 gold
  { h: ['#ffe49a', '#c68f1a'], m: ['#fff0b3', '#f0c23b', '#a8740c'], ink: '#9e1b32' },      // 7 royal
  { h: ['#ffe49a', '#c68f1a'], m: ['#fff0b3', '#f0c23b', '#a8740c'], ink: '#9e1b32' },      // 8 gems
  { h: ['#fff3c4', '#d79c1f'], m: ['#fff6cc', '#ffd34f', '#b9810f'], ink: '#8e1230' },      // 9 imperial
  { h: ['#fffbe0', '#e8b030'], m: ['#fffbe6', '#ffdd66', '#c98e10'], ink: '#7d0f2a' },      // 10 eternal
];

function draw(L, uid) {
  const m = MAT[L], t = (L - 1) / 9, aura = atmosphere(uid, L, L < 5 ? '#e9d9a8' : '#ffd96a', 150);
  let defs = aura.defs, b = '';
  const y0 = 238 - (L >= 10 ? 14 : 0); // the last stage floats
  const lift = L >= 10 ? -14 : 0;
  defs += lin(`${uid}h`, [[0, m.h[0]], [1, m.h[1]]], 0, 0, 1, 1)
    + lin(`${uid}m`, [[0, m.m[0]], [0.55, m.m[1]], [1, m.m[2]]], 0, 0, 0.6, 1)
    + lin(`${uid}side`, [[0, m.m[1]], [1, m.m[2]]], 0, 0, 1, 0)
    + rad(`${uid}ink`, [[0, m.ink, 0.9], [1, m.ink, 0]]);

  b += aura.body + shadow(120, 62 - (L >= 10 ? 14 : 0), 240);
  b += `<g transform="translate(0 ${lift})">`;

  // ink puddle under the plate (from stage 2)
  if (L >= 2) b += `<ellipse cx="120" cy="${y0 - 2}" rx="${n1(58 + t * 8)}" ry="11" fill="url(#${uid}ink)"/>`;
  // rubber plate
  b += `<rect x="62" y="${y0 - 36}" width="116" height="20" rx="7" fill="#1d1b1e"/><rect x="62" y="${y0 - 36}" width="116" height="6" rx="3" fill="#fff" opacity=".1"/>`;
  if (L >= 2) b += `<rect x="70" y="${y0 - 19}" width="100" height="4" rx="2" fill="${m.ink}" opacity=".9"/>`;

  // block (the face)
  b += `<rect x="66" y="${y0 - 98}" width="108" height="68" rx="15" fill="url(#${uid}m)"/>`;
  b += `<rect x="66" y="${y0 - 98}" width="108" height="14" rx="7" fill="#fff" opacity=".3"/>`;
  b += `<rect x="66" y="${y0 - 52}" width="108" height="22" rx="11" fill="${m.m[2]}" opacity=".28"/>`;
  // engraved border (4+)
  if (L >= 4) b += `<rect x="73" y="${y0 - 91}" width="94" height="54" rx="11" fill="none" stroke="${m.m[2]}" stroke-width="1.6" stroke-dasharray="${L >= 6 ? '1 4' : '5 3'}" opacity=".85"/>`;
  if (L >= 7) b += `<rect x="78" y="${y0 - 86}" width="84" height="44" rx="8" fill="none" stroke="${m.m[0]}" stroke-width="1" opacity=".8"/>`;
  // face
  const fy = y0 - 66;
  b += eyes(120, fy, 36, L === 1 ? 'sleepy' : L < 5 ? 'calm' : 'bright', L >= 6 ? 1.12 : 1, '#2a1a10');
  b += mouth(120, fy + 15, L >= 5 ? 'grin' : 'smile', '#2a1a10', L >= 5 ? 6.5 : 6);
  b += blush(120, fy + 10, 56, m.ink, 0.3);

  // ferrule + stem + knob
  b += `<rect x="106" y="${y0 - 112}" width="28" height="16" rx="4" fill="url(#${uid}m)"/><rect x="106" y="${y0 - 112}" width="28" height="4" rx="2" fill="#fff" opacity=".35"/>`;
  b += `<rect x="112" y="${y0 - 138}" width="16" height="30" rx="5" fill="url(#${uid}h)"/>`;
  const kr = 22 + (L >= 7 ? 2 : 0);
  b += `<circle cx="120" cy="${y0 - 150}" r="${kr}" fill="url(#${uid}h)"/><ellipse cx="112" cy="${y0 - 158}" rx="8" ry="5.5" fill="#fff" opacity=".38"/>`;
  if (L >= 5 && L < 6) b += `<path d="M104 ${y0 - 138} q-2 18 4 22 q4-8 2-22z" fill="${m.ink}"/><path d="M104 ${y0 - 160} q16-10 32 0" stroke="${m.ink}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".95"/>`; // wax drip
  // crown on the knob (7+)
  if (L >= 7) {
    const cy = y0 - 170, cw = L >= 9 ? 34 : 28;
    b += `<path d="M${120 - cw / 2} ${cy + 14} L${120 - cw / 2 - 2} ${cy - 6} L${120 - cw / 4} ${cy + 3} L120 ${cy - 12} L${120 + cw / 4} ${cy + 3} L${120 + cw / 2 + 2} ${cy - 6} L${120 + cw / 2} ${cy + 14}Z" fill="url(#${uid}m)" stroke="${m.m[2]}" stroke-width="1"/>`
      + `<rect x="${120 - cw / 2}" y="${cy + 10}" width="${cw}" height="5" rx="2" fill="${m.m[2]}"/>${gem(120, cy + 4, 3.4, m.ink)}`;
  }
  // gems on the corners (8+)
  if (L >= 8) b += gem(78, y0 - 88, 5, '#d02a44') + gem(162, y0 - 88, 5, '#2f6fe0') + gem(78, y0 - 40, 4.2, '#2fb67a') + gem(162, y0 - 40, 4.2, '#f2b02e');
  // laurel (9+)
  if (L >= 9) {
    const leaf = (x, y, r) => `<ellipse cx="${x}" cy="${y}" rx="3.2" ry="7" transform="rotate(${r} ${x} ${y})" fill="#7fb04a"/><ellipse cx="${x - 0.8}" cy="${y - 0.8}" rx="1.3" ry="4" transform="rotate(${r} ${x} ${y})" fill="#b6dd7a" opacity=".6"/>`;
    for (let i = 0; i < 7; i++) { const a = 200 + i * 20, rr = 84; const x = 120 + Math.cos((a * Math.PI) / 180) * rr, y = y0 - 66 + Math.sin((a * Math.PI) / 180) * 56; b += leaf(n1(x), n1(y), a + 90); b += leaf(n1(240 - x), n1(y), -(a + 90)); }
  }
  // orbiting mini stamps + halo (10)
  if (L >= 10) {
    b += `<ellipse cx="120" cy="${y0 - 176}" rx="42" ry="9" fill="none" stroke="#ffe27a" stroke-width="3"/><ellipse cx="120" cy="${y0 - 176}" rx="42" ry="9" fill="none" stroke="#fff" stroke-width="1" opacity=".8"/>`;
    [[40, y0 - 100, -14], [200, y0 - 110, 12], [52, y0 - 40, 8], [190, y0 - 46, -10]].forEach(([x, y, r]) => { b += `<g transform="rotate(${r} ${x} ${y})"><rect x="${x - 9}" y="${y - 7}" width="18" height="14" rx="3.5" fill="url(#${uid}m)"/><rect x="${x - 3}" y="${y - 14}" width="6" height="8" rx="2" fill="url(#${uid}h)"/></g>`; });
  }
  b += '</g>';
  return wrap(uid, defs, b, `The Seal, stage ${L}`);
}
module.exports = {
  id: 'seal', name: 'The Seal', tag: 'Your stamp, grown up. From a wooden rubber stamp to an eternal golden seal.',
  accent: '#e9c15a', stages: ['Rubber Stamp', 'Inked Stamp', 'Brass Stamp', 'Engraved Brass', 'Silver Seal', 'Gold Seal', 'Royal Seal', 'Jewelled Signet', 'Imperial Seal', 'Eternal Seal'], draw,
};
