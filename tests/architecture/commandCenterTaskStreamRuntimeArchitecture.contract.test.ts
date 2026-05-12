import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("Command Center task-stream runtime architecture", () => {
  it("uses a runtime adapter and keeps UI away from direct data/model boundaries", () => {
    const runtimeFiles = [
      "src/features/ai/taskStream/aiTaskStreamRuntime.ts",
      "src/features/ai/taskStream/aiTaskStreamRuntimeTypes.ts",
      "src/features/ai/taskStream/aiTaskStreamEvidence.ts",
      "src/features/ai/taskStream/aiTaskStreamCardProducers.ts",
    ];
    for (const file of runtimeFiles) expect(fs.existsSync(path.join(root, file))).toBe(true);

    const commandCenter = [
      "src/features/ai/commandCenter/AiCommandCenterScreen.tsx",
      "src/features/ai/commandCenter/buildAiCommandCenterViewModel.ts",
      "src/features/ai/commandCenter/AiCommandCenterTypes.ts",
    ].map(read).join("\n");
    const shell = read("src/features/ai/agent/agentBffRouteShell.ts");
    const runtime = runtimeFiles.map(read).join("\n");

    expect(shell).toContain("GET /agent/task-stream");
    expect(shell).toContain("loadAiTaskStreamRuntime");
    expect(commandCenter).toContain("runtimeStatus");
    expect(commandCenter).toContain("taskStreamLoaded");
    expect(runtime).toContain("hasAiTaskStreamEvidence");
    expect(runtime).toContain("Unknown AI role is denied by default");
    expect(commandCenter).not.toMatch(/@supabase\/supabase-js|\bsupabase\b|\bauth\.admin\b|\blistUsers\b|\bservice_role\b/i);
    expect(commandCenter).not.toMatch(/openai|gpt-|gemini|AiModelGateway|LegacyGeminiModelProvider|assistantClient/i);
    expect(runtime).not.toMatch(/\b(rawPrompt|providerPayload|rawDbRows)\s*:/);
  });
});
