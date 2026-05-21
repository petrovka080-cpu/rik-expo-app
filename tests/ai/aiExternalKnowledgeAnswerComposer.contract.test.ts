import { makeExternalKnowledgeAnswer } from "./aiVerifiedExternalKnowledgeTestHelpers";

describe("S_AI_VERIFIED_EXTERNAL_KNOWLEDGE: answer composer", () => {
  it("renders short answer, app check, external sources, missing data, next step and status", () => {
    const answer = makeExternalKnowledgeAnswer();
    expect(answer.answerTextRu).toContain("Коротко:");
    expect(answer.answerTextRu).toContain("Что найдено в приложении:");
    expect(answer.answerTextRu).toContain("Внешние источники:");
    expect(answer.answerTextRu).toContain("Чего не хватает:");
    expect(answer.answerTextRu).toContain("Следующий шаг:");
    expect(answer.answerTextRu).toContain("Статус:");
  });
});
