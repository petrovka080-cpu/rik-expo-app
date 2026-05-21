import { listAiLiveScreenButtonsForScreen } from "../../src/lib/ai/liveScreenCopilot";
import { answerAiLiveScreenButtonFixture } from "./aiLiveScreenCopilotTestHelpers";

describe("AI live screen accountant buttons", () => {
  it("keeps payments and accounting references read-only", () => {
    const buttons = listAiLiveScreenButtonsForScreen("accountant");
    expect(buttons.map((button) => button.labelRu)).toEqual(expect.arrayContaining([
      "Показать платежи без документов",
      "Проверить документы для оплаты",
      "Подготовить справку по проводке",
    ]));
    const accounting = answerAiLiveScreenButtonFixture("accountant.accounting_entry_reference");
    expect(accounting.presentedTextRu).toContain("Требуется согласование");
    expect(accounting.safetyStatus.finalSubmit).toBe(false);
    expect(accounting.safetyStatus.autoApproval).toBe(false);
  });
});
