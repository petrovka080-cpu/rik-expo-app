import fixture from "../../../data/estimate-benchmarks/r568-r4-a8-pump-station-acceptance.json";
import type { CanonicalEstimateCatalogItem } from "../../lib/estimate/backendPlatform/contracts";
import {
  R4_A6_PUMP_STATION_PARAMETERS,
  R4_A6_PUMP_STATION_PRIMARY_MEASURE_PARAMETER_ID,
} from "../../lib/estimate/r4A6PumpStationProfessional";
import {
  buildCanonicalBaselinePlan,
  R4_A13_BULKHEAD_FRAME_CATALOG_ID,
} from "./consumerCanonicalBaselineCompile";

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
  it("keeps the bare pump request free of invented project facts for preliminary composition", () => {
    expect(buildCanonicalBaselinePlan({ catalog: pumpCatalog(), prompt: fixture.barePromptRu }))
      .toMatchObject({
        parameters: {},
        primaryMeasureParameterId: R4_A6_PUMP_STATION_PRIMARY_MEASURE_PARAMETER_ID,
      });
  });

  it("passes all 24 explicit pump inputs and selects a formula-connected primary measure", () => {
    const plan = buildCanonicalBaselinePlan({ catalog: pumpCatalog(), prompt: fixture.fullPromptRu });

    expect(plan.parameters).toEqual(fixture.parameters);
    expect(Object.keys(plan.parameters)).toHaveLength(fixture.expectedParameterCount);
    expect(plan.primaryMeasureParameterId).toBe(R4_A6_PUMP_STATION_PRIMARY_MEASURE_PARAMETER_ID);
    expect(plan.primaryMeasureParameterId).toBe("duty_pump_count");
  });
});

describe("consumer canonical W12 preliminary handoff", () => {
  it("submits UI boolean choices with their canonical boolean type", () => {
    const catalog: CanonicalEstimateCatalogItem = {
      catalogId: "canonical-work:test:boolean-parameter",
      releaseId: "00000000-0000-5000-8000-000000000014",
      namespace: "global",
      domain: "test",
      workKey: "boolean_parameter",
      titleRu: "Проверка типизированных параметров",
      definitionVersion: 1,
      applicability: {},
      professionalMetadata: {},
      parameterSchema: [
        {
          parameterId: "length_m",
          ordinal: 0,
          valueType: "decimal",
          unitId: "m",
          titleRu: "Длина",
          required: true,
          defaultValue: null,
          constraints: { min: 0.001 },
          visibilityRole: "USER_INPUT",
          valueSourceRole: "USER_MEASURED",
        },
        {
          parameterId: "include_work",
          ordinal: 1,
          valueType: "boolean",
          unitId: null,
          titleRu: "Включить работу",
          required: true,
          defaultValue: null,
          constraints: {},
          visibilityRole: "USER_INPUT",
          valueSourceRole: "PROJECT_DOCUMENTATION",
        },
      ],
    };

    expect(buildCanonicalBaselinePlan({
      catalog,
      prompt: "работа длиной 150 м",
      parameterOverrides: { length_m: "150", include_work: "false" },
    }).parameters).toEqual({ length_m: "150", include_work: false });
  });

  it("submits only the stated area and leaves site inputs visibly missing", () => {
    const catalog: CanonicalEstimateCatalogItem = {
      catalogId: "canonical-work:base:drywall_ceiling_interior_drywall_ceiling_prepare_large_area",
      releaseId: "00000000-0000-5000-8000-000000000012",
      namespace: "global",
      domain: "interior_finishes",
      workKey: "drywall_ceiling_prepare_large_area",
      titleRu: "Подготовка потолка из гипсокартона на большой площади",
      definitionVersion: 5,
      applicability: {},
      professionalMetadata: {},
      parameterSchema: [
        {
          parameterId: "protected_area_m2",
          ordinal: 0,
          valueType: "decimal",
          unitId: "m2",
          titleRu: "Площадь защищаемого оборудования и пола",
          required: true,
          preliminaryCompilationAllowed: true,
          defaultValue: null,
          constraints: { min: 0.000001 },
          semanticParameterKey: "canonical-work:base:drywall:protected_area_m2",
          visibilityRole: "USER_INPUT",
          valueSourceRole: "PROJECT_DOCUMENTATION",
        },
        {
          parameterId: "area_m2",
          ordinal: 1,
          valueType: "decimal",
          unitId: "m2",
          titleRu: "Площадь существующего потолка из ГКЛ",
          required: true,
          preliminaryCompilationAllowed: true,
          defaultValue: null,
          constraints: { min: 0.000001 },
          semanticParameterKey: "canonical-work:base:drywall:area_m2",
          visibilityRole: "USER_INPUT",
          valueSourceRole: "USER_MEASURED",
        },
        {
          parameterId: "working_height_m",
          ordinal: 2,
          valueType: "decimal",
          unitId: "m",
          titleRu: "Рабочая высота",
          required: true,
          preliminaryCompilationAllowed: true,
          defaultValue: null,
          constraints: { min: 0.000001 },
          visibilityRole: "USER_INPUT",
          valueSourceRole: "PROJECT_DOCUMENTATION",
        },
      ],
    };
    expect(buildCanonicalBaselinePlan({
      catalog,
      prompt: "подготовка потолка из гипсокартона на большой площади 234 кв метра",
    })).toMatchObject({
      parameters: { area_m2: "234" },
      primaryMeasureParameterId: "area_m2",
    });
  });
});

describe("consumer canonical bulkhead frame preliminary handoff", () => {
  const bulkheadCatalog = (): CanonicalEstimateCatalogItem => {
    const parameterSchema: CanonicalEstimateCatalogItem["parameterSchema"] = [
      ["area_m2", "m2", 0],
      ["bulkhead_drop_height_m", "m", 1],
      ["end_face_area_m2", "m2", 2],
      ["horizontal_face_area_m2", "m2", 3],
      ["return_face_area_m2", "m2", 4],
      ["vertical_face_length_m", "m", 5],
      ["vertical_face_count", "item", 6],
      ["opening_area_m2", "m2", 7],
      ["perimeter_length_m", "m", 8],
    ].map(([parameterId, unitId, ordinal]) => ({
      parameterId: String(parameterId),
      ordinal: Number(ordinal),
      valueType: "decimal" as const,
      unitId: String(unitId),
      titleRu: String(parameterId),
      required: true,
      preliminaryCompilationAllowed: true,
      defaultValue: null,
      constraints: { min: 0.000001 },
      visibilityRole: "USER_INPUT" as const,
      valueSourceRole: "USER_MEASURED" as const,
    }));
    return {
      catalogId: R4_A13_BULKHEAD_FRAME_CATALOG_ID,
      releaseId: "00000000-0000-5000-8000-000000000013",
      namespace: "global",
      domain: "interior_finishes",
      workKey: "drywall_ceiling_bulkhead_frame_standard",
      titleRu: "Устройство каркаса потолочного короба",
      definitionVersion: 6,
      applicability: {},
      professionalMetadata: {},
      parameterSchema,
    };
  };

  it("keeps a bare or developed 50 m² as measured work area without inventing the horizontal face", () => {
    expect(buildCanonicalBaselinePlan({
      catalog: bulkheadCatalog(),
      prompt: "устройство каркаса потолочного короба из гипсокартона 50 кв метров",
    })).toMatchObject({
      parameters: { area_m2: "50" },
      primaryMeasureParameterId: "area_m2",
    });
    expect(buildCanonicalBaselinePlan({
      catalog: bulkheadCatalog(),
      prompt: "каркас потолочного короба, развёрнутая площадь 50 м²",
    }).parameters).toEqual({ area_m2: "50" });
  });

  it("maps each explicitly named face and dimension without merging them", () => {
    expect(buildCanonicalBaselinePlan({
      catalog: bulkheadCatalog(),
      prompt: "площадь нижней горизонтальной грани 30 м²; суммарная длина вертикальных граней 20 м; количество вертикальных граней 2; высота опуска 0,5 м; площадь торцов 2 м²; площадь возвратов и переходов 3 м²; площадь проёмов 1 м²; длина периметра и примыканий короба 40 м",
    })).toMatchObject({
      parameters: {
        area_m2: "54",
        horizontal_face_area_m2: "30",
        vertical_face_length_m: "20",
        vertical_face_count: "2",
        bulkhead_drop_height_m: "0.5",
        end_face_area_m2: "2",
        return_face_area_m2: "3",
        opening_area_m2: "1",
        perimeter_length_m: "40",
      },
      primaryMeasureParameterId: "area_m2",
    });
  });
});

describe("consumer canonical R6 asphalt admission handoff", () => {
  const asphaltCatalog = (): CanonicalEstimateCatalogItem => ({
    catalogId: "canonical-work:expanded:asphalt_concrete_pavement",
    releaseId: "00000000-0000-5000-8000-000000000016",
    namespace: "global",
    domain: "roadworks",
    workKey: "asphalt_concrete_pavement",
    titleRu: "Устройство асфальтобетонного дорожного покрытия",
    definitionVersion: 6,
    applicability: {},
    professionalMetadata: {},
    parameterSchema: [
      ["area_m2", "decimal", "m2", null],
      ["length_m", "decimal", "m", null],
      ["width_m", "decimal", "m", null],
      ["wearing_layer_thickness_mm", "decimal", "mm", null],
      ["asphalt_density_t_m3", "decimal", "t/m3", null],
      ["tack_coat_rate_l_m2", "decimal", "l/m2", null],
      ["project_scope", "enum", null, [
        "SURFACING_ONLY",
        "PAVEMENT_STRUCTURE",
        "FULL_ROAD_INFRASTRUCTURE",
        "REHABILITATION",
        "TURNKEY_PARKING_WITH_SITE_FEATURES",
      ]],
      ["estimate_scope_mode", "enum", null, [
        "MINIMAL_EXPLICIT_SCOPE",
        "FULL_APPLICABLE_SCOPE",
      ]],
      ["curb_required", "boolean", null, null],
      ["drainage_required", "boolean", null, null],
      ["marking_required", "boolean", null, null],
      ["signing_required", "boolean", null, null],
      ["lighting_required", "boolean", null, null],
      ["bridge_deck_package_required", "boolean", null, null],
      ["parking_geometry_required", "boolean", null, null],
    ].map(([parameterId, valueType, unitId, values], ordinal) => ({
      parameterId: String(parameterId),
      ordinal,
      valueType: valueType as "decimal" | "enum" | "boolean",
      unitId: unitId == null ? null : String(unitId),
      titleRu: String(parameterId),
      required: true,
      preliminaryCompilationAllowed: true,
      defaultValue: null,
      constraints: values ? { values } : { min: 0.001 },
      visibilityRole: "USER_INPUT" as const,
      valueSourceRole: "PROJECT_DOCUMENTATION" as const,
    })),
  });

  it("keeps the 15 km input while scope and width remain genuinely unresolved", () => {
    const plan = buildCanonicalBaselinePlan({
      catalog: asphaltCatalog(),
      prompt: "Построить автомобильную дорогу — 15 000 м",
    });

    expect(plan.primaryMeasureParameterId).toBe("length_m");
    expect(plan.parameters).toEqual({ length_m: 15_000 });
    expect(plan.parameters).not.toHaveProperty("area_m2");
    expect(plan.parameters).not.toHaveProperty("width_m");
    expect(plan.parameters).not.toHaveProperty("project_scope");
  });

  it("submits the saved scope and explicit geometry to the backend without hidden Wave A values", () => {
    const plan = buildCanonicalBaselinePlan({
      catalog: asphaltCatalog(),
      prompt: "Дорога: длина 15 000 м, ширина 7 м",
      selectedRoadScope: "FULL_PAVEMENT_STRUCTURE",
    });

    expect(plan.parameters).toEqual({
      length_m: 15_000,
      width_m: 7,
      project_scope: "PAVEMENT_STRUCTURE",
      estimate_scope_mode: "MINIMAL_EXPLICIT_SCOPE",
      curb_required: false,
      drainage_required: false,
      marking_required: false,
      signing_required: false,
      lighting_required: false,
      bridge_deck_package_required: false,
      parking_geometry_required: false,
    });
    expect(plan.parameters).not.toHaveProperty("wearing_layer_thickness_mm");
    expect(plan.parameters).not.toHaveProperty("asphalt_density_t_m3");
    expect(plan.parameters).not.toHaveProperty("tack_coat_rate_l_m2");
  });

  it("keeps 500 m² as user geometry and does not manufacture 61.8 t or 150 l inputs", () => {
    const plan = buildCanonicalBaselinePlan({
      catalog: asphaltCatalog(),
      prompt: "Ремонт асфальтового покрытия 500 м²",
      selectedRoadScope: "ROAD_REPAIR_REHABILITATION",
    });

    expect(plan.primaryMeasureParameterId).toBe("area_m2");
    expect(plan.parameters).toEqual({
      area_m2: 500,
      project_scope: "REHABILITATION",
      estimate_scope_mode: "MINIMAL_EXPLICIT_SCOPE",
      curb_required: false,
      drainage_required: false,
      marking_required: false,
      signing_required: false,
      lighting_required: false,
      bridge_deck_package_required: false,
      parking_geometry_required: false,
    });
    expect(Object.values(plan.parameters)).not.toContain(61.8);
    expect(Object.values(plan.parameters)).not.toContain(150);
  });

  it("turns on only explicit road-infrastructure child packages", () => {
    const plan = buildCanonicalBaselinePlan({
      catalog: asphaltCatalog(),
      prompt: "Дорога: длина 100 м, ширина 6 м",
      selectedRoadScope: "FULL_ROAD_INFRASTRUCTURE",
    });

    expect(plan.parameters).toMatchObject({
      project_scope: "FULL_ROAD_INFRASTRUCTURE",
      estimate_scope_mode: "MINIMAL_EXPLICIT_SCOPE",
      curb_required: true,
      drainage_required: true,
      marking_required: true,
      signing_required: true,
      lighting_required: true,
      bridge_deck_package_required: false,
      parking_geometry_required: false,
    });
  });

  it("recognizes the exact bridge profile and derives 6,400 m² from 200 by 32 metres", () => {
    const catalog = asphaltCatalog();
    catalog.catalogId = "canonical-work:expanded:bridge_asphalt";
    catalog.workKey = "bridge_asphalt";

    const plan = buildCanonicalBaselinePlan({
      catalog,
      prompt: "Устройство асфальтобетонного покрытия моста 200 метров длина и 32 метра ширина",
    });

    expect(plan.parameters).toMatchObject({
      length_m: 200,
      width_m: 32,
      area_m2: "6400",
    });
    expect(plan.primaryMeasureParameterId).toBe("area_m2");
  });

  it.each([
    ["Асфальтобетонное покрытие моста 200 × 3,2 м", 3.2, "640"],
    ["Асфальтобетонное покрытие моста: длина 200 м, ширина 30 м", 30, "6000"],
  ])("keeps every typed width digit and derives area for %s", (prompt, width, area) => {
    const catalog = asphaltCatalog();
    catalog.catalogId = "canonical-work:expanded:bridge_asphalt";
    catalog.workKey = "bridge_asphalt";

    const plan = buildCanonicalBaselinePlan({ catalog, prompt });

    expect(plan.parameters).toMatchObject({
      length_m: 200,
      width_m: width,
      area_m2: area,
    });
  });
});
