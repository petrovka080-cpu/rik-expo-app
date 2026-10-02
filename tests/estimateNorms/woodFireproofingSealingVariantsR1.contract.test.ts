import {
  WOOD_FIREPROOFING_SEALING_ACCEPTANCE_INPUT,
  WOOD_FIREPROOFING_SEALING_PARAMETERS,
  WOOD_FIREPROOFING_SEALING_PRELIMINARY_PROFILE,
  WOOD_FIREPROOFING_SEALING_RESOURCES,
  WOOD_FIREPROOFING_SEALING_RUNTIME_CLASSIFICATION,
  WOOD_FIREPROOFING_SEALING_SHORT_INPUT,
  WOOD_FIREPROOFING_SEALING_VARIANTS,
  compileWoodFireproofingSealingVariantR1,
  woodFireproofingSealingCompletenessMap,
  type WoodFireproofingSealingVariantKey,
} from "../../src/lib/estimate/v4/woodFireproofingSealingVariantsR1";

function quantity(rows: readonly { row_id: string; quantity: string }[], rowId: string): string {
  const row = rows.find((entry) => entry.row_id === rowId);
  if (!row) throw new Error(`ROW_MISSING:${rowId}`);
  return row.quantity;
}
const variants = Object.keys(WOOD_FIREPROOFING_SEALING_VARIANTS) as WoodFireproofingSealingVariantKey[];

describe("S27.7 F09 wood fireproofing sealing variants", () => {
  it("keeps two identities without a hidden classification factor", () => {
    expect(variants).toEqual(["small_area", "standard"]);
    expect(new Set(variants.map((key) => WOOD_FIREPROOFING_SEALING_VARIANTS[key].catalogId)).size).toBe(2);
    for (const key of variants) expect(woodFireproofingSealingCompletenessMap(key).catalogVariant)
      .toContain("NO_HIDDEN_QUANTITY_FACTOR");
  });

  it.each(variants)("builds an automatic full first estimate for %s", async (key) => {
    const compiled = await compileWoodFireproofingSealingVariantR1(key, WOOD_FIREPROOFING_SEALING_SHORT_INPUT);
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(13);
    expect(quantity(compiled.rows, "f09:wood_fireproofing_sealing_labor")).toBe("45");
    expect(quantity(compiled.rows, "f09:wood_fireproofing_sealant")).toBe("25");
    expect(quantity(compiled.rows, "f09:wood_fireproofing_sealing_primer")).toBe("8");
    expect(quantity(compiled.rows, "f09:wood_fireproofing_sealing_backing_cord")).toBe("40");
    expect(quantity(compiled.rows, "f09:wood_fireproofing_sealing_masking_tape")).toBe("150");
    expect(quantity(compiled.rows, "f09:wood_fireproofing_sealing_waste_container")).toBe("1");
  });

  it("recalculates several edited assumptions together", async () => {
    const compiled = await compileWoodFireproofingSealingVariantR1("standard", {
      ...WOOD_FIREPROOFING_SEALING_ACCEPTANCE_INPUT,
      sealing_area_m2: 50,
      sealant_rate_kg_m2: 0.35,
      primer_rate_l_m2: 0.1,
      backing_cord_length_rate_m_m2: 0.6,
      labor_rate_man_hour_m2: 0.55,
      inspection_area_per_count_m2: 8,
      waste_mass_rate_kg_m2: 0.1,
      waste_container_capacity_kg: 4,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(13);
    expect(quantity(compiled.rows, "f09:wood_fireproofing_sealing_labor")).toBe("27.5");
    expect(quantity(compiled.rows, "f09:wood_fireproofing_sealant")).toBe("17.5");
    expect(quantity(compiled.rows, "f09:wood_fireproofing_sealing_primer")).toBe("5");
    expect(quantity(compiled.rows, "f09:wood_fireproofing_sealing_backing_cord")).toBe("30");
    expect(quantity(compiled.rows, "f09:wood_fireproofing_sealing_inspection")).toBe("7");
    expect(quantity(compiled.rows, "f09:wood_fireproofing_sealing_waste_container")).toBe("2");
  });

  it("exposes all profile values as editable assumptions", () => {
    const ids = Object.keys(WOOD_FIREPROOFING_SEALING_PRELIMINARY_PROFILE);
    expect(ids).toHaveLength(19);
    expect(Object.values(WOOD_FIREPROOFING_SEALING_RUNTIME_CLASSIFICATION))
      .toEqual(ids.map(() => "ASSUMPTION"));
    for (const id of ids) {
      const parameter = WOOD_FIREPROOFING_SEALING_PARAMETERS.find((entry) => entry.parameter_id === id);
      expect(parameter?.truth_metadata.runtime_profile_value).toBe(true);
      expect(parameter?.truth_metadata.hidden_default_forbidden).toBe(false);
    }
  });

  it("keeps a named sealing-only composition", () => {
    expect(WOOD_FIREPROOFING_SEALING_RESOURCES).toHaveLength(13);
    expect(new Set(WOOD_FIREPROOFING_SEALING_RESOURCES.map((row) => row.row_id)).size).toBe(13);
    expect(JSON.stringify(WOOD_FIREPROOFING_SEALING_RESOURCES.map((row) => row.title_ru)))
      .not.toMatch(/injection|инъект|усиление конструкции|ремонтный состав/iu);
  });
});
