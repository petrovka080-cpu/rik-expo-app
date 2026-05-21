import { answerLiveAiForContext } from "../../src/lib/ai/liveUi";

describe("S_AI_EXTERNAL_WEB_FALLBACK_AND_SOURCE_PROVENANCE: no demo-as-real", () => {
  it("does not present demo fixture or unknown source origins as real facts", () => {
    const answer = answerLiveAiForContext({
      context: "foreman",
      userText: "дай мне смету на установку дверей",
    });

    expect(answer.sourceProvenance).toEqual(expect.not.arrayContaining([
      expect.objectContaining({ origin: "demo_fixture", canBePresentedAsFact: true }),
      expect.objectContaining({ origin: "unknown", canBePresentedAsFact: true }),
    ]));
    expect(answer.answerTextRu).not.toMatch(/demo fixture|unknown source/i);
  });
});
