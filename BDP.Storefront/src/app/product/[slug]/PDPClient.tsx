"use client";
import { useState, useMemo } from "react";
import Image from "next/image";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { addToCart } from "@/lib/api";
import QuantityInput from "@/app/components/QuantityInput";

function formatZAR(n: number) {
  return `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

interface Tier { id: number; quantity: number; salePriceZAR: number; costPerUnitZAR?: number }
interface Variant {
  id: number;
  // Legacy
  size?: string | null;
  bottleColour?: string | null;
  lidColour?: string | null;
  texture?: string | null;
  sku?: string | null;
  // Catalogue
  skuId?: string | null;
  specificationSize?: string | null;
  colorVariantName?: string | null;
  baseBodyColor?: string | null;
  baseBodyFinish?: string | null;
  lidCapColor?: string | null;
  lidCapFinish?: string | null;
  lidCapMaterial?: string | null;
  closureType?: string | null;
  bodyMaterial?: string | null;
  accessoriesIncluded?: string | null;
  unitPriceCNY?: number;
  moq: number;
  pricingTiers: Tier[];
}
interface CustomisationOption {
  type: string;
  pricePerUnitZAR: number;
  minimumQuantity: number;
}
interface ProductImage { url: string; altText: string; isPrimary: boolean }

interface Product {
  id: number; slug: string; name: string; category: string;
  description?: string; usageSuitability?: string;
  weightKg: number; lengthCm: number; widthCm: number; heightCm: number;
  images: ProductImage[];
  variants: Variant[];
  customisationOptions: CustomisationOption[];
}

// Helper: is this a catalogue-based product (has skuId / specificationSize)?
function isCatalogueBased(variants: Variant[]): boolean {
  return variants.some((v) => v.skuId || v.specificationSize);
}

// Derive display size from variant
function variantSize(v: Variant): string {
  return v.specificationSize ?? v.size ?? "";
}

// Derive display body label from variant
function variantBodyLabel(v: Variant): string {
  if (v.baseBodyColor && v.baseBodyFinish) return `${v.baseBodyColor} ${v.baseBodyFinish}`;
  if (v.baseBodyColor) return v.baseBodyColor;
  return v.bottleColour ?? "";
}

// Derive display lid label from variant
function variantLidLabel(v: Variant): string {
  if (v.lidCapColor && v.lidCapMaterial) return `${v.lidCapColor} ${v.lidCapMaterial}`;
  if (v.lidCapColor) return v.lidCapColor;
  return v.lidColour ?? "";
}

// ── Catalogue-based multi-step selector ─────────────────────────────────────

function CatalogueVariantSelector({
  variants,
  selectedId,
  onSelect,
}: {
  variants: Variant[];
  selectedId: number;
  onSelect: (v: Variant) => void;
}) {
  const selected = variants.find((v) => v.id === selectedId) ?? variants[0];

  const sizes = useMemo(() => unique(variants.map(variantSize).filter(Boolean)), [variants]);

  const activeSize = variantSize(selected);

  const variantsForSize = useMemo(
    () => (activeSize ? variants.filter((v) => variantSize(v) === activeSize) : variants),
    [variants, activeSize]
  );

  const bodyOptions = useMemo(
    () => unique(variantsForSize.map(variantBodyLabel).filter(Boolean)),
    [variantsForSize]
  );

  const activeBody = variantBodyLabel(selected);

  const variantsForBody = useMemo(
    () => variantsForSize.filter((v) => variantBodyLabel(v) === activeBody),
    [variantsForSize, activeBody]
  );

  const lidOptions = useMemo(
    () => unique(variantsForBody.map(variantLidLabel).filter(Boolean)),
    [variantsForBody]
  );

  const activeLid = variantLidLabel(selected);

  function pickSize(size: string) {
    const candidate =
      variants.find(
        (v) => variantSize(v) === size && variantBodyLabel(v) === activeBody && variantLidLabel(v) === activeLid
      ) ??
      variants.find((v) => variantSize(v) === size && variantBodyLabel(v) === activeBody) ??
      variants.find((v) => variantSize(v) === size);
    if (candidate) onSelect(candidate);
  }

  function pickBody(body: string) {
    const candidate =
      variantsForSize.find(
        (v) => variantBodyLabel(v) === body && variantLidLabel(v) === activeLid
      ) ?? variantsForSize.find((v) => variantBodyLabel(v) === body);
    if (candidate) onSelect(candidate);
  }

  function pickLid(lid: string) {
    const candidate = variantsForBody.find((v) => variantLidLabel(v) === lid);
    if (candidate) onSelect(candidate);
  }

  const pill = (active: boolean) =>
    `px-3 py-1.5 text-sm border transition-colors cursor-pointer ${
      active ? "border-ink bg-ink text-cream" : "border-sand text-ink hover:border-ink"
    }`;

  return (
    <div className="space-y-4">
      {sizes.length > 1 && (
        <div>
          <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "#4A4540" }}>Size</p>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => pickSize(s)}
                className={pill(activeSize === s)}
                style={{ borderRadius: "2px" }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {bodyOptions.length > 1 && (
        <div>
          <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "#4A4540" }}>Body Colour &amp; Finish</p>
          <div className="flex flex-wrap gap-2">
            {bodyOptions.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => pickBody(b)}
                className={pill(activeBody === b)}
                style={{ borderRadius: "2px" }}
              >
                {b}
              </button>
            ))}
          </div>
        </div>
      )}

      {lidOptions.length > 1 && (
        <div>
          <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "#4A4540" }}>Lid</p>
          <div className="flex flex-wrap gap-2">
            {lidOptions.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => pickLid(l)}
                className={pill(activeLid === l)}
                style={{ borderRadius: "2px" }}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      )}

      {selected && (
        <p className="text-xs font-mono" style={{ color: "#C9B8A8" }}>
          SKU: {selected.skuId ?? selected.sku ?? "—"}
        </p>
      )}
    </div>
  );
}

// ── Legacy variant selector (existing behaviour) ─────────────────────────────

function LegacyVariantSelector({
  variants,
  selectedId,
  onSelect,
}: {
  variants: Variant[];
  selectedId: number;
  onSelect: (v: Variant) => void;
}) {
  const selected = variants.find((v) => v.id === selectedId) ?? variants[0];

  const sizes = unique(variants.map((v) => v.size ?? "").filter(Boolean));
  const colours = unique(variants.map((v) => v.bottleColour ?? "").filter(Boolean));
  const textures = unique(variants.map((v) => v.texture ?? "").filter(Boolean));

  function pickVariant(overrides: Partial<{ size: string; bottleColour: string; texture: string }>) {
    const candidate = variants.find(
      (v) =>
        v.size === (overrides.size ?? selected.size) &&
        v.bottleColour === (overrides.bottleColour ?? selected.bottleColour) &&
        v.texture === (overrides.texture ?? selected.texture)
    );
    if (candidate) onSelect(candidate);
  }

  const pill = (active: boolean) =>
    `px-3 py-1.5 text-sm border transition-colors cursor-pointer ${
      active ? "border-ink bg-ink text-cream" : "border-sand text-ink hover:border-ink"
    }`;

  return (
    <div className="space-y-4">
      {sizes.length > 1 && (
        <div>
          <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "#4A4540" }}>Size</p>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => (
              <button key={s} type="button" onClick={() => pickVariant({ size: s })}
                className={pill(selected.size === s)} style={{ borderRadius: "2px" }}>{s}</button>
            ))}
          </div>
        </div>
      )}
      {colours.length > 1 && (
        <div>
          <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "#4A4540" }}>Colour</p>
          <div className="flex flex-wrap gap-2">
            {colours.map((c) => (
              <button key={c} type="button" onClick={() => pickVariant({ bottleColour: c })}
                className={pill(selected.bottleColour === c)} style={{ borderRadius: "2px" }}>{c}</button>
            ))}
          </div>
        </div>
      )}
      {textures.length > 1 && (
        <div>
          <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "#4A4540" }}>Finish</p>
          <div className="flex flex-wrap gap-2">
            {textures.map((t) => (
              <button key={t} type="button" onClick={() => pickVariant({ texture: t })}
                className={pill(selected.texture === t)} style={{ borderRadius: "2px" }}>{t}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main PDP component ───────────────────────────────────────────────────────

const MIN_QTY = 10;

export default function PDPClient({ product }: { product: Product }) {
  const [selectedVariant, setSelectedVariant] = useState<Variant>(product.variants[0] ?? ({} as Variant));
  const [quantity, setQuantity] = useState(Math.max(selectedVariant.moq || MIN_QTY, MIN_QTY));
  const [selectedImage, setSelectedImage] = useState(0);

  // Customisation toggles
  const [silkScreen, setSilkScreen] = useState(false);
  const [hotStamping, setHotStamping] = useState(false);
  const [colourChange, setColourChange] = useState(false);

  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [moqError, setMoqError] = useState("");

  const { setCart, getSessionToken } = useCartStore();
  const { jwt } = useAuthStore();

  const tiers = selectedVariant.pricingTiers ?? [];
  const moq = Math.max(selectedVariant.moq || MIN_QTY, MIN_QTY);

  // Determine unit price from pricing tiers
  const activeTier = [...tiers].reverse().find((t) => quantity >= t.quantity) ?? tiers[0];
  const unitPrice = activeTier
    ? (activeTier.costPerUnitZAR ?? activeTier.salePriceZAR / activeTier.quantity)
    : 0;

  const lineTotal = unitPrice * quantity;

  // Customisation add-ons
  const silkOption = product.customisationOptions.find((co) => co.type === "SilkScreen");
  const hotOption = product.customisationOptions.find((co) => co.type === "HotStamping");
  const colourOption = product.customisationOptions.find((co) => co.type === "ColourChange");

  const silkEnabled = silkOption != null && quantity >= silkOption.minimumQuantity;
  const hotEnabled = hotOption != null && quantity >= hotOption.minimumQuantity;
  const colourEnabled = colourOption != null && quantity >= colourOption.minimumQuantity;

  function customisationCost(option: CustomisationOption | undefined, enabled: boolean): number {
    if (!enabled || !option) return 0;
    return option.pricePerUnitZAR * quantity;
  }

  const silkCost = customisationCost(silkOption, silkScreen && silkEnabled);
  const hotCost = customisationCost(hotOption, hotStamping && hotEnabled);
  const colourCost = customisationCost(colourOption, colourChange && colourEnabled);
  const grandTotal = lineTotal + silkCost + hotCost + colourCost;

  function handleQuantityChange(n: number) {
    setQuantity(n);
    if (n < moq) setMoqError(`Minimum order is ${moq} units`);
    else setMoqError("");
    // Disable toggles when quantity drops below per-option minimums
    if (silkOption && n < silkOption.minimumQuantity) setSilkScreen(false);
    if (hotOption && n < hotOption.minimumQuantity) setHotStamping(false);
    if (colourOption && n < colourOption.minimumQuantity) setColourChange(false);
  }

  function handleVariantSelect(v: Variant) {
    setSelectedVariant(v);
    setQuantity(Math.max(quantity, v.moq || MIN_QTY, MIN_QTY));
  }

  async function handleAddToCart() {
    if (quantity < moq) { setMoqError(`Minimum order is ${moq} units`); return; }
    setAdding(true);
    try {
      const token = getSessionToken();
      // Customisation option linkage is resolved server-side; pass undefined for now
      const customisationId = undefined;
      const result = await addToCart(token, selectedVariant.id, quantity, customisationId, jwt ?? undefined);
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
  const useCatalogueSel = isCatalogueBased(product.variants);

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
                fill className="object-cover" priority
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
                  {img.url && <Image src={img.url} alt={img.altText} fill className="object-cover" />}
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
              {useCatalogueSel ? (
                <CatalogueVariantSelector
                  variants={product.variants}
                  selectedId={selectedVariant.id}
                  onSelect={handleVariantSelect}
                />
              ) : (
                <LegacyVariantSelector
                  variants={product.variants}
                  selectedId={selectedVariant.id}
                  onSelect={handleVariantSelect}
                />
              )}
            </div>
          )}

          {/* Quantity */}
          <div className="mb-4">
            <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "#4A4540" }}>
              Quantity <span style={{ color: "#C9B8A8" }}>(min {moq})</span>
            </p>
            <QuantityInput value={quantity} min={moq} onChange={handleQuantityChange} />
            {moqError && <p className="text-xs mt-1" style={{ color: "#D4A89A" }}>{moqError}</p>}
            <p className="text-xs mt-1" style={{ color: "#C9B8A8" }}>Minimum order: {MIN_QTY} units</p>
          </div>

          {/* Unit price */}
          {unitPrice > 0 && (
            <div className="mb-6 flex items-baseline gap-3">
              <span
                className="text-3xl"
                style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: "#1C1A17" }}
              >
                {formatZAR(unitPrice)}
              </span>
              <span className="text-sm" style={{ color: "#C9B8A8" }}>per unit</span>
            </div>
          )}

          {/* Customisation panel */}
          <div className="mb-6 border" style={{ borderColor: "#C9B8A8", borderRadius: "2px" }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: "#C9B8A8" }}>
              <p className="text-sm font-medium" style={{ color: "#1C1A17" }}>Personalise your order</p>
            </div>
            <div className="px-4 py-4 space-y-3">
              {/* Silk Screen */}
              {silkOption && (
                <CustomisationToggle
                  type="SilkScreen"
                  label="Silk Screen Printing"
                  subLabel={`+${formatZAR(silkOption.pricePerUnitZAR)}/unit`}
                  enabled={silkEnabled}
                  checked={silkScreen}
                  onChange={setSilkScreen}
                  cost={silkEnabled ? silkCost : null}
                  lockedMessage={silkEnabled ? undefined : `Available from ${silkOption.minimumQuantity.toLocaleString()} units`}
                />
              )}
              {/* Hot Stamping */}
              {hotOption && (
                <CustomisationToggle
                  type="HotStamping"
                  label="Hot Stamping"
                  subLabel={`+${formatZAR(hotOption.pricePerUnitZAR)}/unit`}
                  enabled={hotEnabled}
                  checked={hotStamping}
                  onChange={setHotStamping}
                  cost={hotEnabled ? hotCost : null}
                  lockedMessage={hotEnabled ? undefined : `Available from ${hotOption.minimumQuantity.toLocaleString()} units`}
                />
              )}
              {/* Colour Change */}
              {colourOption && (
                <CustomisationToggle
                  type="ColourChange"
                  label="Colour Change"
                  subLabel={`+${formatZAR(colourOption.pricePerUnitZAR)}/unit`}
                  enabled={colourEnabled}
                  checked={colourChange}
                  onChange={setColourChange}
                  cost={colourEnabled ? colourCost : null}
                  lockedMessage={colourEnabled ? undefined : `Available from ${colourOption.minimumQuantity.toLocaleString()} units`}
                />
              )}
            </div>
          </div>

          {/* Price summary */}
          <div className="mb-6 border" style={{ borderColor: "#C9B8A8", borderRadius: "2px" }}>
            <div className="px-4 py-4 space-y-2">
              <div className="flex justify-between text-sm" style={{ color: "#4A4540" }}>
                <span>{quantity} × {formatZAR(unitPrice)}</span>
                <span>{formatZAR(lineTotal)}</span>
              </div>
              {silkScreen && silkCost > 0 && (
                <div className="flex justify-between text-sm" style={{ color: "#4A4540" }}>
                  <span>Silk Screen ({quantity} units)</span>
                  <span>{formatZAR(silkCost)}</span>
                </div>
              )}
              {hotStamping && hotCost > 0 && (
                <div className="flex justify-between text-sm" style={{ color: "#4A4540" }}>
                  <span>Hot Stamping ({quantity} units)</span>
                  <span>{formatZAR(hotCost)}</span>
                </div>
              )}
              {colourChange && colourCost > 0 && (
                <div className="flex justify-between text-sm" style={{ color: "#4A4540" }}>
                  <span>Colour Change ({quantity} units)</span>
                  <span>{formatZAR(colourCost)}</span>
                </div>
              )}
              <div
                className="flex justify-between items-baseline pt-3 border-t"
                style={{ borderColor: "#C9B8A8" }}
              >
                <span className="text-xs uppercase tracking-widest" style={{ color: "#4A4540" }}>Order total</span>
                <span
                  className="text-3xl"
                  style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: "#1C1A17" }}
                >
                  {formatZAR(grandTotal)}
                </span>
              </div>
            </div>
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
              {selectedVariant.bodyMaterial && (
                <div className="flex gap-4"><dt className="w-24 shrink-0">Material</dt><dd>{selectedVariant.bodyMaterial}</dd></div>
              )}
              {selectedVariant.closureType && (
                <div className="flex gap-4"><dt className="w-24 shrink-0">Closure</dt><dd>{selectedVariant.closureType}</dd></div>
              )}
              {selectedVariant.accessoriesIncluded && (
                <div className="flex gap-4"><dt className="w-24 shrink-0">Includes</dt><dd>{selectedVariant.accessoriesIncluded}</dd></div>
              )}
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

// ── Customisation toggle row ─────────────────────────────────────────────────

// Plain-English descriptions shown under each customisation toggle
const CUSTOMISATION_DESCRIPTIONS: Record<string, string> = {
  ColourChange:
    "We tint the bottle, lid, or both to your chosen colour — great for matching your brand palette.",
  SilkScreen:
    "Your logo or design is printed directly onto the bottle in ink. Flat, clean finish — best for bold logos and solid shapes.",
  HotStamping:
    "Your logo is pressed onto the bottle using metallic foil. Creates a shiny, premium look — available in gold, silver, or rose gold.",
};

function CustomisationToggle({
  type,
  label,
  subLabel,
  enabled,
  checked,
  onChange,
  cost,
  lockedMessage,
}: {
  type: string;
  label: string;
  subLabel?: string;
  enabled: boolean;
  checked: boolean;
  onChange: (v: boolean) => void;
  cost: number | null;
  lockedMessage?: string;
}) {
  const description = CUSTOMISATION_DESCRIPTIONS[type];

  return (
    <div className={`${enabled ? "" : "opacity-50"}`}>
      <label className={`flex items-start justify-between gap-3 ${enabled ? "cursor-pointer" : "cursor-not-allowed"}`}>
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={checked}
            disabled={!enabled}
            onChange={(e) => onChange(e.target.checked)}
            className="w-4 h-4 mt-0.5 accent-ink shrink-0"
          />
          <div>
            <span className="text-sm font-medium" style={{ color: "#1C1A17" }}>
              {label}
              {subLabel && <span className="text-xs font-normal ml-1.5" style={{ color: "#C9B8A8" }}>{subLabel}</span>}
            </span>
            {description && (
              <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "#4A4540" }}>{description}</p>
            )}
            {!enabled && lockedMessage && (
              <p className="text-xs mt-0.5" style={{ color: "#D4A89A" }}>{lockedMessage}</p>
            )}
          </div>
        </div>
        {cost != null && cost > 0 && (
          <span className="text-sm shrink-0" style={{ color: "#4A4540" }}>{formatZAR(cost)}</span>
        )}
      </label>
    </div>
  );
}
