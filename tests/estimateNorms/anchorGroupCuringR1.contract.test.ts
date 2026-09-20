import { buildCanonicalBaselinePlan } from "../../src/features/consumerRepair/consumerCanonicalBaselineCompile";
import type { CanonicalEstimateCatalogItem } from "../../src/lib/estimate/backendPlatform/contracts";
import {
  anchorGroupCuringPromptDetailsR1,
  extractConcretePlacementCanonicalParametersR1,
} from "../../src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1";
import {
  ANCHOR_GROUP_CURING_FORMULAS,
  ANCHOR_GROUP_CURING_PARAMETERS,
  ANCHOR_GROUP_CURING_RESOURCES,
  ANCHOR_GROUP_CURING_SOURCE_ID,
  ANCHOR_GROUP_CURING_TARGETS,
  anchorGroupCuringAcceptanceInputR1,
  compileAnchorGroupCuringR1,
} from "../../src/lib/estimate/v4/anchorGroupCuringR1";
import { CONCRETE_SLAB_CURING_FORMULAS } from "../../src/lib/estimate/v4/concreteSlabCuringR1";

function catalog(target: (typeof ANCHOR_GROUP_CURING_TARGETS)[number]):
CanonicalEstimateCatalogItem {
  return {
    catalogId: target.catalogId,
    releaseId: "prepared-anchor-group-curing-test",
    namespace: "global",
    domain: "concrete",
    workKey: target.catalogId,
    titleRu: target.titleRu,
    definitionVersion: 4,
    applicability: {},
    professionalMetadata: {},
    parameterSchema: ANCHOR_GROUP_CURING_PARAMETERS.map((parameter) => ({
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

describe("anchor-group concrete curing canonical family", () => {
  it("compiles all six exact curing identities through the shared core", async () => {
    for (const target of ANCHOR_GROUP_CURING_TARGETS) {
      const input = anchorGroupCuringAcceptanceInputR1(target.contextKey);
      const compiled = await compileAnchorGroupCuringR1(
        { ...input },
        { catalogId: target.catalogId },
      );
      expect(compiled.preliminaryNeeds).toEqual([]);
      expect(compiled.totals.includedRowCount).toBeGreaterThanOrEqual(3);
      expect(compiled.totals.includedRowCount).toBeLessThanOrEqual(6);
      expect(compiled.totals.unpricedRowCount).toBe(compiled.totals.includedRowCount);
      expect(compiled.rows.some((row) => row.row_id === "material:concrete:ready-mix"))
        .toBe(false);
      expect(compiled.rows.some((row) => row.row_id.includes("formwork"))).toBe(false);
      expect(compiled.rows.some((row) => row.row_id.includes("reinforcement"))).toBe(false);
      expect(compiled.rows.some((row) => row.row_id === "work:concrete:anchor-group-curing"))
        .toBe(true);
    }
  });

  it("reuses the accepted ACI curing graph instead of introducing another calculator", () => {
    expect(ANCHOR_GROUP_CURING_FORMULAS).toBe(CONCRETE_SLAB_CURING_FORMULAS);
    expect(ANCHOR_GROUP_CURING_PARAMETERS).toHaveLength(24);
    expect(ANCHOR_GROUP_CURING_FORMULAS).toHaveLength(9);
    expect(ANCHOR_GROUP_CURING_RESOURCES).toHaveLength(8);
    expect(JSON.stringify({
      parameters: ANCHOR_GROUP_CURING_PARAMETERS,
      resources: ANCHOR_GROUP_CURING_RESOURCES,
    })).toContain(ANCHOR_GROUP_CURING_SOURCE_ID);
  });

  it("allows unclear documentary references to remain blank", async () => {
    const target = ANCHOR_GROUP_CURING_TARGETS[0];
    const input = { ...anchorGroupCuringAcceptanceInputR1(target.contextKey) };
    for (const parameterId of [
      "concrete_mix_reference",
      "curing_location",
      "curing_method_statement_reference",
      "curing_water_source_reference",
      "wet_covering_material_designation",
      "application_equipment_designation",
      "quality_plan_reference",
      "mobilization_scope_reference",
    ]) delete input[parameterId];
    const compiled = await compileAnchorGroupCuringR1(input, { catalogId: target.catalogId });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows.some((row) => row.row_id === "work:concrete:anchor-group-curing"))
      .toBe(true);
  });

  it("returns an editable calculation need when a selected-method quantity is missing", async () => {
    const target = ANCHOR_GROUP_CURING_TARGETS[0];
    const input = { ...anchorGroupCuringAcceptanceInputR1(target.contextKey) };
    delete input.wet_covering_area_m2;
    const compiled = await compileAnchorGroupCuringR1(input, { catalogId: target.catalogId });
    expect(compiled.preliminaryNeeds).toEqual(expect.arrayContaining([
      expect.objectContaining({ missing_parameter_ids: ["wet_covering_area_m2"] }),
    ]));
    expect(compiled.rows.some((row) => row.row_id === "material:concrete:wet-curing-covering"))
      .toBe(false);
  });

  it("round-trips values through the ordinary consumer parameter screen", () => {
    const target = ANCHOR_GROUP_CURING_TARGETS[3];
    const input = anchorGroupCuringAcceptanceInputR1(target.contextKey);
    const prompt = [target.titleRu, ...anchorGroupCuringPromptDetailsR1(input)].join("\n");
    expect(extractConcretePlacementCanonicalParametersR1({
      catalogId: target.catalogId,
      text: prompt,
    })).toEqual(input);
    const plan = buildCanonicalBaselinePlan({ catalog: catalog(target), prompt });
    expect(plan.primaryMeasureParameterId).toBe("cured_concrete_volume_m3");
    expect(plan.parameters).toEqual(input);
  });

  it("does not claim neighboring installation or concrete-placement identities", async () => {
    const input = anchorGroupCuringAcceptanceInputR1("standard");
    await expect(compileAnchorGroupCuringR1(input, {
      catalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_anchor_standard",
    })).rejects.toThrow("ANCHOR_GROUP_CURING_CATALOG_UNSUPPORTED");
  });
});
