import type { Metadata } from "next";
import ContactClient from "./ContactClient";

export const metadata: Metadata = {
  title: "Contact Us | Cosmetic Packaging South Africa",
  description:
    "Get in touch with Be Different Packaging for cosmetic bottles, jars and custom branding in South Africa. Questions on orders, pricing or customisation — we're happy to help.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return <ContactClient />;
}
