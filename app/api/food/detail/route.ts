import { NextResponse } from "next/server";
import { mapAmapPoiToRestaurant, type AmapPoi } from "@/features/food/service";

const AMAP_DETAIL_URL = "https://restapi.amap.com/v3/place/detail";

function jsonError(message: string, status: number) {
  return NextResponse.json({ record: null, message }, { status });
}

export async function GET(request: Request) {
  const apiKey = process.env.AMAP_WEB_SERVICE_KEY;
  if (!apiKey) return jsonError("尚未配置高德地图 Web 服务 API Key。请在 .env.local 中配置 AMAP_WEB_SERVICE_KEY。", 503);

  const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";
  if (!id || id.length > 80) return jsonError("缺少有效的门店 POI ID。", 400);

  const searchParams = new URLSearchParams({ key: apiKey, id, extensions: "all", output: "json" });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  const requestTimeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("AMAP_REQUEST_TIMEOUT")), 8000));
  try {
    const response = await Promise.race([
      fetch(`${AMAP_DETAIL_URL}?${searchParams.toString()}`, { signal: controller.signal, cache: "no-store" }),
      requestTimeout,
    ]);
    if (!response.ok) return jsonError("高德门店详情服务暂时不可用。", 502);
    const payload = await response.json() as { status?: unknown; infocode?: unknown; pois?: unknown };
    if (payload.status !== "1" || (payload.infocode && String(payload.infocode) !== "10000")) return jsonError("高德暂时没有返回该门店详情。", 404);
    const queriedAt = new Date().toISOString();
    const poi = Array.isArray(payload.pois) ? payload.pois[0] : undefined;
    const record = mapAmapPoiToRestaurant(poi as AmapPoi, queriedAt);
    return record ? NextResponse.json({ record, message: "门店详情已更新。" }) : jsonError("没有找到对应的真实门店。", 404);
  } catch (error) {
    const message = error instanceof Error && (error.name === "AbortError" || error.message === "AMAP_REQUEST_TIMEOUT") ? "门店详情服务响应超时，请稍后重试。" : "网络连接异常，暂时无法加载门店详情。";
    return jsonError(message, 502);
  } finally {
    clearTimeout(timeout);
  }
}
