import { expectNoOwnerReplayPattern } from "./ownerReplayArchitectureTestHelpers";

test("owner replay architecture does not add screen-local estimate calculation", () => {
  expectNoOwnerReplayPattern(/screenLocalCalculation|calculate.*Estimate.*Screen|setEstimateRows|localBoqRows/i, "screen-local calculation");
});
