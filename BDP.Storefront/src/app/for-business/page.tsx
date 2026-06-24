"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const FEATURES = [
  {
    icon: "↻",
    heading: "Recurring orders",
    body: "Set up automatic monthly or quarterly reorders. Never run out of amenity stock again. Adjust quantities any time.",
  },
  {
    icon: "◻",
    heading: "Invoice & net terms",
    body: "Get invoiced on 30- or 60-day net terms. Pay by EFT or Paystack. Full invoice history in your account.",
  },
  {
    icon: "◈",
    heading: "Direct sourcing",
    body: "We source packaging directly from manufacturers. No middlemen means better unit costs as your volumes grow.",
  },
  {
    icon: "✦",
    heading: "Branded packaging",
    body: "Add your property logo via silk screen or hot stamp. Minimum 100 units. Delivered in 4–6 weeks.",
  },
  {
    icon: "⊞",
    heading: "Multi-site consolidation",
    body: "Manage orders across multiple properties from one account. Split delivery by site or consolidate into one shipment.",
  },
];

const USES = [
  { segment: "Hotels & resorts", detail: "Amenity lines, in-room toiletry bottles, minibar packaging." },
  { segment: "Day spas & wellness", detail: "Retail-ready packaging for house-brand treatments." },
  { segment: "Salons", detail: "Branded take-home bottles and in-salon product containers." },
  { segment: "Corporate gifting", detail: "Bulk packaging for gift sets and employee wellness kits." },
];

export default function ForBusinessPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);

  // Hero + card animations
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      if (heroRef.current) {
        gsap.from(heroRef.current.querySelectorAll(".hero-animate"), {
          y: 40,
          opacity: 0,
          duration: 0.8,
          stagger: 0.12,
          ease: "power2.out",
        });
      }

      if (cardsRef.current) {
        const cards = cardsRef.current.querySelectorAll(".customer-card");
        gsap.from(cards, {
          y: 30,
          opacity: 0,
          duration: 0.6,
          stagger: 0.1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: cardsRef.current,
            start: "top 70%",
          },
        });
      }

      if (featuresRef.current) {
        const cards = featuresRef.current.querySelectorAll(".feature-card");
        gsap.from(cards, {
          y: 30,
          opacity: 0,
          duration: 0.6,
          stagger: 0.08,
          ease: "power2.out",
          scrollTrigger: {
            trigger: featuresRef.current,
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
        style={{ backgroundColor: "#1C1A17" }}
      >
        <div className="max-w-4xl mx-auto">
          <p
            className="hero-animate text-xs uppercase tracking-widest mb-4"
            style={{ color: "#C9B8A8" }}
          >
            For Business
          </p>
          <h1
            className="hero-animate text-6xl md:text-7xl leading-none mb-8"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 300,
              color: "#FAF8F5",
            }}
          >
            packaging that
            <br />
            runs with
            <br />
            your business.
          </h1>
          <p
            className="hero-animate text-lg max-w-xl mb-12"
            style={{ color: "#C9B8A8", lineHeight: 1.8 }}
          >
            Hotels, spas, and salons need reliable supply, not one-off orders.
            We&apos;ve built the infrastructure for it.
          </p>
          <Link
            href="/auth/register"
            className="hero-animate inline-flex items-center px-10 py-4 text-sm font-medium tracking-wide transition-opacity hover:opacity-90"
            style={{
              backgroundColor: "#D4A89A",
              color: "#1C1A17",
              borderRadius: "2px",
            }}
          >
            Open a business account →
          </Link>
        </div>
      </section>

      {/* Who it&apos;s for */}
      <section className="py-20 px-4" style={{ backgroundColor: "#E8DDD0" }}>
        <div className="max-w-7xl mx-auto">
          <h2
            className="text-3xl mb-10"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 300,
              color: "#1C1A17",
            }}
          >
            who it&apos;s for
          </h2>
          <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {USES.map((u) => (
              <div
                key={u.segment}
                className="customer-card p-6 border"
                style={{
                  backgroundColor: "#FAF8F5",
                  borderColor: "#C9B8A8",
                  borderRadius: "2px",
                }}
              >
                <h3 className="text-lg font-medium mb-1" style={{ color: "#1C1A17" }}>
                  {u.segment}
                </h3>
                <p className="text-sm" style={{ color: "#4A4540" }}>
                  {u.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="py-20 px-4" style={{ backgroundColor: "#FAF8F5" }}>
        <div ref={featuresRef} className="max-w-7xl mx-auto">
          <h2
            className="text-3xl mb-12"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 300,
              color: "#1C1A17",
            }}
          >
            what you get
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.heading}
                className="feature-card p-6 border"
                style={{
                  borderColor: "#C9B8A8",
                  borderRadius: "2px",
                }}
              >
                <span
                  className="block text-2xl mb-4"
                  style={{ color: "#D4A89A" }}
                >
                  {f.icon}
                </span>
                <h3 className="text-lg font-medium mb-2" style={{ color: "#1C1A17" }}>
                  {f.heading}
                </h3>
                <p
                  className="text-sm"
                  style={{ color: "#4A4540", lineHeight: 1.8 }}
                >
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing note */}
      <section className="py-20 px-4" style={{ backgroundColor: "#E8DDD0" }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2
            className="text-4xl mb-6"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 300,
              color: "#1C1A17",
            }}
          >
            volume unlocks value.
          </h2>
          <div className="grid grid-cols-3 gap-6 mb-10">
            {[
              { qty: "50 units", note: "Start small" },
              { qty: "500 units", note: "Better unit cost" },
              { qty: "5,000 units", note: "Best unit cost" },
            ].map((row) => (
              <div
                key={row.qty}
                className="p-4 border"
                style={{
                  backgroundColor: "#FAF8F5",
                  borderColor: "#C9B8A8",
                  borderRadius: "2px",
                }}
              >
                <p
                  className="text-xl mb-1"
                  style={{
                    fontFamily: "var(--font-display)",
                    color: "#1C1A17",
                    fontWeight: 300,
                  }}
                >
                  {row.qty}
                </p>
                <p className="text-xs" style={{ color: "#C9B8A8" }}>
                  {row.note}
                </p>
              </div>
            ))}
          </div>
          <p
            className="text-sm mb-10"
            style={{ color: "#4A4540", lineHeight: 1.8 }}
          >
            Pricing updates live as you adjust quantities. No hidden fees, no
            MOQ surprises.
          </p>
          <Link
            href="/shop"
            className="inline-flex items-center px-8 py-3.5 text-sm font-medium tracking-wide border mr-4 transition-colors hover:bg-[#1C1A17] hover:text-[#FAF8F5]"
            style={{
              borderColor: "#1C1A17",
              color: "#1C1A17",
              borderRadius: "2px",
            }}
          >
            Browse packaging
          </Link>
          <Link
            href="/auth/register"
            className="inline-flex items-center px-8 py-3.5 text-sm font-medium tracking-wide transition-opacity hover:opacity-90"
            style={{
              backgroundColor: "#1C1A17",
              color: "#FAF8F5",
              borderRadius: "2px",
            }}
          >
            Open an account →
          </Link>
        </div>
      </section>
    </>
  );
}
