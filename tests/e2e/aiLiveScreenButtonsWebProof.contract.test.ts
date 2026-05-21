import { buildAiLiveWebProofFixture } from "../ai/aiLiveScreenCopilotTestHelpers";

describe("AI live screen web proof", () => {
  it("clicks all live AI buttons and reads actual answer text contract output", () => {
    const proof = buildAiLiveWebProofFixture();
    expect(proof.blockers).toEqual([]);
    expect(proof.matrix.web_proof_clicks_all_ai_buttons).toBe(true);
    expect(proof.matrix.web_answers_read_actual_dom_text).toBe(true);
    expect(proof.matrix.deep_links_clickable_on_web).toBe(true);
    expect(proof.clickResults).toHaveLength(67);
  });
});
