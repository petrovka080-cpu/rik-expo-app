import type { GlobalEstimateInput, GlobalLocaleContext, GlobalTaxMode, GlobalUnitSystem } from "./globalEstimateTypes";

type CountryDefaults = {
  locale: string;
  language: string;
  currency: string;
  unitSystem: GlobalUnitSystem;
  taxMode: GlobalTaxMode;
  taxIncludedByDefault: boolean;
};

const COUNTRY_DEFAULTS: Record<string, CountryDefaults> = {
  KG: { locale: "ru-KG", language: "ru", currency: "KGS", unitSystem: "metric", taxMode: "nds", taxIncludedByDefault: false },
  US: { locale: "en-US", language: "en", currency: "USD", unitSystem: "imperial", taxMode: "sales_tax", taxIncludedByDefault: false },
  CA: { locale: "en-CA", language: "en", currency: "CAD", unitSystem: "imperial", taxMode: "gst", taxIncludedByDefault: false },
  DE: { locale: "de-DE", language: "de", currency: "EUR", unitSystem: "metric", taxMode: "vat", taxIncludedByDefault: true },
  FR: { locale: "fr-FR", language: "fr", currency: "EUR", unitSystem: "metric", taxMode: "vat", taxIncludedByDefault: true },
  GB: { locale: "en-GB", language: "en", currency: "GBP", unitSystem: "metric", taxMode: "vat", taxIncludedByDefault: true },
  SG: { locale: "en-SG", language: "en", currency: "SGD", unitSystem: "mixed", taxMode: "gst", taxIncludedByDefault: false },
  AE: { locale: "en-AE", language: "en", currency: "AED", unitSystem: "metric", taxMode: "vat", taxIncludedByDefault: false },
  IN: { locale: "en-IN", language: "en", currency: "INR", unitSystem: "metric", taxMode: "gst", taxIncludedByDefault: false },
  XX: { locale: "en-001", language: "en", currency: "USD", unitSystem: "metric", taxMode: "unknown", taxIncludedByDefault: false },
};

function inferLanguage(text?: string): string | undefined {
  if (!text) return undefined;
  if (/[а-яё]/i.test(text)) return "ru";
  if (/\b(laminat|verlegen|deutschland|quadratmeter)\b/i.test(text)) return "de";
  if (/\b(peinture|murs|paris)\b/i.test(text)) return "fr";
  return "en";
}

function inferLocation(text?: string): Partial<Pick<GlobalLocaleContext, "countryCode" | "stateOrRegion" | "city" | "postalCode">> {
  const value = text ?? "";
  const postal = value.match(/\b\d{5}(?:-\d{4})?\b/)?.[0];
  if (/бишкек|bishkek|kyrgyz/i.test(value)) return { countryCode: "KG", city: "Bishkek", postalCode: postal };
  if (/dallas/i.test(value)) return { countryCode: "US", stateOrRegion: "TX", city: "Dallas", postalCode: postal };
  if (/texas|\btx\b/i.test(value)) return { countryCode: "US", stateOrRegion: "TX", postalCode: postal };
  if (/california|\bca\b/i.test(value)) return { countryCode: "US", stateOrRegion: "CA", postalCode: postal };
  if (/new york|\bny\b/i.test(value)) return { countryCode: "US", stateOrRegion: "NY", city: "New York", postalCode: postal };
  if (/berlin|deutschland|germany/i.test(value)) return { countryCode: "DE", city: /berlin/i.test(value) ? "Berlin" : undefined };
  if (/paris|france/i.test(value)) return { countryCode: "FR", city: /paris/i.test(value) ? "Paris" : undefined };
  if (/london|united kingdom|\buk\b/i.test(value)) return { countryCode: "GB", city: /london/i.test(value) ? "London" : undefined };
  if (/singapore|\bsg\b/i.test(value)) return { countryCode: "SG", city: "Singapore" };
  if (/dubai|uae|emirates/i.test(value)) return { countryCode: "AE", city: /dubai/i.test(value) ? "Dubai" : undefined };
  if (/india|mumbai|delhi|bangalore/i.test(value)) return { countryCode: "IN", city: value.match(/mumbai|delhi|bangalore/i)?.[0] };
  return {};
}

function precisionFor(input: Pick<GlobalLocaleContext, "stateOrRegion" | "county" | "city" | "postalCode">): GlobalLocaleContext["addressPrecision"] {
  if (input.postalCode) return "postal_code";
  if (input.city) return "city";
  if (input.county) return "county";
  if (input.stateOrRegion) return "state_or_region";
  return "country";
}

export function resolveGlobalLocaleContext(input: GlobalEstimateInput): GlobalLocaleContext {
  const inferred = inferLocation(input.text);
  const countryCode = (input.countryCode ?? inferred.countryCode ?? "XX").toUpperCase();
  const defaults = COUNTRY_DEFAULTS[countryCode] ?? COUNTRY_DEFAULTS.XX;
  const stateOrRegion = input.stateOrRegion ?? inferred.stateOrRegion;
  const county = input.county;
  const city = input.city ?? inferred.city;
  const postalCode = input.postalCode ?? inferred.postalCode;
  const addressPrecision = countryCode === "XX" ? "unknown" : precisionFor({ stateOrRegion, county, city, postalCode });
  const language = input.language ?? inferLanguage(input.text) ?? defaults.language;
  const locale = input.locale ?? defaults.locale;
  const source = input.countryCode || inferred.countryCode || input.stateOrRegion || input.city || input.postalCode
    ? "explicit_question"
    : "fallback";

  return {
    countryCode,
    stateOrRegion,
    county,
    city,
    postalCode,
    addressPrecision,
    language,
    locale,
    unitSystem: defaults.unitSystem,
    currency: input.currency ?? defaults.currency,
    taxMode: defaults.taxMode,
    taxIncludedByDefault: defaults.taxIncludedByDefault,
    source,
    confidence: source === "fallback" ? "low" : addressPrecision === "country" ? "medium" : "high",
  };
}

export function getCountryDefaults(countryCode: string): CountryDefaults {
  return COUNTRY_DEFAULTS[countryCode.toUpperCase()] ?? COUNTRY_DEFAULTS.XX;
}
