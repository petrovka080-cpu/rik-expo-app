import { loadCatalogItemsSearchPreviewRows } from "./catalog.transport";
import { rikQuickSearch } from "./catalog.search.service";
import type { CatalogItemsSearchPreviewRow, RikQuickSearchItem } from "./catalog.types";
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
  return {
    catalogItemId: row.id || row.rik_code,
    rikCode: row.rik_code,
    name: row.name_human || row.rik_code,
    unit: normalizeUnit(row.uom_code),
    kind: row.kind,
    sourceId: "catalog_items",
    sourceLabel: "catalog_items",
  };
}

export function mapRikQuickSearchItemToPickerItem(row: RikQuickSearchItem): CatalogItemPickerItem {
  return {
    catalogItemId: row.rik_code,
    rikCode: row.rik_code,
    name: row.name_human_ru || row.name_human || row.rik_code,
    unit: normalizeUnit(row.uom_code),
    kind: row.kind,
    sourceId: "rik_items",
    sourceLabel: "RIK catalog",
  };
}

export async function searchCatalogItemsForPicker(query: string, limit = 40): Promise<CatalogItemPickerItem[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const preview = await loadCatalogItemsSearchPreviewRows(trimmed, "material", limit);
  if (!preview.error && Array.isArray(preview.data) && preview.data.length > 0) {
    return preview.data.map(mapCatalogPreviewRowToPickerItem);
  }

  const quickRows = await rikQuickSearch(trimmed, limit);
  return quickRows.map(mapRikQuickSearchItemToPickerItem);
}
