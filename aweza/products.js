// AWEZA product catalogue.
// Later this file gets replaced by live data from Printify (via a small backend).
// Prices are in South African Rand (ZAR).

const COLLECTIONS = [
  { id: "mzansi",  name: "Mzansi Originals", tagline: "Proudly local. Built for the streets." },
  { id: "kasi",    name: "Kasi Culture",     tagline: "From the township, to the world." },
  { id: "codes",   name: "Area Codes",       tagline: "Rep your city: 011 · 021 · 031." },
  { id: "lingo",   name: "Street Lingo",     tagline: "Say it like a local." },
];

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

// colour: shirt body colour, ink: print colour
const PRODUCTS = [
  { id: "sharp-sharp",  name: "Sharp Sharp Tee",   collection: "lingo",  price: 399, colour: "#111111", ink: "#ffffff", graphic: "SHARP\nSHARP",  colourName: "Black",  badge: "Bestseller" },
  { id: "lekker",       name: "Lekker Tee",        collection: "lingo",  price: 399, colour: "#f4f4f4", ink: "#111111", graphic: "LEKKER",        colourName: "White" },
  { id: "eish",         name: "Eish Tee",          collection: "lingo",  price: 379, colour: "#111111", ink: "#ffffff", graphic: "EISH.",         colourName: "Black" },
  { id: "howzit",       name: "Howzit Tee",        collection: "lingo",  price: 379, colour: "#9a9a9a", ink: "#111111", graphic: "HOWZIT",        colourName: "Grey" },
  { id: "ubuntu",       name: "Ubuntu Tee",        collection: "mzansi", price: 449, colour: "#f4f4f4", ink: "#111111", graphic: "UBUNTU\nI AM\nBECAUSE\nWE ARE", colourName: "White", badge: "New" },
  { id: "mzansi-bold",  name: "Mzansi Bold Tee",   collection: "mzansi", price: 449, colour: "#111111", ink: "#ffffff", graphic: "MZANSI",        colourName: "Black", badge: "New" },
  { id: "aweza-core",   name: "AWEZA Core Tee",    collection: "mzansi", price: 349, colour: "#111111", ink: "#ffffff", graphic: "AWEZA",         colourName: "Black" },
  { id: "aweza-core-w", name: "AWEZA Core Tee",    collection: "mzansi", price: 349, colour: "#f4f4f4", ink: "#111111", graphic: "AWEZA",         colourName: "White" },
  { id: "kasi-kid",     name: "Kasi Kid Tee",      collection: "kasi",   price: 429, colour: "#111111", ink: "#ffffff", graphic: "KASI\nKID",     colourName: "Black" },
  { id: "shosholoza",   name: "Shosholoza Tee",    collection: "kasi",   price: 429, colour: "#f4f4f4", ink: "#111111", graphic: "SHOSH-\nOLOZA", colourName: "White" },
  { id: "braai-boss",   name: "Braai Boss Tee",    collection: "kasi",   price: 399, colour: "#9a9a9a", ink: "#111111", graphic: "BRAAI\nBOSS",   colourName: "Grey" },
  { id: "jozi-011",     name: "Jozi 011 Tee",      collection: "codes",  price: 419, colour: "#111111", ink: "#ffffff", graphic: "011\nJOZI",     colourName: "Black" },
  { id: "kaap-021",     name: "Kaapstad 021 Tee",  collection: "codes",  price: 419, colour: "#f4f4f4", ink: "#111111", graphic: "021\nKAAP",     colourName: "White" },
  { id: "durbs-031",    name: "Durbs 031 Tee",     collection: "codes",  price: 419, colour: "#111111", ink: "#ffffff", graphic: "031\nDURBS",    colourName: "Black" },
];

const DESCRIPTION = "Heavyweight 100% cotton tee with a relaxed, street-ready fit. Printed on demand just for you, so nothing goes to waste. Designed in South Africa.";
