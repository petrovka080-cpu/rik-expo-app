import {
  shouldIncludeForemanRowInBuyerProcurement,
} from "./foremanAiEstimateSectionPolicy";
import { buildForemanAiEstimateVisibleContextNote } from "./foremanAiEstimateVisibleNote";
import type {
  ForemanBuyerProcurementRow,
  ForemanDraftEstimateRow,
} from "./foremanAiEstimateContracts";

export function mapApprovedForemanDraftToBuyerRows(
  rows: readonly ForemanDraftEstimateRow[],
): ForemanBuyerProcurementRow[] {
  return rows
    .filter((row) => shouldIncludeForemanRowInBuyerProcurement(row))
    .map((row) => ({
      source: row.source,
      rik_code: row.rik_code,
      name_human: row.visibleName,
      qty: row.quantity,
      uom: row.unit || null,
      kind: "material",
      note: buildForemanAiEstimateVisibleContextNote(row.context),
      estimateId: row.estimateId,
      estimateRevisionId: row.estimateRevisionId,
      sourceRowId: row.rowId,
      unitPrice: row.unitPrice,
      total: row.total,
      currency: row.currency,
    }));
}
