import { hasRoofingSurface, ROOF_DETAIL_TERMS, ROOF_LEAK_TERMS, ROOF_MEMBRANE_TERMS } from "./roofingWorkTypeResolver";
import type { WorkTypeDisambiguationResult } from "./workTypeDisambiguation";

function hasAnyWorkTypeTerm(normalized: string, terms: readonly string[]): boolean {
  return terms.some((term) => normalized.includes(term));
}

export const WATERPROOFING_TERMS = [
  "гидроизоляц",
  "waterproof",
  "water proof",
  "water-proof",
];

export const BATHROOM_WATERPROOFING_TERMS = [
  "ванная",
  "ванной",
  "санузел",
  "санузла",
  "мокрая зона",
  "стены ванной",
  "пол ванной",
  "bathroom",
  "wet room",
];

export const SHOWER_WATERPROOFING_TERMS = [
  "душ",
  "душевая",
  "душевой",
  "shower",
];

export const FOUNDATION_WATERPROOFING_TERMS = [
  "фундамент",
  "фундамента",
  "цоколь",
  "цоколя",
  "отмостка",
  "наружная гидроизоляция фундамента",
  "foundation",
  "plinth",
];

export const BASEMENT_WATERPROOFING_TERMS = [
  "подвал",
  "подвала",
  "погреб",
  "basement",
  "cellar",
];

export const POOL_WATERPROOFING_TERMS = [
  "бассейн",
  "бассейна",
  "чаша бассейна",
  "pool",
];

const FLOOR_UNDER_TILE_TERMS = [
  "пол перед плиткой",
  "пола перед плиткой",
  "пол под плитку",
  "пола под плитку",
  "floor before tile",
  "floor under tile",
];

function hasWaterproofingIntent(normalized: string): boolean {
  return hasAnyWorkTypeTerm(normalized, WATERPROOFING_TERMS);
}

function hasBasementFoundationContext(normalized: string): boolean {
  return hasAnyWorkTypeTerm(normalized, FOUNDATION_WATERPROOFING_TERMS) ||
    hasAnyWorkTypeTerm(normalized, ["наруж", "external", "outside"]);
}

export function resolveWaterproofingWorkType(normalized: string): WorkTypeDisambiguationResult | null {
  if (!hasWaterproofingIntent(normalized)) return null;

  if (hasAnyWorkTypeTerm(normalized, POOL_WATERPROOFING_TERMS)) {
    return { workKey: "pool_waterproofing", confidence: "high", reason: "pool_waterproofing_surface" };
  }

  if (hasRoofingSurface(normalized)) {
    if (hasAnyWorkTypeTerm(normalized, ["зелен", "green"])) {
      return { workKey: "green_roof_waterproofing", confidence: "high", reason: "green_roof_waterproofing_surface" };
    }
    if (
      hasAnyWorkTypeTerm(normalized, ["плоская кровля", "flat roof"]) ||
      hasAnyWorkTypeTerm(normalized, ROOF_MEMBRANE_TERMS)
    ) {
      return { workKey: "roof_membrane_waterproofing", confidence: "high", reason: "roof_membrane_waterproofing_surface" };
    }
    if (hasAnyWorkTypeTerm(normalized, ROOF_LEAK_TERMS) || hasAnyWorkTypeTerm(normalized, ROOF_DETAIL_TERMS)) {
      return { workKey: "roof_waterproofing", confidence: "high", reason: "roof_leak_or_detail_waterproofing_surface" };
    }
    return { workKey: "roof_waterproofing", confidence: "high", reason: "roof_waterproofing_surface" };
  }

  if (hasAnyWorkTypeTerm(normalized, BASEMENT_WATERPROOFING_TERMS)) {
    if (hasBasementFoundationContext(normalized)) {
      return { workKey: "foundation_waterproofing", confidence: "high", reason: "basement_with_foundation_context" };
    }
    return { workKey: "basement_waterproofing", confidence: "high", reason: "basement_waterproofing_surface" };
  }

  if (hasAnyWorkTypeTerm(normalized, FOUNDATION_WATERPROOFING_TERMS)) {
    return { workKey: "foundation_waterproofing", confidence: "high", reason: "foundation_waterproofing_surface" };
  }

  if (hasAnyWorkTypeTerm(normalized, SHOWER_WATERPROOFING_TERMS)) {
    return { workKey: "shower_tile_waterproofing", confidence: "high", reason: "shower_waterproofing_surface" };
  }

  if (hasAnyWorkTypeTerm(normalized, BATHROOM_WATERPROOFING_TERMS)) {
    return { workKey: "bathroom_waterproofing", confidence: "high", reason: "bathroom_waterproofing_surface" };
  }

  if (hasAnyWorkTypeTerm(normalized, FLOOR_UNDER_TILE_TERMS)) {
    return { workKey: "waterproofing_under_tile", confidence: "high", reason: "floor_under_tile_waterproofing_surface" };
  }

  return null;
}
