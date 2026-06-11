import type { Metadata } from "next";
import ContactForm from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact — BDP Management",
  description:
    "Get in touch with BDP Management. Whether you're placing your first order or scaling up, we're here to help.",
};

export default function ContactPage() {
  return (
    <main style={{ backgroundColor: "#FAF8F5", color: "#1C1A17" }}>
      <div className="max-w-5xl mx-auto px-4 py-16 md:py-24">
        {/* Heading */}
        <div className="max-w-xl mb-14">
          <p
            className="text-xs uppercase tracking-widest mb-4"
            style={{ color: "#C9B8A8" }}
          >
            Contact
          </p>
          <h1
            className="text-4xl md:text-6xl leading-tight mb-4"
            style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: "#1C1A17" }}
          >
            Get in touch.
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "#4A4540" }}>
            Whether you&apos;re placing your first order or scaling up, we&apos;re here to help.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-14 md:gap-20">
          {/* Contact details */}
          <div>
            <h2
              className="text-lg mb-6"
              style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: "#1C1A17" }}
            >
              Contact details
            </h2>
            <ul className="space-y-5 text-sm" style={{ color: "#4A4540" }}>
              <li className="flex items-start gap-3">
                <svg className="mt-0.5 shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9B8A8" strokeWidth="1.5">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <span>
                  <span className="block text-xs uppercase tracking-widest mb-0.5" style={{ color: "#C9B8A8" }}>Email</span>
                  <a
                    href="mailto:hello@bdpmanagement.co.za"
                    className="hover:opacity-70 transition-opacity"
                    style={{ color: "#1C1A17" }}
                  >
                    hello@bdpmanagement.co.za
                  </a>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="mt-0.5 shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9B8A8" strokeWidth="1.5">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
                </svg>
                <span>
                  <span className="block text-xs uppercase tracking-widest mb-0.5" style={{ color: "#C9B8A8" }}>WhatsApp</span>
                  <a
                    href="https://wa.me/27"
                    className="hover:opacity-70 transition-opacity"
                    style={{ color: "#1C1A17" }}
                  >
                    +27 (placeholder)
                  </a>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="mt-0.5 shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9B8A8" strokeWidth="1.5">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span>
                  <span className="block text-xs uppercase tracking-widest mb-0.5" style={{ color: "#C9B8A8" }}>Location</span>
                  Based in South Africa
                </span>
              </li>
            </ul>
          </div>

          {/* Enquiry form */}
          <ContactForm />
        </div>
      </div>
    </main>
  );
}
