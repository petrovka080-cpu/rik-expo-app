import { replayForemanEstimateProof } from "../../src/lib/foreman/replayForemanEstimate";

describe("platform core v2 foreman flow", () => {
  it("replays materials and subcontract estimate flows through runtime artifacts", () => {
    const proof = replayForemanEstimateProof("test-source-sha");

    expect(proof.passed).toBe(true);
    expect(proof.foreman_materials_replay_passed).toBe(true);
    expect(proof.foreman_subcontracts_replay_passed).toBe(true);
    expect(proof.foreman_pdf_uses_latest_revision).toBe(true);
    expect(proof.foreman_buyer_uses_latest_revision).toBe(true);
  }, 300_000);
});
