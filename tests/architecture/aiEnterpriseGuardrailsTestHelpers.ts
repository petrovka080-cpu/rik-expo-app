import {
  AI_ENTERPRISE_GUARDRAILS_GREEN_STATUS,
  buildAiEnterpriseGuardrailMatrix,
  buildAiEnterpriseGuardrailReport,
} from "../../src/lib/ai/enterpriseGuardrails";

let cachedReport: ReturnType<typeof buildAiEnterpriseGuardrailReport> | null = null;

export function getAiEnterpriseGuardrailReport() {
  cachedReport ??= buildAiEnterpriseGuardrailReport(process.cwd());
  return cachedReport;
}

export function getAiEnterpriseGuardrailMatrix() {
  return buildAiEnterpriseGuardrailMatrix({
    report: getAiEnterpriseGuardrailReport(),
    guardrailRunnerInReleaseVerify: true,
    releaseVerifyPassed: true,
  });
}

export function expectEnterpriseGreenMatrix() {
  const matrix = getAiEnterpriseGuardrailMatrix();
  expect(matrix.final_status).toBe(AI_ENTERPRISE_GUARDRAILS_GREEN_STATUS);
  expect(matrix.fake_green_claimed).toBe(false);
  expect(matrix.blockers).toEqual([]);
  return matrix;
}
