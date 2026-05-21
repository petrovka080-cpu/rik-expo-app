import { listAiLiveScreenButtonsForScreen } from "../../src/lib/ai/liveScreenCopilot";
import { answerAiLiveScreenButtonFixture } from "./aiLiveScreenCopilotTestHelpers";

describe("AI live screen client buttons", () => {
  it("keeps client answers project-safe and free of internal finance/debug text", () => {
    const buttons = listAiLiveScreenButtonsForScreen("client");
    expect(buttons.map((button) => button.labelRu)).toEqual(expect.arrayContaining([
      "Показать прогресс",
      "Показать фотоотчёт",
      "Показать клиентские документы",
    ]));
    const answer = answerAiLiveScreenButtonFixture("client.progress");
    expect(answer.guard.failureReason).toBeUndefined();
    expect(answer.presentedTextRu).not.toMatch(/runtime|debug|полные финансы/i);
  });
});
