import { calculateGlobalConstructionEstimateSync, type GlobalEstimateInput, type GlobalWorkCategory } from "../globalEstimate";
import { classifyEstimateIntent } from "./estimateIntentClassifier";
import { assertEstimateIntentBeatsRoleContext } from "./estimateIntentPriorityGuard";
import type { EstimateIntentRoute } from "./estimateRoutingTypes";

export const UNIVERSAL_ESTIMATE_CATEGORY_FALLBACK_TEMPLATES: Record<string, {
  category: GlobalWorkCategory;
  fallbackWorkKey: string;
}> = {
  universal_flooring_estimate: { category: "flooring", fallbackWorkKey: "other_construction_work" },
  universal_wall_finishing_estimate: { category: "wall_finishing", fallbackWorkKey: "other_construction_work" },
  universal_ceiling_estimate: { category: "ceiling", fallbackWorkKey: "other_construction_work" },
  universal_tile_estimate: { category: "tile", fallbackWorkKey: "ceramic_tile_laying" },
  universal_doors_windows_estimate: { category: "doors_windows", fallbackWorkKey: "window_installation" },
  universal_electrical_estimate: { category: "electrical", fallbackWorkKey: "electrical_basic" },
  universal_plumbing_estimate: { category: "plumbing", fallbackWorkKey: "plumbing_basic" },
  universal_roofing_estimate: { category: "roofing", fallbackWorkKey: "roof_repair" },
  universal_facade_estimate: { category: "facade", fallbackWorkKey: "facade_plaster" },
  universal_foundation_concrete_estimate: { category: "foundation", fallbackWorkKey: "foundation_concrete" },
  universal_masonry_estimate: { category: "masonry", fallbackWorkKey: "brick_masonry" },
  universal_waterproofing_estimate: { category: "waterproofing", fallbackWorkKey: "waterproofing_bathroom" },
  universal_insulation_estimate: { category: "insulation", fallbackWorkKey: "other_construction_work" },
  universal_demolition_estimate: { category: "demolition", fallbackWorkKey: "demolition_flooring" },
  universal_roadworks_estimate: { category: "roadworks", fallbackWorkKey: "asphalt_paving" },
  universal_landscaping_estimate: { category: "landscaping", fallbackWorkKey: "landscaping_basic" },
  universal_other_construction_estimate: { category: "other", fallbackWorkKey: "other_construction_work" },
};

export function fallbackWorkKeyForEstimateRoute(route: EstimateIntentRoute): string | undefined {
  if (route.resolvedWorkKey && route.resolvedWorkKey !== "other_construction_work") return route.resolvedWorkKey;
  const category = route.resolvedCategory;
  const fallback = Object.values(UNIVERSAL_ESTIMATE_CATEGORY_FALLBACK_TEMPLATES)
    .find((item) => item.category === category);
  return fallback?.fallbackWorkKey ?? "other_construction_work";
}

export function routeUniversalEstimateIntent(text: string): EstimateIntentRoute {
  const route = classifyEstimateIntent(text);
  assertEstimateIntentBeatsRoleContext(route);
  return route;
}

export function buildGlobalEstimateInputFromRoute(route: EstimateIntentRoute, input: Partial<GlobalEstimateInput> = {}): GlobalEstimateInput {
  const confidenceOverride = route.resolvedWorkKey === "other_construction_work"
    ? (route.confidence === "high" ? "medium" : route.confidence)
    : undefined;
  return {
    ...input,
    text: route.originalText,
    explicitWorkKey: fallbackWorkKeyForEstimateRoute(route),
    volume: route.volume ?? input.volume,
    unit: route.unit ?? input.unit,
    language: route.language ?? input.language,
    countryCode: route.location?.countryCode ?? input.countryCode ?? "KG",
    stateOrRegion: route.location?.stateOrRegion ?? input.stateOrRegion,
    city: route.location?.city ?? input.city,
    postalCode: route.location?.postalCode ?? input.postalCode,
    includeMaterials: input.includeMaterials ?? true,
    includeLabor: input.includeLabor ?? true,
    includeTax: input.includeTax ?? true,
    confidenceOverride: confidenceOverride ?? input.confidenceOverride,
  };
}

export function calculateUniversalRoutedEstimate(text: string, input: Partial<GlobalEstimateInput> = {}) {
  const route = routeUniversalEstimateIntent(text);
  if (!route.shouldCallEstimateTool) {
    throw new Error("ESTIMATE_INTENT_NOT_CONFIDENT_ENOUGH_FOR_TOOL");
  }
  return {
    route,
    result: calculateGlobalConstructionEstimateSync(buildGlobalEstimateInputFromRoute(route, input)),
  };
}
