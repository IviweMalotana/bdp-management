"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { getRecurringOrderById, pauseRecurringOrder, resumeRecurringOrder, cancelRecurringOrder } from "@/lib/api";

interface RecurringOrderItem {
  id: number;
  productVariantId: number;
  variantName: string;
  quantity: number;
}

interface RecurringOrder {
  id: number;
  name: string;
  frequency: string;
  frequencyDays: number;
  nextOrderDate: string;
  status: string;
  contractStartDate: string;
  contractEndDate: string;
  createdAt: string;
  notes: string | null;
  items: RecurringOrderItem[];
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, React.CSSProperties> = {
    Active: { backgroundColor: "#D4A89A", color: "#1C1A17" },
    Paused: { backgroundColor: "#C9B8A8", color: "#1C1A17" },
    Cancelled: { backgroundColor: "#E8E0D8", color: "#8A7F76" },
  };
  return (
    <span
      className="text-xs px-2 py-0.5 uppercase tracking-widest"
      style={{ ...styles[status], borderRadius: "2px" }}
    >
      {status}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

export default function RecurringOrderDetailPage() {
  const { jwt } = useAuthStore();
  const params = useParams();
  const id = Number(params?.id);
  const [order, setOrder] = useState<RecurringOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    if (!jwt || !id) return;
    getRecurringOrderById(jwt, id)
      .then((data) => setOrder(data as RecurringOrder))
      .catch(() => setError("Order not found."))
      .finally(() => setLoading(false));
  }, [jwt, id]);

  async function handlePause() {
    if (!jwt || !order) return;
    setActionLoading(true);
    setError(null);
    try {
      const updated = await pauseRecurringOrder(jwt, order.id);
      setOrder(updated as RecurringOrder);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to pause order.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleResume() {
    if (!jwt || !order) return;
    setActionLoading(true);
    setError(null);
    try {
      const updated = await resumeRecurringOrder(jwt, order.id);
      setOrder(updated as RecurringOrder);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to resume order.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel() {
    if (!jwt || !order) return;
    setActionLoading(true);
    setError(null);
    try {
      await cancelRecurringOrder(jwt, order.id);
      setOrder({ ...order, status: "Cancelled" });
      setConfirmCancel(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to cancel order.");
    } finally {
      setActionLoading(false);
    }
  }

  if (!jwt) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12" style={{ backgroundColor: "#FAF8F5", minHeight: "80vh" }}>
        <p className="text-sm" style={{ color: "#4A4540" }}>Please log in to view this order.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12" style={{ backgroundColor: "#FAF8F5", minHeight: "80vh" }}>
      <div className="flex items-center gap-3 mb-8">
        <Link href="/account/recurring" className="text-xs underline" style={{ color: "#4A4540" }}>
          ← Recurring orders
        </Link>
      </div>

      {loading && (
        <p className="text-sm" style={{ color: "#4A4540" }}>Loading…</p>
      )}

      {!loading && error && (
        <p className="text-sm" style={{ color: "#C0392B" }}>{error}</p>
      )}

      {!loading && order && (
        <>
          <div className="flex items-start justify-between mb-6">
            <h1 style={{ fontFamily: "var(--font-display)", color: "#1C1A17", fontSize: "2rem" }}>
              {order.name}
            </h1>
            <StatusBadge status={order.status} />
          </div>

          {/* Details */}
          <div
            className="p-5 mb-6 border"
            style={{ backgroundColor: "#FAF8F5", borderColor: "#C9B8A8", borderRadius: "2px" }}
          >
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt style={{ color: "#4A4540" }}>Frequency</dt>
                <dd style={{ color: "#1C1A17" }}>
                  {order.frequency === "Custom"
                    ? `Every ${order.frequencyDays} days`
                    : order.frequency}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt style={{ color: "#4A4540" }}>Contract start</dt>
                <dd style={{ color: "#1C1A17" }}>{formatDate(order.contractStartDate)}</dd>
              </div>
              <div className="flex justify-between">
                <dt style={{ color: "#4A4540" }}>Contract end</dt>
                <dd style={{ color: "#1C1A17" }}>{formatDate(order.contractEndDate)}</dd>
              </div>
              <div className="flex justify-between">
                <dt style={{ color: "#4A4540" }}>Next order date</dt>
                <dd style={{ color: "#1C1A17" }}>{formatDate(order.nextOrderDate)}</dd>
              </div>
              {order.notes && (
                <div>
                  <dt className="mb-1" style={{ color: "#4A4540" }}>Notes</dt>
                  <dd style={{ color: "#1C1A17" }}>{order.notes}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Line items */}
          <div className="mb-6">
            <h2
              className="text-base mb-3"
              style={{ fontFamily: "var(--font-display)", color: "#1C1A17" }}
            >
              Items
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid #C9B8A8" }}>
                  <th className="pb-2 text-left text-xs uppercase tracking-widest" style={{ color: "#4A4540" }}>Product</th>
                  <th className="pb-2 text-right text-xs uppercase tracking-widest" style={{ color: "#4A4540" }}>Qty</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid #E8DDD0" }}>
                    <td className="py-2.5" style={{ color: "#1C1A17" }}>{item.variantName}</td>
                    <td className="py-2.5 text-right" style={{ color: "#1C1A17" }}>{item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Action buttons */}
          {order.status !== "Cancelled" && (
            <div className="flex flex-wrap gap-3">
              {order.status === "Active" && (
                <button
                  onClick={handlePause}
                  disabled={actionLoading}
                  className="px-5 py-2.5 text-sm border"
                  style={{ borderColor: "#C9B8A8", borderRadius: "2px", color: "#1C1A17", backgroundColor: "#FAF8F5" }}
                >
                  {actionLoading ? "Pausing…" : "Pause"}
                </button>
              )}
              {order.status === "Paused" && (
                <button
                  onClick={handleResume}
                  disabled={actionLoading}
                  className="px-5 py-2.5 text-sm border"
                  style={{ borderColor: "#C9B8A8", borderRadius: "2px", color: "#1C1A17", backgroundColor: "#FAF8F5" }}
                >
                  {actionLoading ? "Resuming…" : "Resume"}
                </button>
              )}
              {!confirmCancel ? (
                <button
                  onClick={() => setConfirmCancel(true)}
                  className="px-5 py-2.5 text-sm border"
                  style={{ borderColor: "#C9B8A8", borderRadius: "2px", color: "#8A7F76", backgroundColor: "#FAF8F5" }}
                >
                  Cancel order
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <p className="text-xs" style={{ color: "#4A4540" }}>
                    Are you sure? This cannot be undone.
                  </p>
                  <button
                    onClick={handleCancel}
                    disabled={actionLoading}
                    className="px-4 py-2 text-sm"
                    style={{ backgroundColor: "#1C1A17", color: "#FAF8F5", borderRadius: "2px" }}
                  >
                    {actionLoading ? "Cancelling…" : "Confirm cancel"}
                  </button>
                  <button
                    onClick={() => setConfirmCancel(false)}
                    className="text-xs underline"
                    style={{ color: "#4A4540" }}
                  >
                    Keep
                  </button>
                </div>
              )}
            </div>
          )}

          {error && !loading && (
            <p className="mt-4 text-xs" style={{ color: "#C0392B" }}>{error}</p>
          )}
        </>
      )}
    </div>
  );
}
