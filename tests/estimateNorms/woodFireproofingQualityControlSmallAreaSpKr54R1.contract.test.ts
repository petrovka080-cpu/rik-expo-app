import {
  WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_ACCEPTANCE_INPUT,
  WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_RESOURCES,
  WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_SHORT_INPUT,
} from "../../src/lib/estimate/v4/woodFireproofingQualityControlSpKr54R1";
import {
  WOOD_FIREPROOFING_QUALITY_CONTROL_SMALL_AREA_SP_KR54_CATALOG_ID,
  compileWoodFireproofingQualityControlSmallAreaSpKr54R1,
} from "../../src/lib/estimate/v4/woodFireproofingQualityControlSmallAreaSpKr54R1";

describe("S27.3 F09 small-area wood-fireproofing quality-control identity", () => {
  test("uses the separate small-area identity without a sampling or minimum-area factor", async () => {
    expect(WOOD_FIREPROOFING_QUALITY_CONTROL_SMALL_AREA_SP_KR54_CATALOG_ID)
      .toBe("canonical-work:base:special_repair_interior_fireproof_test_small_area");
    const short = await compileWoodFireproofingQualityControlSmallAreaSpKr54R1({
      ...WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_SHORT_INPUT,
    });
    expect(short.rows).toEqual([
      expect.objectContaining({
        row_id: "f09:wood_fireproofing_controlled_area",
        quantity: "100",
      }),
    ]);
    expect(short.preliminaryNeeds).toHaveLength(4);
  });

  test("reuses all five exact boundary rows and direct approved inputs", async () => {
    const compiled = await compileWoodFireproofingQualityControlSmallAreaSpKr54R1({
      ...WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows.map((row) => ({ rowId: row.row_id, quantity: row.quantity })))
      .toEqual([
        { rowId: "f09:wood_fireproofing_controlled_area", quantity: "100" },
        { rowId: "f09:wood_fireproofing_surface_condition_inspection", quantity: "5" },
        { rowId: "f09:wood_fireproofing_application_technology_check", quantity: "3" },
        { rowId: "f09:wood_fireproofing_qualitative_evaluation", quantity: "5" },
        { rowId: "f09:wood_fireproofing_quality_control_protocol", quantity: "1" },
      ]);
    expect(JSON.stringify(WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_RESOURCES))
      .not.toMatch(/small_area_factor|minimum_area|sampling_density|mobilization_surcharge/iu);
  });

  test("rejects the standard and neighboring repair identities", async () => {
    await expect(compileWoodFireproofingQualityControlSmallAreaSpKr54R1(
      { ...WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_ACCEPTANCE_INPUT },
      { catalogId: "canonical-work:base:special_repair_interior_fireproof_test_standard" },
    )).rejects.toThrow(
      "WOOD_FIREPROOFING_QUALITY_CONTROL_SMALL_AREA_SP_KR54_CATALOG_UNSUPPORTED",
    );
    await expect(compileWoodFireproofingQualityControlSmallAreaSpKr54R1(
      { ...WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_ACCEPTANCE_INPUT },
      { catalogId: "canonical-work:base:special_repair_interior_fireproof_repair_small_area" },
    )).rejects.toThrow(
      "WOOD_FIREPROOFING_QUALITY_CONTROL_SMALL_AREA_SP_KR54_CATALOG_UNSUPPORTED",
    );
  });
});
