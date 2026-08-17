export function getDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDateValue(value: string) {
  const normalized = value.trim();
  if (!normalized) return null;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(normalized)
    ? new Date(`${normalized}T12:00:00`)
    : new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function addDays(dateKey: string, days: number) {
  const date = parseDateValue(dateKey);
  if (!date) return dateKey;
  date.setDate(date.getDate() + days);
  return getDateKey(date);
}

export function formatDateLabel(dateKey: string, locale = "zh-CN") {
  const date = parseDateValue(dateKey);
  if (!date) return "日期未知";
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "long", day: "numeric", weekday: "long" }).format(date);
}

export function formatMonthDay(dateValue: string, locale = "zh-CN") {
  const date = parseDateValue(dateValue);
  if (!date) return "日期未知";
  return new Intl.DateTimeFormat(locale, { month: "numeric", day: "numeric" }).format(date);
}
