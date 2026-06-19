import { expectFileToContain } from "./releasePipelineContractUtils";

describe("office role release proof", () => {
  it("keeps isolated storage states for foreman director and buyer", () => {
    expectFileToContain("tests/e2e/officeRoleAuthContextFastRepair.web.spec.ts", "createForemanTestAuthContext");
    expectFileToContain("tests/e2e/officeRoleAuthContextFastRepair.web.spec.ts", "createDirectorTestAuthContext");
    expectFileToContain("tests/e2e/officeRoleAuthContextFastRepair.web.spec.ts", "createBuyerTestAuthContext");
    expectFileToContain(".gitignore", ".playwright/.auth/");
  });
});
