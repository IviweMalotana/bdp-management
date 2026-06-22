"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { addToCart } from "@/lib/api";

interface CardVariant {
  id: number;
  size?: string;
  colour?: string;
  texture?: string;
}

interface ProductCardProps {
  slug: string;
  name: string;
  category?: string;
  primaryUrl?: string;
  basePrice: number;
  lowestMoq?: number;
  variants?: CardVariant[];
}

export default function ProductCard({
  slug,
  name,
  primaryUrl,
  basePrice,
  lowestMoq,
  variants,
}: ProductCardProps) {
  const [adding, setAdding] = useState(false);
  const { setCart, getSessionToken, openDrawer } = useCartStore();
  const { jwt } = useAuthStore();

  const firstVariant = variants && variants.length > 0 ? variants[0] : undefined;

  async function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!firstVariant) {
      // No variant info in the listing — fall back to the product page.
      window.location.href = `/product/${slug}`;
      return;
    }
    setAdding(true);
    try {
      const qty = Math.max(lowestMoq ?? 10, 10);
      const result = await addToCart(getSessionToken(), firstVariant.id, qty, undefined, jwt ?? undefined);
      setCart(result as Parameters<typeof setCart>[0]);
      openDrawer();
    } catch {
      window.location.href = `/product/${slug}`;
    } finally {
      setAdding(false);
    }
  }

  return (
    <Link href={`/product/${slug}`} style={{ display: "block", textDecoration: "none" }}>
      <div style={{ background: "#EDE6DA", border: "0.67px solid rgba(184,169,154,0.3)", overflow: "hidden" }}>
        <div style={{ aspectRatio: "1/1", overflow: "hidden", position: "relative" }}>
          {primaryUrl ? (
            <Image
              src={primaryUrl}
              alt={name}
              fill
              style={{ objectFit: "cover" }}
              sizes="(max-width: 768px) 50vw, 25vw"
            />
          ) : (
            <div style={{ width: "100%", height: "100%", background: "#EDE6DA" }} />
          )}
        </div>
        <div style={{ padding: "16px" }}>
          <h3 style={{ fontFamily: "Inter, sans-serif", fontSize: "16px", fontWeight: 500, color: "#1A1A18", margin: "0 0 2px 0" }}>
            {name}
          </h3>
          <p style={{ fontFamily: '"Source Code Pro", monospace', fontSize: "14px", color: "#C4A882", margin: "0 0 12px 0" }}>
            from R {basePrice.toFixed(2)} / unit
          </p>
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding}
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: "12px",
              color: "#C4A882",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              background: "none",
              border: "none",
              padding: 0,
              cursor: adding ? "default" : "pointer",
            }}
          >
            {adding ? "ADDING…" : "ADD TO CART →"}
          </button>
        </div>
      </div>
    </Link>
  );
}
