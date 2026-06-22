"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5252";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    fetch(`${API}/api/storefront/categories`)
      .then((r) => r.json())
      .then((data: { category: string }[]) => {
        if (Array.isArray(data)) setCategories(data.slice(0, 5).map((c) => c.category));
      })
      .catch(() => {});
  }, []);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail("");
    }
  };

  return (
    <footer
      className="border-t"
      style={{ backgroundColor: "#FAF8F5", borderColor: "#C9B8A8" }}
    >
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Newsletter */}
          <div className="lg:col-span-1">
            <h3
              className="text-2xl mb-4"
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 300,
                color: "#1C1A17",
              }}
            >
              Join our newsletter
              <br />
              for restocks &amp; new arrivals
            </h3>
            {subscribed ? (
              <p className="text-sm mt-4" style={{ color: "#9E8F83" }}>
                Thank you for subscribing.
              </p>
            ) : (
              <form onSubmit={handleSubscribe} className="flex mt-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="flex-1 text-sm px-4 py-3 border outline-none focus:border-[#9E8F83] transition-colors"
                  style={{
                    backgroundColor: "#FAF8F5",
                    borderColor: "#C9B8A8",
                    borderRadius: "2px 0 0 2px",
                    color: "#1C1A17",
                  }}
                  required
                />
                <button
                  type="submit"
                  className="text-sm font-medium px-5 py-3 transition-opacity hover:opacity-90"
                  style={{
                    backgroundColor: "#1C1A17",
                    color: "#FAF8F5",
                    borderRadius: "0 2px 2px 0",
                  }}
                >
                  Subscribe
                </button>
              </form>
            )}
          </div>

          {/* Shop */}
          <div>
            <h3
              className="text-xs uppercase tracking-widest mb-4"
              style={{ color: "#4A4540", fontFamily: "var(--font-body)" }}
            >
              Shop
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/shop"
                  className="text-sm hover:opacity-70 transition-opacity"
                  style={{ color: "#1C1A17" }}
                >
                  All packaging
                </Link>
              </li>
              {categories.map((cat) => (
                <li key={cat}>
                  <Link
                    href={`/shop?category=${encodeURIComponent(cat)}`}
                    className="text-sm hover:opacity-70 transition-opacity"
                    style={{ color: "#1C1A17" }}
                  >
                    {cat}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* For Business */}
          <div>
            <h3
              className="text-xs uppercase tracking-widest mb-4"
              style={{ color: "#4A4540", fontFamily: "var(--font-body)" }}
            >
              For Business
            </h3>
            <ul className="space-y-2">
              {[
                ["Hotels & spas", "/for-business"],
                ["Skincare brands", "/for-business#brands"],
                ["Open a trade account", "/for-business#register"],
                ["Customisation", "/customise"],
              ].map(([label, href]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm hover:opacity-70 transition-opacity"
                    style={{ color: "#1C1A17" }}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3
              className="text-xs uppercase tracking-widest mb-4"
              style={{ color: "#4A4540", fontFamily: "var(--font-body)" }}
            >
              Company
            </h3>
            <ul className="space-y-2">
              {[
                ["About", "/about"],
                ["Contact", "/contact"],
                ["Shipping info", "/shipping"],
                ["Returns", "/returns"],
              ].map(([label, href]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm hover:opacity-70 transition-opacity"
                    style={{ color: "#1C1A17" }}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div
          className="border-t pt-6 text-xs"
          style={{ borderColor: "#C9B8A8", color: "#4A4540" }}
        >
          &copy; 2025 be different packaging. South Africa.
        </div>
      </div>
    </footer>
  );
}
