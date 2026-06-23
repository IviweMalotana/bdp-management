import type { Metadata } from "next";
import TrackClient from "./TrackClient";

export const metadata: Metadata = {
  title: "Track Your Order — BDP",
  description: "Enter your order number and email to track your BDP packaging order.",
};

export default function TrackPage() {
  return <TrackClient />;
}
