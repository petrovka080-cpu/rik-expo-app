import {
  WOOD_FIREPROOFING_SURFACE_CLEANING_ACCEPTANCE_INPUT,
  WOOD_FIREPROOFING_SURFACE_CLEANING_ARTIFACT_SHA256,
  WOOD_FIREPROOFING_SURFACE_CLEANING_FORMULAS,
  WOOD_FIREPROOFING_SURFACE_CLEANING_PARAMETERS,
  WOOD_FIREPROOFING_SURFACE_CLEANING_RESOURCES,
  WOOD_FIREPROOFING_SURFACE_CLEANING_SHORT_INPUT,
  WOOD_FIREPROOFING_SURFACE_CLEANING_VARIANTS,
  compileWoodFireproofingSurfaceCleaningVariantR1,
  resolveWoodFireproofingSurfaceCleaningVariant,
  woodFireproofingSurfaceCleaningCompletenessMap,
  type WoodFireproofingSurfaceCleaningVariantKey,
} from "../../src/lib/estimate/v4/woodFireproofingSurfaceCleaningVariantsR1";

const VARIANT_KEYS = Object.keys(
  WOOD_FIREPROOFING_SURFACE_CLEANING_VARIANTS,
) as WoodFireproofingSurfaceCleaningVariantKey[];

describe("S27.6 F09 fireproofed-wood surface-cleaning variants", () => {
  test("uses two exact identities and the current SP KR 54 artifact boundary", () => {
    expect(VARIANT_KEYS).toEqual(["small_area", "standard"]);
    expect(new Set(VARIANT_KEYS.map((key) =>
      WOOD_FIREPROOFING_SURFACE_CLEANING_VARIANTS[key].catalogId)).size).toBe(2);
    expect(WOOD_FIREPROOFING_SURFACE_CLEANING_ARTIFACT_SHA256)
      .toBe("e28932e7b9f8ed54b6cb2e222ed1e0981db94a885ea2a698e7c7c33ebea87a6c");
    for (const key of VARIANT_KEYS) {
      expect(woodFireproofingSurfaceCleaningCompletenessMap(key)).toMatchObject({
        generatedFromCurrentRows: false,
        catalogVariant: expect.stringMatching(/NO_HIDDEN_QUANTITY_FACTOR$/u),
      });
    }
  });

  test.each(VARIANT_KEYS)("%s exposes area and defers compatible method quantities", async (key) => {
    const compiled = await compileWoodFireproofingSurfaceCleaningVariantR1(key, {
      ...WOOD_FIREPROOFING_SURFACE_CLEANING_SHORT_INPUT,
    });
    expect(compiled.rows).toEqual([
      expect.objectContaining({
        row_id: "f09:wood_fireproofing_cleaned_area",
        quantity: "100",
        unit_id: "m2",
      }),
    ]);
    expect(compiled.preliminaryNeeds).toHaveLength(7);
  });

  test.each(VARIANT_KEYS)("%s uses direct method and waste quantities", async (key) => {
    const compiled = await compileWoodFireproofingSurfaceCleaningVariantR1(key, {
      ...WOOD_FIREPROOFING_SURFACE_CLEANING_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows.map((row) => row.quantity)).toEqual([
      "100", "20", "4", "8", "5", "50", "120", "10", "15", "1", "1",
    ]);
    expect(WOOD_FIREPROOFING_SURFACE_CLEANING_PARAMETERS).toHaveLength(21);
    expect(WOOD_FIREPROOFING_SURFACE_CLEANING_FORMULAS).toHaveLength(11);
    expect(WOOD_FIREPROOFING_SURFACE_CLEANING_RESOURCES).toHaveLength(11);
  });

  test("keeps cleaning separate from coating and structural repair", () => {
    const rows = JSON.stringify(WOOD_FIREPROOFING_SURFACE_CLEANING_RESOURCES.map((row) => ({
      row_id: row.row_id,
      title_ru: row.title_ru,
      category: row.category,
    })));
    expect(rows).toMatch(/cleaning|очист|waste|отход/iu);
    expect(rows).not.toMatch(
      /paint_evrika|coating_application|repair_compound|injection|sealing|strengthening/iu,
    );
    expect(JSON.stringify(WOOD_FIREPROOFING_SURFACE_CLEANING_FORMULAS))
      .not.toMatch(/classification|area_factor|golden_rate|normFactor/iu);
  });

  test("rejects unknown variants, identity substitution and forbidden branch details", async () => {
    expect(() => resolveWoodFireproofingSurfaceCleaningVariant("large_area"))
      .toThrow("WOOD_FIREPROOFING_SURFACE_CLEANING_VARIANT_UNSUPPORTED");
    await expect(compileWoodFireproofingSurfaceCleaningVariantR1(
      "small_area",
      { ...WOOD_FIREPROOFING_SURFACE_CLEANING_ACCEPTANCE_INPUT },
      { catalogId: WOOD_FIREPROOFING_SURFACE_CLEANING_VARIANTS.standard.catalogId },
    )).rejects.toThrow("WOOD_FIREPROOFING_SURFACE_CLEANING_CATALOG_UNSUPPORTED");
    await expect(compileWoodFireproofingSurfaceCleaningVariantR1("standard", {
      ...WOOD_FIREPROOFING_SURFACE_CLEANING_SHORT_INPUT,
      approved_cleaner_designation: "Недопустимо для сухой ветви",
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileWoodFireproofingSurfaceCleaningVariantR1("standard", {
      ...WOOD_FIREPROOFING_SURFACE_CLEANING_ACCEPTANCE_INPUT,
      cleaning_area_m2: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
  });
});
