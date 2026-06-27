import { Suspense } from "react";
import ShopClient from "./ShopClient";

export const metadata = {
  title: "Buy Cosmetic Bottles & Jars Wholesale South Africa",
  description:
    "Shop cosmetic bottles, jars, droppers, pump and spray packaging wholesale in South Africa — from 10 units. Live tiered pricing, custom branding and fast delivery.",
  alternates: { canonical: "/shop" },
};

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center" style={{ color: "#4A4540" }}>Loading…</div>}>
      <ShopClient />
    </Suspense>
  );
}
