"use client";

import { useEffect, useRef, useState } from "react";
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

function LogoPreviewTool() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [bottleImg, setBottleImg] = useState("/images/hero-product-1.jpg");

  const BOTTLES = [
    { label: "Dropper", src: "/images/hero-product-1.jpg" },
    { label: "Dark", src: "/images/hero-product-3.jpg" },
    { label: "Lifestyle", src: "/images/hero-product-2.jpg" },
  ];

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setLogoUrl(url);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
      {/* Controls */}
      <div className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "#C9B8A8" }}>1. Upload your logo</p>
          <label
            className="flex flex-col items-center justify-center gap-2 px-4 py-8 border-2 border-dashed cursor-pointer transition-colors hover:border-[#C9B8A8]"
            style={{ borderColor: "#4A4540", borderRadius: "2px" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C9B8A8" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <span className="text-xs" style={{ color: "#9E8F83" }}>{logoUrl ? "Change logo" : "PNG or SVG — transparent background works best"}</span>
            <input type="file" accept=".png,.svg,image/png,image/svg+xml" onChange={handleFile} className="hidden" />
          </label>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "#C9B8A8" }}>2. Pick a bottle</p>
          <div className="flex gap-3">
            {BOTTLES.map((b) => (
              <button
                key={b.src}
                onClick={() => setBottleImg(b.src)}
                className="text-xs px-3 py-1.5 border transition-colors"
                style={{
                  borderColor: bottleImg === b.src ? "#FAF8F5" : "#4A4540",
                  color: bottleImg === b.src ? "#FAF8F5" : "#9E8F83",
                  borderRadius: "2px",
                }}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
        {!logoUrl && (
          <p className="text-xs" style={{ color: "#4A4540", lineHeight: 1.7 }}>
            Upload your logo above and it will appear overlaid on the bottle. For best results use a PNG with a transparent background.
          </p>
        )}
      </div>
      {/* Preview */}
      <div className="relative aspect-[3/4] overflow-hidden" style={{ borderRadius: "2px", backgroundColor: "#2A2724" }}>
        <img src={bottleImg} alt="Bottle preview" className="w-full h-full object-cover" />
        {logoUrl && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <img
              src={logoUrl}
              alt="Your logo"
              className="max-w-[35%] max-h-[35%] object-contain"
              style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.3))" }}
            />
          </div>
        )}
        {!logoUrl && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="border border-dashed px-6 py-3 text-xs text-center"
              style={{ borderColor: "rgba(201,184,168,0.4)", color: "rgba(201,184,168,0.6)", borderRadius: "2px" }}
            >
              your logo here
            </div>
          </div>
        )}
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
