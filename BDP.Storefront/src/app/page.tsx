import Link from "next/link";
import ProductCard from "./components/ProductCard";

async function getFeaturedProducts() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5252"}/api/storefront/products?pageSize=4`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.items ?? [];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const products = await getFeaturedProducts();

  return (
    <>
      {/* Hero */}
      <section
        className="min-h-[90vh] flex items-center py-20 md:py-28 px-4"
        style={{ backgroundColor: "#FAF8F5" }}
      >
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h1
              className="text-6xl md:text-8xl leading-none mb-8"
              style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: "#1C1A17" }}
            >
              your packaging.
              <br />
              your brand.
            </h1>
            <p className="text-lg mb-10 max-w-md" style={{ color: "#4A4540", lineHeight: 1.7 }}>
              Premium cosmetic packaging wholesale — from 10 units to 10,000. South Africa&apos;s home for skincare brands and hospitality.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/shop"
                className="inline-flex items-center px-8 py-3.5 text-sm font-medium tracking-wide transition-colors"
                style={{
                  backgroundColor: "#1C1A17",
                  color: "#FAF8F5",
                  borderRadius: "2px",
                }}
              >
                Shop Packaging
              </Link>
              <Link
                href="/for-business"
                className="inline-flex items-center px-8 py-3.5 text-sm font-medium tracking-wide transition-colors border"
                style={{
                  borderColor: "#1C1A17",
                  color: "#1C1A17",
                  borderRadius: "2px",
                }}
              >
                For Business →
              </Link>
            </div>
          </div>
          <div
            className="hidden md:flex items-center justify-center h-96 rounded-sm"
            style={{ backgroundColor: "#E8DDD0", borderRadius: "2px" }}
          >
            <span className="text-sm" style={{ color: "#C9B8A8" }}>product imagery</span>
          </div>
        </div>
      </section>

      {/* Three entry points */}
      <section className="py-20 md:py-28 px-4" style={{ backgroundColor: "#FAF8F5" }}>
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              heading: "starting your\nskincare brand",
              body: "From 10 units. Try before you scale. No massive upfront investment.",
              cta: "Browse →",
              href: "/shop",
            },
            {
              heading: "hotels &\nspas",
              body: "Recurring orders. Invoiced. Branded with your property identity.",
              cta: "Learn more →",
              href: "/for-business",
            },
            {
              heading: "scaling\nyour brand",
              body: "500–5000 units. Shopify-ready export. Volume pricing that works.",
              cta: "Browse →",
              href: "/shop",
            },
          ].map((card, i) => (
            <div
              key={i}
              className="p-8 border"
              style={{
                backgroundColor: "#E8DDD0",
                borderColor: "#C9B8A8",
                borderRadius: "2px",
                boxShadow: "0 1px 4px rgba(28,26,23,0.04)",
              }}
            >
              <h2
                className="text-3xl leading-tight mb-4 whitespace-pre-line"
                style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: "#1C1A17" }}
              >
                {card.heading}
              </h2>
              <p className="text-sm mb-6" style={{ color: "#4A4540", lineHeight: 1.7 }}>
                {card.body}
              </p>
              <Link
                href={card.href}
                className="text-sm font-medium hover:opacity-70 transition-opacity"
                style={{ color: "#1C1A17" }}
              >
                {card.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Featured products */}
      <section className="py-20 md:py-28 px-4" style={{ backgroundColor: "#FAF8F5" }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <h2
              className="text-4xl md:text-5xl"
              style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: "#1C1A17" }}
            >
              featured packaging
            </h2>
            <Link
              href="/shop"
              className="text-sm hidden md:block hover:opacity-70 transition-opacity"
              style={{ color: "#4A4540" }}
            >
              View all →
            </Link>
          </div>
          {products.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {products.map((p: {
                slug: string;
                name: string;
                category: string;
                primaryUrl?: string;
                basePrice: number;
                lowestMoq: number;
              }) => (
                <ProductCard key={p.slug} {...p} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="aspect-square animate-pulse" style={{ backgroundColor: "#E8DDD0", borderRadius: "2px" }} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Live pricing teaser */}
      <section className="py-20 md:py-28 px-4" style={{ backgroundColor: "#E8DDD0" }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2
            className="text-4xl md:text-5xl mb-6"
            style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: "#1C1A17" }}
          >
            the more you order, the less you pay.
          </h2>
          <p className="text-sm mb-8" style={{ color: "#4A4540" }}>
            Our tiered pricing rewards volume. See how it works on any product page — adjust your quantity and watch the price update live.
          </p>
          <Link
            href="/shop"
            className="inline-flex items-center px-8 py-3.5 text-sm font-medium tracking-wide"
            style={{ backgroundColor: "#1C1A17", color: "#FAF8F5", borderRadius: "2px" }}
          >
            See pricing tiers →
          </Link>
        </div>
      </section>

      {/* Customisation CTA */}
      <section className="py-20 md:py-28 px-4" style={{ backgroundColor: "#EDD8D2" }}>
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h2
              className="text-5xl md:text-6xl mb-6"
              style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: "#1C1A17" }}
            >
              make it yours.
            </h2>
            <p className="text-sm mb-8 max-w-md" style={{ color: "#4A4540", lineHeight: 1.7 }}>
              Add your logo with silk-screen or hot-stamp printing. Minimum 100 units. Delivered to your door from China in 4–6 weeks.
            </p>
            <Link
              href="/customise"
              className="inline-flex items-center px-8 py-3.5 text-sm font-medium tracking-wide border"
              style={{ borderColor: "#1C1A17", color: "#1C1A17", borderRadius: "2px" }}
            >
              Explore Customisation →
            </Link>
          </div>
          <div
            className="h-72 flex items-center justify-center"
            style={{ backgroundColor: "#D4A89A", borderRadius: "2px", opacity: 0.4 }}
          >
            <span className="text-sm" style={{ color: "#1C1A17" }}>customisation imagery</span>
          </div>
        </div>
      </section>

      {/* B2B strip */}
      <section className="py-20 md:py-28 px-4" style={{ backgroundColor: "#1C1A17" }}>
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-lg md:text-xl mb-8" style={{ color: "#FAF8F5", lineHeight: 1.8 }}>
            Running a hotel, spa, or salon? Set up recurring orders, get invoiced on net terms, and never think about reordering again.
          </p>
          <Link
            href="/for-business"
            className="inline-flex items-center px-8 py-3.5 text-sm font-medium tracking-wide"
            style={{ backgroundColor: "#D4A89A", color: "#1C1A17", borderRadius: "2px" }}
          >
            Open a Business Account →
          </Link>
        </div>
      </section>
    </>
  );
}
