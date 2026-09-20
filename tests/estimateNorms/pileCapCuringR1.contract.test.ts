import { buildCanonicalBaselinePlan } from "../../src/features/consumerRepair/consumerCanonicalBaselineCompile";
import type { CanonicalEstimateCatalogItem } from "../../src/lib/estimate/backendPlatform/contracts";
import {
  extractConcretePlacementCanonicalParametersR1,
  pileCapCuringPromptDetailsR1,
} from "../../src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1";
import { PEDESTAL_CURING_FORMULAS } from "../../src/lib/estimate/v4/pedestalCuringR1";
import {
  PILE_CAP_CURING_FORMULAS,
  PILE_CAP_CURING_PARAMETERS,
  PILE_CAP_CURING_RESOURCES,
  PILE_CAP_CURING_SOURCE_ID,
  PILE_CAP_CURING_TARGETS,
  compilePileCapCuringR1,
  pileCapCuringAcceptanceInputR1,
} from "../../src/lib/estimate/v4/pileCapCuringR1";

function catalog(target: (typeof PILE_CAP_CURING_TARGETS)[number]): CanonicalEstimateCatalogItem {
  return {
    catalogId: target.catalogId,
    releaseId: "prepared-pile-cap-curing-test",
    namespace: "global",
    domain: "concrete",
    workKey: target.catalogId,
    titleRu: target.titleRu,
    definitionVersion: 4,
    applicability: {},
    professionalMetadata: {},
    parameterSchema: PILE_CAP_CURING_PARAMETERS.map((parameter) => ({
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

describe("pile-cap concrete curing canonical family", () => {
  it("compiles all six exact identities through the shared core", async () => {
    for (const target of PILE_CAP_CURING_TARGETS) {
      const compiled = await compilePileCapCuringR1(
        { ...pileCapCuringAcceptanceInputR1(target.contextKey) },
        { catalogId: target.catalogId },
      );
      expect(compiled.preliminaryNeeds).toEqual([]);
      expect(compiled.totals.includedRowCount).toBeGreaterThanOrEqual(3);
      expect(compiled.totals.includedRowCount).toBeLessThanOrEqual(6);
      expect(compiled.totals.unpricedRowCount).toBe(compiled.totals.includedRowCount);
      expect(compiled.rows.some((row) => row.row_id === "material:concrete:ready-mix")).toBe(false);
      expect(compiled.rows.some((row) => row.row_id.includes("formwork"))).toBe(false);
      expect(compiled.rows.some((row) => row.row_id.includes("reinforcement"))).toBe(false);
      expect(compiled.rows.some((row) => row.row_id === "work:concrete:pile-cap-curing")).toBe(true);
    }
  });

  it("reuses the accepted ACI curing graph", () => {
    expect(PILE_CAP_CURING_FORMULAS).toBe(PEDESTAL_CURING_FORMULAS);
    expect(PILE_CAP_CURING_PARAMETERS).toHaveLength(24);
    expect(PILE_CAP_CURING_FORMULAS).toHaveLength(9);
    expect(PILE_CAP_CURING_RESOURCES).toHaveLength(8);
    expect(JSON.stringify({ parameters: PILE_CAP_CURING_PARAMETERS, resources: PILE_CAP_CURING_RESOURCES }))
      .toContain(PILE_CAP_CURING_SOURCE_ID);
  });

  it("allows only documentary references to remain blank", async () => {
    const target = PILE_CAP_CURING_TARGETS[0];
    const input = { ...pileCapCuringAcceptanceInputR1(target.contextKey) };
    for (const parameterId of [
      "concrete_mix_reference", "curing_method_statement_reference", "quality_plan_reference",
    ]) delete input[parameterId];
    const compiled = await compilePileCapCuringR1(input, { catalogId: target.catalogId });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows.some((row) => row.row_id === "work:concrete:pile-cap-curing")).toBe(true);
  });

  it("keeps selected method designations and direct quantities editable", async () => {
    const target = PILE_CAP_CURING_TARGETS[0];
    const input = { ...pileCapCuringAcceptanceInputR1(target.contextKey) };
    delete input.wet_covering_material_designation;
    delete input.wet_covering_area_m2;
    expect((await compilePileCapCuringR1(input, { catalogId: target.catalogId })).preliminaryNeeds)
      .toEqual(expect.arrayContaining([
        expect.objectContaining({
          missing_parameter_ids: ["wet_covering_area_m2", "wet_covering_material_designation"],
        }),
      ]));
  });

  it("round-trips values through the ordinary consumer parameter screen", () => {
    const target = PILE_CAP_CURING_TARGETS[3];
    const input = pileCapCuringAcceptanceInputR1(target.contextKey);
    const prompt = [target.titleRu, ...pileCapCuringPromptDetailsR1(input)].join("\n");
    expect(extractConcretePlacementCanonicalParametersR1({ catalogId: target.catalogId, text: prompt }))
      .toEqual(input);
    const plan = buildCanonicalBaselinePlan({ catalog: catalog(target), prompt });
    expect(plan.primaryMeasureParameterId).toBe("cured_concrete_volume_m3");
    expect(plan.parameters).toEqual(input);
  });

  it("does not claim neighboring embedded-items identities", async () => {
    await expect(compilePileCapCuringR1(pileCapCuringAcceptanceInputR1("standard"), {
      catalogId: "canonical-work:base:concrete_foundation_interior_pile_cap_anchor_standard",
    })).rejects.toThrow("PILE_CAP_CURING_CATALOG_UNSUPPORTED");
  });
});
