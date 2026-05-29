import { resolveFormulaForEstimatorPlan, validateFormulaResult } from "../constructionFormulas";
import { compileDynamicProfessionalBoq, validateDynamicProfessionalBoq } from "../professionalBoq/compileDynamicProfessionalBoq";
import { buildRegulatedSafeEstimatePlan } from "./buildRegulatedSafeEstimatePlan";
import { buildEstimatorReasoningPlan } from "./buildEstimatorReasoningPlan";
import type { EstimatorOutcome } from "./estimatorKernelTypes";
import { validateEstimatorReasoningPlan } from "./validateEstimatorReasoningPlan";
import { validateRegulatedSafeEstimate } from "./validateRegulatedSafeEstimate";

export function resolveEstimatorOutcome(input: {
  text: string;
  currency?: string;
}): EstimatorOutcome {
  const initialPlan = buildEstimatorReasoningPlan(input);
  const planValidation = validateEstimatorReasoningPlan(initialPlan);
  if (!initialPlan) {
    return {
      classification: "SEMANTIC_FRAME_MISSING",
      plan: null,
      parsableWorkDetected: false,
      regulatedWorkDetected: false,
      templateExactMatch: false,
      dynamicBoqUsed: false,
      failures: planValidation.failures,
    };
  }
  const plan = buildRegulatedSafeEstimatePlan({
    ...initialPlan,
    formulas: resolveFormulaForEstimatorPlan(initialPlan),
  });
  const validation = validateEstimatorReasoningPlan(plan);
  const formulaValidation = validateFormulaResult(plan);
  const failures = [...validation.failures, ...formulaValidation.failures];
  let dynamicBoqUsed = false;
  try {
    const boq = compileDynamicProfessionalBoq(plan);
    dynamicBoqUsed = true;
    const boqValidation = validateDynamicProfessionalBoq(boq);
    const regulatedValidation = validateRegulatedSafeEstimate({ plan, boq });
    failures.push(...boqValidation.failures, ...regulatedValidation.failures);
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
  }
  const classification = failures.length > 0
    ? failures.some((failure) => failure.includes("formula")) ? "FORMULA_FAILED"
      : failures.some((failure) => failure.includes("weak_generic")) ? "WEAK_GENERIC_ROWS_FOUND"
        : dynamicBoqUsed ? "DYNAMIC_BOQ_NOT_USED" : "WORK_PLAN_MISSING"
    : plan.semanticFrame.regulated ? "REGULATED_SAFE_PROFESSIONAL_BOQ_OK" : "PARSABLE_DYNAMIC_BOQ_OK";
  return {
    classification,
    plan,
    parsableWorkDetected: plan.parsableWorkDetected,
    regulatedWorkDetected: plan.regulatedWorkDetected,
    templateExactMatch: plan.templateExactMatch,
    dynamicBoqUsed,
    failures,
  };
}
