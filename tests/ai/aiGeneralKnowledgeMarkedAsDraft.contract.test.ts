import { answerLiveAiForContext } from "../../src/lib/ai/liveUi";

describe("S_AI_EXTERNAL_WEB_FALLBACK_AND_SOURCE_PROVENANCE: general knowledge draft", () => {
  it("marks general construction knowledge as draft, not project fact", () => {
    const answer = answerLiveAiForContext({
      context: "foreman",
      userText: "дай мне смету на установку дверей",
    });

    const knowledge = answer.sourceProvenance.find((source) => source.origin === "general_construction_knowledge");
    expect(knowledge).toMatchObject({
      canBePresentedAsFact: false,
      requiresUserReview: true,
    });
    expect(answer.status).toBe("draft_prepared");
    expect(answer.answerTextRu).toContain("не проектный факт");
  });
});
