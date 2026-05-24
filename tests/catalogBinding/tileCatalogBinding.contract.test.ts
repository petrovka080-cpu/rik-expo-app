import { expectCriticalWorkBinding } from "./catalogBindingCriticalWorksTestHelpers";

describe("tile catalog binding", () => {
  it("binds ceramic tile material rows to catalog candidates", async () => {
    await expectCriticalWorkBinding("ceramic_tile_floor_laying");
  });
});
