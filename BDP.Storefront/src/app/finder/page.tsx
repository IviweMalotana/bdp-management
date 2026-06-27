import { Suspense } from "react";
import FinderClient from "./FinderClient";

export const metadata = {
  title: "Packaging Finder — Choose the Right Cosmetic Bottle or Jar",
  description:
    "Not sure what packaging you need? Answer a few quick questions and we'll point you to the right cosmetic bottles, jars and droppers for your skincare product.",
  alternates: { canonical: "/finder" },
};

export default function FinderPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center" style={{ color: "#4A4540" }}>Loading…</div>}>
      <FinderClient />
    </Suspense>
  );
}
