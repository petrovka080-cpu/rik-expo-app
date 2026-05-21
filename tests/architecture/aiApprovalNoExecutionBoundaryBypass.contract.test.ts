import { getAiApprovalArchitectureScan } from "./aiApprovalArchitectureTestHelpers";

it("does not bypass execution boundary", () => {
  expect(getAiApprovalArchitectureScan().executionBoundaryBypassFound).toBe(0);
});
