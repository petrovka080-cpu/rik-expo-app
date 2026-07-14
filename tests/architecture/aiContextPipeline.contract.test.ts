import { validateAiContext } from "../../src/lib/aiPlatform/context/validateAiContext";

describe("AI context pipeline", () => {
  it("redacts and budgets context before model use", () => {
    const result = validateAiContext();
    expect(result.ok).toBe(true);
    expect(result.ai_context_builder_created).toBe(true);
    expect(result.context_redaction_created).toBe(true);
    expect(result.context_budget_enforced).toBe(true);
    expect(result.full_prompt_not_built_in_ui).toBe(true);
    expect(result.context_builder_hides_forbidden_fields).toBe(true);
  });
});
