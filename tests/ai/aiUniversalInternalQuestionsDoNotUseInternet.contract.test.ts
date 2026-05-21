import { answerLiveAiForContext, buildUniversalSourcePlan } from "../../src/lib/ai/liveUi";

describe("S_AI_UNIVERSAL_CONTEXT_LEARNING_WEB_ANSWERING_CORE: internal questions no internet", () => {
  it("does not use internet for company request counts", () => {
    const questionRu = "сколько заявок было за май";
    const answer = answerLiveAiForContext({ context: "buyer", userText: questionRu });

    expect(buildUniversalSourcePlan({ questionRu }).internetAllowed).toBe(false);
    expect(answer.sourceProvenance.some((source) => source.origin === "public_web")).toBe(false);
    expect(answer.providerTrace).toContain("internetNotApplicable");
  });
});
