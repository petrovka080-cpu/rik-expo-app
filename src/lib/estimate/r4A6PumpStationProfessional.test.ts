import fixture from "../../../data/estimate-benchmarks/r568-r4-a8-pump-station-acceptance.json";
import { pumpingStationCalculator } from "../ai/expandedComplexWorks";
import {
  evaluateR4A6PumpStationRows,
  missingR4A6PumpStationP0,
  parseR4A6PumpStationPrompt,
  R4_A6_PUMP_STATION_CATALOG_ID,
  R4_A6_PUMP_STATION_PARAMETERS,
  R4_A6_PUMP_STATION_PRIMARY_MEASURE_PARAMETER_ID,
  R4_A6_PUMP_STATION_ROWS,
} from "./r4A6PumpStationProfessional";

function outputRows(output: ReturnType<typeof pumpingStationCalculator>) {
  return [
    ...output.material_rows,
    ...output.work_rows,
    ...output.equipment_rows,
    ...output.service_rows,
  ];
}

describe("R4-A8 W5 professional pump station", () => {
  it("does not invent any project parameter for the bare work request", () => {
    const output = pumpingStationCalculator({ prompt: fixture.barePromptRu });

    expect(output.estimate_level).toBe("NEEDS_INPUT");
    expect(outputRows(output)).toHaveLength(0);
    expect(output.input_parameters).toEqual({});
    expect(output.missing_design_inputs).toHaveLength(17);
    expect(output.assumptions).toEqual([]);
    expect(output.formula_steps).toEqual([]);
  });

  it("keeps the accepted fixture explicit and evaluates 31 unique positive rows", () => {
    const parameters: Record<string, unknown> = fixture.parameters;
    const rows = evaluateR4A6PumpStationRows(parameters);

    expect(fixture.catalogId).toBe(R4_A6_PUMP_STATION_CATALOG_ID);
    expect(fixture.sourceClassification).toBe("SYNTHETIC_ACCEPTANCE_FIXTURE_NOT_PROJECT_DATA");
    expect(R4_A6_PUMP_STATION_PARAMETERS).toHaveLength(fixture.expectedParameterCount);
    expect(R4_A6_PUMP_STATION_PARAMETERS.filter((parameter) => parameter.tier === "P0"))
      .toHaveLength(fixture.expectedP0ParameterCount);
    expect(R4_A6_PUMP_STATION_PARAMETERS.every((parameter) => parameter.defaultValue == null)).toBe(true);
    expect(Object.keys(parameters)).toHaveLength(fixture.expectedParameterCount);
    expect(missingR4A6PumpStationP0(parameters)).toEqual([]);
    expect(R4_A6_PUMP_STATION_ROWS).toHaveLength(fixture.expectedRowCount);
    expect(rows).toHaveLength(fixture.expectedRowCount);
    expect(new Set(rows.map((row) => row.rowId)).size).toBe(fixture.expectedRowCount);
    expect(rows.every((row) => Number.isFinite(row.quantity) && row.quantity > 0)).toBe(true);
    expect(rows.find((row) => row.rowId === "foundation_concrete_m3")?.quantity).toBe(14.4);
    expect(rows.find((row) => row.rowId === "duty_pump_units")?.quantity).toBe(2);
    expect(rows.find((row) => row.rowId === "standby_pump_units")?.quantity).toBe(1);
    expect(rows.filter((row) => row.category === "delivery")).toHaveLength(2);
  });

  it("parses normal Russian units in the full W5 prompt and exposes all 31 rows", () => {
    const parsed = parseR4A6PumpStationPrompt(fixture.fullPromptRu);
    const output = pumpingStationCalculator({ prompt: fixture.fullPromptRu });
    const rows = outputRows(output);

    expect(output.estimate_level).toBe("PRELIMINARY_BOQ");
    expect(output.missing_design_inputs).toEqual([]);
    expect(rows).toHaveLength(fixture.expectedRowCount);
    expect(new Set(rows.map((row) => row.code)).size).toBe(fixture.expectedRowCount);
    expect(parsed).toEqual(fixture.parameters);
    expect(Object.keys(output.input_parameters)).toHaveLength(fixture.expectedParameterCount);
    expect(R4_A6_PUMP_STATION_PRIMARY_MEASURE_PARAMETER_ID).toBe("duty_pump_count");
    expect(output.input_parameters).toMatchObject({
      design_flow_m3_h: 120,
      design_head_m: 55,
      duty_pump_count: 2,
      standby_pump_count: 1,
      pump_power_kw: 75,
      suction_manifold_diameter_mm: 250,
      discharge_manifold_diameter_mm: 200,
      suction_manifold_length_m: 18,
      discharge_manifold_length_m: 22,
      power_cable_length_m: 120,
      power_supply_voltage_v: 400,
      ventilation_required: true,
      ventilation_airflow_m3_h: 2500,
      drainage_required: true,
      drainage_sump_volume_m3: 1.5,
      lifting_device_required: true,
      delivery_required: true,
      delivery_distance_km: 35,
      project_location: fixture.parameters.project_location,
      equipment_specification: fixture.parameters.equipment_specification,
    });
  });
});
