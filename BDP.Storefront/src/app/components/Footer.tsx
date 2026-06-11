import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t mt-20" style={{ backgroundColor: "#FAF8F5", borderColor: "#C9B8A8" }}>
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-12">
          <div>
            <h3
              className="text-xs uppercase tracking-widest mb-4"
              style={{ color: "#4A4540", fontFamily: "var(--font-body)" }}
            >
              Shop
            </h3>
            <ul className="space-y-2">
              {[
                ["All packaging", "/shop"],
                ["Collections", "/collections"],
                ["New arrivals", "/shop?sort=newest"],
                ["Best sellers", "/shop?sort=popular"],
              ].map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="text-sm hover:opacity-70 transition-opacity" style={{ color: "#1C1A17" }}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3
              className="text-xs uppercase tracking-widest mb-4"
              style={{ color: "#4A4540", fontFamily: "var(--font-body)" }}
            >
              For Business
            </h3>
            <ul className="space-y-2">
              {[
                ["Hotels & spas", "/for-business"],
                ["Skincare brands", "/for-business#brands"],
                ["Open a trade account", "/for-business#register"],
                ["Customisation", "/customise"],
              ].map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="text-sm hover:opacity-70 transition-opacity" style={{ color: "#1C1A17" }}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3
              className="text-xs uppercase tracking-widest mb-4"
              style={{ color: "#4A4540", fontFamily: "var(--font-body)" }}
            >
              Company
            </h3>
            <ul className="space-y-2">
              {[
                ["About", "/about"],
                ["Contact", "/contact"],
                ["Shipping info", "/shipping"],
                ["Returns", "/returns"],
              ].map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="text-sm hover:opacity-70 transition-opacity" style={{ color: "#1C1A17" }}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t pt-6 text-xs" style={{ borderColor: "#C9B8A8", color: "#4A4540" }}>
          © 2025 be different packaging. South Africa.
        </div>
      </div>
    </footer>
  );
}
