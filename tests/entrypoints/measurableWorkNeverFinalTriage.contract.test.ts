import {
  ENTERPRISE_VISIBLE_REQUEST_DRAFT_LIVE_REGRESSION_CASES,
  evaluateEnterpriseVisible500Case,
} from "../../scripts/e2e/enterpriseVisible500RequestDraftRealPathCore";

describe("measurable visible work never ends as final triage", () => {
  it("returns expanded estimates for live measurable prompts", () => {
    const results = ENTERPRISE_VISIBLE_REQUEST_DRAFT_LIVE_REGRESSION_CASES.map((testCase) =>
      evaluateEnterpriseVisible500Case({ ...testCase, route: "/request" }),
    );

    expect(results.map((item) => [item.caseId, item.failures])).toEqual(
      results.map((item) => [item.caseId, []]),
    );
    expect(results.every((item) => item.repairType !== "estimate_triage")).toBe(true);
    expect(results.every((item) => item.draftItems > 0)).toBe(true);
  });
});
