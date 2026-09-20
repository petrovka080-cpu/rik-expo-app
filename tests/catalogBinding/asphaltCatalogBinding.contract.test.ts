import { expectCriticalWorkBinding } from "./catalogBindingCriticalWorksTestHelpers";

describe("asphalt catalog binding", () => {
  it("binds asphalt paving material rows to catalog candidates", async () => {
    await expectCriticalWorkBinding("asphalt_paving");
  });
});
