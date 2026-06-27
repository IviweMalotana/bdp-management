import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cosmetic Packaging Collections South Africa | Bottles, Jars & Droppers",
  description:
    "Browse cosmetic packaging by type — dropper bottles, cream jars, pump bottles, serum droppers and sprays. Wholesale in South Africa from 10 units.",
  alternates: { canonical: "/collections" },
};

async function getCollections() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5252"}/api/storefront/collections`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function CollectionsPage() {
  const collections = await getCollections() as {
    id: number; name: string; slug: string; description?: string;
    imageUrl?: string; productCount: number;
  }[];

  return (
    <div className="max-w-7xl mx-auto px-4 py-20">
      <h1
        className="text-5xl md:text-6xl mb-4"
        style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: "#1C1A17" }}
      >
        collections
      </h1>
      <p className="text-sm mb-16 max-w-lg" style={{ color: "#4A4540", lineHeight: 1.8 }}>
        Browse by packaging type. Dropper bottles, cream jars, pump bottles, and more. Each collection brings together wholesale options for cosmetic brands, skincare manufacturers, and private label suppliers.
      </p>

      {collections.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-lg mb-6" style={{ color: "#4A4540" }}>
            Collections are being built from the product catalogue. Browse all packaging in the meantime.
          </p>
          <Link
            href="/shop"
            className="inline-flex items-center px-8 py-3.5 text-sm font-medium"
            style={{ backgroundColor: "#1C1A17", color: "#FAF8F5", borderRadius: "2px" }}
          >
            Shop all packaging →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {collections.map((c) => (
            <Link
              key={c.id}
              href={`/collections/${c.slug}`}
              className="group block border"
              style={{ borderColor: "#C9B8A8", borderRadius: "2px" }}
            >
              <div
                className="h-48 flex items-center justify-center overflow-hidden"
                style={{ backgroundColor: "#E8DDD0" }}
              >
                {c.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.imageUrl} alt={c.name} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300" />
                ) : (
                  <span className="text-xs" style={{ color: "#C9B8A8" }}>collection image</span>
                )}
              </div>
              <div className="p-5">
                <h2
                  className="text-2xl mb-1"
                  style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: "#1C1A17" }}
                >
                  {c.name}
                </h2>
                {c.description && (
                  <p className="text-sm mb-2" style={{ color: "#4A4540" }}>{c.description}</p>
                )}
                <p className="text-xs" style={{ color: "#C9B8A8" }}>{c.productCount} products</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
