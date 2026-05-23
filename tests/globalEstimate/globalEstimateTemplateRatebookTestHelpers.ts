import {
  calculateGlobalConstructionEstimateSync,
  GLOBAL_ESTIMATE_TEMPLATE_RATEBOOK_REQUIRED_WORK_KEYS,
  GLOBAL_ESTIMATE_TEMPLATE_RECONCILIATION_EXPECTED_ROW_CODES,
  validateGlobalEstimateResult,
  type GlobalEstimateResult,
} from "../../src/lib/ai/globalEstimate";

export function buildTemplateRatebookEstimate(workKey: string, volume = 100): GlobalEstimateResult {
  return calculateGlobalConstructionEstimateSync({
    explicitWorkKey: workKey,
    volume,
    unit: "sq_m",
    countryCode: "KG",
    city: "Bishkek",
    language: "ru",
    locale: "ru-KG",
    currency: "KGS",
  });
}

export function rowCodes(result: GlobalEstimateResult): string[] {
  return result.sections.flatMap((section) => section.rows.map((row) => row.code));
}

export function expectExpectedRows(workKey: keyof typeof GLOBAL_ESTIMATE_TEMPLATE_RECONCILIATION_EXPECTED_ROW_CODES): void {
  const result = buildTemplateRatebookEstimate(workKey);
  const codes = rowCodes(result);
  for (const expectedCode of GLOBAL_ESTIMATE_TEMPLATE_RECONCILIATION_EXPECTED_ROW_CODES[workKey]) {
    expect(codes).toContain(expectedCode);
  }
  expect(validateGlobalEstimateResult(result).passed).toBe(true);
}

export function allRequiredEstimates(): GlobalEstimateResult[] {
  return GLOBAL_ESTIMATE_TEMPLATE_RATEBOOK_REQUIRED_WORK_KEYS.map((workKey) =>
    buildTemplateRatebookEstimate(workKey),
  );
}
