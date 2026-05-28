import type { ConstructionWorkPlan, ConstructionWorkPlanValidation } from "./constructionSemanticTypes";

export function validateConstructionWorkPlan(plan: ConstructionWorkPlan): ConstructionWorkPlanValidation {
  const failures: string[] = [];
  if (!plan.estimateIntentDetected) failures.push("estimate_intent_not_detected");
  if (plan.domain === "unknown") failures.push("domain_unknown");
  if (plan.object === "unknown") failures.push("object_unknown");
  if (plan.operation === "unknown") failures.push("operation_unknown");
  if (!Number.isFinite(plan.quantity.volume) || plan.quantity.volume <= 0) failures.push("quantity_invalid");
  if (!plan.quantity.unit) failures.push("unit_missing");
  if (plan.workKey === "paving_stone_laying" && plan.domain === "masonry") failures.push("paving_stone_mapped_to_masonry");
  if (plan.workKey === "gable_roof_installation" && plan.operation === "repair") failures.push("gable_roof_mapped_to_repair");
  if (plan.workKey === "roof_waterproofing" && plan.object === "bathroom") failures.push("roof_waterproofing_mapped_to_bathroom");
  return { passed: failures.length === 0, failures };
}
