"use client";
import { useState, useCallback } from "react";
import { trackOrder } from "@/lib/api";

// ── Types ────────────────────────────────────────────────────────────────────

interface TrackingAddress {
  recipientName: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
}

interface TrackingItem {
  productName: string | null;
  variantSku: string | null;
  quantity: number;
}

interface TrackingResult {
  orderNumber: string;
  status: string;
  fulfilmentStatus: string;
  orderDate: string;
  shippingServiceName: string | null;
  trackingNumber: string | null;
  trackingCarrier: string | null;
  estimatedDelivery: string | null;
  shippingAddress: TrackingAddress;
  items: TrackingItem[];
}

// ── Status timeline ───────────────────────────────────────────────────────────

const STATUS_STEPS = [
  "Placed",
  "Processing",
  "Ready to Ship",
  "Shipped",
  "Delivered",
] as const;

const STATUS_ALIASES: Record<string, string> = {
  // Map API values to timeline steps
  Placed: "Placed",
  Processing: "Processing",
  "Customisation Accepted": "Processing",
  "Ready to Ship": "Ready to Ship",
  Shipped: "Shipped",
  Delivered: "Delivered",
  Cancelled: "Cancelled",
};

function getStepIndex(status: string): number {
  const mapped = STATUS_ALIASES[status] ?? status;
  return STATUS_STEPS.indexOf(mapped as (typeof STATUS_STEPS)[number]);
}

function StatusBadge({ status }: { status: string }) {
  const isCancelled = status === "Cancelled";
  return (
    <span
      className="inline-block text-xs px-3 py-1 uppercase tracking-widest"
      style={{
        backgroundColor: isCancelled ? "#E8DDD0" : "#1C1A17",
        color: isCancelled ? "#4A4540" : "#FAF8F5",
        borderRadius: "2px",
      }}
    >
      {status}
    </span>
  );
}

function StatusTimeline({ status }: { status: string }) {
  const activeIndex = getStepIndex(status);
  const isCancelled = status === "Cancelled";

  if (isCancelled) {
    return (
      <div
        className="p-4 text-sm text-center"
        style={{ backgroundColor: "#E8DDD0", borderRadius: "2px", color: "#4A4540" }}
      >
        This order has been cancelled.
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Connector line */}
      <div
        className="absolute top-3 left-0 right-0 h-px"
        style={{ backgroundColor: "#C9B8A8", zIndex: 0 }}
      />
      <div className="relative flex justify-between">
        {STATUS_STEPS.map((step, i) => {
          const done = activeIndex >= i;
          const current = activeIndex === i;
          return (
            <div key={step} className="flex flex-col items-center gap-2" style={{ flex: 1 }}>
              <div
                className="w-6 h-6 rounded-full border-2 flex items-center justify-center relative z-10"
                style={{
                  backgroundColor: done ? "#1C1A17" : "#FAF8F5",
                  borderColor: done ? "#1C1A17" : "#C9B8A8",
                }}
              >
                {done && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <polyline
                      points="1.5,5 3.5,7.5 8.5,2.5"
                      stroke="#FAF8F5"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
              <span
                className="text-center hidden sm:block"
                style={{
                  fontSize: "10px",
                  color: current ? "#1C1A17" : done ? "#4A4540" : "#C9B8A8",
                  fontWeight: current ? 600 : 400,
                  letterSpacing: "0.03em",
                  lineHeight: 1.3,
                }}
              >
                {step}
              </span>
              {/* Mobile: only show active label */}
              <span
                className="text-center sm:hidden"
                style={{
                  fontSize: "10px",
                  color: current ? "#1C1A17" : "transparent",
                  fontWeight: 600,
                  letterSpacing: "0.03em",
                  lineHeight: 1.3,
                }}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Copy button ───────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="text-xs px-2 py-1 border transition-colors"
      style={{
        borderColor: "#C9B8A8",
        borderRadius: "2px",
        color: copied ? "#1C1A17" : "#4A4540",
        backgroundColor: copied ? "#E8DDD0" : "transparent",
      }}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

// ── Form ─────────────────────────────────────────────────────────────────────

function InputField({
  label,
  id,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; id: string; error?: string }) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs uppercase tracking-widest mb-1"
        style={{ color: "#4A4540" }}
      >
        {label}
      </label>
      <input
        id={id}
        className="w-full text-sm px-3 py-2.5 border outline-none"
        style={{
          borderColor: error ? "#D4A89A" : "#C9B8A8",
          borderRadius: "2px",
          backgroundColor: "#FAF8F5",
          color: "#1C1A17",
        }}
        {...props}
      />
      {error && (
        <p className="text-xs mt-1" style={{ color: "#D4A89A" }}>
          {error}
        </p>
      )}
    </div>
  );
}

// ── Main client component ─────────────────────────────────────────────────────

export default function TrackClient() {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ orderNumber?: string; email?: string }>({});

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setOrderNumber("");
    setEmail("");
    setFieldErrors({});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const errs: { orderNumber?: string; email?: string } = {};
    if (!orderNumber.trim()) errs.orderNumber = "Order number is required";
    if (!email.trim()) errs.email = "Email address is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      errs.email = "Enter a valid email address";

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setFieldErrors({});
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = (await trackOrder(orderNumber.trim(), email.trim())) as TrackingResult;
      setResult(data);
    } catch (err: unknown) {
      const msg =
        err instanceof Error && err.message.includes("404")
          ? "Order not found. Check your order number and email."
          : "Something went wrong. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-ZA", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  // ── State 2 — Order found ────────────────────────────────────────────────
  if (result) {
    const addr = result.shippingAddress;
    const locationParts = [addr.city, addr.province].filter(Boolean);
    const location = locationParts.join(", ");

    return (
      <div
        className="max-w-xl mx-auto px-4 py-12"
        style={{ minHeight: "70vh" }}
      >
        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
          <div>
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#9E8F83" }}>
              Order
            </p>
            <h1
              className="text-2xl"
              style={{ fontFamily: "var(--font-display)", color: "#1C1A17" }}
            >
              {result.orderNumber}
            </h1>
            <p className="text-sm mt-1" style={{ color: "#9E8F83" }}>
              Placed {formatDate(result.orderDate)}
            </p>
          </div>
          <div className="mt-1">
            <StatusBadge status={result.status} />
          </div>
        </div>

        {/* Timeline */}
        <div className="mb-8">
          <StatusTimeline status={result.status} />
        </div>

        {/* Tracking number */}
        {result.trackingNumber && (
          <div
            className="p-4 mb-6"
            style={{ backgroundColor: "#F0EBE4", borderRadius: "2px" }}
          >
            <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "#9E8F83" }}>
              Tracking number
              {result.trackingCarrier ? ` · ${result.trackingCarrier}` : ""}
            </p>
            <div className="flex items-center gap-3">
              <span
                className="text-base font-medium flex-1"
                style={{ color: "#1C1A17", fontFamily: "monospace", letterSpacing: "0.05em" }}
              >
                {result.trackingNumber}
              </span>
              <CopyButton text={result.trackingNumber} />
            </div>
          </div>
        )}

        {/* Shipping service */}
        {result.shippingServiceName && (
          <div className="mb-6">
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#9E8F83" }}>
              Shipping method
            </p>
            <p className="text-sm" style={{ color: "#1C1A17" }}>
              {result.shippingServiceName}
            </p>
          </div>
        )}

        {/* Delivery address */}
        {location && (
          <div className="mb-6">
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#9E8F83" }}>
              Delivering to
            </p>
            <p className="text-sm" style={{ color: "#1C1A17" }}>
              {addr.recipientName ? `${addr.recipientName} · ` : ""}
              {location}
            </p>
          </div>
        )}

        {/* Items */}
        <div className="mb-8">
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "#9E8F83" }}>
            Items
          </p>
          <ul className="space-y-2">
            {result.items.map((item, i) => (
              <li
                key={i}
                className="flex items-center justify-between p-3"
                style={{ backgroundColor: "#F0EBE4", borderRadius: "2px" }}
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: "#1C1A17" }}>
                    {item.productName ?? "Product"}
                  </p>
                  {item.variantSku && (
                    <p className="text-xs mt-0.5" style={{ color: "#9E8F83" }}>
                      {item.variantSku}
                    </p>
                  )}
                </div>
                <span
                  className="text-sm ml-4"
                  style={{ color: "#4A4540", whiteSpace: "nowrap" }}
                >
                  × {item.quantity}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Reset link */}
        <button
          type="button"
          onClick={reset}
          className="text-sm underline"
          style={{ color: "#4A4540" }}
        >
          Track another order
        </button>
      </div>
    );
  }

  // ── State 1 — Search form (and State 3 — not found, inline) ─────────────
  return (
    <div
      className="max-w-md mx-auto px-4 py-16"
      style={{ minHeight: "70vh" }}
    >
      <h1
        className="text-3xl mb-2"
        style={{ fontFamily: "var(--font-display)", color: "#1C1A17" }}
      >
        Track your order
      </h1>
      <p className="text-sm mb-8" style={{ color: "#9E8F83" }}>
        Enter the order number from your confirmation email
      </p>

      {/* Not-found error */}
      {error && (
        <div
          className="p-4 mb-6 text-sm"
          style={{
            backgroundColor: "#FDF6F4",
            borderLeft: "3px solid #D4A89A",
            borderRadius: "2px",
            color: "#4A4540",
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <InputField
          id="orderNumber"
          label="Order number"
          type="text"
          placeholder="e.g. SF-20260601-ABC123"
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          error={fieldErrors.orderNumber}
          autoComplete="off"
        />

        <InputField
          id="email"
          label="Email address"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email}
          autoComplete="email"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 text-sm font-medium disabled:opacity-50 transition-opacity"
          style={{
            backgroundColor: "#1C1A17",
            color: "#FAF8F5",
            borderRadius: "2px",
          }}
        >
          {loading ? "Searching…" : "Track order"}
        </button>
      </form>
    </div>
  );
}
