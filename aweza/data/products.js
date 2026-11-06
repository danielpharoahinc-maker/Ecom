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
  { id: "signature",     name: "The Signature Line", tagline: "The mouth that runs the place." },
  { id: "bad-decisions", name: "Bad Decisions Club", tagline: "Poor choices. Excellent cotton." },
  { id: "no-filter",     name: "No Filter",          tagline: "Thought it. Printed it. Wore it." },
];

(() => {
  const img = (slug, names) => names.map(n => `images/${slug}/${n}.jpg`);
  const STD = ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];
  // Male models first (AWEZA's audience is mostly men). Flat shots and details after.
  const BACK_FIRST = ["male-back-1", "male-front-1", "back", "front", "male-back-3", "male-duo", "male-front-3", "collar"];
  const FRONT_FIRST = ["male-front-1", "male-front-3", "front", "male-duo", "male-front-5", "back", "collar"];

  AW.products = [
    {
      id: "signature-lips", name: "Signature Lips Tee", collection: "signature", price: 749,
      colourName: "White", badge: "Signature", sizes: STD, fit: "Heavyweight cotton, classic fit",
      images: img("signature-lips", [...BACK_FIRST, "male-sleeve"]),
      summary: "The one that started it. Big red lips with AWEZA on the teeth across the back, a small wordmark on the chest and a flag on the sleeve.",
    },
    {
      id: "mini-lips", name: "Mini Lips Tee", collection: "signature", price: 549,
      colourName: "White", badge: "New", sizes: ["XS", ...STD], fit: "Soft lightweight jersey, retail fit",
      images: img("mini-lips", ["male-front-1", "male-front-3", "front", "male-duo", "male-front-5", "back", "collar"]),
      summary: "One small pair of red lips on the front, nothing on the back. For the days you would rather whisper.",
    },
    {
      id: "sweet-cupcake", name: "Sweet Cupcake Tee", collection: "signature", price: 649,
      colourName: "White", sizes: STD, fit: "Heavyweight cotton, classic fit",
      images: img("sweet-cupcake", BACK_FIRST),
      summary: "Red AWEZA across the chest. On the back, a very sweet surprise in pink icing.",
    },
    {
      id: "ceo-of-bad-decisions", name: "CEO of Bad Decisions Tee", collection: "bad-decisions", price: 649,
      colourName: "White", badge: "Bestseller", sizes: STD, fit: "Heavyweight cotton, classic fit",
      images: img("ceo-of-bad-decisions", BACK_FIRST),
      summary: "A quiet wordmark up front, and the job title stacked big in red serif down the back. Self-aware, never sorry.",
    },
    {
      id: "zero-exes", name: "Zero Ex's Tee", collection: "bad-decisions", price: 649,
      colourName: "White", sizes: STD, fit: "Heavyweight cotton, classic fit",
      images: img("zero-exes", BACK_FIRST),
      summary: "Small red wordmark on the chest. The back does the maths in big red caps: zero ex's, because mistakes don't count.",
    },
    {
      id: "captain-save", name: "Captain Save Tee", collection: "no-filter", price: 649,
      colourName: "White", sizes: STD, fit: "Heavyweight cotton, classic fit",
      images: img("captain-save", FRONT_FIRST),
      summary: "A loud red and yellow shield across the chest, for the guy who always swoops in. AWEZA on the back, so they know who to thank.",
    },
    {
      id: "need-a-hug", name: "Need A Hug Tee", collection: "no-filter", price: 649,
      colourName: "White", sizes: STD, fit: "Heavyweight cotton, classic fit",
      images: img("need-a-hug", FRONT_FIRST),
      summary: "Bold black type across the chest that says exactly what it means. Small AWEZA mark on the back, hugs not guaranteed.",
    },
  ];
})();

AW.priceFor = (p, size) => p.price + ((size && AW.config.sizeUpcharge[size]) || 0);
