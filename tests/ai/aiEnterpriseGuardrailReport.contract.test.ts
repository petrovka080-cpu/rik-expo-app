import { getAiEnterpriseGuardrailReport } from "../architecture/aiEnterpriseGuardrailsTestHelpers";

describe("AI enterprise guardrail report", () => {
  it("collects every required scanner without blockers", () => {
    const report = getAiEnterpriseGuardrailReport();
    expect(Object.keys(report.scans).sort()).toEqual([
      "approvalBypass",
      "dangerousMutations",
      "dbWrites",
      "englishAiCopy",
      "fakeData",
      "hooks",
      "runtimeDebugLeaks",
      "screenLocalAiLogic",
      "secondFramework",
      "unboundedQueries",
      "useEffect",
    ]);
    expect(Object.values(report.scans).every((scan) => scan.passed)).toBe(true);
  });
});
