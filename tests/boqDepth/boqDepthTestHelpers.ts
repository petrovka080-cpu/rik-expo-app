import {
  calculateGlobalConstructionEstimateSync,
  classifyEstimateBoqDepth,
  minimumRowsForEstimate,
  validateEstimateBoqDepth,
  validateEstimateUnitSemantics,
  validateProfessionalEstimateFormulaQuality,
  type GlobalEstimateResult,
} from "../../src/lib/ai/globalEstimate";

export const STRIP_FOUNDATION_PROMPT =
  "смета на ленточный фундамент длин 48 метров ширина 0,4 м, и высота 1.7 м";

export function estimateForWorkKey(workKey: string, volume = 100, unit = "sq_m"): GlobalEstimateResult {
  return calculateGlobalConstructionEstimateSync({
    explicitWorkKey: workKey,
    volume,
    unit,
    language: "ru",
    countryCode: "KG",
    city: "Bishkek",
  });
}

export function stripFoundationEstimate(): GlobalEstimateResult {
  return calculateGlobalConstructionEstimateSync({
    text: STRIP_FOUNDATION_PROMPT,
    language: "ru",
    countryCode: "KG",
    city: "Bishkek",
  });
}

export function allRows(result: GlobalEstimateResult = stripFoundationEstimate()) {
  return result.sections.flatMap((section) => section.rows);
}

export function expectProfessionalEstimate(result: GlobalEstimateResult): void {
  const depth = validateEstimateBoqDepth(result);
  const formula = validateProfessionalEstimateFormulaQuality(result);
  const unitSemantics = validateEstimateUnitSemantics(result);

  expect(depth.actualRows).toBeGreaterThanOrEqual(minimumRowsForEstimate(result));
  expect(depth).toMatchObject({
    passed: true,
    hasMaterials: true,
    hasLabor: true,
    hasEquipmentOrDeliveryOrWarning: true,
    hasAssumptions: true,
    hasCostFactors: true,
    hasClarifyingQuestions: true,
    hasSourceEvidence: true,
    hasTaxStatusOrWarning: true,
  });
  expect(formula.passed).toBe(true);
  expect(formula.blockers).toEqual([]);
  expect(unitSemantics.passed).toBe(true);
}

export function professionalCase(workKey: string, volume = 100, unit = "sq_m") {
  const estimate = estimateForWorkKey(workKey, volume, unit);
  return {
    estimate,
    depthClass: classifyEstimateBoqDepth(estimate),
    depth: validateEstimateBoqDepth(estimate),
    formula: validateProfessionalEstimateFormulaQuality(estimate),
    unitSemantics: validateEstimateUnitSemantics(estimate),
    rows: allRows(estimate),
  };
}
