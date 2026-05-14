import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("Command Center runtime targetability closeout", () => {
  it("keeps Command Center as a core targetable runtime surface", () => {
    const runner = read("scripts/e2e/runAiCommandCenterTaskStreamRuntimeMaestro.ts");
    const screen = read("src/features/ai/commandCenter/AiCommandCenterScreen.tsx");

    for (const testId of [
      "ai.command.center.screen",
      "ai.command.center.runtime-status",
      "ai.command.center.task-stream-loaded",
      "ai.command.center.empty-state",
      "ai.command_center.screen",
      "ai.command_center.task_stream",
    ]) {
      expect(`${runner}\n${screen}`).toContain(testId);
    }

    expect(runner).toContain("rik://ai-command-center");
    expect(runner).toContain("clearState: true");
    expect(runner).not.toContain("canary");
  });
});
