import {
  STAIRS_COMPLETE_INSTALLATION_FORMULAS,
  STAIRS_COMPLETE_INSTALLATION_PARAMETERS,
  STAIRS_COMPLETE_INSTALLATION_RESOURCES,
  STAIRS_COMPLETE_INSTALLATION_TARGETS,
  compileStairsCompleteInstallationR1,
  stairsCompleteInstallationAcceptanceInputR1,
} from "../../src/lib/estimate/v4/stairsCompleteInstallationR1";
import {
  RICS_NRM2_FORMWORK_SOURCE_ID,
} from "../../src/lib/estimate/v4/domainFactory/formworkRicsNrm2PhysicalNormV1";

describe("complete monolithic concrete stairs installation family", () => {
  it("compiles seven complete project schedules through one shared core", async () => {
    const fixtures = new Set<string>();
    for (const target of STAIRS_COMPLETE_INSTALLATION_TARGETS) {
      const input = stairsCompleteInstallationAcceptanceInputR1(target.contextKey);
      const compiled = await compileStairsCompleteInstallationR1(
        { ...input },
        { catalogId: target.catalogId },
      );
      expect(compiled.preliminaryNeeds).toEqual([]);
      expect(compiled.revisionProjection.catalogId).toBe(target.catalogId);
      expect(compiled.totals.unpricedRowCount).toBe(compiled.totals.includedRowCount);
      expect(compiled.rows.some((row) => row.row_id === "material:concrete:ready-mix"))
        .toBe(true);
      expect(compiled.rows.some(
        (row) => row.row_id === "material:reinforcement:steel-approved-schedule",
      )).toBe(true);
      expect(compiled.rows.some(
        (row) => row.row_id === "work:formwork:stairs-measured-contact-area",
      )).toBe(true);
      expect(compiled.rows.some((row) => /frami-xlife|dokaflex/iu.test(row.row_id)))
        .toBe(false);
      fixtures.add(JSON.stringify(input));
    }
    expect(fixtures.size).toBe(7);
  });

  it("recalculates concrete, reinforcement and formwork direct quantities", async () => {
    const target = STAIRS_COMPLETE_INSTALLATION_TARGETS.find(
      (candidate) => candidate.contextKey === "high_load",
    )!;
    const input = stairsCompleteInstallationAcceptanceInputR1(target.contextKey);
    const compiled = await compileStairsCompleteInstallationR1({
      ...input,
      stairs_concrete_volume_m3: 30,
      placement_selected_contingency_percent: 8,
      reinforcement_approved_reinforcement_schedule_weight_kg: 5_200,
      formwork_measured_formwork_contact_area_m2: 190,
      formwork_formwork_facing_area_m2: 205,
      formwork_formwork_assembly_worker_h: 210,
    }, { catalogId: target.catalogId });
    const quantity = (rowId: string) => Number(
      compiled.rows.find((row) => row.row_id === rowId)?.quantity,
    );
    expect(quantity("material:concrete:ready-mix")).toBeCloseTo(32.4, 8);
    expect(quantity("material:reinforcement:steel-approved-schedule")).toBe(5_200);
    expect(quantity("work:formwork:stairs-measured-contact-area")).toBe(190);
    expect(quantity("equipment:formwork:stairs-facing")).toBe(205);
    expect(quantity("labor:formwork:stairs-assembly")).toBe(210);
  });

  it("removes inapplicable component cards and rows without inventing defaults", async () => {
    const target = STAIRS_COMPLETE_INSTALLATION_TARGETS.find(
      (candidate) => candidate.contextKey === "small_area",
    )!;
    const input = stairsCompleteInstallationAcceptanceInputR1(target.contextKey);
    const placementOnly = Object.fromEntries(Object.entries(input).filter(([parameterId]) =>
      !parameterId.startsWith("reinforcement_")
      && !parameterId.startsWith("formwork_")
      && parameterId !== "temporary_formwork_applicable"));
    const compiled = await compileStairsCompleteInstallationR1({
      ...placementOnly,
      reinforcement_applicable: false,
      temporary_formwork_applicable: false,
    }, { catalogId: target.catalogId });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows.some((row) => row.row_id.includes("reinforcement"))).toBe(false);
    expect(compiled.rows.some((row) => row.row_id.includes("formwork"))).toBe(false);
    expect(compiled.rows.some((row) => row.row_id === "material:concrete:ready-mix"))
      .toBe(true);
  });

  it("keeps documentary formwork fields optional while requiring missing quantities", async () => {
    const target = STAIRS_COMPLETE_INSTALLATION_TARGETS.find(
      (candidate) => candidate.contextKey === "standard",
    )!;
    const input = stairsCompleteInstallationAcceptanceInputR1(target.contextKey);
    const withoutDocuments = Object.fromEntries(Object.entries(input).filter(([parameterId]) =>
      ![
        "formwork_stairs_geometry_description",
        "formwork_approved_formwork_drawing_reference",
        "formwork_formwork_system_designation",
      ].includes(parameterId)));
    const compiled = await compileStairsCompleteInstallationR1(
      withoutDocuments,
      { catalogId: target.catalogId },
    );
    expect(compiled.preliminaryNeeds).toEqual([]);

    const { formwork_formwork_facing_area_m2: _missing, ...withoutFacing } = input;
    const missingResult = await compileStairsCompleteInstallationR1(
      withoutFacing,
      { catalogId: target.catalogId },
    );
    expect(missingResult.preliminaryNeeds).toEqual(expect.arrayContaining([
      expect.objectContaining({
        missing_parameter_ids: ["formwork_formwork_facing_area_m2"],
      }),
    ]));
  });

  it("pins RICS measurement and rejects automatic branded system selection", () => {
    const serialized = JSON.stringify({
      parameters: STAIRS_COMPLETE_INSTALLATION_PARAMETERS,
      formulas: STAIRS_COMPLETE_INSTALLATION_FORMULAS,
      resources: STAIRS_COMPLETE_INSTALLATION_RESOURCES,
    });
    expect(serialized).toContain(RICS_NRM2_FORMWORK_SOURCE_ID);
    expect(serialized).toContain("MEASUREMENT_ONLY_NOT_SYSTEM_OR_PRODUCTIVITY_SELECTION");
    expect(serialized).not.toContain("frami_xlife_panel_count");
    expect(serialized).not.toContain("dokaflex_floor_prop_count");
    expect(serialized).not.toContain("round_to(q * 2.4");
  });

  it("round-trips entered values and keeps the stairs volume as primary measure", () => {
    const target = STAIRS_COMPLETE_INSTALLATION_TARGETS.find(
      (candidate) => candidate.contextKey === "wet_zone",
    )!;
    const fixture = stairsCompleteInstallationAcceptanceInputR1(target.contextKey);
    const prompt = [target.titleRu, ...stairsCompleteInstallationPromptDetailsR1(fixture)]
      .join("\n");
    expect(extractConcretePlacementCanonicalParametersR1({
      catalogId: target.catalogId,
      text: prompt,
    })).toEqual(fixture);
    const catalog: CanonicalEstimateCatalogItem = {
      catalogId: target.catalogId,
      releaseId: "prepared-stairs-complete-test",
      namespace: "global",
      domain: "concrete",
      workKey: target.catalogId,
      titleRu: target.titleRu,
      definitionVersion: 4,
      applicability: {},
      professionalMetadata: {},
      parameterSchema: STAIRS_COMPLETE_INSTALLATION_PARAMETERS.map((parameter) => ({
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
    expect(plan.primaryMeasureParameterId).toBe("stairs_concrete_volume_m3");
    expect(plan.parameters).toEqual(fixture);
  });
});
import { buildCanonicalBaselinePlan } from "../../src/features/consumerRepair/consumerCanonicalBaselineCompile";
import type { CanonicalEstimateCatalogItem } from "../../src/lib/estimate/backendPlatform/contracts";
import {
  extractConcretePlacementCanonicalParametersR1,
  stairsCompleteInstallationPromptDetailsR1,
} from "../../src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1";
