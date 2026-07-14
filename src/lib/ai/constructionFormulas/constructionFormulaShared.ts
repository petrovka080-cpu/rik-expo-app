export function parseFirstAreaSqM(text: string): number | null {
  const normalized = text.toLocaleLowerCase("ru-RU").replace(/,/g, ".");
  const areaMatches = [...normalized.matchAll(/(\d+(?:\.\d+)?)\s*(?:кв\.?\s*м|м2|м²|квадрат\w*\s+метр\w*|sqm|sq\s*m)/g)];
  const first = areaMatches[0]?.[1];
  return first ? Number(first) : null;
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
