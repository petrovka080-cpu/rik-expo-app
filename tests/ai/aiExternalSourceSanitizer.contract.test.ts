import { makeAiExternalSourceRef, sanitizeAiExternalSources } from "../../src/lib/ai/externalKnowledge";

describe("S_AI_VERIFIED_EXTERNAL_KNOWLEDGE: source sanitizer", () => {
  it("blocks public web sources without URL and controlled sources presented as live web", () => {
    const result = sanitizeAiExternalSources([
      makeAiExternalSourceRef({
        id: "bad-web",
        origin: "public_web",
        sourceType: "trusted_construction_reference",
        titleRu: "Источник без URL",
        checkedAt: "2026-05-20T00:00:00.000Z",
        topic: "construction_technology",
        confidence: "low",
        canBePresentedAsFact: true,
        requiresReview: true,
      }),
      makeAiExternalSourceRef({
        id: "controlled-live",
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
    expect(result.blockedSources).toHaveLength(2);
  });
});
