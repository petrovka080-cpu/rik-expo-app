import type { ProfessionalBoqRow } from "../../lib/estimate/estimateDraftRevisionContract";
import { validateProfessionalMaterialQuantityAccuracy } from "../../lib/estimate/validateProfessionalMaterialQuantityAccuracy";

export type BuyerHandoffMaterialQuantityValidation = {
  passed: boolean;
  expectedRowsCount: number;
  actualRowsCount: number;
  missingRowIds: string[];
  quantityMismatchRowIds: string[];
  blockers: string[];
};

export function validateBuyerHandoffMaterialQuantities(input: {
  templateId: string;
  family: string;
  boqRows: readonly ProfessionalBoqRow[];
  buyerHandoffItems: readonly {
    rowId: string;
    procurementQuantity?: number | null;
    procurementUnit?: string | null;
  }[];
}): BuyerHandoffMaterialQuantityValidation {
  const validation = validateProfessionalMaterialQuantityAccuracy({
    templateId: input.templateId,
    family: input.family,
    rows: input.boqRows,
    buyerHandoffItems: input.buyerHandoffItems,
  });
  const expected = input.boqRows.filter((row) => row.materialQuantity).map((row) => row.rowId);
  const actual = new Set(input.buyerHandoffItems.map((item) => item.rowId));
  const missingRowIds = expected.filter((rowId) => !actual.has(rowId));
  const quantityMismatchRowIds = validation.blockedRows
    .filter((row) => row.reasons.includes("buyer_handoff_quantity_mismatch"))
    .map((row) => row.rowId);
  const blockers = [
    ...validation.blockingReasons.map((reason) => `material_quantity:${reason}`),
    missingRowIds.length === 0 ? "" : "buyer_handoff_missing_material_quantity_rows",
  ].filter(Boolean);
  return {
    passed: blockers.length === 0,
    expectedRowsCount: expected.length,
    actualRowsCount: input.buyerHandoffItems.length,
    missingRowIds,
    quantityMismatchRowIds,
    blockers,
  };
}
