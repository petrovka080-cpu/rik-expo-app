import type { WorkMaterialRow } from "../../components/WorkMaterialsEditor";

type CatalogSearchRow = {
  name_human_ru?: string | null;
  name_human?: string | null;
  rik_code?: string | null;
  uom_code?: string | null;
  qty_available?: number | null;
};

export function mapCatalogSearchToWorkMaterials(data: CatalogSearchRow[]): WorkMaterialRow[] {
  const mapped: WorkMaterialRow[] = (data || []).map((d) => {
    const rawName =
      (d?.name_human_ru as string) ??
      (d?.name_human as string) ??
      (d?.rik_code as string) ??
      "";
    const cleanName = String(rawName).replace(/\s+/g, " ").trim();

    return {
      material_id: null,
      qty: 0,
      mat_code: d?.rik_code ?? null,
      name: cleanName,
      uom: d?.uom_code ?? null,
      available: Number(d?.qty_available ?? 0),
      qty_fact: 0,
    } satisfies WorkMaterialRow;
  });

  mapped.sort((a, b) => {
    const aHas = a.available > 0 ? 0 : 1;
    const bHas = b.available > 0 ? 0 : 1;
    if (aHas !== bHas) return aHas - bHas;
    if (b.available !== a.available) return b.available - a.available;
    return String(a.name || "").localeCompare(String(b.name || ""), "ru");
  });

  return mapped;
}
