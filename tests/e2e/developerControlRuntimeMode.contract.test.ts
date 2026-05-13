import fs from "node:fs";
import path from "node:path";

describe("developer/control runtime mode", () => {
  const root = process.cwd();

  function read(relativePath: string): string {
    return fs.readFileSync(path.join(root, relativePath), "utf8");
  }

  it("has a single-account runtime runner for all major AI flows", () => {
    const source = read("scripts/e2e/runDeveloperControlFullAccessMaestro.ts");

    expect(source).toContain("runDeveloperControlFullAccessMaestro");
    expect(source).toContain("runAiCommandCenterTaskStreamRuntimeMaestro");
    expect(source).toContain("runAiCrossScreenRuntimeMaestro");
    expect(source).toContain("runAiProcurementCopilotMaestro");
    expect(source).toContain("runAiApprovalInboxMaestro");
    expect(source).toContain("GREEN_DEVELOPER_CONTROL_FULL_ACCESS_RUNTIME_MODE_READY");
    expect(source).toContain("role_isolation_e2e_claimed: false");
    expect(source).toContain("mutations_created: 0");
  });

  it("does not use Auth Admin, service role, listUsers, seed, or fake users", () => {
    const combined = [
      "scripts/e2e/resolveExplicitAiRoleAuthEnv.ts",
      "scripts/e2e/runDeveloperControlFullAccessMaestro.ts",
      "scripts/e2e/runAiRoleScreenKnowledgeMaestro.ts",
      "scripts/e2e/runAiCommandCenterTaskStreamRuntimeMaestro.ts",
      "scripts/e2e/runAiCrossScreenRuntimeMaestro.ts",
      "scripts/e2e/runAiProcurementCopilotMaestro.ts",
      "scripts/e2e/runAiApprovalInboxMaestro.ts",
    ]
      .map(read)
      .join("\n");

    expect(combined).not.toContain("auth.admin");
    expect(combined).not.toContain("listUsers(");
    expect(combined).not.toMatch(/service_role(?!_discovery_used_for_green)/);
    expect(combined).not.toContain("seed users");
    expect(combined).not.toContain("fake role accounts");
  });
});
