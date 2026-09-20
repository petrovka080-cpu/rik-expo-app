import { buildCanonicalBaselinePlan } from "../../src/features/consumerRepair/consumerCanonicalBaselineCompile";
import type { CanonicalEstimateCatalogItem } from "../../src/lib/estimate/backendPlatform/contracts";
import {
  anchorGroupRepairPromptDetailsR1,
  extractConcretePlacementCanonicalParametersR1,
} from "../../src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1";
import {
  ANCHOR_GROUP_REPAIR_FORMULAS,
  ANCHOR_GROUP_REPAIR_PARAMETERS,
  ANCHOR_GROUP_REPAIR_RESOURCES,
  ANCHOR_GROUP_REPAIR_SOURCE_ID,
  ANCHOR_GROUP_REPAIR_TARGETS,
  anchorGroupRepairAcceptanceInputR1,
  compileAnchorGroupRepairR1,
} from "../../src/lib/estimate/v4/anchorGroupRepairR1";
import { CONCRETE_SLAB_REPAIR_FORMULAS } from "../../src/lib/estimate/v4/concreteSlabRepairR1";

function catalog(target: (typeof ANCHOR_GROUP_REPAIR_TARGETS)[number]):
CanonicalEstimateCatalogItem {
  return {
    catalogId: target.catalogId,
    releaseId: "prepared-anchor-group-repair-test",
    namespace: "global",
    domain: "concrete",
    workKey: target.catalogId,
    titleRu: target.titleRu,
    definitionVersion: 4,
    applicability: {},
    professionalMetadata: {},
    parameterSchema: ANCHOR_GROUP_REPAIR_PARAMETERS.map((parameter) => ({
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

describe("anchor-group repair canonical family", () => {
  it("compiles all seven identities through one scope-gated repair graph", async () => {
    for (const target of ANCHOR_GROUP_REPAIR_TARGETS) {
      const input = anchorGroupRepairAcceptanceInputR1(target.contextKey);
      const compiled = await compileAnchorGroupRepairR1(
        { ...input },
        { catalogId: target.catalogId },
      );
      expect(compiled.preliminaryNeeds).toEqual([]);
      expect(compiled.revisionProjection.catalogId).toBe(target.catalogId);
      expect(compiled.totals.includedRowCount).toBeGreaterThanOrEqual(4);
      expect(compiled.totals.includedRowCount).toBeLessThanOrEqual(38);
      expect(compiled.totals.unpricedRowCount).toBe(compiled.totals.includedRowCount);
      expect(compiled.rows.some(
        (row) => row.row_id === "service:anchor-group:condition-assessment",
      )).toBe(true);
      expect(compiled.rows.some((row) => row.row_id === "material:concrete:ready-mix"))
        .toBe(false);
      expect(compiled.rows.some((row) => row.row_id.includes("formwork"))).toBe(false);
      expect(compiled.rows.some((row) => row.row_id === "material:reinforcement:rebar"))
        .toBe(false);
    }
  });

  it("separates concrete-only, hardware-only and combined schedules", async () => {
    const compileContext = async (contextKey: "large_area" | "small_area" | "standard") => {
      const target = ANCHOR_GROUP_REPAIR_TARGETS.find(
        (candidate) => candidate.contextKey === contextKey,
      )!;
      return compileAnchorGroupRepairR1(
        { ...anchorGroupRepairAcceptanceInputR1(contextKey) },
        { catalogId: target.catalogId },
      );
    };
    const concreteOnly = await compileContext("large_area");
    const hardwareOnly = await compileContext("small_area");
    const combined = await compileContext("standard");
    const ids = (compiled: Awaited<ReturnType<typeof compileAnchorGroupRepairR1>>) =>
      compiled.rows.map((row) => row.row_id);

    expect(ids(concreteOnly).some((id) => id.includes("anchor-group-concrete-repair")))
      .toBe(true);
    expect(ids(concreteOnly).some((id) => id.includes("repair-hardware"))).toBe(false);
    expect(ids(hardwareOnly).some((id) => id.includes("anchor-group-concrete-repair")))
      .toBe(false);
    expect(ids(hardwareOnly).some((id) => id.includes("repair-hardware"))).toBe(true);
    expect(ids(combined).some((id) => id.includes("anchor-group-concrete-repair")))
      .toBe(true);
    expect(ids(combined).some((id) => id.includes("repair-hardware"))).toBe(true);
  });

  it("allows unknown documentary references and designations to stay blank", async () => {
    const target = ANCHOR_GROUP_REPAIR_TARGETS[0];
    const input = { ...anchorGroupRepairAcceptanceInputR1(target.contextKey) };
    for (const parameter of ANCHOR_GROUP_REPAIR_PARAMETERS) {
      if (parameter.value_type === "text") delete input[parameter.parameter_id];
    }
    const compiled = await compileAnchorGroupRepairR1(input, { catalogId: target.catalogId });
    expect(compiled.preliminaryNeeds).toEqual([]);
  });

  it("keeps missing branch quantities visible and does not invent them", async () => {
    const hardwareTarget = ANCHOR_GROUP_REPAIR_TARGETS.find(
      (candidate) => candidate.contextKey === "high_load",
    )!;
    const hardwareInput = { ...anchorGroupRepairAcceptanceInputR1("high_load") };
    delete hardwareInput.post_installed_anchor_quantity_piece;
    const missingHardware = await compileAnchorGroupRepairR1(
      hardwareInput,
      { catalogId: hardwareTarget.catalogId },
    );
    expect(missingHardware.preliminaryNeeds).toEqual(expect.arrayContaining([
      expect.objectContaining({
        missing_parameter_ids: expect.arrayContaining(["post_installed_anchor_quantity_piece"]),
        quantity: null,
      }),
    ]));

    const concreteTarget = ANCHOR_GROUP_REPAIR_TARGETS.find(
      (candidate) => candidate.contextKey === "standard",
    )!;
    const concreteInput = { ...anchorGroupRepairAcceptanceInputR1("standard") };
    delete concreteInput.repair_material_quantity_kg;
    const missingConcrete = await compileAnchorGroupRepairR1(
      concreteInput,
      { catalogId: concreteTarget.catalogId },
    );
    expect(missingConcrete.preliminaryNeeds).toEqual(expect.arrayContaining([
      expect.objectContaining({
        missing_parameter_ids: expect.arrayContaining(["repair_material_quantity_kg"]),
        quantity: null,
      }),
    ]));
  });

  it("reuses the accepted concrete-repair formulas and direct project quantities", () => {
    expect(ANCHOR_GROUP_REPAIR_FORMULAS.slice(0, CONCRETE_SLAB_REPAIR_FORMULAS.length))
      .toEqual(CONCRETE_SLAB_REPAIR_FORMULAS);
    const serialized = JSON.stringify({
      parameters: ANCHOR_GROUP_REPAIR_PARAMETERS,
      resources: ANCHOR_GROUP_REPAIR_RESOURCES,
    });
    expect(serialized).toContain(ANCHOR_GROUP_REPAIR_SOURCE_ID);
    expect(serialized).toContain("DIRECT_APPROVED_PROJECT_REPAIR_SCHEDULE");
    expect(serialized).toContain("universal_productivity_claimed\":false");
  });

  it("round-trips through the ordinary shared parameter screen", () => {
    const target = ANCHOR_GROUP_REPAIR_TARGETS.find(
      (candidate) => candidate.contextKey === "technical_room",
    )!;
    const input = anchorGroupRepairAcceptanceInputR1(target.contextKey);
    const prompt = [target.titleRu, ...anchorGroupRepairPromptDetailsR1(input)].join("\n");
    expect(extractConcretePlacementCanonicalParametersR1({
      catalogId: target.catalogId,
      text: prompt,
    })).toEqual(input);
    const plan = buildCanonicalBaselinePlan({ catalog: catalog(target), prompt });
    expect(plan.primaryMeasureParameterId).toBe("repair_scope_volume_m3");
    expect(plan.parameters).toEqual(input);
  });

  it("does not claim neighboring anchor identities", async () => {
    await expect(compileAnchorGroupRepairR1(
      { ...anchorGroupRepairAcceptanceInputR1("standard") },
      { catalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_vibrate_standard" },
    )).rejects.toThrow("ANCHOR_GROUP_REPAIR_CATALOG_UNSUPPORTED");
  });
});
