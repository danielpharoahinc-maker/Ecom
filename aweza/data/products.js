/* AWEZA catalogue: real products from the Printify "AWEZA" shop (id 29483178).
   SCHEMA IS A CONTRACT. Agents may change values and copy, never field names.
   Prices are in South African Rand. Printify variant IDs live in data/printify-variants.json. */
window.AW = window.AW || {};

AW.config = {
  currency: "ZAR",
  delivery: 179,          // flat delivery fee (Printify charges ~R177 to ship the first tee to SA)
  freeDeliveryOver: 2000, // free delivery on orders of R2 000 and over, counted after deals
  sizeUpcharge: { "2XL": 40, "3XL": 70, "4XL": 70, "5XL": 70 },
  // Multi-buy: the best mix of these sets is applied to tees that are not marked noDeal. Size extras are paid on top.
  deals: [{ qty: 2, price: 800 }, { qty: 3, price: 1200 }],
  // Refer a friend: a link with ?ref=CODE gives the friend this much off an order of at least minSubtotal.
  // The referrer's own reward is given by hand for now: orders carry the code, so you can see who sent whom.
  referral: { amount: 50, minSubtotal: 450 },
  // Delivery estimate shown to customers: working days from order to the door (printing plus shipping from the US).
  // Printify's own published range is wider (production 2 to 7 days, international standard shipping 10 to 30), so
  // this is where most orders should land. Tighten or widen it once real orders show how long they take.
  // Peak season (Printify warns of slower production around holidays) adds extra working days between from and to (MM-DD).
  shipping: {
    days: [12, 20],
    peak: { from: "11-15", to: "01-10", extra: 5 },
    holidays: ["2026-12-16", "2026-12-25", "2026-12-26", "2027-01-01"],   // South African public holidays that stop couriers
  },
  // Limited drop: the server stops taking orders after this date (end of day, South African time).
  drop: { name: "Drop 01", ends: "2026-12-31", label: "31 Dec" },
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
      id: "signature-lips", name: "Signature Lips Tee", collection: "signature", price: 450,
      colourName: "White", badge: "Signature", sizes: STD, fit: "Heavyweight cotton, classic fit",
      images: img("signature-lips", BACK_FIRST),
      summary: "The one that started it. Big red lips with AWEZA on the teeth across the back, and a small wordmark on the chest.",
    },
    {
      id: "sweet-cupcake", name: "Sweet Cupcake Tee", collection: "signature", price: 450,
      colourName: "White", sizes: STD, fit: "Heavyweight cotton, classic fit",
      images: img("sweet-cupcake", BACK_FIRST),
      summary: "Red AWEZA across the chest. On the back, a very sweet surprise in pink icing.",
    },
    {
      id: "ceo-of-bad-decisions", name: "CEO of Bad Decisions Tee", collection: "bad-decisions", price: 450,
      colourName: "White", badge: "Bestseller", sizes: STD, fit: "Heavyweight cotton, classic fit",
      images: img("ceo-of-bad-decisions", BACK_FIRST),
      summary: "A quiet wordmark up front, and the job title stacked big in red serif down the back. Self-aware, never sorry.",
    },
    {
      id: "zero-exes", name: "Zero Ex's Tee", collection: "bad-decisions", price: 450,
      colourName: "White", sizes: STD, fit: "Heavyweight cotton, classic fit",
      images: img("zero-exes", BACK_FIRST),
      summary: "Small red wordmark on the chest. The back does the maths in big red caps: zero ex's, because mistakes don't count.",
    },
    {
      id: "captain-save", name: "Captain Save Tee", collection: "no-filter", price: 450,
      colourName: "White", sizes: STD, fit: "Heavyweight cotton, classic fit",
      images: img("captain-save", FRONT_FIRST),
      summary: "A loud red and yellow shield across the chest, for the guy who always swoops in. AWEZA on the back, so they know who to thank.",
    },
    {
      id: "need-a-hug", name: "Need A Hug Tee", collection: "no-filter", price: 450,
      colourName: "White", sizes: STD, fit: "Heavyweight cotton, classic fit",
      images: img("need-a-hug", FRONT_FIRST),
      summary: "Bold black type across the chest that says exactly what it means. Small AWEZA mark on the back, hugs not guaranteed.",
    },
    {
      id: "black-out", name: "Black Out Or Back Out Tee", collection: "bad-decisions", price: 450,
      colourName: "White", sizes: STD, fit: "Heavyweight cotton, classic fit",
      images: img("black-out", BACK_FIRST),
      summary: "A small black wordmark up front. On the back, two bottles and a choice: black out, or back out. Decide wisely.",
    },
    {
      id: "time-of-your-life", name: "Time of Your Life Tee", collection: "signature", price: 450,
      colourName: "White", sizes: STD, fit: "Heavyweight cotton, classic fit",
      images: img("time-of-your-life", BACK_FIRST),
      summary: "A small blue AWEZA on the chest. On the back, the brand line wrapped up in loud blue: time of your life, sealed and ready.",
    },
  ];
})();

AW.priceFor = (p, size) => p.price + ((size && AW.config.sizeUpcharge[size]) || 0);
