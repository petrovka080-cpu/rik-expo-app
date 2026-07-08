import type { ProfessionalBoqRow } from "../../lib/estimate/estimateDraftRevisionContract";
import { isProfessionalBoqProcurementHandoffRow } from "./createCompleteBuyerHandoffFromBoq";

export type BuyerHandoffCompletenessValidation = {
  passed: boolean;
  expectedProcurementRowsCount: number;
  actualBuyerHandoffRowsCount: number;
  missingProcurementRowIds: string[];
  forbiddenWorkRowsCount: number;
  buyerHandoffProcurementSubsetComplete: boolean;
};

export function validateBuyerHandoffCompleteness(input: {
  boqRows: readonly ProfessionalBoqRow[];
  buyerHandoffRowIds: readonly string[];
}): BuyerHandoffCompletenessValidation {
  const buyerIds = new Set(input.buyerHandoffRowIds);
  const rowsById = new Map(input.boqRows.map((row) => [row.rowId, row]));
  const expectedRows = input.boqRows.filter(isProfessionalBoqProcurementHandoffRow);
  const missingProcurementRowIds = expectedRows
    .filter((row) => !buyerIds.has(row.rowId))
    .map((row) => row.rowId);
  const forbiddenWorkRowsCount = input.buyerHandoffRowIds.filter((rowId) => {
    const row = rowsById.get(rowId);
    return row?.rowType === "work" || row?.rowType === "labor";
  }).length;
  return {
    passed: missingProcurementRowIds.length === 0 && forbiddenWorkRowsCount === 0,
    expectedProcurementRowsCount: expectedRows.length,
    actualBuyerHandoffRowsCount: input.buyerHandoffRowIds.length,
    missingProcurementRowIds,
    forbiddenWorkRowsCount,
    buyerHandoffProcurementSubsetComplete: missingProcurementRowIds.length === 0 && forbiddenWorkRowsCount === 0,
  };
}
