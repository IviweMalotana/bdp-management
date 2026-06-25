"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProductCard from "../components/ProductCard";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5252";

/* ── Quiz definition ───────────────────────────────────────────── */

// Each "use" answer carries candidate category keywords (matched against the
// live /categories list, case-insensitive) plus search terms as a fallback.
interface UseOption {
  label: string;
  hint: string;
  categories: string[];
  search: string;
}

const USE_OPTIONS: UseOption[] = [
  { label: "Serums & face oils", hint: "Dropper bottles", categories: ["Serum", "Dropper"], search: "serum dropper oil" },
  { label: "Lotions & creams", hint: "Pump bottles", categories: ["Pump", "Lotion"], search: "pump lotion cream" },
  { label: "Thick creams, balms & scrubs", hint: "Wide jars", categories: ["Jar"], search: "jar cream balm" },
  { label: "Mists, toners & sprays", hint: "Spray bottles", categories: ["Spray", "Mist"], search: "spray mist toner" },
  { label: "Not sure yet", hint: "Show me everything", categories: [], search: "" },
];

interface SizeOption { label: string; hint: string; match: (size: string) => boolean; }
const SIZE_OPTIONS: SizeOption[] = [
  { label: "Small", hint: "Under 30ml", match: (s) => bucket(s) === "s" },
  { label: "Medium", hint: "30–100ml", match: (s) => bucket(s) === "m" },
  { label: "Large", hint: "Over 100ml", match: (s) => bucket(s) === "l" },
  { label: "No preference", hint: "Any size", match: () => true },
];

interface LookOption { label: string; hint: string; match: (colour?: string, texture?: string) => boolean; }
const LOOK_OPTIONS: LookOption[] = [
  { label: "Clean & clear", hint: "See-through, minimal", match: (c) => /clear|transparent/i.test(c ?? "") },
  { label: "Bold & black", hint: "Matte, luxe", match: (c, t) => /black/i.test(c ?? "") || /matte/i.test(t ?? "") },
  { label: "Soft & frosted", hint: "Diffused, premium", match: (c, t) => /frost/i.test(c ?? "") || /frost/i.test(t ?? "") },
  { label: "No preference", hint: "Surprise me", match: () => true },
];

interface StageOption { label: string; hint: string; key: string; }
const STAGE_OPTIONS: StageOption[] = [
  { label: "Just testing", hint: "Under 50 units", key: "test" },
  { label: "Small batch", hint: "50–250 units", key: "batch" },
  { label: "Scaling up", hint: "250+ units", key: "scale" },
];

const STAGE_MESSAGE: Record<string, string> = {
  test: "Perfect for testing the waters. Start at 10 units, no pallet required.",
  batch: "Smart move. Order a batch, see how it sells, reorder when you're ready.",
  scale: "Large order? We source directly and handle volume well. Open a B2B account for dedicated support and repeat ordering.",
};

/* ── helpers ───────────────────────────────────────────────────── */

function bucket(size: string): "s" | "m" | "l" | "?" {
  const ml = parseFloat((size || "").replace(/[^0-9.]/g, ""));
  if (!ml || isNaN(ml)) return "?";
  if (ml < 30) return "s";
  if (ml <= 100) return "m";
  return "l";
}

interface Variant { id: number; size?: string; colour?: string; texture?: string; }
interface Product {
  id: number; slug: string; name: string; category: string;
  primaryUrl?: string; basePrice: number; lowestMoq?: number;
  variants?: Variant[];
}

/* ── component ─────────────────────────────────────────────────── */

export default function FinderClient() {
  const [liveCategories, setLiveCategories] = useState<string[]>([]);
  const [step, setStep] = useState(0);
  const [useIdx, setUseIdx] = useState<number | null>(null);
  const [sizeIdx, setSizeIdx] = useState<number | null>(null);
  const [lookIdx, setLookIdx] = useState<number | null>(null);
  const [stageIdx, setStageIdx] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Product[]>([]);
  const [shopHref, setShopHref] = useState("/shop");

  useEffect(() => {
    fetch(`${API}/api/storefront/categories`)
      .then((r) => r.json())
      .then((data: { category: string }[]) => setLiveCategories(data.map((c) => c.category)))
      .catch(() => {});
  }, []);

  const totalSteps = 4;
  const progress = Math.round((step / totalSteps) * 100);

  async function runSearch() {
    setLoading(true);
    setStep(4);
    try {
      const use = useIdx !== null ? USE_OPTIONS[useIdx] : null;

      // Map to a real category only if one of the candidates exists live.
      const matchedCategory =
        use?.categories
          .map((c) => liveCategories.find((lc) => lc.toLowerCase() === c.toLowerCase() || lc.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(lc.toLowerCase())))
          .find(Boolean) ?? "";

      const params = new URLSearchParams({ pageSize: "50" });
      if (matchedCategory) params.set("category", matchedCategory);
      else if (use?.search) params.set("search", use.search);

      // CTA should land on the same filtered shop view (never a bare dead-end).
      if (matchedCategory) setShopHref(`/shop?category=${encodeURIComponent(matchedCategory)}`);
      else if (use?.search) setShopHref(`/shop?search=${encodeURIComponent(use.search)}`);
      else setShopHref("/shop");

      const res = await fetch(`${API}/api/storefront/products?${params}`);
      const data = await res.json();
      let items: Product[] = data.items ?? [];

      // Soft client-side filtering by size + look against the variants.
      const sizeOpt = sizeIdx !== null ? SIZE_OPTIONS[sizeIdx] : null;
      const lookOpt = lookIdx !== null ? LOOK_OPTIONS[lookIdx] : null;

      const score = (p: Product) => {
        let s = 0;
        const vs = p.variants ?? [];
        if (sizeOpt && sizeOpt.label !== "No preference" && vs.some((v) => sizeOpt.match(v.size ?? ""))) s += 2;
        if (lookOpt && lookOpt.label !== "No preference" && vs.some((v) => lookOpt.match(v.colour, v.texture))) s += 2;
        return s;
      };

      items = items
        .map((p) => ({ p, s: score(p) }))
        .sort((a, b) => b.s - a.s)
        .map((x) => x.p);

      setResults(items.slice(0, 6));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  const stageMsg = stageIdx !== null ? STAGE_MESSAGE[STAGE_OPTIONS[stageIdx].key] : "";

  const restart = () => {
    setStep(0); setUseIdx(null); setSizeIdx(null); setLookIdx(null); setStageIdx(null); setResults([]); setShopHref("/shop");
  };

  /* ── render ──────────────────────────────────────────────────── */

  return (
    <div className="min-h-[70vh] px-4 py-16 md:py-24" style={{ backgroundColor: "#F5F0E8" }}>
      <div className="max-w-3xl mx-auto">
        {step < 4 && (
          <>
            <span className="label-caps block mb-3" style={{ color: "#B8B0A4" }}>
              find your bottle · step {step + 1} of {totalSteps}
            </span>
            <div className="h-[3px] w-full mb-10" style={{ backgroundColor: "#E2D8C9" }}>
              <div className="h-full transition-all duration-300" style={{ width: `${progress}%`, backgroundColor: "#C4A882" }} />
            </div>
          </>
        )}

        {step === 0 && (
          <Question
            title="What are you packaging?"
            subtitle="We'll match it to the right type of bottle."
            options={USE_OPTIONS.map((o) => ({ label: o.label, hint: o.hint }))}
            selected={useIdx}
            onPick={(i) => { setUseIdx(i); setStep(1); }}
          />
        )}
        {step === 1 && (
          <Question
            title="How big does it need to be?"
            subtitle="Roughly how much product goes in each one."
            options={SIZE_OPTIONS.map((o) => ({ label: o.label, hint: o.hint }))}
            selected={sizeIdx}
            onPick={(i) => { setSizeIdx(i); setStep(2); }}
            onBack={() => setStep(0)}
          />
        )}
        {step === 2 && (
          <Question
            title="What's the vibe?"
            subtitle="The look that matches your brand."
            options={LOOK_OPTIONS.map((o) => ({ label: o.label, hint: o.hint }))}
            selected={lookIdx}
            onPick={(i) => { setLookIdx(i); setStep(3); }}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <Question
            title="Where are you at?"
            subtitle="No wrong answer. This just helps us pitch the quantity."
            options={STAGE_OPTIONS.map((o) => ({ label: o.label, hint: o.hint }))}
            selected={stageIdx}
            onPick={(i) => { setStageIdx(i); runSearch(); }}
            onBack={() => setStep(2)}
          />
        )}

        {step === 4 && (
          <div>
            <h1 className="text-4xl md:text-5xl mb-3" style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: "#1A1A18" }}>
              here's where we'd start
            </h1>
            {stageMsg && (
              <p className="text-sm mb-10 max-w-xl" style={{ color: "#B8B0A4", lineHeight: 1.7 }}>{stageMsg}</p>
            )}

            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="aspect-square animate-pulse" style={{ backgroundColor: "#E8DDD0", borderRadius: "2px" }} />
                ))}
              </div>
            ) : results.length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  {results.map((p) => (
                    <ProductCard key={p.slug} {...p} />
                  ))}
                </div>
                <div className="flex flex-wrap gap-4 mt-12">
                  <Link href={shopHref} className="inline-flex items-center px-8 py-3.5 text-sm font-medium tracking-wide transition-opacity hover:opacity-90" style={{ backgroundColor: "#1A1A18", color: "#F5F0E8", borderRadius: "2px" }}>
                    See all matches →
                  </Link>
                  <button onClick={restart} className="inline-flex items-center px-8 py-3.5 text-sm font-medium tracking-wide border transition-colors hover:bg-[#1A1A18] hover:text-[#F5F0E8]" style={{ borderColor: "#1A1A18", color: "#1A1A18", borderRadius: "2px" }}>
                    Start over
                  </button>
                </div>
              </>
            ) : (
              <div>
                <p className="text-sm mb-8" style={{ color: "#4A4540", lineHeight: 1.7 }}>
                  We couldn&apos;t pin down an exact match, but our shop has the full range. Have a browse, or start over.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link href="/shop" className="inline-flex items-center px-8 py-3.5 text-sm font-medium tracking-wide transition-opacity hover:opacity-90" style={{ backgroundColor: "#1A1A18", color: "#F5F0E8", borderRadius: "2px" }}>
                    Browse the shop →
                  </Link>
                  <button onClick={restart} className="inline-flex items-center px-8 py-3.5 text-sm font-medium tracking-wide border transition-colors hover:bg-[#1A1A18] hover:text-[#F5F0E8]" style={{ borderColor: "#1A1A18", color: "#1A1A18", borderRadius: "2px" }}>
                    Start over
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Question block ────────────────────────────────────────────── */

function Question({
  title, subtitle, options, selected, onPick, onBack,
}: {
  title: string;
  subtitle: string;
  options: { label: string; hint: string }[];
  selected: number | null;
  onPick: (i: number) => void;
  onBack?: () => void;
}) {
  return (
    <div>
      <h1 className="text-4xl md:text-5xl mb-3" style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: "#1A1A18" }}>
        {title}
      </h1>
      <p className="text-sm mb-10" style={{ color: "#B8B0A4", lineHeight: 1.7 }}>{subtitle}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {options.map((o, i) => (
          <button
            key={o.label}
            onClick={() => onPick(i)}
            className="text-left p-5 transition-all duration-200 hover:-translate-y-0.5"
            style={{
              background: selected === i ? "#1A1A18" : "#EDE6DA",
              border: "0.67px solid rgba(184,169,154,0.4)",
              borderRadius: "2px",
            }}
          >
            <span className="block text-base font-medium mb-0.5" style={{ color: selected === i ? "#F5F0E8" : "#1A1A18" }}>
              {o.label}
            </span>
            <span className="block text-xs" style={{ color: selected === i ? "#C4A882" : "#B8B0A4" }}>
              {o.hint}
            </span>
          </button>
        ))}
      </div>

      {onBack && (
        <button onClick={onBack} className="mt-8 text-sm hover:opacity-70 transition-opacity" style={{ color: "#B8B0A4" }}>
          ← Back
        </button>
      )}
    </div>
  );
}
