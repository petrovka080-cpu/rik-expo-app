import { expectCriticalWorkBinding } from "./catalogBindingCriticalWorksTestHelpers";

describe("GKL catalog binding", () => {
  it("binds drywall wall cladding material rows to catalog candidates", async () => {
    await expectCriticalWorkBinding("drywall_wall_cladding");
  });
});
