import { answerLiveAiForContext } from "../../src/lib/ai/liveUi";
import { CONNECTED_WEB_SOURCES } from "./aiExternalWebFallbackTestHelpers";

describe("S_AI_UNIVERSAL_CONTEXT_LEARNING_WEB_ANSWERING_CORE: public questions web", () => {
  it("can use public web for public construction questions when provider is connected", () => {
    const answer = answerLiveAiForContext({
      context: "foreman",
      userText: "дай смету на установку дверей",
      intentSources: CONNECTED_WEB_SOURCES,
    });

    expect(answer.sourceProvenance.some((source) => source.origin === "public_web" && source.sourceUrl)).toBe(true);
    expect(answer.answerTextRu).toContain("Интернет: использован");
  });
});
