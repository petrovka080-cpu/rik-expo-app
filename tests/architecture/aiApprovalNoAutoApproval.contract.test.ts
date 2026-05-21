import { getAiApprovalArchitectureScan } from "./aiApprovalArchitectureTestHelpers";

it("does not auto approve", () => {
  expect(getAiApprovalArchitectureScan().autoApprovalFound).toBe(0);
});
