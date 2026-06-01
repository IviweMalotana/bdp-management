"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { getOrderById } from "@/lib/api";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5252";

interface OrderItem {
  id: number;
  productName: string;
  variantSku: string;
  quantity: number;
  unitPriceZAR: number;
  lineTotal: number;
}

interface TrackingEvent {
  time: string;
  description: string;
  location: string;
}

interface TrackingInfo {
  trackingNumber: string | null;
  carrier: string | null;
  events: TrackingEvent[];
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
  paidAt: string | null;
  createdAt: string;
  shippedDate: string | null;
  deliveredDate: string | null;
  shippingServiceCode: string | null;
  shippingServiceName: string | null;
  trackingNumber: string | null;
  trackingCarrier: string | null;
  shippingAddressJson: string | null;
  items: OrderItem[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

function formatZAR(amount: number) {
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(amount);
}

function StatusBadge({ label }: { label: string }) {
  const lower = label.toLowerCase();
  const bg =
    lower === "delivered" || lower === "approved" || lower === "paid"
      ? "#E8F5E9"
      : lower === "shipped" || lower === "ready to ship"
      ? "#FFF3E0"
      : lower === "customisation accepted"
      ? "#F3E8FF"
      : lower === "processing" || lower === "placed"
      ? "#EDE4D8"
      : "#F5EFE6";
  const color =
    lower === "delivered" || lower === "approved" || lower === "paid"
      ? "#2E7D32"
      : lower === "shipped" || lower === "ready to ship"
      ? "#E65100"
      : lower === "customisation accepted"
      ? "#6B21A8"
      : lower === "processing" || lower === "placed"
      ? "#4A4540"
      : "#4A4540";

  return (
    <span
      className="text-xs uppercase tracking-widest px-2 py-0.5"
      style={{ background: bg, color, borderRadius: "2px" }}
    >
      {label}
    </span>
  );
}

function TrackingTimeline({ events }: { events: TrackingEvent[] }) {
  if (!events.length) {
    return (
      <p className="text-sm" style={{ color: "#4A4540" }}>
        No tracking updates available yet. Check back soon.
      </p>
    );
  }

  return (
    <ol className="relative border-l" style={{ borderColor: "#C9B8A8", marginLeft: "8px" }}>
      {events.map((ev, idx) => (
        <li key={idx} className="mb-6 ml-6">
          {/* dot */}
          <span
            className="absolute flex items-center justify-center w-3 h-3 rounded-full -left-1.5"
            style={{ background: idx === 0 ? "#D4A89A" : "#C9B8A8", top: idx === 0 ? "0" : undefined }}
          />
          <p className="text-sm font-medium" style={{ color: "#1C1A17" }}>
            {ev.description}
          </p>
          {ev.location && (
            <p className="text-xs mt-0.5" style={{ color: "#4A4540" }}>
              {ev.location}
            </p>
          )}
          <time className="text-xs" style={{ color: "#9E8F83" }}>
            {ev.time}
          </time>
        </li>
      ))}
    </ol>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const jwt = useAuthStore((s) => s.jwt);

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [tracking, setTracking] = useState<TrackingInfo | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingExpanded, setTrackingExpanded] = useState(false);

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

  async function loadTracking() {
    if (!jwt || !id || trackingLoading) return;
    setTrackingLoading(true);
    try {
      const res = await fetch(`${BASE}/api/storefront/me/orders/${id}/tracking`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (res.ok) setTracking(await res.json());
    } finally {
      setTrackingLoading(false);
    }
  }

  function toggleTracking() {
    if (!trackingExpanded && !tracking) loadTracking();
    setTrackingExpanded((v) => !v);
  }

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

  const shippingAddress = (() => {
    try { return order.shippingAddressJson ? JSON.parse(order.shippingAddressJson) : null; }
    catch { return null; }
  })();

  const hasTracking = !!order.trackingNumber;
  const isShipped = ["shipped", "delivered"].includes(order.fulfilmentStatus.toLowerCase());

  return (
    <div className="max-w-2xl mx-auto px-4 py-12" style={{ minHeight: "80vh" }}>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/account/orders" className="text-sm underline" style={{ color: "#4A4540" }}>
          ← Orders
        </Link>
        <h1 className="text-3xl" style={{ fontFamily: "var(--font-display)", color: "#1C1A17" }}>
          Order #{order.orderNumber}
        </h1>
      </div>

      {/* Status row */}
      <div
        className="p-4 mb-6 border"
        style={{ borderColor: "#C9B8A8", borderRadius: "2px", backgroundColor: "#FEFCFA" }}
      >
        <div className="flex flex-wrap gap-4 text-sm">
          <div>
            <span className="text-xs uppercase tracking-widest block mb-1" style={{ color: "#4A4540" }}>Placed</span>
            <p style={{ color: "#1C1A17" }}>{formatDate(order.createdAt)}</p>
          </div>
          <div>
            <span className="text-xs uppercase tracking-widest block mb-1" style={{ color: "#4A4540" }}>Payment</span>
            <StatusBadge label={order.isPaid ? "Paid" : "Unpaid"} />
          </div>
          <div>
            <span className="text-xs uppercase tracking-widest block mb-1" style={{ color: "#4A4540" }}>Fulfilment</span>
            <StatusBadge label={order.fulfilmentStatus} />
          </div>
          {order.shippedDate && (
            <div>
              <span className="text-xs uppercase tracking-widest block mb-1" style={{ color: "#4A4540" }}>Shipped</span>
              <p style={{ color: "#1C1A17" }}>{formatDate(order.shippedDate)}</p>
            </div>
          )}
          {order.deliveredDate && (
            <div>
              <span className="text-xs uppercase tracking-widest block mb-1" style={{ color: "#4A4540" }}>Delivered</span>
              <p style={{ color: "#1C1A17" }}>{formatDate(order.deliveredDate)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Shipping service + tracking */}
      {(order.shippingServiceName || isShipped || hasTracking) && (
        <div
          className="p-4 mb-6 border"
          style={{ borderColor: "#C9B8A8", borderRadius: "2px", backgroundColor: "#FEFCFA" }}
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              {order.shippingServiceName && (
                <p className="text-sm font-medium" style={{ color: "#1C1A17" }}>
                  {order.trackingCarrier ?? "YunExpress"} — {order.shippingServiceName}
                </p>
              )}
              {order.trackingNumber ? (
                <p className="text-xs mt-1" style={{ color: "#4A4540" }}>
                  Tracking:{" "}
                  <span className="font-mono" style={{ color: "#1C1A17" }}>
                    {order.trackingNumber}
                  </span>
                </p>
              ) : isShipped ? (
                <p className="text-xs mt-1" style={{ color: "#4A4540" }}>
                  Tracking number will appear here once assigned
                </p>
              ) : (
                <p className="text-xs mt-1" style={{ color: "#4A4540" }}>
                  Your order is being prepared
                </p>
              )}
            </div>

            {hasTracking && (
              <div className="flex gap-3 items-center flex-shrink-0">
                {/* External AfterShip tracker */}
                <a
                  href={`https://www.aftership.com/track/yunexpress/${order.trackingNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs underline"
                  style={{ color: "#4A4540" }}
                >
                  Track on AfterShip ↗
                </a>
                <button
                  onClick={toggleTracking}
                  className="text-xs underline"
                  style={{ color: "#4A4540" }}
                >
                  {trackingExpanded ? "Hide updates" : "Show updates"}
                </button>
              </div>
            )}
          </div>

          {/* Tracking timeline */}
          {hasTracking && trackingExpanded && (
            <div className="mt-4 pt-4" style={{ borderTop: "1px solid #C9B8A8" }}>
              <h3 className="text-sm font-medium mb-4" style={{ color: "#1C1A17" }}>
                Tracking history
              </h3>
              {trackingLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="animate-pulse">
                      <div className="h-3 rounded w-2/3 mb-1" style={{ background: "#E8E0D8" }} />
                      <div className="h-2.5 rounded w-1/3" style={{ background: "#EDE7DE" }} />
                    </div>
                  ))}
                </div>
              ) : tracking ? (
                <TrackingTimeline events={tracking.events} />
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* Shipping address */}
      {shippingAddress && (
        <div
          className="p-4 mb-6 border"
          style={{ borderColor: "#C9B8A8", borderRadius: "2px", backgroundColor: "#FEFCFA" }}
        >
          <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "#4A4540" }}>Delivery address</p>
          <p className="text-sm" style={{ color: "#1C1A17" }}>{shippingAddress.recipientName}</p>
          <p className="text-sm" style={{ color: "#4A4540" }}>{shippingAddress.line1}</p>
          {shippingAddress.line2 && <p className="text-sm" style={{ color: "#4A4540" }}>{shippingAddress.line2}</p>}
          <p className="text-sm" style={{ color: "#4A4540" }}>
            {shippingAddress.city}, {shippingAddress.province} {shippingAddress.postalCode}
          </p>
          <p className="text-sm" style={{ color: "#4A4540" }}>{shippingAddress.country}</p>
        </div>
      )}

      {/* Line items */}
      <div className="mb-6">
        <h2 className="text-lg mb-3" style={{ fontFamily: "var(--font-display)", color: "#1C1A17" }}>Items</h2>
        <div className="border" style={{ borderColor: "#C9B8A8", borderRadius: "2px", backgroundColor: "#FEFCFA" }}>
          {order.items.map((item, idx) => (
            <div
              key={item.id}
              className="flex items-center justify-between px-4 py-3"
              style={{
                borderBottom: idx < order.items.length - 1 ? "1px solid #C9B8A8" : undefined,
              }}
            >
              <div>
                <p className="text-sm font-medium" style={{ color: "#1C1A17" }}>{item.productName}</p>
                <p className="text-xs mt-0.5" style={{ color: "#4A4540" }}>
                  SKU: {item.variantSku} · Qty: {item.quantity}
                </p>
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
          <span>Shipping{order.shippingServiceName ? ` (${order.shippingServiceName})` : ""}</span>
          <span>{formatZAR(order.shippingCostZAR)}</span>
        </div>
        <div
          className="flex justify-between text-sm font-medium"
          style={{ color: "#1C1A17", borderTop: "1px solid #C9B8A8", paddingTop: "8px", marginTop: "8px" }}
        >
          <span>Total</span>
          <span>{formatZAR(order.totalZAR)}</span>
        </div>
      </div>
    </div>
  );
}
