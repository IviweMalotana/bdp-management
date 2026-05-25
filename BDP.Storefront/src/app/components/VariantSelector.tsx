"use client";

interface Variant {
  id: number;
  size: string;
  bottleColour: string;
  lidColour: string;
  texture: string;
  sku: string;
  moq: number;
  pricingTiers: { id: number; quantity: number; salePriceZAR: number }[];
}

interface VariantSelectorProps {
  variants: Variant[];
  selectedId: number;
  onSelect: (v: Variant) => void;
}

function unique<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

export default function VariantSelector({ variants, selectedId, onSelect }: VariantSelectorProps) {
  const selected = variants.find((v) => v.id === selectedId) ?? variants[0];

  const sizes = unique(variants.map((v) => v.size)).filter(Boolean);
  const colours = unique(variants.map((v) => v.bottleColour)).filter(Boolean);
  const textures = unique(variants.map((v) => v.texture)).filter(Boolean);

  function pickVariant(overrides: Partial<Pick<Variant, "size" | "bottleColour" | "texture">>) {
    const candidate = variants.find(
      (v) =>
        v.size === (overrides.size ?? selected.size) &&
        v.bottleColour === (overrides.bottleColour ?? selected.bottleColour) &&
        v.texture === (overrides.texture ?? selected.texture)
    );
    if (candidate) onSelect(candidate);
  }

  const btnBase = "px-3 py-1.5 text-sm border transition-colors cursor-pointer";
  const btnActive = "border-ink bg-ink text-cream";
  const btnInactive = "border-sand text-ink hover:border-ink";

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
                onClick={() => pickVariant({ size: s })}
                className={`${btnBase} ${selected.size === s ? btnActive : btnInactive}`}
                style={{ borderRadius: "2px" }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {colours.length > 1 && (
        <div>
          <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "#4A4540" }}>Colour</p>
          <div className="flex flex-wrap gap-2">
            {colours.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => pickVariant({ bottleColour: c })}
                className={`${btnBase} ${selected.bottleColour === c ? btnActive : btnInactive}`}
                style={{ borderRadius: "2px" }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {textures.length > 1 && (
        <div>
          <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "#4A4540" }}>Finish</p>
          <div className="flex flex-wrap gap-2">
            {textures.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => pickVariant({ texture: t })}
                className={`${btnBase} ${selected.texture === t ? btnActive : btnInactive}`}
                style={{ borderRadius: "2px" }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
