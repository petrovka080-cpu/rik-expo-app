import { buildCanonicalBaselinePlan } from "../../src/features/consumerRepair/consumerCanonicalBaselineCompile";
import type { CanonicalEstimateCatalogItem } from "../../src/lib/estimate/backendPlatform/contracts";
import {
  beltEmbeddedItemsPromptDetailsR1,
  extractConcretePlacementCanonicalParametersR1,
} from "../../src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1";
import {
  BELT_EMBEDDED_ITEMS_FORMULAS,
  BELT_EMBEDDED_ITEMS_PARAMETERS,
  BELT_EMBEDDED_ITEMS_RESOURCES,
  BELT_EMBEDDED_ITEMS_SOURCE_ID,
  BELT_EMBEDDED_ITEMS_TARGETS,
  beltEmbeddedItemsAcceptanceInputR1,
  compileBeltEmbeddedItemsR1,
} from "../../src/lib/estimate/v4/beltEmbeddedItemsR1";
import { CONCRETE_SLAB_EMBEDDED_ITEMS_FORMULAS } from "../../src/lib/estimate/v4/concreteSlabEmbeddedItemsR1";

function catalog(target: (typeof BELT_EMBEDDED_ITEMS_TARGETS)[number]):
CanonicalEstimateCatalogItem {
  return {
    catalogId: target.catalogId,
    releaseId: "prepared-belt-embedded-items-test",
    namespace: "global",
    domain: "concrete",
    workKey: target.catalogId,
    titleRu: target.titleRu,
    definitionVersion: 4,
    applicability: {},
    professionalMetadata: {},
    parameterSchema: BELT_EMBEDDED_ITEMS_PARAMETERS.map((parameter) => ({
      parameterId: parameter.parameter_id,
      ordinal: parameter.ordinal,
      valueType: parameter.value_type as CanonicalEstimateCatalogItem["parameterSchema"][number]["valueType"],
      unitId: parameter.unit_id,
      titleRu: parameter.title_ru,
      required: parameter.required,
      defaultValue: parameter.default_value,
      constraints: parameter.constraints_json ?? {},
      visibilityRole: "USER_INPUT",
    })),
  };
}

describe("belt embedded-items canonical family", () => {
  it("compiles all six exact catalog identities without unrelated concrete components", async () => {
    for (const target of BELT_EMBEDDED_ITEMS_TARGETS) {
      const input = beltEmbeddedItemsAcceptanceInputR1(target.contextKey);
      const compiled = await compileBeltEmbeddedItemsR1(
        { ...input },
        { catalogId: target.catalogId },
      );
      expect(compiled.preliminaryNeeds).toEqual([]);
      expect(compiled.totals.includedRowCount).toBeGreaterThanOrEqual(5);
      expect(compiled.totals.includedRowCount).toBeLessThanOrEqual(14);
      expect(compiled.totals.unpricedRowCount).toBe(compiled.totals.includedRowCount);
      expect(compiled.rows.some(
        (row) => row.row_id === "material:concrete:belt-embedded-items",
      )).toBe(true);
      expect(compiled.rows.some(
        (row) => row.row_id === "work:concrete:belt-embedded-items-positioning",
      )).toBe(true);
      expect(compiled.rows.some((row) => row.row_id === "material:concrete:ready-mix"))
        .toBe(false);
      expect(compiled.rows.some((row) => row.row_id.includes("formwork"))).toBe(false);
      expect(compiled.rows.some((row) => row.row_id === "material:reinforcement:rebar"))
        .toBe(false);
    }
  });

  it("reuses the accepted ACI 301/117 formulas and direct project schedules", () => {
    expect(BELT_EMBEDDED_ITEMS_FORMULAS).toBe(CONCRETE_SLAB_EMBEDDED_ITEMS_FORMULAS);
    expect(BELT_EMBEDDED_ITEMS_PARAMETERS).toHaveLength(34);
    expect(BELT_EMBEDDED_ITEMS_RESOURCES).toHaveLength(14);
    const serialized = JSON.stringify({
      parameters: BELT_EMBEDDED_ITEMS_PARAMETERS,
      resources: BELT_EMBEDDED_ITEMS_RESOURCES,
    });
    expect(serialized).toContain(BELT_EMBEDDED_ITEMS_SOURCE_ID);
    expect(serialized).toContain("APPROVED_EMBEDMENT_DRAWINGS_AND_DIRECT_PROJECT_SCHEDULE");
  });

  it("allows unclear documentary references and designations to stay blank", async () => {
    const target = BELT_EMBEDDED_ITEMS_TARGETS[1];
    const input = { ...beltEmbeddedItemsAcceptanceInputR1(target.contextKey) };
    for (const parameter of BELT_EMBEDDED_ITEMS_PARAMETERS) {
      if (parameter.value_type === "text") delete input[parameter.parameter_id];
    }
    const compiled = await compileBeltEmbeddedItemsR1(input, { catalogId: target.catalogId });
    expect(compiled.preliminaryNeeds).toEqual([]);
  });

  it("returns a parameter need instead of inventing a project quantity", async () => {
    const target = BELT_EMBEDDED_ITEMS_TARGETS[1];
    const input = { ...beltEmbeddedItemsAcceptanceInputR1(target.contextKey) };
    delete input.lifting_equipment_machine_h;
    const compiled = await compileBeltEmbeddedItemsR1(input, { catalogId: target.catalogId });
    expect(compiled.preliminaryNeeds).toEqual(expect.arrayContaining([
      expect.objectContaining({ missing_parameter_ids: ["lifting_equipment_machine_h"] }),
    ]));
    expect(compiled.rows.some(
      (row) => row.row_id === "equipment:concrete:belt-embedded-items-lifting",
    )).toBe(false);
  });

  it("round-trips through the ordinary shared parameter screen", () => {
    const target = BELT_EMBEDDED_ITEMS_TARGETS[4];
    const input = beltEmbeddedItemsAcceptanceInputR1(target.contextKey);
    const prompt = [target.titleRu, ...beltEmbeddedItemsPromptDetailsR1(input)].join("\n");
    expect(extractConcretePlacementCanonicalParametersR1({
      catalogId: target.catalogId,
      text: prompt,
    })).toEqual(input);
    const plan = buildCanonicalBaselinePlan({ catalog: catalog(target), prompt });
    expect(plan.primaryMeasureParameterId).toBe("embedded_item_count_piece");
    expect(plan.parameters).toEqual(input);
  });

  it("does not claim neighboring belt operations", async () => {
    await expect(compileBeltEmbeddedItemsR1(
      { ...beltEmbeddedItemsAcceptanceInputR1("standard") },
      { catalogId: "canonical-work:base:concrete_foundation_interior_belt_cure_standard" },
    )).rejects.toThrow("BELT_EMBEDDED_ITEMS_CATALOG_UNSUPPORTED");
  });
});
