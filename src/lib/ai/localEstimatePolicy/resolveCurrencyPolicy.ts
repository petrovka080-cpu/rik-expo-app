import type { LocalEstimatePolicyInput } from "./localEstimatePolicyTypes";

const currencyByCountry: Record<string, string> = {
  KG: "KGS",
  US: "USD",
  DE: "EUR",
  FR: "EUR",
  GB: "GBP",
  AE: "AED",
  IN: "INR",
  SG: "SGD",
};

export function resolveCurrencyPolicy(input: Omit<LocalEstimatePolicyInput, "countryCode"> & { countryCode?: string | null }): {
  currency: string;
  warning: string | null;
} {
  if (input.currency) return { currency: input.currency, warning: null };
  if (input.countryCode && currencyByCountry[input.countryCode]) {
    return { currency: currencyByCountry[input.countryCode], warning: null };
  }
  return {
    currency: "USD",
    warning: "Регион не указан. Валюта и цены ориентировочные; уточните страну/город для локальной сметы.",
  };
}
