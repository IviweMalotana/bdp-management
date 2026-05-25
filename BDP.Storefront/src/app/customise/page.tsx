import Link from "next/link";

const TECHNIQUES = [
  {
    name: "Silk Screen Printing",
    moq: 100,
    lead: "4–6 weeks",
    description:
      "Up to 2 colours printed directly onto the bottle. Clean, precise, and durable — ideal for logos, wordmarks, and simple graphics.",
    startingFrom: "R15.00 / unit",
  },
  {
    name: "Hot Stamp Foiling",
    moq: 100,
    lead: "4–6 weeks",
    description:
      "Metallic foil transferred under heat. Gives your packaging a premium, luxurious feel. Available in gold, silver, rose gold, and more.",
    startingFrom: "R16.50 / unit",
  },
];

export default function CustomisePage() {
  return (
    <>
      {/* Hero */}
      <section className="py-24 md:py-32 px-4" style={{ backgroundColor: "#F5EFE6" }}>
        <div className="max-w-4xl mx-auto">
          <p className="text-xs uppercase tracking-widest mb-4" style={{ color: "#C9B8A8" }}>Customisation</p>
          <h1
            className="text-6xl md:text-7xl leading-none mb-8"
            style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: "#1C1A17" }}
          >
            make it
            <br />
            undeniably
            <br />
            yours.
          </h1>
          <p className="text-lg max-w-xl" style={{ color: "#4A4540", lineHeight: 1.8 }}>
            Add your brand identity directly to the packaging. From 100 units, shipped from our China supplier in 4–6 weeks.
          </p>
        </div>
      </section>

      {/* Techniques */}
      <section className="py-20 px-4" style={{ backgroundColor: "#EDE4D8" }}>
        <div className="max-w-7xl mx-auto">
          <h2
            className="text-3xl mb-12"
            style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: "#1C1A17" }}
          >
            techniques
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {TECHNIQUES.map((t) => (
              <div
                key={t.name}
                className="p-8 border"
                style={{ backgroundColor: "#F5EFE6", borderColor: "#C9B8A8", borderRadius: "2px" }}
              >
                <h3
                  className="text-2xl mb-3"
                  style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: "#1C1A17" }}
                >
                  {t.name}
                </h3>
                <p className="text-sm mb-6" style={{ color: "#4A4540", lineHeight: 1.8 }}>
                  {t.description}
                </p>
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <p className="uppercase tracking-widest mb-1" style={{ color: "#C9B8A8" }}>MOQ</p>
                    <p style={{ color: "#1C1A17" }}>{t.moq} units</p>
                  </div>
                  <div>
                    <p className="uppercase tracking-widest mb-1" style={{ color: "#C9B8A8" }}>Lead time</p>
                    <p style={{ color: "#1C1A17" }}>{t.lead}</p>
                  </div>
                  <div>
                    <p className="uppercase tracking-widest mb-1" style={{ color: "#C9B8A8" }}>From</p>
                    <p style={{ color: "#1C1A17" }}>{t.startingFrom}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4" style={{ backgroundColor: "#F5EFE6" }}>
        <div className="max-w-3xl mx-auto">
          <h2
            className="text-3xl mb-12"
            style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: "#1C1A17" }}
          >
            how it works
          </h2>
          <ol className="space-y-8">
            {[
              { step: "01", heading: "Choose your bottle", body: "Browse the shop and select your packaging. Add 100+ units to your cart." },
              { step: "02", heading: "Select a print technique", body: "On the product page, choose silk screen or hot stamp and add it to your order." },
              { step: "03", heading: "Send your artwork", body: "After checkout we&apos;ll email you a brief with file format specs (PDF/AI, vector)." },
              { step: "04", heading: "Proof and produce", body: "We send a digital proof for your approval. Production begins once confirmed." },
              { step: "05", heading: "Delivered to your door", body: "Your branded packaging ships from China and arrives in 4–6 weeks." },
            ].map((item) => (
              <li key={item.step} className="flex gap-8 items-start">
                <span
                  className="text-3xl shrink-0 w-12"
                  style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: "#C9B8A8" }}
                >
                  {item.step}
                </span>
                <div>
                  <h3 className="text-base font-medium mb-1" style={{ color: "#1C1A17" }}>{item.heading}</h3>
                  <p
                    className="text-sm"
                    style={{ color: "#4A4540", lineHeight: 1.8 }}
                    dangerouslySetInnerHTML={{ __html: item.body }}
                  />
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 text-center" style={{ backgroundColor: "#EDD8D2" }}>
        <h2
          className="text-4xl mb-6"
          style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: "#1C1A17" }}
        >
          ready to start?
        </h2>
        <p className="text-sm mb-10 max-w-md mx-auto" style={{ color: "#4A4540", lineHeight: 1.8 }}>
          Select your packaging, choose a print technique at checkout, and we handle the rest.
        </p>
        <Link
          href="/shop"
          className="inline-flex items-center px-10 py-4 text-sm font-medium tracking-wide"
          style={{ backgroundColor: "#1C1A17", color: "#F5EFE6", borderRadius: "2px" }}
        >
          Shop packaging →
        </Link>
      </section>
    </>
  );
}
