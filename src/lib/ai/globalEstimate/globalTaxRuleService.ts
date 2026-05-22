import { GLOBAL_TAX_RULES } from "./globalEstimateSeedData";
import type { GlobalEstimateInput, GlobalLocaleContext, GlobalTaxResolution } from "./globalEstimateTypes";

function taxScore(rule: (typeof GLOBAL_TAX_RULES)[number], locale: GlobalLocaleContext): number {
  if (rule.postalCode && locale.postalCode && rule.postalCode === locale.postalCode) return 5;
  if (rule.city && locale.city && rule.city.toLowerCase() === locale.city.toLowerCase()) return 4;
  if (rule.stateOrRegion && locale.stateOrRegion && rule.stateOrRegion.toLowerCase() === locale.stateOrRegion.toLowerCase()) return 3;
  if (rule.countryCode === locale.countryCode) return 2;
  return 0;
}

export function resolveGlobalTaxRule(locale: GlobalLocaleContext, input: Pick<GlobalEstimateInput, "customerType" | "projectType"> = {}): GlobalTaxResolution {
  if (locale.countryCode === "US" && !locale.postalCode) {
    return {
      confidence: "low",
      warning: "Precise US sales tax is not calculated from country or state alone; ZIP or address is required.",
      requiresLocationPrecision: true,
      requiredPrecision: "postal_code",
    };
  }

  const candidates = GLOBAL_TAX_RULES
    .filter((rule) => {
      if (!rule.active) return false;
      if (input.customerType && rule.customerType !== "unknown" && rule.customerType !== input.customerType) return false;
      if (input.projectType && rule.projectType !== "unknown" && rule.projectType !== input.projectType) return false;
      return taxScore(rule, locale) > 0;
    })
    .map((rule) => ({ rule, score: taxScore(rule, locale) }))
    .sort((a, b) => b.score - a.score);

  const winner = candidates[0]?.rule;
  if (!winner) {
    return {
      confidence: "low",
      warning: "Local tax rule is not configured for this location; estimate is returned before tax.",
      requiresLocationPrecision: locale.addressPrecision === "unknown" || locale.addressPrecision === "country",
      requiredPrecision: locale.addressPrecision === "unknown" ? "city" : undefined,
    };
  }

  return {
    rule: winner,
    confidence: winner.requiresPreciseAddress ? "medium" : "high",
    requiresLocationPrecision: winner.requiresPreciseAddress && locale.addressPrecision !== "postal_code" && locale.addressPrecision !== "street_address",
    requiredPrecision: winner.requiredPrecision,
    source: {
      id: winner.id,
      type: winner.sourceType,
      label: winner.sourceLabel,
      checkedAt: winner.checkedAt,
      url: winner.sourceUrl,
    },
  };
}

export function listGlobalTaxRuleSummary() {
  return {
    rules: GLOBAL_TAX_RULES.length,
    countries: [...new Set(GLOBAL_TAX_RULES.map((rule) => rule.countryCode))].sort(),
    usCountryOnlyBlocked: true,
    taxWithoutRuleBlocked: true,
  };
}
