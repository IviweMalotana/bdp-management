import Link from "next/link";

export default async function OrderSuccessPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;

  return (
    <div className="max-w-xl mx-auto px-4 py-24 text-center">
      <h1
        className="text-5xl mb-6"
        style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: "#1C1A17" }}
      >
        order confirmed.
      </h1>
      <p className="text-sm mb-2" style={{ color: "#4A4540" }}>
        Order #{orderId}
      </p>
      <p className="text-sm mb-10" style={{ color: "#4A4540" }}>
        We&apos;ll email your receipt shortly. Your order will ship from China in 4–6 weeks.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link
          href="/shop"
          className="inline-flex items-center justify-center px-8 py-3.5 text-sm font-medium border"
          style={{ borderColor: "#1C1A17", color: "#1C1A17", borderRadius: "2px" }}
        >
          Continue shopping
        </Link>
        <Link
          href="/auth/login"
          className="inline-flex items-center justify-center px-8 py-3.5 text-sm font-medium"
          style={{ backgroundColor: "#1C1A17", color: "#F5EFE6", borderRadius: "2px" }}
        >
          Track your order
        </Link>
      </div>
    </div>
  );
}
