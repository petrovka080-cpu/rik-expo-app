import { getAiApprovalArchitectureScan } from "./aiApprovalArchitectureTestHelpers";

it("does not add useEffect hacks in approval execution boundary", () => {
  expect(getAiApprovalArchitectureScan().useEffectHacksFound).toBe(0);
});
