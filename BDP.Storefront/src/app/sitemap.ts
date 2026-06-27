import type { MetadataRoute } from "next";
import { SITE_URL } from "./layout";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5252";

// Re-generate at most hourly so new products/collections get crawled.
export const revalidate = 3600;

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API}${path}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/shop`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/collections`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/customise`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/for-business`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/finder`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/contact`, changeFrequency: "monthly", priority: 0.5 },
  ];

  const productsData = await fetchJson<{ items?: { slug?: string }[] }>(
    "/api/storefront/products?pageSize=1000",
  );
  const productRoutes: MetadataRoute.Sitemap = (productsData?.items ?? [])
    .filter((p) => p.slug)
    .map((p) => ({
      url: `${SITE_URL}/product/${p.slug}`,
      changeFrequency: "weekly",
      priority: 0.8,
    }));

  const collections = await fetchJson<{ slug?: string }[]>("/api/storefront/collections");
  const collectionRoutes: MetadataRoute.Sitemap = (collections ?? [])
    .filter((c) => c.slug)
    .map((c) => ({
      url: `${SITE_URL}/collections/${c.slug}`,
      changeFrequency: "weekly",
      priority: 0.7,
    }));

  return [...staticRoutes, ...productRoutes, ...collectionRoutes];
}
