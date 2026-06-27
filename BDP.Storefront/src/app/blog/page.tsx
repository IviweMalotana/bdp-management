import type { Metadata } from "next";
import Link from "next/link";
import { POSTS } from "./posts";
import { SITE_URL } from "@/app/layout";

export const metadata: Metadata = {
  title: "Cosmetic Packaging Blog | Guides for Skincare Brands",
  description:
    "Guides on choosing cosmetic packaging in South Africa — bottle materials, jar sizes, MOQs and branding for skincare brands, startups and spas.",
  alternates: { canonical: "/blog" },
};

export default function BlogIndexPage() {
  const blogLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Be Different Packaging Blog",
    url: `${SITE_URL}/blog`,
    blogPost: POSTS.map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      url: `${SITE_URL}/blog/${p.slug}`,
      datePublished: p.date,
      description: p.description,
    })),
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogLd) }}
      />

      <header className="mb-14 max-w-2xl">
        <h1
          className="text-5xl md:text-6xl mb-4"
          style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: "#1C1A17" }}
        >
          the journal
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: "#4A4540", lineHeight: 1.8 }}>
          Practical guides on cosmetic packaging for South African skincare brands — choosing
          bottles and jars, materials, sizes, minimum orders and branding.
        </p>
      </header>

      <div className="space-y-10">
        {POSTS.map((post) => (
          <article key={post.slug} className="border-b pb-10" style={{ borderColor: "#E8DDD0" }}>
            <p className="text-xs mb-2" style={{ color: "#C9B8A8" }}>
              {new Date(post.date).toLocaleDateString("en-ZA", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}{" "}
              · {post.readMinutes} min read
            </p>
            <h2 className="text-2xl mb-3" style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: "#1C1A17" }}>
              <Link href={`/blog/${post.slug}`} className="hover:opacity-70 transition-opacity">
                {post.title}
              </Link>
            </h2>
            <p className="text-sm leading-relaxed mb-4" style={{ color: "#4A4540", lineHeight: 1.8 }}>
              {post.excerpt}
            </p>
            <Link
              href={`/blog/${post.slug}`}
              className="text-sm font-medium hover:opacity-70 transition-opacity"
              style={{ color: "#1C1A17" }}
            >
              Read more →
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
