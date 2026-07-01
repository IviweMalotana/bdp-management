"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { getCart, updateCartItem, removeCartItem } from "@/lib/api";

function formatZAR(n: number) {
  return `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function CartDrawer() {
  const { items, drawerOpen, closeDrawer, openDrawer, setCart, getSessionToken, cartId } =
    useCartStore();
  const { jwt } = useAuthStore();

  // Hydrate cart from server once on mount so header count + drawer are correct.
  useEffect(() => {
    const token = getSessionToken();
    getCart(token, jwt ?? undefined)
      .then((data) => setCart(data as Parameters<typeof setCart>[0]))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jwt]);

  // Close on Esc
  useEffect(() => {
    if (!drawerOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeDrawer();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen, closeDrawer]);

  async function handleQty(itemId: number, qty: number) {
    if (qty < 1) return;
    const token = getSessionToken();
    try {
      const result = await updateCartItem(itemId, qty, token, jwt ?? undefined);
      setCart(result as Parameters<typeof setCart>[0]);
    } catch {}
  }

  async function handleRemove(itemId: number) {
    const token = getSessionToken();
    try {
      const result = await removeCartItem(itemId, token, jwt ?? undefined);
      setCart(result as Parameters<typeof setCart>[0]);
    } catch {}
  }

  const subtotal = items.reduce((s, i) => s + i.lineTotalZAR, 0);

  return (
    <div
      className={`fixed inset-0 z-[60] ${drawerOpen ? "" : "pointer-events-none"}`}
      aria-hidden={!drawerOpen}
    >
      {/* Backdrop */}
      <div
        onClick={closeDrawer}
        className="absolute inset-0 transition-opacity duration-300"
        style={{
          backgroundColor: "rgba(28,26,23,0.35)",
          opacity: drawerOpen ? 1 : 0,
        }}
      />

      {/* Panel */}
      <aside
        className="absolute top-0 right-0 h-full w-full max-w-md flex flex-col shadow-lg transition-transform duration-300"
        style={{
          backgroundColor: "#FAF8F5",
          transform: drawerOpen ? "translateX(0)" : "translateX(100%)",
        }}
        role="dialog"
        aria-label="Shopping cart"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b shrink-0"
          style={{ borderColor: "#C9B8A8" }}
        >
          <h2
            className="text-xl"
            style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: "#1C1A17" }}
          >
            your cart
          </h2>
          <button
            onClick={closeDrawer}
            aria-label="Close cart"
            className="w-9 h-9 flex items-center justify-center hover:opacity-70 transition-opacity"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1C1A17" strokeWidth="1.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="text-center pt-16">
              <p className="text-sm mb-6" style={{ color: "#9E8F83" }}>
                Your cart is empty.
              </p>
              <Link
                href="/shop"
                onClick={closeDrawer}
                className="inline-flex items-center px-6 py-3 text-sm font-medium"
                style={{ backgroundColor: "#1C1A17", color: "#FAF8F5", borderRadius: "2px" }}
              >
                Browse packaging →
              </Link>
            </div>
          ) : (
            <ul className="space-y-5">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex gap-3 pb-5 border-b"
                  style={{ borderColor: "#E2D8C9" }}
                >
                  <div
                    className="relative w-20 h-20 shrink-0 overflow-hidden"
                    style={{ backgroundColor: "#E8DDD0", borderRadius: "2px" }}
                  >
                    {item.variant.imageUrl && (
                      <Image
                        src={item.variant.imageUrl}
                        alt={item.variant.sku}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "#1C1A17" }}>
                      {item.productName ?? item.variant.size ?? item.variant.sku}
                    </p>
                    <p className="text-xs font-mono mb-1" style={{ color: "#C9B8A8" }}>
                      {item.variant.sku}
                    </p>
                    <p className="text-xs mb-2" style={{ color: "#9E8F83" }}>
                      {formatZAR(item.unitPriceZAR)} / unit
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <div
                        className="flex items-center border"
                        style={{ borderColor: "#C9B8A8", borderRadius: "2px" }}
                      >
                        <button
                          onClick={() => handleQty(item.id, item.quantity - 1)}
                          className="w-8 h-8 flex items-center justify-center text-base hover:opacity-70"
                          style={{ color: "#1C1A17" }}
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span className="w-10 text-center text-sm" style={{ color: "#1C1A17" }}>
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleQty(item.id, item.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center text-base hover:opacity-70"
                          style={{ color: "#1C1A17" }}
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-sm font-medium" style={{ color: "#1C1A17" }}>
                        {formatZAR(item.lineTotalZAR)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemove(item.id)}
                      className="text-xs mt-2 hover:opacity-70 transition-opacity"
                      style={{ color: "#9E8F83", textDecoration: "underline" }}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t px-5 py-4 shrink-0" style={{ borderColor: "#C9B8A8" }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs uppercase tracking-widest" style={{ color: "#4A4540" }}>
                Subtotal
              </span>
              <span
                className="text-2xl"
                style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: "#1C1A17" }}
              >
                {formatZAR(subtotal)}
              </span>
            </div>
            <div className="flex gap-3">
              <Link
                href="/cart"
                onClick={closeDrawer}
                className="flex-1 text-center py-3 text-sm font-medium border transition-colors"
                style={{ borderColor: "#1C1A17", color: "#1C1A17", borderRadius: "2px" }}
              >
                View cart
              </Link>
              <Link
                href="/checkout"
                onClick={closeDrawer}
                className="flex-1 text-center py-3 text-sm font-medium transition-opacity hover:opacity-90"
                style={{ backgroundColor: "#1C1A17", color: "#FAF8F5", borderRadius: "2px" }}
              >
                Checkout
              </Link>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
