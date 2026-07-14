import type { ProfessionalBoqRow } from "../../lib/estimate/estimateDraftRevisionContract";
import type { ProfessionalMaterialQuantityLine } from "../../lib/estimate/professionalMaterialQuantityContract";

export type CompleteBuyerHandoffBoqItem = {
  rowId: string;
  titleRu: string;
  quantity: number;
  unit: string;
  materialKey: string | null;
  normId: string | null;
  normSourceId: string | null;
  priceStatus: string | null;
  netQuantity: number | null;
  grossQuantity: number | null;
  procurementQuantity: number | null;
  procurementUnit: string | null;
  procurementPackageSize: number | null;
  materialQuantityTrace: ProfessionalMaterialQuantityLine | null;
};

export function isProfessionalBoqProcurementHandoffRow(row: ProfessionalBoqRow): boolean {
  return row.includedInProcurement &&
    row.rowType !== "work" &&
    row.rowType !== "labor" &&
    row.rowType !== "document" &&
    row.rowType !== "other";
}

export function createCompleteBuyerHandoffFromBoq(
  rows: readonly ProfessionalBoqRow[],
): CompleteBuyerHandoffBoqItem[] {
  return rows
    .filter(isProfessionalBoqProcurementHandoffRow)
    .map((row) => ({
      rowId: row.rowId,
      titleRu: row.titleRu,
      quantity: row.quantity,
      unit: row.unit,
      materialKey: row.materialKey ?? null,
      normId: row.normId ?? null,
      normSourceId: row.normSourceId ?? null,
      priceStatus: row.priceStatus ?? null,
      netQuantity: row.materialQuantity?.netQuantity ?? null,
      grossQuantity: row.materialQuantity?.grossQuantity ?? null,
      procurementQuantity: row.materialQuantity?.procurementQuantity ?? null,
      procurementUnit: row.materialQuantity?.procurementUnit ?? null,
      procurementPackageSize: row.materialQuantity?.procurementPackageSize ?? null,
      materialQuantityTrace: row.materialQuantity ?? null,
    }));
}
