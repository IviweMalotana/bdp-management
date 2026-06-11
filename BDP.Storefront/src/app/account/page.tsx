"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { getMe, getOrders } from "@/lib/api";

interface MeData {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  accountType: string;
  b2bStatus: string;
  client: null | { id: number; companyName: string; vatNumber: string | null; paymentTermsDays: number; creditLimit: number };
}

interface Order {
  id: number;
  orderNumber: string;
  status: string;
  totalZAR: number;
  createdAt: string;
  itemCount: number;
}

function B2BStatusBadge({ accountType, b2bStatus }: { accountType: string; b2bStatus: string }) {
  if (accountType === "B2B" && b2bStatus === "Approved") {
    return (
      <span
        className="text-xs px-2 py-0.5 uppercase tracking-widest"
        style={{ backgroundColor: "#D4A89A", color: "#1C1A17", borderRadius: "2px" }}
      >
        B2B Approved
      </span>
    );
  }
  if (accountType === "B2B" && b2bStatus === "Pending") {
    return (
      <span
        className="text-xs px-2 py-0.5 uppercase tracking-widest"
        style={{ backgroundColor: "#C9B8A8", color: "#1C1A17", borderRadius: "2px" }}
      >
        B2B Pending
      </span>
    );
  }
  return (
    <span
      className="text-xs px-2 py-0.5 uppercase tracking-widest"
      style={{ backgroundColor: "#E8DDD0", color: "#4A4540", borderRadius: "2px" }}
    >
      Personal
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

function formatZAR(amount: number) {
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(amount);
}

export default function AccountPage() {
  const router = useRouter();
  const { jwt, firstName, clearAuth } = useAuthStore();
  const [me, setMe] = useState<MeData | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!jwt) return;
    Promise.all([getMe(jwt), getOrders(jwt)])
      .then(([meData, ordersData]) => {
        setMe(meData as MeData);
        setOrders((ordersData as Order[]).slice(0, 5));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [jwt]);

  function handleLogout() {
    clearAuth();
    router.push("/");
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12" style={{ backgroundColor: "#FAF8F5", minHeight: "80vh" }}>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1
            className="text-3xl mb-1"
            style={{ fontFamily: "var(--font-display)", color: "#1C1A17" }}
          >
            Hi, {firstName ?? me?.firstName}
          </h1>
          {me && (
            <div className="flex items-center gap-2 mt-2">
              <B2BStatusBadge accountType={me.accountType} b2bStatus={me.b2bStatus} />
              <span className="text-sm" style={{ color: "#4A4540" }}>{me.email}</span>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="text-sm underline"
          style={{ color: "#4A4540" }}
        >
          Log out
        </button>
      </div>

      {/* B2B Pending banner */}
      {me?.accountType === "B2B" && me.b2bStatus === "Pending" && (
        <div
          className="p-4 mb-8 text-sm"
          style={{ backgroundColor: "#E8DDD0", borderLeft: "3px solid #C9B8A8", color: "#4A4540", borderRadius: "2px" }}
        >
          Your business account application is under review. We&apos;ll be in touch within 2 business days.
        </div>
      )}

      {/* B2B Apply CTA */}
      {me?.accountType === "B2C" && (
        <div
          className="p-4 mb-8 flex items-center justify-between"
          style={{ backgroundColor: "#E8DDD0", borderRadius: "2px" }}
        >
          <div>
            <p className="text-sm font-medium" style={{ color: "#1C1A17" }}>Trade with BDP</p>
            <p className="text-xs mt-0.5" style={{ color: "#4A4540" }}>Apply for a business account to access bulk pricing and extended payment terms.</p>
          </div>
          <Link
            href="/account/apply-business"
            className="ml-4 text-sm px-4 py-2 whitespace-nowrap"
            style={{ backgroundColor: "#1C1A17", color: "#FAF8F5", borderRadius: "2px" }}
          >
            Apply
          </Link>
        </div>
      )}

      {/* Recurring orders — B2B Approved only */}
      {me?.accountType === "B2B" && me.b2bStatus === "Approved" && (
        <div className="mt-8 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 style={{ fontFamily: "var(--font-display)", color: "#1C1A17" }} className="text-xl">
              Recurring orders
            </h2>
            <Link href="/account/recurring" className="text-xs underline" style={{ color: "#4A4540" }}>
              Manage
            </Link>
          </div>
          <p className="text-sm" style={{ color: "#4A4540" }}>Set up automatic replenishment orders on your preferred schedule.</p>
        </div>
      )}

      {/* Recent orders */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2
            className="text-xl"
            style={{ fontFamily: "var(--font-display)", color: "#1C1A17" }}
          >
            Recent orders
          </h2>
          <Link href="/account/orders" className="text-xs underline" style={{ color: "#4A4540" }}>
            View all
          </Link>
        </div>

        {loading ? (
          <p className="text-sm" style={{ color: "#4A4540" }}>Loading…</p>
        ) : orders.length === 0 ? (
          <p className="text-sm" style={{ color: "#4A4540" }}>You have no orders yet.</p>
        ) : (
          <ul className="space-y-3">
            {orders.map((o) => (
              <li
                key={o.id}
                className="flex items-center justify-between p-4 border"
                style={{ borderColor: "#C9B8A8", borderRadius: "2px", backgroundColor: "#FAF8F5" }}
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: "#1C1A17" }}>#{o.orderNumber}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#4A4540" }}>
                    {formatDate(o.createdAt)} · {o.itemCount} item{o.itemCount !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm" style={{ color: "#1C1A17" }}>{formatZAR(o.totalZAR)}</p>
                  <p className="text-xs mt-0.5 uppercase tracking-wide" style={{ color: "#4A4540" }}>{o.status}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
