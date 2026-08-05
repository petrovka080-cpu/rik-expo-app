import type {
  ProfessionalCostLine,
  ProfessionalCostSummary,
} from "../../lib/estimate/professionalCostingContract";
import {
  buildBuyerHandoffCostTraceRows,
  renderBuyerHandoffCostTrace,
  type BuyerHandoffCostTraceRow,
} from "./renderBuyerHandoffCostTrace";

export type BuyerHandoffCostPackage = {
  packageId: string;
  templateId: string;
  rows: BuyerHandoffCostTraceRow[];
  traceText: string;
  buyer_handoff_procurement_rows_have_price_state: boolean;
  buyer_handoff_missing_price_visible: boolean;
  buyer_handoff_fake_price_count: number;
  buyer_handoff_work_rows_count: number;
  cost_resolution: ProfessionalCostSummary["resolution"];
  required_price_input_row_ids: string[];
  buyer_handoff_required_price_inputs_complete: boolean;
};

export function createBuyerHandoffCostPackage(input: {
  templateId: string;
  summary: ProfessionalCostSummary;
  lines: readonly ProfessionalCostLine[];
}): BuyerHandoffCostPackage {
  const rows = buildBuyerHandoffCostTraceRows(input.lines);
  const fakePriceCount = rows.filter((row) => row.unitPrice != null && !row.priceSourceId).length;
  const procurementMissingPricesVisible = rows.every((row) =>
    row.priceState !== "missing_price" || (row.unitPrice == null && row.subtotal == null)
  );
  return {
    packageId: `buyer_cost_${input.templateId}`,
    templateId: input.templateId,
    rows,
    traceText: renderBuyerHandoffCostTrace({ lines: input.lines }),
    buyer_handoff_procurement_rows_have_price_state: rows.every((row) => Boolean(row.priceState)),
    buyer_handoff_missing_price_visible: input.summary.missingPriceRowsVisible && procurementMissingPricesVisible,
    buyer_handoff_fake_price_count: fakePriceCount,
    buyer_handoff_work_rows_count: rows.filter((row) => row.rowType === "work" || row.rowType === "labor").length,
    cost_resolution: input.summary.resolution,
    required_price_input_row_ids: [...input.summary.requiredPriceInputRowIds],
    buyer_handoff_required_price_inputs_complete:
      input.summary.resolution !== "PRICE_INPUT_REQUIRED" ||
      input.summary.requiredPriceInputRowIds.length > 0,
  };
}
