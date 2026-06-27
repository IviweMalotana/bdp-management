import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPost, POSTS, type Block } from "../posts";
import { SITE_URL } from "@/app/layout";

// Pre-render every post at build time.
export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: "Article not found" };

  const canonical = `/blog/${slug}`;
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      url: canonical,
      title: post.title,
      description: post.description,
      publishedTime: post.date,
    },
    twitter: { card: "summary_large_image", title: post.title, description: post.description },
  };
}

function renderBlock(block: Block, i: number) {
  if (block.type === "h2") {
    return (
      <h2
        key={i}
        className="text-2xl mt-10 mb-3"
        style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: "#1C1A17" }}
      >
        {block.text}
      </h2>
    );
  }
  if (block.type === "ul") {
    return (
      <ul key={i} className="list-disc pl-5 space-y-2 my-4">
        {block.items.map((item, j) => (
          <li key={j} className="text-sm leading-relaxed" style={{ color: "#4A4540", lineHeight: 1.8 }}>
            {item}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <p key={i} className="text-sm leading-relaxed my-4" style={{ color: "#4A4540", lineHeight: 1.8 }}>
      {block.text}
    </p>
  );
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const canonical = `${SITE_URL}/blog/${slug}`;
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    url: canonical,
    mainEntityOfPage: canonical,
    author: { "@type": "Organization", name: "Be Different Packaging" },
    publisher: {
      "@type": "Organization",
      name: "Be Different Packaging",
      logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.png` },
    },
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: canonical },
    ],
  };

  return (
    <article className="max-w-2xl mx-auto px-4 py-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <nav className="flex items-center gap-2 text-xs mb-8" style={{ color: "#C9B8A8" }}>
        <Link href="/" className="hover:opacity-70 transition-opacity" style={{ color: "#4A4540" }}>
          Home
        </Link>
        <span>/</span>
        <Link href="/blog" className="hover:opacity-70 transition-opacity" style={{ color: "#4A4540" }}>
          Blog
        </Link>
      </nav>

      <p className="text-xs mb-3" style={{ color: "#C9B8A8" }}>
        {new Date(post.date).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}{" "}
        · {post.readMinutes} min read
      </p>
      <h1
        className="text-4xl md:text-5xl mb-6"
        style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: "#1C1A17", lineHeight: 1.15 }}
      >
        {post.title}
      </h1>

      <div>{post.blocks.map(renderBlock)}</div>

      {/* Internal links into shop / category pages */}
      <div className="mt-14 pt-8 border-t" style={{ borderColor: "#E8DDD0" }}>
        <h2 className="text-sm font-medium mb-4" style={{ color: "#1C1A17" }}>
          Explore our packaging
        </h2>
        <ul className="space-y-2">
          {post.related.map((r) => (
            <li key={r.href}>
              <Link
                href={r.href}
                className="text-sm hover:opacity-70 transition-opacity"
                style={{ color: "#4A4540" }}
              >
                {r.label} →
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-12">
        <Link
          href="/blog"
          className="text-sm hover:opacity-70 transition-opacity"
          style={{ color: "#4A4540" }}
        >
          ← All articles
        </Link>
      </div>
    </article>
  );
}
