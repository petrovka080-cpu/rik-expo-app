import { answerLiveAiForContext } from "../../src/lib/ai/liveUi";

describe("S_AI_UNIVERSAL_CONTEXT_LEARNING_WEB_ANSWERING_CORE: answer composer", () => {
  it("composes required UI sections for universal answers", () => {
    const answer = answerLiveAiForContext({
      context: "foreman",
      userText: "сколько заявок было за месяц май",
    });

    for (const section of ["Ответ", "Коротко:", "Что найдено:", "Источник ответа:", "Чего не хватает:", "Следующий шаг:", "Статус:"]) {
      expect(answer.answerTextRu).toContain(section);
    }
    expect(answer.changedData).toBe(false);
  });
});
