import fs from "node:fs";
import path from "node:path";

const read = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("office role membership provisioning contract", () => {
  it("writes every role source required by runtime and verifies the resolved role", () => {
    const source = read("scripts/e2e/provisionOfficeRoleActors.ts");

    expect(source).toContain("app_metadata: metadata");
    expect(source).toContain('.from("profiles")');
    expect(source).toContain('.from("user_profiles")');
    expect(source).toContain('.from("company_members")');
    expect(source).toContain("company_id,user_id");
    expect(source).toContain("ensureOfficeCompany");

    expect(source).toContain("probeActor");
    expect(source).toContain('client.rpc("app_actor_role_context_v1"');
    expect(source).toContain("canonical_role_valid");
    expect(source).toContain("membership_valid");
    expect(source).toContain("profile_valid");
    expect(source).toContain("app_metadata_valid");
    expect(source).toContain("assertProbeMatches");
    expect(source).toContain("BLOCKED_OFFICE_ROLE_SOURCE_MISMATCH");
  });
});
