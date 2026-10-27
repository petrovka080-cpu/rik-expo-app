import type { ProfessionalBoqRow } from "../../lib/estimate/estimateDraftRevisionContract";
import {
  calculateProfessionalMaterialQuantityLine,
  isProfessionalMaterialQuantityRow,
} from "../../lib/estimate/professionalMaterialQuantityCalculator";
import type { ProfessionalMaterialQuantityLine } from "../../lib/estimate/professionalMaterialQuantityContract";

export type MaterialQuantityBuyerHandoffItem = {
  rowId: string;
  titleRu: string;
  quantity: number;
  unit: string;
  netQuantity: number;
  grossQuantity: number;
  procurementQuantity: number;
  procurementUnit: string;
  procurementPackageSize: number;
  materialKey: string | null;
  normId: string | null;
  normSourceId: string | null;
  priceStatus: string | null;
  materialQuantityTrace: ProfessionalMaterialQuantityLine;
};

export function createBuyerHandoffFromMaterialQuantities(input: {
  rows: readonly ProfessionalBoqRow[];
  templateId: string;
  family: string;
}): MaterialQuantityBuyerHandoffItem[] {
  return input.rows
    .filter(isProfessionalMaterialQuantityRow)
    .map((row) => {
      const line = row.materialQuantity ?? calculateProfessionalMaterialQuantityLine({
        row,
        templateId: input.templateId,
        family: input.family,
      });
      return {
        rowId: row.rowId,
        titleRu: row.titleRu,
        quantity: row.quantity,
        unit: row.unit,
        netQuantity: line.netQuantity,
        grossQuantity: line.grossQuantity,
        procurementQuantity: line.procurementQuantity,
        procurementUnit: line.procurementUnit,
        procurementPackageSize: line.procurementPackageSize,
        materialKey: row.materialKey ?? null,
        normId: row.normId ?? null,
        normSourceId: row.normSourceId ?? null,
        priceStatus: row.priceStatus ?? null,
        materialQuantityTrace: line,
      };
    });
}
