import { resolveGlobalTaxRule } from "../globalEstimate";
import type { GlobalLocalContext } from "./globalLocalContextTypes";
import type { LocalTaxPolicy } from "./taxPolicyTypes";

export function resolveTaxPolicy(context: GlobalLocalContext): LocalTaxPolicy {
  if (!context.countryCode) {
    return {
      status: "TAX_UNKNOWN_REGION_REQUIRED",
      label: "Налоговый режим не определён",
      warning: "Регион не указан: налог/НДС/VAT/GST не рассчитывается без страны/города.",
    };
  }
  if (context.completeness === "LOCAL_CONTEXT_UNSUPPORTED") {
    return {
      status: "TAX_EXCLUDED_WITH_WARNING",
      label: "Налог исключён",
      warning: "Нет проверенного локального налогового источника для региона; нужна ручная проверка.",
    };
  }

  const tax = resolveGlobalTaxRule({
    countryCode: context.countryCode,
    city: context.city,
    stateOrRegion: context.region,
    addressPrecision: context.city ? "city" : "country",
    language: context.language,
    locale: context.language === "ru" ? "ru-KG" : "en-US",
    unitSystem: context.unitSystem,
    currency: context.currency ?? "USD",
    taxMode: context.countryCode === "US" ? "sales_tax" : "vat",
    taxIncludedByDefault: false,
    source: context.source === "explicit_input" ? "explicit_question" : "fallback",
    confidence: context.confidence,
  });

  if (!tax.rule || tax.warning) {
    return {
      status: "TAX_EXCLUDED_WITH_WARNING",
      label: tax.warning ? "Налог требует уточнения" : "Налог исключён",
      warning: tax.warning ?? "Локальное налоговое правило не настроено; показываем смету без налога.",
    };
  }

  return {
    status: tax.rule.includedInPrice ? "TAX_INCLUDED_WITH_SOURCE" : "TAX_EXCLUDED_WITH_WARNING",
    label: tax.rule.taxLabel,
    sourceId: tax.source?.id,
    sourceLabel: tax.source?.label,
    sourceDate: tax.source?.checkedAt,
    warning: tax.rule.includedInPrice ? undefined : "Налог показан как отдельный статус; применимость зависит от договора и режима поставщика.",
  };
}
