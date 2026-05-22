import {
  assertGlobalEstimateResultSafe,
  assertProfessionalBoqAnswer,
  calculateGlobalConstructionEstimate,
  formatGlobalEstimateAnswer,
  type GlobalEstimateInput,
} from "../../src/lib/ai/globalEstimate";

export async function buildGlobalEstimateFixture(input: GlobalEstimateInput) {
  const result = await calculateGlobalConstructionEstimate(input);
  const answer = formatGlobalEstimateAnswer(result);
  assertGlobalEstimateResultSafe(result);
  assertProfessionalBoqAnswer(answer);
  return { result, answer };
}

export function expectProfessionalBoqShape(answer: string) {
  expect(answer).toContain("|");
  expect(answer).toMatch(/1\.1/);
  expect(answer).toMatch(/2\.1/);
  expect(answer).toMatch(/Tax|Налог|VAT|GST|sales tax/i);
  expect(answer).toMatch(/TOTAL|ИТОГО|Grand total/i);
}
