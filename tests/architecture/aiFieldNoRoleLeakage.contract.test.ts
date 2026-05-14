import fs from "node:fs";
import path from "node:path";

import { AGENT_BFF_ROUTE_DEFINITIONS } from "../../src/features/ai/agent/agentBffRouteShell";

describe("AI field work copilot architecture guardrails", () => {
  it("keeps field work copilot source free of hooks, direct database access, providers, and final mutations", () => {
    const projectRoot = process.cwd();
    const files = [
      "src/features/ai/field/aiFieldWorkCopilotTypes.ts",
      "src/features/ai/field/aiFieldEvidencePolicy.ts",
      "src/features/ai/field/aiFieldRoleScope.ts",
      "src/features/ai/field/aiForemanReportDraftEngine.ts",
      "src/features/ai/field/aiContractorActDraftEngine.ts",
      "src/features/ai/agent/agentFieldWorkCopilotContracts.ts",
      "src/features/ai/agent/agentFieldWorkCopilotRoutes.ts",
    ];
    const source = files.map((file) => fs.readFileSync(path.join(projectRoot, file), "utf8")).join("\n");

    expect(source).not.toMatch(/\buse[A-Z][A-Za-z0-9_]*\s*\(/);
    expect(source).not.toMatch(/@supabase\/supabase-js|\bsupabase\b|\bauth\.admin\b|\blistUsers\b|\bservice_role\b/i);
    expect(source).not.toMatch(/\.(?:from|rpc|insert|update|delete|upsert)\s*\(/);
    expect(source).not.toMatch(/\bfetch\s*\(|openai|gpt-|gemini|AiModelGateway|assistantClient/i);
    expect(source).not.toMatch(/reportPublished:\s*true|actSigned:\s*true|contractorConfirmation:\s*true/i);
    expect(source).not.toMatch(/paymentMutation:\s*true|warehouseMutation:\s*true/i);
    expect(source).not.toMatch(/fakeFieldCards:\s*true|hardcodedAiAnswer:\s*true/i);
  });

  it("registers only non-mutating field BFF routes with role filtering", () => {
    const fieldRoutes = AGENT_BFF_ROUTE_DEFINITIONS.filter((route) =>
      route.operation.startsWith("agent.field."),
    );

    expect(fieldRoutes).toHaveLength(4);
    expect(fieldRoutes.map((route) => route.endpoint)).toEqual([
      "GET /agent/field/context",
      "POST /agent/field/draft-report",
      "POST /agent/field/draft-act",
      "POST /agent/field/action-plan",
    ]);
    expect(fieldRoutes.every((route) => route.authRequired === true)).toBe(true);
    expect(fieldRoutes.every((route) => route.roleFiltered === true)).toBe(true);
    expect(fieldRoutes.every((route) => route.mutates === false)).toBe(true);
    expect(fieldRoutes.every((route) => route.executesTool === false)).toBe(true);
    expect(fieldRoutes.every((route) => route.callsDatabaseDirectly === false)).toBe(true);
    expect(fieldRoutes.every((route) => route.exposesForbiddenTools === false)).toBe(true);
  });
});
