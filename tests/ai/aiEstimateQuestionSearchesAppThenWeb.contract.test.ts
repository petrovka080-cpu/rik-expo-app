import { answerLiveAiForContext } from "../../src/lib/ai/liveUi";
import { CONNECTED_WEB_SOURCES } from "./aiExternalWebFallbackTestHelpers";

describe("S_AI_EXTERNAL_WEB_FALLBACK_AND_SOURCE_PROVENANCE: estimate source order", () => {
  it("searches app data and PDFs before external web", () => {
    const answer = answerLiveAiForContext({
      context: "foreman",
      userText: "дай мне смету на установку дверей",
      intentSources: CONNECTED_WEB_SOURCES,
    });

    const appIndex = answer.providerTrace.indexOf("appDataCheckedFirst");
    const pdfIndex = answer.providerTrace.indexOf("pdfDocumentsCheckedBeforeWeb");
    const webIndex = answer.providerTrace.indexOf("externalWebSearchUsed");

    expect(appIndex).toBeGreaterThanOrEqual(0);
    expect(pdfIndex).toBeGreaterThan(appIndex);
    expect(webIndex).toBeGreaterThan(pdfIndex);
  });
});
