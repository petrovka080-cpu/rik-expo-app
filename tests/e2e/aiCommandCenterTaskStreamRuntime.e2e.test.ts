import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("AI Command Center task-stream runtime Maestro runner", () => {
  it("runs the runtime exposed flow without fake pass, discovery, or credential CLI args", () => {
    const runner = read("scripts/e2e/runAiCommandCenterTaskStreamRuntimeMaestro.ts");

    expect(runner).toContain("runAiCommandCenterTaskStreamRuntimeMaestro");
    expect(runner).toContain("GREEN_COMMAND_CENTER_TASK_STREAM_RUNTIME_EXPOSED");
    expect(runner).toContain("BLOCKED_TASK_STREAM_RUNTIME_NOT_EXPOSED");
    expect(runner).toContain("ai.command.center.runtime-status");
    expect(runner).toContain("ai.command.center.task-stream-loaded");
    expect(runner).toContain("ai.command.center.empty-state");
    expect(runner).toContain("mutations_created: 0");
    expect(runner).toContain("fake_pass_claimed: false");
    expect(runner).not.toContain("AI_COMMAND_CENTER_TASK_STREAM_RUNTIME_EXPOSED");
    expect(runner).not.toContain("listUsers");
    expect(runner).not.toContain("auth.admin");
    expect(runner).not.toContain('"--env"');
    expect(runner).not.toContain('"-e"');
  });
});
