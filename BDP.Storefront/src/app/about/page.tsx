"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const services = [
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1C1A17" strokeWidth="1.5">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
    title: "Sourcing",
    description:
      "We source premium glass and plastic packaging directly from vetted Chinese manufacturers, so you get factory-direct pricing without the complexity of overseas procurement.",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1C1A17" strokeWidth="1.5">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
    title: "Customisation",
    description:
      "Silk screen printing, hot stamping, and colour matching available from 1,000 units. Your brand deserves packaging that is unmistakably yours.",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1C1A17" strokeWidth="1.5">
        <rect x="1" y="3" width="15" height="13" />
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
    title: "Delivery",
    description:
      "International shipping to South Africa, UK, USA, EU, and Australia. We handle freight logistics so your order arrives safely and on schedule.",
  },
];

const reasons = [
  {
    title: "Quality you can count on.",
    description: "Every supplier in our network is vetted for production quality and consistency. We request samples and run quality checks before any shipment leaves the factory.",
  },
  {
    title: "Transparent pricing. Flexible MOQs.",
    description: "Pricing tiers are shown up front — no hidden fees, no surprise quotes. MOQs start from as low as 500 units on selected lines, making quality packaging accessible to independent brands.",
  },
];

export default function AboutPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const servicesRef = useRef<HTMLDivElement>(null);
  const reasonsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (heroRef.current) {
        gsap.from(heroRef.current.querySelectorAll(".hero-animate"), {
          y: 30,
          opacity: 0,
          duration: 0.8,
          stagger: 0.15,
          ease: "power2.out",
        });
      }

      if (servicesRef.current) {
        const cards = servicesRef.current.querySelectorAll(".service-card");
        gsap.from(cards, {
          y: 40,
          opacity: 0,
          duration: 0.8,
          stagger: 0.15,
          ease: "power2.out",
          scrollTrigger: {
            trigger: servicesRef.current,
            start: "top 70%",
          },
        });
      }

      if (reasonsRef.current) {
        const items = reasonsRef.current.querySelectorAll(".reason-item");
        items.forEach((item) => {
          gsap.from(item, {
            y: 40,
            opacity: 0,
            duration: 0.8,
            ease: "power2.out",
            scrollTrigger: {
              trigger: item,
              start: "top 75%",
            },
          });
        });
      }
    });

    return () => ctx.revert();
  }, []);

  return (
    <main style={{ backgroundColor: "#FAF8F5", color: "#1C1A17" }}>
      {/* Hero */}
      <section
        ref={heroRef}
        className="max-w-5xl mx-auto px-4 py-20 md:py-32 text-center"
      >
        <p
          className="hero-animate text-xs uppercase tracking-widest mb-6"
          style={{ color: "#C9B8A8" }}
        >
          About BDP
        </p>
        <h1
          className="hero-animate text-5xl md:text-7xl leading-tight mb-8"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 300,
            color: "#1C1A17",
          }}
        >
          Packaging that tells your story.
        </h1>
        <p
          className="hero-animate text-lg md:text-xl max-w-2xl mx-auto leading-relaxed"
          style={{ color: "#4A4540" }}
        >
          BDP Management is a cosmetic packaging wholesale supplier connecting
          South African brands with quality Chinese manufacturing — so you can
          focus on what matters most: your product.
        </p>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-4">
        <hr style={{ borderColor: "#C9B8A8" }} />
      </div>

      {/* What we do */}
      <section ref={servicesRef} className="max-w-5xl mx-auto px-4 py-20">
        <p
          className="text-xs uppercase tracking-widest mb-10 text-center"
          style={{ color: "#C9B8A8" }}
        >
          What we do
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-16">
          {services.map((service) => (
            <div key={service.title} className="service-card">
              <div
                className="w-10 h-10 mb-6 flex items-center justify-center border"
                style={{ borderColor: "#C9B8A8", borderRadius: "2px" }}
              >
                {service.icon}
              </div>
              <h2
                className="text-xl mb-3"
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 300,
                  color: "#1C1A17",
                }}
              >
                {service.title}
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: "#4A4540" }}>
                {service.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-4">
        <hr style={{ borderColor: "#C9B8A8" }} />
      </div>

      {/* Why us */}
      <section ref={reasonsRef} className="max-w-5xl mx-auto px-4 py-20">
        <p
          className="text-xs uppercase tracking-widest mb-10"
          style={{ color: "#C9B8A8" }}
        >
          Why work with us
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-20">
          {reasons.map((reason, i) => (
            <div key={i} className="reason-item">
              <h2
                className="text-2xl mb-4"
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 300,
                  color: "#1C1A17",
                }}
              >
                {reason.title}
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: "#4A4540" }}>
                {reason.description}
              </p>
              <p className="text-sm leading-relaxed mt-4" style={{ color: "#4A4540" }}>
                {i === 0
                  ? "Whether you are launching your first collection or scaling an established brand, the standard never slips."
                  : "Scale up as you grow. Your pricing improves with volume, automatically."}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA strip */}
      <section className="py-16 text-center" style={{ backgroundColor: "#1C1A17" }}>
        <p
          className="text-xs uppercase tracking-widest mb-4"
          style={{ color: "#C9B8A8" }}
        >
          Ready to start?
        </p>
        <h2
          className="text-3xl md:text-4xl mb-8"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 300,
            color: "#FAF8F5",
          }}
        >
          Browse our full catalogue.
        </h2>
        <div className="flex flex-col sm:flex-row justify-center gap-4 px-4">
          <a
            href="/shop"
            className="inline-block px-8 py-3.5 text-sm font-medium transition-opacity hover:opacity-90"
            style={{
              backgroundColor: "#FAF8F5",
              color: "#1C1A17",
              borderRadius: "2px",
            }}
          >
            Shop packaging
          </a>
          <a
            href="/contact"
            className="inline-block px-8 py-3.5 text-sm font-medium border transition-opacity hover:opacity-90"
            style={{
              borderColor: "#C9B8A8",
              color: "#FAF8F5",
              borderRadius: "2px",
            }}
          >
            Get in touch
          </a>
        </div>
      </section>
    </main>
  );
}
