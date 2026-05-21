import { answerLiveAiForContext } from "../../src/lib/ai/liveUi";
import { CONNECTED_WEB_SOURCES } from "./aiExternalWebFallbackTestHelpers";

describe("S_AI_EXTERNAL_WEB_FALLBACK_AND_SOURCE_PROVENANCE: internet allowed only for public questions", () => {
  it("uses public web for public construction estimate questions", () => {
    const answer = answerLiveAiForContext({
      context: "warehouse",
      userText: "дай смету на монтаж дверей",
      intentSources: CONNECTED_WEB_SOURCES,
    });

    expect(answer.queryIntent).toBe("construction_estimate_request");
    expect(answer.sourceProvenance.some((source) => source.origin === "public_web" && source.canBePresentedAsFact)).toBe(true);
  });

  it("does not use public web for internal procurement request searches", () => {
    const answer = answerLiveAiForContext({
      context: "foreman",
      userText: "выдай мне заявки все по первому этажу",
      intentSources: CONNECTED_WEB_SOURCES,
    });

    expect(answer.queryIntent).toBe("procurement_request_search");
    expect(answer.sourceProvenance.some((source) => source.origin === "public_web")).toBe(false);
    expect(answer.answerTextRu).toContain("Интернет: не использовался");
  });
});
