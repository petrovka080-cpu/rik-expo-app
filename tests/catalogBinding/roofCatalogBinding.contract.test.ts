import { expectCriticalWorkBinding } from "./catalogBindingCriticalWorksTestHelpers";

describe("roof catalog binding", () => {
  it("binds gable roof material rows to catalog candidates", async () => {
    await expectCriticalWorkBinding("gable_roof_installation");
  });
});
