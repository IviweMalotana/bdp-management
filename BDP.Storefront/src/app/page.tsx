import HomeClient from "./components/HomeClient";

async function getFeaturedProducts() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5252"}/api/storefront/products?pageSize=12`,
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
  return <HomeClient products={products} />;
}
