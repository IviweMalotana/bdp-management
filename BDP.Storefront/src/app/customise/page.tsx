"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const TECHNIQUES = [
  {
    name: "Silk Screen Printing",
    moq: 100,
    lead: "4–6 weeks",
    description:
      "Up to 2 colours printed directly onto the bottle. Clean, precise, and durable. Ideal for logos, wordmarks, and simple graphics.",
    startingFrom: "R15.00 / unit",
  },
  {
    name: "Hot Stamp Foiling",
    moq: 100,
    lead: "4–6 weeks",
    description:
      "Metallic foil transferred under heat. Gives your packaging a premium, luxurious feel. Available in gold, silver, rose gold, and more.",
    startingFrom: "R16.50 / unit",
  },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://bdp-api-production.up.railway.app";

// Label area as fractions of the displayed image [x, y, w, h]
// Centred on the bottle body — works for most portrait product photos
const LABEL_FRAC = [0.22, 0.36, 0.56, 0.40] as const;

interface ProductHit { slug: string; name: string; primaryUrl?: string }

function LogoPreviewTool() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  // Picker state
  const [query, setQuery] = useState("");
  const [allProducts, setAllProducts] = useState<ProductHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlighted, setHighlighted] = useState<ProductHit | null>(null); // highlighted in dropdown
  const [confirmed, setConfirmed] = useState<ProductHit | null>(null);     // confirmed for canvas
  const [productImg, setProductImg] = useState<HTMLImageElement | null>(null);
  const [imgLoading, setImgLoading] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const CW = 360, CH = 540;

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Load all products once when dropdown first opens
  const openDropdown = useCallback(() => {
    setOpen(true);
    if (allProducts.length > 0) return;
    setLoading(true);
    fetch(`${API_URL}/api/storefront/products?pageSize=100`)
      .then((r) => r.json())
      .then((d) => {
        const items = (d.items ?? d) as { slug: string; name: string; primaryUrl?: string }[];
        setAllProducts(items.map((p) => ({ slug: p.slug, name: p.name, primaryUrl: p.primaryUrl })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [allProducts.length]);

  // Filter by query client-side
  const filtered = query.trim()
    ? allProducts.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
    : allProducts;

  // Load image when confirmed
  useEffect(() => {
    if (!confirmed) return;
    setImgLoading(true);
    const load = (url: string) => {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => { setProductImg(img); setImgLoading(false); };
      img.onerror = () => setImgLoading(false);
      img.src = url;
    };
    if (confirmed.primaryUrl) {
      load(confirmed.primaryUrl);
    } else {
      fetch(`${API_URL}/api/storefront/products/${confirmed.slug}`)
        .then((r) => r.json())
        .then((d) => {
          const img = (d.images as { url: string; isPrimary: boolean }[])
            ?.find((i) => i.isPrimary) ?? d.images?.[0];
          if (img?.url) load(img.url); else setImgLoading(false);
        })
        .catch(() => setImgLoading(false));
    }
  }, [confirmed]);

  const confirmSelection = () => {
    if (!highlighted) return;
    setConfirmed(highlighted);
    setOpen(false);
  };

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setLogoUrl(URL.createObjectURL(f));
  }

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, CW, CH);

    if (!productImg) {
      // Placeholder state
      ctx.fillStyle = "#2A2723";
      ctx.fillRect(0, 0, CW, CH);
      ctx.fillStyle = "rgba(201,184,168,0.25)";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Search and select a bottle above", CW / 2, CH / 2 - 10);
      ctx.fillText("to preview your logo on it", CW / 2, CH / 2 + 12);
      return;
    }

    // Fit photo into canvas
    const ratio = Math.min(CW / productImg.naturalWidth, CH / productImg.naturalHeight);
    const dw = productImg.naturalWidth * ratio;
    const dh = productImg.naturalHeight * ratio;
    const dx = (CW - dw) / 2;
    const dy = (CH - dh) / 2;
    ctx.drawImage(productImg, dx, dy, dw, dh);

    // Label area in pixels
    const lx = dx + LABEL_FRAC[0] * dw;
    const ly = dy + LABEL_FRAC[1] * dh;
    const lw = LABEL_FRAC[2] * dw;
    const lh = LABEL_FRAC[3] * dh;

    if (!logoUrl) {
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.28)";
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(lx + 8, ly + 8, lw - 16, lh - 16);
      ctx.fillStyle = "rgba(255,255,255,0.28)";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("UPLOAD LOGO", lx + lw / 2, ly + lh / 2);
      ctx.restore();
      return;
    }

    // Cylindrical warp
    const tmp = document.createElement("canvas");
    tmp.width = logoUrl ? 1 : 1; // ensure not zero
    const logoImg = new window.Image();
    logoImg.onload = () => {
      ctx.drawImage(productImg, dx, dy, dw, dh); // redraw clean

      const t2 = document.createElement("canvas");
      t2.width = logoImg.naturalWidth; t2.height = logoImg.naturalHeight;
      const tc = t2.getContext("2d")!;
      tc.drawImage(logoImg, 0, 0);
      const src = tc.getImageData(0, 0, t2.width, t2.height);

      const wc = document.createElement("canvas");
      wc.width = Math.ceil(lw); wc.height = Math.ceil(lh);
      const wctx = wc.getContext("2d")!;
      const dst = wctx.createImageData(wc.width, wc.height);
      const sw = t2.width, sh = t2.height;

      for (let oy = 0; oy < wc.height; oy++) {
        for (let ox = 0; ox < wc.width; ox++) {
          const t = (2 * ox) / wc.width - 1;
          if (t <= -0.999 || t >= 0.999) continue;
          const sx = Math.round(((Math.PI - Math.acos(t)) / Math.PI) * sw);
          const sy = Math.round((oy / wc.height) * sh);
          if (sx < 0 || sx >= sw || sy < 0 || sy >= sh) continue;
          const si = (sy * sw + sx) * 4, di = (oy * wc.width + ox) * 4;
          dst.data[di] = src.data[si]; dst.data[di+1] = src.data[si+1];
          dst.data[di+2] = src.data[si+2]; dst.data[di+3] = src.data[si+3];
        }
      }
      wctx.putImageData(dst, 0, 0);

      ctx.save();
      ctx.rect(lx, ly, lw, lh);
      ctx.clip();
      ctx.drawImage(wc, lx, ly);
      const grad = ctx.createLinearGradient(lx, 0, lx + lw, 0);
      grad.addColorStop(0,    "rgba(0,0,0,0.25)");
      grad.addColorStop(0.15, "rgba(0,0,0,0)");
      grad.addColorStop(0.85, "rgba(0,0,0,0)");
      grad.addColorStop(1,    "rgba(0,0,0,0.25)");
      ctx.fillStyle = grad;
      ctx.fillRect(lx, ly, lw, lh);
      ctx.restore();
    };
    logoImg.src = logoUrl;
    void tmp;
  }, [logoUrl, productImg]);

  useEffect(() => { draw(); }, [draw]);

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px",
    background: "#2A2723", border: "1px solid #4A4540",
    borderRadius: "2px", color: "#FAF8F5", fontSize: "14px", outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
      <div className="space-y-6">

        {/* Step 1: Pick bottle */}
        <div>
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "#C9B8A8" }}>1. Choose a bottle</p>
          <div ref={pickerRef} style={{ position: "relative" }}>

            {/* Input row */}
            <div style={{ display: "flex", gap: 8 }}>
              <input
                ref={inputRef}
                style={{ ...inputStyle, flex: 1 }}
                placeholder={confirmed ? confirmed.name : "Search by name e.g. Delila, Ada…"}
                value={query}
                onChange={(e) => { setQuery(e.target.value); if (!open) openDropdown(); }}
                onFocus={openDropdown}
              />
              {confirmed && (
                <button
                  onClick={() => { setConfirmed(null); setHighlighted(null); setProductImg(null); setQuery(""); }}
                  style={{ padding: "10px 12px", background: "none", border: "1px solid #4A4540", borderRadius: "2px", color: "#9E8F83", cursor: "pointer", fontSize: 18, lineHeight: 1 }}
                >×</button>
              )}
            </div>

            {/* Dropdown */}
            {open && (
              <div style={{
                position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50,
                background: "#1E1C19", border: "1px solid #4A4540", borderRadius: "2px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
              }}>
                {/* Search inside dropdown */}
                <div style={{ padding: "8px 8px 4px" }}>
                  <input
                    style={{ ...inputStyle, fontSize: 13 }}
                    placeholder="Type to filter…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoFocus
                  />
                </div>

                {/* Results list */}
                <ul style={{ maxHeight: "240px", overflowY: "auto", margin: 0, padding: "4px 0", listStyle: "none" }}>
                  {loading && (
                    <li style={{ padding: "12px 14px", color: "#9E8F83", fontSize: 13 }}>Loading bottles…</li>
                  )}
                  {!loading && filtered.length === 0 && (
                    <li style={{ padding: "12px 14px", color: "#9E8F83", fontSize: 13 }}>No results</li>
                  )}
                  {filtered.map((r) => {
                    const isHighlighted = highlighted?.slug === r.slug;
                    return (
                      <li key={r.slug}>
                        <button
                          onMouseDown={(e) => e.preventDefault()} // prevent input blur closing dropdown
                          onClick={() => setHighlighted(r)}
                          style={{
                            width: "100%", textAlign: "left", padding: "10px 14px",
                            background: isHighlighted ? "#3A3530" : "none",
                            border: "none", borderLeft: isHighlighted ? "2px solid #C9B8A8" : "2px solid transparent",
                            color: "#FAF8F5", fontSize: "14px", cursor: "pointer",
                            display: "flex", alignItems: "center", gap: 10, boxSizing: "border-box",
                          }}
                        >
                          {r.primaryUrl && (
                            <img src={r.primaryUrl} alt="" style={{ width: 36, height: 36, objectFit: "contain", borderRadius: 2, background: "#2A2723", flexShrink: 0 }} />
                          )}
                          <span>{r.name}</span>
                          {isHighlighted && <span style={{ marginLeft: "auto", color: "#C9B8A8", fontSize: 11 }}>selected</span>}
                        </button>
                      </li>
                    );
                  })}
                </ul>

                {/* Confirm button */}
                <div style={{ padding: "8px", borderTop: "1px solid #2A2723" }}>
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={confirmSelection}
                    disabled={!highlighted}
                    style={{
                      width: "100%", padding: "10px", background: highlighted ? "#C9B8A8" : "#2A2723",
                      border: "none", borderRadius: "2px", color: highlighted ? "#1C1A17" : "#4A4540",
                      fontSize: "13px", fontWeight: 600, cursor: highlighted ? "pointer" : "default",
                      letterSpacing: "0.5px", transition: "background 0.15s",
                    }}
                  >
                    {highlighted ? `Preview "${highlighted.name}" on bottle` : "Select a bottle above"}
                  </button>
                </div>
              </div>
            )}
          </div>
          {imgLoading && <p style={{ color: "#9E8F83", fontSize: 12, marginTop: 6 }}>Loading bottle image…</p>}
          {confirmed && !imgLoading && <p style={{ color: "#C9B8A8", fontSize: 12, marginTop: 6 }}>Showing: {confirmed.name}</p>}
        </div>

        {/* Step 2: Upload logo */}
        <div>
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "#C9B8A8" }}>2. Upload your logo</p>
          <label className="flex flex-col items-center justify-center gap-2 px-4 py-8 border-2 border-dashed cursor-pointer transition-colors hover:border-[#C9B8A8]" style={{ borderColor: "#4A4540", borderRadius: "2px" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C9B8A8" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <span className="text-xs" style={{ color: "#9E8F83" }}>
              {logoUrl ? "Change logo" : "PNG or SVG · transparent background works best"}
            </span>
            <input type="file" accept=".png,.svg,image/png,image/svg+xml" onChange={handleFile} className="hidden" />
          </label>
        </div>

        <p className="text-xs" style={{ color: "#4A4540", lineHeight: 1.8 }}>
          {logoUrl && productImg
            ? "Logo mapped using cylindrical projection — pixels are warped to follow the curve of the bottle with edge shading. A formal print proof is sent before production."
            : "Select a bottle from your catalogue, then upload your logo to see how it wraps around the surface."}
        </p>
      </div>

      <div style={{ display: "flex", justifyContent: "center", padding: "16px 0" }}>
        <canvas
          ref={canvasRef}
          width={CW}
          height={CH}
          style={{ borderRadius: "4px", backgroundColor: "#1E1C19", maxWidth: "320px", width: "100%", height: "auto" }}
        />
      </div>
    </div>
  );
}

export default function CustomisePage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const techniquesRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      if (heroRef.current) {
        gsap.from(heroRef.current.querySelectorAll(".hero-animate"), {
          y: 30,
          opacity: 0,
          duration: 0.8,
          stagger: 0.12,
          ease: "power2.out",
        });
      }

      if (techniquesRef.current) {
        gsap.from(techniquesRef.current.querySelectorAll(".technique-card"), {
          y: 40,
          opacity: 0,
          duration: 0.8,
          stagger: 0.15,
          ease: "power2.out",
          scrollTrigger: {
            trigger: techniquesRef.current,
            start: "top 70%",
          },
        });
      }

      if (stepsRef.current) {
        gsap.from(stepsRef.current.querySelectorAll("li"), {
          y: 30,
          opacity: 0,
          duration: 0.6,
          stagger: 0.1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: stepsRef.current,
            start: "top 70%",
          },
        });
      }
    });

    return () => ctx.revert();
  }, []);

  return (
    <>
      {/* Hero */}
      <section
        ref={heroRef}
        className="py-16 md:py-20 px-4"
        style={{ backgroundColor: "#FAF8F5" }}
      >
        <div className="max-w-4xl mx-auto">
          <p
            className="hero-animate text-xs uppercase tracking-widest mb-4"
            style={{ color: "#C9B8A8" }}
          >
            Customisation
          </p>
          <h1
            className="hero-animate text-6xl md:text-7xl leading-none mb-8"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 300,
              color: "#1C1A17",
            }}
          >
            make it
            <br />
            undeniably
            <br />
            yours.
          </h1>
          <p
            className="hero-animate text-lg max-w-xl"
            style={{ color: "#4A4540", lineHeight: 1.8 }}
          >
            Add your brand identity directly to the packaging. From 100 units,
            shipped from our China supplier in 4–6 weeks.
          </p>
        </div>
      </section>

      {/* Logo Preview Tool */}
      <section className="py-20 px-4" style={{ backgroundColor: "#1C1A17" }}>
        <div className="max-w-5xl mx-auto">
          <p className="text-xs uppercase tracking-widest mb-4" style={{ color: "#C9B8A8" }}>Preview tool</p>
          <h2 className="text-3xl mb-3" style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: "#FAF8F5" }}>
            see your logo on a bottle
          </h2>
          <p className="text-sm mb-10 max-w-lg" style={{ color: "#9E8F83", lineHeight: 1.8 }}>
            Upload a PNG or SVG of your logo and see roughly how it will look on packaging. This is an approximate preview — a formal print proof is provided before production.
          </p>
          <LogoPreviewTool />
        </div>
      </section>

      {/* Techniques */}
      <section className="py-20 px-4" style={{ backgroundColor: "#E8DDD0" }}>
        <div ref={techniquesRef} className="max-w-7xl mx-auto">
          <h2
            className="text-3xl mb-12"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 300,
              color: "#1C1A17",
            }}
          >
            techniques
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {TECHNIQUES.map((t) => (
              <div
                key={t.name}
                className="technique-card p-8 border"
                style={{
                  backgroundColor: "#FAF8F5",
                  borderColor: "#C9B8A8",
                  borderRadius: "2px",
                }}
              >
                <h3
                  className="text-2xl mb-3"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 300,
                    color: "#1C1A17",
                  }}
                >
                  {t.name}
                </h3>
                <p
                  className="text-sm mb-6"
                  style={{ color: "#4A4540", lineHeight: 1.8 }}
                >
                  {t.description}
                </p>
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <p
                      className="uppercase tracking-widest mb-1"
                      style={{ color: "#C9B8A8" }}
                    >
                      MOQ
                    </p>
                    <p style={{ color: "#1C1A17" }}>{t.moq} units</p>
                  </div>
                  <div>
                    <p
                      className="uppercase tracking-widest mb-1"
                      style={{ color: "#C9B8A8" }}
                    >
                      Lead time
                    </p>
                    <p style={{ color: "#1C1A17" }}>{t.lead}</p>
                  </div>
                  <div>
                    <p
                      className="uppercase tracking-widest mb-1"
                      style={{ color: "#C9B8A8" }}
                    >
                      From
                    </p>
                    <p style={{ color: "#1C1A17" }}>{t.startingFrom}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4" style={{ backgroundColor: "#FAF8F5" }}>
        <div className="max-w-3xl mx-auto">
          <h2
            className="text-3xl mb-12"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 300,
              color: "#1C1A17",
            }}
          >
            how it works
          </h2>
          <ol ref={stepsRef} className="space-y-8">
            {[
              {
                step: "01",
                heading: "Choose your bottle",
                body: "Browse the shop and select your packaging. Add 100+ units to your cart.",
              },
              {
                step: "02",
                heading: "Select a print technique",
                body: "On the product page, choose silk screen or hot stamp and add it to your order.",
              },
              {
                step: "03",
                heading: "Send your artwork",
                body: "After checkout we'll email you a brief with file format specs (PDF/AI, vector).",
              },
              {
                step: "04",
                heading: "Proof and produce",
                body: "We send a digital proof for your approval. Production begins once confirmed.",
              },
              {
                step: "05",
                heading: "Delivered to your door",
                body: "Your branded packaging ships from China and arrives in 4–6 weeks.",
              },
            ].map((item) => (
              <li key={item.step} className="flex gap-8 items-start">
                <span
                  className="text-3xl shrink-0 w-12"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 300,
                    color: "#C9B8A8",
                  }}
                >
                  {item.step}
                </span>
                <div>
                  <h3 className="text-base font-medium mb-1" style={{ color: "#1C1A17" }}>
                    {item.heading}
                  </h3>
                  <p
                    className="text-sm"
                    style={{ color: "#4A4540", lineHeight: 1.8 }}
                  >
                    {item.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section
        className="py-20 px-4 text-center"
        style={{ backgroundColor: "#EDD8D2" }}
      >
        <h2
          className="text-4xl mb-6"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 300,
            color: "#1C1A17",
          }}
        >
          ready to start?
        </h2>
        <p
          className="text-sm mb-10 max-w-md mx-auto"
          style={{ color: "#4A4540", lineHeight: 1.8 }}
        >
          Select your packaging, choose a print technique at checkout, and we
          handle the rest.
        </p>
        <Link
          href="/shop"
          className="inline-flex items-center px-10 py-4 text-sm font-medium tracking-wide transition-opacity hover:opacity-90"
          style={{
            backgroundColor: "#1C1A17",
            color: "#FAF8F5",
            borderRadius: "2px",
          }}
        >
          Shop packaging →
        </Link>
      </section>
    </>
  );
}
