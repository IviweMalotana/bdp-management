// Keyword-rich landing-page copy for the common packaging categories.
//
// Precedence on a collection page: a staff-authored `description` from the API
// always wins; if it's blank we fall back to the copy below (matched by
// collection slug); if the slug is unknown we generate a generic intro from the
// collection name. This means every category page has real SEO copy out of the
// box, while staff retain full control by writing a description in the admin.

export interface CategoryCopy {
  /** One or more paragraphs (~200–300 words total) shown under the H1. */
  intro: string[];
  /** ~150–160 char meta description override. */
  metaDescription: string;
}

const COPY: Record<string, CategoryCopy> = {
  "cosmetic-jars": {
    intro: [
      "Cosmetic jars handle most of a skincare range — creams, balms, body butters, scrubs and masks. We supply them wholesale across South Africa in frosted and clear glass, acrylic and PET, in sizes from 5g samples up to 100g+ tubs. Every jar comes with a matching lid, and most lines can include an inner liner or sealing disc to keep your formula fresh.",
      "Our minimum order is 10 units, so you can put out a tidy, professional range without ordering thousands of pieces. Pricing is tiered and shown upfront — the more you order, the lower the cost per jar — and you can add your logo with silk-screen or hot-stamp printing. Order a few to test a new cream, or scale up one that's selling.",
    ],
    metaDescription:
      "Buy cosmetic jars wholesale in South Africa — glass, acrylic and PET cream jars from 10 units. Tiered pricing shown upfront, with custom branding.",
  },
  "cream-jars": {
    intro: [
      "Cream jars are made for moisturisers, balms, body butters and masks. We stock them wholesale across South Africa in frosted glass, clear glass, acrylic and PET, in sizes from 5g–15g samples up to 50g and 100g tubs. Lids, liners and sealing discs come matched to each jar, so your product arrives sealed and ready for the shelf.",
      "You can order from 10 units, which keeps the risk low for a new or growing brand. Prices are tiered and shown upfront — the more you order, the less each jar costs — and every jar can carry your logo via silk-screen or hot-stamp printing. Good cream packaging, without the thousand-unit minimum.",
    ],
    metaDescription:
      "Cream jars wholesale in South Africa — frosted glass, acrylic and PET for creams, balms and masks. From 10 units, with custom branding.",
  },
  "dropper-bottles": {
    intro: [
      "Dropper bottles suit serums, facial oils, essential oils and tinctures, giving precise, mess-free dosing. We supply glass droppers wholesale across South Africa in frosted, clear and amber, in 5ml, 15ml, 30ml and 50ml. Each comes with a pipette and a rubber or coloured teat, and amber glass helps protect light-sensitive actives.",
      "You can order from 10 units, which works for small skincare brands, aromatherapists and anyone testing a new blend. Pricing is tiered and drops as your volume rises, and every bottle can carry your logo with silk-screen or hot-stamp printing. Order one serum, or a full oil range.",
    ],
    metaDescription:
      "Glass dropper bottles wholesale in South Africa — frosted, clear and amber, 5ml–50ml. For serums and oils, from 10 units, with custom branding.",
  },
  "serum-bottles": {
    intro: [
      "Serum bottles are built for lightweight, high-value formulas — facial serums, oils and concentrates — where the dose needs to be precise. We carry serum and dropper bottles wholesale across South Africa in frosted, clear and amber glass, from 5ml to 50ml, with pipette droppers or pump and treatment closures. Amber and frosted finishes help shield delicate actives from light.",
      "Our minimum is 10 units, so you can start or refresh a serum line without overcommitting on stock. Pricing is tiered, so your cost per unit drops as you scale, and your logo can go on with silk-screen or hot-stamp printing. The packaging keeps up with what's inside it.",
    ],
    metaDescription:
      "Serum bottles wholesale in South Africa — frosted, clear and amber glass droppers 5ml–50ml. From 10 units, with custom branding.",
  },
  "pump-bottles": {
    intro: [
      "Pump bottles make lotions, cleansers, shampoos and serums easy and hygienic to dispense. We supply them wholesale across South Africa in glass and durable PET, with lotion pumps, treatment pumps and mist options to match your product. Sizes run from travel formats up to 250ml+ for everyday ranges.",
      "Order from 10 units and you can put a finished product on the shelf without a big upfront spend — useful for startups and small beauty brands. Pricing is tiered and shown upfront, and every bottle can take your logo via silk-screen or hot-stamp printing. Reliable dispensing, low minimums.",
    ],
    metaDescription:
      "Pump bottles wholesale in South Africa — lotion and treatment pumps in glass and PET. From 10 units, with tiered pricing and branding.",
  },
  "airless-pump-bottles": {
    intro: [
      "Airless pump bottles suit active-rich skincare — serums, anti-ageing creams and vitamin C — keeping the formula away from air and contamination while dispensing nearly all of it. We supply them wholesale across South Africa in frosted, clear and coloured finishes, in sizes made for face and treatment products.",
      "It's a higher-end format, but ours start at 10 units, so a small brand can use the same protective packaging as the big names without a thousand-unit order. Pricing is tiered and drops as you scale, and you can add branding with silk-screen or hot-stamp printing. Worth it where freshness and feel matter.",
    ],
    metaDescription:
      "Airless pump bottles wholesale in South Africa — protect serums and active skincare. Frosted and coloured finishes from 10 units, with custom branding.",
  },
  "spray-bottles": {
    intro: [
      "Spray bottles suit toners, facial mists, hair products, fragrances and room sprays, putting down an even, fine layer. We supply spray and mist bottles wholesale across South Africa in frosted, clear and amber glass and in PET, fitted with fine-mist sprayers, treatment pumps or triggers depending on the product and how thick it is.",
      "A 10-unit minimum means you can launch a mist or spray without a big outlay. It's a fit for skincare brands, salons and wellness businesses. Pricing is tiered and falls as your volume grows, and every bottle can carry your logo with silk-screen or hot-stamp printing.",
    ],
    metaDescription:
      "Spray and mist bottles wholesale in South Africa — glass and PET for toners, mists and fragrances. From 10 units, with custom branding.",
  },
  "hotel-spa": {
    intro: [
      "Hotel and spa amenity bottles let you give guests shampoo, conditioner, body wash and lotion in refillable or single-use formats, branded to the property. We supply hospitality amenity packaging wholesale across South Africa, from compact guest sizes to larger refillable dispensers, in clean finishes that suit lodges, spas and hotels.",
      "Low minimums and your own branding via silk-screen or hot-stamp printing mean even a small guesthouse or day spa can put out a coordinated range. Pricing is tiered, and our team can help you match bottles, pumps and closures into one line. Packaging that matches the standard of the stay.",
    ],
    metaDescription:
      "Hotel & spa amenity bottles wholesale in South Africa — shampoo, body wash and lotion packaging with custom branding, from low minimums.",
  },
};

// Common slug aliases mapped to a canonical key above.
const ALIASES: Record<string, string> = {
  jars: "cosmetic-jars",
  "glass-jars": "cosmetic-jars",
  "glass-dropper-bottles": "dropper-bottles",
  droppers: "dropper-bottles",
  "serum-dropper-bottles": "serum-bottles",
  "serums": "serum-bottles",
  pumps: "pump-bottles",
  "lotion-pumps": "pump-bottles",
  airless: "airless-pump-bottles",
  sprays: "spray-bottles",
  "mist-bottles": "spray-bottles",
  "amenity-bottles": "hotel-spa",
  "hotel-spa-bottles": "hotel-spa",
  hospitality: "hotel-spa",
};

export function getCategoryCopy(slug: string, name: string): CategoryCopy {
  const key = COPY[slug] ? slug : ALIASES[slug];
  if (key && COPY[key]) return COPY[key];

  // Generic, still keyword-bearing, fallback for any other collection.
  const lower = name.toLowerCase();
  return {
    intro: [
      `Browse our ${lower} — cosmetic and skincare packaging supplied wholesale across South Africa. We stock a range of materials, sizes and finishes, with matching lids and closures.`,
      `You can order from 10 units, so small brands and startups can launch a finished-looking range. Pricing is tiered and shown upfront — the more you order, the lower the cost per unit — and every item can carry your logo with silk-screen or hot-stamp printing.`,
    ],
    metaDescription: `Buy ${lower} wholesale in South Africa from 10 units. Cosmetic packaging with tiered pricing and custom branding.`,
  };
}
