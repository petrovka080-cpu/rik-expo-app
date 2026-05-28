import { GLOBAL_LOCAL_COUNTRY_POLICIES, findGlobalLocalCountryPolicy } from "./globalLocalCountryPolicies";
import { includesLocationToken, normalizeLocationPrompt } from "./normalizeLocationPrompt";
import type { GlobalLocalContext, GlobalLocalContextInput, GlobalLocalCountryPolicy } from "./globalLocalContextTypes";

function inferLanguage(prompt: string, fallback = "ru"): string {
  if (/[а-яё]/i.test(prompt)) return "ru";
  if (/\b(deutschland|berlin|munich|muenchen)\b/i.test(prompt)) return "de";
  return fallback;
}

function inferCountryPolicy(prompt: string): GlobalLocalCountryPolicy | undefined {
  return GLOBAL_LOCAL_COUNTRY_POLICIES.find((policy) => includesLocationToken(prompt, policy.aliases.concat(policy.cities.flatMap((city) => city.aliases))));
}

function inferCity(
  prompt: string,
  policy: GlobalLocalCountryPolicy | undefined,
): Pick<GlobalLocalContext, "city" | "region"> {
  if (!policy) return {};
  const city = policy.cities.find((candidate) => includesLocationToken(prompt, candidate.aliases));
  return city ? { city: city.city, region: city.region } : {};
}

function completenessFor(context: Pick<GlobalLocalContext, "countryCode" | "city" | "region">, supported: boolean): GlobalLocalContext["completeness"] {
  if (!context.countryCode) return "LOCAL_CONTEXT_MISSING";
  if (!supported) return "LOCAL_CONTEXT_UNSUPPORTED";
  if (context.city) return "LOCAL_CONTEXT_EXACT";
  return "LOCAL_CONTEXT_PARTIAL";
}

function confidenceFor(completeness: GlobalLocalContext["completeness"]): GlobalLocalContext["confidence"] {
  if (completeness === "LOCAL_CONTEXT_EXACT") return "high";
  if (completeness === "LOCAL_CONTEXT_PARTIAL") return "medium";
  return "low";
}

export function resolveCountryRegionCity(input: GlobalLocalContextInput): GlobalLocalContext {
  const prompt = normalizeLocationPrompt(input.prompt);
  const explicitPolicy = findGlobalLocalCountryPolicy(input.countryCode);
  const promptPolicy = inferCountryPolicy(prompt);
  const localeCountry = input.userLocale?.split("-")[1]?.toUpperCase();
  const localePolicy = findGlobalLocalCountryPolicy(localeCountry);
  const policy = explicitPolicy ?? promptPolicy ?? localePolicy;
  const inferredCity = inferCity(prompt, policy);
  const countryCode = policy?.countryCode ?? input.countryCode?.toUpperCase() ?? null;
  const city = input.city ?? inferredCity.city;
  const region = input.region ?? inferredCity.region;
  const source: GlobalLocalContext["source"] = input.countryCode || input.city || input.region
    ? "explicit_input"
    : promptPolicy
      ? "explicit_prompt"
      : localePolicy
        ? "user_locale_fallback"
        : "missing";
  const completeness = completenessFor({ countryCode, city, region }, policy?.supportedLocalData ?? false);
  const warnings: string[] = [];

  if (completeness === "LOCAL_CONTEXT_MISSING") {
    warnings.push("Регион не указан. Цены ориентировочные. Уточните страну/город для локальной сметы.");
  } else if (completeness === "LOCAL_CONTEXT_PARTIAL") {
    warnings.push("Указана страна/регион, но город не указан. Для точной локальной цены нужен город или область.");
  } else if (completeness === "LOCAL_CONTEXT_UNSUPPORTED") {
    warnings.push("Для этого региона нет проверенного локального ratebook/source. Нужна ручная проверка сметчиком.");
  }

  if (source === "user_locale_fallback") {
    warnings.push("Регион взят из locale пользователя с низкой уверенностью; подтвердите город/страну.");
  }

  return {
    countryCode,
    countryName: policy?.countryName,
    region,
    city,
    language: input.language ?? inferLanguage(input.prompt ?? "", policy?.language ?? "ru"),
    currency: input.currency ?? policy?.currency ?? null,
    unitSystem: policy?.unitSystem ?? "metric",
    source,
    completeness,
    confidence: source === "user_locale_fallback" ? "low" : confidenceFor(completeness),
    warnings,
  };
}
