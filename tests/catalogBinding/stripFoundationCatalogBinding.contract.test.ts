import { expectCriticalWorkBinding } from "./catalogBindingCriticalWorksTestHelpers";

describe("strip foundation catalog binding", () => {
  it("binds strip foundation material rows to catalog candidates", async () => {
    await expectCriticalWorkBinding("strip_foundation");
  });
});
