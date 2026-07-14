import { validateAiToolExecution } from "../../src/lib/aiPlatform/tools/validateAiToolExecution";

describe("AI tool registry approval policy", () => {
  it("never executes AI tools directly and gates mutations", () => {
    const result = validateAiToolExecution();
    expect(result.ok).toBe(true);
    expect(result.ai_tool_registry_created).toBe(true);
    expect(result.safe_read_tools_cannot_mutate).toBe(true);
    expect(result.draft_only_tools_create_drafts_only).toBe(true);
    expect(result.approval_required_tools_require_explicit_approval).toBe(true);
    expect(result.forbidden_tools_return_reason).toBe(true);
    expect(result.ai_cannot_execute_mutation_without_policy).toBe(true);
  });
});
