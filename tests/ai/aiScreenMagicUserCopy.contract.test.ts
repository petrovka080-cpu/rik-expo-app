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
  it("replaces internal prompt and facts blocks before they reach normal UI", () => {
    const raw = "AI APP KNOWLEDGE BLOCK\nscreenId: buyer.main\ncontextPolicy: role_scoped\nREAD_ONLY_FACTS\nRequest count: 3";
    const sanitized = sanitizeAiScreenMagicUserCopy(raw);

    expect(containsForbiddenAiScreenMagicUserCopy(raw)).toBe(true);
    expect(containsForbiddenAiScreenMagicUserCopy(sanitized)).toBe(false);
    expect(sanitized).not.toContain("AI APP KNOWLEDGE BLOCK");
    expect(sanitized).not.toContain("screenId:");
    expect(sanitized).toContain("screen-specific safe reads");
  });
});
