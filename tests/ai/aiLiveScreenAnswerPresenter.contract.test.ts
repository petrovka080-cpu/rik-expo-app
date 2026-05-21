import { answerAiLiveScreenButtonFixture } from "./aiLiveScreenCopilotTestHelpers";

describe("AI live screen answer presenter", () => {
  it("renders clean Russian answer sections with links and status", () => {
    const result = answerAiLiveScreenButtonFixture("accountant.payments_without_docs");
    expect(result.presentedTextRu).toContain("Коротко:");
    expect(result.presentedTextRu).toContain("Что найдено:");
    expect(result.presentedTextRu).toContain("Открыть:");
    expect(result.presentedTextRu).toContain("Источник ответа:");
    expect(result.presentedTextRu).toContain("Чего не хватает:");
    expect(result.presentedTextRu).toContain("Следующий шаг:");
    expect(result.presentedTextRu).toContain("Статус:");
    expect(result.openLinks.length).toBeGreaterThan(0);
    expect(result.guard.failureReason).toBeUndefined();
  });
});
