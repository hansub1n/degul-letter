import type { MetadataRoute } from "next";
import { SITE_URL } from "@/shared/lib/site";

// 마을 주소(/v/코드)는 사람마다 달라서 넣지 않는다. 편지 내용은 어떤 주소에도 없다.
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-11-18");
  return [
    { url: `${SITE_URL}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/privacy`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified, changeFrequency: "yearly", priority: 0.2 },
  ];
}
