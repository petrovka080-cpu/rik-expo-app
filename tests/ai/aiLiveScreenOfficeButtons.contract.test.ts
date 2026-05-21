import { listAiLiveScreenButtonsForScreen } from "../../src/lib/ai/liveScreenCopilot";
import { answerAiLiveScreenButtonFixture } from "./aiLiveScreenCopilotTestHelpers";

describe("AI live screen office buttons", () => {
  it("prepares office reminders as drafts only", () => {
    const buttons = listAiLiveScreenButtonsForScreen("office");
    expect(buttons.map((button) => button.labelRu)).toEqual(expect.arrayContaining([
      "Показать зависшие документы",
      "Кому напомнить",
      "Подготовить черновик напоминания",
    ]));
    const answer = answerAiLiveScreenButtonFixture("office.reminder_draft");
    expect(answer.presentedTextRu).toContain("Черновик подготовлен");
    expect(answer.safetyStatus.finalSubmit).toBe(false);
  });
});
