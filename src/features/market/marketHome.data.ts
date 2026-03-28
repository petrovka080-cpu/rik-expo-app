import { supabase } from "../../lib/supabaseClient";
import type { Json } from "../../lib/database.types";

import {
  categoryUsesDedicatedBucket,
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
  MarketHomeCategoryKey,
  MarketHomeFilters,
  MarketHomeListingCard,
  MarketHomePayload,
  MarketListingItem,
  MarketListingRow,
  MarketMapParams,
  MarketSide,
} from "./marketHome.types";

export const MARKET_HOME_SELECT =
  "id,title,user_id,company_id,city,price,kind,side,description,contacts_phone,contacts_whatsapp,contacts_email,items_json,uom,uom_code,rik_code,status,created_at";

function toMaybeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function asListingItems(value: Json | null): MarketListingItem[] {
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

function normalizeText(value: string | null | undefined): string {
  return String(value ?? "").trim().toLowerCase();
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

  return {
    id: row.id,
    title: row.title,
    sellerUserId: row.user_id,
    sellerCompanyId: row.company_id,
    supplierId: row.company_id,
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
    imageUrl: null,
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
  if (!categoryUsesDedicatedBucket(category)) return true;
  if (category === "misc") return row.presentationCategory === "misc";
  return row.presentationCategory === category;
}

export function filterMarketHomeListings(
  listings: MarketHomeListingCard[],
  filters: MarketHomeFilters,
): MarketHomeListingCard[] {
  return listings.filter((row) => {
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

export async function loadMarketHomePayload(): Promise<MarketHomePayload> {
  const [rowsResult, demandCountResult] = await Promise.all([
    supabase
      .from("market_listings")
      .select(MARKET_HOME_SELECT)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(120),
    supabase
      .from("market_listings")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .eq("side", "demand"),
  ]);

  if (rowsResult.error) throw rowsResult.error;
  if (demandCountResult.error) throw demandCountResult.error;

  return {
    listings: (rowsResult.data ?? []).map((row) => toMarketHomeListingCard(row as MarketListingRow)),
    activeDemandCount: demandCountResult.count ?? 0,
    totalCount: rowsResult.count ?? (rowsResult.data ?? []).length,
    pageOffset: 0,
    pageSize: 120,
    hasMore: false,
  };
}

export async function loadMarketListingById(id: string): Promise<MarketHomeListingCard | null> {
  const result = await supabase
    .from("market_listings")
    .select(MARKET_HOME_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (result.error) throw result.error;
  if (!result.data) return null;
  return toMarketHomeListingCard(result.data as MarketListingRow);
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
