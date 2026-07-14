import fs from "node:fs";
import path from "node:path";

import {
  OFFICE_ROLE_STORAGE_STATE_DIRS,
  OFFICE_ROLE_FIXTURE_ROLES,
  isAllowedOfficeRoleStorageStatePath,
  officeRoleStorageStatePath,
} from "./officeRoleFixtureValidation";

describe("office role storage state safety", () => {
  it("keeps role storage states in ignored local auth directories only", () => {
    const gitignore = fs.readFileSync(path.join(process.cwd(), ".gitignore"), "utf8");

    expect(gitignore).toContain(".playwright/.auth/");
    expect(gitignore).toContain("test-results/");
    expect(gitignore).toContain("tmp/");

    for (const role of OFFICE_ROLE_FIXTURE_ROLES) {
      const filePath = officeRoleStorageStatePath(role);
      const portablePath = filePath.replace(/\\/g, "/");
      expect(isAllowedOfficeRoleStorageStatePath(filePath)).toBe(true);
      expect(portablePath).toContain(OFFICE_ROLE_STORAGE_STATE_DIRS[0]);
      expect(portablePath).toContain(`/${role}.json`);
      expect(portablePath).not.toContain(`/office-${role}.json`);
      expect(filePath).not.toContain(`${path.sep}artifacts${path.sep}`);
      expect(filePath).not.toContain(`${path.sep}src${path.sep}`);
      expect(filePath).not.toContain(`${path.sep}tests${path.sep}`);
    }
  });
});
