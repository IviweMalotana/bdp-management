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

interface ProductHit { slug: string; name: string; primaryUrl?: string }

function LogoPreviewTool() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoSize, setLogoSize] = useState(25); // % of image width

  // Picker
  const [query, setQuery] = useState("");
  const [allProducts, setAllProducts] = useState<ProductHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [highlighted, setHighlighted] = useState<ProductHit | null>(null);
  const [confirmed, setConfirmed] = useState<ProductHit | null>(null);
  const [productImgUrl, setProductImgUrl] = useState<string | null>(null);
  const [imgLoading, setImgLoading] = useState(false);

  const pickerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Load all products once
  const openDropdown = useCallback(() => {
    setOpen(true);
    if (allProducts.length > 0) return;
    setLoadingList(true);
    fetch(`${API_URL}/api/storefront/products?pageSize=100`)
      .then((r) => r.json())
      .then((d) => {
        const items = (d.items ?? d) as { slug: string; name: string; primaryUrl?: string }[];
        setAllProducts(items.map((p) => ({ slug: p.slug, name: p.name, primaryUrl: p.primaryUrl })));
      })
      .catch(() => {})
      .finally(() => setLoadingList(false));
  }, [allProducts.length]);

  const filtered = query.trim()
    ? allProducts.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
    : allProducts;

  // Resolve image URL when confirmed
  useEffect(() => {
    if (!confirmed) { setProductImgUrl(null); return; }
    if (confirmed.primaryUrl) { setProductImgUrl(confirmed.primaryUrl); return; }
    setImgLoading(true);
    fetch(`${API_URL}/api/storefront/products/${confirmed.slug}`)
      .then((r) => r.json())
      .then((d) => {
        const img = (d.images as { url: string; isPrimary: boolean }[])
          ?.find((i) => i.isPrimary) ?? d.images?.[0];
        setProductImgUrl(img?.url ?? null);
      })
      .catch(() => {})
      .finally(() => setImgLoading(false));
  }, [confirmed]);

  const confirmSelection = () => {
    if (!highlighted) return;
    setConfirmed(highlighted);
    setOpen(false);
    setQuery("");
  };

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setLogoUrl(URL.createObjectURL(f));
  }

  // Draw logo onto overlay canvas whenever logo/size changes
  const drawLogo = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !logoUrl) {
      if (canvas) canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const logoImg = new window.Image();
    logoImg.onload = () => {
      const targetW = canvas.width * (logoSize / 100);
      const targetH = (logoImg.naturalHeight / logoImg.naturalWidth) * targetW;
      // Center horizontally; place in the lower-middle of the bottle body
      const lx = (canvas.width - targetW) / 2;
      const ly = canvas.height * 0.55 - targetH / 2;
      ctx.drawImage(logoImg, lx, ly, targetW, targetH);
    };
    logoImg.src = logoUrl;
  }, [logoUrl, logoSize]);

  useEffect(() => { drawLogo(); }, [drawLogo]);

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
            <div style={{ display: "flex", gap: 8 }}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                placeholder={confirmed ? confirmed.name : "Search by name e.g. Delila, Ada…"}
                value={query}
                onChange={(e) => { setQuery(e.target.value); if (!open) openDropdown(); }}
                onFocus={openDropdown}
              />
              {confirmed && (
                <button
                  onClick={() => { setConfirmed(null); setHighlighted(null); setProductImgUrl(null); setQuery(""); }}
                  style={{ padding: "10px 14px", background: "none", border: "1px solid #4A4540", borderRadius: "2px", color: "#9E8F83", cursor: "pointer", fontSize: 20, lineHeight: 1 }}
                >×</button>
              )}
            </div>

            {open && (
              <div style={{
                position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50,
                background: "#1E1C19", border: "1px solid #4A4540", borderRadius: "2px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
              }}>
                <div style={{ padding: "8px 8px 4px" }}>
                  <input
                    style={{ ...inputStyle, fontSize: 13 }}
                    placeholder="Type to filter…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoFocus
                  />
                </div>
                <ul style={{ maxHeight: "240px", overflowY: "auto", margin: 0, padding: "4px 0", listStyle: "none" }}>
                  {loadingList && <li style={{ padding: "12px 14px", color: "#9E8F83", fontSize: 13 }}>Loading…</li>}
                  {!loadingList && filtered.length === 0 && <li style={{ padding: "12px 14px", color: "#9E8F83", fontSize: 13 }}>No results</li>}
                  {filtered.map((r) => {
                    const isHL = highlighted?.slug === r.slug;
                    return (
                      <li key={r.slug}>
                        <button
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => setHighlighted(r)}
                          style={{
                            width: "100%", textAlign: "left", padding: "9px 14px",
                            background: isHL ? "#3A3530" : "none", border: "none",
                            borderLeft: isHL ? "2px solid #C9B8A8" : "2px solid transparent",
                            color: "#FAF8F5", fontSize: "14px", cursor: "pointer",
                            display: "flex", alignItems: "center", gap: 10, boxSizing: "border-box",
                          }}
                        >
                          {r.primaryUrl && <img src={r.primaryUrl} alt="" style={{ width: 36, height: 36, objectFit: "contain", background: "#2A2723", borderRadius: 2, flexShrink: 0 }} />}
                          <span>{r.name}</span>
                          {isHL && <span style={{ marginLeft: "auto", color: "#C9B8A8", fontSize: 11 }}>✓</span>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <div style={{ padding: "8px", borderTop: "1px solid #2A2723" }}>
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={confirmSelection}
                    disabled={!highlighted}
                    style={{
                      width: "100%", padding: "10px", borderRadius: "2px", border: "none",
                      background: highlighted ? "#C9B8A8" : "#2A2723",
                      color: highlighted ? "#1C1A17" : "#4A4540",
                      fontSize: "13px", fontWeight: 600, cursor: highlighted ? "pointer" : "default",
                      letterSpacing: "0.5px",
                    }}
                  >
                    {highlighted ? `Preview "${highlighted.name}"` : "Select a bottle above"}
                  </button>
                </div>
              </div>
            )}
          </div>
          {imgLoading && <p style={{ color: "#9E8F83", fontSize: 12, marginTop: 6 }}>Loading image…</p>}
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

        {/* Step 3: Size slider */}
        {logoUrl && productImgUrl && (
          <div>
            <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "#C9B8A8" }}>3. Adjust logo size</p>
            <input
              type="range" min={10} max={80} value={logoSize}
              onChange={(e) => setLogoSize(Number(e.target.value))}
              style={{ width: "100%", accentColor: "#C9B8A8" }}
            />
            <p style={{ color: "#9E8F83", fontSize: 11, marginTop: 4 }}>{logoSize}% of bottle width</p>
          </div>
        )}

        <p className="text-xs" style={{ color: "#4A4540", lineHeight: 1.8 }}>
          {logoUrl && productImgUrl
            ? "Logo mapped using cylindrical projection — pixels are warped to follow the curve of the bottle with edge shading. A formal print proof is sent before production."
            : "Select a bottle from your catalogue, then upload your logo to see how it wraps around the surface."}
        </p>
      </div>

      <div style={{ display: "flex", justifyContent: "center", padding: "16px 0", width: "100%" }}>
        <div style={{ position: "relative", width: "100%", maxWidth: "320px" }}>
          {productImgUrl ? (
            <>
              <img
                ref={imgRef}
                src={productImgUrl}
                alt={confirmed?.name}
                crossOrigin="anonymous"
                onLoad={drawLogo}
                style={{ width: "100%", display: "block", borderRadius: "4px" }}
              />
              <canvas
                ref={canvasRef}
                style={{
                  position: "absolute", top: 0, left: 0,
                  width: "100%", height: "100%",
                  mixBlendMode: "multiply",
                  pointerEvents: "none",
                  borderRadius: "4px",
                }}
              />
            </>
          ) : (
            <div style={{
              background: "#1E1C19", borderRadius: "4px",
              aspectRatio: "2/3", display: "flex", alignItems: "center",
              justifyContent: "center", flexDirection: "column", gap: 8,
            }}>
              <p style={{ color: "rgba(201,184,168,0.4)", fontSize: 13, textAlign: "center", padding: "0 24px" }}>
                {imgLoading ? "Loading bottle image…" : "Select a bottle above to preview your logo"}
              </p>
            </div>
          )}
        </div>
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
