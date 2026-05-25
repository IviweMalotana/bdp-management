"use client";
import { useState } from "react";
import Image from "next/image";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { addToCart } from "@/lib/api";
import VariantSelector from "@/app/components/VariantSelector";
import QuantityInput from "@/app/components/QuantityInput";
import PricingTierTable from "@/app/components/PricingTierTable";

function formatZAR(n: number) {
  return `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface Tier { id: number; quantity: number; salePriceZAR: number }
interface Variant {
  id: number; size: string; bottleColour: string; lidColour: string;
  texture: string; sku: string; moq: number; pricingTiers: Tier[];
}
interface CustomisationOption { id: number; type: string; minimumQuantity: number; pricingTiers: Tier[] }
interface ProductImage { url: string; altText: string; isPrimary: boolean }

interface Product {
  id: number; slug: string; name: string; category: string;
  description?: string; usageSuitability?: string;
  weightKg: number; lengthCm: number; widthCm: number; heightCm: number;
  images: ProductImage[];
  variants: Variant[];
  customisationOptions: CustomisationOption[];
}

export default function PDPClient({ product }: { product: Product }) {
  const [selectedVariant, setSelectedVariant] = useState<Variant>(product.variants[0] ?? {} as Variant);
  const [quantity, setQuantity] = useState(selectedVariant.moq || 1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [customisationOpen, setCustomisationOpen] = useState(false);
  const [selectedCustomisation, setSelectedCustomisation] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [moqError, setMoqError] = useState("");

  const { setCart, getSessionToken } = useCartStore();
  const { jwt } = useAuthStore();

  const tiers = selectedVariant.pricingTiers ?? [];
  const moq = selectedVariant.moq || 1;

  const activeTier = [...tiers].reverse().find((t) => quantity >= t.quantity) ?? tiers[0];
  const unitPrice = activeTier?.salePriceZAR ?? 0;
  const lineTotal = unitPrice * quantity;

  function handleQuantityChange(n: number) {
    setQuantity(n);
    if (n < moq) setMoqError(`Minimum order is ${moq} units`);
    else setMoqError("");
  }

  function handleVariantSelect(v: Variant) {
    setSelectedVariant(v);
    setQuantity(Math.max(quantity, v.moq || 1));
  }

  async function handleAddToCart() {
    if (quantity < moq) { setMoqError(`Minimum order is ${moq} units`); return; }
    setAdding(true);
    try {
      const token = getSessionToken();
      const result = await addToCart(token, selectedVariant.id, quantity, selectedCustomisation ?? undefined, jwt ?? undefined);
      setCart(result as Parameters<typeof setCart>[0]);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch {
      alert("Failed to add to cart. Please try again.");
    } finally {
      setAdding(false);
    }
  }

  const images = product.images.length > 0 ? product.images : [{ url: "", altText: product.name, isPrimary: true }];

  return (
    <div className="max-w-7xl mx-auto px-4 py-16">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Image gallery */}
        <div>
          <div
            className="relative aspect-square mb-4 overflow-hidden"
            style={{ backgroundColor: "#EDE4D8", borderRadius: "2px" }}
          >
            {images[selectedImage]?.url ? (
              <Image
                src={images[selectedImage].url}
                alt={images[selectedImage].altText || product.name}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-sm" style={{ color: "#C9B8A8" }}>no image</span>
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className="relative shrink-0 w-16 h-16 overflow-hidden border-2"
                  style={{
                    borderColor: selectedImage === i ? "#1C1A17" : "#C9B8A8",
                    borderRadius: "2px",
                    backgroundColor: "#EDE4D8",
                  }}
                >
                  {img.url && (
                    <Image src={img.url} alt={img.altText} fill className="object-cover" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "#C9B8A8" }}>
            {product.category}
          </p>
          <h1
            className="text-4xl md:text-5xl leading-tight mb-4"
            style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: "#1C1A17" }}
          >
            {product.name}
          </h1>
          {product.description && (
            <p className="text-sm mb-6" style={{ color: "#4A4540", lineHeight: 1.8 }}>
              {product.description}
            </p>
          )}

          {/* Variant selector */}
          {product.variants.length > 1 && (
            <div className="mb-6">
              <VariantSelector
                variants={product.variants}
                selectedId={selectedVariant.id}
                onSelect={handleVariantSelect}
              />
            </div>
          )}

          {/* Quantity */}
          <div className="mb-4">
            <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "#4A4540" }}>
              Quantity <span style={{ color: "#C9B8A8" }}>(min {moq})</span>
            </p>
            <QuantityInput value={quantity} min={moq} onChange={handleQuantityChange} />
            {moqError && <p className="text-xs mt-1" style={{ color: "#D4A89A" }}>{moqError}</p>}
          </div>

          {/* Pricing tier table */}
          {tiers.length > 0 && (
            <div className="mb-6">
              <PricingTierTable tiers={tiers} currentQuantity={quantity} />
            </div>
          )}

          {/* Customisation */}
          {product.customisationOptions.length > 0 && (
            <div className="mb-6 border" style={{ borderColor: "#C9B8A8", borderRadius: "2px" }}>
              <button
                type="button"
                onClick={() => setCustomisationOpen(!customisationOpen)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium"
                style={{ color: "#1C1A17" }}
              >
                Add your logo?
                <span>{customisationOpen ? "−" : "+"}</span>
              </button>
              {customisationOpen && (
                <div className="px-4 pb-4 border-t" style={{ borderColor: "#C9B8A8" }}>
                  {quantity < 100 && (
                    <p className="text-xs mt-3 mb-3" style={{ color: "#D4A89A" }}>
                      Customisation requires a minimum of 100 units.
                    </p>
                  )}
                  <div className="space-y-2 mt-3">
                    <button
                      onClick={() => setSelectedCustomisation(null)}
                      className="block text-sm w-full text-left py-1 hover:opacity-70"
                      style={{ color: selectedCustomisation === null ? "#1C1A17" : "#4A4540", fontWeight: selectedCustomisation === null ? 500 : 400 }}
                    >
                      No customisation
                    </button>
                    {product.customisationOptions.map((co) => (
                      <button
                        key={co.id}
                        onClick={() => setSelectedCustomisation(co.id)}
                        className="block text-sm w-full text-left py-1 hover:opacity-70"
                        style={{ color: selectedCustomisation === co.id ? "#1C1A17" : "#4A4540", fontWeight: selectedCustomisation === co.id ? 500 : 400 }}
                      >
                        {co.type} (min {co.minimumQuantity} units)
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Total */}
          <div className="mb-6">
            <p className="text-3xl font-light" style={{ fontFamily: "var(--font-display)", color: "#1C1A17" }}>
              {formatZAR(lineTotal)} total
            </p>
            <p className="text-sm" style={{ color: "#4A4540" }}>
              {formatZAR(unitPrice)} per unit
            </p>
          </div>

          {/* Add to cart */}
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={adding || quantity < moq}
            className="w-full py-4 text-sm font-medium tracking-wide transition-opacity disabled:opacity-50"
            style={{ backgroundColor: "#1C1A17", color: "#F5EFE6", borderRadius: "2px" }}
          >
            {added ? "Added to cart ✓" : adding ? "Adding…" : "Add to Cart"}
          </button>

          <p className="text-xs mt-3 text-center" style={{ color: "#C9B8A8" }}>
            Ships from China. Estimated 4–6 weeks.
          </p>

          {/* Specs accordion */}
          <details className="mt-6 border-t" style={{ borderColor: "#C9B8A8" }}>
            <summary className="py-3 text-xs uppercase tracking-widest cursor-pointer hover:opacity-70" style={{ color: "#4A4540" }}>
              Technical specifications
            </summary>
            <dl className="py-3 space-y-2 text-sm" style={{ color: "#4A4540" }}>
              <div className="flex gap-4"><dt className="w-24 shrink-0">Weight</dt><dd>{product.weightKg} kg</dd></div>
              <div className="flex gap-4"><dt className="w-24 shrink-0">Dimensions</dt><dd>{product.lengthCm} × {product.widthCm} × {product.heightCm} cm</dd></div>
              {product.usageSuitability && (
                <div className="flex gap-4"><dt className="w-24 shrink-0">Suitable for</dt><dd>{product.usageSuitability}</dd></div>
              )}
            </dl>
          </details>
        </div>
      </div>
    </div>
  );
}
