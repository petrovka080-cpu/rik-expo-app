import { resolveFormulaForEstimatorPlan, validateFormulaResult } from "../constructionFormulas";
import { compileDynamicProfessionalBoq, validateDynamicProfessionalBoq } from "../professionalBoq/compileDynamicProfessionalBoq";
import { buildRegulatedSafeEstimatePlan } from "./buildRegulatedSafeEstimatePlan";
import { buildEstimatorReasoningPlan } from "./buildEstimatorReasoningPlan";
import type { DynamicProfessionalBoq, EstimatorOutcome, EstimatorReasoningPlan } from "./estimatorKernelTypes";
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
      boq: null,
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
  let compiledBoq: DynamicProfessionalBoq | null = null;
  try {
    const boq = compileDynamicProfessionalBoq(plan);
    compiledBoq = boq;
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
    boq: compiledBoq,
    parsableWorkDetected: plan.parsableWorkDetected,
    regulatedWorkDetected: plan.regulatedWorkDetected,
    templateExactMatch: plan.templateExactMatch,
    dynamicBoqUsed,
    failures,
  };
}

export type OpenWorldKnownWorkPolicyDecision = {
  knownWorkDetected: boolean;
  templateGapAllowed: boolean;
  classification: string;
  workKey?: string;
};

export function resolveOpenWorldKnownWorkPolicy(text: string): OpenWorldKnownWorkPolicyDecision {
  const outcome = resolveEstimatorOutcome({ text });
  const knownWorkDetected = Boolean(outcome.plan && outcome.parsableWorkDetected);
  return {
    knownWorkDetected,
    templateGapAllowed: !knownWorkDetected,
    classification: outcome.classification,
    workKey: outcome.plan?.workKey,
  };
}

export type OpenWorldConstructionComposerResult = {
  classification: "preliminary_boq" | "template_gap";
  plan: EstimatorReasoningPlan | null;
  boq: DynamicProfessionalBoq | null;
  rowCount: number;
};

export function composeOpenWorldConstructionPreliminaryBoq(text: string): OpenWorldConstructionComposerResult {
  const outcome = resolveEstimatorOutcome({ text });
  if (!outcome.plan || !outcome.boq || outcome.failures.length > 0) {
    return {
      classification: "template_gap",
      plan: outcome.plan,
      boq: null,
      rowCount: 0,
    };
  }
  return {
    classification: "preliminary_boq",
    plan: outcome.plan,
    boq: outcome.boq,
    rowCount: outcome.boq.rows.length,
  };
}
