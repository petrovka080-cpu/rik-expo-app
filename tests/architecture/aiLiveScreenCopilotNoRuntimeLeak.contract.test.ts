import {
  aiLiveProviderUnavailableUserCopy,
  validateAiLiveScreenNoise,
} from "../../src/lib/ai/liveScreenCopilot";

describe("AI live screen copilot architecture - no runtime leak", () => {
  it("uses safe normal-user copy for unavailable provider/runtime states", () => {
    const safeCopy = aiLiveProviderUnavailableUserCopy();
    expect(safeCopy).toContain("AI сейчас не смог подготовить ответ");
    expect(validateAiLiveScreenNoise(safeCopy).passed).toBe(true);
  });
});
