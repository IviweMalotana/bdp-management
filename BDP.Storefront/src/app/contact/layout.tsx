import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact | BDP Management",
  description:
    "Get in touch with BDP Management. Whether you're placing your first order or scaling up, we're here to help.",
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
