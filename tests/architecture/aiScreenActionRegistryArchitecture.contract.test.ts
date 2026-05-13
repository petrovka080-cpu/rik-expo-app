import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("AI screen action registry architecture", () => {
  it("keeps screen-action intelligence as a read-only metadata layer", () => {
    const files = [
      "src/features/ai/screenActions/aiScreenActionRegistry.ts",
      "src/features/ai/screenActions/aiScreenActionPolicy.ts",
      "src/features/ai/screenActions/aiScreenActionResolver.ts",
      "src/features/ai/agent/agentScreenActionRoutes.ts",
      "src/features/ai/agent/agentScreenActionContracts.ts",
    ];
    const source = files.map(read).join("\n");

    expect(source).toContain("AI_SCREEN_ACTION_REQUIRED_SCREEN_IDS");
    expect(source).toContain("AI_SCREEN_ACTION_POLICY_CONTRACT");
    expect(source).toContain("chat.main");
    expect(source).toContain("map.main");
    expect(source).toContain("office.hub");
    expect(source).toContain("GET /agent/screen-actions/:screenId");
    expect(source).toContain("POST /agent/screen-actions/:screenId/intent-preview");
    expect(source).toContain("POST /agent/screen-actions/:screenId/action-plan");
    expect(source).toContain("mutationCount: 0");
    expect(source).toContain("dbWrites: 0");
    expect(source).toContain("externalLiveFetch: false");
    expect(source).not.toMatch(/from\s+["'][^"']*supabase/i);
    expect(source).not.toMatch(/service_role|listUsers|createUser|deleteUser/i);
    expect(source).not.toMatch(/fetch\s*\(|axios|XMLHttpRequest/i);
  });

  it("exposes deterministic Command Center testIDs without changing button business logic", () => {
    const screen = read("src/features/ai/commandCenter/AiCommandCenterScreen.tsx");
    const shell = read("src/features/ai/agent/agentBffRouteShell.ts");

    expect(screen).toContain("ai.screen.actions.preview");
    expect(screen).toContain("ai.screen.actions.role");
    expect(screen).toContain("ai.screen.actions.safe_read");
    expect(screen).toContain("ai.screen.actions.draft");
    expect(screen).toContain("ai.screen.actions.approval_required");
    expect(shell).toContain("agent.screen_actions.read");
    expect(shell).toContain("AgentScreenActionEnvelope");
  });
});
