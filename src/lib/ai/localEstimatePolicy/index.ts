import { resolveCurrencyPolicy } from "./resolveCurrencyPolicy";
import { resolveEstimateCountryCity } from "./resolveEstimateCountryCity";
import { resolveRateSourcePolicy } from "./resolveRateSourcePolicy";
import { resolveTaxPolicy } from "./resolveTaxPolicy";
import type { LocalEstimatePolicy, LocalEstimatePolicyInput } from "./localEstimatePolicyTypes";

export * from "./localEstimatePolicyTypes";
export * from "./resolveEstimateCountryCity";
export * from "./resolveCurrencyPolicy";
export * from "./resolveTaxPolicy";
export * from "./resolveRateSourcePolicy";
export * from "./validateLocalEstimatePolicy";

export function resolveLocalEstimatePolicy(input: LocalEstimatePolicyInput): LocalEstimatePolicy {
  const countryCity = resolveEstimateCountryCity(input);
  const currency = resolveCurrencyPolicy({
    text: input.text,
    locale: input.locale,
    currency: input.currency,
    countryCode: countryCity.countryCode,
  });
  const tax = resolveTaxPolicy({ countryCode: countryCity.countryCode });
  const rate = resolveRateSourcePolicy({
    countryCode: countryCity.countryCode ?? undefined,
    city: countryCity.city ?? undefined,
  });
  return {
    countryCode: countryCity.countryCode,
    city: countryCity.city,
    currency: currency.currency,
    taxType: tax.taxType,
    taxLabel: tax.taxLabel,
    taxRate: tax.taxRate,
    taxWarning: tax.warning,
    rateSourceLabel: rate.label,
    sourceConfidence: rate.confidence,
    localPriceWarningRequired: Boolean(currency.warning || rate.warning || !countryCity.countryCode),
    fakeExchangeRateUsed: false,
    fakeTaxRuleUsed: false,
  };
}
