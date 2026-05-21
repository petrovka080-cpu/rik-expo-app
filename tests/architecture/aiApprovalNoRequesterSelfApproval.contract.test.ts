import { getAiApprovalArchitectureScan } from "./aiApprovalArchitectureTestHelpers";

it("does not allow requester self approval", () => {
  expect(getAiApprovalArchitectureScan().requesterSelfApprovalFound).toBe(0);
});
