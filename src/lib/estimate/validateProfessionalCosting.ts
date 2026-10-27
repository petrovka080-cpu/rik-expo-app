import type { ProfessionalCostLine } from "./professionalCostingContract";
import { validateProfessionalCostingPolicy } from "./professionalCostingPolicy";

export type ProfessionalCostingValidationSummary = {
  cost_rows_count: number;
  priced_rows_count: number;
  missing_price_rows_count: number;
  fake_price_count: number;
  fake_subtotal_count: number;
  fake_final_total_count: number;
  price_state_present_for_all_rows: boolean;
  missing_price_visible: boolean;
  price_source_missing_count: number;
  price_region_missing_count: number;
  price_retrieved_at_missing_count: number;
  blocking_reasons: string[];
};

export function validateProfessionalCosting(input: {
  lines: readonly ProfessionalCostLine[];
  finalTotalClaimed?: boolean;
}): ProfessionalCostingValidationSummary {
  const policy = validateProfessionalCostingPolicy({
    lines: input.lines,
    finalTotalClaimed: input.finalTotalClaimed,
  });
  const fakePriceCount = policy.failures.filter((failure) =>
    failure.includes("fake_price") || failure.includes("missing_price_has_unit_price")
  ).length;
  const fakeSubtotalCount = policy.failures.filter((failure) => failure.includes("subtotal")).length;
  const fakeFinalTotalCount = policy.failures.filter((failure) => failure.includes("fake_final_total")).length;
  const priceSourceMissingCount = input.lines.filter((line) => line.unitPrice != null && !line.priceSourceId).length;
  const priceRegionMissingCount = input.lines.filter((line) => line.unitPrice != null && !line.priceRegion).length;
  const priceRetrievedAtMissingCount = input.lines.filter((line) => line.unitPrice != null && !line.priceRetrievedAt).length;
  const blockingReasons = [
    ...policy.failures,
    priceSourceMissingCount === 0 ? "" : `price_source_missing:${priceSourceMissingCount}`,
    priceRegionMissingCount === 0 ? "" : `price_region_missing:${priceRegionMissingCount}`,
    priceRetrievedAtMissingCount === 0 ? "" : `price_retrieved_at_missing:${priceRetrievedAtMissingCount}`,
  ].filter(Boolean);
  return {
    cost_rows_count: input.lines.length,
    priced_rows_count: input.lines.filter((line) => line.unitPrice != null && line.lineSubtotal != null).length,
    missing_price_rows_count: input.lines.filter((line) => line.priceState === "missing_price").length,
    fake_price_count: fakePriceCount,
    fake_subtotal_count: fakeSubtotalCount,
    fake_final_total_count: fakeFinalTotalCount,
    price_state_present_for_all_rows: input.lines.every((line) => Boolean(line.priceState)),
    missing_price_visible: policy.missingPriceVisible,
    price_source_missing_count: priceSourceMissingCount,
    price_region_missing_count: priceRegionMissingCount,
    price_retrieved_at_missing_count: priceRetrievedAtMissingCount,
    blocking_reasons: blockingReasons,
  };
}
