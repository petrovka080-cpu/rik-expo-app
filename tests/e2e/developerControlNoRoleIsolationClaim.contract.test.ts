import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("developer/control targetability does not claim role isolation", () => {
  it("keeps single-account runtime separate from role-isolation E2E", () => {
    const runner = read("scripts/e2e/runDeveloperControlFullAccessMaestro.ts");
    const resolver = read("scripts/e2e/resolveExplicitAiRoleAuthEnv.ts");

    expect(resolver).toContain("developer_control_full_access");
    expect(resolver).toContain("role_isolation_e2e_claimed: false");
    expect(resolver).toContain("separate_role_users_required: false");
    expect(runner).toContain("role_isolation_status");
    expect(runner).toContain("role_isolation_e2e_claimed: false");
    expect(runner).not.toContain("BLOCKED_ROLE_ISOLATION_REQUIRES_SEPARATE_E2E_USERS");
    expect(runner).not.toContain("role_isolation_e2e_claimed: true");
  });
});
