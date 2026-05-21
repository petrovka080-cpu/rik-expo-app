import { getAiApprovalArchitectureScan } from "./aiApprovalArchitectureTestHelpers";

it("does not create a second AI framework", () => {
  expect(getAiApprovalArchitectureScan().secondActionFrameworkFound).toBe(0);
});
