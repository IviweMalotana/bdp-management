// Blog content lives here as structured data (no MDX dependency). Each post
// targets a long-tail keyword and links internally to shop/collection pages.
// To add a post, append to POSTS — the index, post page and sitemap pick it up.

export type Block =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "ul"; items: string[] };

export interface RelatedLink {
  href: string;
  label: string;
}

export interface Post {
  slug: string;
  title: string; // H1 / page title
  description: string; // meta description (~150–160 chars)
  excerpt: string; // shown on the index
  date: string; // ISO yyyy-mm-dd
  readMinutes: number;
  blocks: Block[];
  related: RelatedLink[];
}

export const POSTS: Post[] = [
  {
    slug: "how-to-choose-cosmetic-packaging-skincare-brand-south-africa",
    title: "How to Choose Cosmetic Packaging for a New Skincare Brand in South Africa",
    description:
      "A practical guide to choosing cosmetic packaging for a new South African skincare brand — formats, materials, sizes, MOQs and branding.",
    excerpt:
      "Launching a skincare line? Here's how to pick the right bottles and jars for your products, your budget and your brand — without ordering thousands of units.",
    date: "2026-06-20",
    readMinutes: 6,
    blocks: [
      {
        type: "p",
        text: "Starting a skincare brand in South Africa is exciting — but the packaging decision trips up almost every new founder. Choose wrong and you either overspend on stock you can't move, or end up with bottles that leak, look cheap, or don't suit your formulation. This guide walks through the decisions in the order that actually matters.",
      },
      { type: "h2", text: "1. Match the format to the formulation" },
      {
        type: "p",
        text: "Start with what's going inside. Thick creams, balms and body butters belong in wide-mouth jars so customers can scoop them out. Lightweight serums and facial oils need dropper bottles for precise dosing. Lotions, cleansers and shampoos dispense best from pump bottles, while toners, mists and fragrances suit fine-mist spray bottles. For active-rich serums that oxidise, an airless pump protects the formula and dispenses almost every last drop.",
      },
      { type: "h2", text: "2. Pick a material" },
      {
        type: "p",
        text: "Glass feels premium, is fully recyclable and is inert — ideal for facial oils and high-end serums. Amber and frosted glass also shield light-sensitive actives. PET and acrylic are lighter, shatter-resistant and cheaper to ship, which makes them practical for body products and travel sizes. Many brands mix materials across a range: glass for the hero serum, PET for the body lotion.",
      },
      { type: "h2", text: "3. Get the size right" },
      {
        type: "p",
        text: "Offer a size your customer will actually finish in a reasonable time. 30ml is a sweet spot for serums; 50g works well for face creams; body products scale up to 100ml–250ml. Sample and travel sizes (5–15ml) are a smart, low-cost way to let customers try before they commit — and they make great add-ons at checkout.",
      },
      { type: "h2", text: "4. Mind the minimum order" },
      {
        type: "p",
        text: "This is where most South African suppliers force you into orders of 1,000+ units per item — a huge gamble for a new brand. Be Different Packaging lets you start from just 10 units, so you can launch a full range, test what sells, and reorder your winners. Pricing is tiered and transparent: your unit cost falls as you scale, so there's a clear path from sampling to volume.",
      },
      { type: "h2", text: "5. Plan your branding early" },
      {
        type: "p",
        text: "Decide upfront whether you'll add your logo. Silk-screen and hot-stamp printing turn a generic bottle into a branded product and dramatically lift perceived value. Even a single colour logo on a frosted jar reads as premium. Factor the customisation minimum and lead time into your launch timeline so your branded stock arrives when you need it.",
      },
      {
        type: "p",
        text: "Get these five decisions right and your packaging will protect your formula, suit your customer, and make your brand look established from day one — all without an unaffordable first order.",
      },
    ],
    related: [
      { href: "/shop", label: "Shop all cosmetic packaging" },
      { href: "/collections/dropper-bottles", label: "Dropper bottles for serums" },
      { href: "/collections/cosmetic-jars", label: "Cosmetic jars for creams" },
      { href: "/customise", label: "Add your logo (customisation)" },
    ],
  },
  {
    slug: "glass-vs-pet-vs-acrylic-cosmetic-bottle-materials",
    title: "Glass vs PET vs Acrylic: Choosing Cosmetic Bottle Materials",
    description:
      "Glass, PET or acrylic for your cosmetic bottles and jars? Compare cost, weight, durability, recyclability and which suits each skincare product.",
    excerpt:
      "The material you choose affects cost, shipping, shelf appeal and how well your formula keeps. Here's a straight comparison of glass, PET and acrylic.",
    date: "2026-06-24",
    readMinutes: 5,
    blocks: [
      {
        type: "p",
        text: "Once you've picked a format, the next question is what it should be made of. The three materials you'll meet most often in cosmetic packaging are glass, PET and acrylic. Each has a clear place — here's how to choose.",
      },
      { type: "h2", text: "Glass" },
      {
        type: "p",
        text: "Glass is the premium choice. It's inert, so it won't react with oils, essential oils or active ingredients, and it's endlessly recyclable. Frosted and amber glass also protect light-sensitive formulations. The trade-offs are weight and fragility: glass costs more to ship and can break, so it's best for hero products — facial serums, oils and high-end creams — where the look and protection justify it.",
      },
      { type: "h2", text: "PET (plastic)" },
      {
        type: "p",
        text: "PET is a lightweight, shatter-resistant plastic that's widely recyclable. It keeps shipping costs down and is practically unbreakable, which makes it ideal for body lotions, shampoos, cleansers, mists and anything travel-sized. Modern PET can look surprisingly premium — especially in frosted finishes — at a fraction of the weight of glass.",
      },
      { type: "h2", text: "Acrylic" },
      {
        type: "p",
        text: "Acrylic delivers a thick, glossy, luxurious look — think double-walled cream jars that feel substantial in the hand. It's often used for premium-positioned moisturisers where presentation is part of the product. It's heavier and pricier than PET but more impact-resistant than glass.",
      },
      { type: "h2", text: "Quick comparison" },
      {
        type: "ul",
        items: [
          "Premium feel: Glass and acrylic lead; PET is catching up in frosted finishes.",
          "Protects actives: Glass (especially amber/frosted) is best.",
          "Shipping cost & durability: PET wins — light and shatter-resistant.",
          "Recyclability: Glass and PET are both widely recyclable.",
          "Best for: Glass — serums & oils; PET — body & travel; Acrylic — luxury creams.",
        ],
      },
      {
        type: "p",
        text: "Most successful ranges mix materials: glass for the statement serum, PET for the everyday body products, acrylic where a jar needs to feel indulgent. Because you can order from just 10 units, it's easy and affordable to test a couple of materials before you commit to a full run.",
      },
    ],
    related: [
      { href: "/collections/dropper-bottles", label: "Glass dropper bottles" },
      { href: "/collections/cosmetic-jars", label: "Glass & acrylic jars" },
      { href: "/collections/pump-bottles", label: "PET & glass pump bottles" },
      { href: "/finder", label: "Not sure? Use the packaging finder" },
    ],
  },
  {
    slug: "airless-pump-bottles-vs-regular-pumps-serum",
    title: "Airless Pump Bottles vs Regular Pumps: Which Is Right for Your Serum?",
    description:
      "Airless or regular pump bottles for your serum? Compare freshness, dispensing, cost and which protects active skincare ingredients best.",
    excerpt:
      "Both dispense neatly, but only one protects your actives and gets almost every drop out. Here's how to choose between airless and regular pumps.",
    date: "2026-06-25",
    readMinutes: 5,
    blocks: [
      {
        type: "p",
        text: "If you're packaging a serum, the choice between an airless pump and a regular pump bottle matters more than it looks. Both give clean, measured dispensing — but they protect your formula very differently, and that affects shelf life, customer experience and how premium your product feels.",
      },
      { type: "h2", text: "How each one works" },
      {
        type: "p",
        text: "A regular pump draws liquid up a dip tube using a spring mechanism, pulling air back into the bottle with every press. An airless pump has no dip tube: a piston or collapsing pouch pushes product up from the base, so air never enters the chamber. That single difference drives everything else.",
      },
      { type: "h2", text: "Protecting active ingredients" },
      {
        type: "p",
        text: "Many of the ingredients that make a serum worth buying — vitamin C, retinol, peptides, many botanical oils — degrade when exposed to air and light. Because airless bottles keep oxygen out, they preserve these actives far better than a regular pump, which lets a little air in with each use. If your serum is built around sensitive actives, airless is the safer choice.",
      },
      { type: "h2", text: "Getting every drop" },
      {
        type: "p",
        text: "Regular pumps with a dip tube often leave product stranded at the bottom and around the sides. Airless systems dispense almost the entire fill — typically 90%+ — which customers notice and appreciate, especially for higher-priced serums.",
      },
      { type: "h2", text: "Cost and look" },
      {
        type: "p",
        text: "Regular pump bottles are cheaper and perfectly good for oils and less air-sensitive formulas. Airless bottles cost a little more but look and feel distinctly premium — the sleek, modern format customers associate with high-performance skincare. For a hero serum, that perception often pays for itself.",
      },
      { type: "h2", text: "Quick rule of thumb" },
      {
        type: "ul",
        items: [
          "Active-rich or oxidation-prone serum → airless pump.",
          "Simple facial oil or budget line → regular pump or dropper.",
          "Want the most premium feel → airless.",
          "Tightest cost per unit → regular pump.",
        ],
      },
      {
        type: "p",
        text: "Because you can order either from just 10 units, you don't have to guess — sample both with your actual formula and see which dispenses and ages best before committing to a larger run.",
      },
    ],
    related: [
      { href: "/collections/airless-pump-bottles", label: "Airless pump bottles" },
      { href: "/collections/pump-bottles", label: "Regular pump bottles" },
      { href: "/collections/serum-bottles", label: "Serum & dropper bottles" },
      { href: "/shop", label: "Shop all packaging" },
    ],
  },
  {
    slug: "minimum-order-quantities-cosmetic-packaging-south-africa",
    title: "Minimum Order Quantities for Cosmetic Packaging: What Small Brands Need to Know",
    description:
      "Cosmetic packaging MOQs explained for South African brands — why most suppliers demand 1,000+ units, and how to start from just 10.",
    excerpt:
      "MOQs are the biggest hurdle for new skincare brands. Here's what they really mean, why they exist, and how to launch without ordering thousands of units.",
    date: "2026-06-26",
    readMinutes: 4,
    blocks: [
      {
        type: "p",
        text: "Minimum order quantity — MOQ — is the smallest number of units a supplier will sell you of a given item. For new cosmetic brands in South Africa, it's often the single biggest barrier to launching: many suppliers won't sell a bottle or jar in quantities under 1,000, sometimes far more.",
      },
      { type: "h2", text: "Why MOQs exist" },
      {
        type: "p",
        text: "MOQs come from how packaging is made and shipped. Moulds, machine setup and freight from overseas are most economical in bulk, so suppliers set a floor that makes each order worth fulfilling. That logic suits established brands moving volume — but it's brutal for someone testing their first three products.",
      },
      { type: "h2", text: "The hidden cost of a high MOQ" },
      {
        type: "p",
        text: "A 1,000-unit minimum per item means a three-product range can require 3,000+ pieces before you've sold a single unit. That's money tied up in stock, storage to find, and real risk if a product doesn't land. Worse, it discourages experimentation — the very thing a new brand needs to find what sells.",
      },
      { type: "h2", text: "A better model for small brands" },
      {
        type: "p",
        text: "Be Different Packaging is built around low minimums: you can order most items from just 10 units. That changes the maths entirely. You can launch a full range cheaply, see which products move, and reorder your winners — scaling stock to demand instead of betting on it upfront.",
      },
      { type: "h2", text: "Tiered pricing: the best of both" },
      {
        type: "p",
        text: "Low minimums don't mean you're stuck with high prices forever. Our pricing is tiered and fully transparent — the unit cost drops as your quantities grow. So you start small at a fair price, and your margins improve automatically as you scale. There's a clear, affordable path from your first 10 units to your first 10,000.",
      },
      {
        type: "p",
        text: "If a high MOQ has been holding your brand back, it no longer has to. Start with the quantities you can actually sell, and grow from there.",
      },
    ],
    related: [
      { href: "/shop", label: "Shop packaging from 10 units" },
      { href: "/for-business", label: "Bulk & wholesale options" },
      { href: "/collections/cosmetic-jars", label: "Cosmetic jars" },
      { href: "/collections/dropper-bottles", label: "Dropper bottles" },
    ],
  },
  {
    slug: "how-to-get-your-logo-on-cosmetic-bottles-south-africa",
    title: "How to Get Your Logo on Cosmetic Bottles in South Africa",
    description:
      "Custom branding for cosmetic bottles in South Africa — silk screen vs hot stamping vs colour change, costs, artwork tips and minimums.",
    excerpt:
      "Branded packaging makes a small range look established. Here's how logo printing on bottles and jars works — the methods, the artwork, and what it costs.",
    date: "2026-06-27",
    readMinutes: 5,
    blocks: [
      {
        type: "p",
        text: "Putting your logo on your packaging is one of the fastest ways to make a young skincare brand look established. A branded jar or bottle reads as a real product, not a repackaged generic — and it lifts perceived value far beyond what the printing costs. Here's how it works in South Africa.",
      },
      { type: "h2", text: "Silk screen printing" },
      {
        type: "p",
        text: "Silk screen presses ink directly onto the bottle or jar through a fine mesh. It's crisp, durable and excellent for logos and simple artwork in one or two colours. It's the most popular choice for cosmetic packaging because it looks clean and holds up well to handling and bathroom humidity.",
      },
      { type: "h2", text: "Hot stamping (foil)" },
      {
        type: "p",
        text: "Hot stamping applies a metallic or coloured foil under heat and pressure — that gold or silver logo you see on premium skincare. It's the go-to when you want a luxurious, reflective finish that signals a high-end product. Best for bold, solid logos rather than fine detail.",
      },
      { type: "h2", text: "Colour change" },
      {
        type: "p",
        text: "Beyond printing your logo, you can change the colour or finish of the bottle or lid itself — frosted, matte, or a custom shade — to match your brand palette. Combined with a printed logo, it creates a fully coordinated, bespoke look.",
      },
      { type: "h2", text: "Getting your artwork right" },
      {
        type: "ul",
        items: [
          "Supply your logo as a vector file (AI, EPS, SVG or PDF) so it scales cleanly.",
          "Keep one- or two-colour designs for silk screen; bold, solid shapes for hot stamping.",
          "Allow for the curved surface — very fine detail and tiny text can be hard to print on small bottles.",
          "Decide placement (front panel, lid, or both) before you order.",
        ],
      },
      { type: "h2", text: "Costs and minimums" },
      {
        type: "p",
        text: "Customisation pricing depends on the method and quantity, and like our packaging it's transparent and tiered. You don't need a giant order to brand your products — talk to us about the current minimums for silk screen, hot stamping and colour change, and we'll help you choose the most cost-effective option for your range.",
      },
      {
        type: "p",
        text: "Branded packaging is often the difference between looking like a hobby and looking like a brand. It's more affordable than most founders expect — and it's one of the highest-impact upgrades you can make.",
      },
    ],
    related: [
      { href: "/customise", label: "See customisation options" },
      { href: "/collections/cosmetic-jars", label: "Jars to brand" },
      { href: "/collections/dropper-bottles", label: "Dropper bottles to brand" },
      { href: "/contact", label: "Ask about branding your range" },
    ],
  },
  {
    slug: "cosmetic-packaging-for-hotels-spas-south-africa",
    title: "Cosmetic Packaging for Hotels and Spas: What to Order and How Much",
    description:
      "A guide to amenity packaging for South African hotels and spas — bottle types, sizes, refillable vs single-use, branding and quantities.",
    excerpt:
      "Guest amenities shape how your property feels. Here's what packaging to order for a hotel or spa, in what sizes, and how to make it on-brand.",
    date: "2026-06-27",
    readMinutes: 5,
    blocks: [
      {
        type: "p",
        text: "For a hotel, lodge or spa, amenity packaging is part of the guest experience. Well-chosen, on-brand bottles signal quality the moment a guest walks into the bathroom. Here's how to think about what to order and how much.",
      },
      { type: "h2", text: "What to include" },
      {
        type: "p",
        text: "A standard guest set usually covers shampoo, conditioner, body wash and body lotion, often with a bar or liquid soap. Spas may add massage oils, scrubs and treatment products in jars. Keep the line visually consistent — matching bottles, pumps and labels — so the set looks intentional rather than assembled from whatever was available.",
      },
      { type: "h2", text: "Refillable vs single-use" },
      {
        type: "p",
        text: "Refillable wall-mounted or counter dispensers cut waste and cost per guest over time, and increasingly guests expect them. Single-use guest bottles still suit premium rooms and spa retail. Many properties mix the two: refillable for everyday toiletries, smaller branded bottles for premium suites or as retail items guests can buy.",
      },
      { type: "h2", text: "Sizes that make sense" },
      {
        type: "ul",
        items: [
          "Guest single-use: compact 30–50ml bottles.",
          "Refillable in-room dispensers: 250ml+.",
          "Spa retail: full-size bottles and jars customers can take home.",
        ],
      },
      { type: "h2", text: "Make it on-brand" },
      {
        type: "p",
        text: "Adding your property's logo with silk screen or hot stamping turns standard amenities into a branded touchpoint — and branded retail bottles become an extra revenue line in the spa shop. Even a small guesthouse can present a coordinated, professional range.",
      },
      { type: "h2", text: "How much to order" },
      {
        type: "p",
        text: "Estimate from occupancy: rooms × turnover × your reorder window, plus a buffer. Because we supply from low minimums with tiered pricing, you can start with a modest order to trial a line, then scale to your true volume without overcommitting. Our team can help you match bottles, pumps and closures into one cohesive amenity range.",
      },
    ],
    related: [
      { href: "/collections/hotel-spa", label: "Hotel & spa amenity bottles" },
      { href: "/for-business", label: "Bulk & B2B ordering" },
      { href: "/collections/pump-bottles", label: "Pump bottles & dispensers" },
      { href: "/contact", label: "Plan your amenity range" },
    ],
  },
];

export function getPost(slug: string): Post | undefined {
  return POSTS.find((p) => p.slug === slug);
}
