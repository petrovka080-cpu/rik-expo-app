import { runEstimateQualityGateProtocolAudit } from "../../scripts/e2e/runEstimateQualityGateProtocolAudit";
import { estimateQualityGateAllowsUserOutput } from "../../src/lib/ai/estimateQualityGate";
import { blockedGateFor, goodQualityGate } from "./estimateQualityGateTestHelpers";

describe("estimate quality gate protocol", () => {
  it("defines honest terminal statuses and passes a good carpet estimate", () => {
    const protocol = runEstimateQualityGateProtocolAudit({ writeArtifacts: false });
    const gate = goodQualityGate();

    expect(protocol.quality_gate_enabled).toBe(true);
    expect(protocol.bad_estimate_can_be_blocked).toBe(true);
    expect(gate.status).not.toBe("QUALITY_BLOCKED");
    expect(estimateQualityGateAllowsUserOutput(gate)).toBe(true);
    expect(estimateQualityGateAllowsUserOutput(blockedGateFor("carpet_masonry_row"))).toBe(false);
    expect(gate.fake_green_claimed).toBe(false);
  });
});
