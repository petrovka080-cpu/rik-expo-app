import { readFileSync } from "fs";
import { join } from "path";
import { evaluateAiToolRegistryArchitectureGuardrail } from "../../scripts/architecture_anti_regression_suite";

const registryPath = "src/features/ai/tools/aiToolRegistry.ts";
const typesPath = "src/features/ai/tools/aiToolTypes.ts";
const schemasPath = "src/features/ai/schemas/aiToolSchemas.ts";

function readProjectFile(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("AI tool registry architecture", () => {
  it("passes the project scanner ratchet", () => {
    const result = evaluateAiToolRegistryArchitectureGuardrail({ projectRoot: process.cwd() });
    expect(result.check).toEqual({
      name: "ai_tool_registry_architecture",
      status: "pass",
      errors: [],
    });
    expect(result.summary).toMatchObject({
      registryPresent: true,
      typesPresent: true,
      schemasPresent: true,
      allRequiredToolsRegistered: true,
      forbiddenToolsExcluded: true,
      allToolsHaveSchema: true,
      allToolsHaveRiskPolicy: true,
      allToolsHaveAuditMetadata: true,
      noLiveExecutionBoundary: true,
      noProviderImports: true,
      noSupabaseImports: true,
    });
  });

  it("keeps the registry metadata-only and excludes fake execution paths", () => {
    const registrySource = readProjectFile(registryPath);
    const typesSource = readProjectFile(typesPath);
    const schemasSource = readProjectFile(schemasPath);
    const combined = [registrySource, typesSource, schemasSource].join("\n");

    expect(combined).toContain("AiToolDefinition");
    expect(combined).toContain("inputSchema");
    expect(combined).toContain("outputSchema");
    expect(combined).toContain("approvalRequired");
    expect(combined).toContain("idempotencyRequired");
    expect(combined).not.toMatch(/\bhandler\b|\bexecuteTool\b|\brunTool\b|\btoolExecutor\b/);
    expect(combined).not.toMatch(/@supabase\/supabase-js|\bsupabase\b|\bauth\.admin\b|\blistUsers\b|service_role/);
    expect(combined).not.toMatch(/openai|gpt-|gemini|AiModelGateway|LegacyGeminiModelProvider/i);
  });
});
