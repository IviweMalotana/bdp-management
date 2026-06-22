"use client";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
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

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5252";
const PAGE_SIZE = 18;

export default function ShopClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [searchInput, setSearchInput] = useState(searchParams.get("search") ?? "");
  const [sort, setSort] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const externalUpdate = useRef(false);

  // Sync state when the URL changes (e.g. user clicks a category in the header while already on /shop).
  useEffect(() => {
    externalUpdate.current = true;
    setCategory(searchParams.get("category") ?? "");
    setSearch(searchParams.get("search") ?? "");
    setSearchInput(searchParams.get("search") ?? "");
  }, [searchParams]);

  // Fetch categories once
  useEffect(() => {
    fetch(`${API}/api/storefront/categories`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCategories(data.map((c: { category: string }) => c.category));
        }
      })
      .catch(() => {});
  }, []);

  // Debounce the search box (~300ms) so it doesn't refetch every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);
  useEffect(() => {
    if (externalUpdate.current) {
      externalUpdate.current = false;
      return;
    }
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (search) params.set("search", search);
    const qs = params.toString();
    const target = qs ? `/shop?${qs}` : "/shop";
    if (typeof window !== "undefined" && window.location.pathname + window.location.search !== target) {
      router.replace(target, { scroll: false });
    }
  }, [category, search, router]);

  // Fetch first page whenever filters change
  const fetchPage = useCallback(
    (pageNum: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);

      const params = new URLSearchParams({
        page: String(pageNum),
        pageSize: String(PAGE_SIZE),
      });
      if (category) params.set("category", category);
      if (search) params.set("search", search);

      fetch(`${API}/api/storefront/products?${params}`)
        .then((r) => r.json())
        .then((d) => {
          const newItems: Product[] = d.items ?? [];
          setTotal(d.total ?? 0);
          if (append) {
            setItems((prev) => [...prev, ...newItems]);
          } else {
            setItems(newItems);
          }
        })
        .catch(() => {
          if (!append) setItems([]);
        })
        .finally(() => {
          if (append) setLoadingMore(false);
          else setLoading(false);
        });
    },
    [category, search]
  );

  // Reset and reload when filters change
  useEffect(() => {
    setPage(1);
    fetchPage(1, false);
  }, [category, search, fetchPage]);

  function handleLoadMore() {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPage(nextPage, true);
  }

  // Client-side sort over the loaded items (API ignores `sort`).
  const sortedItems = useMemo(() => {
    if (!sort) return items;
    const copy = [...items];
    if (sort === "price_asc") copy.sort((a, b) => a.basePrice - b.basePrice);
    else if (sort === "price_desc") copy.sort((a, b) => b.basePrice - a.basePrice);
    else if (sort === "name_asc") copy.sort((a, b) => a.name.localeCompare(b.name));
    return copy;
  }, [items, sort]);

  const allLoaded = items.length >= total && !loading;

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "96px 24px 64px", boxSizing: "border-box" }}>
      {/* Title row */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: "32px",
        }}
      >
        <h1
          style={{
            fontFamily: '"Playfair Display", Georgia, serif',
            fontSize: "48px",
            fontWeight: 400,
            color: "#1A1A18",
            margin: 0,
          }}
        >
          all packaging
        </h1>
        <div style={{ display: "flex", alignItems: "center" }}>
          <label
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: "12px",
              letterSpacing: "1.5px",
              color: "#B8A99A",
              textTransform: "uppercase",
              marginRight: "8px",
            }}
          >
            SORT
          </label>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            style={{
              background: "#F5F0E8",
              border: "0.67px solid rgb(184,169,154)",
              borderRadius: "2px",
              padding: "8px 12px",
              fontFamily: "Inter, sans-serif",
              fontSize: "14px",
              color: "#1A1A18",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="">Featured</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="name_asc">Name: A–Z</option>
          </select>
        </div>
      </div>

      {/* Main content */}
      <div style={{ display: "flex", flexDirection: "row", gap: "48px" }}>
        {/* Sidebar */}
        <aside style={{ width: "240px", flexShrink: 0 }}>
          <input
            type="text"
            placeholder="Search…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{
              background: "#F5F0E8",
              border: "0.67px solid rgb(184,169,154)",
              borderRadius: "2px",
              padding: "12px 16px",
              fontFamily: "Inter, sans-serif",
              fontSize: "14px",
              color: "#1A1A18",
              width: "100%",
              marginBottom: "24px",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          <span
            style={{
              display: "block",
              fontFamily: "Inter, sans-serif",
              fontSize: "12px",
              letterSpacing: "1.5px",
              color: "#B8A99A",
              textTransform: "uppercase",
              marginBottom: "16px",
            }}
          >
            CATEGORY
          </span>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            <li>
              <button
                onClick={() => setCategory("")}
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: "14px",
                  color: !category ? "#C4A882" : "#1A1A18",
                  padding: "8px 12px",
                  borderLeft: !category ? "2px solid #C4A882" : "2px solid transparent",
                  borderTop: "none",
                  borderRight: "none",
                  borderBottom: "none",
                  display: "block",
                  cursor: "pointer",
                  width: "100%",
                  textAlign: "left",
                  background: "none",
                }}
              >
                All
              </button>
            </li>
            {categories.map((cat) => (
              <li key={cat}>
                <button
                  onClick={() => setCategory(cat)}
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: "14px",
                    color: category === cat ? "#C4A882" : "#1A1A18",
                    padding: "8px 12px",
                    borderLeft: category === cat ? "2px solid #C4A882" : "2px solid transparent",
                    borderTop: "none",
                    borderRight: "none",
                    borderBottom: "none",
                    display: "block",
                    cursor: "pointer",
                    width: "100%",
                    textAlign: "left",
                    background: "none",
                  }}
                >
                  {cat}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Product area */}
        <div style={{ flex: 1 }}>
          {loading ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "24px",
              }}
            >
              {Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  style={{ aspectRatio: "1/1", background: "#EDE6DA" }}
                />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div style={{ textAlign: "center", paddingTop: "80px" }}>
              <p style={{ color: "#B8A99A", fontFamily: "Inter, sans-serif" }}>No products found.</p>
              <button
                onClick={() => { setCategory(""); setSearch(""); setSearchInput(""); }}
                style={{
                  marginTop: "16px",
                  fontFamily: "Inter, sans-serif",
                  fontSize: "14px",
                  color: "#1A1A18",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "24px",
                }}
              >
                {sortedItems.map((p) => (
                  <ProductCard key={p.slug} {...p} />
                ))}
              </div>

              {!allLoaded && (
                <div style={{ textAlign: "center", marginTop: "48px" }}>
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    style={{
                      fontFamily: '"Playfair Display", Georgia, serif',
                      fontSize: "16px",
                      color: loadingMore ? "#B8A99A" : "#B8A99A",
                      background: "none",
                      border: "none",
                      cursor: loadingMore ? "default" : "pointer",
                    }}
                    onMouseEnter={(e) => {
                      if (!loadingMore) (e.currentTarget as HTMLButtonElement).style.color = "#C4A882";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color = "#B8A99A";
                    }}
                  >
                    {loadingMore ? "Loading…" : "Load more →"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
