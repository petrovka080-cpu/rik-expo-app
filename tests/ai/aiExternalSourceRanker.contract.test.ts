import { rankAiExternalSource, makeAiExternalSourceRef } from "../../src/lib/ai/externalKnowledge";

describe("S_AI_VERIFIED_EXTERNAL_KNOWLEDGE: source ranker", () => {
  it("ranks official sources higher than general draft knowledge", () => {
    const official = rankAiExternalSource(makeAiExternalSourceRef({
      id: "official",
      origin: "official_regulation",
      sourceType: "official_regulation",
      titleRu: "Официальный источник",
      url: "https://cbd.minjust.gov.kg/",
      checkedAt: "2026-05-20T00:00:00.000Z",
      topic: "construction_norm",
      confidence: "high",
      canBePresentedAsFact: true,
      requiresReview: true,
    }));
    const draft = rankAiExternalSource(makeAiExternalSourceRef({
      id: "draft",
      origin: "general_knowledge",
      sourceType: "general_knowledge",
      titleRu: "Общие знания",
      checkedAt: "2026-05-20T00:00:00.000Z",
      topic: "construction_estimate",
      confidence: "low",
      canBePresentedAsFact: false,
      requiresReview: true,
    }));
    expect(official.trustScore).toBeGreaterThan(draft.trustScore);
    expect(draft.allowedFor).toBe("draft_estimate");
  });
});
