import type { GlobalTaxType } from "../globalEstimate";

export function resolveTaxPolicy(input: { countryCode?: string | null }): {
  taxType: GlobalTaxType;
  taxLabel: string;
  taxRate: number;
  warning: string;
} {
  if (input.countryCode === "KG") {
    return {
      taxType: "nds",
      taxLabel: "НДС Кыргызстан: справочное правило",
      taxRate: 0.12,
      warning: "НДС показан по справочному правилу; для счета нужна проверка налогового режима подрядчика.",
    };
  }
  if (input.countryCode === "US") {
    return {
      taxType: "sales_tax",
      taxLabel: "Sales tax: address-based warning",
      taxRate: 0,
      warning: "Для точного sales tax нужен адрес/ZIP и налоговый провайдер; налог не начислен автоматически.",
    };
  }
  if (input.countryCode === "DE" || input.countryCode === "FR" || input.countryCode === "GB") {
    return {
      taxType: "vat",
      taxLabel: "VAT reference warning",
      taxRate: 0,
      warning: "VAT зависит от страны, типа работ и статуса подрядчика; требуется локальная проверка.",
    };
  }
  return {
    taxType: "unknown",
    taxLabel: "Налоговый статус не определен",
    taxRate: 0,
    warning: "Регион и налоговый режим не указаны. Уточните город/страну для корректного НДС/налога.",
  };
}
