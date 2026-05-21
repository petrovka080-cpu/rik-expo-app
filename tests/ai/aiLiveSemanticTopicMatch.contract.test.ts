import { assertAnswerMatchesQuestion } from "../../src/lib/ai/liveUi";

describe("S_AI_LIVE_SEMANTIC_ANSWER_PROOF_RECOVERY: topic match guard", () => {
  it("fails when an estimate question receives a foreman workday summary", () => {
    const result = assertAnswerMatchesQuestion({
      questionRu: "дай мне смету на установку дверей",
      answerRu: [
        "Ответ",
        "Коротко:",
        "За сегодня найдено работ: монтаж перегородок.",
        "Что найдено:",
        "- ГКЛ в дефиците.",
        "- фото после выполнения отсутствует.",
        "Следующий шаг:",
        "подготовить акт.",
        "Статус:",
        "Черновик подготовлен.",
      ].join("\n"),
      expectedIntent: "construction_estimate_request",
      requiredSignals: ["смета", "дверь|дверей|двери"],
      forbiddenSignals: ["ГКЛ", "монтаж перегородок", "фото после выполнения"],
      requiredSections: ["Коротко", "Смета", "Следующий шаг", "Статус"],
      allowCheckedEmptyReason: true,
      failIfOnlyDefaultScreenSummary: true,
    });

    expect(result.passed).toBe(false);
    expect(result.reasonRu).toContain("FAIL_TOPIC_MISMATCH");
    expect(result.forbiddenSignalsFound).toEqual(expect.arrayContaining(["ГКЛ", "монтаж перегородок"]));
    expect(result.missingRequiredSignals).toEqual(expect.arrayContaining(["смета", "дверь|дверей|двери"]));
  });

  it("passes a useful door estimate draft with checked-empty sources", () => {
    const result = assertAnswerMatchesQuestion({
      questionRu: "дай мне смету на установку дверей",
      answerRu: [
        "Ответ",
        "Коротко:",
        "В проектных данных не найдена смета по установке дверей. Данные проекта не изменены.",
        "Что найдено:",
        "- Черновая смета: дверное полотно, коробка, фурнитура и монтаж двери.",
        "Что проверено:",
        "- проектная смета по дверям: не найдена",
        "Чего не хватает:",
        "- количество дверей",
        "Следующий шаг:",
        "указать количество и тип дверей.",
        "Статус:",
        "Черновик подготовлен.",
      ].join("\n"),
      expectedIntent: "construction_estimate_request",
      requiredSignals: ["смета", "дверь|дверей|двери", "установка|монтаж", "следующий шаг"],
      forbiddenSignals: ["ГКЛ", "монтаж перегородок"],
      requiredSections: ["Коротко", "Смета", "Что проверено", "Чего не хватает", "Следующий шаг", "Статус"],
      allowCheckedEmptyReason: true,
      failIfOnlyDefaultScreenSummary: true,
    });

    expect(result.passed).toBe(true);
  });
});
