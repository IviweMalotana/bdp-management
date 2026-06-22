import { Suspense } from "react";
import FinderClient from "./FinderClient";

export const metadata = {
  title: "Find Your Bottle | BDP Management",
  description:
    "Not sure what packaging you need? Answer a few quick questions and we'll point you to the right bottles, jars and droppers for your product.",
};

export default function FinderPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center" style={{ color: "#4A4540" }}>Loading…</div>}>
      <FinderClient />
    </Suspense>
  );
}
