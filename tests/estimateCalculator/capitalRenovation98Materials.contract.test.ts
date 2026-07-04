import { calculateCapitalRenovationFromPrompt } from "../../src/features/estimates/calculator/families/capitalRenovationCalculator";
import { CAPITAL_RENOVATION_98_PROMPT } from "./capitalRenovationTestHelpers";

function rowQuantity(code: string): number | undefined {
  const estimate = calculateCapitalRenovationFromPrompt(CAPITAL_RENOVATION_98_PROMPT);
  return estimate?.rows.find((row) => row.code === code)?.quantity;
}

describe("capital renovation 98 materials", () => {
  it("calculates real material quantities instead of generic расходные комплекты", () => {
    expect(rowQuantity("capreno_screed_volume")).toBe(4.9);
    expect(rowQuantity("capreno_screed_mix_kg")).toBe(9702);
    expect(rowQuantity("capreno_screed_mix_bags_25kg")).toBe(389);
    expect(rowQuantity("capreno_self_leveling_mix_kg")).toBe(757);
    expect(rowQuantity("capreno_self_leveling_bags_25kg")).toBe(31);
    expect(rowQuantity("capreno_plaster_mix_kg")).toBe(5891);
    expect(rowQuantity("capreno_plaster_bags_30kg")).toBe(197);
    expect(rowQuantity("capreno_start_putty_kg")).toBe(886);
    expect(rowQuantity("capreno_start_putty_bags_25kg")).toBe(36);
    expect(rowQuantity("capreno_finish_putty_kg")).toBe(296);
    expect(rowQuantity("capreno_finish_putty_bags_25kg")).toBe(12);
    expect(rowQuantity("capreno_primer_before_paint_l")).toBe(37);
    expect(rowQuantity("capreno_interior_paint_l")).toBe(104);
    expect(rowQuantity("capreno_flooring_purchase_m2")).toBe(90.3);
    expect(rowQuantity("capreno_underlay_m2")).toBe(90.3);
    expect(rowQuantity("capreno_baseboard_lm")).toBe(90);
    expect(rowQuantity("capreno_bath_floor_tile_purchase_m2")).toBe(13.2);
    expect(rowQuantity("capreno_bath_wall_tile_purchase_m2")).toBe(66);
    expect(rowQuantity("capreno_tile_adhesive_kg")).toBe(357);
    expect(rowQuantity("capreno_tile_adhesive_bags_25kg")).toBe(15);
    expect(rowQuantity("capreno_tile_grout_kg")).toBe(28);
    expect(rowQuantity("capreno_waterproofing_kg")).toBe(80);
    expect(rowQuantity("capreno_waterproofing_tape_lm")).toBe(40);
  });
});
