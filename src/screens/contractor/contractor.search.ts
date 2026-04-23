import type { WorkMaterialRow } from "../../components/WorkMaterialsEditor";

type CatalogSearchRow = {
  name_human_ru?: unknown;
  name_human?: unknown;
  rik_code?: unknown;
  uom_code?: unknown;
  qty_available?: unknown;
} | null | undefined;

type CatalogSearchMaterialRow = WorkMaterialRow & {
  available: number;
};

const isCatalogSearchRecord = (value: CatalogSearchRow): value is Exclude<CatalogSearchRow, null | undefined> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const readCatalogField = (row: CatalogSearchRow, field: keyof Exclude<CatalogSearchRow, null | undefined>): unknown =>
  isCatalogSearchRecord(row) ? row[field] : null;

const normalizeText = (value: unknown): string | null => {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  return normalized || null;
};

const normalizeAvailable = (value: unknown): number => {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
};

const normalizeCatalogSearchRow = (row: CatalogSearchRow): CatalogSearchMaterialRow => {
  const rikCode = normalizeText(readCatalogField(row, "rik_code"));
  const cleanName =
    normalizeText(readCatalogField(row, "name_human_ru")) ??
    normalizeText(readCatalogField(row, "name_human")) ??
    rikCode ??
    "";

  return {
    material_id: null,
    qty: 0,
    mat_code: rikCode,
    name: cleanName,
    uom: normalizeText(readCatalogField(row, "uom_code")),
    available: normalizeAvailable(readCatalogField(row, "qty_available")),
    qty_fact: 0,
  } satisfies CatalogSearchMaterialRow;
};

export function mapCatalogSearchToWorkMaterials(
  data: readonly CatalogSearchRow[] | null | undefined,
): WorkMaterialRow[] {
  const mapped = (data ?? []).map(normalizeCatalogSearchRow);

  mapped.sort((a, b) => {
    const aHas = a.available > 0 ? 0 : 1;
    const bHas = b.available > 0 ? 0 : 1;
    if (aHas !== bHas) return aHas - bHas;
    if (b.available !== a.available) return b.available - a.available;
    return String(a.name || "").localeCompare(String(b.name || ""), "ru");
  });

  return mapped;
}
