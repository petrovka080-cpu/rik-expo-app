import { replayForemanEstimateProof } from "../../src/lib/foreman";

describe("foreman estimate replay contract", () => {
  it("replays materials and subcontracts estimates through the shared revision artifacts", () => {
    const proof = replayForemanEstimateProof("test-source-sha");

    expect(proof.passed).toBe(true);
    expect(proof.foreman_materials_replay_passed).toBe(true);
    expect(proof.foreman_subcontracts_replay_passed).toBe(true);
    expect(proof.foreman_pdf_uses_latest_revision).toBe(true);
    expect(proof.foreman_buyer_uses_latest_revision).toBe(true);
  });
});
