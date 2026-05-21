import { buildAiSourceProvenance } from "../../src/lib/ai/liveUi";

describe("S_AI_UNIVERSAL_CONTEXT_LEARNING_WEB_ANSWERING_CORE: no demo fixture as real data", () => {
  it("prevents demo_fixture from being presented as project fact", () => {
    const source = buildAiSourceProvenance({
      origin: "demo_fixture",
      sourceLabelRu: "demo fixture",
    });

    expect(source.canBePresentedAsFact).toBe(false);
    expect(source.requiresUserReview).toBe(true);
  });
});
