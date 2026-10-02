import { buildCanonicalBaselinePlan } from
  "../../src/features/consumerRepair/consumerCanonicalBaselineCompile";
import type { CanonicalEstimateCatalogItem } from
  "../../src/lib/estimate/backendPlatform/contracts";
import {
  DISTRIBUTION_PIPELINE_CATALOG_ID,
  DISTRIBUTION_PIPELINE_FORMULAS,
  DISTRIBUTION_PIPELINE_PARAMETERS,
  DISTRIBUTION_PIPELINE_RUNTIME_INPUT,
  compileDistributionPipelineR1,
} from "../../src/lib/estimate/v4/distributionPipelineR1";

const PROMPT = "Строительство 1 распределительной магистрали: трасса 1800 м, труба HDPE PE100-RC SDR17 OD 225 мм PN10, марка PE100-RC-SDR17-OD225-PN10.";

function catalog(): CanonicalEstimateCatalogItem {
  return {
    catalogId: DISTRIBUTION_PIPELINE_CATALOG_ID,
    releaseId: "00000000-0000-5000-8000-000000002725",
    namespace: "global",
    domain: "water_supply",
    workKey: "distribution_pipeline",
    titleRu: "Строительство распределительной магистрали питьевой воды",
    definitionVersion: 5,
    applicability: {},
    professionalMetadata: {},
    parameterSchema: DISTRIBUTION_PIPELINE_PARAMETERS.map((parameter) => ({
      parameterId: parameter.parameter_id,
      ordinal: parameter.ordinal,
      valueType: parameter.value_type,
      unitId: parameter.unit_id,
      titleRu: parameter.title_ru,
      required: parameter.required,
      defaultValue: Object.hasOwn(DISTRIBUTION_PIPELINE_RUNTIME_INPUT, parameter.parameter_id)
        ? DISTRIBUTION_PIPELINE_RUNTIME_INPUT[
          parameter.parameter_id as keyof typeof DISTRIBUTION_PIPELINE_RUNTIME_INPUT
        ]
        : parameter.default_value,
      constraints: parameter.constraints_json,
      visibilityRole: "USER_INPUT" as const,
      formulaConsumers: DISTRIBUTION_PIPELINE_FORMULAS
        .filter((formula) => formula.input_parameter_ids.includes(parameter.parameter_id))
        .map((formula) => formula.formula_id),
    })),
  } as CanonicalEstimateCatalogItem;
}

describe("S27.25 ordinary distribution-pipeline route", () => {
  test("shared Russian ingress sends only primary facts and the owner calculates the full preliminary work", async () => {
    const plan = buildCanonicalBaselinePlan({ catalog: catalog(), prompt: PROMPT });
    expect(plan.primaryMeasureParameterId).toBe("dpm_main_count");
    expect(plan.parameters).toEqual({
      dpm_main_count: "1",
      dpm_route_length_m: "1800",
      dpm_pipe_material: "HDPE",
      dpm_pipe_grade: "PE100-RC",
      dpm_sdr_class: "SDR17",
      dpm_pipe_outside_diameter_mm: "225",
      dpm_pressure_class: "PN10",
      dpm_pipe_designation: "PE100-RC-SDR17-OD225-PN10",
    });

    const compiled = await compileDistributionPipelineR1(plan.parameters);
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(56);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:dpm_trench_excavation", quantity: "4320" }),
      expect.objectContaining({ row_id: "rc09:dpm_bedding", quantity: "324" }),
      expect.objectContaining({ row_id: "rc09:dpm_pipe_joint", quantity: "149" }),
      expect.objectContaining({ row_id: "rc09:dpm_pipe", quantity: "1860" }),
      expect.objectContaining({ row_id: "rc09:dpm_fusion_consumables", quantity: "149" }),
    ]));
  });
});
