import type { Metadata } from "next";
import AboutClient from "./AboutClient";

export const metadata: Metadata = {
  title: "About Be Different Packaging | Cosmetic Packaging for Small Brands",
  description:
    "Be Different Packaging supplies cosmetic and skincare packaging in South Africa from just 10 units — made for startups and small brands.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return <AboutClient />;
}
