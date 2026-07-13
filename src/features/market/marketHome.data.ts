import { SUPABASE_URL } from "../../lib/env/clientSupabaseEnv";
import type { DbJson } from "../../lib/dbContract.types";

import {
  getCategoryLabel,
  getCategoryPresentationKeywords,
  getFallbackImageForPresentation,
  getKindLabel,
  getMappedKindForCategory,
  getSideLabel,
  getStatusLabel,
  isSupportedMapKind,
  normalizeMarketKind,
} from "./marketHome.config";
import type {
  MarketHomeCategoryCounts,
  MarketHomeCategoryKey,
  MarketHomeFilters,
  MarketHomeListingCard,
  MarketListingItem,
  MarketListingRow,
  MarketMapParams,
  MarketSide,
} from "./marketHome.types";

export const EMPTY_MARKET_HOME_CATEGORY_COUNTS: MarketHomeCategoryCounts = {
  materials: 0,
  works: 0,
  services: 0,
  delivery: 0,
  transport: 0,
  tools: 0,
  misc: 0,
};

export const MARKET_HOME_SELECT =
  "id,title,city,price,kind,side,description,contacts_phone,contacts_whatsapp,contacts_email,items_json,uom,uom_code,rik_code,status,created_at" as const;

function toMaybeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function asListingItems(value: DbJson | null): MarketListingItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const row = item as Record<string, unknown>;
      return {
        rik_code: typeof row.rik_code === "string" ? row.rik_code : null,
        name: typeof row.name === "string" ? row.name : null,
        uom: typeof row.uom === "string" ? row.uom : null,
        qty: toMaybeNumber(row.qty),
        price: toMaybeNumber(row.price),
        city: typeof row.city === "string" ? row.city : null,
        kind: typeof row.kind === "string" ? row.kind : null,
      } satisfies MarketListingItem;
    })
    .filter((item): item is MarketListingItem => Boolean(item));
}

function normalizeText(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function containsProofRunId(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return /^proof_[a-z0-9][a-z0-9_-]{2,}$/i.test(value.trim());
  if (typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((entry) => containsProofRunId(entry));

  const record = value as Record<string, unknown>;
  if (containsProofRunId(record.proof_run_id)) return true;
  return Object.values(record).some((entry) => containsProofRunId(entry));
}

function parseItemsJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const raw = value.trim();
  if (!raw || (!raw.startsWith("[") && !raw.startsWith("{"))) return value;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return value;
  }
}

export function isSyntheticProofMarketListing(
  row: {
    title?: unknown;
    description?: unknown;
    contacts_email?: unknown;
    items_json?: unknown;
    client_mutation_id?: unknown;
  },
): boolean {
  const title = normalizeText(row.title);
  const description = normalizeText(row.description);
  const email = normalizeText(row.contacts_email);
  const clientMutationId = normalizeText(String(row.client_mutation_id ?? ""));

  return (
    title.includes("synthetic marketplace listing")
    || description.includes("synthetic marketplace searchable description")
    || /^proof-\d+@example\.invalid$/i.test(email)
    || /^proof_[a-z0-9][a-z0-9_-]*:market-listing:/i.test(clientMutationId)
    || containsProofRunId(parseItemsJson(row.items_json))
  );
}

function normalizeImageUrl(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!raw || /^(blob|data):/i.test(raw)) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (!raw.startsWith("/storage/v1/object/public/")) return null;
  try {
    return new URL(raw, SUPABASE_URL).toString();
  } catch {
    return null;
  }
}

function parseImageUrlArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  const raw = value.trim();
  if (!raw.startsWith("[")) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeImageUrls(value: unknown, primaryUrl: string | null): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  const pushUrl = (candidate: unknown) => {
    const normalized = normalizeImageUrl(candidate);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    urls.push(normalized);
  };

  pushUrl(primaryUrl);
  parseImageUrlArray(value).forEach(pushUrl);
  return urls;
}

function buildSearchText(row: MarketListingRow, items: MarketListingItem[]): string {
  const itemParts = items.flatMap((item) => [item.name, item.rik_code, item.city, item.kind]);
  return [row.title, row.city, row.description, row.rik_code, row.kind, row.uom, ...itemParts]
    .map(normalizeText)
    .filter(Boolean)
    .join(" ");
}

function inferPresentationCategory(
  row: MarketListingRow,
  items: MarketListingItem[],
  searchText: string,
): MarketHomeCategoryKey {
  const kind = normalizeMarketKind(row.kind);
  if (kind === "rent") return "tools";
  if (kind === "delivery") return "delivery";
  if (kind === "material") return "materials";
  if (kind === "work") return "works";

  for (const category of ["delivery", "transport", "tools"] as const) {
    if (getCategoryPresentationKeywords(category).some((keyword) => searchText.includes(keyword))) {
      return category;
    }
  }

  if (kind === "service") return "services";

  if (items.some((item) => normalizeMarketKind(item.kind) === "material")) return "materials";
  if (items.some((item) => normalizeMarketKind(item.kind) === "work")) return "works";
  if (items.some((item) => normalizeMarketKind(item.kind) === "service")) return "services";

  return "misc";
}

function buildItemsPreview(items: MarketListingItem[]): string[] {
  return items
    .slice(0, 3)
    .map((item) => {
      const name = item.name || item.rik_code || "Позиция";
      if (item.qty == null) return name;
      return `${name} — ${item.qty}${item.uom ? ` ${item.uom}` : ""}`;
    })
    .filter(Boolean);
}

export function toMarketHomeListingCard(row: MarketListingRow): MarketHomeListingCard {
  const items = asListingItems(row.items_json);
  const searchText = buildSearchText(row, items);
  const presentationCategory = inferPresentationCategory(row, items, searchText);
  const side = row.side === "demand" ? "demand" : "offer";
  const imageUrl = normalizeImageUrl((row as { image_url?: unknown }).image_url);
  const videoUrl = normalizeImageUrl((row as { video_url?: unknown }).video_url);

  return {
    id: row.id,
    title: row.title,
    sellerUserId: typeof row.user_id === "string" ? row.user_id : "",
    sellerCompanyId: typeof row.company_id === "string" ? row.company_id : null,
    supplierId: typeof row.company_id === "string" ? row.company_id : null,
    subtitle: `${getSideLabel(side)}${row.city ? ` • ${row.city}` : ""}`,
    city: row.city,
    price: row.price,
    priceKnown: typeof row.price === "number" && Number.isFinite(row.price) && row.price > 0,
    kind: row.kind,
    kindLabel: getKindLabel(row.kind),
    side,
    sideLabel: getSideLabel(side),
    description: row.description,
    phone: row.contacts_phone,
    whatsapp: row.contacts_whatsapp,
    email: row.contacts_email,
    uom: row.uom,
    unit: row.uom_code ?? row.uom ?? null,
    status: row.status,
    created_at: row.created_at,
    statusLabel: getStatusLabel(row.status),
    presentationCategory,
    imageSource: getFallbackImageForPresentation(presentationCategory, row.kind),
    imageUrl,
    imageUrls: normalizeImageUrls((row as { image_urls?: unknown }).image_urls, imageUrl),
    videoUrl,
    videoUrls: normalizeImageUrls((row as { video_urls?: unknown }).video_urls, videoUrl),
    items,
    erpItems: [],
    itemsPreview: buildItemsPreview(items),
    searchText,
    isDemand: side === "demand",
    inStock: false,
    sellerDisplayName: "Поставщик",
    stockLabel: null,
    stockQtyAvailable: null,
    stockUom: null,
    totalAvailableCount: null,
    primaryRikCode: String(row.rik_code ?? "").trim() || null,
    source: "marketplace",
  };
}

function matchesQuery(row: MarketHomeListingCard, query: string): boolean {
  const normalized = normalizeText(query);
  if (!normalized) return true;
  return row.searchText.includes(normalized);
}

export function uniqueMarketHomeListingsById(
  listings: readonly MarketHomeListingCard[],
): MarketHomeListingCard[] {
  const seen = new Set<string>();
  const uniqueListings: MarketHomeListingCard[] = [];
  listings.forEach((row) => {
    const id = String(row.id || "").trim();
    if (!id || seen.has(id)) return;
    seen.add(id);
    uniqueListings.push(row);
  });
  return uniqueListings;
}

export function countMarketHomeListingsByCategory(
  listings: readonly MarketHomeListingCard[],
): MarketHomeCategoryCounts {
  const counts: MarketHomeCategoryCounts = { ...EMPTY_MARKET_HOME_CATEGORY_COUNTS };
  uniqueMarketHomeListingsById(listings).forEach((item) => {
    counts[item.presentationCategory] += 1;
  });
  return counts;
}

function matchesKind(row: MarketHomeListingCard, kind: MarketHomeFilters["kind"]): boolean {
  if (kind === "all") return true;
  if (row.kind === kind) return true;
  return row.items.some((item) => item.kind === kind);
}

function matchesPresentationCategory(
  row: MarketHomeListingCard,
  category: MarketHomeCategoryKey | "all",
): boolean {
  if (category === "all") return true;
  return row.presentationCategory === category;
}

export function filterMarketHomeListings(
  listings: MarketHomeListingCard[],
  filters: MarketHomeFilters,
): MarketHomeListingCard[] {
  return uniqueMarketHomeListingsById(listings).filter((row) => {
    if (filters.side !== "all" && row.side !== filters.side) return false;
    if (!matchesKind(row, filters.kind)) return false;
    if (!matchesPresentationCategory(row, filters.category)) return false;
    if (!matchesQuery(row, filters.query)) return false;
    return true;
  });
}

export function getFeedHeading(category: MarketHomeFilters["category"]): string {
  if (category === "all") return "Новые объявления - Кыргызстан";
  return `${getCategoryLabel(category)} - Кыргызстан`;
}

type BuildMapParamsOptions = {
  row?: Pick<MarketHomeListingCard, "id" | "city" | "kind" | "side"> | null;
  side?: MarketSide;
};

export function buildMarketMapParams(
  filters: Pick<MarketHomeFilters, "side" | "kind">,
  options: BuildMapParamsOptions = {},
): MarketMapParams {
  const params: MarketMapParams = {};
  const resolvedSide = options.side ?? (filters.side !== "all" ? filters.side : undefined);
  if (resolvedSide) params.side = resolvedSide;

  const rowKind = options.row?.kind ?? null;
  if (isSupportedMapKind(rowKind)) {
    params.kind = rowKind;
  } else if (filters.kind !== "all" && isSupportedMapKind(filters.kind)) {
    params.kind = filters.kind;
  }

  if (options.row?.city) params.city = options.row.city;
  if (options.row?.id) params.focusId = options.row.id;

  return params;
}

export function getCategoryKind(category: MarketHomeCategoryKey | "all"): MarketHomeFilters["kind"] {
  if (category === "tools") return "rent";
  return getMappedKindForCategory(category) ?? "all";
}

export function buildMarketAssistantPrompt(filters: MarketHomeFilters): string {
  const parts: string[] = ["Помоги сориентироваться по маркету GOX."];

  if (filters.category !== "all") {
    parts.push(`Сейчас у меня выбрана категория: ${getCategoryLabel(filters.category)}.`);
  }
  if (filters.kind !== "all") {
    parts.push(`Тип: ${getKindLabel(filters.kind)}.`);
  }
  if (filters.side !== "all") {
    parts.push(`Сторона рынка: ${getSideLabel(filters.side)}.`);
  }
  if (filters.query.trim()) {
    parts.push(`Поисковый запрос: "${filters.query.trim()}".`);
    parts.push("Подскажи, как лучше искать это в маркете и на карте поставщиков.");
  } else {
    parts.push("Подскажи, как мне быстрее найти нужного поставщика или спрос в текущем разделе.");
  }

  return parts.join(" ");
}

export function buildListingAssistantPrompt(row: MarketHomeListingCard): string {
  const title = row.title.trim();
  const city = row.city ? ` Город: ${row.city}.` : "";
  const kind = row.kindLabel ? ` Тип: ${row.kindLabel}.` : "";
  const price =
    row.price != null ? ` Цена: ${row.price.toLocaleString("ru-RU")} сом${row.uom ? ` за ${row.uom}` : ""}.` : "";
  const items =
    row.itemsPreview.length > 0 ? ` Позиции: ${row.itemsPreview.slice(0, 2).join("; ")}.` : "";

  return `Помоги мне оценить объявление "${title}".${kind}${city}${price}${items} Подскажи, что проверить дальше и как лучше продолжить: открыть карту, связаться или уточнить условия.`;
}
