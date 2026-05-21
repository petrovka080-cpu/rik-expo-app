import { answerLiveAiForContext } from "../../src/lib/ai/liveUi";
import { CONNECTED_WEB_SOURCES } from "./aiExternalWebFallbackTestHelpers";

describe("S_AI_EXTERNAL_WEB_FALLBACK_AND_SOURCE_PROVENANCE: public web source metadata", () => {
  it("requires URL and checkedAt for every presented public web source", () => {
    const answer = answerLiveAiForContext({
      context: "foreman",
      userText: "дай мне смету на установку дверей",
      intentSources: CONNECTED_WEB_SOURCES,
    });

    const publicWeb = answer.sourceProvenance.filter((source) => source.origin === "public_web" && source.canBePresentedAsFact);
    expect(publicWeb.length).toBeGreaterThan(0);
    for (const source of publicWeb) {
      expect(source.sourceUrl).toMatch(/^https:\/\//);
      expect(source.checkedAt).toMatch(/2026-05-20/);
      expect(source.sourceLabelRu.trim().length).toBeGreaterThan(0);
    }
    expect(answer.sourceProvenanceBlockers).toEqual([]);
  });
});
