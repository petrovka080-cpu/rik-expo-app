import { readFileSync } from "fs";
import { join } from "path";
import { evaluateAiToolReadBindingsArchitectureGuardrail } from "../../scripts/architecture_anti_regression_suite";

const bindingPath = "src/features/ai/tools/aiToolReadBindings.ts";

describe("AI tool read bindings architecture", () => {
  it("passes the project scanner ratchet", () => {
    const result = evaluateAiToolReadBindingsArchitectureGuardrail({ projectRoot: process.cwd() });
    expect(result.check).toEqual({
      name: "ai_tool_read_bindings_architecture",
      status: "pass",
      errors: [],
    });
    expect(result.summary).toMatchObject({
      bindingsPresent: true,
      allSafeReadToolsBound: true,
      nonSafeReadToolsExcluded: true,
      allBindingsReadOnly: true,
      allBindingsDisabledByDefault: true,
      noLiveExecutionBoundary: true,
      noProviderImports: true,
      noSupabaseImports: true,
      noMutationTerms: true,
    });
  });

  it("keeps bindings metadata-only without direct execution, provider, or database access", () => {
    const source = readFileSync(join(process.cwd(), bindingPath), "utf8");
    expect(source).toContain("AI_SAFE_READ_TOOL_BINDINGS");
    expect(source).toContain("directExecutionEnabled: false");
    expect(source).toContain("mutationAllowed: false");
    expect(source).toContain("rawRowsAllowed: false");
    expect(source).toContain("rawPromptStorageAllowed: false");
    expect(source).not.toMatch(/\bhandler\b|\bexecuteTool\b|\brunTool\b|\btoolExecutor\b|\binvokeTool\b|\bfetch\s*\(/);
    expect(source).not.toMatch(/@supabase\/supabase-js|\bsupabase\b|\bauth\.admin\b|\blistUsers\b|service_role/);
    expect(source).not.toMatch(/openai|gpt-|gemini|AiModelGateway|LegacyGeminiModelProvider/i);
  });
});
