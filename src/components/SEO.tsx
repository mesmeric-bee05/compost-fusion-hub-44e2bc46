import { Helmet } from "react-helmet-async";

interface SEOProps {
  title: string;
  description: string;
  canonicalPath?: string;
  image?: string;
  type?: "website" | "article" | "product";
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  noindex?: boolean;
}

/**
 * Renders <head> SEO tags for a page.
 * Keep title <60 chars and description <160 chars for best results.
 */
export default function SEO({
  title,
  description,
  canonicalPath,
  image,
  type = "website",
  jsonLd,
  noindex,
}: SEOProps) {
  const truncatedTitle = title.length > 60 ? title.slice(0, 57) + "…" : title;
  const truncatedDesc = description.length > 160 ? description.slice(0, 157) + "…" : description;
  const canonical = canonicalPath ?? (typeof window !== "undefined" ? window.location.pathname : "/");
  const jsonLdArray = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{truncatedTitle}</title>
      <meta name="description" content={truncatedDesc} />
      <link rel="canonical" href={canonical} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}

      <meta property="og:title" content={truncatedTitle} />
      <meta property="og:description" content={truncatedDesc} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonical} />
      {image && <meta property="og:image" content={image} />}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={truncatedTitle} />
      <meta name="twitter:description" content={truncatedDesc} />
      {image && <meta name="twitter:image" content={image} />}

      {jsonLdArray.map((ld, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(ld)}</script>
      ))}
    </Helmet>
  );
}
