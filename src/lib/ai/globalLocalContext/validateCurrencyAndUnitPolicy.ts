import type { CurrencyPolicy, MeasurementUnitPolicy } from "./currencyPolicyTypes";

export function validateCurrencyAndUnitPolicy(params: {
  currencyPolicy: CurrencyPolicy;
  unitPolicy: MeasurementUnitPolicy;
  exchangeRateUsed?: boolean;
}): { valid: boolean; failures: string[] } {
  const failures: string[] = [];
  if (!params.currencyPolicy.currency) failures.push("CURRENCY_MISSING");
  if (params.exchangeRateUsed && (!params.currencyPolicy.exchangeRateSourceId || !params.currencyPolicy.exchangeRateDate)) {
    failures.push("EXCHANGE_RATE_SOURCE_AND_DATE_REQUIRED");
  }
  if (!params.unitPolicy.unitSystem) failures.push("UNIT_SYSTEM_MISSING");
  return { valid: failures.length === 0, failures };
}
