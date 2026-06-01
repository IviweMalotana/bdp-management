"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { getOrders } from "@/lib/api";

interface Order {
  id: number;
  orderNumber: string;
  status: string;
  totalZAR: number;
  createdAt: string;
  itemCount: number;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

function formatZAR(amount: number) {
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(amount);
}

const statusColour: Record<string, string> = {
  Placed:                   "#EDE4D8",
  Processing:               "#EDE4D8",
  "Customisation Accepted": "#D8D0E8",
  "Ready to Ship":          "#D8E4EE",
  Shipped:                  "#D4A89A",
  Delivered:                "#1C1A17",
  Cancelled:                "#4A4540",
  // legacy
  Pending:                  "#C9B8A8",
  Confirmed:                "#D8E4EE",
};

export default function OrdersPage() {
  const jwt = useAuthStore((s) => s.jwt);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!jwt) return;
    getOrders(jwt)
      .then((data) => setOrders(data as Order[]))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [jwt]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-12" style={{ minHeight: "80vh" }}>
      <div className="flex items-center gap-4 mb-8">
        <Link href="/account" className="text-sm underline" style={{ color: "#4A4540" }}>
          ← Account
        </Link>
        <h1 className="text-3xl" style={{ fontFamily: "var(--font-display)", color: "#1C1A17" }}>
          Orders
        </h1>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: "#4A4540" }}>Loading…</p>
      ) : orders.length === 0 ? (
        <p className="text-sm" style={{ color: "#4A4540" }}>You have no orders yet.</p>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                href={`/account/orders/${o.id}`}
                className="flex items-center justify-between p-4 border hover:opacity-80 transition-opacity"
                style={{ borderColor: "#C9B8A8", borderRadius: "2px", backgroundColor: "#FEFCFA" }}
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: "#1C1A17" }}>#{o.orderNumber}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#4A4540" }}>
                    {formatDate(o.createdAt)} · {o.itemCount} item{o.itemCount !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <p className="text-sm" style={{ color: "#1C1A17" }}>{formatZAR(o.totalZAR)}</p>
                  <span
                    className="text-xs px-2 py-0.5 uppercase tracking-wide"
                    style={{
                      backgroundColor: statusColour[o.status] ?? "#EDE4D8",
                      color: o.status === "Delivered" ? "#F5EFE6" : "#1C1A17",
                      borderRadius: "2px",
                    }}
                  >
                    {o.status}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
