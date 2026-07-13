import type { ProfessionalCostLine } from "./professionalCostingContract";

export type ProfessionalCostingPolicyValidation = {
  fakePriceRejected: boolean;
  fakeSubtotalRejected: boolean;
  fakeFinalTotalRejected: boolean;
  missingPriceVisible: boolean;
  failures: string[];
};

export function validateProfessionalCostingPolicy(input: {
  lines: readonly ProfessionalCostLine[];
  finalTotalClaimed?: boolean;
}): ProfessionalCostingPolicyValidation {
  const failures: string[] = [];
  for (const line of input.lines) {
    if (line.unitPrice != null && !line.priceSourceId) failures.push(`fake_price_without_source:${line.rowId}`);
    if (line.unitPrice == null && line.lineSubtotal != null) failures.push(`fake_subtotal_without_price:${line.rowId}`);
    if (line.unitPrice != null && line.lineSubtotal != null) {
      const expected = Math.round(line.quantity * line.unitPrice * 100) / 100;
      if (Math.abs(expected - line.lineSubtotal) > 0.01) failures.push(`fake_subtotal_mismatch:${line.rowId}`);
    }
    if (line.priceState === "missing_price" && line.unitPrice != null) failures.push(`missing_price_has_unit_price:${line.rowId}`);
    if (line.priceState === "missing_price" && line.lineSubtotal != null) failures.push(`missing_price_has_subtotal:${line.rowId}`);
  }
  if (input.finalTotalClaimed === true && input.lines.some((line) => !line.trustedForContractTotal)) {
    failures.push("fake_final_total_without_contract_trust");
  }
  return {
    fakePriceRejected: !failures.some((failure) => failure.includes("fake_price") || failure.includes("missing_price_has_unit_price")),
    fakeSubtotalRejected: !failures.some((failure) => failure.includes("subtotal")),
    fakeFinalTotalRejected: !failures.includes("fake_final_total_without_contract_trust"),
    missingPriceVisible: input.lines.every((line) =>
      line.priceState !== "missing_price" || (line.unitPrice == null && line.lineSubtotal == null)
    ),
    failures,
  };
}
