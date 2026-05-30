import { expectNoLimitedPublicBetaPattern } from "./limitedPublicBetaArchitectureTestHelpers";

test("limited public beta adds no screen-local estimate calculation", () => {
  expectNoLimitedPublicBetaPattern(/screenLocal|localEstimateRows|calculate.*Screen/i, "screen_local_calculation");
});
