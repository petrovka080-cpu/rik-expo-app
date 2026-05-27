export function resolveRateSourcePolicy(input: { countryCode?: string | null; city?: string | null }): {
  label: string;
  confidence: "high" | "medium" | "low";
  warning: string | null;
} {
  if (input.countryCode === "KG" && input.city) {
    return {
      label: "Справочные строительные ставки Бишкек/Кыргызстан; материалы нужно сверить по каталогу",
      confidence: "medium",
      warning: "Ставки справочные; перед закупкой подтвердите цены через каталог материалов или поставщика.",
    };
  }
  if (input.countryCode) {
    return {
      label: "Справочные строительные ставки по стране; нужен город и подтверждение поставщика",
      confidence: "low",
      warning: "Город не указан. Использованы справочные страновые ставки с обязательным уточнением.",
    };
  }
  return {
    label: "Глобальные справочные строительные ставки; нужен регион для локальной сметы",
    confidence: "low",
    warning: "Локальные ставки недоступны без города/страны; цены нельзя считать коммерческим предложением.",
  };
}
