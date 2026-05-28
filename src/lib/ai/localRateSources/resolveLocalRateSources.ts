import type { GlobalLocalContext } from "../globalLocalContext";
import type { LocalRateSourcePolicy } from "./localRateSourceTypes";

export function resolveLocalRateSources(context: GlobalLocalContext): LocalRateSourcePolicy {
  if (context.completeness === "LOCAL_CONTEXT_MISSING") {
    return {
      level: "boq_only_manual_estimator_required",
      confidence: "low",
      warning: "Регион не указан: цены не должны считаться локальными без source evidence.",
    };
  }
  if (context.completeness === "LOCAL_CONTEXT_UNSUPPORTED") {
    return {
      level: "boq_only_manual_estimator_required",
      confidence: "low",
      warning: "Нет проверенного local rate/source для региона; нужна ручная проверка сметчиком.",
    };
  }
  if (context.city) {
    return {
      level: "city_ratebook",
      sourceId: `local-ratebook:${context.countryCode}:${context.city}`,
      sourceType: "configured_reference",
      sourceDate: "2026-05-28",
      confidence: "high",
    };
  }
  return {
    level: "region_reference",
    sourceId: `local-ratebook:${context.countryCode}:country`,
    sourceType: "configured_reference",
    sourceDate: "2026-05-28",
    confidence: "medium",
    warning: "Город не указан: используется country/region-level reference с пониженной точностью.",
  };
}
