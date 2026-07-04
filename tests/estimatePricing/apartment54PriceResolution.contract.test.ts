import {
  capitalRenovationBundle,
  rowCode,
} from "../estimateCalculator/capitalRenovationTestHelpers";

describe("apartment 54 price resolution contract", () => {
  it("leaves core capital renovation rows without fake prices or zero missing amounts", () => {
    const bundle = capitalRenovationBundle();
    const rows = bundle.items;

    for (const code of [
      "capreno_screed_mix_kg",
      "capreno_plaster_mix_kg",
      "capreno_start_putty_kg",
      "capreno_finish_putty_kg",
      "capreno_primer_before_paint_l",
      "capreno_interior_paint_l",
      "capreno_bath_floor_tile_purchase_m2",
      "capreno_bath_wall_tile_purchase_m2",
      "capreno_tile_adhesive_kg",
      "capreno_baseboard_lm",
      "capreno_socket_boxes_pcs",
      "capreno_material_delivery_trips",
    ]) {
      const row = rows.find((item) => rowCode(item) === code);
      expect(row).toBeTruthy();
      expect(row?.unitPrice).toBeNull();
      expect(row?.totalPrice).toBeNull();
      expect(row?.priceStatus).toBe("PRICE_MISSING");
      expect(row?.priceSourceLabel).toBe("Источник цены не выбран");
    }

    expect(rows.every((row) => row.totalPrice == null && row.unitPrice == null)).toBe(true);
  });
});
