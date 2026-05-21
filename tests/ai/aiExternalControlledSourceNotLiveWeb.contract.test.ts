import { makeAiExternalSourceRef, sanitizeAiExternalSources } from "../../src/lib/ai/externalKnowledge";

describe("S_AI_VERIFIED_EXTERNAL_KNOWLEDGE: controlled sources", () => {
  it("blocks controlled external source as live public web", () => {
    const result = sanitizeAiExternalSources([
      makeAiExternalSourceRef({
        id: "controlled",
        origin: "public_web",
        sourceType: "controlled_external_source",
        titleRu: "Controlled",
        url: "https://example.invalid/",
        checkedAt: "2026-05-20T00:00:00.000Z",
        topic: "market_price",
        confidence: "low",
        canBePresentedAsFact: true,
        requiresReview: true,
      }),
    ]);
    expect(result.passed).toBe(false);
  });
});
