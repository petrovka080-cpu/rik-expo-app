import { buildCoreProductGoldenPathsReport } from "../../scripts/e2e/coreProductGoldenPaths.shared";

describe("marketplace role AI helpfulness", () => {
  it("uses marketplace data without debug or fake availability", () => {
    const role = buildCoreProductGoldenPathsReport().ai_role_scorecard.details.find((item) => item.role === "marketplace");

    expect(role?.score).toBeGreaterThanOrEqual(7);
    expect(role?.uses_app_data).toBe(true);
    expect(role?.role_context_correct).toBe(true);
    expect(role?.has_next_step).toBe(true);
    expect(role?.does_not_show_debug).toBe(true);
    expect(role?.no_fake_price_master_eta).toBe(true);
  });
});
