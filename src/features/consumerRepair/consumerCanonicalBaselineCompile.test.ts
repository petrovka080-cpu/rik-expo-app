import fixture from "../../../data/estimate-benchmarks/r568-r4-a8-pump-station-acceptance.json";
import type { CanonicalEstimateCatalogItem } from "../../lib/estimate/backendPlatform/contracts";
import {
  R4_A6_PUMP_STATION_PARAMETERS,
  R4_A6_PUMP_STATION_PRIMARY_MEASURE_PARAMETER_ID,
} from "../../lib/estimate/r4A6PumpStationProfessional";
import { buildCanonicalBaselinePlan } from "./consumerCanonicalBaselineCompile";

function pumpCatalog(): CanonicalEstimateCatalogItem {
  return {
    catalogId: fixture.catalogId,
    releaseId: "00000000-0000-5000-8000-000000000001",
    namespace: "global",
    domain: "water_supply",
    workKey: "booster_pumping_station",
    titleRu: "Строительство повысительной насосной станции",
    definitionVersion: 1,
    applicability: {},
    professionalMetadata: {},
    parameterSchema: R4_A6_PUMP_STATION_PARAMETERS.map((parameter, ordinal) => ({
      parameterId: parameter.parameterId,
      ordinal,
      valueType: parameter.valueType,
      unitId: parameter.unitId,
      titleRu: parameter.titleRu,
      required: parameter.tier === "P0" && parameter.required && !parameter.requiredWhen,
      defaultValue: null,
      constraints: {
        ...(["decimal", "integer"].includes(parameter.valueType)
          ? { min: 0.000001, max: 1_000_000_000 }
          : {}),
        ...(parameter.requiredWhen ? { requiredWhen: parameter.requiredWhen } : {}),
      },
      visibilityRole: "USER_INPUT" as const,
      valueSourceRole: "USER_MEASURED" as const,
    })),
  };
}

describe("consumer canonical W5 baseline", () => {
  it("blocks the bare pump request before creating a backend job", () => {
    expect(() => buildCanonicalBaselinePlan({ catalog: pumpCatalog(), prompt: fixture.barePromptRu }))
      .toThrow(/^CANONICAL_BASELINE_CONTRACT_MISSING:/u);
  });

  it("passes all 24 explicit pump inputs and selects a formula-connected primary measure", () => {
    const plan = buildCanonicalBaselinePlan({ catalog: pumpCatalog(), prompt: fixture.fullPromptRu });

    expect(plan.parameters).toEqual(fixture.parameters);
    expect(Object.keys(plan.parameters)).toHaveLength(fixture.expectedParameterCount);
    expect(plan.primaryMeasureParameterId).toBe(R4_A6_PUMP_STATION_PRIMARY_MEASURE_PARAMETER_ID);
    expect(plan.primaryMeasureParameterId).toBe("duty_pump_count");
  });
});
