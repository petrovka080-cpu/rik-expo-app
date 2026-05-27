import type { LocalEstimatePolicy } from "./localEstimatePolicyTypes";

export function validateLocalEstimatePolicy(policy: LocalEstimatePolicy): { passed: boolean; failures: string[] } {
  const failures: string[] = [];
  if (!policy.currency) failures.push("currency_missing");
  if (!policy.taxWarning) failures.push("tax_warning_missing");
  if (!policy.rateSourceLabel) failures.push("rate_source_missing");
  if (policy.fakeExchangeRateUsed) failures.push("fake_exchange_rate_used");
  if (policy.fakeTaxRuleUsed) failures.push("fake_tax_rule_used");
  if (!policy.countryCode && !policy.localPriceWarningRequired) failures.push("missing_location_without_warning");
  return { passed: failures.length === 0, failures };
}
