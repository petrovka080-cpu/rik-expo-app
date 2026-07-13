import { runEstimateQualityDeepGolden300Audit } from "../../scripts/e2e/runEstimateQualityGateProtocolAudit";

describe("professional completeness quality", () => {
  it("passes deep golden estimates without required material or labor failures", () => {
    const audit = runEstimateQualityDeepGolden300Audit({ writeArtifacts: false });

    expect(audit.deep_golden_cases).toBe(300);
    expect(audit.quality_passed).toBe(300);
    expect(audit.required_material_failures).toBe(0);
  });
});
