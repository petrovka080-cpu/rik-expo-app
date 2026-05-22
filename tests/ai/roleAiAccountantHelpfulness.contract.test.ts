import { buildCoreProductGoldenPathsReport } from "../../scripts/e2e/coreProductGoldenPaths.shared";

describe("accountant role AI helpfulness", () => {
  it("uses finance data with numbers and no mutation", () => {
    const role = buildCoreProductGoldenPathsReport().ai_role_scorecard.details.find((item) => item.role === "accountant");

    expect(role?.score).toBeGreaterThanOrEqual(7);
    expect(role?.uses_app_data).toBe(true);
    expect(role?.has_numbers_when_available).toBe(true);
    expect(role?.has_next_step).toBe(true);
    expect(role?.does_not_show_debug).toBe(true);
    expect(role?.does_not_mutate_without_approval).toBe(true);
  });
});
