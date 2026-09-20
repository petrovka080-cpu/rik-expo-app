const QUANTITY_WITH_UNIT = /(?<![\p{L}\p{N}])(?:\d{1,3}(?:[ \u00A0\u202F]\d{3})+|\d+)(?:[,.]\d+)?\s*(?:штук(?:а|и)?|шт\.?|м2|м²|кв\.?\s*(?:м|метр(?:а|ов)?)|квадратн(?:ый|ая|ое|ые|ого|ой|ую|ых|ым|ыми)?\s+метр(?:а|ов)?|м3|м³|куб\.?\s*метр(?:а|ов)?|кубическ(?:ий|ая|ое|ие|ого|ой|ую|их|им|ими)?\s+метр(?:а|ов)?|км|мм|см|метр(?:а|ов|ы)?|м|кг|тонн(?:а|ы)?|т|л|комплект(?:а|ов)?|компл\.?|смен(?:а|ы)?|час(?:а|ов)?|ч)(?![\p{L}\p{N}])/giu;
const PLAN_DIMENSIONS = /(?<![\p{L}\p{N}])(?:\d{1,3}(?:[ \u00A0\u202F]\d{3})+|\d+)(?:[,.]\d+)?\s*(?:м(?:етр(?:а|ов|ы)?)?\s*)?[xх×*]\s*(?:\d{1,3}(?:[ \u00A0\u202F]\d{3})+|\d+)(?:[,.]\d+)?\s*(?:м(?:етр(?:а|ов|ы)?)?)?(?![\p{L}\p{N}])/giu;
const NAMED_COUNT_VALUE = /(?<![\p{L}\p{N}])\d+(?:[,.]\d+)?\s+(?=(?:розет|выключател|точ(?:ек|ки)?\s+освещен)[\p{L}]*)/giu;
const LEADING_REQUEST_WORDS = /^(?:нужно|надо|хочу|построить|постройте|сделать|выполнить|смета\s+на|рассчитать|посчитать|сформировать\s+смету\s+на)\s+/iu;
const TRAILING_SEARCH_PREPOSITION = /\s+(?:на|для|по)\s*$/iu;
const TRAILING_MEASURE_QUALIFIER = /\s+(?:длин(?:а|ой|у)|протяж[её]нност(?:ь|ью)|площад(?:ь|ью)|ширин(?:а|ой|у)|высот(?:а|ой|у)|толщин(?:а|ой|у)|глубин(?:а|ой|у))\s*$/iu;

/**
 * Выделяет именно наименование работы из пользовательского запроса для
 * literal backend-поиска. Исходный текст остаётся неизменным и продолжает
 * быть источником количества/условий при компиляции.
 */
export function canonicalWorkSearchQueryFromPrompt(value: string): string {
  const normalized = value.replace(/\s+/gu, " ").trim();
  if (!normalized) return "";
  const withoutQuantity = normalized
    .replace(PLAN_DIMENSIONS, " ")
    .replace(QUANTITY_WITH_UNIT, " ")
    .replace(NAMED_COUNT_VALUE, "")
    .replace(LEADING_REQUEST_WORDS, "")
    .replace(/\s+/gu, " ")
    .replace(TRAILING_MEASURE_QUALIFIER, "")
    .replace(TRAILING_SEARCH_PREPOSITION, "")
    .trim();
  return withoutQuantity || normalized;
}
