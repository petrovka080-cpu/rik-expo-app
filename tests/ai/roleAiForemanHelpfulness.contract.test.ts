import { buildCoreProductGoldenPathsReport } from "../../scripts/e2e/coreProductGoldenPaths.shared";

describe("foreman role AI helpfulness", () => {
  it("uses app data without debug or unsafe mutation", () => {
    const role = buildCoreProductGoldenPathsReport().ai_role_scorecard.details.find((item) => item.role === "foreman");

    expect(role?.score).toBeGreaterThanOrEqual(7);
    expect(role?.uses_app_data).toBe(true);
    expect(role?.role_context_correct).toBe(true);
    expect(role?.has_next_step).toBe(true);
    expect(role?.does_not_show_debug).toBe(true);
    expect(role?.does_not_mutate_without_approval).toBe(true);
  });
});
