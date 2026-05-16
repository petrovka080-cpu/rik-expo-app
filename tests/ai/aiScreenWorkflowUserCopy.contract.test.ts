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
});
