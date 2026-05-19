import { getAiScreenMagicPack } from "../../src/features/ai/screenMagic/aiScreenMagicEngine";
import { answerAiScreenMagicQuestion } from "../../src/features/ai/screenMagic/aiScreenMagicQuestionAnswerEngine";
import { buildAiScreenMagicClickPayload } from "../../src/features/ai/screenMagic/aiScreenMagicButtonResolver";

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

  it("answers AI button clicks as screen-context results instead of generic chat", () => {
    const pack = getAiScreenMagicPack({ role: "director", context: "director", screenId: "director.dashboard" });
    const approval = pack.buttons.find((button) => button.actionKind === "approval_required");
    expect(approval).toBeTruthy();

    const answer = answerAiScreenMagicQuestion({
      pack,
      question: buildAiScreenMagicClickPayload(approval!),
    });

    expect(answer).toMatchObject({
      answeredFromScreenContext: true,
      providerCallAllowed: false,
      topic: "director",
    });
    expect(answer?.answer).toContain("Маршрут согласования");
    expect(answer?.answer).toContain("Автоматическое согласование не выполнялось");
  });
});
