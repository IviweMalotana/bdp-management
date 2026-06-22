import { notFound } from "next/navigation";
import PDPClient from "./PDPClient";

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

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return {};
  return { title: `${product.name} | BDP Management` };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();
  return <PDPClient product={product} />;
}
