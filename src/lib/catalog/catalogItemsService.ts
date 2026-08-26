import { loadCatalogItemsSearchPreviewRows } from "./catalog.transport";
import { rikQuickSearch } from "./catalog.search.service";
import type { CatalogItemsSearchPreviewRow, RikQuickSearchItem } from "./catalog.types";
import { formatEstimateUnitLabel } from "../ai/globalEstimate/formatEstimateUnitLabel";
import { normalizeCatalogItemSearchText } from "./catalogItemSearch";
import type { CatalogItemForEstimate } from "./catalogItemTypes";
import type { CatalogItemPickerItem } from "./catalogItemPickerTypes";

function normalizeUnit(unit?: string | null): string {
  const value = String(unit ?? "").trim();
  if (!value) return "pcs";
  if (value === "м3" || value === "м³") return "m3";
  if (value === "м2" || value === "м²") return "sq_m";
  if (value === "шт") return "pcs";
  return value;
}

export function mapCatalogPreviewRowToPickerItem(row: CatalogItemsSearchPreviewRow): CatalogItemPickerItem {
  const unit = normalizeUnit(row.uom_code);
  const name = row.name_human || row.rik_code;
  return {
    catalogItemId: row.id || row.rik_code,
    rikCode: row.rik_code,
    name,
    normalizedName: normalizeCatalogItemSearchText(name),
    category: row.kind ?? undefined,
    unit,
    unitLabel: formatEstimateUnitLabel(unit),
    kind: row.kind,
    sourceId: "catalog_items",
    sourceLabel: "catalog_items",
    unitPrice: null,
    currency: undefined,
    checkedAt: new Date(0).toISOString(),
    confidence: "high",
    availabilityStatus: "unknown",
    stockStatus: "unknown",
  };
}

export function mapRikQuickSearchItemToPickerItem(row: RikQuickSearchItem): CatalogItemPickerItem {
  const unit = normalizeUnit(row.uom_code);
  const name = row.name_human_ru || row.name_human || row.rik_code;
  return {
    catalogItemId: row.rik_code,
    rikCode: row.rik_code,
    name,
    normalizedName: normalizeCatalogItemSearchText(name),
    category: row.kind ?? undefined,
    unit,
    unitLabel: formatEstimateUnitLabel(unit),
    kind: row.kind,
    sourceId: "rik_items",
    sourceLabel: "RIK catalog",
    unitPrice: null,
    currency: undefined,
    checkedAt: new Date(0).toISOString(),
    confidence: "medium",
    availabilityStatus: "unknown",
    stockStatus: "unknown",
  };
}

export async function searchCatalogItemsForPicker(query: string, limit = 40): Promise<CatalogItemPickerItem[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const [previewResult, quickResult] = await Promise.allSettled([
    loadCatalogItemsSearchPreviewRows(trimmed, "all", limit),
    rikQuickSearch(trimmed, limit),
  ]);
  const previewRows = previewResult.status === "fulfilled"
    && !previewResult.value.error
    && Array.isArray(previewResult.value.data)
    ? previewResult.value.data.map(mapCatalogPreviewRowToPickerItem)
    : [];
  const quickRows = quickResult.status === "fulfilled"
    ? quickResult.value.map(mapRikQuickSearchItemToPickerItem)
    : [];
  const unique = new Map<string, CatalogItemPickerItem>();
  for (const item of [...previewRows, ...quickRows]) {
    const key = `${item.rikCode || item.catalogItemId}:${item.unit}`.toLocaleLowerCase("ru-RU");
    if (!unique.has(key)) unique.set(key, item);
  }
  return [...unique.values()].slice(0, limit);
}

export async function searchMaterialCatalogItemsForPicker(
  query: string,
  limit = 12,
): Promise<CatalogItemPickerItem[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const [previewResult, quickResult] = await Promise.allSettled([
    loadCatalogItemsSearchPreviewRows(trimmed, "material", limit),
    rikQuickSearch(trimmed, limit),
  ]);
  const previewRows = previewResult.status === "fulfilled"
    && !previewResult.value.error
    && Array.isArray(previewResult.value.data)
    ? previewResult.value.data.map(mapCatalogPreviewRowToPickerItem)
    : [];
  const quickRows = quickResult.status === "fulfilled"
    ? quickResult.value
        .map(mapRikQuickSearchItemToPickerItem)
        .filter((item) => item.kind?.trim().toLocaleLowerCase("ru-RU") === "material")
    : [];
  const unique = new Map<string, CatalogItemPickerItem>();
  for (const item of [...previewRows, ...quickRows]) {
    if (item.kind?.trim().toLocaleLowerCase("ru-RU") !== "material") continue;
    const key = `${item.rikCode || item.catalogItemId}:${item.unit}`.toLocaleLowerCase("ru-RU");
    if (!unique.has(key)) unique.set(key, item);
  }
  return [...unique.values()].slice(0, limit);
}

export function mapPickerItemToCatalogItemForEstimate(item: CatalogItemPickerItem): CatalogItemForEstimate {
  return {
    catalogItemId: item.catalogItemId,
    name: item.name,
    normalizedName: item.normalizedName || normalizeCatalogItemSearchText(item.name),
    category: item.category ?? item.kind ?? undefined,
    materialKey: item.materialKey,
    rateKey: item.rateKey,
    unit: item.unit,
    unitLabel: item.unitLabel || formatEstimateUnitLabel(item.unit),
    currency: item.currency,
    unitPrice: item.unitPrice ?? null,
    sourceId: item.sourceId,
    sourceLabel: item.sourceLabel,
    checkedAt: item.checkedAt,
    confidence: item.confidence ?? "medium",
    availabilityStatus: item.availabilityStatus ?? "unknown",
    stockStatus: item.stockStatus ?? "unknown",
  };
}

export async function searchCatalogItemsForEstimateBinding(
  query: string,
  limit = 8,
): Promise<CatalogItemForEstimate[]> {
  const rows = await searchCatalogItemsForPicker(query, limit);
  return rows.map(mapPickerItemToCatalogItemForEstimate);
}
