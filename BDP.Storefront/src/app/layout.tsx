import type { Metadata } from "next";
import "./globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
import CartDrawer from "./components/CartDrawer";
import CurrencyInitialiser from "./components/CurrencyInitialiser";

export const SITE_URL = "https://www.bedifferentpackaging.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Cosmetic Packaging South Africa | From 10 Units | Be Different Packaging",
    template: "%s | Be Different Packaging",
  },
  description:
    "Buy cosmetic bottles, jars, droppers, pumps and sprays wholesale in South Africa — from just 10 units. Premium skincare and hospitality packaging with live tiered pricing and custom branding.",
  applicationName: "Be Different Packaging",
  keywords: [
    "cosmetic packaging south africa",
    "cosmetic bottles south africa",
    "cosmetic jars wholesale south africa",
    "glass dropper bottles south africa",
    "airless pump bottles south africa",
    "serum bottles south africa",
    "skincare packaging south africa",
    "no minimum order cosmetic packaging",
  ],
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "en_ZA",
    siteName: "Be Different Packaging",
    title: "Cosmetic Packaging South Africa | From 10 Units",
    description:
      "Premium cosmetic and skincare packaging wholesale in South Africa — bottles, jars, droppers, pumps. From 10 units, with custom branding.",
    images: ["/logo.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cosmetic Packaging South Africa | From 10 Units",
    description:
      "Premium cosmetic and skincare packaging wholesale in South Africa — from 10 units, with custom branding.",
    images: ["/logo.png"],
  },
};

const organizationLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Be Different Packaging",
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  description:
    "Premium cosmetic and skincare packaging supplier in South Africa — bottles, jars, droppers, pumps and sprays, wholesale from 10 units with custom branding.",
  areaServed: "ZA",
  sameAs: [
    "https://www.instagram.com/bedifferentpackaging",
    "https://www.tiktok.com/@bedifferentpackaging",
  ],
};

const websiteLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Be Different Packaging",
  url: SITE_URL,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col" style={{ backgroundColor: "#F5F0E8", color: "#1A1A18" }}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }}
        />
        <CurrencyInitialiser />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <CartDrawer />
      </body>
    </html>
  );
}
