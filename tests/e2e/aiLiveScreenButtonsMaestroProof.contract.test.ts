import { buildAiLiveAndroidProofFixture } from "../ai/aiLiveScreenCopilotTestHelpers";

describe("AI live screen Maestro proof", () => {
  it("clicks key live AI buttons and reads hierarchy text contract output", () => {
    const proof = buildAiLiveAndroidProofFixture();
    expect(proof.blockers).toEqual([]);
    expect(proof.matrix.android_proof_clicks_key_ai_buttons).toBe(true);
    expect(proof.matrix.android_answers_read_actual_text).toBe(true);
    expect(proof.clickResults.length).toBeGreaterThanOrEqual(20);
  });
});
