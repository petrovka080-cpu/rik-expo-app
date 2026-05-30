import { expectNoInternalCanaryPattern } from "./internalCanaryArchitectureTestHelpers";

test("internal canary adds no screen-local estimate calculation", () => {
  expectNoInternalCanaryPattern(/screenLocal|localEstimateRows|calculate.*Screen/i, "screen_local_calculation");
});
