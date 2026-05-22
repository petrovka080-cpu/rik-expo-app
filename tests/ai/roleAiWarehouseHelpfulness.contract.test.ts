import { buildCoreProductGoldenPathsReport } from "../../scripts/e2e/coreProductGoldenPaths.shared";

describe("warehouse role AI helpfulness", () => {
  it("uses stock movement data with next steps", () => {
    const role = buildCoreProductGoldenPathsReport().ai_role_scorecard.details.find((item) => item.role === "warehouse");

    expect(role?.score).toBeGreaterThanOrEqual(7);
    expect(role?.uses_app_data).toBe(true);
    expect(role?.role_context_correct).toBe(true);
    expect(role?.has_numbers_when_available).toBe(true);
    expect(role?.has_next_step).toBe(true);
    expect(role?.does_not_show_debug).toBe(true);
  });
});
