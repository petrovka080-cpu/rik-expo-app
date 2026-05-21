import { getAiApprovalArchitectureScan } from "./aiApprovalArchitectureTestHelpers";

it("does not perform direct DB mutation from approval execution boundary", () => {
  expect(getAiApprovalArchitectureScan().directDbMutationFound).toBe(0);
});
