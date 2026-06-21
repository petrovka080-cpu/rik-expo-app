import { confirmFixture } from "./photoMaterialExistingRowTestHelpers";

describe("photo material quantity default", () => {
  it("preserves requirement quantity by default", () => {
    const { result } = confirmFixture({ quantityDecision: "KEEP_REQUIREMENT_QUANTITY" });

    expect(result.selectedRow.quantity).toBe(240);
    expect(result.selectedRow.unit).toBe("kg");
  });
});
