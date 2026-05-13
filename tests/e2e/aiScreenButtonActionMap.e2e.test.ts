import fs from "node:fs";
import path from "node:path";

const runnerPath = "scripts/e2e/runAiScreenButtonActionMapMaestro.ts";

describe("AI screen button action map E2E contract", () => {
  it("uses Android Maestro targetability, developer/control auth, and deterministic testIDs", () => {
    const runner = fs.readFileSync(path.join(process.cwd(), runnerPath), "utf8");

    expect(runner).toContain("runAiScreenButtonActionMapMaestro");
    expect(runner).toContain("verifyAndroidInstalledBuildRuntime");
    expect(runner).toContain("ensureAndroidEmulatorReady");
    expect(runner).toContain("developer_control_full_access");
    expect(runner).toContain("ai.screen.actions.preview");
    expect(runner).toContain("ai.screen.actions.role");
    expect(runner).toContain("ai.screen.actions.safe_read");
    expect(runner).toContain("ai.screen.actions.draft");
    expect(runner).toContain("ai.screen.actions.approval_required");
    expect(runner).toContain("mutations_created: 0");
    expect(runner).not.toMatch(/listUsers|createUser|deleteUser|service_role/i);
  });
});
