import fs from "fs";
import path from "path";

import { AGENT_BFF_ROUTE_DEFINITIONS } from "../../src/features/ai/agent/agentBffRouteShell";
import { AI_WORKDAY_TASK_ENGINE_CONTRACT } from "../../src/features/ai/workday/aiWorkdayTaskEngine";

const projectRoot = process.cwd();

const sourceFiles = [
  "src/features/ai/workday/aiWorkdayTaskTypes.ts",
  "src/features/ai/workday/aiWorkdayTaskPolicy.ts",
  "src/features/ai/workday/aiWorkdayTaskEvidence.ts",
  "src/features/ai/workday/aiWorkdayTaskRanking.ts",
  "src/features/ai/workday/aiWorkdayTaskEngine.ts",
  "src/features/ai/agent/agentWorkdayTaskRoutes.ts",
  "src/features/ai/agent/agentWorkdayTaskContracts.ts",
  "src/features/ai/commandCenter/AiCommandCenterScreen.tsx",
];

function read(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

describe("AI proactive workday architecture", () => {
  it("keeps the workday task engine backend-first and non-mutating", () => {
    expect(AI_WORKDAY_TASK_ENGINE_CONTRACT).toMatchObject({
      backendFirst: true,
      roleScoped: true,
      evidenceRequired: true,
      internalFirst: true,
      readOnly: true,
      mutationCount: 0,
      dbWrites: 0,
      externalLiveFetch: false,
      providerCalled: false,
      finalExecution: 0,
      fakeCards: false,
      hardcodedAiAnswer: false,
    });
  });

  it("registers workday BFF routes as auth-required read routes", () => {
    expect(AGENT_BFF_ROUTE_DEFINITIONS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          operation: "agent.workday.tasks.read",
          endpoint: "GET /agent/workday/tasks",
          authRequired: true,
          mutates: false,
          callsDatabaseDirectly: false,
          callsModelProvider: false,
        }),
        expect.objectContaining({
          operation: "agent.workday.tasks.preview",
          endpoint: "POST /agent/workday/tasks/:taskId/preview",
          authRequired: true,
          mutates: false,
          callsDatabaseDirectly: false,
          callsModelProvider: false,
        }),
        expect.objectContaining({
          operation: "agent.workday.tasks.action_plan",
          endpoint: "POST /agent/workday/tasks/:taskId/action-plan",
          authRequired: true,
          mutates: false,
          callsDatabaseDirectly: false,
          callsModelProvider: false,
        }),
      ]),
    );
  });

  it("exposes deterministic Command Center target IDs without changing hooks", () => {
    const screen = read("src/features/ai/commandCenter/AiCommandCenterScreen.tsx");
    expect(screen).toContain('testID="ai.workday.section"');
    expect(screen).toContain('testID="ai.workday.card"');
    expect(screen).toContain('testID="ai.workday.card.evidence"');
    expect(screen).toContain('testID="ai.workday.card.risk"');
    expect(screen).toContain('testID="ai.workday.card.next_action"');
    expect(screen).toContain('testID="ai.workday.empty_state"');
    expect(screen).not.toContain("useAiWorkday");
  });

  it("does not introduce provider calls, direct fetch, database access, or fake cards", () => {
    const combined = sourceFiles.map(read).join("\n");
    expect(combined).not.toMatch(/@supabase\/supabase-js|\bsupabase\b|\bauth\.admin\b|\blistUsers\b/i);
    expect(combined).not.toMatch(/\.(?:from|rpc|insert|update|delete|upsert)\s*\(/);
    expect(combined).not.toMatch(/\bfetch\s*\(|\bXMLHttpRequest\b/);
    expect(combined).not.toMatch(/openai|gpt-|gemini|LegacyGeminiModelProvider|assistantClient/i);
    expect(combined).not.toMatch(/fake task|fake card|hardcoded response/i);
  });
});
