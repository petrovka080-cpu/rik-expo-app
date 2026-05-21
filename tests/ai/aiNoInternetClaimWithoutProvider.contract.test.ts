import { answerLiveAiForContext } from "../../src/lib/ai/liveUi";
import { DISCONNECTED_WEB_SOURCES } from "./aiExternalWebFallbackTestHelpers";

describe("S_AI_EXTERNAL_WEB_FALLBACK_AND_SOURCE_PROVENANCE: no internet claim without provider", () => {
  it("says web search is not connected and does not present public web as fact", () => {
    const answer = answerLiveAiForContext({
      context: "foreman",
      userText: "дай мне смету на установку дверей",
      intentSources: DISCONNECTED_WEB_SOURCES,
    });

    expect(answer.answerTextRu).toContain("Интернет-поиск не подключён");
    expect(answer.sourceProvenance.some((source) => source.origin === "public_web" && source.canBePresentedAsFact)).toBe(false);
    expect(answer.providerTrace).not.toContain("externalWebSearchUsed");
  });
});
