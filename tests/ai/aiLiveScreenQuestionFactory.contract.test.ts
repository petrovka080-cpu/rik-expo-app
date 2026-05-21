import {
  buildAiLiveScreenButtonClickPayload,
  getAiLiveScreenButton,
  isAiLiveScreenButtonClickPayload,
  resolveAiLiveScreenConcreteQuestion,
} from "../../src/lib/ai/liveScreenCopilot";

describe("AI live screen question factory", () => {
  it("turns a button click into its concrete Russian question", () => {
    const button = getAiLiveScreenButton("warehouse.item_trace");
    const payload = buildAiLiveScreenButtonClickPayload(button);
    expect(isAiLiveScreenButtonClickPayload(payload)).toBe(true);

    const resolved = resolveAiLiveScreenConcreteQuestion({
      screenId: "warehouse",
      buttonIdOrPayloadOrLabel: payload,
    });
    expect(resolved?.button.id).toBe(button.id);
    expect(resolved?.concreteQuestionRu).toContain("движение выбранного товара");
  });
});
