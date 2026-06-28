"use client";
import { useState, useMemo } from "react";
import Image from "next/image";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { useCurrencyStore } from "@/store/currencyStore";
import { addToCart } from "@/lib/api";
import QuantityInput from "@/app/components/QuantityInput";
import { convertFromZAR, formatCurrency } from "@/lib/currency";

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
  id?: number;
  type: string;
  pricePerUnitZAR: number;   // sale price at MOQ anchor (used as flat price for ColourChange)
  costPerUnitZAR: number;    // your cost — used to compute interpolated sale price for SS/HT
  minimumQuantity: number;
}

// Markup anchors — must match PricingService.MarkupAnchors on the server
const MARKUP_ANCHORS = [
  { qty: 10,    markup: 50 },
  { qty: 50,    markup: 40 },
  { qty: 100,   markup: 35 },
  { qty: 250,   markup: 30 },
  { qty: 500,   markup: 28 },
  { qty: 1000,  markup: 25 },
  { qty: 2500,  markup: 22 },
  { qty: 5000,  markup: 20 },
  { qty: 10000, markup: 15 },
];

function interpolateMarkup(qty: number): number {
  if (qty <= MARKUP_ANCHORS[0].qty) return MARKUP_ANCHORS[0].markup;
  if (qty >= MARKUP_ANCHORS[MARKUP_ANCHORS.length - 1].qty) return MARKUP_ANCHORS[MARKUP_ANCHORS.length - 1].markup;
  for (let i = 0; i < MARKUP_ANCHORS.length - 1; i++) {
    const a = MARKUP_ANCHORS[i], b = MARKUP_ANCHORS[i + 1];
    if (qty >= a.qty && qty <= b.qty) {
      const t = (qty - a.qty) / (b.qty - a.qty);
      return a.markup + (b.markup - a.markup) * t;
    }
  }
  return MARKUP_ANCHORS[MARKUP_ANCHORS.length - 1].markup;
}

// Interpolate sale price per unit between the two surrounding tier anchors
function interpolateTierPrice(tiers: Tier[], qty: number): number {
  if (tiers.length === 0) return 0;
  const sorted = [...tiers].sort((a, b) => a.quantity - b.quantity);
  const perUnit = (t: Tier) => t.salePriceZAR / t.quantity;
  if (qty <= sorted[0].quantity) return perUnit(sorted[0]);
  if (qty >= sorted[sorted.length - 1].quantity) return perUnit(sorted[sorted.length - 1]);
  for (let i = 0; i < sorted.length - 1; i++) {
    const lo = sorted[i], hi = sorted[i + 1];
    if (qty >= lo.quantity && qty <= hi.quantity) {
      const t = (qty - lo.quantity) / (hi.quantity - lo.quantity);
      return perUnit(lo) + (perUnit(hi) - perUnit(lo)) * t;
    }
  }
  return perUnit(sorted[sorted.length - 1]);
}

// Compute interpolated sale price for a customisation option at a given quantity
function interpolateCustomisationPrice(option: CustomisationOption, qty: number): number {
  if (option.type === "ColourChange") return option.pricePerUnitZAR; // flat R3
  const markup = interpolateMarkup(qty) / 100;
  return option.costPerUnitZAR * (1 + markup);
}
interface ProductImage { url: string; altText: string; isPrimary: boolean }

interface Product {
  id: number; slug: string; name: string; category: string; productType?: string;
  description?: string; usageSuitability?: string;
  lengthCm: number; widthCm: number; heightCm: number;
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

  const selectedCurrency = useCurrencyStore((s) => s.selected);
  const curr = selectedCurrency ?? { code: "ZAR", symbol: "R", rateFromZAR: 1 };

  function formatPrice(zar: number) {
    return formatCurrency(convertFromZAR(zar, curr.rateFromZAR), curr.symbol, curr.code);
  }

  // Customisation toggles — silk screen and hot stamping are mutually exclusive
  const [printMethod, setPrintMethod] = useState<"SilkScreen" | "HotStamping" | null>(null);
  const [colourChange, setColourChange] = useState(false);
  const silkScreen = printMethod === "SilkScreen";
  const hotStamping = printMethod === "HotStamping";

  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [moqError, setMoqError] = useState("");

  const { setCart, getSessionToken, openDrawer } = useCartStore();
  const { jwt } = useAuthStore();

  const tiers = selectedVariant.pricingTiers ?? [];
  const moq = Math.max(selectedVariant.moq || MIN_QTY, MIN_QTY);
  const maxTierQty = tiers.reduce((m, t) => Math.max(m, t.quantity), 0);
  const sliderMax = Math.max(maxTierQty, moq * 50);

  // Sliding-scale unit price interpolated between surrounding anchor tiers
  const unitPrice = interpolateTierPrice(tiers, quantity);
  const lineTotal = unitPrice * quantity;

  // Customisation add-ons
  const silkOption = product.customisationOptions.find((co) => co.type === "SilkScreen");
  const hotOption = product.customisationOptions.find((co) => co.type === "HotStamping");
  const colourOption = product.customisationOptions.find((co) => co.type === "ColourChange");

  const silkEnabled = silkOption != null && quantity >= silkOption.minimumQuantity;
  const hotEnabled = hotOption != null && quantity >= hotOption.minimumQuantity;
  const colourEnabled = colourOption != null && quantity >= colourOption.minimumQuantity;

  // Interpolated customisation price per unit at current quantity
  const silkUnitPrice = silkOption ? interpolateCustomisationPrice(silkOption, quantity) : 0;
  const hotUnitPrice = hotOption ? interpolateCustomisationPrice(hotOption, quantity) : 0;
  const colourUnitPrice = colourOption ? interpolateCustomisationPrice(colourOption, quantity) : 0;

  const silkCost = silkScreen && silkEnabled ? silkUnitPrice * quantity : 0;
  const hotCost = hotStamping && hotEnabled ? hotUnitPrice * quantity : 0;
  const colourCost = colourChange && colourEnabled ? colourUnitPrice * quantity : 0;
  const grandTotal = lineTotal + silkCost + hotCost + colourCost;

  function handleQuantityChange(n: number) {
    setQuantity(n);
    if (n < moq) setMoqError(`Minimum order is ${moq} units`);
    else setMoqError("");
    // Reset toggles when quantity drops below per-option minimums
    if ((silkOption && n < silkOption.minimumQuantity) || (hotOption && n < hotOption.minimumQuantity))
      setPrintMethod(null);
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
      // A line can carry one printing method (silk OR hot) AND a colour change.
      // Collect every selected, enabled customisation option id.
      const printOption = silkScreen && silkEnabled ? silkOption
        : hotStamping && hotEnabled ? hotOption
        : null;
      const customisationIds: number[] = [];
      if (printOption?.id != null) customisationIds.push(printOption.id);
      if (colourChange && colourEnabled && colourOption?.id != null) customisationIds.push(colourOption.id);
      const result = await addToCart(token, selectedVariant.id, quantity, customisationIds, jwt ?? undefined);
      setCart(result as Parameters<typeof setCart>[0]);
      setAdded(true);
      openDrawer();
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
    <div className="max-w-7xl mx-auto px-4 py-10 md:py-16 pb-28 md:pb-16">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
        {/* Image gallery */}
        <div>
          <div
            className="relative aspect-square mb-4 overflow-hidden"
            style={{ backgroundColor: "#E8DDD0", borderRadius: "2px" }}
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
                    backgroundColor: "#E8DDD0",
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
          <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#C9B8A8" }}>
            {product.category}
          </p>
          <h1
            className="text-4xl md:text-5xl leading-tight mb-2"
            style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: "#1C1A17" }}
          >
            {product.name}
          </h1>
          {product.productType && product.productType !== product.category && (
            <p className="text-sm mb-4" style={{ color: "#4A4540" }}>{product.productType}</p>
          )}
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
            <div className="w-full sm:inline-block">
              <QuantityInput value={quantity} min={moq} onChange={handleQuantityChange} />
            </div>
            {moqError && <p className="text-xs mt-1" style={{ color: "#D4A89A" }}>{moqError}</p>}

            {/* Quantity slider — drag to see the unit price drop in real time */}
            {sliderMax > moq && (
              <div className="mt-4">
                <input
                  type="range"
                  min={moq}
                  max={sliderMax}
                  step={moq}
                  value={Math.min(quantity, sliderMax)}
                  onChange={(e) => handleQuantityChange(parseInt(e.target.value, 10))}
                  className="w-full"
                  style={{ accentColor: "#C4A882" }}
                  aria-label="Quantity slider"
                />
                <div className="flex justify-between text-[11px] mt-1" style={{ color: "#C9B8A8" }}>
                  <span>{moq}</span>
                  <span>{sliderMax.toLocaleString()}</span>
                </div>
              </div>
            )}

            {/* Tier breakpoints — shows the volume discount */}
            {tiers.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {[...tiers].sort((a, b) => a.quantity - b.quantity).map((t) => {
                  const active = quantity >= t.quantity;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleQuantityChange(Math.max(t.quantity, moq))}
                      className="px-3 py-1.5 text-left border transition-colors"
                      style={{
                        borderColor: active ? "#1C1A17" : "#C9B8A8",
                        backgroundColor: active ? "#E8DDD0" : "transparent",
                        borderRadius: "2px",
                      }}
                    >
                      <span className="block text-xs font-medium" style={{ color: "#1C1A17" }}>
                        {t.quantity.toLocaleString()}+
                      </span>
                      <span className="block text-[11px]" style={{ color: "#4A4540" }}>
                        {formatPrice(t.salePriceZAR / t.quantity)}/unit
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Unit price */}
          {unitPrice > 0 && (
            <div className="mb-6 flex items-baseline gap-3">
              <span
                className="text-3xl"
                style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: "#1C1A17" }}
              >
                {formatPrice(unitPrice)}
              </span>
              <span className="text-sm" style={{ color: "#C9B8A8" }}>per unit</span>
            </div>
          )}

          {/* Customisation panel */}
          <div className="mb-6 border" style={{ borderColor: "#C9B8A8", borderRadius: "2px" }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: "#C9B8A8" }}>
              <p className="text-sm font-medium" style={{ color: "#1C1A17" }}>Personalise your order</p>
            </div>
            <div className="px-4 py-4 space-y-4">
              {/* Printing method — silk screen OR hot stamping, mutually exclusive */}
              {(silkOption || hotOption) && (
                <div>
                  <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "#4A4540" }}>
                    Printing method <span style={{ color: "#C9B8A8" }}>(choose one)</span>
                  </p>
                  <div className="space-y-3">
                    {silkOption && (
                      <CustomisationToggle
                        type="SilkScreen"
                        inputType="checkbox"
                        label="Silk Screen Printing"
                        subLabel={`+${formatPrice(silkUnitPrice)}/unit`}
                        processingNote="+7 days production"
                        enabled={silkEnabled}
                        checked={silkScreen}
                        onChange={(v) => setPrintMethod(v ? "SilkScreen" : null)}
                        cost={silkEnabled && silkScreen ? silkCost : null}
                        formatAmount={formatPrice}
                        lockedMessage={silkEnabled ? undefined : `Available from ${silkOption.minimumQuantity.toLocaleString()} units`}
                      />
                    )}
                    {hotOption && (
                      <CustomisationToggle
                        type="HotStamping"
                        inputType="checkbox"
                        label="Hot Stamping"
                        subLabel={`+${formatPrice(hotUnitPrice)}/unit`}
                        processingNote="+7 days production"
                        enabled={hotEnabled}
                        checked={hotStamping}
                        onChange={(v) => setPrintMethod(v ? "HotStamping" : null)}
                        cost={hotEnabled && hotStamping ? hotCost : null}
                        formatAmount={formatPrice}
                        lockedMessage={hotEnabled ? undefined : `Available from ${hotOption.minimumQuantity.toLocaleString()} units`}
                      />
                    )}
                  </div>
                </div>
              )}
              {/* Colour Change — independent checkbox */}
              {colourOption && (
                <div>
                  <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "#4A4540" }}>Colour</p>
                  <CustomisationToggle
                    type="ColourChange"
                    inputType="checkbox"
                    label="Colour Change"
                    subLabel={`+${formatPrice(colourUnitPrice)}/unit`}
                    processingNote="+2 days production"
                    enabled={colourEnabled}
                    checked={colourChange}
                    onChange={setColourChange}
                    cost={colourEnabled ? colourCost : null}
                    formatAmount={formatPrice}
                    lockedMessage={colourEnabled ? undefined : `Available from ${colourOption.minimumQuantity.toLocaleString()} units`}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Price summary */}
          <div className="mb-6 border" style={{ borderColor: "#C9B8A8", borderRadius: "2px" }}>
            <div className="px-4 py-4 space-y-2">
              <div className="flex justify-between text-sm" style={{ color: "#4A4540" }}>
                <span>{quantity} × {formatPrice(unitPrice)}</span>
                <span>{formatPrice(lineTotal)}</span>
              </div>
              {silkScreen && silkCost > 0 && (
                <div className="flex justify-between text-sm" style={{ color: "#4A4540" }}>
                  <span>Silk Screen ({quantity} units)</span>
                  <span>{formatPrice(silkCost)}</span>
                </div>
              )}
              {hotStamping && hotCost > 0 && (
                <div className="flex justify-between text-sm" style={{ color: "#4A4540" }}>
                  <span>Hot Stamping ({quantity} units)</span>
                  <span>{formatPrice(hotCost)}</span>
                </div>
              )}
              {colourChange && colourCost > 0 && (
                <div className="flex justify-between text-sm" style={{ color: "#4A4540" }}>
                  <span>Colour Change ({quantity} units)</span>
                  <span>{formatPrice(colourCost)}</span>
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
                  {formatPrice(grandTotal)}
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
            style={{ backgroundColor: "#1C1A17", color: "#FAF8F5", borderRadius: "2px" }}
          >
            {added ? "Added to cart ✓" : adding ? "Adding…" : "Add to Cart"}
          </button>
          {/* Specs accordion */}
          {(product.lengthCm > 0 || selectedVariant.bodyMaterial || selectedVariant.closureType || selectedVariant.accessoriesIncluded) && (
            <details className="mt-6 border-t" style={{ borderColor: "#C9B8A8" }}>
              <summary className="py-3 text-xs uppercase tracking-widest cursor-pointer hover:opacity-70" style={{ color: "#4A4540" }}>
                Technical specifications
              </summary>
              <dl className="py-3 space-y-2 text-sm" style={{ color: "#4A4540" }}>
                {product.lengthCm > 0 && (
                  <div className="flex gap-4"><dt className="w-24 shrink-0">Dimensions</dt><dd>{product.lengthCm} × {product.widthCm} × {product.heightCm} cm</dd></div>
                )}
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
          )}
        </div>
      </div>

      {/* Sticky mobile add-to-cart bar */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center gap-3 px-4 py-3 border-t"
        style={{ backgroundColor: "#FAF8F5", borderColor: "#C9B8A8" }}
      >
        <div className="flex flex-col shrink-0">
          <span className="text-[11px]" style={{ color: "#9E8F83" }}>
            {formatPrice(unitPrice)}/unit
          </span>
          <span className="text-sm font-medium" style={{ color: "#1C1A17" }}>
            {formatPrice(grandTotal)}
          </span>
        </div>
        <div className="flex items-center border shrink-0" style={{ borderColor: "#C9B8A8", borderRadius: "2px" }}>
          <button
            type="button"
            onClick={() => handleQuantityChange(Math.max(moq, quantity - moq))}
            className="w-8 h-9 flex items-center justify-center text-base"
            style={{ color: "#1C1A17" }}
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="w-10 text-center text-sm" style={{ color: "#1C1A17" }}>{quantity}</span>
          <button
            type="button"
            onClick={() => handleQuantityChange(quantity + moq)}
            className="w-8 h-9 flex items-center justify-center text-base"
            style={{ color: "#1C1A17" }}
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={adding || quantity < moq}
          className="flex-1 py-3 text-sm font-medium transition-opacity disabled:opacity-50"
          style={{ backgroundColor: "#1C1A17", color: "#FAF8F5", borderRadius: "2px" }}
        >
          {added ? "Added ✓" : adding ? "Adding…" : "Add"}
        </button>
      </div>
    </div>
  );
}

// ── Customisation toggle row ─────────────────────────────────────────────────

// Plain-English descriptions shown under each customisation toggle
const CUSTOMISATION_DESCRIPTIONS: Record<string, string> = {
  ColourChange:
    "We tint the bottle, lid, or both to your chosen colour. Great for matching your brand palette.",
  SilkScreen:
    "Your logo or design is printed directly onto the bottle in ink. Flat, clean finish. Best for bold logos and solid shapes.",
  HotStamping:
    "Your logo is pressed onto the bottle using metallic foil. Creates a shiny, premium look. Available in gold or silver.",
};

function CustomisationToggle({
  type,
  inputType = "checkbox",
  label,
  subLabel,
  processingNote,
  enabled,
  checked,
  onChange,
  cost,
  formatAmount = formatZAR,
  lockedMessage,
}: {
  type: string;
  inputType?: "checkbox" | "radio";
  label: string;
  subLabel?: string;
  processingNote?: string;
  enabled: boolean;
  checked: boolean;
  onChange: (v: boolean) => void;
  cost: number | null;
  formatAmount?: (n: number) => string;
  lockedMessage?: string;
}) {
  const description = CUSTOMISATION_DESCRIPTIONS[type];

  return (
    <div className={`${enabled ? "" : "opacity-50"}`}>
      <label className={`flex items-start justify-between gap-3 ${enabled ? "cursor-pointer" : "cursor-not-allowed"}`}>
        <div className="flex items-start gap-3">
          <input
            type={inputType}
            checked={checked}
            disabled={!enabled}
            onChange={(e) => onChange(e.target.checked)}
            className="w-4 h-4 mt-0.5 accent-ink shrink-0"
          />
          <div>
            <div className="flex items-center flex-wrap gap-x-2">
              <span className="text-sm font-medium" style={{ color: "#1C1A17" }}>{label}</span>
              {subLabel && <span className="text-xs" style={{ color: "#C9B8A8" }}>{subLabel}</span>}
              {processingNote && enabled && (
                <span className="text-xs" style={{ color: "#C9B8A8" }}>{processingNote}</span>
              )}
            </div>
            {description && (
              <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "#4A4540" }}>{description}</p>
            )}
            {!enabled && lockedMessage && (
              <p className="text-xs mt-0.5" style={{ color: "#D4A89A" }}>{lockedMessage}</p>
            )}
          </div>
        </div>
        {cost != null && cost > 0 && (
          <span className="text-sm shrink-0 font-medium" style={{ color: "#1C1A17" }}>{formatAmount(cost)}</span>
        )}
      </label>
    </div>
  );
}
