import { Suspense } from "react";
import ShopClient from "./ShopClient";

export const metadata = {
  title: "Shop Packaging — BDP Management",
};

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center" style={{ color: "#4A4540" }}>Loading…</div>}>
      <ShopClient />
    </Suspense>
  );
}
