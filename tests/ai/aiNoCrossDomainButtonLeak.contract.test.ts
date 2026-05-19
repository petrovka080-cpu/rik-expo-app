import { groundedQaMatrix } from "./aiGroundedQaTestHarness";

describe("AI no cross-domain button leak", () => {
  it("does not expose domain actions without context", () => {
    expect(groundedQaMatrix().cross_domain_button_leaks_found).toBe(0);
  });
});
