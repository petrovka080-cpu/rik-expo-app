import { readFileSync } from "fs";
import { join } from "path";
import {
  AGENT_BFF_ROUTE_DEFINITIONS,
  AGENT_BFF_ROUTE_SHELL_CONTRACT,
} from "../../src/features/ai/agent/agentBffRouteShell";
import { evaluateAgentBffRouteShellArchitectureGuardrail } from "../../scripts/architecture_anti_regression_suite";

const sourcePath = "src/features/ai/agent/agentBffRouteShell.ts";

describe("agent BFF route shell no-mutation architecture", () => {
  it("passes the project scanner ratchet", () => {
    const result = evaluateAgentBffRouteShellArchitectureGuardrail({ projectRoot: process.cwd() });
    expect(result.check).toEqual({
      name: "agent_bff_route_shell_architecture",
      status: "pass",
      errors: [],
    });
    expect(result.summary).toMatchObject({
      shellPresent: true,
      allRoutesPresent: true,
      authRequired: true,
      roleFilteredTools: true,
      forbiddenToolsHidden: true,
      mutationCountZero: true,
      previewNeverMutates: true,
      noLiveExecutionBoundary: true,
      noProviderImports: true,
      noDirectDatabaseAccess: true,
    });
  });

  it("keeps all route definitions auth-required and non-mutating", () => {
    expect(AGENT_BFF_ROUTE_SHELL_CONTRACT.mutationCount).toBe(0);
    expect(AGENT_BFF_ROUTE_SHELL_CONTRACT.executionEnabled).toBe(false);
    expect(AGENT_BFF_ROUTE_DEFINITIONS).toHaveLength(59);
    expect(AGENT_BFF_ROUTE_DEFINITIONS.every((route) => route.authRequired)).toBe(true);
    expect(AGENT_BFF_ROUTE_DEFINITIONS.every((route) => route.mutates === false)).toBe(true);
    expect(AGENT_BFF_ROUTE_DEFINITIONS.every((route) => route.executesTool === false)).toBe(true);
    expect(AGENT_BFF_ROUTE_DEFINITIONS.every((route) => route.callsDatabaseDirectly === false)).toBe(true);
    expect(AGENT_BFF_ROUTE_DEFINITIONS.every((route) => route.callsModelProvider === false)).toBe(true);
  });

  it("contains no direct database, model provider, or tool runner boundary", () => {
    const source = readFileSync(join(process.cwd(), sourcePath), "utf8");
    expect(source).not.toMatch(/@supabase\/supabase-js|\bsupabase\b|\bauth\.admin\b|\blistUsers\b|\bservice_role\b/i);
    expect(source).not.toMatch(/\.(?:from|rpc|insert|update|delete|upsert)\s*\(/);
    expect(source).not.toMatch(/\bfetch\s*\(|\bXMLHttpRequest\b/);
    expect(source).not.toMatch(/openai|gpt-|gemini|AiModelGateway|LegacyGeminiModelProvider|assistantClient/i);
    expect(source).not.toMatch(/\bexecuteTool\b|\brunTool\b|\btoolExecutor\b|\binvokeTool\b/);
    expect(source).not.toContain("create_order");
    expect(source).not.toContain("confirm_supplier");
    expect(source).not.toContain("change_warehouse_status");
    expect(source).not.toContain("change_payment_status");
  });
});
