import { getAiAssistantDeterministicAnswer } from "../../src/features/ai/assistantUx/aiAssistantDeterministicAnswers";
import { containsForbiddenAssistantUserFacingCopy } from "../../src/features/ai/assistantUx/aiAssistantUserFacingCopyPolicy";

describe("AI assistant deterministic answers", () => {
  it("answers module overview without a provider", () => {
    const result = getAiAssistantDeterministicAnswer({
      role: "buyer",
      context: "buyer",
      message: "Кратко объясни, за что отвечают основные модули приложения.",
    });

    expect(result).toMatchObject({ topic: "module_overview", providerCallAllowed: false });
    expect(result?.answer).toContain("Главная — быстрый вход в рабочие разделы.");
    expect(result?.answer).toContain("Снабжение — входящие заявки, подбор поставщиков");
    expect(result?.answer).toContain("Финансы — платежи, история и финансовые проверки.");
    expect(containsForbiddenAssistantUserFacingCopy(result?.answer ?? "")).toBe(false);
  });

  it("answers procurement triage without leaking provider state", () => {
    const result = getAiAssistantDeterministicAnswer({
      role: "buyer",
      context: "buyer",
      message: "Я сейчас в снабжении. Объясни, как лучше разбирать входящие позиции и что смотреть первым.",
    });

    expect(result).toMatchObject({ topic: "procurement_workflow", providerCallAllowed: false });
    expect(result?.answer).toContain("Сначала смотри срочность и статус заявки");
    expect(result?.answer).toContain("Заказ, подтверждение поставщика, оплата и складское движение");
    expect(containsForbiddenAssistantUserFacingCopy(result?.answer ?? "")).toBe(false);
  });

  it("explains ready buy options when the screen has a prepared procurement bundle", () => {
    const result = getAiAssistantDeterministicAnswer({
      role: "buyer",
      context: "buyer",
      message: "Что по этой заявке смотреть первым?",
      scopedFactsSummary: [
        "Готовые варианты закупки по заявке request-1248: 2.",
        "- ТОО Supplier Evidence A: покрытие 8/12 позиций; риски: нет цены по 2 позициям; действие: подготовить запрос поставщику",
        "- ТОО Supplier Evidence B: покрытие 6/12 позиций; риски: нужна проверка доставки; действие: сравнить варианты",
      ].join("\n"),
    });

    expect(result).toMatchObject({ topic: "procurement_workflow", providerCallAllowed: false });
    expect(result?.answer).toContain("ТОО Supplier Evidence A");
    expect(result?.answer).toContain("ТОО Supplier Evidence B");
    expect(result?.answer).toContain("сначала подготовь запрос или отправь выбор на согласование");
    expect(containsForbiddenAssistantUserFacingCopy(result?.answer ?? "")).toBe(false);
  });
});
