import { answerLiveAiForContext } from "../../src/lib/ai/liveUi";
import { CONNECTED_WEB_SOURCES } from "./aiExternalWebFallbackTestHelpers";

describe("S_AI_EXTERNAL_WEB_FALLBACK_AND_SOURCE_PROVENANCE: public construction web fallback", () => {
  it("checks app/PDF and then uses web for a public door estimate when web is connected", () => {
    const answer = answerLiveAiForContext({
      context: "foreman",
      userText: "дай мне смету на установку дверей",
      intentSources: CONNECTED_WEB_SOURCES,
    });

    expect(answer.answerTextRu).toMatch(/Данные приложения: проверены/);
    expect(answer.answerTextRu).toMatch(/PDF\/документы: проверены/);
    expect(answer.answerTextRu).toContain("Интернет: использован");
    expect(answer.answerTextRu).toMatch(/Общие строительные знания: использованы как черновик/);
  });
});
