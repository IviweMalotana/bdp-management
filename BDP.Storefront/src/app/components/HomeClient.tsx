"use client";

import { useState, useEffect, useRef, type CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import ProductCard from "./ProductCard";

gsap.registerPlugin(ScrollTrigger);

/* ────────────────────── data ────────────────────── */

const heroSlides = [
  { src: "/images/hero-product-1.jpg", code: "GL-100-AMBER" },
  { src: "/images/hero-product-2.jpg", code: "GL-SET-FROSTED" },
  { src: "/images/hero-product-3.jpg", code: "PET-200-BLACK" },
];

const segments = [
  {
    image: "/images/segment-skincare.jpg",
    title: "starting your\nskincare brand",
    body: "From 10 units. Try before you scale. No massive upfront investment.",
    cta: "Browse →",
    href: "/shop",
  },
  {
    image: "/images/segment-hotel.jpg",
    title: "hotels &\nspas",
    body: "Recurring orders. Invoiced. Branded with your property identity.",
    cta: "Learn more →",
    href: "/for-business",
  },
  {
    image: "/images/segment-scale.jpg",
    title: "scaling\nyour brand",
    body: "500–5000 units. Shopify-ready export. Volume pricing that works.",
    cta: "Browse →",
    href: "/shop",
  },
];

const portfolioImages = [
  { src: "/images/lifestyle-1.jpg", alt: "Skincare serum application" },
  { src: "/images/hero-product-1.jpg", alt: "Amber glass dropper bottle" },
  { src: "/images/segment-skincare.jpg", alt: "Skincare brand collection" },
  { src: "/images/lifestyle-2.jpg", alt: "Bathroom vanity styling" },
  { src: "/images/lifestyle-3.jpg", alt: "Packaging flat lay" },
  { src: "/images/hero-product-3.jpg", alt: "Black matte luxury bottle" },
];

/* ────────────────────── Hero Section ────────────────────── */

function HeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleMouseEnter = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const handleMouseLeave = () => {
    intervalRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
  };

  return (
    <section
      className="min-h-[90vh] flex items-center py-20 md:py-28 px-4"
      style={{ backgroundColor: "#F5F0E8" }}
    >
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div>
          <h1 className="hero-emboss text-6xl md:text-8xl leading-none mb-8">
            your packaging.
            <br />
            your brand.
          </h1>
          <p
            className="text-lg mb-10 max-w-md"
            style={{ color: "#B8B0A4", lineHeight: 1.7 }}
          >
            Premium cosmetic packaging wholesale — from 10 units to 10,000.
            South Africa&apos;s home for skincare brands and hospitality.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/shop"
              className="inline-flex items-center px-8 py-3.5 text-sm font-medium tracking-wide transition-colors hover:opacity-90"
              style={{
                backgroundColor: "#1A1A18",
                color: "#F5F0E8",
                borderRadius: "2px",
              }}
            >
              Shop Packaging
            </Link>
            <Link
              href="/for-business"
              className="inline-flex items-center px-8 py-3.5 text-sm font-medium tracking-wide transition-colors border hover:bg-[#1A1A18] hover:text-[#F5F0E8]"
              style={{
                borderColor: "#1A1A18",
                color: "#1A1A18",
                borderRadius: "2px",
              }}
            >
              For Business →
            </Link>
          </div>
        </div>

        <div
          className="relative aspect-[4/5] max-w-[520px] mx-auto md:mx-0 md:ml-auto w-full overflow-hidden"
          style={{
            borderRadius: "2px",
            boxShadow: "0 4px 20px rgba(28, 26, 23, 0.08)",
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {heroSlides.map((slide, i) => (
            <Image
              key={slide.code}
              src={slide.src}
              alt={slide.code}
              fill
              className={`object-cover transition-opacity duration-700 ${
                i === currentSlide ? "opacity-100" : "opacity-0"
              }`}
              sizes="(max-width: 768px) 100vw, 520px"
              priority={i === 0}
            />
          ))}
          <span
            className="absolute bottom-4 left-4 z-10 text-[10px] tracking-[0.08em] uppercase px-2 py-1"
            style={{
              color: "rgba(255,255,255,0.85)",
              backgroundColor: "rgba(28, 26, 23, 0.35)",
              fontFamily: "var(--font-body)",
              borderRadius: "2px",
            }}
          >
            {heroSlides[currentSlide].code}
          </span>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────── Segments Section ────────────────────── */

function SegmentsSection() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const cards = ref.current.querySelectorAll(".segment-card");
    gsap.from(cards, {
      y: 40,
      opacity: 0,
      duration: 0.8,
      stagger: 0.15,
      ease: "power2.out",
      scrollTrigger: { trigger: ref.current, start: "top 70%" },
    });
  }, []);

  return (
    <section
      ref={ref}
      className="py-20 md:py-28 px-4"
      style={{ backgroundColor: "#F5F0E8" }}
    >
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
        {segments.map((card, i) => (
          <div key={i} className="segment-card group">
            <div
              className="aspect-square overflow-hidden mb-5"
              style={{ border: "1px solid #B8B0A4", borderRadius: "2px" }}
            >
              <Image
                src={card.image}
                alt={card.title}
                width={600}
                height={600}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              />
            </div>
            <span className="label-caps block mb-3" style={{ color: "#B8B0A4" }}>
              product imagery
            </span>
            <h2
              className="text-3xl leading-tight mb-4 whitespace-pre-line"
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 300,
                color: "#1A1A18",
              }}
            >
              {card.title}
            </h2>
            <p className="text-sm mb-5" style={{ color: "#B8B0A4", lineHeight: 1.7 }}>
              {card.body}
            </p>
            <Link
              href={card.href}
              className="inline-flex items-center gap-1 text-sm font-medium transition-all duration-200 hover:gap-2"
              style={{ color: "#C4A882" }}
            >
              {card.cta}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ────────────────────── Featured Products ────────────────────── */

function FeaturedSection({ products }: { products: any[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const cards = ref.current.querySelectorAll(".product-fade");
    gsap.from(cards, {
      y: 30,
      opacity: 0,
      duration: 0.6,
      stagger: 0.1,
      ease: "power2.out",
      scrollTrigger: { trigger: ref.current, start: "top 70%" },
    });
  }, []);

  const updateArrows = () => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
  }, [products]);

  const scrollByCards = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>(".product-fade");
    const gap = 24;
    const amount = card ? (card.offsetWidth + gap) * 2 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  const arrowStyle = (enabled: boolean): CSSProperties => ({
    width: 44,
    height: 44,
    borderRadius: "50%",
    border: "1px solid rgba(184,169,154,0.5)",
    background: "#FFFFFF",
    color: "#1A1A18",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: enabled ? "pointer" : "not-allowed",
    opacity: enabled ? 1 : 0.35,
    transition: "opacity 0.2s ease",
  });

  return (
    <section ref={ref} className="py-20 md:py-28 px-4" style={{ backgroundColor: "#F5F0E8" }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-10">
          <h2
            className="text-4xl md:text-5xl"
            style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: "#1A1A18" }}
          >
            featured packaging
          </h2>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2">
              <button aria-label="Previous" onClick={() => scrollByCards(-1)} disabled={!canScrollLeft} style={arrowStyle(canScrollLeft)}>←</button>
              <button aria-label="Next" onClick={() => scrollByCards(1)} disabled={!canScrollRight} style={arrowStyle(canScrollRight)}>→</button>
            </div>
            <Link href="/shop" className="text-sm hover:opacity-70 transition-opacity" style={{ color: "#B8B0A4" }}>
              View all →
            </Link>
          </div>
        </div>
        {products.length > 0 ? (
          <div
            ref={trackRef}
            className="featured-carousel flex gap-6 overflow-x-auto pb-2"
            style={{ scrollSnapType: "x mandatory", scrollbarWidth: "none" }}
          >
            {products.map((p: any) => (
              <div
                key={p.slug}
                className="product-fade shrink-0"
                style={{ scrollSnapAlign: "start", width: "calc((100% - 18px) / 2)", maxWidth: 300 }}
              >
                <ProductCard {...p} />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-square animate-pulse" style={{ backgroundColor: "#E8DDD0", borderRadius: "2px" }} />
            ))}
          </div>
        )}
      </div>
      <style jsx>{`
        .featured-carousel::-webkit-scrollbar {
          display: none;
        }
        @media (min-width: 768px) {
          .featured-carousel > .product-fade {
            width: calc((100% - 72px) / 4) !important;
          }
        }
      `}</style>
    </section>
  );
}

/* ────────────────────── Horizontal Scroll Portfolio ────────────────────── */

function PortfolioSection() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const processRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    if (!wrapperRef.current || !processRef.current) return;
    const wrapper = wrapperRef.current;
    const process = processRef.current;
    const items = process.querySelectorAll<HTMLDivElement>(".portfolio-item");
    const inners = process.querySelectorAll<HTMLDivElement>(".portfolio-item__inner");

    const getMeasurements = () => ({
      wrapperWidth: wrapper.getBoundingClientRect().width,
      processWidth: process.getBoundingClientRect().width,
    });

    let measurements = getMeasurements();

    const setupAnimation = () => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: wrapper,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.4,
          invalidateOnRefresh: true,
        },
      });

      tl.to(process, {
        x: () => -(measurements.processWidth - measurements.wrapperWidth),
        ease: "power1.inOut",
      }, 0);

      timelineRef.current = tl;

      inners.forEach((inner, i) => {
        const rect = items[i].getBoundingClientRect();
        const isLeft = rect.left + rect.width / 2 < measurements.wrapperWidth / 2;
        const fromX = isLeft ? "-100%" : "100%";
        const rotateY = isLeft ? 60 : -60;

        gsap.from(inner, {
          x: fromX,
          rotateY: rotateY,
          opacity: 0.5,
          duration: 1,
          ease: "power2.inOut",
          scrollTrigger: {
            trigger: items[i],
            start: "left right",
            endTrigger: process,
            end: "left left",
            containerAnimation: tl,
            toggleActions: "play none none reverse",
          },
        });
      });
    };

    const images = process.querySelectorAll<HTMLImageElement>("img");
    let loaded = 0;
    const onImgLoad = () => {
      loaded++;
      if (loaded >= images.length) {
        measurements = getMeasurements();
        setupAnimation();
      }
    };

    images.forEach((img) => {
      if (img.complete) {
        loaded++;
      } else {
        img.addEventListener("load", onImgLoad);
      }
    });
    if (loaded >= images.length) {
      measurements = getMeasurements();
      setupAnimation();
    }

    const onResize = () => {
      measurements = getMeasurements();
      if (timelineRef.current) {
        timelineRef.current.scrollTrigger?.refresh();
      }
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      if (timelineRef.current) timelineRef.current.kill();
      ScrollTrigger.getAll().forEach((st) => {
        if (st.vars.containerAnimation === timelineRef.current) st.kill();
      });
    };
  }, []);

  return (
    <section className="portfolio-section">
      <div ref={wrapperRef} className="portfolio-wrapper">
        <div className="text-center mb-6 absolute top-6 left-0 right-0">
          <span className="label-caps" style={{ color: "#B8B0A4" }}>
            In production
          </span>
        </div>
        <div
          ref={processRef}
          className="portfolio-process"
          style={{ width: "300%", willChange: "transform" }}
        >
          {portfolioImages.map((img, i) => (
            <div
              key={i}
              className="portfolio-item"
              style={{ perspective: "1000px", transformStyle: "preserve-3d" }}
            >
              <div
                className="portfolio-item__inner"
                style={{ transformStyle: "preserve-3d", willChange: "transform" }}
              >
                <div className="portfolio-item__img">
                  <Image
                    src={img.src}
                    alt={img.alt}
                    width={420}
                    height={525}
                    className="w-full h-full object-cover object-center block"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────── Pricing Teaser ────────────────────── */

function PricingSection() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    gsap.from(ref.current.querySelectorAll(".pricing-fade"), {
      y: 30, opacity: 0, duration: 0.8, stagger: 0.1, ease: "power2.out",
      scrollTrigger: { trigger: ref.current, start: "top 75%" },
    });
  }, []);

  return (
    <section ref={ref} className="py-20 md:py-28 px-4" style={{ backgroundColor: "#E8DDD0" }}>
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="pricing-fade text-4xl md:text-5xl mb-6" style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: "#1A1A18" }}>
          the more you order, the less you pay.
        </h2>
        <p className="pricing-fade text-sm mb-8" style={{ color: "#B8B0A4", lineHeight: 1.7 }}>
          Our tiered pricing rewards volume. See how it works on any product page — adjust your quantity and watch the price update live.
        </p>
        <Link href="/shop" className="pricing-fade inline-flex items-center px-8 py-3.5 text-sm font-medium tracking-wide transition-opacity hover:opacity-90" style={{ backgroundColor: "#1A1A18", color: "#F5F0E8", borderRadius: "2px" }}>
          See pricing tiers →
        </Link>
      </div>
    </section>
  );
}

/* ────────────────────── Customisation CTA ────────────────────── */

function CustomisationSection() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const img = ref.current.querySelector(".custom-img-reveal");
    if (!img) return;
    gsap.from(img, {
      x: 60, opacity: 0, duration: 0.8, ease: "power2.out",
      scrollTrigger: { trigger: ref.current, start: "top 70%" },
    });
  }, []);

  return (
    <section ref={ref} className="py-20 md:py-28 px-4" style={{ backgroundColor: "#EDD8D2" }}>
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div>
          <h2 className="text-5xl md:text-6xl mb-6" style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: "#1A1A18" }}>
            make it yours.
          </h2>
          <p className="text-sm mb-8 max-w-md" style={{ color: "#B8B0A4", lineHeight: 1.7 }}>
            Add your logo with silk-screen or hot-stamp printing. Minimum 100 units. Delivered to your door from China in 4–6 weeks.
          </p>
          <Link href="/customise" className="inline-flex items-center px-8 py-3.5 text-sm font-medium tracking-wide border hover:bg-[#1A1A18] hover:text-[#F5F0E8] transition-colors" style={{ borderColor: "#1A1A18", color: "#1A1A18", borderRadius: "2px" }}>
            Explore Customisation →
          </Link>
        </div>
        <div className="custom-img-reveal" style={{ boxShadow: "0 4px 20px rgba(28, 26, 23, 0.08)", borderRadius: "2px" }}>
          <Image
            src="/images/lifestyle-3.jpg"
            alt="Custom branded packaging"
            width={800}
            height={600}
            className="w-full aspect-[4/3] object-cover"
            style={{ borderRadius: "2px" }}
          />
        </div>
      </div>
    </section>
  );
}

/* ────────────────────── B2B Strip ────────────────────── */

function BusinessCTA() {
  return (
    <section className="py-20 md:py-28 px-4" style={{ backgroundColor: "#1A1A18" }}>
      <div className="max-w-3xl mx-auto text-center">
        <p className="text-lg md:text-xl mb-8" style={{ color: "#F5F0E8", lineHeight: 1.8 }}>
          Running a hotel, spa, or salon? Set up recurring orders, get invoiced on net terms, and never think about reordering again.
        </p>
        <Link href="/for-business" className="inline-flex items-center px-8 py-3.5 text-sm font-medium tracking-wide transition-opacity hover:opacity-90" style={{ backgroundColor: "#D4A89A", color: "#1A1A18", borderRadius: "2px" }}>
          Open a Business Account →
        </Link>
      </div>
    </section>
  );
}

/* ────────────────────── Page ────────────────────── */

export default function HomeClient({ products }: { products: any[] }) {
  return (
    <>
      <HeroSection />
      <SegmentsSection />
      <FeaturedSection products={products} />
      <PortfolioSection />
      <PricingSection />
      <CustomisationSection />
      <BusinessCTA />
    </>
  );
}
