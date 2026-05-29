import { expectNoPattern } from "./performanceGuardTestHelpers";

describe("performance no screen local calculation", () => {
  it("does not add screen-local estimate calculation", () => {
    expectNoPattern(/screenLocal|localEstimateRows|calculate.*Screen/i, "screen_local_calculation");
  });
});
