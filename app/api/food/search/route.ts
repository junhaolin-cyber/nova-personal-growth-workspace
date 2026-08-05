import { NextResponse } from "next/server";
import { mapAmapPoiToRestaurant, type AmapPoi } from "@/features/food/service";

const AMAP_SEARCH_URL = "https://restapi.amap.com/v3/place/text";

function jsonError(message: string, status: number) {
  return NextResponse.json({ records: [], message }, { status });
}

function normalizeSearchText(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
}

function matchesRestaurantName(record: NonNullable<ReturnType<typeof mapAmapPoiToRestaurant>>, query: string) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;
  const searchableText = [record.name, record.address, record.category, ...(record.tags ?? [])].filter((value): value is string => Boolean(value)).map(normalizeSearchText);
  return searchableText.some((value) => value.includes(normalizedQuery));
}

export async function GET(request: Request) {
  const apiKey = process.env.AMAP_WEB_SERVICE_KEY;
  if (!apiKey) return jsonError("尚未配置高德地图 Web 服务 API Key。请在 .env.local 中配置 AMAP_WEB_SERVICE_KEY。", 503);

  const url = new URL(request.url);
  const name = (url.searchParams.get("name") ?? "").trim();
  const address = (url.searchParams.get("address") ?? "").trim();
  const city = (url.searchParams.get("city") ?? "").trim();
  if (!name) return jsonError("请输入餐厅名称。", 400);
  if (name.length > 80 || address.length > 120 || city.length > 40) return jsonError("搜索内容过长，请适当缩短后重试。", 400);

  const searchParams = new URLSearchParams({ key: apiKey, keywords: [name, address].filter(Boolean).join(" "), types: "050000", extensions: "all", offset: "20", page: "1", output: "json" });
  if (city) { searchParams.set("city", city); searchParams.set("citylimit", "true"); }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  const requestTimeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("AMAP_REQUEST_TIMEOUT")), 8000));
  try {
    const response = await Promise.race([
      fetch(`${AMAP_SEARCH_URL}?${searchParams.toString()}`, { signal: controller.signal, cache: "no-store" }),
      requestTimeout,
    ]);
    if (!response.ok) return jsonError("高德餐厅数据服务暂时不可用。", 502);
    const payload = await response.json() as { status?: unknown; info?: unknown; infocode?: unknown; pois?: unknown };
    if (payload.status !== "1" || (payload.infocode && payload.infocode !== "10000")) return jsonError("高德没有返回可用的餐厅资料，请稍后重试。", 502);
    const queriedAt = new Date().toISOString();
    const records = Array.isArray(payload.pois)
      ? payload.pois
        .map((poi) => mapAmapPoiToRestaurant(poi as AmapPoi, queriedAt))
        .filter((record): record is NonNullable<typeof record> => record !== null && matchesRestaurantName(record, name))
      : [];
    return NextResponse.json({ records, message: records.length ? `已找到 ${records.length} 家候选门店。` : "高德暂未找到匹配门店，请补充城市或地址。" });
  } catch (error) {
    const message = error instanceof Error && (error.name === "AbortError" || error.message === "AMAP_REQUEST_TIMEOUT") ? "餐厅数据服务响应超时，请稍后重试。" : "网络连接异常，暂时无法连接高德餐厅数据服务。";
    return jsonError(message, 502);
  } finally {
    clearTimeout(timeout);
  }
}
