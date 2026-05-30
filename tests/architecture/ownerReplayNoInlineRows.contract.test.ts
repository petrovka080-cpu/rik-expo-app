import { expectNoOwnerReplayPattern } from "./ownerReplayArchitectureTestHelpers";

test("owner replay architecture does not inline BOQ rows in screens", () => {
  expectNoOwnerReplayPattern(/boqRows\s*:\s*\[|estimateRows\s*:\s*\[|inlineRows/i, "inline rows");
});
