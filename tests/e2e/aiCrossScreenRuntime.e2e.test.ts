import fs from "node:fs";

const runnerPath = "scripts/e2e/runAiCrossScreenRuntimeMaestro.ts";

describe("AI cross-screen runtime E2E contract", () => {
  it("uses explicit role credentials, cross-screen runtime testIDs, and no mutation proof", () => {
    const runner = fs.readFileSync(runnerPath, "utf8");

    expect(runner).toContain("runAiCrossScreenRuntimeMaestro");
    expect(runner).toContain("ai.screen.runtime.screen");
    expect(runner).toContain("ai.screen.runtime.status");
    expect(runner).toContain("ai.screen.runtime.loaded");
    expect(runner).toContain("resolveExplicitAiRoleAuthEnv");
    expect(runner).toContain("BLOCKED_ROLE_ISOLATION_REQUIRES_SEPARATE_E2E_USERS");
    expect(runner).toContain("mutations_created: 0");
    expect(runner).toContain("role_leakage_observed: false");
    expect(runner).toContain("credentials_in_cli_args: false");
    expect(runner).toContain("credentials_printed: false");
    expect(runner).not.toContain("service_role");
    expect(runner).not.toContain("auth.admin");
    expect(runner).not.toContain("listUsers");
  });
});
