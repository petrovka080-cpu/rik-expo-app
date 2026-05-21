import {
  getUniversalRoleQaQuestionBank,
  getUniversalRoleQaQuestionBankCoverage,
} from "../../src/lib/ai/universalRoleQa";

describe("S_AI_UNIVERSAL_ROLE_QA: question bank", () => {
  it("contains at least 500 questions across required categories", () => {
    const coverage = getUniversalRoleQaQuestionBankCoverage();

    expect(getUniversalRoleQaQuestionBank()).toHaveLength(500);
    expect(coverage.app_data).toBeGreaterThanOrEqual(100);
    expect(coverage.construction).toBeGreaterThanOrEqual(100);
    expect(coverage.marketplace).toBeGreaterThanOrEqual(75);
    expect(coverage.documents).toBeGreaterThanOrEqual(75);
    expect(coverage.role).toBeGreaterThanOrEqual(75);
    expect(coverage.typo).toBeGreaterThanOrEqual(50);
    expect(coverage.security_admin_client).toBeGreaterThanOrEqual(25);
  });
});
