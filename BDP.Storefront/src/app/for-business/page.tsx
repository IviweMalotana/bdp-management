import Link from "next/link";

const FEATURES = [
  {
    icon: "↻",
    heading: "Recurring orders",
    body: "Set up automatic monthly or quarterly reorders. Never run out of amenity stock again. Adjust quantities any time.",
  },
  {
    icon: "◻",
    heading: "Invoice & net terms",
    body: "Get invoiced on 30- or 60-day net terms. Pay by EFT or Paystack. Full invoice history in your account.",
  },
  {
    icon: "◈",
    heading: "Volume pricing",
    body: "Hotels and group properties unlock deeper discounts. The more you consolidate, the less each unit costs.",
  },
  {
    icon: "✦",
    heading: "Branded packaging",
    body: "Add your property logo via silk screen or hot stamp. Minimum 100 units. Delivered in 4–6 weeks.",
  },
  {
    icon: "⊡",
    heading: "Dedicated account manager",
    body: "A single contact for all your orders, customisation briefs, and delivery queries.",
  },
  {
    icon: "⊞",
    heading: "Multi-site consolidation",
    body: "Manage orders across multiple properties from one account. Split delivery by site or consolidate into one shipment.",
  },
];

const USES = [
  { segment: "Hotels & resorts", detail: "Amenity lines, in-room toiletry bottles, minibar packaging." },
  { segment: "Day spas & wellness", detail: "Retail-ready packaging for house-brand treatments." },
  { segment: "Salons", detail: "Branded take-home bottles and in-salon product containers." },
  { segment: "Corporate gifting", detail: "Bulk packaging for gift sets and employee wellness kits." },
];

export default function ForBusinessPage() {
  return (
    <>
      {/* Hero */}
      <section className="py-24 md:py-32 px-4" style={{ backgroundColor: "#1C1A17" }}>
        <div className="max-w-4xl mx-auto">
          <p className="text-xs uppercase tracking-widest mb-4" style={{ color: "#C9B8A8" }}>For Business</p>
          <h1
            className="text-6xl md:text-7xl leading-none mb-8"
            style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: "#F5EFE6" }}
          >
            packaging that
            <br />
            runs with
            <br />
            your business.
          </h1>
          <p className="text-lg max-w-xl mb-12" style={{ color: "#C9B8A8", lineHeight: 1.8 }}>
            Hotels, spas, and salons need reliable supply — not one-off orders. We&apos;ve built the infrastructure for it.
          </p>
          <Link
            href="/auth/register"
            className="inline-flex items-center px-10 py-4 text-sm font-medium tracking-wide"
            style={{ backgroundColor: "#D4A89A", color: "#1C1A17", borderRadius: "2px" }}
          >
            Open a business account →
          </Link>
        </div>
      </section>

      {/* Who it's for */}
      <section className="py-20 px-4" style={{ backgroundColor: "#EDE4D8" }}>
        <div className="max-w-7xl mx-auto">
          <h2
            className="text-3xl mb-10"
            style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: "#1C1A17" }}
          >
            who it&apos;s for
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {USES.map((u) => (
              <div
                key={u.segment}
                className="p-6 border"
                style={{ backgroundColor: "#F5EFE6", borderColor: "#C9B8A8", borderRadius: "2px" }}
              >
                <h3 className="text-lg font-medium mb-1" style={{ color: "#1C1A17" }}>{u.segment}</h3>
                <p className="text-sm" style={{ color: "#4A4540" }}>{u.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="py-20 px-4" style={{ backgroundColor: "#F5EFE6" }}>
        <div className="max-w-7xl mx-auto">
          <h2
            className="text-3xl mb-12"
            style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: "#1C1A17" }}
          >
            what you get
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.heading}
                className="p-6 border"
                style={{ borderColor: "#C9B8A8", borderRadius: "2px" }}
              >
                <span className="block text-2xl mb-4" style={{ color: "#D4A89A" }}>{f.icon}</span>
                <h3 className="text-lg font-medium mb-2" style={{ color: "#1C1A17" }}>{f.heading}</h3>
                <p className="text-sm" style={{ color: "#4A4540", lineHeight: 1.8 }}>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing note */}
      <section className="py-20 px-4" style={{ backgroundColor: "#EDE4D8" }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2
            className="text-4xl mb-6"
            style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: "#1C1A17" }}
          >
            volume unlocks value.
          </h2>
          <div className="grid grid-cols-3 gap-6 mb-10">
            {[
              { qty: "50 units", note: "Entry tier" },
              { qty: "500 units", note: "28% margin" },
              { qty: "5,000 units", note: "20% margin" },
            ].map((row) => (
              <div key={row.qty} className="p-4 border" style={{ backgroundColor: "#F5EFE6", borderColor: "#C9B8A8", borderRadius: "2px" }}>
                <p className="text-xl mb-1" style={{ fontFamily: "var(--font-display)", color: "#1C1A17", fontWeight: 300 }}>{row.qty}</p>
                <p className="text-xs" style={{ color: "#C9B8A8" }}>{row.note}</p>
              </div>
            ))}
          </div>
          <p className="text-sm mb-10" style={{ color: "#4A4540", lineHeight: 1.8 }}>
            Pricing updates live as you adjust quantities. No hidden fees, no MOQ surprises.
          </p>
          <Link
            href="/shop"
            className="inline-flex items-center px-8 py-3.5 text-sm font-medium tracking-wide border mr-4"
            style={{ borderColor: "#1C1A17", color: "#1C1A17", borderRadius: "2px" }}
          >
            Browse packaging
          </Link>
          <Link
            href="/auth/register"
            className="inline-flex items-center px-8 py-3.5 text-sm font-medium tracking-wide"
            style={{ backgroundColor: "#1C1A17", color: "#F5EFE6", borderRadius: "2px" }}
          >
            Open an account →
          </Link>
        </div>
      </section>
    </>
  );
}
