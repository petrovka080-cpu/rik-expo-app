import fs from "node:fs";
import path from "node:path";

import {
  OFFICE_ROLE_FIXTURE_ROLES,
  officeRoleStorageStatePath,
} from "./officeRoleFixtureValidation";

const read = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("office storage states resolve expected roles before writing", () => {
  it("writes storageState only after each runtime role probe matches", () => {
    const helperSource = read("tests/officeAuth/officeRoleFixtureValidation.ts");
    const scriptSource = read("scripts/e2e/prepareOfficeRoleStorageStates.ts");
    const gitignore = read(".gitignore");

    expect(gitignore).toContain(".playwright/.auth/");
    expect(helperSource).toContain("runtime_probe");
    expect(helperSource).toContain("membership_valid");
    expect(scriptSource).toContain("officeRoleMarkerTestId(role)");
    expect(scriptSource).toContain("record.role_match");
    expect(scriptSource).toContain("context.storageState");
    expect(scriptSource.indexOf("if (!record.role_match)")).toBeLessThan(
      scriptSource.indexOf("context.storageState"),
    );

    for (const role of OFFICE_ROLE_FIXTURE_ROLES) {
      const portablePath = officeRoleStorageStatePath(role).replace(/\\/g, "/");
      expect(portablePath).toContain(`.playwright/.auth/${role}.json`);
      expect(portablePath).not.toContain(`office-${role}.json`);
    }
  });
});
