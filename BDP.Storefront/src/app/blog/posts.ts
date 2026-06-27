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
];

export function getPost(slug: string): Post | undefined {
  return POSTS.find((p) => p.slug === slug);
}
