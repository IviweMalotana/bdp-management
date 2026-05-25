"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ProductCard from "../components/ProductCard";

interface Product {
  slug: string;
  name: string;
  category: string;
  primaryUrl?: string;
  basePrice: number;
  lowestMoq: number;
}

interface Category {
  category: string;
  productCount: number;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5252";

export default function ShopClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const page = parseInt(searchParams.get("page") ?? "1");
  const category = searchParams.get("category") ?? "";
  const search = searchParams.get("search") ?? "";
  const sort = searchParams.get("sort") ?? "";

  useEffect(() => {
    fetch(`${API}/api/storefront/categories`)
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: "18" });
    if (category) params.set("category", category);
    if (search) params.set("search", search);

    fetch(`${API}/api/storefront/products?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setProducts(d.items ?? []);
        setTotal(d.total ?? 0);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [page, category, search]);

  function setParam(key: string, value: string) {
    const p = new URLSearchParams(searchParams.toString());
    if (value) p.set(key, value);
    else p.delete(key);
    p.delete("page");
    router.push(`/shop?${p.toString()}`);
  }

  const pageSize = 18;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="max-w-7xl mx-auto px-4 py-16">
      <h1
        className="text-5xl mb-10"
        style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: "#1C1A17" }}
      >
        all packaging
      </h1>

      <div className="flex flex-col md:flex-row gap-10">
        {/* Sidebar */}
        <aside className="md:w-52 shrink-0">
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search…"
              value={search}
              onChange={(e) => setParam("search", e.target.value)}
              className="w-full text-sm px-3 py-2 border outline-none"
              style={{ borderColor: "#C9B8A8", borderRadius: "2px", backgroundColor: "#FEFCFA", color: "#1C1A17" }}
            />
          </div>

          <div className="mb-6">
            <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "#4A4540" }}>Category</p>
            <ul className="space-y-1.5">
              <li>
                <button
                  onClick={() => setParam("category", "")}
                  className={`text-sm w-full text-left hover:opacity-70 ${!category ? "font-medium" : ""}`}
                  style={{ color: "#1C1A17" }}
                >
                  All
                </button>
              </li>
              {categories.map((c) => (
                <li key={c.category}>
                  <button
                    onClick={() => setParam("category", c.category)}
                    className={`text-sm w-full text-left hover:opacity-70 ${category === c.category ? "font-medium" : ""}`}
                    style={{ color: "#1C1A17" }}
                  >
                    {c.category}
                    <span className="ml-1 text-xs" style={{ color: "#C9B8A8" }}>({c.productCount})</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "#4A4540" }}>Sort</p>
            <select
              value={sort}
              onChange={(e) => setParam("sort", e.target.value)}
              className="w-full text-sm px-3 py-2 border outline-none"
              style={{ borderColor: "#C9B8A8", borderRadius: "2px", backgroundColor: "#FEFCFA", color: "#1C1A17" }}
            >
              <option value="">Featured</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="newest">Newest</option>
            </select>
          </div>
        </aside>

        {/* Grid */}
        <div className="flex-1">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="aspect-square animate-pulse" style={{ backgroundColor: "#EDE4D8", borderRadius: "2px" }} />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-lg mb-4" style={{ color: "#4A4540" }}>No products found.</p>
              <button onClick={() => { setParam("category", ""); setParam("search", ""); }} className="text-sm underline" style={{ color: "#1C1A17" }}>
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {products.map((p) => (
                  <ProductCard key={p.slug} {...p} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-12">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      onClick={() => {
                        const p = new URLSearchParams(searchParams.toString());
                        p.set("page", String(n));
                        router.push(`/shop?${p.toString()}`);
                      }}
                      className="w-9 h-9 text-sm border"
                      style={{
                        borderColor: n === page ? "#1C1A17" : "#C9B8A8",
                        backgroundColor: n === page ? "#1C1A17" : "transparent",
                        color: n === page ? "#F5EFE6" : "#1C1A17",
                        borderRadius: "2px",
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
