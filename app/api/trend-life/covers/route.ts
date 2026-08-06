import { NextResponse } from "next/server";

export const runtime = "nodejs";

type CoverResult = { coverUrl?: string; sourceType?: "og:image" | "twitter:image" | "official-image" };
type CacheEntry = { value: CoverResult; expiresAt: number };

const cache = new Map<string, CacheEntry>();
const pending = new Map<string, Promise<CoverResult>>();
const CACHE_TTL = 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT = 8_000;
const ALLOWED_HOSTS = [
  "nike.com",
  "adidas.com",
  "asics.com",
  "newbalance.com",
  "hoka.com",
  "salomon.com",
  "supreme.com",
  "stussy.com",
  "youtube.com",
  "youtu.be",
];

function isAllowedUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && ALLOWED_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

function readAttributes(tag: string): Record<string, string> {
  return Object.fromEntries(Array.from(tag.matchAll(/([:\w-]+)\s*=\s*["']([^"']*)["']/gi), (match) => [match[1].toLowerCase(), match[2]]));
}

function extractCover(html: string, pageUrl: string): CoverResult {
  const metaTags = Array.from(html.matchAll(/<meta\b[^>]*>/gi), (match) => readAttributes(match[0]));
  const candidates: Array<{ value?: string; sourceType: CoverResult["sourceType"] }> = [];
  for (const attributes of metaTags) {
    const key = (attributes.property ?? attributes.name ?? "").toLowerCase();
    if (key === "og:image" || key === "og:image:url") candidates.push({ value: attributes.content, sourceType: "og:image" });
    if (key === "twitter:image" || key === "twitter:image:src") candidates.push({ value: attributes.content, sourceType: "twitter:image" });
  }
  for (const attributes of Array.from(html.matchAll(/<link\b[^>]*>/gi), (match) => readAttributes(match[0]))) {
    if ((attributes.rel ?? "").toLowerCase().split(/\s+/).includes("image_src")) candidates.push({ value: attributes.href, sourceType: "official-image" });
  }
  for (const candidate of candidates) {
    if (!candidate.value) continue;
    try {
      const decodedValue = candidate.value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
      const imageUrl = new URL(decodedValue, pageUrl);
      if (imageUrl.protocol === "https:" && imageUrl.hostname !== "localhost") return { coverUrl: imageUrl.toString(), sourceType: candidate.sourceType };
    } catch {
      continue;
    }
  }
  return {};
}

async function readCover(sourceUrl: string): Promise<CoverResult> {
  const cached = cache.get(sourceUrl);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const existing = pending.get(sourceUrl);
  if (existing) return existing;
  const task = (async () => {
    try {
      const response = await fetch(sourceUrl, { headers: { Accept: "text/html,application/xhtml+xml", "User-Agent": "NOVA cover discovery" }, signal: AbortSignal.timeout(REQUEST_TIMEOUT), redirect: "follow" });
      if (!response.ok || !isAllowedUrl(response.url)) return {};
      const html = (await response.text()).slice(0, 2_000_000);
      const result = extractCover(html, response.url);
      cache.set(sourceUrl, { value: result, expiresAt: Date.now() + CACHE_TTL });
      return result;
    } catch {
      return {};
    } finally {
      pending.delete(sourceUrl);
    }
  })();
  pending.set(sourceUrl, task);
  return task;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { urls?: unknown };
    const urls = Array.isArray(body.urls) ? [...new Set(body.urls.filter((value): value is string => typeof value === "string" && isAllowedUrl(value)))].slice(0, 40) : [];
    const entries = await Promise.all(urls.map(async (url) => [url, await readCover(url)] as const));
    const covers = Object.fromEntries(entries);
    return NextResponse.json({ covers });
  } catch {
    return NextResponse.json({ covers: {} }, { status: 200 });
  }
}
