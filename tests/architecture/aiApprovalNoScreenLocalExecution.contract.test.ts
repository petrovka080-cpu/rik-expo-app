import { getAiApprovalArchitectureScan } from "./aiApprovalArchitectureTestHelpers";

it("does not create screen-local approval or execution logic", () => {
  const scan = getAiApprovalArchitectureScan();
  expect(scan.screenLocalApprovalLogicFound).toBe(0);
  expect(scan.screenLocalExecutionLogicFound).toBe(0);
});
