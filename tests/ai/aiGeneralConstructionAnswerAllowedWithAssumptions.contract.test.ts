import { answerIntentFirst } from "./aiQueryIntentFirstTestHelpers";
import { expectUsefulLiveAnswer } from "./aiLiveUiTestHelpers";

describe("general construction answer allowed with assumptions", () => {
  it("answers construction guidance with assumptions and no project fact invention", () => {
    const answer = answerIntentFirst("warehouse", "как правильно выполнить монтаж окна");

    expectUsefulLiveAnswer(answer);
    expect(answer.queryIntent).toBe("general_construction_guidance");
    expect(answer.explicitUserIntentUsed).toBe(true);
    expect(answer.answerTextRu).toMatch(/про[её]ктный источник не найден|шаблон/i);
    expect(answer.answerTextRu).not.toMatch(/PAY-GKL|проектная смета EST/i);
  });
});
