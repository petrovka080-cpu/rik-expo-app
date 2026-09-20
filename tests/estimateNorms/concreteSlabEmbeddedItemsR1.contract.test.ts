import { buildCanonicalBaselinePlan } from "../../src/features/consumerRepair/consumerCanonicalBaselineCompile";
import type { CanonicalEstimateCatalogItem } from "../../src/lib/estimate/backendPlatform/contracts";
import {
  concreteSlabEmbeddedItemsPromptDetailsR1,
  extractConcretePlacementCanonicalParametersR1,
} from "../../src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1";
import {
  CONCRETE_SLAB_EMBEDDED_ITEMS_FORMULAS,
  CONCRETE_SLAB_EMBEDDED_ITEMS_PARAMETERS,
  CONCRETE_SLAB_EMBEDDED_ITEMS_RESOURCES,
  CONCRETE_SLAB_EMBEDDED_ITEMS_SOURCE_ID,
  CONCRETE_SLAB_EMBEDDED_ITEMS_SOURCE_PDF_SHA256,
  CONCRETE_SLAB_EMBEDDED_ITEMS_TARGETS,
  CONCRETE_SLAB_EMBEDDED_ITEMS_TOLERANCE_PDF_SHA256,
  CONCRETE_SLAB_EMBEDDED_ITEMS_TOLERANCE_SOURCE_ID,
  compileConcreteSlabEmbeddedItemsR1,
  concreteSlabEmbeddedItemsAcceptanceInputR1,
} from "../../src/lib/estimate/v4/concreteSlabEmbeddedItemsR1";

describe("concrete slab embedded-items canonical family", () => {
  it("compiles six distinct project schedules through the shared core", async () => {
    const fixtures = new Set<string>();
    for (const target of CONCRETE_SLAB_EMBEDDED_ITEMS_TARGETS) {
      const input = concreteSlabEmbeddedItemsAcceptanceInputR1(target.contextKey);
      const compiled = await compileConcreteSlabEmbeddedItemsR1(
        { ...input },
        { catalogId: target.catalogId },
      );
      expect(compiled.preliminaryNeeds).toEqual([]);
      expect(compiled.revisionProjection.catalogId).toBe(target.catalogId);
      expect(compiled.totals.includedRowCount).toBeGreaterThanOrEqual(6);
      expect(compiled.totals.includedRowCount).toBeLessThanOrEqual(14);
      expect(compiled.totals.unpricedRowCount).toBe(compiled.totals.includedRowCount);
      expect(compiled.rows.some((row) => row.row_id === "material:concrete:ready-mix")).toBe(false);
      expect(compiled.rows.some((row) => row.row_id.includes("formwork"))).toBe(false);
      fixtures.add(JSON.stringify(input));
    }
    expect(fixtures.size).toBe(6);
  });

  it("includes only project-selected welding, supports, lifting, survey and coating", async () => {
    for (const target of CONCRETE_SLAB_EMBEDDED_ITEMS_TARGETS) {
      const input = concreteSlabEmbeddedItemsAcceptanceInputR1(target.contextKey);
      const compiled = await compileConcreteSlabEmbeddedItemsR1(
        { ...input },
        { catalogId: target.catalogId },
      );
      const rowIds = new Set(compiled.rows.map((row) => row.row_id));
      expect(rowIds.has("work:concrete:slab-embedded-items-welding"))
        .toBe(input.field_welding_required);
      expect(rowIds.has("material:concrete:slab-embedded-items-temporary-support"))
        .toBe(input.temporary_support_required);
      expect(rowIds.has("equipment:concrete:slab-embedded-items-lifting"))
        .toBe(input.lifting_equipment_required);
      expect(rowIds.has("service:concrete:slab-embedded-items-survey"))
        .toBe(input.survey_control_required);
      expect(rowIds.has("material:concrete:slab-embedded-items-coating"))
        .toBe(input.coating_touchup_required);
    }
  });

  it("recalculates direct project quantities without applying a hidden rate", async () => {
    const target = CONCRETE_SLAB_EMBEDDED_ITEMS_TARGETS.find(
      (candidate) => candidate.contextKey === "wet_zone",
    )!;
    const input = concreteSlabEmbeddedItemsAcceptanceInputR1(target.contextKey);
    const compiled = await compileConcreteSlabEmbeddedItemsR1({
      ...input,
      embedded_item_total_mass_kg: 590,
      welding_worker_h: 11,
      lifting_equipment_machine_h: 7,
      coating_touchup_quantity_kg: 8,
      embedded_items_delivery_trip_count: 3,
    }, { catalogId: target.catalogId });
    const quantity = (rowId: string) => Number(compiled.rows.find((row) => row.row_id === rowId)?.quantity);
    expect(quantity("material:concrete:slab-embedded-items")).toBe(590);
    expect(quantity("work:concrete:slab-embedded-items-welding")).toBe(11);
    expect(quantity("equipment:concrete:slab-embedded-items-lifting")).toBe(7);
    expect(quantity("material:concrete:slab-embedded-items-coating")).toBe(8);
    expect(quantity("delivery:concrete:slab-embedded-items")).toBe(3);
  });

  it("fails closed for missing drawings or a forbidden conditional value", async () => {
    const target = CONCRETE_SLAB_EMBEDDED_ITEMS_TARGETS.find(
      (candidate) => candidate.contextKey === "wet_zone",
    )!;
    const input = concreteSlabEmbeddedItemsAcceptanceInputR1(target.contextKey);
    const { approved_placement_drawing_reference: _missing, ...withoutDrawing } = input;
    await expect(compileConcreteSlabEmbeddedItemsR1(
      withoutDrawing,
      { catalogId: target.catalogId },
    )).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });

    const smallTarget = CONCRETE_SLAB_EMBEDDED_ITEMS_TARGETS.find(
      (candidate) => candidate.contextKey === "small_area",
    )!;
    const smallInput = concreteSlabEmbeddedItemsAcceptanceInputR1(smallTarget.contextKey);
    await expect(compileConcreteSlabEmbeddedItemsR1({
      ...smallInput,
      welding_consumable_quantity_kg: 1,
    }, { catalogId: smallTarget.catalogId })).rejects.toMatchObject({
      code: "PARAMETER_VALIDATION_FAILED",
    });
  });

  it("pins both ACI sources and rejects legacy fake factors", () => {
    const serialized = JSON.stringify({
      parameters: CONCRETE_SLAB_EMBEDDED_ITEMS_PARAMETERS,
      formulas: CONCRETE_SLAB_EMBEDDED_ITEMS_FORMULAS,
      resources: CONCRETE_SLAB_EMBEDDED_ITEMS_RESOURCES,
    });
    expect(serialized).toContain(CONCRETE_SLAB_EMBEDDED_ITEMS_SOURCE_ID);
    expect(serialized).toContain(CONCRETE_SLAB_EMBEDDED_ITEMS_TOLERANCE_SOURCE_ID);
    expect(serialized).toContain(CONCRETE_SLAB_EMBEDDED_ITEMS_SOURCE_PDF_SHA256);
    expect(serialized).toContain(CONCRETE_SLAB_EMBEDDED_ITEMS_TOLERANCE_PDF_SHA256);
    expect(serialized).toContain("APPROVED_EMBEDMENT_DRAWINGS_AND_DIRECT_PROJECT_SCHEDULE");
    expect(serialized).not.toContain("src_professional_norm_pack_concrete_ready_mix_m3_m3_placed_v1");
    expect(serialized).not.toContain("src_professional_norm_pack_formwork_contact_area_m2_m3_concrete_element_v1");
    expect(serialized).not.toContain("src_professional_norm_pack_reinforcement_rebar_kg_m3_concrete_element_v1");
    expect(CONCRETE_SLAB_EMBEDDED_ITEMS_PARAMETERS).toHaveLength(34);
    expect(CONCRETE_SLAB_EMBEDDED_ITEMS_FORMULAS).toHaveLength(15);
    expect(CONCRETE_SLAB_EMBEDDED_ITEMS_RESOURCES).toHaveLength(14);
  });

  it("round-trips the complete schedule through the ordinary consumer binding", () => {
    const target = CONCRETE_SLAB_EMBEDDED_ITEMS_TARGETS.find(
      (candidate) => candidate.contextKey === "wet_zone",
    )!;
    const fixture = concreteSlabEmbeddedItemsAcceptanceInputR1(target.contextKey);
    const prompt = [target.titleRu, ...concreteSlabEmbeddedItemsPromptDetailsR1(fixture)].join("\n");
    expect(extractConcretePlacementCanonicalParametersR1({
      catalogId: target.catalogId,
      text: prompt,
    })).toEqual(fixture);
    const catalog: CanonicalEstimateCatalogItem = {
      catalogId: target.catalogId,
      releaseId: "prepared-concrete-slab-embedded-items-test",
      namespace: "global",
      domain: "concrete",
      workKey: target.catalogId,
      titleRu: target.titleRu,
      definitionVersion: 4,
      applicability: {},
      professionalMetadata: {},
      parameterSchema: CONCRETE_SLAB_EMBEDDED_ITEMS_PARAMETERS.map((parameter) => ({
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
    expect(plan.primaryMeasureParameterId).toBe("embedded_item_count_piece");
    expect(plan.parameters).toEqual(fixture);
  });
});
