import {buildCanonicalBaselinePlan} from "../../src/lib/estimate/backendPlatform/canonicalConsumerPromptPlanServerR1";
import type { CanonicalEstimateCatalogItem } from
  "../../src/lib/estimate/backendPlatform/contracts";
import {
  HOUSE_WATER_CONNECTION_CATALOG_ID,
  HOUSE_WATER_CONNECTION_FORMULAS,
  HOUSE_WATER_CONNECTION_PARAMETERS,
  HOUSE_WATER_CONNECTION_RUNTIME_INPUT,
  compileHouseWaterConnectionR1,
} from "../../src/lib/estimate/v4/houseWaterConnectionR1";

const PROMPT = "Устройство 1 ввода воды в дом: трасса 28 м, сервисная труба HDPE PE100-RC SDR11 OD 32 мм PN16, марка PE100-RC-SDR11-OD32-PN16; существующая магистраль HDPE-PE100-RC OD 225 мм.";

function catalog(): CanonicalEstimateCatalogItem {
  return {
    catalogId: HOUSE_WATER_CONNECTION_CATALOG_ID,
    releaseId: "00000000-0000-5000-8000-000000002725",
    namespace: "global",
    domain: "water_supply",
    workKey: "house_connection_water",
    titleRu: "Устройство ввода питьевого водопровода в дом",
    definitionVersion: 4,
    applicability: {},
    professionalMetadata: {},
    parameterSchema: HOUSE_WATER_CONNECTION_PARAMETERS.map((parameter) => ({
      parameterId: parameter.parameter_id,
      ordinal: parameter.ordinal,
      valueType: parameter.value_type,
      unitId: parameter.unit_id,
      titleRu: parameter.title_ru,
      required: parameter.required,
      defaultValue: Object.hasOwn(HOUSE_WATER_CONNECTION_RUNTIME_INPUT, parameter.parameter_id)
        ? HOUSE_WATER_CONNECTION_RUNTIME_INPUT[
          parameter.parameter_id as keyof typeof HOUSE_WATER_CONNECTION_RUNTIME_INPUT
        ]
        : parameter.default_value,
      constraints: parameter.constraints_json,
      visibilityRole: "USER_INPUT" as const,
      formulaConsumers: HOUSE_WATER_CONNECTION_FORMULAS
        .filter((formula) => formula.input_parameter_ids.includes(parameter.parameter_id))
        .map((formula) => formula.formula_id),
    })),
  } as CanonicalEstimateCatalogItem;
}

describe("S27.25 ordinary house-water-connection route", () => {
  test("submits ten primary facts and automatically compiles the complete connection", async () => {
    const plan = buildCanonicalBaselinePlan({ catalog: catalog(), prompt: PROMPT });
    expect(plan.primaryMeasureParameterId).toBe("hcw_connection_count");
    expect(plan.parameters).toEqual({
      hcw_connection_count: "1",
      hcw_service_route_length_m: "28",
      hcw_pipe_material: "HDPE",
      hcw_pipe_grade: "PE100-RC",
      hcw_sdr_class: "SDR11",
      hcw_pipe_outside_diameter_mm: "32",
      hcw_pressure_class: "PN16",
      hcw_pipe_designation: "PE100-RC-SDR11-OD32-PN16",
      hcw_existing_main_material: "HDPE-PE100-RC",
      hcw_existing_main_outside_diameter_mm: "225",
    });

    const compiled = await compileHouseWaterConnectionR1(plan.parameters);
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(62);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:hcw_trench_excavation", quantity: "25.2" }),
      expect.objectContaining({ row_id: "rc09:hcw_pipe", quantity: "100" }),
      expect.objectContaining({ row_id: "rc09:hcw_tapping_saddle", quantity: "1" }),
      expect.objectContaining({ row_id: "rc09:hcw_water_meter", quantity: "1" }),
      expect.objectContaining({ row_id: "rc09:hcw_wall_sleeve", quantity: "1" }),
    ]));
  });
});
