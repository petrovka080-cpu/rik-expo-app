import type { WorkMaterialRow } from "../../components/WorkMaterialsEditor";

export function mapCatalogSearchToWorkMaterials(data: any[]): WorkMaterialRow[] {
  const mapped: WorkMaterialRow[] = (data || []).map((d) => {
    const rawName =
      (d?.name_human_ru as string) ??
      (d?.name_human as string) ??
      (d?.rik_code as string) ??
      "";
    const cleanName = String(rawName).replace(/\s+/g, " ").trim();

    return {
      mat_code: d?.rik_code ?? null,
      name: cleanName,
      uom: d?.uom_code ?? null,
      available: Number(d?.qty_available ?? 0),
      qty_fact: 0,
    } as any as WorkMaterialRow;
  });

  mapped.sort((a: any, b: any) => {
    const aHas = a.available > 0 ? 0 : 1;
    const bHas = b.available > 0 ? 0 : 1;
    if (aHas !== bHas) return aHas - bHas;
    if (b.available !== a.available) return b.available - a.available;
    return String(a.name || "").localeCompare(String(b.name || ""), "ru");
  });

  return mapped;
}
