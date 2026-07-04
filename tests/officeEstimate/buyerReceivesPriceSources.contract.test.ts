import {
  capitalRenovationBundle,
  includedInProcurement,
  rowCode,
} from "../estimateCalculator/capitalRenovationTestHelpers";

describe("buyer receives price sources contract", () => {
  it("keeps capital renovation procurement handoff to materials and delivery rows with missing price state", () => {
    const bundle = capitalRenovationBundle();
    const procurementItems = bundle.items.filter(includedInProcurement);

    expect(procurementItems.length).toBeGreaterThan(0);
    expect(procurementItems.every((item) => item.itemType !== "work")).toBe(true);
    expect(procurementItems.some((item) => item.itemType === "material")).toBe(true);
    expect(procurementItems.some((item) => item.itemType === "service")).toBe(true);
    expect(procurementItems.every((item) => item.unitPrice == null && item.totalPrice == null)).toBe(true);
    expect(procurementItems.every((item) => item.priceSourceLabel === "Источник цены не выбран")).toBe(true);
    expect(procurementItems.map(rowCode)).toEqual(expect.arrayContaining([
      "capreno_screed_mix_kg",
      "capreno_plaster_mix_kg",
      "capreno_tile_adhesive_kg",
      "capreno_electrical_cable_m",
      "capreno_water_pipe_m",
      "capreno_material_delivery_trips",
    ]));
  });
});
