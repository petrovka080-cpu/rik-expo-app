import type { ProfessionalCostLine, ProfessionalCostSummary } from "./professionalCostingContract";

export type ProfessionalCostCoverageDecision = {
  pricedRequiredRowsPercent: number;
  preliminaryCostAllowed: boolean;
  contractTotalAllowed: boolean;
  ownerApproved: boolean;
  missingPriceBlocksContractTotal: boolean;
  blockingReasons: string[];
};

export function evaluateProfessionalCostCoveragePolicy(input: {
  summary: Pick<
    ProfessionalCostSummary,
    | "pricedRequiredRowsPercent"
    | "missingPriceRowsVisible"
    | "fakePriceCount"
    | "fakeSubtotalCount"
    | "fakeFinalTotalCount"
  >;
  lines: readonly ProfessionalCostLine[];
  ownerApproved?: boolean;
}): ProfessionalCostCoverageDecision {
  const ownerApproved = input.ownerApproved === true;
  const allContractTrusted =
    input.lines.length > 0 && input.lines.every((line) => line.trustedForContractTotal === true);
  const missingPriceBlocksContractTotal = input.lines.some((line) => line.priceState === "missing_price");
  const preliminaryCostAllowed =
    input.summary.pricedRequiredRowsPercent >= 80 &&
    input.summary.missingPriceRowsVisible &&
    input.summary.fakePriceCount === 0 &&
    input.summary.fakeSubtotalCount === 0 &&
    input.summary.fakeFinalTotalCount === 0;
  const contractTotalAllowed =
    input.summary.pricedRequiredRowsPercent === 100 &&
    allContractTrusted &&
    ownerApproved &&
    !missingPriceBlocksContractTotal;
  const blockingReasons = [
    preliminaryCostAllowed ? "" : "preliminary_cost_policy_not_met",
    input.summary.pricedRequiredRowsPercent === 100 ? "" : "contract_total_requires_100_percent_price_coverage",
    allContractTrusted ? "" : "contract_total_requires_all_prices_trusted_for_contract",
    ownerApproved ? "" : "owner_approval_required_for_contract_total",
    missingPriceBlocksContractTotal ? "missing_price_blocks_contract_total" : "",
  ].filter(Boolean);
  return {
    pricedRequiredRowsPercent: input.summary.pricedRequiredRowsPercent,
    preliminaryCostAllowed,
    contractTotalAllowed,
    ownerApproved,
    missingPriceBlocksContractTotal,
    blockingReasons,
  };
}
