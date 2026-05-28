import type { ConstructionDomain, ConstructionObject } from "./constructionSemanticTypes";

function normalizeConstructionSemanticText(value: string): string {
  return value
    .toLocaleLowerCase("ru-RU")
    .replace(/ё/g, "е")
    .replace(/[«»"']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function resolveConstructionObject(input: { text: string; domain?: ConstructionDomain }): ConstructionObject {
  const normalized = normalizeConstructionSemanticText(input.text);

  if (/брусчат|тротуарн\w*\s+плит|мощени/.test(normalized)) return "paving_stone_surface";
  if (/кирпич/.test(normalized)) return "brick_wall";
  if (/линолеум/.test(normalized)) return "linoleum_floor";
  if (/навес/.test(normalized)) return "metal_canopy";
  if (/дву(?:х)?скат/.test(normalized) && /крыш|кровл/.test(normalized)) return "gable_roof";
  if (/гидроизоляц/.test(normalized) && /крыш|кровл/.test(normalized)) return "roof";
  if (/гидроизоляц/.test(normalized) && /ванн|сануз/.test(normalized)) return "bathroom";
  if (/квартир/.test(normalized)) return "apartment";
  if (/плитк|кафел/.test(normalized)) return "tile_surface";
  return input.domain === "roofing" ? "roof" : "unknown";
}
