import fs from "node:fs";
import path from "node:path";

const read = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("office developer override fixture policy", () => {
  it("keeps developer override as an explicit E2E mode with safe fallback only", () => {
    const source = read("src/lib/officeAuthTest/officeRoleTestHarness.ts");

    expect(source).toContain('E2E_ROLE_MODE === "developer_control_full_access"');
    expect(source).toContain("developer_set_effective_role_v1");
    expect(source).toContain("resolveSeparateOfficeRoleCredentials");
    expect(source).toContain("fallbackToSeparateRole");
    expect(source).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY|service_role|auth\.admin|listUsers|createUser/i);
  });
});
