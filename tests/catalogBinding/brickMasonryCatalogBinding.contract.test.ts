import { expectCriticalWorkBinding } from "./catalogBindingCriticalWorksTestHelpers";

describe("brick masonry catalog binding", () => {
  it("binds brick masonry material rows to catalog candidates", async () => {
    await expectCriticalWorkBinding("brick_masonry");
  });
});
