const DASHES = /[\u2010-\u2015\u2212-]+/g;
const PUNCTUATION = /[!"#$%&'()*+,./:;<=>?@[\\\]^_`{|}~]+/g;

function normalizeUnits(value: string): string {
  return value
    .replace(/(?:m2|m²|м2|м²|кв\s*\.?\s*м|квадратн(?:ый|ого|ые|ых)?\s+м(?:етр(?:а|ов)?|\b)?)/giu, "м2")
    .replace(/(?:m3|m³|м3|м³|куб\s*\.?\s*м|кубическ(?:ий|ого|ие|их)?\s+м(?:етр(?:а|ов)?|\b)?)/giu, "м3")
    .replace(/(?:пог\s*\.?\s*м|м\s*\.?\s*п\s*\.?|метр\s+погонный|погонн(?:ый|ого|ые|ых)?\s+м(?:етр(?:а|ов)?|\b)?)/giu, "пог м")
    .replace(/(?:штук(?:а|и)?|шт\.?|pcs|pc|ед\.?)/giu, "шт");
}

function normalizeConstructionAbbreviations(value: string): string {
  return value
    .replace(/(^|\s)ж\s+б(?=\s|$)/giu, "$1жб")
    .replace(/(^|\s)железо\s*бетон(?:ный|ная|ное|ные|а|ом)?(?=\s|$)/giu, "$1жб")
    .replace(/(^|\s)эл\s*\.?\s*/giu, "$1электро ")
    .replace(/(^|\s)вент\s*\.?\s*/giu, "$1вентиляция ")
    .replace(/(^|\s)монтажн(?:ые|ых|ая|ой|ое)?\s+работы(?=\s|$)/giu, "$1монтаж")
    .replace(/(^|\s)демонтажн(?:ые|ых|ая|ой|ое)?\s+работы(?=\s|$)/giu, "$1демонтаж");
}

export function normalizeConstructionWorkAlias(input: string | null | undefined): string {
  const normalized = String(input ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("ru-RU")
    .replace(/ё/gu, "е")
    .replace(DASHES, " ");

  return normalizeConstructionAbbreviations(normalizeUnits(normalized).replace(PUNCTUATION, " "))
    .replace(/\s+/gu, " ")
    .trim();
}
