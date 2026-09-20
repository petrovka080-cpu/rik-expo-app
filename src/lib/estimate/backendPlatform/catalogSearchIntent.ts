export type CanonicalCatalogSearchMode = "ANY" | "ALL" | "PHRASE";

export type CanonicalCatalogSearchIntent = {
  rawQuery: string;
  searchText: string;
  quantity: number | null;
  unit: "м²" | "шт" | "т" | "кг" | "м" | null;
  mode: CanonicalCatalogSearchMode;
  tokens: string[];
  dimensions: { lengthM: number; widthM: number; areaM2: number } | null;
};

const RELAXED_SEARCH_STOP_WORDS = new Set([
  "без", "в", "во", "для", "до", "и", "из", "к", "на", "над", "от", "по", "под", "при", "с", "со",
  "глубина", "длина", "класс", "количество", "марка", "общая", "объем", "объём", "площадь", "средняя",
  "толщина", "уклон", "ширина", "высота",
]);

export function normalizeCanonicalCatalogSearchQuery(value: string): string {
  return value
    .toLocaleLowerCase("ru")
    .replace(/ё/gu, "е")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/**
 * Produces independent literal terms for the second, deliberately non-
 * automatic search pass. The primary phrase contract stays authoritative;
 * this pass only makes a longer work description with geometry/specification
 * usable in the explicit suggestion picker.
 */
export function relaxedCanonicalCatalogSearchTokens(value: string): string[] {
  return [...new Set(normalizeCanonicalCatalogSearchQuery(value)
    .split(/\s+/u)
    .filter((token) => token.length >= 3)
    .filter((token) => !RELAXED_SEARCH_STOP_WORDS.has(token))
    .filter((token) => !/^\d+(?:[,.]\d+)?$/u.test(token))
    .map((token) => token.length > 5 ? token.slice(0, 4) : token))];
}

function decimal(rawInteger: string, rawFraction: string | undefined): number {
  return Number(`${rawInteger.replace(/[\s\u00a0]/gu, "")}.${rawFraction ?? "0"}`);
}

export function parseCanonicalCatalogSearchIntent(
  rawQuery: string,
  requestedMode: string | null,
  requestedTokens: string[],
): CanonicalCatalogSearchIntent {
  const normalizedRaw = rawQuery.normalize("NFC");
  const number = String.raw`(\d{1,3}(?:[\s\u00a0]\d{3})+|\d+)(?:[,.](\d+))?`;
  const dimensionPattern = new RegExp(
    String.raw`(?:^|\s)${number}\s*(?:м(?:етр(?:ов|а|ы)?)?\s*)?[xх×*]\s*${number}\s*(?:м(?:етр(?:ов|а|ы)?)?)?(?=\s|$)`,
    "iu",
  );
  const dimensionMatch = dimensionPattern.exec(normalizedRaw);
  const lengthM = dimensionMatch ? decimal(dimensionMatch[1]!, dimensionMatch[2]) : null;
  const widthM = dimensionMatch ? decimal(dimensionMatch[3]!, dimensionMatch[4]) : null;
  const dimensions = lengthM != null && widthM != null
    ? { lengthM, widthM, areaM2: lengthM * widthM }
    : null;
  const queryWithoutDimensions = dimensionMatch
    ? `${rawQuery.slice(0, dimensionMatch.index)} ${rawQuery.slice(dimensionMatch.index + dimensionMatch[0].length)}`
    : rawQuery;
  const quantityPattern =
    /(?:^|\s)(\d{1,3}(?:[\s\u00a0]\d{3})+|\d+)(?:[,.](\d+))?\s*(кв\.?\s*м(?:етр(?:ов|а)?)?|квадратн(?:ых|ого|ые)?\s+метр(?:ов|а)?|м[²2]|шт(?:ук|ука|уки)?|штук(?:а|и)?|метр(?:ов|а|ы)?|тонн?(?:а|ы)?|кг|м|т)(?=\s|$)/iu;
  const quantityMatch = dimensionMatch ? null : quantityPattern.exec(normalizedRaw);
  const quantity = dimensions?.areaM2 ?? (quantityMatch
    ? decimal(quantityMatch[1]!, quantityMatch[2])
    : null);
  const rawUnit = String(quantityMatch?.[3] ?? "").toLocaleLowerCase("ru");
  const unit = dimensions
    ? "м²" as const
    : !quantityMatch
      ? null
      : /^(?:кв|квадрат|м[²2])/u.test(rawUnit)
        ? "м²" as const
        : /^(?:шт|штук)/u.test(rawUnit)
          ? "шт" as const
          : /^(?:тон|т$)/u.test(rawUnit)
            ? "т" as const
            : rawUnit === "кг"
              ? "кг" as const
              : "м" as const;
  const searchText = normalizeCanonicalCatalogSearchQuery(
    quantityMatch
      ? `${rawQuery.slice(0, quantityMatch.index)} ${rawQuery.slice(quantityMatch.index + quantityMatch[0].length)}`
      : queryWithoutDimensions,
  );
  const explicitMode = String(requestedMode ?? "").trim().toUpperCase();
  const inferredMode: CanonicalCatalogSearchMode = /\s+или\s+/iu.test(searchText)
    ? "ANY"
    : "PHRASE";
  const mode: CanonicalCatalogSearchMode = ["ANY", "ALL", "PHRASE"].includes(explicitMode)
    ? explicitMode as CanonicalCatalogSearchMode
    : inferredMode;
  const tokenSource = requestedTokens.length > 0
    ? requestedTokens
    : mode === "ANY"
      ? searchText.split(/\s+или\s+|\s*[,;|]\s*/iu)
      : mode === "ALL"
        ? searchText.split(/\s+и\s+|\s*[,;|]\s*/iu)
        : [searchText];
  const tokens = [...new Set(tokenSource
    .map(normalizeCanonicalCatalogSearchQuery)
    .filter((token) => (token.match(/[\p{L}\p{N}]/gu) ?? []).length >= 2))];
  return { rawQuery, searchText, quantity, unit, mode, tokens, dimensions };
}
