import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Returns",
  description:
    "Be Different Packaging returns — if an order arrives damaged, faulty or not as described, contact us with your order number and photos and we'll sort it out.",
  alternates: { canonical: "/returns" },
};

export default function ReturnsPage() {
  return (
    <main style={{ backgroundColor: "#FAF8F5", color: "#1C1A17" }}>
      <div className="max-w-3xl mx-auto px-4 py-16 md:py-24">
        <p className="text-xs uppercase tracking-widest mb-4" style={{ color: "#C9B8A8" }}>
          Returns
        </p>
        <h1
          className="text-4xl md:text-6xl leading-tight mb-8"
          style={{ fontFamily: "var(--font-display)", fontWeight: 300 }}
        >
          Returns &amp; issues
        </h1>

        <div className="space-y-6 text-base leading-relaxed" style={{ color: "#4A4540" }}>
          <p>
            If your order arrives <strong>damaged, faulty, or not as described</strong>,
            email us at{" "}
            <a href="mailto:sales@bedifferentpackaging.com" className="underline" style={{ color: "#1C1A17" }}>
              sales@bedifferentpackaging.com
            </a>{" "}
            with your order number and a few photos. Tell us as soon as you can after it
            arrives, and we&apos;ll arrange a replacement or another fix.
          </p>
          <p>
            Because most of our packaging is made or branded to order, custom and printed
            items generally can&apos;t be returned unless there&apos;s a fault on our side.
            If you&apos;re unsure whether an item qualifies, just ask before you order.
          </p>
          <p>
            Not sure what to do?{" "}
            <Link href="/contact" className="underline" style={{ color: "#1C1A17" }}>
              Contact us
            </Link>{" "}
            with your order details and we&apos;ll talk it through.
          </p>
        </div>
      </div>
    </main>
  );
}
