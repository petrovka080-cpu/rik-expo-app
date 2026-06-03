import { loadCatalogItemsSearchPreviewRows } from "./catalog.transport";
import { rikQuickSearch } from "./catalog.search.service";
import { normalizeCatalogSearchInput } from "./catalog.normalizers";
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
  const trimmed = normalizeCatalogSearchInput(query);
  if (trimmed.length < 2) return [];

  const preview = await loadCatalogItemsSearchPreviewRows(trimmed, "material", limit);
  if (!preview.error && Array.isArray(preview.data) && preview.data.length > 0) {
    return preview.data.map(mapCatalogPreviewRowToPickerItem);
  }

  const quickRows = await rikQuickSearch(trimmed, limit);
  return quickRows.map(mapRikQuickSearchItemToPickerItem);
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
