import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About | BDP Management",
  description:
    "BDP Management connects South African beauty brands with premium cosmetic packaging from vetted Chinese manufacturers.",
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
