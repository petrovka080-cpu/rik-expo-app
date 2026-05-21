import {
  answerLiveAiForContext,
  assertAnswerMatchesQuestion,
} from "../../src/lib/ai/liveUi";

describe("S_AI_CONSTRUCTION_INTENT_ESTIMATE_ENGINE_RECOVERY: no topic mismatch", () => {
  it("fails the exact asphalt screenshot regression if the answer returns GKL or partitions", () => {
    const questionRu = "дай мне смету на укладку асфальта на площади 100 кв метров";
    const answer = answerLiveAiForContext({ context: "foreman", userText: questionRu });
    const assertion = assertAnswerMatchesQuestion({
      questionRu,
      answerRu: answer.answerTextRu,
      expectedIntent: "construction_estimate_request",
      requiredSignals: ["асфальт", "100", "смета", "основан", "уплотнение", "следующий шаг"],
      forbiddenSignals: ["ГКЛ", "монтаж перегородок", "фото после выполнения", "акт не подготовлен", "PAY-GKL"],
      requiredSections: ["Коротко", "Смета", "Что проверено", "Чего не хватает", "Следующий шаг", "Статус"],
      allowCheckedEmptyReason: true,
      failIfOnlyDefaultScreenSummary: true,
    });

    expect(assertion).toMatchObject({
      passed: true,
      missingRequiredSignals: [],
      forbiddenSignalsFound: [],
    });
  });
});
