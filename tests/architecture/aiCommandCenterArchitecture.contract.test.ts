import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const commandCenterFiles = [
  "src/features/ai/commandCenter/AiCommandCenterScreen.tsx",
  "src/features/ai/commandCenter/AiCommandCenterTypes.ts",
  "src/features/ai/commandCenter/AiCommandCenterCards.tsx",
  "src/features/ai/commandCenter/AiCommandCenterActions.tsx",
  "src/features/ai/commandCenter/useAiCommandCenterData.ts",
  "src/features/ai/commandCenter/buildAiCommandCenterViewModel.ts",
] as const;

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("AI Command Center architecture", () => {
  it("has the required product-layer files and route switch", () => {
    for (const file of commandCenterFiles) {
      expect(fs.existsSync(path.join(root, file))).toBe(true);
    }

    const route = read("app/(tabs)/ai.tsx");
    expect(route).toContain('mode === "command-center"');
    expect(route).toContain("AiCommandCenterScreen");
    expect(route).toContain("AIAssistantScreen");
  });

  it("uses the task-stream BFF shell and not direct model/database boundaries", () => {
    const combined = commandCenterFiles.map(read).join("\n");
    expect(combined).toContain("GET /agent/task-stream");
    expect(combined).toContain("getAgentTaskStream");
    expect(combined).not.toMatch(/@supabase\/supabase-js|\bsupabase\b|\bauth\.admin\b|\blistUsers\b|\bservice_role\b/i);
    expect(combined).not.toMatch(/\.(?:from|rpc|insert|update|delete|upsert)\s*\(/);
    expect(combined).not.toMatch(/openai|gpt-|gemini|AiModelGateway|LegacyGeminiModelProvider|assistantClient/i);
    expect(combined).not.toMatch(/\bexecuteTool\b|\brunTool\b|\btoolExecutor\b|\binvokeTool\b/);
  });

  it("keeps direct mutation actions forbidden and approval-gated", () => {
    const types = read("src/features/ai/commandCenter/AiCommandCenterTypes.ts");
    const viewModel = read("src/features/ai/commandCenter/buildAiCommandCenterViewModel.ts");

    expect(types).toContain("AI_COMMAND_CENTER_FORBIDDEN_DIRECT_ACTIONS");
    expect(types).toContain('"direct_supabase_query"');
    expect(types).toContain('"raw_db_export"');
    expect(viewModel).toContain('return "submit_for_approval"');
    expect(viewModel).toContain("mutationCount: 0");
    expect(viewModel).toContain("executed: false");
    expect(viewModel).toContain("finalMutation: false");
  });

  it("does not store raw prompt/provider payloads or raw DB rows in the card model", () => {
    const types = read("src/features/ai/commandCenter/AiCommandCenterTypes.ts");
    expect(types).toContain("rawDbRowsExposed: false");
    expect(types).toContain("rawPromptExposed: false");
    expect(types).toContain("providerPayloadStored: false");
    expect(types).not.toContain("rawPrompt:");
    expect(types).not.toContain("providerPayload:");
    expect(types).not.toContain("rawDbRows:");
  });
});
