const RU_SUFFIX_PATTERN = /(ами|ями|ого|ему|ыми|ими|ах|ях|ам|ям|ом|ем|ой|ий|ый|ая|ое|ые|ых|их|ов|ев|ей|а|я|ы|и|е|у)$/iu;

function normalizeToken(token: string): string {
  const lower = token
    .toLocaleLowerCase("ru-RU")
    .replace(/ё/g, "е")
    .replace(/[`'’]/g, "");
  const stemmed = lower.length > 5 ? lower.replace(RU_SUFFIX_PATTERN, "") : lower;
  return stemmed.trim();
}

function expandAliasToken(token: string): string[] {
  const aliases: string[] = [token];
  if (token === "капремонт") aliases.push("капитальн", "ремонт");
  if (token === "квартир") aliases.push("квартира");
  if (token === "водоснабжен") aliases.push("водоснаб", "водопровод");
  if (token === "водопровод") aliases.push("водоснаб");
  if (token === "пнд") aliases.push("труб", "труба");
  if (token === "лэп") aliases.push("лини", "электр", "опор");
  if (token === "кв") aliases.push("киловольт");
  if (token === "мансардн") aliases.push("крыша", "кровл");
  if (token === "окна" || token === "окон") aliases.push("окн");
  if (token === "вентфасад") aliases.push("фасад", "утепл");
  if (token === "утеплитель") aliases.push("утепл");
  return aliases;
}

export function normalizeAiEstimateCatalogSearchTokens(value: string): string[] {
  const tokens = String(value ?? "")
    .toLocaleLowerCase("ru-RU")
    .replace(/ё/g, "е")
    .replace(/[^\p{L}0-9_]+/giu, " ")
    .split(/\s+/)
    .map(normalizeToken)
    .filter((token) => token.length >= 2)
    .flatMap(expandAliasToken);
  return [...new Set(tokens)].sort((a, b) => a.localeCompare(b));
}
