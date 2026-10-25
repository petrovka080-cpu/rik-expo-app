import {
  WOOD_FIREPROOFING_LAYER_STRENGTHENING_ACCEPTANCE_INPUT,
  WOOD_FIREPROOFING_LAYER_STRENGTHENING_PARAMETERS,
  WOOD_FIREPROOFING_LAYER_STRENGTHENING_PRELIMINARY_PROFILE,
  WOOD_FIREPROOFING_LAYER_STRENGTHENING_RESOURCES,
  WOOD_FIREPROOFING_LAYER_STRENGTHENING_RUNTIME_CLASSIFICATION,
  WOOD_FIREPROOFING_LAYER_STRENGTHENING_SHORT_INPUT,
  WOOD_FIREPROOFING_LAYER_STRENGTHENING_VARIANTS,
  compileWoodFireproofingLayerStrengtheningVariantR1,
  woodFireproofingLayerStrengtheningCompletenessMap,
  type WoodFireproofingLayerStrengtheningVariantKey,
} from "../../src/lib/estimate/v4/woodFireproofingLayerStrengtheningVariantsR1";

function quantity(rows: readonly { row_id: string; quantity: string }[], rowId: string): string {
  const row = rows.find((entry) => entry.row_id === rowId);
  if (!row) throw new Error(`ROW_MISSING:${rowId}`);
  return row.quantity;
}

const variants = Object.keys(WOOD_FIREPROOFING_LAYER_STRENGTHENING_VARIANTS) as
  WoodFireproofingLayerStrengtheningVariantKey[];

describe("S27.7 F09 wood fireproofing layer strengthening variants", () => {
  it("keeps two identities without a hidden classification factor", () => {
    expect(variants).toEqual([ "standard"]);
    expect(new Set(variants.map((key) =>
      WOOD_FIREPROOFING_LAYER_STRENGTHENING_VARIANTS[key].catalogId)).size).toBe(1);
    for (const key of variants) {
      expect(woodFireproofingLayerStrengtheningCompletenessMap(key).catalogVariant)
        .toContain("NO_HIDDEN_QUANTITY_FACTOR");
    }
  });

  it.each(variants)("builds an automatic full first estimate for %s", async (key) => {
    const compiled = await compileWoodFireproofingLayerStrengtheningVariantR1(
      key, WOOD_FIREPROOFING_LAYER_STRENGTHENING_SHORT_INPUT,
    );
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(15);
    expect(quantity(compiled.rows, "f09:wood_fireproofing_layer_strengthening_labor")).toBe("75");
    expect(quantity(compiled.rows, "f09:wood_fireproofing_layer_strengthening_compound")).toBe("55");
    expect(quantity(compiled.rows, "f09:wood_fireproofing_layer_strengthening_primer")).toBe("10");
    expect(quantity(compiled.rows, "f09:wood_fireproofing_layer_strengthening_mesh")).toBe("115");
    expect(quantity(compiled.rows, "f09:wood_fireproofing_layer_strengthening_mesh_fastener")).toBe("400");
    expect(quantity(compiled.rows, "f09:wood_fireproofing_layer_strengthening_waste_container")).toBe("2");
  });

  it("recalculates several edited assumptions together", async () => {
    const compiled = await compileWoodFireproofingLayerStrengtheningVariantR1("standard", {
      ...WOOD_FIREPROOFING_LAYER_STRENGTHENING_ACCEPTANCE_INPUT,
      strengthening_area_m2: 50,
      strengthening_compound_rate_kg_m2: 0.7,
      primer_rate_l_m2: 0.12,
      reinforcement_mesh_area_factor: 1.25,
      mesh_fastener_density_pcs_m2: 5,
      labor_rate_man_hour_m2: 0.9,
      inspection_area_per_count_m2: 8,
      waste_mass_rate_kg_m2: 0.16,
      waste_container_capacity_kg: 3,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(15);
    expect(quantity(compiled.rows, "f09:wood_fireproofing_layer_strengthening_labor")).toBe("45");
    expect(quantity(compiled.rows, "f09:wood_fireproofing_layer_strengthening_compound")).toBe("35");
    expect(quantity(compiled.rows, "f09:wood_fireproofing_layer_strengthening_primer")).toBe("6");
    expect(quantity(compiled.rows, "f09:wood_fireproofing_layer_strengthening_mesh")).toBe("62.5");
    expect(quantity(compiled.rows, "f09:wood_fireproofing_layer_strengthening_mesh_fastener")).toBe("250");
    expect(quantity(compiled.rows, "f09:wood_fireproofing_layer_strengthening_inspection")).toBe("7");
    expect(quantity(compiled.rows, "f09:wood_fireproofing_layer_strengthening_waste_container")).toBe("3");
  });

  it("exposes all profile values as editable assumptions", () => {
    const ids = Object.keys(WOOD_FIREPROOFING_LAYER_STRENGTHENING_PRELIMINARY_PROFILE);
    expect(ids).toHaveLength(22);
    expect(Object.values(WOOD_FIREPROOFING_LAYER_STRENGTHENING_RUNTIME_CLASSIFICATION))
      .toEqual(ids.map(() => "ASSUMPTION"));
    for (const id of ids) {
      const parameter = WOOD_FIREPROOFING_LAYER_STRENGTHENING_PARAMETERS.find(
        (entry) => entry.parameter_id === id,
      );
      expect(parameter?.truth_metadata.runtime_profile_value).toBe(true);
      expect(parameter?.truth_metadata.hidden_default_forbidden).toBe(false);
    }
  });

  it("keeps a named layer-only composition", () => {
    expect(WOOD_FIREPROOFING_LAYER_STRENGTHENING_RESOURCES).toHaveLength(15);
    expect(new Set(WOOD_FIREPROOFING_LAYER_STRENGTHENING_RESOURCES
      .map((row) => row.row_id)).size).toBe(15);
    expect(JSON.stringify(WOOD_FIREPROOFING_LAYER_STRENGTHENING_RESOURCES
      .map((row) => row.title_ru)))
      .not.toMatch(/инъект|герметизац|усиление деревянн|усиление конструкции/iu);
  });
});
