import { allLiveAnswers } from "./aiLiveUiTestHelpers";

const GENERIC_BLOCKER_COPY =
  /(Нужен конкретный источник|Проверен экран|generic fallback|точный ответ пока невозможен|нет выбранной складской позиции|нет выбранной работы|нет выбранной заявки|нет выбранного платежа|нет выбранного обсуждения)/i;

describe("live AI no generic blockers", () => {
  it("does not expose old screenMagic blockers in live answers", () => {
    for (const answer of allLiveAnswers()) {
      expect(answer.answerTextRu).not.toMatch(GENERIC_BLOCKER_COPY);
      expect(answer.genericAnswerUsed).toBe(false);
    }
  });
});
