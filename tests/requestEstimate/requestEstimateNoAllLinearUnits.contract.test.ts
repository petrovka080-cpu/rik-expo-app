import { allRows } from "./requestEstimateBoqCatalogTestHelpers";

describe("strip foundation units", () => {
  it("does not collapse all foundation rows into linear_m", () => {
    const units = new Set(allRows().map((row) => row.unit));
    expect(units.has("linear_m")).toBe(false);
    expect(units.has("m3")).toBe(true);
    expect(units.has("sq_m")).toBe(true);
    expect(units.has("kg")).toBe(true);
  });
});
