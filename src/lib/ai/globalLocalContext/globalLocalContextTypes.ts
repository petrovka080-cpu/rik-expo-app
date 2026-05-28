import type { GlobalEstimateConfidence, GlobalUnitSystem } from "../globalEstimate";

export type LocalContextCompleteness =
  | "LOCAL_CONTEXT_EXACT"
  | "LOCAL_CONTEXT_PARTIAL"
  | "LOCAL_CONTEXT_MISSING"
  | "LOCAL_CONTEXT_UNSUPPORTED";

export type LocalContextSource =
  | "explicit_prompt"
  | "explicit_input"
  | "user_locale_fallback"
  | "missing";

export type GlobalLocalContext = {
  countryCode: string | null;
  countryName?: string;
  region?: string;
  city?: string;
  language: string;
  currency: string | null;
  unitSystem: GlobalUnitSystem;
  source: LocalContextSource;
  completeness: LocalContextCompleteness;
  confidence: GlobalEstimateConfidence;
  warnings: string[];
};

export type GlobalLocalContextInput = {
  prompt?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  language?: string;
  currency?: string;
  userLocale?: string;
};

export type GlobalLocalCountryPolicy = {
  countryCode: string;
  countryName: string;
  currency: string;
  unitSystem: GlobalUnitSystem;
  language: string;
  aliases: readonly string[];
  cities: readonly {
    city: string;
    aliases: readonly string[];
    region?: string;
  }[];
  supportedLocalData: boolean;
};
