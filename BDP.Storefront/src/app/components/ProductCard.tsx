import Link from "next/link";
import Image from "next/image";
import Price from "./Price";

interface ProductCardProps {
  slug: string;
  name: string;
  category: string;
  primaryUrl?: string;
  basePrice: number;
  lowestMoq: number;
}

export default function ProductCard({ slug, name, category, primaryUrl, basePrice, lowestMoq }: ProductCardProps) {
  return (
    <Link href={`/product/${slug}`} className="group block">
      <div
        className="overflow-hidden mb-3 aspect-square relative"
        style={{ backgroundColor: "#EDE4D8", borderRadius: "2px" }}
      >
        {primaryUrl ? (
          <Image
            src={primaryUrl}
            alt={name}
            fill
            className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-xs" style={{ color: "#C9B8A8" }}>no image</span>
          </div>
        )}
      </div>
      <div
        className="px-0.5 py-1 group-hover:bg-cream-dark transition-colors rounded-sm"
        style={{ borderRadius: "2px" }}
      >
        <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#4A4540" }}>
          {category}
        </p>
        <h3
          className="text-lg leading-tight mb-1"
          style={{ fontFamily: "var(--font-display)", color: "#1C1A17" }}
        >
          {name}
        </h3>
        <p className="text-sm" style={{ color: "#4A4540" }}>
          from <Price zarAmount={basePrice} />/unit
        </p>
        {lowestMoq > 0 && (
          <p className="text-xs mt-0.5" style={{ color: "#C9B8A8" }}>
            from {lowestMoq} bottles
          </p>
        )}
        <p className="text-xs mt-1 opacity-60" style={{ color: "#1C1A17" }}>
          Shop →
        </p>
      </div>
    </Link>
  );
}
