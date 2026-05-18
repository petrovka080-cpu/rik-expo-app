import {
  AI_SCREEN_MAGIC_SAFE_STATUS_COPY,
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
    expect(sanitized).toBe(AI_SCREEN_MAGIC_SAFE_STATUS_COPY);
  });

  it("removes generic fallback and runtime transport wording from normal copy", () => {
    const sanitized = sanitizeAiScreenMagicUserCopy(
      "I don't have context; provider not configured; transport status: fallback; raw JSON",
    );

    expect(containsForbiddenAiScreenMagicUserCopy(sanitized)).toBe(false);
    expect(sanitized).not.toMatch(/provider|transport|raw JSON|I don't have context/i);
  });
});
