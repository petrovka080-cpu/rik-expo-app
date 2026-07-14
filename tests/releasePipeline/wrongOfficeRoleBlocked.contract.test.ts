import { expectFileToContain } from "./releasePipelineContractUtils";

describe("office wrong role release proof", () => {
  it("requires wrong-role director route access to be blocked", () => {
    expectFileToContain("tests/e2e/officeRoleAuthContextFastRepair.web.spec.ts", "wrong_role_director_route_blocked");
    expectFileToContain("tests/e2e/officeRoleAuthContextFastRepair.web.spec.ts", "director_buyer_route_blocked");
  });
});
