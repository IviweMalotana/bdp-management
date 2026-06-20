"use client";

import Link from "next/link";
import Image from "next/image";

interface ProductCardProps {
  slug: string;
  name: string;
  category?: string;
  primaryUrl?: string;
  basePrice: number;
  lowestMoq?: number;
}

export default function ProductCard({
  slug,
  name,
  primaryUrl,
  basePrice,
}: ProductCardProps) {
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
            R {basePrice.toFixed(2)}
          </p>
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#C4A882", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            ADD TO CART →
          </span>
        </div>
      </div>
    </Link>
  );
}
