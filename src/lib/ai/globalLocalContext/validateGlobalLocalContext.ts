import type { GlobalLocalContext } from "./globalLocalContextTypes";

export type GlobalLocalContextValidation = {
  valid: boolean;
  failures: string[];
};

export function validateGlobalLocalContext(context: GlobalLocalContext): GlobalLocalContextValidation {
  const failures: string[] = [];
  if (context.completeness !== "LOCAL_CONTEXT_MISSING" && !context.countryCode) {
    failures.push("COUNTRY_CODE_MISSING");
  }
  if ((context.completeness === "LOCAL_CONTEXT_EXACT" || context.completeness === "LOCAL_CONTEXT_PARTIAL") && !context.currency) {
    failures.push("CURRENCY_MISSING");
  }
  if (context.completeness === "LOCAL_CONTEXT_MISSING" && context.warnings.length === 0) {
    failures.push("MISSING_LOCATION_WARNING_REQUIRED");
  }
  if (context.source === "user_locale_fallback" && context.confidence !== "low") {
    failures.push("USER_LOCALE_FALLBACK_MUST_BE_LOW_CONFIDENCE");
  }
  return { valid: failures.length === 0, failures };
}
