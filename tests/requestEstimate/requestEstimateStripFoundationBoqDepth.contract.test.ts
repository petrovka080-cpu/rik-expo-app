import { allRows, foundationDepth } from "./requestEstimateBoqCatalogTestHelpers";

describe("strip foundation BOQ depth", () => {
  it("has professional BOQ depth with materials, labor and delivery/equipment", () => {
    const depth = foundationDepth();
    expect(depth.passed).toBe(true);
    expect(depth.actualRows).toBeGreaterThanOrEqual(12);
    expect(depth.hasMaterials).toBe(true);
    expect(depth.hasLabor).toBe(true);
    expect(depth.hasEquipmentOrDeliveryOrWarning).toBe(true);
    expect(allRows()).toHaveLength(20);
  });
});
