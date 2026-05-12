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
    expect(source).toContain("classifyMaestroFailure");
  });

  it("uses the already installed Android package before attempting any APK reinstall", () => {
    const installedCheckIndex = source.indexOf("installedPathBefore");
    const installIndex = source.indexOf('"install", "-r", releaseApk');

    expect(installedCheckIndex).toBeGreaterThan(-1);
    expect(installIndex).toBeGreaterThan(installedCheckIndex);
    expect(source).toContain('installedPathBefore.includes("package:")');
  });

  it("requires explicit role secrets and never uses discovery or DB-writing seed harnesses", () => {
    expect(source).toContain("resolveExplicitAiRoleAuthEnv");
    expect(source).toContain("BLOCKED_NO_E2E_ROLE_SECRETS");
    expect(source).toContain('roleAuthResolution.source !== "explicit_env"');
    expect(source).not.toContain("createMaestroCriticalBusinessSeed");
    expect(source).not.toContain("createTempUser");
    expect(source).not.toContain("resolveAiRoleScreenKnowledgeAuthEnv");
    expect(source).not.toContain("listUsers");
    expect(source).not.toContain("auth.admin");
    expect(source).not.toContain("signInWithPassword");
  });

  it("passes role credentials to Maestro through process env with redacted failure output", () => {
    expect(source).toContain("redactE2eSecrets");
    expect(source).toContain("collectExplicitE2eSecrets");
    expect(source).toContain("credentials_in_cli_args: false");
    expect(source).toContain("credentials_printed: false");
    expect(source).toContain("stdout_redacted: true");
    expect(source).toContain("stderr_redacted: true");
    expect(source).toContain("roleAuthResolution.env");
    expect(source).toContain("buildMaestroPrefixedRoleEnv");
    expect(source).toContain("maestroRoleEnv");
    expect(source).not.toContain("...buildMaestroEnvArgs(roleAuthEnv)");
    expect(source).not.toContain("...buildMaestroEnvArgs(roleAuthResolution.env)");
    expect(source).not.toContain("-e E2E_");
  });

  it("writes a non-fake emulator artifact with mutation and role-leakage invariants", () => {
    expect(source).toContain("fake_pass_claimed: false");
    expect(source).toContain("mutations_created: 0");
    expect(source).toContain("approval_required_observed: true");
    expect(source).toContain("role_leakage_observed: false");
    expect(source).toContain("GREEN_AI_EXPLICIT_ROLE_SECRETS_E2E_CLOSEOUT");
  });

  it("classifies role knowledge assertion failures without mislabeling them as auth failures", () => {
    expect(source).toContain("BLOCKED_AI_ROLE_SCREEN_ASSERTION_FAILED");
    expect(source).toContain("AI APP KNOWLEDGE BLOCK");
    expect(source).toContain("Assertion is false:");
  });
});
