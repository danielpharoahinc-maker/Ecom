/* AWEZA catalogue: real products from the Printify "AWEZA" shop (id 29483178).
   SCHEMA IS A CONTRACT. Agents may change values and copy, never field names.
   Prices are in South African Rand. Printify variant IDs live in data/printify-variants.json. */
window.AW = window.AW || {};

AW.config = {
  currency: "ZAR",
  delivery: 149,          // flat delivery fee (Printify charges ~R172 to ship one tee to SA)
  freeDeliveryOver: 1300, // order subtotal for free delivery (three tees)
  sizeUpcharge: { "2XL": 40, "3XL": 70, "4XL": 70, "5XL": 70 },
};

AW.collections = [
  { id: "signature",     name: "The Signature Line", tagline: "The mouth that runs the place." },
  { id: "bad-decisions", name: "Bad Decisions Club", tagline: "Poor choices. Excellent cotton." },
  { id: "no-filter",     name: "No Filter",          tagline: "Thought it. Printed it. Wore it." },
];

(() => {
  const img = (slug, names) => names.map(n => `images/${slug}/${n}.jpg`);
  const STD = ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];
  // One model across the whole store: the hand-on-hip model (male-front-5). Then the flat shots,
  // which carry the back prints (Printify has no back view of this model).
  const BACK_FIRST = ["male-front-5", "back", "front", "collar", "folded"];
  const FRONT_FIRST = ["male-front-5", "front", "back", "collar", "folded"];

  AW.products = [
    {
      id: "signature-lips", name: "Signature Lips Tee", collection: "signature", price: 549,
      colourName: "White", badge: "Signature", sizes: STD, fit: "Heavyweight cotton, classic fit",
      images: img("signature-lips", BACK_FIRST),
      summary: "The one that started it. Big red lips with AWEZA on the teeth across the back, a small wordmark on the chest and a flag on the sleeve.",
    },
    {
      id: "sweet-cupcake", name: "Sweet Cupcake Tee", collection: "signature", price: 449,
      colourName: "White", sizes: STD, fit: "Heavyweight cotton, classic fit",
      images: img("sweet-cupcake", BACK_FIRST),
      summary: "Red AWEZA across the chest. On the back, a very sweet surprise in pink icing.",
    },
    {
      id: "ceo-of-bad-decisions", name: "CEO of Bad Decisions Tee", collection: "bad-decisions", price: 449,
      colourName: "White", badge: "Bestseller", sizes: STD, fit: "Heavyweight cotton, classic fit",
      images: img("ceo-of-bad-decisions", BACK_FIRST),
      summary: "A quiet wordmark up front, and the job title stacked big in red serif down the back. Self-aware, never sorry.",
    },
    {
      id: "zero-exes", name: "Zero Ex's Tee", collection: "bad-decisions", price: 449,
      colourName: "White", sizes: STD, fit: "Heavyweight cotton, classic fit",
      images: img("zero-exes", BACK_FIRST),
      summary: "Small red wordmark on the chest. The back does the maths in big red caps: zero ex's, because mistakes don't count.",
    },
    {
      id: "captain-save", name: "Captain Save Tee", collection: "no-filter", price: 449,
      colourName: "White", sizes: STD, fit: "Heavyweight cotton, classic fit",
      images: img("captain-save", FRONT_FIRST),
      summary: "A loud red and yellow shield across the chest, for the guy who always swoops in. AWEZA on the back, so they know who to thank.",
    },
    {
      id: "need-a-hug", name: "Need A Hug Tee", collection: "no-filter", price: 449,
      colourName: "White", sizes: STD, fit: "Heavyweight cotton, classic fit",
      images: img("need-a-hug", FRONT_FIRST),
      summary: "Bold black type across the chest that says exactly what it means. Small AWEZA mark on the back, hugs not guaranteed.",
    },
  ];
})();

AW.priceFor = (p, size) => p.price + ((size && AW.config.sizeUpcharge[size]) || 0);
