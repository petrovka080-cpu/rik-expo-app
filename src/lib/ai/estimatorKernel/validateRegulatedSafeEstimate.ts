import type { DynamicProfessionalBoq, EstimatorReasoningPlan } from "./estimatorKernelTypes";

export function validateRegulatedSafeEstimate(input: {
  plan: EstimatorReasoningPlan;
  boq?: DynamicProfessionalBoq;
}): { passed: boolean; failures: string[] } {
  const failures: string[] = [];
  if (!input.plan.semanticFrame.regulated) return { passed: true, failures };
  const text = [
    ...input.plan.boqPlan.exclusions,
    ...input.plan.boqPlan.clarifyingQuestions,
    ...(input.boq?.warnings ?? []),
    ...(input.boq?.rows.map((row) => row.name) ?? []),
  ].join("\n").toLocaleLowerCase("ru-RU");
  if (!/лиценз|допуск|инспек|профильн/.test(text)) failures.push("regulated_warning_missing");
  if (/сделай сам|diy step|самостоятельно/.test(text)) failures.push("unsafe_diy_instruction_found");
  return { passed: failures.length === 0, failures };
}
