import { listAiLiveScreenButtonsForScreen } from "../../src/lib/ai/liveScreenCopilot";
import { answerAiLiveScreenButtonFixture } from "./aiLiveScreenCopilotTestHelpers";

describe("AI live screen director buttons", () => {
  it("answers every director button with decision-focused Russian output", () => {
    const buttons = listAiLiveScreenButtonsForScreen("director");
    expect(buttons.map((button) => button.labelRu)).toEqual(expect.arrayContaining([
      "Что мне решить сегодня",
      "Показать заявки на утверждение",
      "Показать платежи с риском",
    ]));
    for (const button of buttons) {
      const result = answerAiLiveScreenButtonFixture(button.id);
      expect(result.guard.failureReason).toBeUndefined();
      expect(result.presentedTextRu).toContain("Источник ответа:");
      expect(result.safetyStatus.dangerousMutation).toBe(false);
    }
  });
});
