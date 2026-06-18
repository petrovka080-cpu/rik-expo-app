import fs from "node:fs";
import path from "node:path";

import { OFFICE_ROLE_FIXTURE_ROLES } from "./officeRoleFixtureValidation";

const read = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("office e2e actor provisioning contract", () => {
  it("creates or repairs isolated test-only actors for foreman director and buyer", () => {
    const source = read("scripts/e2e/provisionOfficeRoleActors.ts");

    expect(source).toContain("createOrUpdateActor");
    expect(source).toContain("auth.admin.createUser");
    expect(source).toContain("auth.admin.updateUserById");
    expect(source).toContain("office_e2e_actor");
    expect(source).toContain(".env.office-e2e.local");
    expect(source).toContain("E2E_ROLE_MODE=separate_roles");

    expect(source).toContain("ROLE_ENV_PREFIX");
    expect(source).toContain("emailKey: `E2E_${prefix}_EMAIL`");
    expect(source).toContain("passwordKey = `E2E_${prefix}_PASSWORD`");
    expect(source).toContain("userIdKey = `OFFICE_E2E_${prefix}_USER_ID`");
    expect(source).toContain("office-e2e-${role}.local@example.invalid");
    expect(source).toContain("lines.push(`E2E_${prefix}_EMAIL=");
    expect(source).toContain("lines.push(`E2E_${prefix}_PASSWORD=");
    expect(source).toContain("lines.push(`OFFICE_E2E_${prefix}_USER_ID=");

    for (const role of OFFICE_ROLE_FIXTURE_ROLES) {
      expect(source).toContain(role);
    }

    expect(source).not.toMatch(/console\.(log|error)\([^)]*(email|password|actor\.email|actor\.password)/i);
    expect(source).not.toMatch(/directorOnlyFakeAuth|buyerOnlyFakeAuth|foremanOnlyBypass/);
  });
});
