import { answerLiveAiForContext } from "../../src/lib/ai/liveUi";

describe("S_AI_UNIVERSAL_CONTEXT_LEARNING_WEB_ANSWERING_CORE: no web claim without provider", () => {
  it("does not claim internet was used when no connected provider exists", () => {
    const answer = answerLiveAiForContext({ context: "foreman", userText: "дай смету на асфальт 100 м2" });

    expect(answer.answerTextRu).toContain("Интернет-поиск не подключён");
    expect(answer.sourceProvenance.some((source) => source.origin === "public_web" && source.canBePresentedAsFact)).toBe(false);
  });
});
