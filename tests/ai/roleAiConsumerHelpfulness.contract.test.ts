import { buildCoreProductGoldenPathsReport } from "../../scripts/e2e/coreProductGoldenPaths.shared";

describe("consumer role AI helpfulness", () => {
  it("uses consumer request data and produces a safe next step", () => {
    const role = buildCoreProductGoldenPathsReport().ai_role_scorecard.details.find((item) => item.role === "consumer");

    expect(role?.score).toBeGreaterThanOrEqual(7);
    expect(role?.uses_app_data).toBe(true);
    expect(role?.role_context_correct).toBe(true);
    expect(role?.has_next_step).toBe(true);
    expect(role?.does_not_show_debug).toBe(true);
    expect(role?.does_not_mutate_without_approval).toBe(true);
  });
});
