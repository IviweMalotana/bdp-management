"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { getMe, getRecurringOrders, createRecurringOrder, getProducts } from "@/lib/api";

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

interface MeData {
  accountType: string;
  b2bStatus: string;
}

interface ProductVariant {
  id: number;
  size: string;
  bottleColour: string;
  sku: string;
}

interface Product {
  id: number;
  name: string;
  variants: ProductVariant[];
}

interface ItemDraft {
  productVariantId: number;
  quantity: number;
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

export default function RecurringOrdersPage() {
  const { jwt } = useAuthStore();
  const [me, setMe] = useState<MeData | null>(null);
  const [orders, setOrders] = useState<RecurringOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState("Monthly");
  const [frequencyDays, setFrequencyDays] = useState(30);
  const [contractStart, setContractStart] = useState("");
  const [contractEnd, setContractEnd] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemDraft[]>([{ productVariantId: 0, quantity: 1 }]);

  useEffect(() => {
    if (!jwt) return;
    Promise.all([getMe(jwt), getRecurringOrders(jwt), getProducts()])
      .then(([meData, ordersData, productsData]) => {
        setMe(meData as MeData);
        setOrders(ordersData as RecurringOrder[]);
        const prods = (productsData as { data?: Product[]; items?: Product[] } | Product[]);
        if (Array.isArray(prods)) setProducts(prods);
        else if ('data' in prods && prods.data) setProducts(prods.data);
        else if ('items' in prods && prods.items) setProducts(prods.items);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [jwt]);

  const frequencyOptions = [
    { label: "Weekly (7 days)", value: "Weekly", days: 7 },
    { label: "Fortnightly (14 days)", value: "Fortnightly", days: 14 },
    { label: "Monthly (30 days)", value: "Monthly", days: 30 },
    { label: "Custom", value: "Custom", days: 0 },
  ];

  function handleFrequencyChange(val: string) {
    setFrequency(val);
    const opt = frequencyOptions.find((o) => o.value === val);
    if (opt && opt.days > 0) setFrequencyDays(opt.days);
  }

  function addItem() {
    setItems([...items, { productVariantId: 0, quantity: 1 }]);
  }

  function updateItem(idx: number, field: keyof ItemDraft, val: number) {
    setItems(items.map((it, i) => (i === idx ? { ...it, [field]: val } : it)));
  }

  function removeItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx));
  }

  // Flatten variants for the selector
  const variantOptions = products.flatMap((p) =>
    (p.variants ?? []).map((v) => ({
      id: v.id,
      label: `${p.name}, ${v.size} ${v.bottleColour}`.trim(),
    }))
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!jwt) return;
    const validItems = items.filter((it) => it.productVariantId > 0 && it.quantity > 0);
    if (validItems.length === 0) {
      setFormError("Please add at least one product.");
      return;
    }
    setSubmitting(true);
    try {
      await createRecurringOrder(jwt, {
        name,
        frequency,
        frequencyDays,
        contractStartDate: new Date(contractStart).toISOString(),
        contractEndDate: new Date(contractEnd).toISOString(),
        notes: notes || null,
        items: validItems,
      });
      // Refresh list
      const updated = await getRecurringOrders(jwt);
      setOrders(updated as RecurringOrder[]);
      setShowForm(false);
      // Reset form
      setName(""); setFrequency("Monthly"); setFrequencyDays(30);
      setContractStart(""); setContractEnd(""); setNotes("");
      setItems([{ productVariantId: 0, quantity: 1 }]);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to create order.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!jwt) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12" style={{ backgroundColor: "#FAF8F5", minHeight: "80vh" }}>
        <p className="text-sm" style={{ color: "#4A4540" }}>Please log in to view recurring orders.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12" style={{ backgroundColor: "#FAF8F5", minHeight: "80vh" }}>
      <div className="flex items-center justify-between mb-8">
        <h1 style={{ fontFamily: "var(--font-display)", color: "#1C1A17", fontSize: "2rem" }}>
          Recurring Orders
        </h1>
        <Link href="/account" className="text-xs underline" style={{ color: "#4A4540" }}>
          Back to account
        </Link>
      </div>

      {/* Not approved B2B */}
      {me && !(me.accountType === "B2B" && me.b2bStatus === "Approved") && (
        <div
          className="p-5 mb-8"
          style={{ backgroundColor: "#E8DDD0", borderLeft: "3px solid #D4A89A", borderRadius: "2px" }}
        >
          <p className="text-sm font-medium mb-1" style={{ color: "#1C1A17" }}>
            Recurring orders are available to approved B2B accounts.
          </p>
          <p className="text-xs mb-3" style={{ color: "#4A4540" }}>
            Apply for a business account to access bulk pricing, extended payment terms, and scheduled replenishment.
          </p>
          <Link
            href="/account/apply-business"
            className="text-xs underline"
            style={{ color: "#1C1A17" }}
          >
            Apply for a B2B account →
          </Link>
        </div>
      )}

      {/* Approved B2B content */}
      {me?.accountType === "B2B" && me.b2bStatus === "Approved" && (
        <>
          {/* New order button */}
          <div className="mb-6">
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-5 py-2.5 text-sm font-medium"
              style={{ backgroundColor: "#1C1A17", color: "#FAF8F5", borderRadius: "2px" }}
            >
              {showForm ? "Cancel" : "New recurring order"}
            </button>
          </div>

          {/* Create form */}
          {showForm && (
            <form
              onSubmit={handleSubmit}
              className="mb-8 p-6 border"
              style={{ backgroundColor: "#FAF8F5", borderColor: "#C9B8A8", borderRadius: "2px" }}
            >
              <h2
                className="text-lg mb-5"
                style={{ fontFamily: "var(--font-display)", color: "#1C1A17" }}
              >
                New recurring order
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs mb-1" style={{ color: "#4A4540" }}>Order name</label>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Monthly cosmetic refill"
                    className="w-full px-3 py-2 text-sm border"
                    style={{ borderColor: "#C9B8A8", borderRadius: "2px", backgroundColor: "#FAF8F5", color: "#1C1A17" }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs mb-1" style={{ color: "#4A4540" }}>Frequency</label>
                    <select
                      value={frequency}
                      onChange={(e) => handleFrequencyChange(e.target.value)}
                      className="w-full px-3 py-2 text-sm border"
                      style={{ borderColor: "#C9B8A8", borderRadius: "2px", backgroundColor: "#FAF8F5", color: "#1C1A17" }}
                    >
                      {frequencyOptions.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  {frequency === "Custom" && (
                    <div>
                      <label className="block text-xs mb-1" style={{ color: "#4A4540" }}>Every N days</label>
                      <input
                        type="number"
                        min={1}
                        value={frequencyDays}
                        onChange={(e) => setFrequencyDays(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm border"
                        style={{ borderColor: "#C9B8A8", borderRadius: "2px", backgroundColor: "#FAF8F5", color: "#1C1A17" }}
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs mb-1" style={{ color: "#4A4540" }}>Contract start</label>
                    <input
                      required
                      type="date"
                      value={contractStart}
                      onChange={(e) => setContractStart(e.target.value)}
                      className="w-full px-3 py-2 text-sm border"
                      style={{ borderColor: "#C9B8A8", borderRadius: "2px", backgroundColor: "#FAF8F5", color: "#1C1A17" }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: "#4A4540" }}>Contract end</label>
                    <input
                      required
                      type="date"
                      value={contractEnd}
                      onChange={(e) => setContractEnd(e.target.value)}
                      className="w-full px-3 py-2 text-sm border"
                      style={{ borderColor: "#C9B8A8", borderRadius: "2px", backgroundColor: "#FAF8F5", color: "#1C1A17" }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs mb-1" style={{ color: "#4A4540" }}>Notes (optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 text-sm border"
                    style={{ borderColor: "#C9B8A8", borderRadius: "2px", backgroundColor: "#FAF8F5", color: "#1C1A17" }}
                  />
                </div>

                {/* Items */}
                <div>
                  <label className="block text-xs mb-2" style={{ color: "#4A4540" }}>Products</label>
                  <div className="space-y-2">
                    {items.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <select
                          value={item.productVariantId}
                          onChange={(e) => updateItem(idx, "productVariantId", Number(e.target.value))}
                          className="flex-1 px-3 py-2 text-sm border"
                          style={{ borderColor: "#C9B8A8", borderRadius: "2px", backgroundColor: "#FAF8F5", color: "#1C1A17" }}
                        >
                          <option value={0}>Select product variant…</option>
                          {variantOptions.map((v) => (
                            <option key={v.id} value={v.id}>{v.label}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))}
                          className="w-20 px-3 py-2 text-sm border text-center"
                          style={{ borderColor: "#C9B8A8", borderRadius: "2px", backgroundColor: "#FAF8F5", color: "#1C1A17" }}
                        />
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            className="text-xs"
                            style={{ color: "#C9B8A8" }}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addItem}
                    className="mt-2 text-xs underline"
                    style={{ color: "#4A4540" }}
                  >
                    + Add product
                  </button>
                </div>

                {formError && (
                  <p className="text-xs" style={{ color: "#C0392B" }}>{formError}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 text-sm font-medium"
                  style={{
                    backgroundColor: submitting ? "#C9B8A8" : "#1C1A17",
                    color: "#FAF8F5",
                    borderRadius: "2px",
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? "Creating…" : "Create recurring order"}
                </button>
              </div>
            </form>
          )}

          {/* Orders list */}
          {loading ? (
            <p className="text-sm" style={{ color: "#4A4540" }}>Loading…</p>
          ) : orders.length === 0 ? (
            <div
              className="p-8 text-center border"
              style={{ borderColor: "#C9B8A8", borderRadius: "2px", backgroundColor: "#FAF8F5" }}
            >
              <p className="text-sm mb-1" style={{ color: "#1C1A17" }}>No recurring orders yet.</p>
              <p className="text-xs" style={{ color: "#4A4540" }}>
                Set up automatic replenishment orders on your preferred schedule.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {orders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/account/recurring/${order.id}`}
                    className="block p-4 border hover:opacity-90 transition-opacity"
                    style={{ borderColor: "#C9B8A8", borderRadius: "2px", backgroundColor: "#FAF8F5" }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium mb-1" style={{ color: "#1C1A17" }}>
                          {order.name}
                        </p>
                        <p className="text-xs mb-2" style={{ color: "#4A4540" }}>
                          {order.frequency === "Custom"
                            ? `Every ${order.frequencyDays} days`
                            : order.frequency}{" "}
                          · {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                        </p>
                        <p className="text-xs" style={{ color: "#C9B8A8" }}>
                          Next order: {formatDate(order.nextOrderDate)}
                        </p>
                      </div>
                      <StatusBadge status={order.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
