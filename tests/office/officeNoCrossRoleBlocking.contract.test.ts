import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const read = (relativePath: string) =>
  fs.readFileSync(path.join(ROOT, relativePath), "utf8");

describe("office no cross-role blocking", () => {
  it("renders Office directions from local manifest without waiting for all role datasets", () => {
    const roleAccess = read("src/screens/office/useOfficeHubRoleAccess.ts");
    const model = read("src/screens/office/office.layout.model.ts");
    const accessService = read("src/screens/office/officeAccess.services.ts");
    const officeShell = read("src/screens/office/OfficeShellContent.tsx");

    expect(roleAccess).toContain("isBootstrapShell");
    expect(roleAccess).toContain("availableOfficeRoles: isBootstrapShell");
    expect(roleAccess).toContain("[OFFICE_BOOTSTRAP_ROLE]");
    expect(model).toContain("params.loading ||");
    expect(model).toContain("showOfficeDirections");
    expect(officeShell).toContain("OfficeRoleDirectionsSection");
    expect(accessService).toContain("loadOfficeMembersPage({ company })");
    expect(accessService).toContain("loadCompanyInvites(company.id)");
    expect(model).not.toContain("loadOfficeMembersPage");
    expect(model).not.toContain("loadCompanyInvites");
  });
});
