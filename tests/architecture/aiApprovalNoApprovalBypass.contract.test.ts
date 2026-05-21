import { getAiApprovalArchitectureScan } from "./aiApprovalArchitectureTestHelpers";

it("does not bypass approval ledger", () => {
  expect(getAiApprovalArchitectureScan().approvalBypassFound).toBe(0);
});
