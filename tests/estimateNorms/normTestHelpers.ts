import {
  certifyAllEstimateNormBindings10000,
  runEstimateNormGoldenCases20,
  validateEstimateNormKnowledgeBase,
  type EstimateNormCertificationSummary,
  type EstimateNormValidationSummary,
} from "../../src/lib/ai/estimateTemplate10000";

let validationSummary: EstimateNormValidationSummary | null = null;
let certificationSummary: EstimateNormCertificationSummary | null = null;
let goldenResults: ReturnType<typeof runEstimateNormGoldenCases20> | null = null;

export function normValidation(): EstimateNormValidationSummary {
  validationSummary ??= validateEstimateNormKnowledgeBase();
  return validationSummary;
}

export function normCertification(): EstimateNormCertificationSummary {
  certificationSummary ??= certifyAllEstimateNormBindings10000();
  return certificationSummary;
}

export function normGoldenResults(): ReturnType<typeof runEstimateNormGoldenCases20> {
  goldenResults ??= runEstimateNormGoldenCases20();
  return goldenResults;
}
