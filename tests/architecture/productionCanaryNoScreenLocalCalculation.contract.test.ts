import { expectNoProductionCanaryPattern } from "./productionCanaryArchitectureTestHelpers";

test("production canary adds no screen-local estimate calculation", () => {
  expectNoProductionCanaryPattern(/screenLocal|localEstimateRows|calculate.*Screen/i, "screen_local_calculation");
});
