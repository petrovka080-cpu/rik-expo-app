import {
  WOOD_FIREPROOFING_SURFACE_PREPARATION_ACCEPTANCE_INPUT,
  WOOD_FIREPROOFING_SURFACE_PREPARATION_FORMULAS,
  WOOD_FIREPROOFING_SURFACE_PREPARATION_PARAMETERS,
  WOOD_FIREPROOFING_SURFACE_PREPARATION_PRELIMINARY_PROFILE,
  WOOD_FIREPROOFING_SURFACE_PREPARATION_RESOURCES,
  WOOD_FIREPROOFING_SURFACE_PREPARATION_SHORT_INPUT,
  WOOD_FIREPROOFING_SURFACE_PREPARATION_VARIANTS,
  compileWoodFireproofingSurfacePreparationVariantR1,
  resolveWoodFireproofingSurfacePreparationVariant,
  woodFireproofingSurfacePreparationCompletenessMap,
  type WoodFireproofingSurfacePreparationVariantKey,
} from "../../src/lib/estimate/v4/woodFireproofingSurfacePreparationVariantsR1";

const VARIANT_KEYS = Object.keys(
  WOOD_FIREPROOFING_SURFACE_PREPARATION_VARIANTS,
) as WoodFireproofingSurfacePreparationVariantKey[];

function quantity(compiled: Awaited<ReturnType<
  typeof compileWoodFireproofingSurfacePreparationVariantR1
>>, rowId: string): string | undefined {
  return compiled.rows.find((row) => row.row_id === rowId)?.quantity;
}

describe("S27.7 F09 wood fireproofing surface preparation variants", () => {
  test("preserves two exact search identities without a suffix quantity factor", () => {
    expect(VARIANT_KEYS).toEqual(["small_area", "standard"]);
    expect(new Set(VARIANT_KEYS.map((key) =>
      WOOD_FIREPROOFING_SURFACE_PREPARATION_VARIANTS[key].catalogId)).size).toBe(2);
    for (const key of VARIANT_KEYS) {
      expect(woodFireproofingSurfacePreparationCompletenessMap(key)).toMatchObject({
        generatedFromCurrentRows: false,
        catalogVariant: expect.stringMatching(/NO_HIDDEN_QUANTITY_FACTOR$/u),
      });
    }
  });

  test.each(VARIANT_KEYS)(
    "%s creates a complete first estimate from four known scope values",
    async (key) => {
      expect(Object.keys(WOOD_FIREPROOFING_SURFACE_PREPARATION_SHORT_INPUT)).toEqual([
        "preparation_area_m2",
        "existing_fireproof_system_designation",
        "surface_condition_statement",
        "subsequent_operation",
      ]);
      const compiled = await compileWoodFireproofingSurfacePreparationVariantR1(key, {
        ...WOOD_FIREPROOFING_SURFACE_PREPARATION_SHORT_INPUT,
      });
      expect(compiled.preliminaryNeeds).toEqual([]);
      expect(compiled.rows).toHaveLength(11);
      expect(quantity(compiled, "f09:wood_fireproofing_prepared_area")).toBe("100");
      expect(quantity(compiled, "f09:wood_fireproofing_preparation_labor")).toBe("24");
      expect(quantity(compiled, "f09:wood_fireproofing_preparation_dust_extraction")).toBe("5");
      expect(quantity(compiled, "f09:wood_fireproofing_preparation_manual_tool")).toBe("8");
      expect(quantity(compiled, "f09:wood_fireproofing_removed_loose_material")).toBe("18");
      expect(quantity(compiled, "f09:wood_fireproofing_preparation_abrasive")).toBe("6");
      expect(quantity(compiled, "f09:wood_fireproofing_preparation_masking")).toBe("120");
      expect(quantity(compiled, "f09:wood_fireproofing_surface_profile_measurements")).toBe("10");
      expect(quantity(compiled, "f09:wood_fireproofing_preparation_waste_containers")).toBe("8");
      expect(quantity(compiled, "f09:wood_fireproofing_preparation_waste_transport")).toBe("1");
    },
  );

  test.each(VARIANT_KEYS)("%s applies several visible profile edits together", async (key) => {
    const compiled = await compileWoodFireproofingSurfacePreparationVariantR1(key, {
      ...WOOD_FIREPROOFING_SURFACE_PREPARATION_ACCEPTANCE_INPUT,
      preparation_area_m2: 50,
      labor_rate_man_hour_m2: 0.3,
      abrasive_rate_kg_m2: 0.1,
      masking_area_factor: 1.5,
      profile_measurement_area_per_count_m2: 8,
      waste_container_capacity_kg: 5,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(quantity(compiled, "f09:wood_fireproofing_preparation_labor")).toBe("15");
    expect(quantity(compiled, "f09:wood_fireproofing_preparation_abrasive")).toBe("5");
    expect(quantity(compiled, "f09:wood_fireproofing_preparation_masking")).toBe("75");
    expect(quantity(compiled, "f09:wood_fireproofing_surface_profile_measurements")).toBe("7");
    expect(quantity(compiled, "f09:wood_fireproofing_preparation_waste_containers")).toBe("3");
  });

  test("keeps every preliminary value visible, editable and explicitly non-normative", () => {
    expect(Object.keys(WOOD_FIREPROOFING_SURFACE_PREPARATION_PRELIMINARY_PROFILE)).toHaveLength(17);
    for (const parameter of WOOD_FIREPROOFING_SURFACE_PREPARATION_PARAMETERS) {
      if (!Object.prototype.hasOwnProperty.call(
        WOOD_FIREPROOFING_SURFACE_PREPARATION_PRELIMINARY_PROFILE,
        parameter.parameter_id,
      )) continue;
      expect(parameter.default_value).toBeNull();
      expect(parameter.truth_metadata).toMatchObject({
        visibility_role: "USER_INPUT",
        preliminary_compilation_allowed: true,
        hidden_default_forbidden: false,
      });
      if (parameter.truth_metadata.input_origin_class === "PROFESSIONAL_ASSUMPTION") {
        expect(parameter.truth_metadata.runtime_profile_classification)
          .toBe("EXPLICIT_PRELIMINARY_ASSUMPTION");
      }
    }
  });

  test("keeps preparation separate from coating, repair and hidden classification factors", async () => {
    const rows = JSON.stringify(WOOD_FIREPROOFING_SURFACE_PREPARATION_RESOURCES.map((row) => ({
      row_id: row.row_id,
      title_ru: row.title_ru,
      category: row.category,
    })));
    expect(rows).toMatch(/подготов|абразив|укрывн|пыле|отход/iu);
    expect(rows).not.toMatch(/paint_evrika|coating_application|injection|sealing|strengthening/iu);
    expect(JSON.stringify(WOOD_FIREPROOFING_SURFACE_PREPARATION_FORMULAS))
      .not.toMatch(/classification|small_area_factor|golden_rate|normFactor/iu);
    expect(() => resolveWoodFireproofingSurfacePreparationVariant("large_area"))
      .toThrow("WOOD_FIREPROOFING_SURFACE_PREPARATION_VARIANT_UNSUPPORTED");
    await expect(compileWoodFireproofingSurfacePreparationVariantR1(
      "small_area",
      { ...WOOD_FIREPROOFING_SURFACE_PREPARATION_SHORT_INPUT },
      { catalogId: WOOD_FIREPROOFING_SURFACE_PREPARATION_VARIANTS.standard.catalogId },
    )).rejects.toThrow("WOOD_FIREPROOFING_SURFACE_PREPARATION_CATALOG_UNSUPPORTED");
  });
});
