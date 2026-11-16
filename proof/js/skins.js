// 100 skins for Proff: 20 colour schemes x 5 looks. Skin 0 is the classic. The rest
// are unlocked by achievements (js/achievements.js): the fancier the look, the harder the
// achievement. Order matters: plain looks first, crowns last.
export const PALETTES = [
  { id: 'bone',     name: 'Bone',     R: '#d8c9a8', RD: '#b09f78', W: '#f3f2f0', WS: '#d7d6d4', N: '#171614', N2: '#3b3a38' },
  { id: 'ocean',    name: 'Ocean',    R: '#4aa3df', RD: '#2b78b0', W: '#dff1ff', WS: '#bcd9ee', N: '#10263a', N2: '#1d3b52' },
  { id: 'forest',   name: 'Forest',   R: '#5aa86a', RD: '#3a7a49', W: '#e6f2e1', WS: '#c3dcc0', N: '#14281a', N2: '#24402b' },
  { id: 'ember',    name: 'Ember',    R: '#ff7a45', RD: '#cc5528', W: '#ffe8dc', WS: '#f2c9b4', N: '#3a1a0c', N2: '#4a2616' },
  { id: 'rose',     name: 'Rose',     R: '#ff6b9a', RD: '#cc4a76', W: '#ffe3ec', WS: '#f2bfd0', N: '#3d1626', N2: '#4e2132' },
  { id: 'gold',     name: 'Gold',     R: '#f2c230', RD: '#c19412', W: '#fff4d6', WS: '#ecd9a0', N: '#3a2d08', N2: '#4a3a0c' },
  { id: 'silver',   name: 'Silver',   R: '#b7c0cc', RD: '#8b95a3', W: '#eceff3', WS: '#cfd5dd', N: '#262b33', N2: '#3b414a' },
  { id: 'violet',   name: 'Violet',   R: '#8b6bff', RD: '#5f45c9', W: '#eee5ff', WS: '#d3c6f2', N: '#221a44', N2: '#2f2457' },
  { id: 'mint',     name: 'Mint',     R: '#3fd6a0', RD: '#22a077', W: '#dcfff0', WS: '#b8ead3', N: '#10372b', N2: '#1c4a3a' },
  { id: 'sunset',   name: 'Sunset',   R: '#ff9f43', RD: '#d9731a', W: '#ffe9d6', WS: '#f3cfab', N: '#41270a', N2: '#53320f' },
  { id: 'ice',      name: 'Ice',      R: '#6fe0ff', RD: '#36aedb', W: '#e9fbff', WS: '#c5eaf3', N: '#12333f', N2: '#1d4452' },
  { id: 'crimson',  name: 'Crimson',  R: '#e03b3b', RD: '#a82424', W: '#ffe0e0', WS: '#f0bcbc', N: '#3a1010', N2: '#4d1616' },
  { id: 'cobalt',   name: 'Cobalt',   R: '#3b63e0', RD: '#2540a8', W: '#dfe8ff', WS: '#bcc9f0', N: '#141d44', N2: '#1b2757' },
  { id: 'olive',    name: 'Olive',    R: '#9aa83a', RD: '#6f7a1e', W: '#eef0d8', WS: '#d4d9a8', N: '#2c300c', N2: '#3a3f12' },
  { id: 'copper',   name: 'Copper',   R: '#d98048', RD: '#a65a28', W: '#ffe5d4', WS: '#efc7ac', N: '#3a2210', N2: '#4d2e17' },
  { id: 'lavender', name: 'Lavender', R: '#c39bff', RD: '#9068d6', W: '#f1e8ff', WS: '#dccaf2', N: '#2e2144', N2: '#3d2d5a' },
  { id: 'lime',     name: 'Lime',     R: '#b6e32e', RD: '#86a812', W: '#f2ffd6', WS: '#dcefaa', N: '#313c0e', N2: '#425014' },
  { id: 'graphite', name: 'Graphite', R: '#9aa0a6', RD: '#70757a', W: '#3a3b3e', WS: '#2b2c2e', N: '#f3f2f0', N2: '#151516' },
  { id: 'ink',      name: 'Ink',      R: '#d8c9a8', RD: '#b09f78', W: '#1a1a1d', WS: '#111113', N: '#f3f2f0', N2: '#3b3a38' },
  { id: 'pearl',    name: 'Pearl',    R: '#f0d9c2', RD: '#cfae8a', W: '#fffaf3', WS: '#e8dccd', N: '#2f2820', N2: '#4a4038' },
];
export const LOOKS = [
  { id: 'none',       name: '' },
  { id: 'shades',     name: 'Shades' },
  { id: 'headband',   name: 'Headband' },
  { id: 'headphones', name: 'Headphones' },
  { id: 'crown',      name: 'Crown' },
];

// Skin i = look (i div 20), colour (i mod 20). 0..19 plain, ..., 80..99 crowns.
export const SKINS = Array.from({ length: PALETTES.length * LOOKS.length }, (_, i) => {
  const look = LOOKS[Math.floor(i / PALETTES.length)], pal = PALETTES[i % PALETTES.length];
  return { id: i, pal, look: look.id, name: i === 0 ? 'Classic Proff' : `${pal.name}${look.name ? ` ${look.name}` : ' Proff'}` };
});
export const skinById = (id) => SKINS[Number.isInteger(id) && id >= 0 && id < SKINS.length ? id : 0];
