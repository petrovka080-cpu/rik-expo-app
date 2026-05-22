import type { GlobalEstimateInput, GlobalLocaleContext } from "./globalEstimateTypes";
import { resolveGlobalLocaleContext } from "./globalLocaleResolver";

export function resolveGlobalLocalization(input: GlobalEstimateInput): GlobalLocaleContext {
  return resolveGlobalLocaleContext(input);
}

export function requiresMoreTaxPrecision(locale: GlobalLocaleContext): boolean {
  return locale.taxMode === "sales_tax" && locale.countryCode === "US" && locale.addressPrecision !== "postal_code" && locale.addressPrecision !== "street_address";
}

export function formatGlobalNumber(value: number, locale: GlobalLocaleContext, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat(locale.locale, {
    maximumFractionDigits,
  }).format(value);
}

export function formatGlobalCurrency(value: number, locale: GlobalLocaleContext): string {
  try {
    return new Intl.NumberFormat(locale.locale, {
      style: "currency",
      currency: locale.currency,
      maximumFractionDigits: locale.currency === "KGS" || locale.currency === "INR" ? 0 : 2,
    }).format(value);
  } catch {
    return `${Math.round(value).toLocaleString(locale.locale)} ${locale.currency}`;
  }
}

export function localizedText(texts: Record<string, string>, locale: Pick<GlobalLocaleContext, "language">): string {
  return texts[locale.language] ?? texts.en ?? texts.ru ?? Object.values(texts)[0] ?? "";
}
