import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { NextResponse } from "next/server";
import { extractOfficialRestaurantData } from "@/features/food/officialSite";
import type { OfficialSourceRecord } from "@/features/food/types";

const FETCH_TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 3;
const MAX_BODY_BYTES = 1024 * 1024;
const BLOCKED_EXTERNAL_HOSTS = ["dianping.com", "xiaohongshu.com", "douyin.com", "google.com", "google.com.hk"];

class OfficialFetchError extends Error {}

function jsonError(message: string, status: number, officialSource?: OfficialSourceRecord) {
  return NextResponse.json({ officialData: null, officialSource: officialSource ?? null, message, canOpenUrl: Boolean(officialSource?.sourceUrl) }, { status });
}

function isPrivateIpv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [first, second] = parts;
  return first === 0 || first === 10 || first === 127 || (first === 169 && second === 254) || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168) || (first === 100 && second >= 64 && second <= 127) || (first === 192 && second === 0) || (first === 198 && (second === 18 || second === 19)) || first >= 224;
}

function isPrivateIp(address: string): boolean {
  const normalized = address.toLowerCase();
  const version = isIP(normalized);
  if (version === 4) return isPrivateIpv4(normalized);
  if (version !== 6) return true;
  if (normalized.includes(".")) {
    const ipv4Part = normalized.slice(normalized.lastIndexOf(":") + 1);
    if (isPrivateIpv4(ipv4Part)) return true;
  }
  return normalized === "::" || normalized === "::1" || normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb") || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("ff") || normalized.startsWith("2001:db8");
}

function normalizeHostname(hostname: string): string {
  return hostname.replace(/^\[/, "").replace(/\]$/, "").replace(/\.$/, "").toLowerCase();
}

function isBlockedExternalHost(hostname: string): boolean {
  return BLOCKED_EXTERNAL_HOSTS.some((blockedHost) => hostname === blockedHost || hostname.endsWith("." + blockedHost));
}

async function validateExternalUrl(rawUrl: string): Promise<{ url?: URL; message?: string }> {
  if (rawUrl.length > 2048) return { message: "官网链接过长，请检查后重试。" };
  let url: URL;
  try { url = new URL(rawUrl); } catch { return { message: "链接格式错误，请输入以 http:// 或 https:// 开头的官网链接。" }; }
  if (url.protocol !== "http:" && url.protocol !== "https:") return { message: "链接格式错误，只允许使用 http 或 https。" };
  if (url.username || url.password) return { message: "为了安全起见，不支持包含账号或密码的链接。" };
  if (url.port && url.port !== "80" && url.port !== "443") return { message: "为了安全起见，只支持标准网页端口。" };
  const hostname = normalizeHostname(url.hostname);
  if (!hostname || hostname === "localhost" || hostname.endsWith(".local") || hostname.endsWith(".internal") || hostname.endsWith(".lan") || hostname.endsWith(".home.arpa")) return { message: "为了安全起见，不允许读取本机、局域网或内网地址。" };
  if (isBlockedExternalHost(hostname)) return { message: "当前不读取第三方平台内容，请提供餐厅或品牌官网链接。" };
  if (isIP(hostname)) return isPrivateIp(hostname) ? { message: "为了安全起见，不允许读取本机、局域网或内网地址。" } : { url };
  try {
    const addresses = await lookup(hostname, { all: true, verbatim: true });
    if (!addresses.length || addresses.some((address) => isPrivateIp(address.address))) return { message: "为了安全起见，不允许读取解析到内网的地址。" };
  } catch {
    return { message: "页面无法访问，请检查官网链接是否有效。" };
  }
  return { url };
}

async function readLimitedBody(response: Response): Promise<string> {
  if (!response.body) throw new OfficialFetchError("页面无法访问，未返回网页内容。");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      total += result.value.byteLength;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new OfficialFetchError("网页内容过大，暂不读取该页面。");
      }
      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  chunks.forEach((chunk) => { bytes.set(chunk, offset); offset += chunk.byteLength; });
  return new TextDecoder().decode(bytes);
}

async function fetchPublicPage(initialUrl: URL): Promise<{ html: string; finalUrl: string }> {
  let currentUrl = initialUrl;
  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const validation = await validateExternalUrl(currentUrl.toString());
    if (!validation.url) throw new OfficialFetchError(validation.message ?? "链接格式错误。");
    currentUrl = validation.url;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(currentUrl, {
        redirect: "manual",
        signal: controller.signal,
        cache: "no-store",
        headers: { Accept: "text/html,application/xhtml+xml", "User-Agent": "NOVA-Food-Source-Reader/1.0" },
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw new OfficialFetchError("页面读取超时，请稍后重试。");
      throw new OfficialFetchError("页面无法访问，请检查网络或官网链接。");
    } finally {
      clearTimeout(timeout);
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirectCount === MAX_REDIRECTS) throw new OfficialFetchError("页面跳转次数过多，暂不读取该页面。");
      try { currentUrl = new URL(location, currentUrl); } catch { throw new OfficialFetchError("页面跳转链接无效。"); }
      continue;
    }
    if (response.status === 401 || response.status === 403 || response.status === 429) throw new OfficialFetchError("网站阻止读取或页面需要登录。");
    if (!response.ok) throw new OfficialFetchError("页面无法访问，网站返回了错误状态。");
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (contentType && !contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) throw new OfficialFetchError("该链接不是可读取的公开网页。");
    return { html: await readLimitedBody(response), finalUrl: currentUrl.toString() };
  }
  throw new OfficialFetchError("页面跳转次数过多，暂不读取该页面。");
}

function createSource(url: string, status: OfficialSourceRecord["status"], fetchedAt: string, message?: string): OfficialSourceRecord {
  let sourceName = "官网页面";
  try { sourceName = new URL(url).hostname; } catch { /* 保留默认名称 */ }
  return { sourceName, sourceUrl: url, fetchedAt, status, ...(message ? { message } : {}) };
}

export async function POST(request: Request) {
  let body: { restaurantId?: unknown; sourceProvider?: unknown; url?: unknown };
  try { body = await request.json() as { restaurantId?: unknown; sourceProvider?: unknown; url?: unknown }; } catch { return jsonError("请求内容格式错误。", 400); }
  if (typeof body.restaurantId !== "string" || !body.restaurantId.trim() || body.sourceProvider !== "amap") return jsonError("请先选择一条真实的高德门店，再添加官网资料。", 400);
  if (typeof body.url !== "string" || !body.url.trim()) return jsonError("请先输入官网链接。", 400);
  const validation = await validateExternalUrl(body.url.trim());
  if (!validation.url) return jsonError(validation.message ?? "链接格式错误。", 400);
  const fetchedAt = new Date().toISOString();
  try {
    const page = await fetchPublicPage(validation.url);
    const extraction = extractOfficialRestaurantData(page.html, page.finalUrl, fetchedAt);
    const officialSource = createSource(page.finalUrl, "success", fetchedAt, extraction.message);
    return NextResponse.json({ officialData: extraction.data ?? null, officialSource, message: extraction.message, canOpenUrl: true });
  } catch (error) {
    const message = error instanceof OfficialFetchError ? error.message : "页面读取失败，请稍后重试。";
    const officialSource = createSource(validation.url.toString(), "failed", fetchedAt, message);
    return jsonError(message, 502, officialSource);
  }
}
