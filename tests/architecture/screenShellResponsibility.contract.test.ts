import { runGodComponentsDecompositionVerifier } from "../../scripts/architecture/verifyGodComponentsDecomposition";

describe("screen shell responsibility", () => {
  it("keeps decomposition responsibility boundaries green without app-code churn", () => {
    const report = runGodComponentsDecompositionVerifier();

    expect(report.screen_shells_thin).toBe(true);
    expect(report.domain_logic_extracted).toBe(true);
    expect(report.formatters_extracted).toBe(true);
    expect(report.ai_panels_extracted).toBe(true);
    expect(report.public_imports_preserved).toBe(true);
    expect(report.user_visible_behavior_changed).toBe(false);
    expect(report.new_hooks_added).toBe(false);
    expect(report.fake_green_claimed).toBe(false);
  });
});
