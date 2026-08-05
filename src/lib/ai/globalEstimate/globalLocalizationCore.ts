import type { GlobalEstimateInput, GlobalLocaleContext } from "./globalEstimateTypes";
import { resolveGlobalLocaleContext } from "./globalLocaleResolver";

const numberFormatters = new Map<string, Intl.NumberFormat>();
const currencyFormatters = new Map<string, Intl.NumberFormat>();
const formattedNumbers = new Map<string, string>();
const formattedCurrencies = new Map<string, string>();
const MAX_FORMATTED_VALUE_CACHE_SIZE = 512;
const RU_GROUP_SEPARATOR = "\u00a0";

function formatRussianNumber(value: number, maximumFractionDigits: number): string {
  const factor = 10 ** maximumFractionDigits;
  const roundedMagnitude =
    Math.round(Math.abs(value) * factor + Number.EPSILON) / factor;
  const [rawInteger, rawFraction = ""] =
    roundedMagnitude.toFixed(maximumFractionDigits).split(".");
  const integer = rawInteger.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    RU_GROUP_SEPARATOR,
  );
  const fraction = rawFraction.replace(/0+$/, "");
  const sign = value < 0 ? "-" : "";
  return `${sign}${integer}${fraction ? `,${fraction}` : ""}`;
}

function rememberFormattedValue(
  cache: Map<string, string>,
  key: string,
  build: () => string,
): string {
  const existing = cache.get(key);
  if (existing !== undefined) return existing;
  const formatted = build();
  if (cache.size >= MAX_FORMATTED_VALUE_CACHE_SIZE) cache.clear();
  cache.set(key, formatted);
  return formatted;
}

function numberFormatter(locale: string, maximumFractionDigits: number): Intl.NumberFormat {
  const key = `${locale}|${maximumFractionDigits}`;
  const existing = numberFormatters.get(key);
  if (existing) return existing;
  const formatter = new Intl.NumberFormat(locale, { maximumFractionDigits });
  numberFormatters.set(key, formatter);
  return formatter;
}

function currencyFormatter(
  locale: string,
  currency: string,
  maximumFractionDigits: number,
): Intl.NumberFormat {
  const key = `${locale}|${currency}|${maximumFractionDigits}`;
  const existing = currencyFormatters.get(key);
  if (existing) return existing;
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits,
  });
  currencyFormatters.set(key, formatter);
  return formatter;
}

export function resolveGlobalLocalization(input: GlobalEstimateInput): GlobalLocaleContext {
  return resolveGlobalLocaleContext(input);
}

export function requiresMoreTaxPrecision(locale: GlobalLocaleContext): boolean {
  return locale.taxMode === "sales_tax" && locale.countryCode === "US" && locale.addressPrecision !== "postal_code" && locale.addressPrecision !== "street_address";
}

export function formatGlobalNumber(value: number, locale: GlobalLocaleContext, maximumFractionDigits = 2): string {
  if (locale.locale === "ru-KG") {
    return formatRussianNumber(value, maximumFractionDigits);
  }
  const key = `${locale.locale}|${maximumFractionDigits}|${value}`;
  return rememberFormattedValue(
    formattedNumbers,
    key,
    () => numberFormatter(locale.locale, maximumFractionDigits).format(value),
  );
}

export function formatGlobalCurrency(value: number, locale: GlobalLocaleContext): string {
  try {
    const maximumFractionDigits =
      locale.currency === "KGS" || locale.currency === "INR" ? 0 : 2;
    if (locale.locale === "ru-KG" && locale.currency === "KGS") {
      return `${formatRussianNumber(value, maximumFractionDigits)}${RU_GROUP_SEPARATOR}сом`;
    }
    const key =
      `${locale.locale}|${locale.currency}|${maximumFractionDigits}|${value}`;
    return rememberFormattedValue(
      formattedCurrencies,
      key,
      () => currencyFormatter(
        locale.locale,
        locale.currency,
        maximumFractionDigits,
      ).format(value),
    );
  } catch {
    return `${numberFormatter(locale.locale, 0).format(Math.round(value))} ${locale.currency}`;
  }
}

export function localizedText(texts: Record<string, string>, locale: Pick<GlobalLocaleContext, "language">): string {
  return texts[locale.language] ?? texts.en ?? texts.ru ?? Object.values(texts)[0] ?? "";
}
