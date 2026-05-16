import {
  AI_ASSISTANT_GUIDE_MODE_COPY,
  containsForbiddenAssistantUserFacingCopy,
  sanitizeAssistantUserFacingCopy,
} from "../../src/features/ai/assistantUx/aiAssistantUserFacingCopyPolicy";

describe("AI assistant user-facing copy policy", () => {
  it("removes provider/key/debug wording from visible answers", () => {
    const sanitized = sanitizeAssistantUserFacingCopy(
      "AI-ключ сейчас не настроен. provider unavailable. role: buyer screen: buyer.main",
    );

    expect(sanitized).toContain(AI_ASSISTANT_GUIDE_MODE_COPY);
    expect(containsForbiddenAssistantUserFacingCopy(sanitized)).toBe(false);
  });
});
