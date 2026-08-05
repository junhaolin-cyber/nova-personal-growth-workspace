import type { OfficialRestaurantData, SourcedValue } from "./types";

interface JsonLdObject {
  [key: string]: unknown;
}

export interface OfficialExtractionResult {
  data?: OfficialRestaurantData;
  message: string;
}

const asObject = (value: unknown): JsonLdObject | undefined => typeof value === "object" && value !== null ? value as JsonLdObject : undefined;
const asText = (value: unknown): string | undefined => typeof value === "string" && value.trim() ? value.trim() : undefined;
const cleanText = (value: string) => value.replace(/\s+/g, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").trim();
const sourceNameFromUrl = (pageUrl: string) => { try { return new URL(pageUrl).hostname; } catch { return "官网页面"; } };

function createSourcedValue<T>(value: T, pageUrl: string, fetchedAt: string, confidence: SourcedValue<T>["confidence"]): SourcedValue<T> {
  return { value, sourceName: sourceNameFromUrl(pageUrl), sourceUrl: pageUrl, fetchedAt, isExplicitFact: true, confidence };
}

function readMeta(html: string, key: string): string | undefined {
  const escapedKey = key.replace(/[.*+?^()|[\]\\]/g, "\\$&");
  const attributeFirstPattern = new RegExp("<meta\\s+[^>]*(?:name|property)=[\"']" + escapedKey + "[\"'][^>]*content=[\"']([^\"']+)[\"'][^>]*>", "i");
  const contentFirstPattern = new RegExp("<meta\\s+[^>]*content=[\"']([^\"']+)[\"'][^>]*(?:name|property)=[\"']" + escapedKey + "[\"'][^>]*>", "i");
  const match = html.match(attributeFirstPattern) ?? html.match(contentFirstPattern);
  return match?.[1] ? cleanText(match[1]) : undefined;
}

function parseJsonLd(html: string): JsonLdObject[] {
  const objects: JsonLdObject[] = [];
  const pattern = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(pattern)) {
    try {
      const parsed: unknown = JSON.parse(match[1].trim());
      const values = Array.isArray(parsed) ? parsed : [parsed];
      values.forEach((value) => {
        const object = asObject(value);
        if (object) objects.push(object);
        const graph = object?.["@graph"];
        if (Array.isArray(graph)) graph.forEach((item) => {
          const graphObject = asObject(item);
          if (graphObject) objects.push(graphObject);
        });
      });
    } catch {
      // 忽略无法解析的结构化数据，不影响其他来源的公开资料。
    }
  }
  return objects;
}

function hasType(object: JsonLdObject, typeName: string): boolean {
  const type = object["@type"];
  return Array.isArray(type) ? type.some((item) => item === typeName) : type === typeName;
}

function firstText(objects: JsonLdObject[], key: string): { value: string; confidence: SourcedValue<string>["confidence"] } | undefined {
  for (const object of objects) {
    const value = asText(object[key]);
    if (value) return { value: cleanText(value), confidence: "high" };
  }
  return undefined;
}

function firstUrl(objects: JsonLdObject[], key: string, pageUrl: string): { value: string; confidence: SourcedValue<string>["confidence"] } | undefined {
  for (const object of objects) {
    const raw = asText(object[key]);
    if (!raw) continue;
    try { return { value: new URL(raw, pageUrl).toString(), confidence: "high" }; } catch { /* 忽略无效链接 */ }
  }
  return undefined;
}

function firstImages(objects: JsonLdObject[], pageUrl: string): string[] {
  for (const object of objects) {
    const raw = object.image;
    const values = Array.isArray(raw) ? raw : [raw];
    const urls = values.flatMap((item) => {
      const value = asText(item) ?? asText(asObject(item)?.url);
      if (!value) return [];
      try { return [new URL(value, pageUrl).toString()]; } catch { return []; }
    });
    if (urls.length) return Array.from(new Set(urls)).slice(0, 6);
  }
  return [];
}

function readOpeningHours(objects: JsonLdObject[]): string | undefined {
  const direct = firstText(objects, "openingHours");
  if (direct) return direct.value;
  for (const object of objects) {
    const specifications = object.openingHoursSpecification;
    if (!Array.isArray(specifications)) continue;
    const values = specifications.map((item) => {
      const specification = asObject(item);
      if (!specification) return undefined;
      const days = Array.isArray(specification.dayOfWeek) ? specification.dayOfWeek.join("、") : asText(specification.dayOfWeek);
      const opens = asText(specification.opens);
      const closes = asText(specification.closes);
      return [days, opens && closes ? opens + "-" + closes : opens ?? closes].filter(Boolean).join(" ");
    }).filter((value): value is string => Boolean(value));
    if (values.length) return values.join("；");
  }
  return undefined;
}

function readMenuLink(html: string, pageUrl: string): { value: string; confidence: SourcedValue<string>["confidence"] } | undefined {
  const pattern = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(pattern)) {
    const label = cleanText(match[2].replace(/<[^>]+>/g, " "));
    if (!/(菜单|menu|餐单|food|carta)/i.test(label)) continue;
    try { return { value: new URL(match[1], pageUrl).toString(), confidence: "medium" }; } catch { /* 忽略无效链接 */ }
  }
  return undefined;
}

function readEvent(objects: JsonLdObject[]): string | undefined {
  for (const object of objects) {
    if (!hasType(object, "Event")) continue;
    const name = asText(object.name);
    const description = asText(object.description);
    if (name && description) return cleanText(name) + "：" + cleanText(description);
    if (name) return cleanText(name);
  }
  return undefined;
}

export function extractOfficialRestaurantData(html: string, pageUrl: string, fetchedAt: string): OfficialExtractionResult {
  const objects = parseJsonLd(html);
  const sourceName = sourceNameFromUrl(pageUrl);
  const sourceUrl = createSourcedValue(pageUrl, pageUrl, fetchedAt, "high");
  const openingHours = readOpeningHours(objects);
  const menu = firstUrl(objects, "menu", pageUrl) ?? readMenuLink(html, pageUrl);
  const description = firstText(objects, "description") ?? (() => {
    const meta = readMeta(html, "description");
    return meta ? { value: meta, confidence: "medium" as const } : undefined;
  })();
  const phone = firstText(objects, "telephone");
  const images = firstImages(objects, pageUrl);
  const ogImage = readMeta(html, "og:image");
  const photos = images.length ? { value: images, confidence: "high" as const } : ogImage ? { value: [ogImage], confidence: "medium" as const } : undefined;
  const activities = readEvent(objects);
  const data: OfficialRestaurantData = {
    sourceUrl,
    ...(openingHours ? { openingHours: createSourcedValue(openingHours, pageUrl, fetchedAt, "high") } : {}),
    ...(menu ? { menuUrl: createSourcedValue(menu.value, pageUrl, fetchedAt, menu.confidence) } : {}),
    ...(description ? { description: createSourcedValue(description.value, pageUrl, fetchedAt, description.confidence) } : {}),
    ...(phone ? { phone: createSourcedValue(phone.value, pageUrl, fetchedAt, phone.confidence) } : {}),
    ...(photos ? { photos: createSourcedValue(photos.value, pageUrl, fetchedAt, photos.confidence) } : {}),
    ...(activities ? { activities: createSourcedValue(activities, pageUrl, fetchedAt, "high") } : {}),
  };
  const extractedCount = Object.keys(data).length - 1;
  return extractedCount > 0
    ? { data, message: "已从 " + sourceName + " 提取到 " + extractedCount + " 项可验证资料。" }
    : { message: "没有提取到可验证资料，请确认链接是公开官网页面。" };
}
