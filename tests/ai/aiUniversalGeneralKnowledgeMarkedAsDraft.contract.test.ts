import { answerLiveAiForContext } from "../../src/lib/ai/liveUi";

describe("S_AI_UNIVERSAL_CONTEXT_LEARNING_WEB_ANSWERING_CORE: general knowledge draft", () => {
  it("marks general construction knowledge as draft and not project fact", () => {
    const answer = answerLiveAiForContext({ context: "foreman", userText: "дай смету на асфальт 100 м2" });
    const knowledge = answer.sourceProvenance.filter((source) => source.origin === "general_construction_knowledge");

    expect(answer.status).toBe("draft_prepared");
    expect(knowledge.length).toBeGreaterThan(0);
    expect(knowledge.every((source) => source.canBePresentedAsFact === false)).toBe(true);
    expect(answer.answerTextRu).toContain("не проектный факт");
  });
});
