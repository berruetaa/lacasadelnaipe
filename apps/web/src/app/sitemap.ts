import type { MetadataRoute } from "next";
import publicIndex from "../../../../data/catalog/public-index.json";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return [
    {
      url: baseUrl,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${baseUrl}/catalogo`,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...publicIndex.map((reference) => ({
      url: `${baseUrl}/catalogo/${reference.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
