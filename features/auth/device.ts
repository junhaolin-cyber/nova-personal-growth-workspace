const DEVICE_ID_PREFIX = "nova:auth:device-id:v1:";

export type DeviceInfo = {
  deviceName: string;
  deviceType: "desktop" | "mobile";
  platform: string;
};

function createDeviceId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  const hex = (length: number) => Array.from({ length }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  return `${hex(8)}-${hex(4)}-4${hex(3)}-${(8 + Math.floor(Math.random() * 4)).toString(16)}${hex(3)}-${hex(12)}`;
}

export function getOrCreateDeviceId(userId: string): string {
  const storageKey = `${DEVICE_ID_PREFIX}${userId}`;
  if (typeof window === "undefined") return createDeviceId();

  try {
    const existing = window.localStorage.getItem(storageKey);
    if (existing) return existing;
    const nextId = createDeviceId();
    window.localStorage.setItem(storageKey, nextId);
    return nextId;
  } catch {
    return createDeviceId();
  }
}

export function getCurrentDeviceInfo(): DeviceInfo {
  if (typeof navigator === "undefined") {
    return { deviceName: "NOVA 网页端", deviceType: "desktop", platform: "未知平台" };
  }

  const userAgent = navigator.userAgent;
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);
  let platform = "其他平台";
  if (/Windows/i.test(userAgent)) platform = "Windows";
  else if (/Android/i.test(userAgent)) platform = "Android";
  else if (/iPhone|iPad|iPod/i.test(userAgent)) platform = "iOS";
  else if (/Mac OS X/i.test(userAgent)) platform = "macOS";
  else if (/Linux/i.test(userAgent)) platform = "Linux";

  return {
    deviceName: isMobile ? `NOVA 移动端 · ${platform}` : `NOVA 网页端 · ${platform}`,
    deviceType: isMobile ? "mobile" : "desktop",
    platform,
  };
}
