import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

describe("runAiRoleScreenKnowledgeMaestro", () => {
  const source = read("scripts/e2e/runAiRoleScreenKnowledgeMaestro.ts");

  it("runs Maestro only after the emulator bootstrap is ready", () => {
    expect(source).toContain("ensureAndroidEmulatorReady");
    expect(source).toContain('bootstrap.final_status !== "GREEN_ANDROID_EMULATOR_READY"');
    expect(source).toContain("ensureAppInstalledAndLaunchable");
    expect(source).toContain("maestroBinary");
    expect(source).toContain("--device");
    expect(source).toContain("...flowFiles");
  });

  it("does not use the DB-writing seed harness by default", () => {
    expect(source).toContain("REQUIRED_ROLE_AUTH_ENV");
    expect(source).toContain("BLOCKED_E2E_ROLE_AUTH_HARNESS_NOT_AVAILABLE");
    expect(source).toContain("DB-writing seed harness was not used by this wave");
    expect(source).not.toContain("createMaestroCriticalBusinessSeed");
    expect(source).not.toContain("createTempUser");
  });

  it("writes a non-fake emulator artifact with mutation and role-leakage invariants", () => {
    expect(source).toContain("fakePassClaimed: false");
    expect(source).toContain("mutationsCreated: 0");
    expect(source).toContain("approvalRequiredObserved: true");
    expect(source).toContain("roleLeakageObserved: false");
    expect(source).toContain("GREEN_AI_ROLE_SCREEN_KNOWLEDGE_EMULATOR_CLOSEOUT");
  });
});
