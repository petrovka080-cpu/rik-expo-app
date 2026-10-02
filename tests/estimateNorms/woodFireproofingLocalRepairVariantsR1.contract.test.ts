import {
  WOOD_FIREPROOFING_LOCAL_REPAIR_ACCEPTANCE_INPUT,
  WOOD_FIREPROOFING_LOCAL_REPAIR_PARAMETERS,
  WOOD_FIREPROOFING_LOCAL_REPAIR_PRELIMINARY_PROFILE,
  WOOD_FIREPROOFING_LOCAL_REPAIR_RESOURCES,
  WOOD_FIREPROOFING_LOCAL_REPAIR_RUNTIME_CLASSIFICATION,
  WOOD_FIREPROOFING_LOCAL_REPAIR_SHORT_INPUT,
  WOOD_FIREPROOFING_LOCAL_REPAIR_VARIANTS,
  compileWoodFireproofingLocalRepairVariantR1,
  woodFireproofingLocalRepairCompletenessMap,
  type WoodFireproofingLocalRepairVariantKey,
} from "../../src/lib/estimate/v4/woodFireproofingLocalRepairVariantsR1";

function quantity(rows: readonly { row_id: string; quantity: string }[], rowId: string): string {
  const row = rows.find((entry) => entry.row_id === rowId);
  if (!row) throw new Error(`ROW_MISSING:${rowId}`);
  return row.quantity;
}

const variants = Object.keys(WOOD_FIREPROOFING_LOCAL_REPAIR_VARIANTS) as
  WoodFireproofingLocalRepairVariantKey[];

describe("S27.7 F09 wood fireproofing local repair variants", () => {
  it("keeps three distinct searchable identities without a hidden suffix factor", () => {
    expect(variants).toEqual(["small_area", "standard", "large_area"]);
    expect(new Set(variants.map((key) => WOOD_FIREPROOFING_LOCAL_REPAIR_VARIANTS[key].catalogId)).size)
      .toBe(3);
    for (const variantKey of variants) {
      expect(woodFireproofingLocalRepairCompletenessMap(variantKey).catalogVariant)
        .toContain("NO_HIDDEN_QUANTITY_FACTOR");
    }
  });

  it.each(variants)("builds an automatic complete first estimate for %s", async (variantKey) => {
    const compiled = await compileWoodFireproofingLocalRepairVariantR1(
      variantKey,
      WOOD_FIREPROOFING_LOCAL_REPAIR_SHORT_INPUT,
    );
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(14);
    expect(quantity(compiled.rows, "f09:wood_fireproofing_local_repair_area")).toBe("100");
    expect(quantity(compiled.rows, "f09:wood_fireproofing_local_repair_labor")).toBe("65");
    expect(quantity(compiled.rows, "f09:wood_fireproofing_local_repair_compound")).toBe("45");
    expect(quantity(compiled.rows, "f09:wood_fireproofing_local_repair_primer")).toBe("12");
    expect(quantity(compiled.rows, "f09:wood_fireproofing_local_repair_reinforcement")).toBe("110");
    expect(quantity(compiled.rows, "f09:wood_fireproofing_local_repair_waste_container")).toBe("2");
    expect(quantity(compiled.rows, "f09:wood_fireproofing_local_repair_waste_transport")).toBe("1");
  });

  it("applies several edits once and recalculates all dependent quantities", async () => {
    const compiled = await compileWoodFireproofingLocalRepairVariantR1("standard", {
      ...WOOD_FIREPROOFING_LOCAL_REPAIR_ACCEPTANCE_INPUT,
      repair_area_m2: 50,
      repair_compound_rate_kg_m2: 0.6,
      primer_rate_l_m2: 0.15,
      reinforcement_area_factor: 1.2,
      labor_rate_man_hour_m2: 0.8,
      inspection_area_per_count_m2: 8,
      waste_mass_rate_kg_m2: 0.12,
      waste_container_capacity_kg: 4,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(14);
    expect(quantity(compiled.rows, "f09:wood_fireproofing_local_repair_labor")).toBe("40");
    expect(quantity(compiled.rows, "f09:wood_fireproofing_local_repair_compound")).toBe("30");
    expect(quantity(compiled.rows, "f09:wood_fireproofing_local_repair_primer")).toBe("7.5");
    expect(quantity(compiled.rows, "f09:wood_fireproofing_local_repair_reinforcement")).toBe("60");
    expect(quantity(compiled.rows, "f09:wood_fireproofing_local_repair_inspection")).toBe("7");
    expect(quantity(compiled.rows, "f09:wood_fireproofing_local_repair_waste_container")).toBe("2");
  });

  it("keeps every non-scope value visible, editable and explicitly preliminary", () => {
    const profileIds = Object.keys(WOOD_FIREPROOFING_LOCAL_REPAIR_PRELIMINARY_PROFILE);
    expect(profileIds).toHaveLength(20);
    expect(Object.keys(WOOD_FIREPROOFING_LOCAL_REPAIR_RUNTIME_CLASSIFICATION)).toEqual(profileIds);
    expect(Object.values(WOOD_FIREPROOFING_LOCAL_REPAIR_RUNTIME_CLASSIFICATION))
      .toEqual(profileIds.map(() => "ASSUMPTION"));
    for (const parameterId of profileIds) {
      const parameter = WOOD_FIREPROOFING_LOCAL_REPAIR_PARAMETERS
        .find((entry) => entry.parameter_id === parameterId);
      expect(parameter?.truth_metadata.runtime_profile_value).toBe(true);
      expect(parameter?.truth_metadata.hidden_default_forbidden).toBe(false);
    }
  });

  it("has a complete named technology composition and no adjacent work", () => {
    expect(WOOD_FIREPROOFING_LOCAL_REPAIR_RESOURCES).toHaveLength(14);
    expect(new Set(WOOD_FIREPROOFING_LOCAL_REPAIR_RESOURCES.map((row) => row.row_id)).size)
      .toBe(14);
    const payload = JSON.stringify(WOOD_FIREPROOFING_LOCAL_REPAIR_RESOURCES.map((row) => ({
      row_id: row.row_id,
      title_ru: row.title_ru,
      category: row.category,
    })));
    expect(payload).not.toMatch(/injection|seal|strengthen|полное новое нанесение/iu);
  });
});
