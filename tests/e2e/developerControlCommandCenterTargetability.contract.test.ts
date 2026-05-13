import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("developer/control Command Center targetability", () => {
  it("uses stable Command Center and screen-runtime IDs", () => {
    const runner = read("scripts/e2e/runAiCommandCenterTaskStreamRuntimeMaestro.ts");
    const crossScreenRunner = read("scripts/e2e/runAiCrossScreenRuntimeMaestro.ts");
    const screen = read("src/features/ai/commandCenter/AiCommandCenterScreen.tsx");
    const route = read("app/ai-command-center.tsx");

    expect(runner).toContain("rik://ai-command-center");
    expect(crossScreenRunner).toContain("rik://ai-command-center");
    expect(route).toContain("AiCommandCenterScreen");
    for (const testId of [
      "ai.command.center.screen",
      "ai.command.center.runtime-status",
      "ai.command.center.task-stream-loaded",
      "ai.command.center.empty-state",
    ]) {
      expect(runner).toContain(testId);
      expect(screen).toContain(testId);
    }
    expect(crossScreenRunner).toContain("ai.screen.runtime.screen");
    expect(screen).toContain("ai.screen.runtime.status");
  });
});
