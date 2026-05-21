import { listAiLiveScreenButtonsForScreen } from "../../src/lib/ai/liveScreenCopilot";
import { answerAiLiveScreenButtonFixture } from "./aiLiveScreenCopilotTestHelpers";

describe("AI live screen foreman buttons", () => {
  it("answers foreman buttons with works, materials and closeout context", () => {
    const buttons = listAiLiveScreenButtonsForScreen("foreman");
    expect(buttons.map((button) => button.labelRu)).toEqual(expect.arrayContaining([
      "Что мне закрыть сегодня",
      "Какие материалы выданы",
      "Подготовить черновик акта",
    ]));
    for (const button of buttons) {
      const result = answerAiLiveScreenButtonFixture(button.id);
      expect(result.guard.failureReason).toBeUndefined();
      expect(result.presentedTextRu).toContain("Следующий шаг:");
    }
  });
});
