import type { EstimatorReasoningPlan } from "./estimatorKernelTypes";

export function validateEstimatorReasoningPlan(plan: EstimatorReasoningPlan | null): { passed: boolean; failures: string[] } {
  const failures: string[] = [];
  if (!plan) return { passed: false, failures: ["estimator_reasoning_plan_missing"] };
  if (plan.intent !== "estimate") failures.push("intent_not_estimate");
  if (!plan.semanticFrame.domain || !plan.semanticFrame.object || !plan.semanticFrame.operation) failures.push("semantic_frame_incomplete");
  if (!plan.parsableWorkDetected) failures.push("parsable_work_not_detected");
  if (plan.boqPlan.sections.length < 3) failures.push("boq_sections_missing");
  if (plan.boqPlan.requiredMaterials.length === 0) failures.push("required_materials_missing");
  if (plan.boqPlan.requiredLabor.length === 0) failures.push("required_labor_missing");
  if (!plan.pricingPolicy.sourcePolicy) failures.push("source_policy_missing");
  return { passed: failures.length === 0, failures };
}
