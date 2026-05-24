import type { GlobalEstimateResult } from "./globalEstimateTypes";

export type EstimateBoqDepthClass =
  | "simple_repair"
  | "flooring"
  | "tile"
  | "masonry"
  | "roofing"
  | "foundation"
  | "concrete"
  | "roadworks"
  | "electrical"
  | "plumbing"
  | "hvac"
  | "dangerous";

export const ESTIMATE_BOQ_MINIMUM_ROWS: Record<EstimateBoqDepthClass, number> = {
  simple_repair: 6,
  flooring: 6,
  tile: 8,
  masonry: 8,
  roofing: 10,
  foundation: 12,
  concrete: 10,
  roadworks: 10,
  electrical: 8,
  plumbing: 8,
  hvac: 8,
  dangerous: 6,
};

export function classifyEstimateBoqDepth(result: Pick<GlobalEstimateResult, "work" | "requiresReview">): EstimateBoqDepthClass {
  if (result.work.category === "foundation") return "foundation";
  if (result.work.category === "concrete") return "concrete";
  if (result.work.category === "roofing") return "roofing";
  if (result.work.category === "roadworks") return "roadworks";
  if (result.work.category === "masonry") return "masonry";
  if (result.work.category === "tile") return "tile";
  if (result.work.category === "flooring") return "flooring";
  if (result.work.category === "electrical") return "electrical";
  if (result.work.category === "plumbing") return "plumbing";
  if (result.work.category === "heating_hvac") return "hvac";
  if (result.requiresReview) return "dangerous";
  return "simple_repair";
}

export function minimumRowsForEstimate(result: Pick<GlobalEstimateResult, "work" | "requiresReview">): number {
  return ESTIMATE_BOQ_MINIMUM_ROWS[classifyEstimateBoqDepth(result)];
}
