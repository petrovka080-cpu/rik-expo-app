import { answerLiveAiForContext } from "../../src/lib/ai/liveUi";

describe("S_AI_EXTERNAL_WEB_FALLBACK_AND_SOURCE_PROVENANCE: source origin disclosure", () => {
  it("shows source origin block in normal answer text", () => {
    const answer = answerLiveAiForContext({
      context: "director",
      userText: "дай мне смету на установку окон",
    });

    expect(answer.sourceDisclosureRu).toContain("Источник ответа:");
    expect(answer.answerTextRu).toContain("Источник ответа:");
    expect(answer.answerTextRu).toContain("Данные приложения:");
    expect(answer.answerTextRu).toContain("PDF/документы:");
    expect(answer.answerTextRu).toContain("Marketplace:");
    expect(answer.answerTextRu).toContain("Интернет:");
    expect(answer.answerTextRu).toContain("Общие строительные знания:");
  });
});
