import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("AI screen-local assistant architecture", () => {
  it("keeps Wave 02 as a screen-local, role-scoped, no-provider orchestrator", () => {
    const files = [
      "src/features/ai/assistantOrchestrator/aiScreenLocalAssistantTypes.ts",
      "src/features/ai/assistantOrchestrator/aiScreenLocalAssistantOrchestrator.ts",
      "src/features/ai/assistantOrchestrator/aiScreenLocalContextResolver.ts",
      "src/features/ai/assistantOrchestrator/aiRoleScreenBoundary.ts",
      "src/features/ai/assistantOrchestrator/aiAssistantEvidencePlanner.ts",
      "src/features/ai/assistantOrchestrator/aiAssistantSameScreenOutputPolicy.ts",
      "src/features/ai/agent/agentScreenAssistantContracts.ts",
      "src/features/ai/agent/agentScreenAssistantRoutes.ts",
    ];
    const source = files.map(read).join("\n");

    expect(source).toContain("AI_SCREEN_LOCAL_ASSISTANT_REQUIRED_SCREEN_IDS");
    expect(source).toContain("FORBIDDEN_CROSS_SCREEN_ACTION");
    expect(source).toContain("HANDOFF_PLAN_ONLY");
    expect(source).toContain("GET /agent/screen-assistant/:screenId/context");
    expect(source).toContain("POST /agent/screen-assistant/:screenId/ask");
    expect(source).toContain("POST /agent/screen-assistant/:screenId/action-plan");
    expect(source).toContain("POST /agent/screen-assistant/:screenId/draft-preview");
    expect(source).toContain("POST /agent/screen-assistant/:screenId/submit-for-approval-preview");
    expect(source).toContain("sameScreenOnly: true");
    expect(source).toContain("mutationCount: 0");
    expect(source).toContain("dbWrites: 0");
    expect(source).toContain("providerCalled: false");
    expect(source).toContain("externalLiveFetch: false");
    expect(source).toContain("fakeAiAnswer: false");
    expect(source).toContain("hardcodedAiResponse: false");
    expect(source).not.toMatch(/from\s+["'][^"']*supabase/i);
    expect(source).not.toMatch(/\bservice_role\b|\blistUsers\b|\bauth\.admin\b/i);
    expect(source).not.toMatch(/\bfetch\s*\(|axios|XMLHttpRequest/i);
    expect(source).not.toMatch(/\b(openai|gpt-|gemini|LegacyGeminiModelProvider)\b/i);
  });

  it("mounts screen assistant routes through the agent shell and runtime gateway", () => {
    const shell = read("src/features/ai/agent/agentBffRouteShell.ts");
    const gateway = read("src/features/ai/agent/agentRuntimeGateway.ts");
    const transportRegistry = read("src/features/ai/agent/agentRuntimeTransportRegistry.ts");

    expect(shell).toContain("agent.screen_assistant.context.read");
    expect(shell).toContain("AgentScreenAssistantEnvelope");
    expect(gateway).toContain("resolveAgentRuntimeTransportName");
    expect(transportRegistry).toContain('runtimeName: "screen_runtime"');
    expect(transportRegistry).toContain('"agent.screen_assistant.context.read"');
    expect(transportRegistry).toContain('"agent.screen_assistant.ask.preview"');
    expect(transportRegistry).toContain('"agent.screen_assistant.action_plan"');
    expect(transportRegistry).toContain('"agent.screen_assistant.draft_preview"');
    expect(transportRegistry).toContain('"agent.screen_assistant.submit_for_approval.preview"');
    expect(transportRegistry).not.toContain("matchers:");
  });
});
