import { answerLiveAiForContext } from "../../src/lib/ai/liveUi";

describe("S_AI_UNIVERSAL_CONTEXT_LEARNING_WEB_ANSWERING_CORE: no fake data", () => {
  it("does not present generated construction draft as project estimate fact", () => {
    const answer = answerLiveAiForContext({ context: "foreman", userText: "дай смету на асфальт 100 м2" });

    expect(answer.answerTextRu).toContain("не проектный факт");
    expect(answer.sourceProvenance.some((source) => source.origin === "demo_fixture" && source.canBePresentedAsFact)).toBe(false);
    expect(answer.sourceProvenance.some((source) => source.origin === "unknown" && source.canBePresentedAsFact)).toBe(false);
  });
});
