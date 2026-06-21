import { confirmFixture } from "./photoMaterialExistingRowTestHelpers";

describe("photo material package recalculation", () => {
  it("only recalculates package quantity when explicitly confirmed", () => {
    const keep = confirmFixture({ quantityDecision: "KEEP_REQUIREMENT_QUANTITY" }).result.selectedRow;
    const recalc = confirmFixture({ quantityDecision: "RECALCULATE_FROM_PACKAGE" }).result.selectedRow;

    expect(keep.quantity).toBe(240);
    expect(recalc.quantity).toBe(10);
    expect(recalc.quantitySource).toBe("user_override");
  });
});
