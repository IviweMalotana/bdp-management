import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About | BDP Management",
  description:
    "BDP connects South African beauty brands with cosmetic packaging from vetted Chinese manufacturers, from just 10 units.",
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
