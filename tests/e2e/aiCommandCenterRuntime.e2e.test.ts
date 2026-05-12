import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("AI Command Center runtime e2e runner contract", () => {
  const runner = read("scripts/e2e/runAiCommandCenterRuntimeMaestro.ts");

  it("keeps a permanent Maestro runner without fake pass", () => {
    expect(runner).toContain("runAiCommandCenterRuntimeMaestro");
    expect(runner).toContain("ensureAndroidEmulatorReady");
    expect(runner).toContain("ai.command.center.screen");
    expect(runner).toContain("ai.command.center.card.approval-required");
    expect(runner).toContain("ai.command.center.action.ask-why");
    expect(runner).toContain("ai.command.center.action.create-draft");
    expect(runner).toContain("ai.command.center.action.submit-for-approval");
    expect(runner).toContain("mutations_created: 0");
    expect(runner).toContain("fake_pass_claimed: false");
    expect(runner).not.toMatch(/fake_pass_claimed:\s*true/);
  });

  it("blocks honestly when task stream runtime or role isolation is not exposed", () => {
    expect(runner).toContain("BLOCKED_TASK_STREAM_RUNTIME_NOT_EXPOSED");
    expect(runner).toContain("BLOCKED_ROLE_ISOLATION_REQUIRES_SEPARATE_E2E_USERS");
    expect(runner).toContain("AI_COMMAND_CENTER_TASK_STREAM_RUNTIME_EXPOSED=true");
    expect(runner).not.toContain("listUsers");
    expect(runner).not.toContain("service_role");
    expect(runner).not.toContain("auth.admin");
  });
});
