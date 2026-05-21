import { answerLiveAiForContext } from "../../src/lib/ai/liveUi";
import { CONNECTED_WEB_SOURCES } from "./aiExternalWebFallbackTestHelpers";

describe("S_AI_CONSTRUCTION_INTENT_ESTIMATE_ENGINE_RECOVERY: web when allowed", () => {
  it("uses public web only after app/PDF checks for public estimate questions", () => {
    const answer = answerLiveAiForContext({
      context: "foreman",
      userText: "дай мне смету на установку дверей",
      intentSources: CONNECTED_WEB_SOURCES,
    });

    expect(answer.queryIntent).toBe("construction_estimate_request");
    expect(answer.providerTrace).toEqual(expect.arrayContaining([
      "appDataCheckedFirst",
      "pdfDocumentsCheckedBeforeWeb",
      "externalWebSearchUsed",
    ]));
    expect(answer.sourceProvenance.some((source) => source.origin === "public_web" && source.sourceUrl)).toBe(true);
  });
});
