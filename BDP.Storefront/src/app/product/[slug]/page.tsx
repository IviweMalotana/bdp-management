import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PDPClient from "./PDPClient";
import { SITE_URL } from "@/app/layout";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5252";

async function getProduct(slug: string) {
  try {
    const res = await fetch(`${API}/api/storefront/products/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// Lowest sale price across all variants/tiers — used for the schema offer.
function lowestPriceZAR(product: any): number | null {
  const prices: number[] = [];
  for (const v of product?.variants ?? []) {
    for (const t of v?.pricingTiers ?? []) {
      if (typeof t?.salePriceZAR === "number") prices.push(t.salePriceZAR);
    }
  }
  return prices.length ? Math.min(...prices) : null;
}

function imageUrls(product: any): string[] {
  return (product?.images ?? [])
    .map((i: any) => i?.url)
    .filter((u: any): u is string => typeof u === "string" && u.length > 0);
}

// Keyword-rich description capped near the meta-description sweet spot.
function metaDescription(product: any): string {
  const typeLabel = product?.productType || product?.category || "cosmetic packaging";
  const base =
    (product?.description as string | undefined)?.trim() ||
    `${product?.name} — ${typeLabel} available wholesale in South Africa from just 10 units, with custom branding.`;
  const clean = base.replace(/\s+/g, " ");
  return clean.length > 160 ? clean.slice(0, 157).trimEnd() + "…" : clean;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Product not found" };

  const typeLabel = product.productType || product.category || "Cosmetic Packaging";
  const title = `${product.name} ${typeLabel} | Wholesale South Africa`;
  const description = metaDescription(product);
  const canonical = `/product/${slug}`;
  const images = imageUrls(product);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      title,
      description,
      images: images.length ? images : undefined,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const price = lowestPriceZAR(product);
  const images = imageUrls(product);

  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: metaDescription(product),
    category: product.productType || product.category || undefined,
    image: images.length ? images : undefined,
    brand: { "@type": "Brand", name: "Be Different Packaging" },
    ...(price != null
      ? {
          offers: {
            "@type": "Offer",
            url: `${SITE_URL}/product/${slug}`,
            priceCurrency: "ZAR",
            price: price.toFixed(2),
            availability: "https://schema.org/InStock",
            seller: { "@type": "Organization", name: "Be Different Packaging" },
          },
        }
      : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }}
      />
      <PDPClient product={product} />
    </>
  );
}
