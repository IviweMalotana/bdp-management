import type { Metadata } from "next";
import "./globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
import CurrencyInitialiser from "./components/CurrencyInitialiser";

export const metadata: Metadata = {
  title: "be different packaging | cosmetic packaging wholesale",
  description:
    "Premium cosmetic packaging from 10 units. South Africa's home for skincare and hospitality brands.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col" style={{ backgroundColor: "#F5F0E8", color: "#1A1A18" }}>
        <CurrencyInitialiser />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
