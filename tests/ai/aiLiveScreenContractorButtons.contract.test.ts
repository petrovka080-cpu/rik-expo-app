import { listAiLiveScreenButtonsForScreen } from "../../src/lib/ai/liveScreenCopilot";
import { answerAiLiveScreenButtonFixture } from "./aiLiveScreenCopilotTestHelpers";

describe("AI live screen contractor buttons", () => {
  it("keeps contractor answers scoped to own work and safe drafts", () => {
    const buttons = listAiLiveScreenButtonsForScreen("contractor");
    expect(buttons.map((button) => button.labelRu)).toEqual(expect.arrayContaining([
      "Что мне закрыть",
      "Что мешает оплате",
      "Подготовить ответ прорабу",
    ]));
    const answer = answerAiLiveScreenButtonFixture("contractor.foreman_reply_draft");
    expect(answer.presentedTextRu).toContain("Черновик подготовлен");
    expect(answer.presentedTextRu).not.toContain("полные финансы");
    expect(answer.safetyStatus.finalSubmit).toBe(false);
  });
});
