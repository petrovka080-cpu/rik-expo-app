import { readFileSync } from "fs";
import { join } from "path";
import { buildAiMcpApprovalPolicyMatrix } from "../../src/features/ai/mcp/aiMcpApprovalPolicy";
import { buildAiMcpCapabilitySchemaMatrix } from "../../src/features/ai/mcp/aiMcpCapabilitySchema";
import { buildAiMcpSecurityPolicyMatrix } from "../../src/features/ai/mcp/aiMcpSecurityPolicy";
import { buildAiMcpToolManifestMatrix } from "../../src/features/ai/mcp/aiMcpToolManifest";

const mcpFiles = [
  "src/features/ai/mcp/aiMcpToolManifest.ts",
  "src/features/ai/mcp/aiMcpCapabilitySchema.ts",
  "src/features/ai/mcp/aiMcpSecurityPolicy.ts",
  "src/features/ai/mcp/aiMcpApprovalPolicy.ts",
];

describe("AI MCP/Apps compatibility blueprint architecture", () => {
  it("builds a complete non-executing tool blueprint", () => {
    expect(buildAiMcpToolManifestMatrix()).toMatchObject({
      manifest_status: "ready",
      all_tools_from_registry: true,
      all_tools_have_security_policy: true,
      all_tools_have_approval_policy: true,
      all_tools_have_capability_schema: true,
      final_action_allowed: false,
      mutation_without_approval_allowed: false,
      external_host_execution_allowed: false,
      model_provider_invocation_allowed: false,
    });
    expect(buildAiMcpCapabilitySchemaMatrix()).toMatchObject({
      all_tools_have_capability_schema: true,
      direct_execution_allowed: false,
      external_host_execution_allowed: false,
    });
    expect(buildAiMcpSecurityPolicyMatrix()).toMatchObject({
      all_tools_have_security_policy: true,
      direct_database_access_allowed: false,
      external_host_execution_allowed: false,
      model_provider_invocation_allowed: false,
      privileged_backend_role_allowed: false,
      secrets_returned: false,
    });
    expect(buildAiMcpApprovalPolicyMatrix()).toMatchObject({
      high_risk_requires_approval: true,
      mutation_without_approval_allowed: false,
      final_action_allowed_from_manifest: false,
      direct_execution_allowed: false,
    });
  });

  it("keeps blueprint files free of DB, provider, network, and direct execution code", () => {
    const combined = mcpFiles.map((file) => readFileSync(join(process.cwd(), file), "utf8")).join("\n");

    expect(combined).not.toMatch(/@supabase\/supabase-js|\bsupabase\b|\bauth\.admin\b|\blistUsers\b|\bservice_role\b/i);
    expect(combined).not.toMatch(/\.(?:from|rpc|insert|update|delete|upsert)\s*\(/);
    expect(combined).not.toMatch(/\bfetch\s*\(|\bXMLHttpRequest\b/);
    expect(combined).not.toMatch(/\b(openai|gpt-|gemini|AiModelGateway|LegacyGeminiModelProvider|assistantClient)\b/i);
    expect(combined).not.toMatch(/\bexecuteTool\b|\brunTool\b|\binvokeTool\b|\btoolExecutor\b/i);
  });
});
