import { expectCriticalWorkBinding } from "./catalogBindingCriticalWorksTestHelpers";

describe("asphalt catalog binding", () => {
  it("binds canonical asphalt-concrete pavement material rows to catalog candidates", async () => {
    await expectCriticalWorkBinding("asphalt_concrete_pavement");
  });
});
