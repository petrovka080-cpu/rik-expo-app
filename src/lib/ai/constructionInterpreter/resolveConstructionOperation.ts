import type { ConstructionDomain, ConstructionObject, ConstructionOperation } from "./constructionSemanticTypes";

function normalizeConstructionSemanticText(value: string): string {
  return value
    .toLocaleLowerCase("ru-RU")
    .replace(/ё/g, "е")
    .replace(/[«»"']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function resolveConstructionOperation(input: {
  text: string;
  domain?: ConstructionDomain;
  object?: ConstructionObject;
}): ConstructionOperation {
  const normalized = normalizeConstructionSemanticText(input.text);
  if (input.object === "paving_stone_surface") return "laying";
  if (input.object === "linoleum_floor") return "laying";
  if (input.object === "brick_wall") return "masonry";
  if (input.object === "metal_canopy") return "installation";
  if (input.object === "gable_roof") return "installation";
  if (input.object === "roof" || input.object === "bathroom") return "waterproofing";
  if (input.object === "apartment") return "capital_renovation";
  if (/гидроизоляц/.test(normalized)) return "waterproofing";
  if (/ремонт/.test(normalized)) return "repair";
  if (/монтаж|установ|устройств/.test(normalized)) return "installation";
  if (/уклад/.test(normalized)) return "laying";
  return input.domain === "masonry" ? "masonry" : "unknown";
}
