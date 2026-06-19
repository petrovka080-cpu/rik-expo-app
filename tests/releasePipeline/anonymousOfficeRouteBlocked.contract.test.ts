import { expectFileToContain } from "./releasePipelineContractUtils";

describe("office anonymous route release proof", () => {
  it("requires anonymous office access to be blocked", () => {
    expectFileToContain("tests/e2e/officeRoleAuthContextFastRepair.web.spec.ts", "anonymous_office_access_blocked");
    expectFileToContain("tests/e2e/officeRoleAuthContextFastRepair.web.spec.ts", "probeAnonymousRoute");
  });
});
