"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { getOrderById } from "@/lib/api";

interface OrderItem {
  id: number;
  productName: string;
  variantSku: string;
  quantity: number;
  unitPriceZAR: number;
  lineTotal: number;
}

interface OrderDetail {
  id: number;
  orderNumber: string;
  status: string;
  fulfilmentStatus: string;
  subtotalZAR: number;
  shippingCostZAR: number;
  totalZAR: number;
  isPaid: boolean;
  createdAt: string;
  items: OrderItem[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

function formatZAR(amount: number) {
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(amount);
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const jwt = useAuthStore((s) => s.jwt);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!jwt || !id) return;
    getOrderById(jwt, Number(id))
      .then((data) => setOrder(data as OrderDetail))
      .catch((err: unknown) => {
        if (err instanceof Error && err.message.includes("404")) setNotFound(true);
        else console.error(err);
      })
      .finally(() => setLoading(false));
  }, [jwt, id]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <p className="text-sm" style={{ color: "#4A4540" }}>Loading…</p>
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <p className="text-sm" style={{ color: "#4A4540" }}>Order not found.</p>
        <Link href="/account/orders" className="text-sm underline mt-4 block" style={{ color: "#4A4540" }}>
          Back to orders
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12" style={{ minHeight: "80vh" }}>
      <div className="flex items-center gap-4 mb-8">
        <Link href="/account/orders" className="text-sm underline" style={{ color: "#4A4540" }}>
          ← Orders
        </Link>
        <h1 className="text-3xl" style={{ fontFamily: "var(--font-display)", color: "#1C1A17" }}>
          Order #{order.orderNumber}
        </h1>
      </div>

      {/* Order header */}
      <div
        className="p-4 mb-6 border"
        style={{ borderColor: "#C9B8A8", borderRadius: "2px", backgroundColor: "#FEFCFA" }}
      >
        <div className="flex flex-wrap gap-4 text-sm">
          <div>
            <span className="text-xs uppercase tracking-widest" style={{ color: "#4A4540" }}>Date</span>
            <p style={{ color: "#1C1A17" }}>{formatDate(order.createdAt)}</p>
          </div>
          <div>
            <span className="text-xs uppercase tracking-widest" style={{ color: "#4A4540" }}>Status</span>
            <p className="uppercase" style={{ color: "#1C1A17" }}>{order.status}</p>
          </div>
          <div>
            <span className="text-xs uppercase tracking-widest" style={{ color: "#4A4540" }}>Fulfilment</span>
            <p className="uppercase" style={{ color: "#1C1A17" }}>{order.fulfilmentStatus}</p>
          </div>
          <div>
            <span className="text-xs uppercase tracking-widest" style={{ color: "#4A4540" }}>Payment</span>
            <p style={{ color: "#1C1A17" }}>{order.isPaid ? "Paid" : "Unpaid"}</p>
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className="mb-6">
        <h2 className="text-lg mb-3" style={{ fontFamily: "var(--font-display)", color: "#1C1A17" }}>Items</h2>
        <div className="border" style={{ borderColor: "#C9B8A8", borderRadius: "2px", backgroundColor: "#FEFCFA" }}>
          {order.items.map((item, idx) => (
            <div
              key={item.id}
              className="flex items-center justify-between px-4 py-3"
              style={{
                borderBottom: idx < order.items.length - 1 ? `1px solid #C9B8A8` : undefined,
              }}
            >
              <div>
                <p className="text-sm font-medium" style={{ color: "#1C1A17" }}>{item.productName}</p>
                <p className="text-xs mt-0.5" style={{ color: "#4A4540" }}>SKU: {item.variantSku} · Qty: {item.quantity}</p>
              </div>
              <div className="text-right">
                <p className="text-sm" style={{ color: "#1C1A17" }}>{formatZAR(item.lineTotal)}</p>
                <p className="text-xs" style={{ color: "#4A4540" }}>{formatZAR(item.unitPriceZAR)} each</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div
        className="p-4 space-y-2 border"
        style={{ borderColor: "#C9B8A8", borderRadius: "2px", backgroundColor: "#FEFCFA" }}
      >
        <div className="flex justify-between text-sm" style={{ color: "#4A4540" }}>
          <span>Subtotal</span>
          <span>{formatZAR(order.subtotalZAR)}</span>
        </div>
        <div className="flex justify-between text-sm" style={{ color: "#4A4540" }}>
          <span>Shipping</span>
          <span>{formatZAR(order.shippingCostZAR)}</span>
        </div>
        <div
          className="flex justify-between text-sm font-medium pt-2"
          style={{ color: "#1C1A17", borderTop: "1px solid #C9B8A8", marginTop: "8px", paddingTop: "8px" }}
        >
          <span>Total</span>
          <span>{formatZAR(order.totalZAR)}</span>
        </div>
      </div>
    </div>
  );
}
