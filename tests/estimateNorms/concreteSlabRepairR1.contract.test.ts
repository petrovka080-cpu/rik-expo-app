import { buildCanonicalBaselinePlan } from "../../src/features/consumerRepair/consumerCanonicalBaselineCompile";
import type { CanonicalEstimateCatalogItem } from "../../src/lib/estimate/backendPlatform/contracts";
import {
  concreteSlabRepairPromptDetailsR1,
  extractConcretePlacementCanonicalParametersR1,
} from "../../src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1";
import {
  CONCRETE_SLAB_REPAIR_CODE_PDF_SHA256,
  CONCRETE_SLAB_REPAIR_FORMULAS,
  CONCRETE_SLAB_REPAIR_GUIDE_PDF_SHA256,
  CONCRETE_SLAB_REPAIR_GUIDE_SOURCE_ID,
  CONCRETE_SLAB_REPAIR_PARAMETERS,
  CONCRETE_SLAB_REPAIR_RESOURCES,
  CONCRETE_SLAB_REPAIR_SOURCE_ID,
  CONCRETE_SLAB_REPAIR_TARGETS,
  compileConcreteSlabRepairR1,
  concreteSlabRepairAcceptanceInputR1,
} from "../../src/lib/estimate/v4/concreteSlabRepairR1";

describe("concrete slab repair canonical family", () => {
  it("compiles seven distinct project repair schedules through the shared core", async () => {
    const fixtures = new Set<string>();
    for (const target of CONCRETE_SLAB_REPAIR_TARGETS) {
      const input = concreteSlabRepairAcceptanceInputR1(target.contextKey);
      const compiled = await compileConcreteSlabRepairR1(
        { ...input },
        { catalogId: target.catalogId },
      );
      expect(compiled.preliminaryNeeds).toEqual([]);
      expect(compiled.revisionProjection.catalogId).toBe(target.catalogId);
      expect(compiled.totals.includedRowCount).toBeGreaterThanOrEqual(7);
      expect(compiled.totals.includedRowCount).toBeLessThanOrEqual(16);
      expect(compiled.totals.unpricedRowCount).toBe(compiled.totals.includedRowCount);
      expect(compiled.rows.some((row) => row.row_id === "material:concrete:ready-mix")).toBe(false);
      expect(compiled.rows.some((row) => row.row_id.includes("formwork"))).toBe(false);
      fixtures.add(JSON.stringify(input));
    }
    expect(fixtures.size).toBe(7);
  });

  it("includes only project-selected materials, equipment, testing and waste flows", async () => {
    for (const target of CONCRETE_SLAB_REPAIR_TARGETS) {
      const input = concreteSlabRepairAcceptanceInputR1(target.contextKey);
      const compiled = await compileConcreteSlabRepairR1(
        { ...input },
        { catalogId: target.catalogId },
      );
      const rowIds = new Set(compiled.rows.map((row) => row.row_id));
      expect(rowIds.has("material:concrete:slab-repair-bonding-agent"))
        .toBe(input.bonding_agent_required);
      expect(rowIds.has("material:concrete:slab-repair-rebar-treatment"))
        .toBe(input.reinforcement_treatment_required);
      expect(rowIds.has("material:concrete:slab-repair-curing"))
        .toBe(input.curing_material_required);
      expect(rowIds.has("equipment:concrete:slab-repair-removal"))
        .toBe(input.removal_equipment_required);
      expect(rowIds.has("equipment:concrete:slab-repair-mixing"))
        .toBe(input.mixing_equipment_required);
      expect(rowIds.has("equipment:concrete:slab-repair-dust-control"))
        .toBe(input.dust_control_equipment_required);
      expect(rowIds.has("service:concrete:slab-repair-testing"))
        .toBe(input.material_testing_required);
      expect(rowIds.has("service:concrete:slab-repair-waste-disposal"))
        .toBe(input.waste_disposal_required);
      expect(rowIds.has("delivery:concrete:slab-repair-waste"))
        .toBe(input.waste_disposal_required);
    }
  });

  it("recalculates direct project quantities without applying a hidden rate", async () => {
    const target = CONCRETE_SLAB_REPAIR_TARGETS.find(
      (candidate) => candidate.contextKey === "wet_zone",
    )!;
    const input = concreteSlabRepairAcceptanceInputR1(target.contextKey);
    const compiled = await compileConcreteSlabRepairR1({
      ...input,
      repair_material_quantity_kg: 4_500,
      reinforcement_treatment_quantity_kg: 17,
      removal_equipment_machine_h: 19,
      material_test_report_count: 5,
      waste_transport_trip_count: 4,
    }, { catalogId: target.catalogId });
    const quantity = (rowId: string) => Number(compiled.rows.find((row) => row.row_id === rowId)?.quantity);
    expect(quantity("material:concrete:slab-repair-material")).toBe(4_500);
    expect(quantity("material:concrete:slab-repair-rebar-treatment")).toBe(17);
    expect(quantity("equipment:concrete:slab-repair-removal")).toBe(19);
    expect(quantity("service:concrete:slab-repair-testing")).toBe(5);
    expect(quantity("delivery:concrete:slab-repair-waste")).toBe(4);
  });

  it("fails closed for missing assessment data or a wrong conditional branch", async () => {
    const target = CONCRETE_SLAB_REPAIR_TARGETS.find(
      (candidate) => candidate.contextKey === "wet_zone",
    )!;
    const input = concreteSlabRepairAcceptanceInputR1(target.contextKey);
    const { approved_repair_design_reference: _missing, ...withoutDesign } = input;
    await expect(compileConcreteSlabRepairR1(
      withoutDesign,
      { catalogId: target.catalogId },
    )).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });

    const smallTarget = CONCRETE_SLAB_REPAIR_TARGETS.find(
      (candidate) => candidate.contextKey === "small_area",
    )!;
    const smallInput = concreteSlabRepairAcceptanceInputR1(smallTarget.contextKey);
    await expect(compileConcreteSlabRepairR1({
      ...smallInput,
      bonding_agent_quantity_kg: 3,
    }, { catalogId: smallTarget.catalogId })).rejects.toMatchObject({
      code: "PARAMETER_VALIDATION_FAILED",
    });
  });

  it("pins both ACI sources and rejects legacy fake factors", () => {
    const serialized = JSON.stringify({
      parameters: CONCRETE_SLAB_REPAIR_PARAMETERS,
      formulas: CONCRETE_SLAB_REPAIR_FORMULAS,
      resources: CONCRETE_SLAB_REPAIR_RESOURCES,
    });
    expect(serialized).toContain(CONCRETE_SLAB_REPAIR_SOURCE_ID);
    expect(serialized).toContain(CONCRETE_SLAB_REPAIR_GUIDE_SOURCE_ID);
    expect(serialized).toContain(CONCRETE_SLAB_REPAIR_CODE_PDF_SHA256);
    expect(serialized).toContain(CONCRETE_SLAB_REPAIR_GUIDE_PDF_SHA256);
    expect(serialized).toContain("APPROVED_REPAIR_DESIGN_AND_DIRECT_PROJECT_SCHEDULE");
    expect(serialized).not.toContain("src_professional_norm_pack_concrete_ready_mix_m3_m3_placed_v1");
    expect(serialized).not.toContain("src_professional_norm_pack_formwork_contact_area_m2_m3_concrete_element_v1");
    expect(serialized).not.toContain("src_professional_norm_pack_reinforcement_rebar_kg_m3_concrete_element_v1");
    expect(CONCRETE_SLAB_REPAIR_PARAMETERS).toHaveLength(40);
    expect(CONCRETE_SLAB_REPAIR_FORMULAS).toHaveLength(18);
    expect(CONCRETE_SLAB_REPAIR_RESOURCES).toHaveLength(16);
  });

  it("round-trips the complete conditional schedule through the ordinary consumer binding", () => {
    const target = CONCRETE_SLAB_REPAIR_TARGETS.find(
      (candidate) => candidate.contextKey === "wet_zone",
    )!;
    const fixture = concreteSlabRepairAcceptanceInputR1(target.contextKey);
    const prompt = [target.titleRu, ...concreteSlabRepairPromptDetailsR1(fixture)].join("\n");
    expect(extractConcretePlacementCanonicalParametersR1({
      catalogId: target.catalogId,
      text: prompt,
    })).toEqual(fixture);
    const catalog: CanonicalEstimateCatalogItem = {
      catalogId: target.catalogId,
      releaseId: "prepared-concrete-slab-repair-test",
      namespace: "global",
      domain: "concrete",
      workKey: target.catalogId,
      titleRu: target.titleRu,
      definitionVersion: 4,
      applicability: {},
      professionalMetadata: {},
      parameterSchema: CONCRETE_SLAB_REPAIR_PARAMETERS.map((parameter) => ({
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
    expect(plan.primaryMeasureParameterId).toBe("repair_scope_volume_m3");
    expect(plan.parameters).toEqual(fixture);
  });
});
