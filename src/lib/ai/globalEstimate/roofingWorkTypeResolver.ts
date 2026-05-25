import type { WorkTypeDisambiguationResult } from "./workTypeDisambiguation";

function hasAnyWorkTypeTerm(normalized: string, terms: readonly string[]): boolean {
  return terms.some((term) => term === "roof" ? /\broof\b/.test(normalized) : normalized.includes(term));
}

export const ROOF_SURFACE_TERMS = [
  "крыша",
  "крыш",
  "кровля",
  "кровл",
  "плоская кровля",
  "скатная крыша",
  "roof",
  "flat roof",
  "pitched roof",
];

export const ROOF_MEMBRANE_TERMS = [
  "мембрана",
  "мембран",
  "рубероид",
  "битумная мастика",
  "roof membrane",
  "membrane roofing",
  "bitumen",
];

export const ROOF_LEAK_TERMS = [
  "протечка",
  "течь",
  "leak",
  "roof leak",
];

export const ROOF_DETAIL_TERMS = [
  "парапет",
  "парапеты",
  "ендова",
  "ендовы",
  "примыкания",
  "проходки",
  "parapet",
  "valley",
  "flashing",
  "penetration",
];

const ROOF_SPECIALIZED_PASS_THROUGH_TERMS = [
  "металлочереп",
  "metal roofing",
  "metal roof",
  "мягкая кровля",
  "мягкую кровлю",
  "soft roofing",
  "гибкая черепица",
  "утепление",
  "утеплитель",
  "insulation",
  "демонтаж",
  "разборка",
  "demolition",
];

export function hasRoofingSurface(normalized: string): boolean {
  return hasAnyWorkTypeTerm(normalized, ROOF_SURFACE_TERMS);
}

export function resolveRoofingWorkType(normalized: string): WorkTypeDisambiguationResult | null {
  if (!hasRoofingSurface(normalized)) return null;
  if (hasAnyWorkTypeTerm(normalized, ROOF_SPECIALIZED_PASS_THROUGH_TERMS)) return null;

  if (hasAnyWorkTypeTerm(normalized, ["двускат", "gable"]) && !hasAnyWorkTypeTerm(normalized, ROOF_LEAK_TERMS)) {
    return { workKey: "gable_roof_installation", confidence: "high", reason: "gable_roof_surface" };
  }

  if (
    hasAnyWorkTypeTerm(normalized, ["плоская кровля", "flat roof", "roof membrane", "membrane roofing"]) ||
    hasAnyWorkTypeTerm(normalized, ROOF_MEMBRANE_TERMS)
  ) {
    return { workKey: "flat_roof_membrane", confidence: "high", reason: "flat_roof_membrane" };
  }

  if (hasAnyWorkTypeTerm(normalized, ROOF_LEAK_TERMS)) {
    return { workKey: "roof_repair", confidence: "high", reason: "roof_leak_repair" };
  }

  return null;
}
