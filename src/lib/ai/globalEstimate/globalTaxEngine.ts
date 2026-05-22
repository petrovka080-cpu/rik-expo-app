import type { GlobalEstimateResult, GlobalTaxResolution } from "./globalEstimateTypes";

export function calculateGlobalTax(params: {
  sections: GlobalEstimateResult["sections"];
  taxResolution: GlobalTaxResolution;
}): GlobalEstimateResult["tax"] {
  const rule = params.taxResolution.rule;
  if (!rule) {
    return {
      taxType: "unknown",
      taxLabel: "Tax not calculated",
      taxableBase: 0,
      taxAmount: 0,
      included: false,
      requiresLocationPrecision: params.taxResolution.requiresLocationPrecision,
      requiredPrecision: params.taxResolution.requiredPrecision,
      warning: params.taxResolution.warning,
    };
  }

  const taxableBase = params.sections.reduce((sum, section) => {
    const applies = rule.appliesTo === "all" || rule.appliesTo === section.type;
    return applies ? sum + section.rows.reduce((rowSum, row) => rowSum + row.total, 0) : sum;
  }, 0);
  const taxAmount = rule.includedInPrice ? 0 : Number((taxableBase * rule.taxRate).toFixed(2));

  return {
    taxType: rule.taxType,
    taxLabel: rule.taxLabel,
    taxRate: rule.taxRate,
    taxableBase,
    taxAmount,
    included: rule.includedInPrice,
    requiresLocationPrecision: params.taxResolution.requiresLocationPrecision,
    requiredPrecision: params.taxResolution.requiredPrecision,
    warning: params.taxResolution.warning,
  };
}
