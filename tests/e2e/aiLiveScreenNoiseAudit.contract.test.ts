import { buildAiLiveWebProofFixture } from "../ai/aiLiveScreenCopilotTestHelpers";

describe("AI live screen noise audit", () => {
  it("keeps normal user answers free from provider/runtime/debug noise", () => {
    const proof = buildAiLiveWebProofFixture();
    expect(proof.noiseAudit.passed).toBe(true);
    expect(proof.matrix.runtime_debug_visible_to_normal_users).toBe(false);
    expect(proof.matrix.provider_unavailable_copy_visible_to_normal_users).toBe(false);
    expect(proof.matrix.raw_payload_visible_to_normal_users).toBe(false);
  });
});
