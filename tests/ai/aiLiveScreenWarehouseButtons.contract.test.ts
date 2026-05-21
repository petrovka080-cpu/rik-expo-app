import { listAiLiveScreenButtonsForScreen } from "../../src/lib/ai/liveScreenCopilot";
import { answerAiLiveScreenButtonFixture } from "./aiLiveScreenCopilotTestHelpers";

describe("AI live screen warehouse buttons", () => {
  it("traces stock and issues without stock mutations", () => {
    const buttons = listAiLiveScreenButtonsForScreen("warehouse");
    expect(buttons.map((button) => button.labelRu)).toEqual(expect.arrayContaining([
      "Показать остатки",
      "Куда ушёл товар",
      "Что выдали на этаж",
    ]));
    const trace = answerAiLiveScreenButtonFixture("warehouse.item_trace");
    expect(trace.guard.failureReason).toBeUndefined();
    expect(trace.presentedTextRu).toContain("Выдача склада");
    expect(trace.safetyStatus.changedData).toBe(false);
  });
});
