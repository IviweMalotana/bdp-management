import type { Metadata } from "next";
import CustomiseClient from "./CustomiseClient";

export const metadata: Metadata = {
  title: "Custom Branded Cosmetic Packaging South Africa | Logo Printing",
  description:
    "Add your logo to cosmetic bottles and jars in South Africa — silk screen, hot stamping and colour change. Custom branded packaging from low minimums.",
  alternates: { canonical: "/customise" },
};

export default function CustomisePage() {
  return <CustomiseClient />;
}
