import type { Metadata } from "next";
import TrackClient from "./TrackClient";

export const metadata: Metadata = {
  title: "Track Your Order",
  description: "Enter your order number and email to track your Be Different Packaging order.",
  alternates: { canonical: "/track" },
};

export default function TrackPage() {
  return <TrackClient />;
}
