import {
  beltVibrationPromptDetailsR1,
  extractConcretePlacementCanonicalParametersR1,
} from "../../src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1";
import {
  BELT_VIBRATION_FORMULAS, BELT_VIBRATION_PARAMETERS, BELT_VIBRATION_RESOURCES,
  BELT_VIBRATION_TARGETS, beltVibrationAcceptanceInputR1, compileBeltVibrationR1,
} from "../../src/lib/estimate/v4/beltVibrationR1";
import { CONCRETE_SLAB_VIBRATION_FORMULAS } from "../../src/lib/estimate/v4/concreteSlabVibrationR1";

describe("monolithic-belt vibration canonical family", () => {
  it("compiles all seven exact identities through the shared core", async () => {
    for (const target of BELT_VIBRATION_TARGETS) {
      const input = beltVibrationAcceptanceInputR1(target.contextKey);
      const compiled = await compileBeltVibrationR1(input, { catalogId: target.catalogId });
      expect(compiled.preliminaryNeeds).toEqual([]);
      expect(compiled.totals.unpricedRowCount).toBe(compiled.totals.includedRowCount);
      expect(compiled.rows.some((row) => row.row_id === "work:concrete:belt-vibration")).toBe(true);
      expect(compiled.rows.some((row) => row.row_id === "material:concrete:ready-mix")).toBe(false);
      expect(compiled.rows.some((row) => row.row_id.includes("formwork"))).toBe(false);
    }
  });

  it("reuses the accepted ACI vibration graph", () => {
    expect(BELT_VIBRATION_FORMULAS).toBe(CONCRETE_SLAB_VIBRATION_FORMULAS);
    expect(BELT_VIBRATION_PARAMETERS).toHaveLength(13);
    expect(BELT_VIBRATION_RESOURCES).toHaveLength(4);
  });

  it("allows documentary references to remain blank but exposes missing hours", async () => {
    const target = BELT_VIBRATION_TARGETS[0];
    const input = { ...beltVibrationAcceptanceInputR1(target.contextKey) };
    for (const id of ["concrete_mix_reference", "placement_location", "method_statement_reference", "equipment_schedule_reference", "quality_plan_reference", "mobilization_scope_reference"]) delete input[id];
    delete input.vibration_worker_h;
    const compiled = await compileBeltVibrationR1(input, { catalogId: target.catalogId });
    expect(compiled.preliminaryNeeds).toEqual(expect.arrayContaining([
      expect.objectContaining({ missing_parameter_ids: ["vibration_worker_h"] }),
    ]));
  });

  it("round-trips values through the shared screen and rejects neighbors", async () => {
    const target = BELT_VIBRATION_TARGETS[2];
    const input = beltVibrationAcceptanceInputR1(target.contextKey);
    const prompt = [target.titleRu, ...beltVibrationPromptDetailsR1(input)].join("\n");
    expect(extractConcretePlacementCanonicalParametersR1({ catalogId: target.catalogId, text: prompt })).toEqual(input);
    await expect(compileBeltVibrationR1(input, {
      catalogId: "canonical-work:base:concrete_foundation_interior_belt_level_standard",
    })).rejects.toThrow("BELT_VIBRATION_CATALOG_UNSUPPORTED");
  });
});
