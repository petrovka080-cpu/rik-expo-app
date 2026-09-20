import { buildCanonicalBaselinePlan } from "../../src/features/consumerRepair/consumerCanonicalBaselineCompile";
import type { CanonicalEstimateCatalogItem } from "../../src/lib/estimate/backendPlatform/contracts";
import {
  concreteJointCompleteInstallationPromptDetailsR1,
  extractConcretePlacementCanonicalParametersR1,
} from "../../src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1";
import {
  CONCRETE_JOINT_COMPLETE_INSTALLATION_FORMULAS,
  CONCRETE_JOINT_COMPLETE_INSTALLATION_NORM_ID,
  CONCRETE_JOINT_COMPLETE_INSTALLATION_PARAMETERS,
  CONCRETE_JOINT_COMPLETE_INSTALLATION_RESOURCES,
  CONCRETE_JOINT_COMPLETE_INSTALLATION_SOURCE_ID,
  CONCRETE_JOINT_COMPLETE_INSTALLATION_SOURCE_PDF_SHA256,
  CONCRETE_JOINT_COMPLETE_INSTALLATION_TARGETS,
  compileConcreteJointCompleteInstallationR1,
  concreteJointCompleteInstallationAcceptanceInputR1,
} from "../../src/lib/estimate/v4/concreteJointCompleteInstallationR1";

describe("complete project-specified concrete joint installation family", () => {
  it("compiles seven distinct joint schedules through the shared core", async () => {
    const fixtures = new Set<string>();
    for (const target of CONCRETE_JOINT_COMPLETE_INSTALLATION_TARGETS) {
      const input = concreteJointCompleteInstallationAcceptanceInputR1(target.contextKey);
      const compiled = await compileConcreteJointCompleteInstallationR1(
        { ...input },
        { catalogId: target.catalogId },
      );
      expect(compiled.preliminaryNeeds).toEqual([]);
      expect(compiled.revisionProjection.catalogId).toBe(target.catalogId);
      expect(compiled.rows.some(
        (row) => row.row_id === "work:concrete:joint-complete-installation",
      )).toBe(true);
      expect(compiled.rows.some((row) => row.row_id.includes("frami"))).toBe(false);
      expect(compiled.rows.some((row) => row.row_id === "material:concrete:ready-mix"))
        .toBe(false);
      expect(compiled.totals.unpricedRowCount).toBe(compiled.totals.includedRowCount);
      fixtures.add(JSON.stringify(input));
    }
    expect(fixtures.size).toBe(7);
  });

  it("includes only the branches explicitly selected by the project", async () => {
    for (const target of CONCRETE_JOINT_COMPLETE_INSTALLATION_TARGETS) {
      const input = concreteJointCompleteInstallationAcceptanceInputR1(target.contextKey);
      const compiled = await compileConcreteJointCompleteInstallationR1(
        { ...input },
        { catalogId: target.catalogId },
      );
      const rowIds = new Set(compiled.rows.map((row) => row.row_id));
      expect(rowIds.has("material:concrete:joint-premolded-filler"))
        .toBe(input.premolded_filler_required);
      expect(rowIds.has("material:concrete:joint-backer-rod"))
        .toBe(input.backer_rod_required);
      expect(rowIds.has("material:concrete:joint-sealant"))
        .toBe(input.joint_sealant_required);
      expect(rowIds.has("material:concrete:joint-waterstop"))
        .toBe(input.waterstop_required);
      expect(rowIds.has("material:concrete:joint-edge-profile"))
        .toBe(input.edge_protection_profile_required);
      expect(rowIds.has("material:concrete:joint-load-transfer-devices"))
        .toBe(input.load_transfer_device_required);
      expect(rowIds.has("material:concrete:joint-edge-reinforcement"))
        .toBe(input.edge_reinforcement_required);
      expect(rowIds.has("equipment:concrete:joint-saw-cutting"))
        .toBe(input.saw_cutting_required);
      expect(rowIds.has("equipment:concrete:joint-surface-preparation"))
        .toBe(input.surface_preparation_equipment_required);
      expect(rowIds.has("service:concrete:joint-quality-control"))
        .toBe(input.joint_quality_control_required);
      expect(rowIds.has("delivery:concrete:joint-materials"))
        .toBe(input.separate_material_delivery_required);
      expect(rowIds.has("service:concrete:joint-waste-disposal"))
        .toBe(input.waste_disposal_required);
      expect(rowIds.has("delivery:concrete:joint-waste"))
        .toBe(input.waste_disposal_required);
    }
  });

  it("recalculates direct project quantities without hidden product or productivity rates", async () => {
    const target = CONCRETE_JOINT_COMPLETE_INSTALLATION_TARGETS.find(
      (candidate) => candidate.contextKey === "high_load",
    )!;
    const input = concreteJointCompleteInstallationAcceptanceInputR1(target.contextKey);
    const compiled = await compileConcreteJointCompleteInstallationR1({
      ...input,
      joint_installation_worker_h: 71,
      joint_sealant_quantity_l: 52,
      load_transfer_device_quantity_piece: 156,
      edge_reinforcement_mass_kg: 1_240,
      saw_cutting_machine_h: 14,
      material_delivery_trip_count: 3,
    }, { catalogId: target.catalogId });
    const quantity = (rowId: string) => Number(
      compiled.rows.find((row) => row.row_id === rowId)?.quantity,
    );
    expect(quantity("labor:concrete:joint-complete-installation")).toBe(71);
    expect(quantity("material:concrete:joint-sealant")).toBe(52);
    expect(quantity("material:concrete:joint-load-transfer-devices")).toBe(156);
    expect(quantity("material:concrete:joint-edge-reinforcement")).toBe(1_240);
    expect(quantity("equipment:concrete:joint-saw-cutting")).toBe(14);
    expect(quantity("delivery:concrete:joint-materials")).toBe(3);
  });

  it("does not block a preliminary calculation on optional documentary references", async () => {
    const target = CONCRETE_JOINT_COMPLETE_INSTALLATION_TARGETS.find(
      (candidate) => candidate.contextKey === "small_area",
    )!;
    const input = concreteJointCompleteInstallationAcceptanceInputR1(target.contextKey);
    const {
      joint_location: _location,
      approved_joint_detail_reference: _detail,
      joint_method_statement_reference: _method,
      ...withoutDocumentaryFields
    } = input;
    const compiled = await compileConcreteJointCompleteInstallationR1(
      withoutDocumentaryFields,
      { catalogId: target.catalogId },
    );
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows.map((row) => row.row_id)).toEqual([
      "work:concrete:joint-complete-installation",
      "labor:concrete:joint-complete-installation",
      "material:concrete:joint-premolded-filler",
    ]);
  });

  it("fails closed for missing geometry or incomplete selected branches", async () => {
    const target = CONCRETE_JOINT_COMPLETE_INSTALLATION_TARGETS.find(
      (candidate) => candidate.contextKey === "wet_zone",
    )!;
    const input = concreteJointCompleteInstallationAcceptanceInputR1(target.contextKey);
    const { joint_length_m: _length, ...withoutLength } = input;
    const withoutLengthResult = await compileConcreteJointCompleteInstallationR1(
      withoutLength,
      { catalogId: target.catalogId },
    );
    expect(withoutLengthResult.preliminaryNeeds).toEqual(expect.arrayContaining([
      expect.objectContaining({ missing_parameter_ids: ["joint_length_m"] }),
    ]));

    const { waterstop_length_m: _waterstopLength, ...withoutWaterstopLength } = input;
    const withoutWaterstopLengthResult = await compileConcreteJointCompleteInstallationR1(
      withoutWaterstopLength,
      { catalogId: target.catalogId },
    );
    expect(withoutWaterstopLengthResult.preliminaryNeeds).toEqual(expect.arrayContaining([
      expect.objectContaining({ missing_parameter_ids: ["waterstop_length_m"] }),
    ]));

    await expect(compileConcreteJointCompleteInstallationR1({
      ...input,
      waterstop_required: false,
    }, { catalogId: target.catalogId })).rejects.toMatchObject({
      code: "PARAMETER_VALIDATION_FAILED",
    });
  });

  it("pins ACI joint applicability and excludes the legacy formwork claim", () => {
    const serialized = JSON.stringify({
      parameters: CONCRETE_JOINT_COMPLETE_INSTALLATION_PARAMETERS,
      formulas: CONCRETE_JOINT_COMPLETE_INSTALLATION_FORMULAS,
      resources: CONCRETE_JOINT_COMPLETE_INSTALLATION_RESOURCES,
    });
    expect(serialized).toContain(CONCRETE_JOINT_COMPLETE_INSTALLATION_SOURCE_ID);
    expect(serialized).toContain(CONCRETE_JOINT_COMPLETE_INSTALLATION_NORM_ID);
    expect(serialized).toContain(CONCRETE_JOINT_COMPLETE_INSTALLATION_SOURCE_PDF_SHA256);
    expect(serialized).toContain("APPROVED_PROJECT_JOINT_DETAIL_AND_DIRECT_PROJECT_SCHEDULE");
    expect(serialized).not.toContain("src_professional_norm_pack_formwork");
    expect(serialized).not.toContain("Frami");
    expect(serialized).not.toContain("universal joint kit");
    expect(CONCRETE_JOINT_COMPLETE_INSTALLATION_PARAMETERS).toHaveLength(44);
    expect(CONCRETE_JOINT_COMPLETE_INSTALLATION_FORMULAS).toHaveLength(16);
    expect(CONCRETE_JOINT_COMPLETE_INSTALLATION_RESOURCES).toHaveLength(15);
  });

  it("round-trips all entered calculation values through the ordinary consumer binding", () => {
    const target = CONCRETE_JOINT_COMPLETE_INSTALLATION_TARGETS.find(
      (candidate) => candidate.contextKey === "wet_zone",
    )!;
    const fixture = concreteJointCompleteInstallationAcceptanceInputR1(target.contextKey);
    const prompt = [
      target.titleRu,
      ...concreteJointCompleteInstallationPromptDetailsR1(fixture),
    ].join("\n");
    expect(extractConcretePlacementCanonicalParametersR1({
      catalogId: target.catalogId,
      text: prompt,
    })).toEqual(fixture);

    const catalog: CanonicalEstimateCatalogItem = {
      catalogId: target.catalogId,
      releaseId: "prepared-concrete-joint-complete-test",
      namespace: "global",
      domain: "concrete",
      workKey: target.catalogId,
      titleRu: target.titleRu,
      definitionVersion: 5,
      applicability: {},
      professionalMetadata: {},
      parameterSchema: CONCRETE_JOINT_COMPLETE_INSTALLATION_PARAMETERS.map((parameter) => ({
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
    expect(plan.primaryMeasureParameterId).toBe("joint_length_m");
    expect(plan.parameters).toEqual(fixture);
  });
});
