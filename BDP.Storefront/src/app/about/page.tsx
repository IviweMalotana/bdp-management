import type { Metadata } from "next";
import AboutClient from "./AboutClient";

export const metadata: Metadata = {
  title: "About Be Different Packaging | Cosmetic Packaging for Small Brands",
  description:
    "Be Different Packaging supplies premium cosmetic and skincare packaging in South Africa from just 10 units — built for startups, small brands and growing businesses.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return <AboutClient />;
}
