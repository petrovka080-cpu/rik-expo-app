import { getAiApprovalArchitectureScan } from "./aiApprovalArchitectureTestHelpers";

it("does not create a second approval framework", () => {
  expect(getAiApprovalArchitectureScan().secondApprovalFrameworkFound).toBe(0);
});
