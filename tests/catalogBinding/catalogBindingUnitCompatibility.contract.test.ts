import { isCatalogUnitCompatible } from "../../src/lib/catalog/catalogItemSearch";

describe("catalog binding unit compatibility", () => {
  it("accepts localized units without treating raw labels as separate catalog semantics", () => {
    expect(isCatalogUnitCompatible("m3", "м3")).toBe(true);
    expect(isCatalogUnitCompatible("sq_m", "м²")).toBe(true);
    expect(isCatalogUnitCompatible("linear_m", "пог. м")).toBe(true);
    expect(isCatalogUnitCompatible("kg", "шт")).toBe(false);
  });
});
