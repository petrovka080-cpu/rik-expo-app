import fs from "node:fs";
import path from "node:path";

const runnerPath = "scripts/e2e/runAiScreenLocalAssistantOrchestratorMaestro.ts";

describe("AI screen-local assistant orchestrator E2E runner", () => {
  it("requires Android runtime proof and keeps Wave 02 non-mutating", () => {
    const source = fs.readFileSync(path.join(process.cwd(), runnerPath), "utf8");

    expect(source).toContain("runAiScreenLocalAssistantOrchestratorMaestro");
    expect(source).toContain("verifyAndroidInstalledBuildRuntime");
    expect(source).toContain("ensureAndroidEmulatorReady");
    expect(source).toContain("S_AI_POINT_OF_NO_RETURN_WAVES_APPROVED");
    expect(source).toContain("S_AI_REQUIRE_SCREEN_LOCAL_SCOPE");
    expect(source).toContain("FORBIDDEN_CROSS_SCREEN_ACTION");
    expect(source).toContain("HANDOFF_PLAN_ONLY");
    expect(source).toContain("GET /agent/screen-assistant/:screenId/context");
    expect(source).toContain("POST /agent/screen-assistant/:screenId/ask");
    expect(source).toContain("mutations_created: 0");
    expect(source).toContain("db_writes: 0");
    expect(source).toContain("provider_called: false");
    expect(source).toContain("fake_green_claimed: false");
    expect(source).toContain("secrets_printed: false");
    expect(source).not.toMatch(/listUsers|createUser|deleteUser|service_role|auth\.admin/i);
  });
});
