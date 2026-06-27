// Keyword-rich landing-page copy for the common packaging categories.
//
// Precedence on a collection page: a staff-authored `description` from the API
// always wins; if it's blank we fall back to the bespoke copy below (matched by
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
      "Cosmetic jars are the workhorse of any skincare range — perfect for creams, balms, body butters, scrubs and masks. At Be Different Packaging we supply cosmetic jars wholesale across South Africa, from frosted and clear glass to lightweight acrylic and PET, in sizes from compact 5g samples up to generous 100g+ tubs. Every jar pairs with a matching lid, and most lines are available with an inner liner or sealing disc to keep your formulation fresh.",
      "What makes us different is the minimum order: you can start from just 10 units, so small skincare brands, startups and product developers can launch a professional-looking range without committing to thousands of pieces. Pricing is fully transparent and drops as your quantity grows, and you can add your own logo with silk-screen or hot-stamp printing. Whether you're sampling a new cream or scaling a best-seller, our cosmetic jars give your brand a premium, considered finish.",
    ],
    metaDescription:
      "Buy cosmetic jars wholesale in South Africa — glass, acrylic and PET cream jars from 10 units. Transparent tiered pricing and custom branding.",
  },
  "cream-jars": {
    intro: [
      "Cream jars from Be Different Packaging are made for moisturisers, balms, body butters and masks — the everyday heroes of a skincare line. We stock cream jars wholesale across South Africa in frosted glass, clear glass, acrylic and PET, with sizes spanning small 5g–15g samples through to 50g and 100g tubs. Lids, liners and sealing discs come matched to each jar so your product arrives sealed and shelf-ready.",
      "Because you can order from as few as 10 units, cream jars are an easy, low-risk way for new and growing brands to look the part from day one. Prices are tiered and transparent — the more you order, the lower the unit cost — and every jar can carry your logo via silk-screen or hot-stamp printing. It's premium cream packaging without the thousand-unit minimum.",
    ],
    metaDescription:
      "Cream jars wholesale in South Africa — frosted glass, acrylic and PET for creams, balms and masks. From 10 units with custom branding.",
  },
  "dropper-bottles": {
    intro: [
      "Dropper bottles are the go-to for serums, facial oils, essential oils and tinctures, giving customers precise, mess-free dosing. Be Different Packaging supplies glass dropper bottles wholesale throughout South Africa in frosted, clear and amber finishes, with sizes from dainty 5ml through 15ml, 30ml and 50ml. Each comes with a quality pipette and a rubber or coloured teat, and amber options help protect light-sensitive actives.",
      "You can order dropper bottles from just 10 units, which makes them ideal for small skincare brands, aromatherapists and product makers testing a new blend. Our pricing is transparent and tiered, falling as volumes rise, and every bottle can be branded with your logo through silk-screen or hot-stamp printing. From a single serum to a full oil range, our dropper bottles give your product an elevated, apothecary-grade feel.",
    ],
    metaDescription:
      "Glass dropper bottles wholesale in South Africa — frosted, clear and amber, 5ml–50ml. For serums and oils, from 10 units with custom branding.",
  },
  "serum-bottles": {
    intro: [
      "Serum bottles are designed for high-value, lightweight formulations — facial serums, oils and concentrates — where precise application matters. Be Different Packaging carries serum and dropper bottles wholesale across South Africa in frosted, clear and amber glass, from 5ml up to 50ml, paired with pipette droppers or, where you prefer, pump or treatment closures. Amber and frosted finishes help shield delicate actives from light.",
      "With a minimum order of just 10 units, you can launch or refresh a serum line without overcommitting on stock — perfect for indie skincare brands and formulators. Pricing is transparent and tiered, so your cost per unit drops as you scale, and your logo can be added with silk-screen or hot-stamp printing. The result is serum packaging that looks every bit as premium as the formula inside.",
    ],
    metaDescription:
      "Serum bottles wholesale in South Africa — frosted, clear and amber glass droppers 5ml–50ml. From 10 units, with custom branding.",
  },
  "pump-bottles": {
    intro: [
      "Pump bottles make lotions, cleansers, shampoos and serums easy and hygienic to dispense. Be Different Packaging supplies pump bottles wholesale across South Africa in a range of materials and finishes — from frosted and clear glass to durable PET — with lotion pumps, treatment pumps and mist options to suit your product. Sizes run from compact travel formats up to larger 250ml+ bottles for everyday ranges.",
      "Order from just 10 units and you can put a polished, professional product on the shelf without a huge upfront commitment — ideal for startups and small beauty brands. Our pricing is fully transparent and drops as your quantity increases, and every bottle can be customised with your logo via silk-screen or hot-stamp printing. Reliable dispensing, premium looks, low minimums.",
    ],
    metaDescription:
      "Pump bottles wholesale in South Africa — lotion and treatment pumps in glass and PET. From 10 units, with transparent pricing and branding.",
  },
  "airless-pump-bottles": {
    intro: [
      "Airless pump bottles are the premium choice for active-rich skincare — serums, anti-ageing creams and vitamin C formulations — protecting your product from air and contamination while delivering precise, near-complete dispensing. Be Different Packaging supplies airless pump bottles wholesale across South Africa in sleek frosted, clear and coloured finishes, in a range of capacities suited to face and treatment products.",
      "Despite being a high-end format, our airless bottles start from just 10 units, so emerging brands can offer the same protective, luxurious packaging as the big names without a thousand-unit order. Pricing is transparent and tiered, reducing as you scale, and your branding can be applied with silk-screen or hot-stamp printing. For formulations where freshness and feel matter most, airless is the upgrade your range deserves.",
    ],
    metaDescription:
      "Airless pump bottles wholesale in South Africa — protect serums and active skincare. Premium finishes from 10 units, with custom branding.",
  },
  "spray-bottles": {
    intro: [
      "Spray bottles are perfect for toners, facial mists, hair products, fragrances and room sprays, giving an even, fine application. Be Different Packaging supplies spray and mist bottles wholesale throughout South Africa in frosted, clear and amber glass as well as PET, fitted with fine-mist sprayers, treatment pumps or trigger options depending on your product and viscosity.",
      "A minimum order of just 10 units means you can launch a mist or spray product affordably, whether you're an indie skincare brand, a salon or a wellness business. Our pricing is transparent and tiered — costs fall as your volumes grow — and every bottle can be branded with your logo using silk-screen or hot-stamp printing. Fine, consistent spraying with packaging that looks the part.",
    ],
    metaDescription:
      "Spray and mist bottles wholesale in South Africa — glass and PET for toners, mists and fragrances. From 10 units, with custom branding.",
  },
  "hotel-spa": {
    intro: [
      "Hotel and spa amenity bottles let you offer guests a considered, on-brand experience — shampoo, conditioner, body wash and lotion in refillable or single-use formats. Be Different Packaging supplies hospitality amenity packaging wholesale across South Africa, from compact guest sizes to larger refillable dispensers, in clean, premium finishes that suit boutique lodges, spas and hotels alike.",
      "Because you can order from low minimums and add your own branding with silk-screen or hot-stamp printing, even a small guesthouse or day spa can present a coordinated, professional amenity range. Pricing is transparent and tiered, and our team can help you match bottles, pumps and closures into a cohesive line. Elevate the guest experience with packaging that reflects your property's standard.",
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
      `Browse our range of ${lower} — premium cosmetic and skincare packaging available wholesale across South Africa. We stock a variety of materials, sizes and finishes to suit your product, with matching lids and closures.`,
      `You can order from just 10 units, making it easy for small brands and startups to launch a professional-looking range. Pricing is transparent and tiered — the more you order, the lower the unit cost — and every item can be branded with your logo using silk-screen or hot-stamp printing.`,
    ],
    metaDescription: `Buy ${lower} wholesale in South Africa from 10 units. Premium cosmetic packaging with transparent pricing and custom branding.`,
  };
}
