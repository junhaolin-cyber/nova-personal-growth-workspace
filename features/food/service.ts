import type { FoodAnalysis, OfficialRestaurantData, OfficialSourceRecord, RestaurantRecord, RestaurantSearchInput } from "./types";

export interface AmapPoi {
  id?: unknown;
  name?: unknown;
  address?: unknown;
  cityname?: unknown;
  pname?: unknown;
  type?: unknown;
  location?: unknown;
  tel?: unknown;
  biz_ext?: unknown;
  business?: unknown;
  tag?: unknown;
  photos?: unknown;
}

export interface RestaurantSearchResult {
  records: RestaurantRecord[];
  message?: string;
}

export interface RestaurantDetailResult {
  record?: RestaurantRecord;
  message?: string;
}

export interface OfficialEnrichmentResult {
  data?: OfficialRestaurantData;
  source?: OfficialSourceRecord;
  message?: string;
}

const asObject = (value: unknown): Record<string, unknown> => typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
const asText = (value: unknown) => typeof value === "string" && value.trim() && value !== "暂无" ? value.trim() : undefined;
const asNumber = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : typeof value === "string" && value.trim() && Number.isFinite(Number(value)) ? Number(value) : undefined;
const asPhotos = (value: unknown) => Array.isArray(value) ? value.map((photo) => asText(asObject(photo).url)).filter((url): url is string => Boolean(url)) : [];

export function mapAmapPoiToRestaurant(poi: AmapPoi, queriedAt: string): RestaurantRecord | null {
  const id = asText(poi.id);
  const name = asText(poi.name);
  if (!id || !name) return null;
  const locationParts = asText(poi.location)?.split(",").map(Number);
  const bizExt = asObject(poi.biz_ext);
  const business = asObject(poi.business);
  const tags = asText(poi.tag)?.split(",").map((tag) => tag.trim()).filter(Boolean);
  return {
    id: "amap-" + id,
    name,
    address: asText(poi.address) ?? "",
    city: asText(poi.cityname) ?? asText(poi.pname) ?? "",
    status: "considering",
    source: "public-source",
    sourceLabel: "高德地图",
    sourceProvider: "amap",
    sourcePlaceId: id,
    queriedAt,
    phone: asText(poi.tel) ?? asText(business.tel) ?? asText(bizExt.tel),
    category: asText(poi.type),
    openingHours: asText(business.opentime_week) ?? asText(business.opentime_today) ?? asText(bizExt.opentime_week) ?? asText(bizExt.opentime_today),
    location: locationParts?.length === 2 && locationParts.every(Number.isFinite) ? { longitude: locationParts[0], latitude: locationParts[1] } : undefined,
    photos: asPhotos(poi.photos),
    rating: asNumber(business.rating) ?? asNumber(bizExt.rating),
    cost: asNumber(business.cost) ?? asNumber(bizExt.cost),
    tags,
    createdAt: queriedAt,
    updatedAt: queriedAt,
  };
}

export async function searchRestaurants(input: RestaurantSearchInput): Promise<RestaurantSearchResult> {
  const params = new URLSearchParams({ name: input.name.trim(), address: input.address.trim(), city: input.city.trim() });
  try {
    const response = await fetch("/api/food/search?" + params.toString(), { method: "GET", cache: "no-store" });
    const payload = await response.json() as { records?: unknown; message?: unknown };
    const records = Array.isArray(payload.records) ? payload.records.filter((record): record is RestaurantRecord => typeof record === "object" && record !== null && typeof (record as { id?: unknown }).id === "string") : [];
    if (!response.ok) return { records: [], message: typeof payload.message === "string" ? payload.message : "餐厅搜索暂时不可用，请稍后再试。" };
    return { records, message: typeof payload.message === "string" ? payload.message : undefined };
  } catch {
    return { records: [], message: "无法连接餐厅数据服务，请检查本地网络或稍后再试。" };
  }
}

export async function getRestaurantDetails(sourcePlaceId: string): Promise<RestaurantDetailResult> {
  if (!sourcePlaceId.trim()) return { message: "缺少门店 POI ID，无法查询详情。" };
  try {
    const response = await fetch("/api/food/detail?id=" + encodeURIComponent(sourcePlaceId), { method: "GET", cache: "no-store" });
    const payload = await response.json() as { record?: unknown; message?: unknown };
    const record = typeof payload.record === "object" && payload.record !== null && typeof (payload.record as { id?: unknown }).id === "string" ? payload.record as RestaurantRecord : undefined;
    if (!response.ok) return { message: typeof payload.message === "string" ? payload.message : "门店详情暂时不可用，请稍后再试。" };
    return { record, message: typeof payload.message === "string" ? payload.message : undefined };
  } catch {
    return { message: "网络连接异常，暂时无法加载门店详情。" };
  }
}

export async function enrichRestaurantFromOfficialUrl(restaurantId: string, sourceProvider: RestaurantRecord["sourceProvider"], url: string): Promise<OfficialEnrichmentResult> {
  try {
    const response = await fetch("/api/food/official", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantId, sourceProvider, url }),
      cache: "no-store",
    });
    const payload = await response.json() as { officialData?: unknown; officialSource?: unknown; message?: unknown };
    const data = typeof payload.officialData === "object" && payload.officialData !== null ? payload.officialData as OfficialRestaurantData : undefined;
    const source = typeof payload.officialSource === "object" && payload.officialSource !== null ? payload.officialSource as OfficialSourceRecord : undefined;
    const message = typeof payload.message === "string" ? payload.message : response.ok ? undefined : "官网资料暂时无法读取，请稍后重试。";
    return { data, source, message };
  } catch {
    return { message: "网络连接异常，暂时无法读取官网资料。" };
  }
}

export function searchLocalRestaurants(restaurants: RestaurantRecord[], input: RestaurantSearchInput): RestaurantRecord[] {
  const name = input.name.trim().toLowerCase();
  const address = input.address.trim().toLowerCase();
  const city = input.city.trim().toLowerCase();
  return restaurants.filter((restaurant) => {
    const haystack = (restaurant.name + " " + restaurant.address + " " + restaurant.city).toLowerCase();
    return (!name || haystack.includes(name)) && (!address || haystack.includes(address)) && (!city || haystack.includes(city));
  });
}

export function createFoodAnalysis(restaurant: RestaurantRecord): FoodAnalysis {
  const location = [restaurant.city, restaurant.address].filter(Boolean).join(" · ");
  const hasAmapData = restaurant.sourceProvider === "amap";
  const ratingText = typeof restaurant.rating === "number" ? "高德评分 " + restaurant.rating : "暂无评分数据";
  const official = restaurant.officialData;
  const hasOfficialData = Boolean(official && (official.openingHours || official.menuUrl || official.description || official.phone || official.photos || official.activities));
  const officialText = hasOfficialData ? "已补充官网公开资料，并与高德数据分开保存" : "尚未成功提取官网公开资料";
  const missing = [
    !official?.menuUrl ? "公开菜单" : "",
    !restaurant.openingHours && !official?.openingHours ? "营业时间" : "",
    !restaurant.phone && !official?.phone ? "联系电话" : "",
    "评论与真实到店体验",
  ].filter(Boolean).join("、");
  return {
    summary: hasAmapData
      ? "以下分析仅基于高德返回的门店资料，" + officialText + "。当前结果为：" + ratingText + "。" + (location ? "门店位置：" + location + "。" : "") + "高德评分不等同于大众点评评分或其他平台评价。"
      : "目前只有你输入的门店信息，尚未接入可核验的公开餐厅资料。以下内容不代表真实门店结论。",
    suitableFor: ["想先了解门店基础资料的人", "愿意到店后记录真实体验的人"],
    suggestions: [
      restaurant.category ? "先根据门店类型（" + restaurant.category + "）查看官网菜单与营业时间。" : "先查看门店官网菜单与营业时间。",
      "到店前核实官网当前营业时间、菜单和联系方式。",
      "当前建议只基于已验证的高德与官网资料，其余内容需要到店后自行记录。",
    ],
    cautions: [
      hasAmapData ? "高德数据不等同于大众点评评分或评论。" : "暂未有合法可核验的公开餐厅资料。",
      !official?.menuUrl ? "没有公开菜单资料前，不推荐具体菜品。" : "菜单链接已记录，但具体菜品仍需以官网当前页面为准。",
      "没有评论数据，不判断口味、服务、排队或环境体验。",
    ],
    recommendationIndex: hasAmapData && typeof restaurant.rating === "number" ? "高德评分 " + restaurant.rating : "资料有限，暂不评分",
    basis: hasAmapData
      ? "已验证事实：高德查询时间 " + (restaurant.queriedAt ?? "暂无") + "，" + ratingText + "。" + (official?.sourceUrl ? "官网来源 " + official.sourceUrl.value + "，获取时间 " + official.sourceUrl.fetchedAt + "。" : "") + "合理推断：仅根据门店类型与已提供资料给出到店前建议。当前缺失：" + missing + "。"
      : "分析依据：用户输入的门店名称、地址和城市；未调用第三方评论数据。",
  };
}

export function createPublicSearchUrl(platform: "dianping" | "maps" | "amap", restaurant: RestaurantRecord): string {
  const query = encodeURIComponent([restaurant.name, restaurant.city, restaurant.address].filter(Boolean).join(" "));
  if (platform === "dianping") return "https://www.dianping.com/search/keyword/1/0_" + query;
  if (platform === "amap") return "https://www.amap.com/search?query=" + query;
  return "https://www.google.com/maps/search/?api=1&query=" + query;
}
