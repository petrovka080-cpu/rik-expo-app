import { answerLiveAiForContext } from "../../src/lib/ai/liveUi";
import { CONNECTED_WEB_SOURCES } from "./aiExternalWebFallbackTestHelpers";

describe("S_AI_EXTERNAL_WEB_FALLBACK_AND_SOURCE_PROVENANCE: external web fallback", () => {
  it("uses connected public web sources for public construction estimates after app/PDF checks", () => {
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
      "generalConstructionKnowledgeLast",
    ]));
    expect(answer.sourceProvenance.some((source) => source.origin === "public_web" && source.canBePresentedAsFact)).toBe(true);
    expect(answer.answerTextRu).toContain("Интернет: использован");
    expect(answer.answerTextRu).toContain("https://example.com/construction/door-install-estimate");
  });
});
