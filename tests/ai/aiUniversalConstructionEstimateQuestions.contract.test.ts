import { answerLiveAiForContext } from "../../src/lib/ai/liveUi";

describe("S_AI_UNIVERSAL_CONTEXT_LEARNING_WEB_ANSWERING_CORE: construction estimate questions", () => {
  it("answers asphalt and monolith estimates by construction topic", () => {
    const asphalt = answerLiveAiForContext({ context: "foreman", userText: "дай смету на асфальт 100 м2" });
    const monolith = answerLiveAiForContext({ context: "foreman", userText: "дай смету на заливку монолита на 1200 кв метров" });

    expect(asphalt.answerTextRu).toContain("асфальт");
    expect(monolith.answerTextRu).toContain("монолит");
    expect(monolith.answerTextRu).toContain("1200");
    expect(monolith.answerTextRu).not.toContain("ГКЛ");
  });
});
