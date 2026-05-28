import type { ConstructionDomain } from "./constructionSemanticTypes";

function normalizeConstructionSemanticText(value: string): string {
  return value
    .toLocaleLowerCase("ru-RU")
    .replace(/ё/g, "е")
    .replace(/[«»"']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function resolveConstructionDomain(text: string): ConstructionDomain {
  const normalized = normalizeConstructionSemanticText(text);
  if (/брусчат|тротуарн\w*\s+плит|мощени/.test(normalized)) return "paving";
  if (/кирпич|кладочн|кладк\w+\s+(?:стен|кирпич)/.test(normalized)) return "masonry";
  if (/линолеум/.test(normalized)) return "flooring";
  if (/навес|металлоконструкц|ферм|сварн/.test(normalized)) return "metalworks";
  if (/дву(?:х)?скат|кровл|крыш/.test(normalized)) return "roofing";
  if (/гидроизоляц/.test(normalized)) return "waterproofing";
  if (/капитальн\w*\s+ремонт|квартир/.test(normalized)) return "renovation";
  if (/плитк|кафел/.test(normalized)) return "tile";
  return "unknown";
}
