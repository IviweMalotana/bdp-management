"use client";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { useCurrencyStore } from "@/store/currencyStore";

interface Collection {
  id: number;
  name: string;
  slug: string;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5252";

export default function Header() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const shopRef = useRef<HTMLDivElement>(null);
  const items = useCartStore((s) => s.items);
  const itemCount = items.reduce((n, i) => n + i.quantity, 0);
  const { jwt, firstName } = useAuthStore();

  useEffect(() => {
    fetch(`${API}/api/storefront/collections`)
      .then((r) => r.json())
      .then((data: Collection[]) => setCollections(data))
      .catch(() => {});
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (shopRef.current && !shopRef.current.contains(e.target as Node)) {
        setShopOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const staticNavLinks = [
    { href: "/customise", label: "Customise" },
    { href: "/for-business", label: "For Business" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ];

  const accountHref = jwt ? "/account" : "/auth/login";
  const accountLabel = jwt && firstName ? firstName : "Account";

  return (
    <header
      className="sticky top-0 z-50"
      style={{
        backgroundColor: "rgba(245, 240, 232, 0.85)",
        borderBottom: "0.67px solid rgba(184, 169, 154, 0.2)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between gap-4" style={{ height: "72px" }}>
        {/* Logo */}
        <Link
          href="/"
          style={{ fontFamily: '"Playfair Display", Georgia, serif', color: "#1A1A18", fontSize: "24px", fontWeight: 500, letterSpacing: "2.4px", textDecoration: "none" }}
        >
          BDP
        </Link>

        {/* Nav — desktop */}
        <nav className="hidden md:flex items-center gap-8">
          {/* Shop dropdown */}
          <div ref={shopRef} className="relative">
            <button
              onClick={() => setShopOpen((v) => !v)}
              className="flex items-center gap-1 hover:opacity-70 transition-opacity"
              style={{ color: "#1A1A18", fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 500, letterSpacing: "0.35px" }}
            >
              Shop
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                style={{ transform: shopOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}
              >
                <polyline points="1,3 5,7 9,3" />
              </svg>
            </button>

            {shopOpen && (
              <div
                className="absolute top-full left-0 mt-2 w-52 py-2 z-50 shadow-lg"
                style={{ backgroundColor: "#FAF8F5", border: "1px solid #C9B8A8", borderRadius: "2px" }}
              >
                <Link
                  href="/shop"
                  onClick={() => setShopOpen(false)}
                  className="block px-4 py-2 text-sm hover:bg-[#E8DDD0] transition-colors"
                  style={{ color: "#1C1A17" }}
                >
                  All Packaging
                </Link>
                {collections.length > 0 && (
                  <>
                    <div className="my-1.5 border-t" style={{ borderColor: "#C9B8A8" }} />
                    {collections.map((c) => (
                      <Link
                        key={c.id}
                        href={`/collections/${c.slug}`}
                        onClick={() => setShopOpen(false)}
                        className="block px-4 py-2 text-sm hover:bg-[#E8DDD0] transition-colors"
                        style={{ color: "#1C1A17" }}
                      >
                        {c.name}
                      </Link>
                    ))}
                    <div className="my-1.5 border-t" style={{ borderColor: "#C9B8A8" }} />
                  </>
                )}
                <Link
                  href="/collections"
                  onClick={() => setShopOpen(false)}
                  className="block px-4 py-2 text-sm hover:bg-[#E8DDD0] transition-colors"
                  style={{ color: "#4A4540" }}
                >
                  All Collections →
                </Link>
              </div>
            )}
          </div>

          {staticNavLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="hover:opacity-70 transition-opacity"
              style={{ color: "#1A1A18", fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 500, letterSpacing: "0.35px", textDecoration: "none" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Right icons */}
        <div className="flex items-center gap-4">
          {/* Currency selector hidden from nav per design spec */}
          <Link href={accountHref} className="hidden md:block text-sm" style={{ color: "#4A4540" }}>
            {accountLabel}
          </Link>
          <Link href="/cart" className="relative" aria-label="Cart">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1C1A17" strokeWidth="1.5">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 01-8 0" />
            </svg>
            {itemCount > 0 && (
              <span
                className="absolute -top-1.5 -right-1.5 text-xs w-4 h-4 flex items-center justify-center rounded-full"
                style={{ backgroundColor: "#1C1A17", color: "#FAF8F5", fontSize: "10px" }}
              >
                {itemCount}
              </span>
            )}
          </Link>
          {/* Hamburger — mobile */}
          <button
            className="md:hidden"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1C1A17" strokeWidth="1.5">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerOpen(false)} />
          <div
            className="relative ml-auto h-full w-72 flex flex-col p-8 gap-6 z-10"
            style={{ backgroundColor: "#FAF8F5" }}
          >
            <button
              className="self-end mb-4"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1C1A17" strokeWidth="1.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <Link
              href="/shop"
              className="text-lg font-medium"
              style={{ color: "#1C1A17" }}
              onClick={() => setDrawerOpen(false)}
            >
              Shop
            </Link>
            {collections.length > 0 && (
              <div className="pl-4 space-y-2 border-l" style={{ borderColor: "#C9B8A8" }}>
                {collections.map((c) => (
                  <Link
                    key={c.id}
                    href={`/collections/${c.slug}`}
                    className="block text-sm"
                    style={{ color: "#4A4540" }}
                    onClick={() => setDrawerOpen(false)}
                  >
                    {c.name}
                  </Link>
                ))}
                <Link
                  href="/collections"
                  className="block text-sm"
                  style={{ color: "#4A4540" }}
                  onClick={() => setDrawerOpen(false)}
                >
                  All Collections →
                </Link>
              </div>
            )}
            {staticNavLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-lg font-medium"
                style={{ color: "#1C1A17" }}
                onClick={() => setDrawerOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <Link
              href={accountHref}
              className="text-base mt-4"
              style={{ color: "#4A4540" }}
              onClick={() => setDrawerOpen(false)}
            >
              {accountLabel}
            </Link>
            <MobileCurrencyPills onClose={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}
    </header>
  );
}

// ── Currency selector (desktop dropdown) ────────────────────────────────────

function CurrencySelector() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { currencies, selected, setSelected } = useCurrencyStore();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!currencies.length) return null;

  const display = selected ?? currencies.find((c) => c.code === "ZAR") ?? currencies[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-sm hover:opacity-70 transition-opacity"
        style={{ color: "#1C1A17" }}
      >
        <span>{display.flag}</span>
        <span>{display.code}</span>
        <span className="text-xs" style={{ color: "#C9B8A8" }}>▾</span>
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-50 min-w-40 border shadow-sm"
          style={{ backgroundColor: "#FAF8F5", borderColor: "#C9B8A8", borderRadius: "2px" }}
        >
          {currencies.map((c) => (
            <button
              key={c.code}
              onClick={() => { setSelected(c); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:opacity-70 transition-opacity"
              style={{
                backgroundColor: selected?.code === c.code ? "#E8DDD0" : "transparent",
                color: "#1C1A17",
              }}
            >
              <span>{c.flag}</span>
              <span className="font-medium">{c.code}</span>
              <span className="text-xs ml-auto" style={{ color: "#C9B8A8" }}>{c.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Currency pills (mobile drawer) ──────────────────────────────────────────

function MobileCurrencyPills({ onClose }: { onClose: () => void }) {
  const { currencies, selected, setSelected } = useCurrencyStore();
  if (!currencies.length) return null;

  return (
    <div className="mt-4">
      <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "#C9B8A8" }}>Currency</p>
      <div className="flex flex-wrap gap-2">
        {currencies.map((c) => (
          <button
            key={c.code}
            onClick={() => { setSelected(c); onClose(); }}
            className="flex items-center gap-1 px-3 py-1.5 text-sm border transition-colors"
            style={{
              borderColor: selected?.code === c.code ? "#1C1A17" : "#C9B8A8",
              backgroundColor: selected?.code === c.code ? "#E8DDD0" : "transparent",
              color: "#1C1A17",
              borderRadius: "2px",
            }}
          >
            <span>{c.flag}</span>
            <span>{c.code}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
