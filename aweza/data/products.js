/* AWEZA catalogue: real products from the Printify "AWEZA" shop (id 29483178).
   SCHEMA IS A CONTRACT. Agents may change values and copy, never field names.
   Prices are in South African Rand. Printify variant IDs live in data/printify-variants.json. */
window.AW = window.AW || {};

AW.config = {
  currency: "ZAR",
  delivery: 149,          // flat delivery fee (Printify charges ~R172 to ship one tee to SA)
  freeDeliveryOver: 1500, // order subtotal for free delivery
  sizeUpcharge: { "2XL": 50, "3XL": 80, "4XL": 80, "5XL": 80 },
};

AW.collections = [
  { id: "signature",     name: "The Signature Line", tagline: "The lips that started it all." },
  { id: "bad-decisions", name: "Bad Decisions Club", tagline: "Self-aware. Unapologetic. Mostly." },
  { id: "no-filter",     name: "No Filter",          tagline: "Say it with your chest." },
];

(() => {
  const img = (slug, names) => names.map(n => `images/${slug}/${n}.jpg`);
  const STD = ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];
  // Male models first (AWEZA's audience is mostly men). Flat shots and details after.
  const BACK_FIRST = ["male-back-1", "male-front-1", "back", "front", "male-back-3", "male-duo", "male-front-3", "collar"];
  const FRONT_FIRST = ["male-front-1", "male-front-3", "front", "male-duo", "male-front-5", "back", "collar"];

  AW.products = [
    {
      id: "signature-lips", name: "AWEZA Signature Lips Tee", collection: "signature", price: 749,
      colourName: "White", badge: "Signature", sizes: STD, fit: "Gildan 5000 heavy cotton, classic fit",
      images: img("signature-lips", [...BACK_FIRST, "male-sleeve"]),
      summary: "Our signature: red lips with AWEZA across the teeth on the back, a clean script logo on the chest and a flag patch on the sleeve.",
    },
    {
      id: "mini-lips", name: "Mini Lips Tee", collection: "signature", price: 549,
      colourName: "White", badge: "New", sizes: ["XS", ...STD], fit: "Bella+Canvas 3001 soft jersey, retail fit",
      images: img("mini-lips", ["male-front-1", "male-front-3", "front", "male-duo", "male-front-5", "back", "collar"]),
      summary: "A small pair of lips on a soft, lightweight tee. Quiet on purpose.",
    },
    {
      id: "sweet-cupcake", name: "Sweet Cupcake Tee", collection: "signature", price: 649,
      colourName: "White", sizes: STD, fit: "Gildan 5000 heavy cotton, classic fit",
      images: img("sweet-cupcake", BACK_FIRST),
      summary: "Red AWEZA on the chest, a very sweet surprise on the back.",
    },
    {
      id: "ceo-of-bad-decisions", name: "CEO of Bad Decisions Tee", collection: "bad-decisions", price: 649,
      colourName: "White", badge: "Bestseller", sizes: STD, fit: "Gildan 5000 heavy cotton, classic fit",
      images: img("ceo-of-bad-decisions", BACK_FIRST),
      summary: "A quiet front mark and a bold red back statement for the unapologetically self-aware.",
    },
    {
      id: "zero-exes", name: "Zero Ex's Tee", collection: "bad-decisions", price: 649,
      colourName: "White", sizes: STD, fit: "Gildan 5000 heavy cotton, classic fit",
      images: img("zero-exes", BACK_FIRST),
      summary: "“I have 0 ex's because I don't count mistakes.” Printed big and red on the back.",
    },
    {
      id: "captain-save", name: "Captain Save Tee", collection: "no-filter", price: 649,
      colourName: "White", sizes: STD, fit: "Gildan 5000 heavy cotton, classic fit",
      images: img("captain-save", FRONT_FIRST),
      summary: "A loud chest shield for the friend who always comes to the rescue.",
    },
    {
      id: "need-a-hug", name: "Need A Hug Tee", collection: "no-filter", price: 649,
      colourName: "White", badge: "New", sizes: STD, fit: "Gildan 5000 heavy cotton, classic fit",
      images: img("need-a-hug", FRONT_FIRST),
      summary: "Says exactly what it needs to. Small AWEZA mark on the back.",
    },
  ];
})();

AW.priceFor = (p, size) => p.price + ((size && AW.config.sizeUpcharge[size]) || 0);
