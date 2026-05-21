import {
  aiLiveProviderUnavailableUserCopy,
  validateAiLiveScreenNoise,
} from "../../src/lib/ai/liveScreenCopilot";

describe("AI live screen noise guard", () => {
  it("hides provider/runtime/debug copy from normal users", () => {
    expect(validateAiLiveScreenNoise("provider unavailable runtime debug").passed).toBe(false);
    const safe = aiLiveProviderUnavailableUserCopy();
    expect(safe).toContain("Данные приложения не изменены");
    expect(validateAiLiveScreenNoise(safe).passed).toBe(true);
  });
});
