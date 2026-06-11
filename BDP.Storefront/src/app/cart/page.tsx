"use client";
import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { getCart, updateCartItem, removeCartItem } from "@/lib/api";
import QuantityInput from "../components/QuantityInput";
import ArtworkUpload from "../components/ArtworkUpload";

function formatZAR(n: number) {
  return `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function CartPage() {
  const { items, setCart, clearCart, getSessionToken, cartId } = useCartStore();
  const { jwt } = useAuthStore();

  useEffect(() => {
    const token = getSessionToken();
    getCart(token, jwt ?? undefined)
      .then((data) => setCart(data as Parameters<typeof setCart>[0]))
      .catch(() => {});
  }, []);

  const subtotal = items.reduce((s, i) => s + i.lineTotalZAR, 0);

  async function handleUpdateQty(itemId: number, qty: number) {
    const token = getSessionToken();
    const result = await updateCartItem(itemId, qty, token, jwt ?? undefined);
    setCart(result as Parameters<typeof setCart>[0]);
  }

  async function handleRemove(itemId: number) {
    const token = getSessionToken();
    const result = await removeCartItem(itemId, token, jwt ?? undefined);
    setCart(result as Parameters<typeof setCart>[0]);
  }

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <h1
          className="text-4xl mb-6"
          style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: "#1C1A17" }}
        >
          your cart is empty.
        </h1>
        <Link
          href="/shop"
          className="inline-flex items-center px-8 py-3.5 text-sm font-medium"
          style={{ backgroundColor: "#1C1A17", color: "#FAF8F5", borderRadius: "2px" }}
        >
          Browse packaging →
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 md:py-16">
      <h1
        className="text-4xl mb-6 md:mb-10"
        style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: "#1C1A17" }}
      >
        your cart
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
        {/* Line items */}
        <div className="md:col-span-2 space-y-6">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex gap-4 pb-6 border-b"
              style={{ borderColor: "#C9B8A8" }}
            >
              <div
                className="relative w-24 h-24 shrink-0 overflow-hidden"
                style={{ backgroundColor: "#E8DDD0", borderRadius: "2px" }}
              >
                {item.variant?.imageUrl ? (
                  <Image
                    src={item.variant.imageUrl}
                    alt={item.variant.sku}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-xs" style={{ color: "#C9B8A8" }}>
                    {item.variant?.size ?? "—"}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium mb-0.5" style={{ color: "#1C1A17" }}>
                  {item.variant?.sku}
                </p>
                <p className="text-xs mb-1" style={{ color: "#4A4540" }}>
                  {[item.variant?.size, item.variant?.bottleColour, item.variant?.texture].filter(Boolean).join(" · ")}
                </p>
                <p className="text-xs mb-3" style={{ color: "#C9B8A8" }}>
                  {formatZAR(item.unitPriceZAR)} per unit
                </p>
                <QuantityInput
                  value={item.quantity}
                  min={1}
                  onChange={(qty) => handleUpdateQty(item.id, qty)}
                />
                <ArtworkUpload
                  cartItemId={item.id}
                  sessionToken={getSessionToken()}
                  jwt={jwt ?? undefined}
                />
              </div>
              <div className="flex flex-col items-end justify-between">
                <p className="text-sm font-medium" style={{ color: "#1C1A17" }}>
                  {formatZAR(item.lineTotalZAR)}
                </p>
                <button
                  onClick={() => handleRemove(item.id)}
                  className="text-xs hover:opacity-70"
                  style={{ color: "#C9B8A8" }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div
          className="p-6 h-fit border"
          style={{ backgroundColor: "#E8DDD0", borderColor: "#C9B8A8", borderRadius: "2px" }}
        >
          <h2 className="text-sm uppercase tracking-widest mb-4" style={{ color: "#4A4540" }}>Order summary</h2>
          <div className="space-y-2 mb-4 text-sm" style={{ color: "#1C1A17" }}>
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatZAR(subtotal)}</span>
            </div>
            <div className="flex justify-between" style={{ color: "#C9B8A8" }}>
              <span>Shipping</span>
              <span>Calculated at checkout</span>
            </div>
          </div>
          <div className="border-t pt-4 mb-6 flex justify-between font-medium" style={{ borderColor: "#C9B8A8", color: "#1C1A17" }}>
            <span>Estimated total</span>
            <span>{formatZAR(subtotal)}</span>
          </div>
          <Link
            href="/checkout"
            className="block text-center w-full py-3.5 text-sm font-medium"
            style={{ backgroundColor: "#1C1A17", color: "#FAF8F5", borderRadius: "2px" }}
          >
            Proceed to checkout →
          </Link>
        </div>
      </div>
    </div>
  );
}
