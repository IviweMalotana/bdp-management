import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProductCard from "@/app/components/ProductCard";
import { getCategoryCopy } from "../categoryCopy";
import { SITE_URL } from "@/app/layout";

interface CollectionProduct {
  id: number;
  slug: string;
  name: string;
  category: string;
  primaryUrl?: string;
  basePrice: number;
  lowestMoq: number;
}

interface CollectionDetail {
  id: number;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  products: CollectionProduct[];
}

async function getCollection(slug: string): Promise<CollectionDetail | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5252"}/api/storefront/collections/${slug}`,
      { next: { revalidate: 60 } }
    );
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const collection = await getCollection(slug);
  if (!collection) return { title: "Collection not found" };

  const copy = getCategoryCopy(slug, collection.name);
  const title = `${collection.name} South Africa | Wholesale Cosmetic Packaging`;
  const description =
    collection.description?.replace(/\s+/g, " ").slice(0, 160) || copy.metaDescription;

  return {
    title,
    description,
    alternates: { canonical: `/collections/${slug}` },
    openGraph: { title, description, url: `/collections/${slug}`, type: "website" },
  };
}

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const collection = await getCollection(slug);

  if (!collection) notFound();

  // Staff-authored description wins; otherwise fall back to bespoke/generic copy.
  const copy = getCategoryCopy(slug, collection.name);
  const introParagraphs = collection.description?.trim()
    ? [collection.description.trim()]
    : copy.intro;

  const canonical = `${SITE_URL}/collections/${slug}`;
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Collections", item: `${SITE_URL}/collections` },
      { "@type": "ListItem", position: 3, name: collection.name, item: canonical },
    ],
  };
  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${collection.name} — Cosmetic Packaging South Africa`,
    url: canonical,
    description: introParagraphs[0],
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: collection.products.length,
      itemListElement: collection.products.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${SITE_URL}/product/${p.slug}`,
        name: p.name,
      })),
    },
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }}
      />
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs mb-10" style={{ color: "#C9B8A8" }}>
        <Link href="/" className="hover:opacity-70 transition-opacity" style={{ color: "#4A4540" }}>
          Home
        </Link>
        <span>/</span>
        <Link href="/collections" className="hover:opacity-70 transition-opacity" style={{ color: "#4A4540" }}>
          Collections
        </Link>
        <span>/</span>
        <span style={{ color: "#1C1A17" }}>{collection.name}</span>
      </nav>

      {/* Header */}
      <div className="mb-12 max-w-2xl">
        <h1
          className="text-5xl md:text-6xl mb-4"
          style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: "#1C1A17" }}
        >
          {collection.name.toLowerCase()}
        </h1>
        <div className="space-y-3">
          {introParagraphs.map((para, i) => (
            <p key={i} className="text-sm leading-relaxed" style={{ color: "#4A4540", lineHeight: 1.8 }}>
              {para}
            </p>
          ))}
        </div>
        <p className="text-xs mt-4" style={{ color: "#C9B8A8" }}>
          {collection.products.length} {collection.products.length === 1 ? "product" : "products"}
        </p>
      </div>

      {/* Product grid */}
      {collection.products.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-lg mb-6" style={{ color: "#4A4540" }}>
            Products are being added to this collection.
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {collection.products.map((p) => (
            <ProductCard key={p.slug} {...p} />
          ))}
        </div>
      )}

      {/* Back link */}
      <div className="mt-16 pt-8 border-t" style={{ borderColor: "#C9B8A8" }}>
        <Link
          href="/collections"
          className="text-sm hover:opacity-70 transition-opacity"
          style={{ color: "#4A4540" }}
        >
          ← All Collections
        </Link>
      </div>
    </div>
  );
}
