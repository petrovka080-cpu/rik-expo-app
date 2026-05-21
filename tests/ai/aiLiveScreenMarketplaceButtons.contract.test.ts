import { listAiLiveScreenButtonsForScreen } from "../../src/lib/ai/liveScreenCopilot";
import { answerAiLiveScreenButtonFixture } from "./aiLiveScreenCopilotTestHelpers";

describe("AI live screen marketplace buttons", () => {
  it("creates only marketplace product drafts and never publishes", () => {
    const buttons = listAiLiveScreenButtonsForScreen("market");
    expect(buttons.map((button) => button.labelRu)).toEqual(expect.arrayContaining([
      "Определить товар по фото",
      "Подготовить карточку",
      "Что нужно уточнить",
    ]));
    const answer = answerAiLiveScreenButtonFixture("market.product_card_draft");
    expect(answer.presentedTextRu).toContain("Черновик подготовлен");
    expect(answer.presentedTextRu).not.toContain("Товар опубликован");
    expect(answer.safetyStatus.finalSubmit).toBe(false);
  });
});
