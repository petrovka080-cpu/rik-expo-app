import {
  containsForbiddenAiScreenMagicUserCopy,
  sanitizeAiScreenMagicUserCopy,
} from "../../src/features/ai/screenMagic/aiScreenMagicUserCopy";

describe("AI screen magic user copy", () => {
  it("removes provider/debug copy from user-facing text", () => {
    const sanitized = sanitizeAiScreenMagicUserCopy("Готово от AI provider unavailable raw provider payload");

    expect(sanitized).toBe("Готово от AI payload");
    expect(containsForbiddenAiScreenMagicUserCopy(sanitized)).toBe(false);
  });
});
