import { runEstimateQualityAdversarialAudit } from "../../scripts/e2e/runEstimateQualityGateProtocolAudit";
import { blockedGateFor, expectBlockedWith } from "./estimateQualityGateTestHelpers";

describe("carpet masonry quality guard", () => {
  it("blocks masonry rows in carpet estimates", () => {
    const audit = runEstimateQualityAdversarialAudit({ writeArtifacts: false });

    expectBlockedWith(blockedGateFor("carpet_masonry_row"), "CROSS_DOMAIN_ROW_LEAK");
    expect(audit.carpet_masonry_leak_blocked).toBe(true);
    expect(audit.false_green_passes).toBe(0);
  });
});
