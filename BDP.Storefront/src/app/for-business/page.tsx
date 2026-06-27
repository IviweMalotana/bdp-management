import type { Metadata } from "next";
import ForBusinessClient from "./ForBusinessClient";

export const metadata: Metadata = {
  title: "Wholesale & B2B Cosmetic Packaging South Africa | Hotels, Spas & Brands",
  description:
    "Bulk cosmetic packaging for South African businesses — skincare brands, hotels, spas and private label. Volume pricing, recurring orders and custom branding.",
  alternates: { canonical: "/for-business" },
};

export default function ForBusinessPage() {
  return <ForBusinessClient />;
}
