import { getAiApprovalArchitectureScan } from "./aiApprovalArchitectureTestHelpers";

it("does not add hooks in approval execution boundary", () => {
  expect(getAiApprovalArchitectureScan().hooksFound).toBe(0);
});
