import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Shipping",
  description:
    "How Be Different Packaging ships — worldwide from our China supplier, typically in 4–6 weeks, with freight and customs handled and tracking provided.",
  alternates: { canonical: "/shipping" },
};

export default function ShippingPage() {
  return (
    <main style={{ backgroundColor: "#FAF8F5", color: "#1C1A17" }}>
      <div className="max-w-3xl mx-auto px-4 py-16 md:py-24">
        <p className="text-xs uppercase tracking-widest mb-4" style={{ color: "#C9B8A8" }}>
          Shipping
        </p>
        <h1
          className="text-4xl md:text-6xl leading-tight mb-8"
          style={{ fontFamily: "var(--font-display)", fontWeight: 300 }}
        >
          How shipping works
        </h1>

        <div className="space-y-6 text-base leading-relaxed" style={{ color: "#4A4540" }}>
          <p>
            We ship worldwide from our supplier in China. Most orders — including branded
            and customised ones — arrive in about <strong>4–6 weeks</strong>. Larger or
            fully custom runs can take a little longer; we&apos;ll tell you the expected
            timeline for your order.
          </p>
          <p>
            We deliver to South Africa, the UK, USA, the EU and Australia. We handle the
            freight and customs clearance, so you don&apos;t have to manage the import
            yourself, and we share tracking once your order is on its way.
          </p>
          <p>
            Shipping is priced live at checkout based on your destination and order size —
            no hidden fees. You&apos;ll see the exact cost before you pay.
          </p>
          <p>
            You can follow your order any time on the{" "}
            <Link href="/track" className="underline" style={{ color: "#1C1A17" }}>
              Track Order
            </Link>{" "}
            page using your order number and email.
          </p>
          <p>
            Questions about a specific delivery?{" "}
            <Link href="/contact" className="underline" style={{ color: "#1C1A17" }}>
              Get in touch
            </Link>{" "}
            and we&apos;ll help.
          </p>
        </div>
      </div>
    </main>
  );
}
