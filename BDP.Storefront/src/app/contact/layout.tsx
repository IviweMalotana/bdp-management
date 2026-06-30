import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact | BDP Management",
  description:
    "Get in touch with BDP — questions about products, pricing, custom branding or bulk orders. We're happy to help.",
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
