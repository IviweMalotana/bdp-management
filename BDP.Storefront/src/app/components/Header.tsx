"use client";
import Link from "next/link";
import { useState } from "react";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";

export default function Header() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const items = useCartStore((s) => s.items);
  const itemCount = items.reduce((n, i) => n + i.quantity, 0);
  const { jwt, firstName } = useAuthStore();

  const navLinks = [
    { href: "/shop", label: "Shop" },
    { href: "/collections", label: "Collections" },
    { href: "/customise", label: "Customise" },
    { href: "/for-business", label: "For Business" },
  ];

  const accountHref = jwt ? "/account" : "/auth/login";
  const accountLabel = jwt && firstName ? firstName : "Account";

  return (
    <header
      className="sticky top-0 z-50 border-b"
      style={{
        backgroundColor: "rgba(245,239,230,0.95)",
        borderColor: "#C9B8A8",
        backdropFilter: "blur(4px)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link
          href="/"
          className="text-2xl tracking-widest uppercase"
          style={{ fontFamily: "var(--font-display)", color: "#1C1A17", letterSpacing: "0.2em" }}
        >
          BDP
        </Link>

        {/* Nav — desktop */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium tracking-wide hover:opacity-70 transition-opacity"
              style={{ color: "#1C1A17", fontFamily: "var(--font-body)" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Right icons */}
        <div className="flex items-center gap-4">
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
                style={{ backgroundColor: "#1C1A17", color: "#F5EFE6", fontSize: "10px" }}
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
            style={{ backgroundColor: "#F5EFE6" }}
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
            {navLinks.map((l) => (
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
          </div>
        </div>
      )}
    </header>
  );
}
