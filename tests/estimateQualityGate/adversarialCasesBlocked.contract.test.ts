import { runEstimateQualityAdversarialAudit } from "../../scripts/e2e/runEstimateQualityGateProtocolAudit";

describe("estimate quality adversarial corpus", () => {
  it("blocks all 300 adversarial bad estimates", () => {
    const audit = runEstimateQualityAdversarialAudit({ writeArtifacts: false });

    expect(audit.adversarial_cases).toBe(300);
    expect(audit.bad_estimates_blocked).toBe(300);
    expect(audit.false_green_passes).toBe(0);
  });
});
