import { answerLiveAiForContext } from "../../src/lib/ai/liveUi";
import { CONNECTED_WEB_SOURCES } from "./aiExternalWebFallbackTestHelpers";

describe("S_AI_EXTERNAL_WEB_FALLBACK_AND_SOURCE_PROVENANCE: internal questions stay internal", () => {
  it("keeps first-floor request search inside app data even when web is connected", () => {
    const answer = answerLiveAiForContext({
      context: "director",
      userText: "дай заявки по первому этажу",
      intentSources: CONNECTED_WEB_SOURCES,
    });

    expect(answer.queryIntent).toBe("procurement_request_search");
    expect(answer.sourceProvenance.map((source) => source.origin)).not.toContain("public_web");
    expect(answer.providerTrace).not.toContain("externalWebSearchUsed");
    expect(answer.answerTextRu).toMatch(/Данные приложения: проверены|Данные приложения: использованы/);
  });
});
