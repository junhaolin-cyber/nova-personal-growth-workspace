import { normalizeArticle } from "../normalizer";
import { isSafeHttpUrl } from "../validation";
import type { NewsArticle, NewsCategory, NewsSource } from "../types";

function decodeXml(value: string): string {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

function tagValue(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeXml(match[1]).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() : "";
}

function rssImage(block: string): string | undefined {
  const match = block.match(/<(?:media:content|enclosure)(?:[^>]*url=["']([^"']+)["'][^>]*)\/?\s*>/i);
  return match?.[1];
}

function rssItems(xml: string): string[] { return [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map((match) => match[1]); }

function categoryFromSource(source: NewsSource): NewsCategory { return source.categories[0] ?? "其他"; }

export async function fetchRssArticles(source: NewsSource): Promise<NewsArticle[]> {
  if (!source.rssUrl || !isSafeHttpUrl(source.rssUrl)) throw new Error("RSS 地址不安全或格式无效");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(source.rssUrl, { signal: controller.signal, cache: "no-store", headers: { Accept: "application/rss+xml, application/xml, text/xml" } });
    if (!response.ok) throw new Error(`RSS ${response.status}`);
    const xml = await response.text();
    const fetchedAt = new Date().toISOString();
    return rssItems(xml).map((block) => normalizeArticle({
      sourceId: source.id,
      sourceName: source.name,
      sourceUrl: source.rssUrl,
      title: tagValue(block, "title"),
      link: tagValue(block, "link"),
      description: tagValue(block, "description") || tagValue(block, "content:encoded"),
      publishedAt: tagValue(block, "pubDate") || tagValue(block, "dc:date"),
      imageUrl: rssImage(block),
      category: categoryFromSource(source),
      language: source.language,
      sourcecountry: source.countryOrRegion,
    }, fetchedAt)).filter((item): item is NewsArticle => Boolean(item));
  } finally {
    clearTimeout(timeout);
  }
}
