import { getAiScreenMagicPack } from "../../src/features/ai/screenMagic/aiScreenMagicEngine";
import { answerAiScreenMagicQuestion } from "../../src/features/ai/screenMagic/aiScreenMagicQuestionAnswerEngine";

describe("AI screen magic question answer engine", () => {
  it("answers role-native questions from screen context without provider calls", () => {
    const pack = getAiScreenMagicPack({ role: "accountant", context: "accountant", screenId: "accountant.main" });
    const answer = answerAiScreenMagicQuestion({
      pack,
      question: "Что сегодня критично по оплатам?",
    });

    expect(answer).toMatchObject({
      answeredFromScreenContext: true,
      providerCallAllowed: false,
      topic: "finance",
    });
    expect(answer?.answer).toContain("Готово от AI");
  });
});
