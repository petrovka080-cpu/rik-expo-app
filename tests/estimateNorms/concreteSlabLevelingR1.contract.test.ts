import { buildCanonicalBaselinePlan } from "../../src/features/consumerRepair/consumerCanonicalBaselineCompile";
import type { CanonicalEstimateCatalogItem } from "../../src/lib/estimate/backendPlatform/contracts";
import {
  concreteSlabLevelingPromptDetailsR1,
  extractConcretePlacementCanonicalParametersR1,
} from "../../src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1";
import {
  CONCRETE_SLAB_LEVELING_FORMULAS,
  CONCRETE_SLAB_LEVELING_PARAMETERS,
  CONCRETE_SLAB_LEVELING_RESOURCES,
  CONCRETE_SLAB_LEVELING_SOURCE_ID,
  CONCRETE_SLAB_LEVELING_TARGETS,
  compileConcreteSlabLevelingR1,
  concreteSlabLevelingAcceptanceInputR1,
} from "../../src/lib/estimate/v4/concreteSlabLevelingR1";

describe("concrete slab leveling canonical family", () => {
  it("compiles all seven catalog identities through the shared canonical core", async () => {
    const fixtures = new Set<string>();
    for (const target of CONCRETE_SLAB_LEVELING_TARGETS) {
      const input = concreteSlabLevelingAcceptanceInputR1(target.contextKey);
      const compiled = await compileConcreteSlabLevelingR1(
        { ...input },
        { catalogId: target.catalogId },
      );
      expect(compiled.preliminaryNeeds).toEqual([]);
      expect(compiled.totals.includedRowCount).toBeGreaterThanOrEqual(2);
      expect(compiled.totals.includedRowCount).toBeLessThanOrEqual(6);
      expect(compiled.totals.unpricedRowCount).toBe(compiled.totals.includedRowCount);
      expect(compiled.rows.some((row) => row.row_id === "material:concrete:ready-mix"))
        .toBe(false);
      expect(compiled.rows.some((row) => row.row_id.includes("formwork"))).toBe(false);
      expect(compiled.rows.some((row) => row.row_id.includes("reinforcement"))).toBe(false);
      expect(compiled.rows.some((row) => row.row_id.includes("curing"))).toBe(false);
      fixtures.add(JSON.stringify(input));
    }
    expect(fixtures.size).toBe(7);
  });

  it("includes only the guide, equipment and mobilization rows selected by the project", async () => {
    for (const target of CONCRETE_SLAB_LEVELING_TARGETS) {
      const input = concreteSlabLevelingAcceptanceInputR1(target.contextKey);
      const compiled = await compileConcreteSlabLevelingR1(
        { ...input },
        { catalogId: target.catalogId },
      );
      const rowIds = new Set(compiled.rows.map((row) => row.row_id));
      expect(rowIds.has("material:concrete:screed-guides"))
        .toBe(input.screed_guides_required);
      expect(rowIds.has("equipment:concrete:slab-leveling"))
        .toBe(input.separate_leveling_equipment_required);
      expect(rowIds.has("delivery:concrete:slab-leveling-equipment-mobilization"))
        .toBe(input.equipment_mobilization_pricing_mode === "SEPARATE");
    }
  });

  it("recalculates only direct project quantities", async () => {
    const target = CONCRETE_SLAB_LEVELING_TARGETS.find(
      (candidate) => candidate.contextKey === "wet_zone",
    )!;
    const input = concreteSlabLevelingAcceptanceInputR1(target.contextKey);
    const compiled = await compileConcreteSlabLevelingR1({
      ...input,
      leveling_worker_h: 31,
      screed_guide_length_m: 62,
      leveling_equipment_machine_h: 9,
      equipment_mobilization_trip_count: 3,
    }, { catalogId: target.catalogId });
    const quantity = (rowId: string) => Number(
      compiled.rows.find((row) => row.row_id === rowId)?.quantity,
    );
    expect(quantity("work:concrete:slab-leveling")).toBe(31);
    expect(quantity("material:concrete:screed-guides")).toBe(62);
    expect(quantity("equipment:concrete:slab-leveling")).toBe(9);
    expect(quantity("delivery:concrete:slab-leveling-equipment-mobilization")).toBe(3);
  });

  it("fails closed for missing or wrong-branch project inputs", async () => {
    const target = CONCRETE_SLAB_LEVELING_TARGETS.find(
      (candidate) => candidate.contextKey === "wet_zone",
    )!;
    const input = concreteSlabLevelingAcceptanceInputR1(target.contextKey);
    const { screed_guide_length_m: _missing, ...withoutGuideQuantity } = input;
    await expect(compileConcreteSlabLevelingR1(
      withoutGuideQuantity,
      { catalogId: target.catalogId },
    )).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });

    const smallTarget = CONCRETE_SLAB_LEVELING_TARGETS.find(
      (candidate) => candidate.contextKey === "small_area",
    )!;
    const smallInput = concreteSlabLevelingAcceptanceInputR1(smallTarget.contextKey);
    await expect(compileConcreteSlabLevelingR1({
      ...smallInput,
      leveling_equipment_machine_h: 4,
    }, { catalogId: smallTarget.catalogId })).rejects.toMatchObject({
      code: "PARAMETER_VALIDATION_FAILED",
    });
  });

  it("binds ACI 302 as applicability guidance and excludes legacy fake factors", () => {
    const serialized = JSON.stringify({
      parameters: CONCRETE_SLAB_LEVELING_PARAMETERS,
      formulas: CONCRETE_SLAB_LEVELING_FORMULAS,
      resources: CONCRETE_SLAB_LEVELING_RESOURCES,
    });
    expect(serialized).toContain(CONCRETE_SLAB_LEVELING_SOURCE_ID);
    expect(serialized).toContain("universal_consumption_claimed");
    expect(serialized).toContain("APPROVED_PROJECT_LEVELING_METHOD_AND_DIRECT_PROJECT_SCHEDULE");
    expect(serialized).not.toContain("src_professional_norm_pack_concrete_ready_mix_m3_m3_placed_v1");
    expect(serialized).not.toContain("src_professional_norm_pack_formwork_contact_area_m2_m3_concrete_element_v1");
    expect(serialized).not.toContain("src_professional_norm_pack_reinforcement_rebar_kg_m3_concrete_element_v1");
    expect(CONCRETE_SLAB_LEVELING_PARAMETERS).toHaveLength(20);
    expect(CONCRETE_SLAB_LEVELING_FORMULAS).toHaveLength(6);
    expect(CONCRETE_SLAB_LEVELING_RESOURCES).toHaveLength(5);
  });

  it("round-trips conditional inputs through the ordinary consumer binding", () => {
    const target = CONCRETE_SLAB_LEVELING_TARGETS.find(
      (candidate) => candidate.contextKey === "wet_zone",
    )!;
    const fixture = concreteSlabLevelingAcceptanceInputR1(target.contextKey);
    const prompt = [target.titleRu, ...concreteSlabLevelingPromptDetailsR1(fixture)].join("\n");
    expect(extractConcretePlacementCanonicalParametersR1({
      catalogId: target.catalogId,
      text: prompt,
    })).toEqual(fixture);
    const catalog: CanonicalEstimateCatalogItem = {
      catalogId: target.catalogId,
      releaseId: "prepared-concrete-slab-leveling-test",
      namespace: "global",
      domain: "concrete",
      workKey: target.catalogId,
      titleRu: target.titleRu,
      definitionVersion: 4,
      applicability: {},
      professionalMetadata: {},
      parameterSchema: CONCRETE_SLAB_LEVELING_PARAMETERS.map((parameter) => ({
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
    const plan = buildCanonicalBaselinePlan({ catalog, prompt });
    expect(plan.primaryMeasureParameterId).toBe("leveled_concrete_volume_m3");
    expect(plan.parameters).toEqual(fixture);
  });
});
