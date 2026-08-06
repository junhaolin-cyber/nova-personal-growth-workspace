import type { TrendItem } from "./types";

type PlaceholderVisual = {
  name: string;
  monogram: string;
  background: string;
  surface: string;
  foreground: string;
  accent: string;
  motif: "sweep" | "bars" | "blocks" | "rings" | "mountain" | "box" | "brush" | "editorial";
};

const brandVisuals: Record<string, PlaceholderVisual> = {
  nike: { name: "NIKE", monogram: "N", background: "#171719", surface: "#2A2A2D", foreground: "#FFFFFF", accent: "#F26B38", motif: "sweep" },
  adidas: { name: "adidas", monogram: "a", background: "#DCE7F5", surface: "#F5F8FD", foreground: "#1D2B41", accent: "#476A9C", motif: "bars" },
  "new balance": { name: "NEW BALANCE", monogram: "NB", background: "#DDEDEF", surface: "#F7FCFC", foreground: "#234C58", accent: "#3B8490", motif: "blocks" },
  asics: { name: "ASICS", monogram: "A", background: "#E9E5F8", surface: "#FBFAFF", foreground: "#40386C", accent: "#7768B5", motif: "rings" },
  hoka: { name: "HOKA", monogram: "H", background: "#E2F0E1", surface: "#F9FFF8", foreground: "#31583C", accent: "#5D9A68", motif: "rings" },
  salomon: { name: "SALOMON", monogram: "S", background: "#F2E6D1", surface: "#FFFCF5", foreground: "#5D4527", accent: "#B6813D", motif: "mountain" },
  supreme: { name: "SUPREME", monogram: "S", background: "#F2D9DD", surface: "#FFF8F8", foreground: "#6C2634", accent: "#C74C5F", motif: "box" },
  stussy: { name: "STÜSSY", monogram: "S", background: "#E9DDF0", surface: "#FCF8FF", foreground: "#533A64", accent: "#9865B4", motif: "brush" },
};

const kindVisuals: Record<TrendItem["kind"], PlaceholderVisual> = {
  trend: { name: "NOVA TREND", monogram: "N", background: "#E8E5FB", surface: "#FAF8FF", foreground: "#433A78", accent: "#7968C7", motif: "editorial" },
  new: { name: "NEW DROP", monogram: "＋", background: "#F7E6E1", surface: "#FFF9F7", foreground: "#713F35", accent: "#C87862", motif: "blocks" },
  outfit: { name: "NOVA STYLE", monogram: "✦", background: "#E4EFEA", surface: "#F9FFFC", foreground: "#315947", accent: "#5C9A78", motif: "sweep" },
  article: { name: "STYLE NOTES", monogram: "A", background: "#E6EDF4", surface: "#FAFCFF", foreground: "#344B61", accent: "#6F94B5", motif: "editorial" },
  video: { name: "WATCH LIST", monogram: "▶", background: "#F1E8F6", surface: "#FEFAFF", foreground: "#573B68", accent: "#9A6CB1", motif: "rings" },
};

function escapeXml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&apos;", '"': "&quot;" })[character] ?? character);
}

function findBrandVisual(item: TrendItem): PlaceholderVisual {
  const identity = `${item.brand ?? ""} ${item.sourceName}`.toLowerCase();
  const brandKey = Object.keys(brandVisuals).find((key) => identity.includes(key));
  return brandKey ? brandVisuals[brandKey] : kindVisuals[item.kind];
}

function renderMotif(visual: PlaceholderVisual): string {
  if (visual.motif === "sweep") return `<path d="M410 40C500 92 530 174 442 232C387 268 330 256 288 224" fill="none" stroke="${visual.accent}" stroke-linecap="round" stroke-width="22" opacity=".9"/>`;
  if (visual.motif === "bars") return `<g fill="${visual.accent}" opacity=".92"><path d="M404 66h34l34 108h-34z"/><path d="M458 66h34l34 108h-34z"/><path d="M512 66h34l34 108h-34z"/></g>`;
  if (visual.motif === "blocks") return `<g fill="${visual.accent}" opacity=".9"><rect x="424" y="74" width="66" height="66" rx="14"/><rect x="500" y="132" width="66" height="66" rx="14" opacity=".62"/><rect x="348" y="132" width="66" height="66" rx="14" opacity=".42"/></g>`;
  if (visual.motif === "rings") return `<g fill="none" stroke="${visual.accent}" stroke-width="12" opacity=".82"><circle cx="488" cy="124" r="72"/><circle cx="488" cy="124" r="42"/><circle cx="488" cy="124" r="12" fill="${visual.accent}"/></g>`;
  if (visual.motif === "mountain") return `<path d="M350 206L422 112l38 48 42-70 92 116H350Z" fill="${visual.accent}" opacity=".9"/><path d="M402 206l56-72 28 36 16-22 52 58H402Z" fill="${visual.surface}" opacity=".8"/>`;
  if (visual.motif === "box") return `<rect x="384" y="82" width="184" height="92" rx="8" fill="${visual.accent}"/><text x="476" y="140" text-anchor="middle" fill="${visual.surface}" font-size="24" font-weight="800" letter-spacing="2">${escapeXml(visual.name)}</text>`;
  if (visual.motif === "brush") return `<path d="M374 186c44-72 86-116 124-130 24-9 38 8 20 28-26 29-70 54-132 102-20 15-31 17-12 0Z" fill="${visual.accent}" opacity=".85"/><path d="M432 202c44-26 85-33 126-18" fill="none" stroke="${visual.foreground}" stroke-linecap="round" stroke-width="7" opacity=".52"/>`;
  return `<path d="M370 198c50-96 120-126 202-90" fill="none" stroke="${visual.accent}" stroke-linecap="round" stroke-width="10"/><path d="M404 218c56-55 106-70 158-54" fill="none" stroke="${visual.foreground}" stroke-linecap="round" stroke-width="4" opacity=".45"/>`;
}

export function getTrendLifePlaceholder(item: TrendItem): string {
  const visual = findBrandVisual(item);
  const itemLabel = item.brand ?? item.label;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><rect width="640" height="360" fill="${visual.background}"/><rect x="24" y="24" width="592" height="312" rx="28" fill="${visual.surface}" opacity=".66"/><circle cx="88" cy="80" r="34" fill="${visual.foreground}" opacity=".1"/><text x="88" y="91" text-anchor="middle" fill="${visual.foreground}" font-size="28" font-weight="800">${escapeXml(visual.monogram)}</text>${renderMotif(visual)}<text x="48" y="238" fill="${visual.foreground}" font-size="34" font-weight="800" letter-spacing="1">${escapeXml(visual.name)}</text><rect x="50" y="262" width="112" height="5" rx="2.5" fill="${visual.accent}"/><text x="50" y="300" fill="${visual.foreground}" opacity=".7" font-size="16" font-weight="600" letter-spacing="1">${escapeXml(itemLabel)}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
