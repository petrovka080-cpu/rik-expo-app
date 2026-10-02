import {
  WOOD_CEILING_FIREPROOF_COATING_KRER26_ACCEPTANCE_INPUT,
  WOOD_CEILING_FIREPROOF_COATING_KRER26_RESOURCES,
} from "../../src/lib/estimate/v4/woodCeilingFireproofCoatingKrer26R1";
import {
  WOOD_CEILING_FIREPROOF_COATING_SMALL_AREA_KRER26_CATALOG_ID,
  compileWoodCeilingFireproofCoatingSmallAreaKrer26R1,
} from "../../src/lib/estimate/v4/woodCeilingFireproofCoatingSmallAreaKrer26R1";

describe("S27.3 F09 small-area wooden-ceiling fireproof coating identity", () => {
  test("uses the separate small-area catalog identity without an area factor", async () => {
    expect(WOOD_CEILING_FIREPROOF_COATING_SMALL_AREA_KRER26_CATALOG_ID)
      .toBe("canonical-work:base:special_repair_interior_fireproof_protect_small_area");
    const compiled = await compileWoodCeilingFireproofCoatingSmallAreaKrer26R1({
      ...WOOD_CEILING_FIREPROOF_COATING_KRER26_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows.map((row) => ({ rowId: row.row_id, quantity: row.quantity })))
      .toEqual([
        { rowId: "f09:wood_ceiling_fireproof_coating_operation", quantity: "100" },
        { rowId: "f09:wood_ceiling_fireproof_coating_labor", quantity: "3.73" },
        { rowId: "f09:wood_ceiling_fireproof_machinist_labor_aggregate", quantity: "0.01" },
        { rowId: "f09:wood_ceiling_fireproof_forklift_1t", quantity: "0.002" },
        { rowId: "f09:wood_ceiling_fireproof_mast_lift_500kg", quantity: "0.004" },
        { rowId: "f09:wood_ceiling_fireproof_airless_unit_1kw", quantity: "1.8" },
        { rowId: "f09:wood_ceiling_fireproof_paint_evrika", quantity: "0.0412" },
      ]);
  });

  test("reuses the exact seven source-backed rows without mutation", () => {
    expect(WOOD_CEILING_FIREPROOF_COATING_KRER26_RESOURCES).toHaveLength(7);
    expect(JSON.stringify(WOOD_CEILING_FIREPROOF_COATING_KRER26_RESOURCES))
      .not.toMatch(/small_area_factor|minimum_area|mobilization_surcharge/iu);
  });

  test("rejects neighboring standard and repair identities", async () => {
    await expect(compileWoodCeilingFireproofCoatingSmallAreaKrer26R1(
      { ...WOOD_CEILING_FIREPROOF_COATING_KRER26_ACCEPTANCE_INPUT },
      { catalogId: "canonical-work:base:special_repair_interior_fireproof_protect_standard" },
    )).rejects.toThrow(
      "WOOD_CEILING_FIREPROOF_COATING_SMALL_AREA_KRER26_CATALOG_UNSUPPORTED",
    );
    await expect(compileWoodCeilingFireproofCoatingSmallAreaKrer26R1(
      { ...WOOD_CEILING_FIREPROOF_COATING_KRER26_ACCEPTANCE_INPUT },
      { catalogId: "canonical-work:base:special_repair_interior_fireproof_repair_small_area" },
    )).rejects.toThrow(
      "WOOD_CEILING_FIREPROOF_COATING_SMALL_AREA_KRER26_CATALOG_UNSUPPORTED",
    );
  });
});
