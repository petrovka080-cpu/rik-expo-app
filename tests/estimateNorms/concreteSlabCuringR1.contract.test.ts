import { buildCanonicalBaselinePlan } from "../../src/features/consumerRepair/consumerCanonicalBaselineCompile";
import type { CanonicalEstimateCatalogItem } from "../../src/lib/estimate/backendPlatform/contracts";
import {
  concreteSlabCuringPromptDetailsR1,
  extractConcretePlacementCanonicalParametersR1,
} from "../../src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1";
import {
  CONCRETE_SLAB_CURING_FORMULAS,
  CONCRETE_SLAB_CURING_PARAMETERS,
  CONCRETE_SLAB_CURING_RESOURCES,
  CONCRETE_SLAB_CURING_SOURCE_ID,
  CONCRETE_SLAB_CURING_TARGETS,
  compileConcreteSlabCuringR1,
  concreteSlabCuringAcceptanceInputR1,
} from "../../src/lib/estimate/v4/concreteSlabCuringR1";

describe("concrete slab curing canonical family", () => {
  it("compiles all six catalog identities through the shared canonical core", async () => {
    const fixtures = new Set<string>();
    const methods = new Set<string>();
    for (const target of CONCRETE_SLAB_CURING_TARGETS) {
      const input = concreteSlabCuringAcceptanceInputR1(target.contextKey);
      const compiled = await compileConcreteSlabCuringR1(
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
      fixtures.add(JSON.stringify(input));
      methods.add(String(input.approved_external_curing_method));
    }
    expect(fixtures.size).toBe(6);
    expect(methods).toEqual(new Set([
      "WATER_CURING",
      "WET_COVERING",
      "IMPERVIOUS_SHEET",
      "MEMBRANE_CURING_COMPOUND",
    ]));
  });

  it("includes only the material branch selected by the approved project method", async () => {
    const expectedRows = new Map([
      ["WATER_CURING", ["material:concrete:curing-water"]],
      ["WET_COVERING", [
        "material:concrete:curing-water",
        "material:concrete:wet-curing-covering",
      ]],
      ["IMPERVIOUS_SHEET", ["material:concrete:impervious-curing-sheet"]],
      ["MEMBRANE_CURING_COMPOUND", ["material:concrete:membrane-curing-compound"]],
    ]);
    for (const target of CONCRETE_SLAB_CURING_TARGETS) {
      const input = concreteSlabCuringAcceptanceInputR1(target.contextKey);
      const compiled = await compileConcreteSlabCuringR1(
        { ...input },
        { catalogId: target.catalogId },
      );
      const materialRows = compiled.rows
        .filter((row) => row.section === "Материалы")
        .map((row) => row.row_id)
        .sort();
      expect(materialRows).toEqual(
        [...expectedRows.get(String(input.approved_external_curing_method))!].sort(),
      );
    }
  });

  it("recalculates direct project quantities without multiplying by duration", async () => {
    const target = CONCRETE_SLAB_CURING_TARGETS.find(
      (candidate) => candidate.contextKey === "large_area",
    )!;
    const input = concreteSlabCuringAcceptanceInputR1(target.contextKey);
    const compiled = await compileConcreteSlabCuringR1({
      ...input,
      curing_duration_day: 14,
      curing_worker_h: 52,
      curing_compound_quantity_l: 90,
      application_equipment_machine_h: 14,
    }, { catalogId: target.catalogId });
    const quantity = (rowId: string) => Number(
      compiled.rows.find((row) => row.row_id === rowId)?.quantity,
    );
    expect(quantity("work:concrete:slab-curing")).toBe(52);
    expect(quantity("material:concrete:membrane-curing-compound")).toBe(90);
    expect(quantity("equipment:concrete:curing-application")).toBe(14);
    expect(JSON.stringify(CONCRETE_SLAB_CURING_FORMULAS))
      .not.toContain("curing_duration_day *");
  });

  it("fails closed for missing, wrong-branch or invented method inputs", async () => {
    const wetTarget = CONCRETE_SLAB_CURING_TARGETS.find(
      (candidate) => candidate.contextKey === "standard",
    )!;
    const wetInput = concreteSlabCuringAcceptanceInputR1(wetTarget.contextKey);
    const { wet_covering_area_m2: _missing, ...withoutCovering } = wetInput;
    await expect(compileConcreteSlabCuringR1(
      withoutCovering,
      { catalogId: wetTarget.catalogId },
    )).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });

    await expect(compileConcreteSlabCuringR1({
      ...wetInput,
      impervious_sheet_designation: "WRONG-BRANCH",
    }, { catalogId: wetTarget.catalogId })).rejects.toMatchObject({
      code: "PARAMETER_VALIDATION_FAILED",
    });

    await expect(compileConcreteSlabCuringR1({
      ...wetInput,
      approved_external_curing_method: "UNIVERSAL_AUTO_METHOD",
    }, { catalogId: wetTarget.catalogId })).rejects.toMatchObject({
      code: "PARAMETER_VALIDATION_FAILED",
    });
  });

  it("binds ACI 308 as applicability guidance and excludes legacy fake factors", () => {
    const serialized = JSON.stringify({
      parameters: CONCRETE_SLAB_CURING_PARAMETERS,
      formulas: CONCRETE_SLAB_CURING_FORMULAS,
      resources: CONCRETE_SLAB_CURING_RESOURCES,
    });
    expect(serialized).toContain(CONCRETE_SLAB_CURING_SOURCE_ID);
    expect(serialized).toContain("universal_consumption_claimed");
    expect(serialized).toContain("APPROVED_PROJECT_CURING_METHOD_AND_DIRECT_PROJECT_SCHEDULE");
    expect(serialized).not.toContain("src_professional_norm_pack_concrete_ready_mix_m3_m3_placed_v1");
    expect(serialized).not.toContain("src_professional_norm_pack_formwork_contact_area_m2_m3_concrete_element_v1");
    expect(serialized).not.toContain("src_professional_norm_pack_reinforcement_rebar_kg_m3_concrete_element_v1");
    expect(CONCRETE_SLAB_CURING_PARAMETERS).toHaveLength(24);
    expect(CONCRETE_SLAB_CURING_FORMULAS).toHaveLength(9);
    expect(CONCRETE_SLAB_CURING_RESOURCES).toHaveLength(8);
  });

  it("round-trips conditional inputs through the ordinary consumer binding", () => {
    const target = CONCRETE_SLAB_CURING_TARGETS.find(
      (candidate) => candidate.contextKey === "small_area",
    )!;
    const fixture = concreteSlabCuringAcceptanceInputR1(target.contextKey);
    const prompt = [target.titleRu, ...concreteSlabCuringPromptDetailsR1(fixture)].join("\n");
    expect(extractConcretePlacementCanonicalParametersR1({
      catalogId: target.catalogId,
      text: prompt,
    })).toEqual(fixture);
    const catalog: CanonicalEstimateCatalogItem = {
      catalogId: target.catalogId,
      releaseId: "prepared-concrete-slab-curing-test",
      namespace: "global",
      domain: "concrete",
      workKey: target.catalogId,
      titleRu: target.titleRu,
      definitionVersion: 4,
      applicability: {},
      professionalMetadata: {},
      parameterSchema: CONCRETE_SLAB_CURING_PARAMETERS.map((parameter) => ({
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
    expect(plan.primaryMeasureParameterId).toBe("cured_concrete_volume_m3");
    expect(plan.parameters).toEqual(fixture);
  });
});
