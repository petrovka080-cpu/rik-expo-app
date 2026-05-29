import type { EstimatorReasoningPlan } from "./estimatorKernelTypes";

export function buildRegulatedSafeEstimatePlan(plan: EstimatorReasoningPlan): EstimatorReasoningPlan {
  if (!plan.semanticFrame.regulated) return plan;
  return {
    ...plan,
    boqPlan: {
      ...plan.boqPlan,
      complexity: plan.boqPlan.complexity === "simple" ? "complex" : plan.boqPlan.complexity,
      exclusions: [
        ...plan.boqPlan.exclusions,
        "Разрешения, инспекция, лицензии и проектная экспертиза считаются отдельными позициями, если не указаны явно.",
      ],
      clarifyingQuestions: [
        ...plan.boqPlan.clarifyingQuestions,
        "Какие местные требования, допуски и инспекционные процедуры применяются к объекту?",
      ],
    },
  };
}
