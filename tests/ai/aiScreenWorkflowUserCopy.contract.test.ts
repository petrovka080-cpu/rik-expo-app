import {
  containsForbiddenAiScreenWorkflowUserCopy,
  sanitizeAiScreenWorkflowUserCopy,
} from "../../src/features/ai/screenWorkflows/aiScreenWorkflowUserCopy";

describe("AI screen workflow user copy", () => {
  it("removes debug/provider copy from user-facing workflow text", () => {
    const text = sanitizeAiScreenWorkflowUserCopy("provider unavailable. raw registry. safe guide mode. Готово от AI.");

    expect(text).toContain("Готово от AI");
    expect(containsForbiddenAiScreenWorkflowUserCopy(text)).toBe(false);
    expect(containsForbiddenAiScreenWorkflowUserCopy("Data-aware context allowedIntents")).toBe(true);
  });
  it("replaces internal knowledge prompt blocks with safe user copy", () => {
    const raw = "AI APP KNOWLEDGE BLOCK\nscreenId: chat.main\ncontextPolicy: director_full\nREAD_ONLY_FACTS\nDebt: 10";
    const text = sanitizeAiScreenWorkflowUserCopy(raw);

    expect(containsForbiddenAiScreenWorkflowUserCopy(raw)).toBe(true);
    expect(containsForbiddenAiScreenWorkflowUserCopy(text)).toBe(false);
    expect(text).not.toContain("READ_ONLY_FACTS");
    expect(text).not.toContain("screenId:");
    expect(text).toContain("safe read-only summary");
  });
});
