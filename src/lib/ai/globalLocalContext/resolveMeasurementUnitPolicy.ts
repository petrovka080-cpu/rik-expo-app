import type { GlobalLocalContext } from "./globalLocalContextTypes";
import type { MeasurementUnitPolicy } from "./currencyPolicyTypes";

export function resolveMeasurementUnitPolicy(context: GlobalLocalContext, prompt?: string): MeasurementUnitPolicy {
  const value = String(prompt ?? "").toLowerCase();
  if (context.countryCode === "US" && /\b(m2|m²|sqm|sq m|кв м)\b/i.test(value)) {
    return {
      unitSystem: "mixed",
      warning: "В запросе для США указаны метрические единицы; расчёт должен явно показывать формулу конверсии.",
    };
  }
  if (context.countryCode === "GB") {
    return {
      unitSystem: "mixed",
      warning: "Для UK возможны смешанные метрические/имперские единицы; проверьте единицу объёма.",
    };
  }
  return { unitSystem: context.unitSystem };
}
