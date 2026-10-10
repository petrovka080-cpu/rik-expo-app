import fixture from "../../../data/estimate-benchmarks/r568-r4-a8-pump-station-acceptance.json";
import type { CanonicalEstimateCatalogItem } from "../../lib/estimate/backendPlatform/contracts";
import {
  R4_A6_PUMP_STATION_PARAMETERS,
  R4_A6_PUMP_STATION_PRIMARY_MEASURE_PARAMETER_ID,
} from "../../lib/estimate/r4A6PumpStationProfessional";
import {
  VVGNG_LS_POWER_CABLE_CATALOG_ID,
  VVGNG_LS_POWER_CABLE_PARAMETERS,
} from "../../lib/estimate/v4/vvgngLsPowerCableR1";
import {
  LED_LUMINAIRE_INSTALLATION_CATALOG_ID,
  LED_LUMINAIRE_INSTALLATION_PARAMETERS,
} from "../../lib/estimate/v4/ledLuminaireInstallationR1";
import {
  CIRCUIT_BREAKER_INSTALLATION_CATALOG_ID,
  CIRCUIT_BREAKER_INSTALLATION_PARAMETERS,
} from "../../lib/estimate/v4/circuitBreakerInstallationR1";
import {
  RESIDUAL_CURRENT_DEVICE_INSTALLATION_CATALOG_ID,
  RESIDUAL_CURRENT_DEVICE_INSTALLATION_PARAMETERS,
} from "../../lib/estimate/v4/residualCurrentDeviceInstallationR1";
import {
  CAT6_TWISTED_PAIR_CABLE_CATALOG_ID,
  CAT6_TWISTED_PAIR_CABLE_PARAMETERS,
} from "../../lib/estimate/v4/cat6TwistedPairCableR1";
import {
  OPTICAL_FIBER_SPLICING_CATALOG_ID,
  OPTICAL_FIBER_SPLICING_PARAMETERS,
} from "../../lib/estimate/v4/opticalFiberSplicingR1";
import {
  ADDRESSABLE_SMOKE_DETECTOR_CATALOG_ID,
  ADDRESSABLE_SMOKE_DETECTOR_PARAMETERS,
} from "../../lib/estimate/v4/addressableSmokeDetectorR1";
import {
  PUMP_UNIT_ALIGNMENT_CONNECTION_CATALOG_ID,
  PUMP_UNIT_ALIGNMENT_CONNECTION_PARAMETERS,
} from "../../lib/estimate/v4/pumpUnitAlignmentConnectionR1";
import {
  HOT_WATER_BOILER_PIPING_CATALOG_ID,
  HOT_WATER_BOILER_PIPING_PARAMETERS,
} from "../../lib/estimate/v4/hotWaterBoilerPipingR1";
import {
  INDUSTRIAL_STEEL_PIPE_BUTT_WELD_CATALOG_ID,
  INDUSTRIAL_STEEL_PIPE_BUTT_WELD_PARAMETERS,
} from "../../lib/estimate/v4/industrialSteelPipeButtWeldR1";
import {
  buildCanonicalBaselinePlan,
  extractUserQuantity,
  extractPromptOwnedProfessionalParameters,
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
  it("binds the route's measured quantity while ignoring the product diameter and technical section length", () => {
    const catalog: CanonicalEstimateCatalogItem = {
      ...pumpCatalog(), catalogId: "canonical-work:base:plumbing_interior_ppr_pipe_install_standard",
      workKey: "plumbing_interior_ppr_pipe_install_standard",
      applicability: { primaryMeasureParameterId: "route_length_m" },
      parameterSchema: [
        { parameterId: "route_length_m", ordinal: 0, valueType: "decimal", unitId: "m",
          titleRu: "Длина трассы трубопровода", required: true, defaultValue: null, constraints: { min: 0.001 },
          visibilityRole: "USER_INPUT", valueSourceRole: "USER_OR_PROJECT_MEASURED" },
        { parameterId: "pipe_section_length_m", ordinal: 1, valueType: "decimal", unitId: "m",
          titleRu: "Длина закупочного отрезка трубы", required: true, defaultValue: null, constraints: { min: 0.001 },
          visibilityRole: "USER_INPUT", valueSourceRole: "VISIBLE_NORMATIVE_OR_REPLACEABLE_PROFILE" },
        { parameterId: "straight_coupling_count", ordinal: 2, valueType: "integer", unitId: "pcs",
          titleRu: "Прямые муфты", required: true, defaultValue: null, constraints: { min: 0 },
          visibilityRole: "USER_INPUT", valueSourceRole: "USER_OR_PROJECT_MEASURED" },
      ],
    };
    const prompt = "Водопровод VALTEC PP-R 20 мм 100 м";
    expect(extractUserQuantity(prompt)).toEqual({ value: "100", unit: "m" });
    expect(buildCanonicalBaselinePlan({ catalog, prompt })).toMatchObject({
      parameters: { route_length_m: "100" }, primaryMeasureParameterId: "route_length_m",
    });
    expect(buildCanonicalBaselinePlan({ catalog, prompt }).parameters).not.toHaveProperty("pipe_section_length_m");
    expect(buildCanonicalBaselinePlan({ catalog, prompt: "Водопровод VALTEC PP-R 20 мм 10 шт." }).parameters)
      .not.toHaveProperty("straight_coupling_count");
    expect(buildCanonicalBaselinePlan({ catalog, prompt: "Доставка 2 т; водопровод VALTEC PP-R 20 мм 100 м" }).parameters)
      .toMatchObject({ route_length_m: "100" });
    const protectedCatalog: CanonicalEstimateCatalogItem = { ...catalog, parameterSchema: catalog.parameterSchema.map(p => ({ ...p,
      valueSourceRole: "MANDATORY_NORM_VALUE" })), };
    expect(buildCanonicalBaselinePlan({ catalog: protectedCatalog, prompt }).parameters).not.toHaveProperty("route_length_m");
  });

  it.each(["floors", "floor_count", "layer_count", "shift_count"])(
    "does not bind a product count to the secondary parameter %s",
    (secondaryId) => {
      const catalog: CanonicalEstimateCatalogItem = {
        ...pumpCatalog(), catalogId: "canonical-work:expanded:roof_lanterns",
        workKey: "roof_lanterns", domain: "facade_glazing", titleRu: "Кровельные световые фонари",
        parameterSchema: [
          { parameterId: "glazing_area_m2", ordinal: 0, valueType: "decimal", unitId: "m2",
            titleRu: "Площадь остекления", required: false, defaultValue: 5000, constraints: {} },
          { parameterId: secondaryId, ordinal: 1, valueType: "integer", unitId: "pcs",
            titleRu: "Количество этажей", required: false, defaultValue: 15, constraints: {} },
        ],
      };
      const plan = buildCanonicalBaselinePlan({ catalog, prompt: "кровельные световые фонари 10 штук" });
      expect(extractUserQuantity("кровельные световые фонари 10 штук")).toEqual({ value: "10", unit: "pcs" });
      expect(plan.parameters).not.toHaveProperty(secondaryId);
      expect(plan.parameters).not.toHaveProperty("glazing_area_m2");
      expect(plan.primaryMeasureParameterId).not.toBe(secondaryId);
    },
  );

  it.each([1, 10, 20])("keeps %i products in the authored product-count field", (count) => {
    const catalog: CanonicalEstimateCatalogItem = {
      ...pumpCatalog(), catalogId: "test:roof-lantern-count", workKey: "test_roof_lantern_count",
      parameterSchema: [
        { parameterId: "lantern_count", ordinal: 0, valueType: "integer", unitId: "pcs",
          titleRu: "Количество фонарей", required: true, defaultValue: null, constraints: { min: 1 } },
        { parameterId: "floors", ordinal: 1, valueType: "integer", unitId: "pcs",
          titleRu: "Количество этажей", required: false, defaultValue: null, constraints: {} },
      ],
    };
    const plan = buildCanonicalBaselinePlan({ catalog, prompt: `кровельные световые фонари ${count} штук` });
    expect(plan.parameters).toEqual({ lantern_count: String(count) });
    expect(plan.primaryMeasureParameterId).toBe("lantern_count");
  });

  it.each([
    ["Бетонирование основания — 20 m3", "20"],
    ["Бетонирование основания — 20 m³", "20"],
    ["Бетонирование основания — 20 м3", "20"],
    ["Бетонирование основания — 20 м³", "20"],
  ])("extracts a cubic-metre quantity from %s", (prompt, value) => {
    expect(extractUserQuantity(prompt)).toEqual({ value, unit: "m3" });
  });

  it.each(["5 000 м²", "5\u00a0000 м²", "15\u202f000 м"])(
    "keeps grouped thousands in %s as one quantity",
    (prompt) => {
      expect(extractUserQuantity(prompt)?.value).toBe(prompt.startsWith("5") ? "5000" : "15000");
    },
  );

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
  const geometryParameter = (
    parameterId: string,
    ordinal: number,
    required = true,
  ): CanonicalEstimateCatalogItem["parameterSchema"][number] => ({
    parameterId,
    ordinal,
    valueType: "decimal",
    unitId: parameterId.endsWith("_mm") ? "mm" : parameterId.endsWith("_m2") ? "m2" : parameterId.endsWith("_m3") ? "m3" : "m",
    titleRu: parameterId,
    required,
    defaultValue: null,
    constraints: { min: 0.001 },
    semanticParameterKey: parameterId,
    visibilityRole: "USER_INPUT",
    valueSourceRole: "USER_MEASURED",
    formulaConsumers: ["formula:geometry"],
  });

  it("maps explicitly labelled geometry through the selected schema", () => {
    expect(extractPromptOwnedProfessionalParameters([
      geometryParameter("total_axis_length_m", 0),
      geometryParameter("strip_width_m", 1),
      geometryParameter("strip_height_m", 2),
    ], "ленточный фундамент длиной 150 метров шириной 0,7 метра высотой 1,2 метра"))
      .toEqual({
        total_axis_length_m: "150",
        strip_width_m: "0.7",
        strip_height_m: "1.2",
      });
  });

  const twoAreaCatalog = (): CanonicalEstimateCatalogItem => ({
    ...pumpCatalog(), catalogId: "test:two-distinct-work-areas", workKey: "two_work_areas",
    applicability: { primaryMeasureParameterId: "paint_area_m2" },
    parameterSchema: [
      { ...geometryParameter("paint_area_m2", 0, false), preliminaryCompilationAllowed: true },
      { ...geometryParameter("facade_norm_area_m2", 1, false), preliminaryCompilationAllowed: true,
        valueSourceRole: "PROJECT_SPECIFIC_INPUT", provenance: { consumer_input_role_v1: "OBJECT_GEOMETRY" } },
    ],
  });

  it.each([
    "Окраска: площадь фасада без вычета проёмов 40 м2, площадь окраски 35,5 м2",
    "Окраска: площадь окраски 35,5 м², площадь фасада без вычета проёмов 40 м²",
    "Окраска: площадь 40 м2, площадь 35,5 м2",
  ])("leaves distinct generic areas unresolved rather than choosing the first in %s", prompt => {
    const plan = buildCanonicalBaselinePlan({ catalog: twoAreaCatalog(), prompt });
    expect(plan.parameters).toEqual({});
    expect(plan.primaryMeasureParameterId).toBe("paint_area_m2");
  });

  it.each(["Окраска 35,5 м2", "Окраска 35,5 м², обмер 035.500 m2"])(
    "keeps one distinct area only in the declared primary field: %s", prompt => {
      expect(buildCanonicalBaselinePlan({ catalog: twoAreaCatalog(), prompt }).parameters)
        .toEqual({ paint_area_m2: "35.5" });
    },
  );

  it("keeps explicit editor areas after ambiguous text and preserves another measured dimension", () => {
    const base = twoAreaCatalog();
    const catalog = { ...base, parameterSchema: [...base.parameterSchema, geometryParameter("work_height_m", 2, false)] };
    const prompt = "Окраска: площадь 40 м2, площадь 35,5 м2, высота 3 м";
    expect(buildCanonicalBaselinePlan({ catalog, prompt }).parameters).toEqual({ work_height_m: "3" });
    expect(buildCanonicalBaselinePlan({ catalog, prompt,
      parameterOverrides: { paint_area_m2: "35.5", facade_norm_area_m2: "40" } }).parameters)
      .toEqual({ work_height_m: "3", paint_area_m2: "35.5", facade_norm_area_m2: "40" });
  });

  it("leaves an explicitly labelled dimension unresolved when the schema target is ambiguous", () => {
    expect(extractPromptOwnedProfessionalParameters([
      geometryParameter("route_length_m", 0),
      geometryParameter("joint_length_m", 1),
      geometryParameter("strip_width_m", 2),
      geometryParameter("optional_height_m", 3, false),
    ], "длина 80 м, ширина 2 м, высота 3 м"))
      .toEqual({ strip_width_m: "2", optional_height_m: "3" });
  });

  it("keeps explicit optional geometry and converts compatible centimetres and millimetres", () => {
    expect(extractPromptOwnedProfessionalParameters([
      geometryParameter("optional_height_m", 0, false),
      geometryParameter("strip_width_m", 1),
    ], "высота 120 см, ширина 700 мм"))
      .toEqual({ optional_height_m: "1.2", strip_width_m: "0.7" });
  });

  it.each([
    ["слой 5 мм", "5"],
    ["слоем 5 мм", "5"],
    ["толщиной 5 мм", "5"],
    ["толщина слоя: 5 мм", "5"],
    ["слоем 0,5 см", "5"],
    ["слоем 0,29 см", "2.9"],
    ["толщина 0.005 м", "5"],
  ])("transfers an explicitly named layer thickness: %s", (description, expected) => {
    expect(extractPromptOwnedProfessionalParameters([
      geometryParameter("layer_thickness_mm", 0),
    ], `Шпаклёвка потолка CT126 35,5 м2, ${description}`))
      .toEqual({ layer_thickness_mm: expected });
  });

  it("does not assign thickness to a hidden or source-owned field", () => {
    const field = geometryParameter("layer_thickness_mm", 0);
    for (const guarded of [
      { ...field, visibilityRole: "INTERNAL_ONLY" as const },
      { ...field, valueSourceRole: "MANUFACTURER_CONFIRMED" as const },
      { ...field, parameterId: "derived_layer_thickness_mm" },
      { ...field, unitId: "m" },
      { ...field, provenance: { consumer_input_role_v1: "APPLICATION_TECHNICAL" } },
    ]) expect(extractPromptOwnedProfessionalParameters([guarded], "толщиной 5 мм"))
      .toEqual({});
  });

  it("leaves thickness unresolved for multiple targets or different layer values", () => {
    expect(extractPromptOwnedProfessionalParameters([
      geometryParameter("layer_thickness_mm", 0),
      geometryParameter("existing_screed_thickness_mm", 1),
    ], "толщина слоя 5 мм")).toEqual({});
    expect(extractPromptOwnedProfessionalParameters([
      geometryParameter("layer_thickness_mm", 0),
    ], "слой 5 мм, другой слой 7 мм")).toEqual({});
  });

  it("does not infer thickness from a product name or tile dimensions", () => {
    expect(extractPromptOwnedProfessionalParameters([
      geometryParameter("layer_thickness_mm", 0),
    ], "CT126 для потолка, плитка 600×600×5 мм")).toEqual({});
  });

  it.each(["мм2", "мм²", "ммк", "см2"])("does not treat %s as a linear thickness unit", unit => {
    expect(extractPromptOwnedProfessionalParameters([
      geometryParameter("layer_thickness_mm", 0),
    ], `слой 5 ${unit}`)).toEqual({});
  });

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

  it("submits only 500 m2 to the selected full P113 ceiling owner", () => {
    const parameterSchema: CanonicalEstimateCatalogItem["parameterSchema"] = ([
      ["area_m2", "m2", "USER_MEASURED"],
      ["room_length_m", "m", "PROJECT_DOCUMENTATION"],
      ["room_width_m", "m", "PROJECT_DOCUMENTATION"],
      ["control_joint_length_m", "m", "PROJECT_DOCUMENTATION"],
    ] as const).map(([parameterId, unitId, valueSourceRole], ordinal) => ({
      parameterId,
      ordinal,
      valueType: "decimal",
      unitId,
      titleRu: parameterId,
      required: true,
      preliminaryCompilationAllowed: true,
      defaultValue: null,
      constraints: { min: parameterId === "control_joint_length_m" ? 0 : 0.001 },
      visibilityRole: "USER_INPUT",
      valueSourceRole,
    }));
    const catalog: CanonicalEstimateCatalogItem = {
      catalogId:
        "canonical-work:base:drywall_ceiling_interior_drywall_ceiling_install_large_area",
      releaseId: "00000000-0000-5000-8000-000000000018",
      namespace: "global",
      domain: "interior_finishes",
      workKey: "drywall_ceiling_interior_drywall_ceiling_install_large_area",
      titleRu: "Полное устройство потолка КНАУФ П 113",
      definitionVersion: 12,
      applicability: {},
      professionalMetadata: {},
      parameterSchema,
    };

    expect(buildCanonicalBaselinePlan({
      catalog,
      prompt: "Полное устройство потолка из гипсокартона 500 м².",
    })).toMatchObject({
      parameters: { area_m2: "500" },
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

describe("consumer canonical complete bulkhead handoff", () => {
  it("routes the ordinary 50 m² request to the complete owner without inventing geometry", () => {
    const parameterSchema: CanonicalEstimateCatalogItem["parameterSchema"] = [
      ["area_m2", "m2", 0],
      ["bulkhead_length_m", "m", 1],
      ["bottom_face_width_m", "m", 2],
      ["side_face_height_m", "m", 3],
      ["support_point_count", "item", 4],
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
    const catalog: CanonicalEstimateCatalogItem = {
      catalogId:
        "canonical-work:base:drywall_ceiling_interior_bulkhead_install_standard",
      releaseId: "00000000-0000-5000-8000-000000000019",
      namespace: "global",
      domain: "interior_finishes",
      workKey: "drywall_ceiling_interior_bulkhead_install_standard",
      titleRu: "Полное устройство потолочного короба из гипсокартона",
      definitionVersion: 13,
      applicability: {},
      professionalMetadata: {},
      parameterSchema,
    };

    expect(buildCanonicalBaselinePlan({
      catalog,
      prompt: "Полное устройство потолочного короба из гипсокартона 50 м².",
    })).toMatchObject({
      parameters: { area_m2: "50" },
      primaryMeasureParameterId: "area_m2",
    });
  });
});

describe("consumer canonical VVGng-LS power-cable handoff", () => {
  it("keeps the 150 m route and exact cable identity without inventing project resources", () => {
    const catalog: CanonicalEstimateCatalogItem = {
      catalogId: VVGNG_LS_POWER_CABLE_CATALOG_ID,
      releaseId: "00000000-0000-5000-8000-000000000021",
      namespace: "global",
      domain: "electrical",
      workKey: "electrical_interior_vvg_cable_lay_standard",
      titleRu: "Прокладка силового кабеля ВВГнг(А)-LS 5×6 мм²",
      definitionVersion: 5,
      applicability: {},
      professionalMetadata: {},
      parameterSchema: VVGNG_LS_POWER_CABLE_PARAMETERS.map((parameter) => ({
        parameterId: parameter.parameter_id,
        ordinal: parameter.ordinal,
        valueType: parameter.value_type as
          CanonicalEstimateCatalogItem["parameterSchema"][number]["valueType"],
        unitId: parameter.unit_id,
        titleRu: parameter.title_ru,
        required: parameter.required,
        defaultValue: parameter.default_value,
        constraints: parameter.constraints_json ?? {},
        semanticParameterKey: String(
          parameter.truth_metadata.semantic_parameter_key ?? parameter.parameter_id,
        ),
        visibilityRole: parameter.truth_metadata.visibility_role as
          CanonicalEstimateCatalogItem["parameterSchema"][number]["visibilityRole"],
        valueSourceRole: parameter.truth_metadata.value_source_role as
          CanonicalEstimateCatalogItem["parameterSchema"][number]["valueSourceRole"],
        preliminaryCompilationAllowed:
          parameter.truth_metadata.preliminary_compilation_allowed === true,
      })),
    };

    const plan = buildCanonicalBaselinePlan({
      catalog,
      prompt: "Прокладка силового кабеля ВВГнг(А)-LS 5×6 мм², длина трассы 150 м.",
    });

    expect(plan.primaryMeasureParameterId).toBe("length_m");
    expect(plan.parameters).toEqual({
      length_m: "150",
      cable_mark: "ВВГнг(А)-LS",
      core_count: "5",
      conductor_area_mm2: "6",
    });
    expect(plan.parameters).not.toHaveProperty("cable_installation_labor_h");
    expect(plan.parameters).not.toHaveProperty("cable_expected_loss_ratio");
  });
});

describe("consumer canonical LED-luminaire installation handoff", () => {
  it("keeps the exact 30-piece luminaire scope without inventing project resources", () => {
    const catalog: CanonicalEstimateCatalogItem = {
      catalogId: LED_LUMINAIRE_INSTALLATION_CATALOG_ID,
      releaseId: "00000000-0000-5000-8000-000000000023",
      namespace: "global",
      domain: "electrical",
      workKey: "electrical_interior_lighting_install_standard",
      titleRu: "Монтаж накладного светодиодного светильника 36 Вт IP40",
      definitionVersion: 5,
      applicability: {},
      professionalMetadata: {},
      parameterSchema: LED_LUMINAIRE_INSTALLATION_PARAMETERS.map((parameter) => ({
        parameterId: parameter.parameter_id,
        ordinal: parameter.ordinal,
        valueType: parameter.value_type as
          CanonicalEstimateCatalogItem["parameterSchema"][number]["valueType"],
        unitId: parameter.unit_id,
        titleRu: parameter.title_ru,
        required: parameter.required,
        defaultValue: parameter.default_value,
        constraints: parameter.constraints_json ?? {},
        semanticParameterKey: String(
          parameter.truth_metadata.semantic_parameter_key ?? parameter.parameter_id,
        ),
        visibilityRole: parameter.truth_metadata.visibility_role as
          CanonicalEstimateCatalogItem["parameterSchema"][number]["visibilityRole"],
        valueSourceRole: parameter.truth_metadata.value_source_role as
          CanonicalEstimateCatalogItem["parameterSchema"][number]["valueSourceRole"],
        preliminaryCompilationAllowed:
          parameter.truth_metadata.preliminary_compilation_allowed === true,
      })),
    };

    const plan = buildCanonicalBaselinePlan({
      catalog,
      prompt: "Монтаж 30 накладных LED-светильников 36 Вт IP40, накладной монтаж.",
    });

    expect(plan.primaryMeasureParameterId).toBe("luminaire_count");
    expect(plan.parameters).toEqual({
      luminaire_count: "30",
      rated_power: "36_W",
      ingress_protection: "IP40",
      mounting_type: "SURFACE",
    });
    expect(plan.parameters).not.toHaveProperty("luminaire_installation_labor_h");
    expect(plan.parameters).not.toHaveProperty("luminaire_retained_spare_piece");
  });
});

describe("consumer canonical circuit-breaker installation handoff", () => {
  it("keeps only the explicitly selected device facts and count", () => {
    const catalog: CanonicalEstimateCatalogItem = {
      catalogId: CIRCUIT_BREAKER_INSTALLATION_CATALOG_ID,
      releaseId: "00000000-0000-5000-8000-000000000025",
      namespace: "global",
      domain: "electrical",
      workKey: "electrical_interior_breaker_install_standard",
      titleRu: "Монтаж автоматического выключателя на существующей DIN-рейке",
      definitionVersion: 4,
      applicability: {},
      professionalMetadata: {},
      parameterSchema: CIRCUIT_BREAKER_INSTALLATION_PARAMETERS.map((parameter) => ({
        parameterId: parameter.parameter_id,
        ordinal: parameter.ordinal,
        valueType: parameter.value_type as
          CanonicalEstimateCatalogItem["parameterSchema"][number]["valueType"],
        unitId: parameter.unit_id,
        titleRu: parameter.title_ru,
        required: parameter.required,
        defaultValue: parameter.default_value,
        constraints: parameter.constraints_json ?? {},
        semanticParameterKey: String(
          parameter.truth_metadata.semantic_parameter_key ?? parameter.parameter_id,
        ),
        visibilityRole: parameter.truth_metadata.visibility_role as
          CanonicalEstimateCatalogItem["parameterSchema"][number]["visibilityRole"],
        valueSourceRole: parameter.truth_metadata.value_source_role as
          CanonicalEstimateCatalogItem["parameterSchema"][number]["valueSourceRole"],
        preliminaryCompilationAllowed:
          parameter.truth_metadata.preliminary_compilation_allowed === true,
      })),
    };

    const plan = buildCanonicalBaselinePlan({
      catalog,
      prompt: "Установить 12 шт. автоматических выключателей, модель IEK BA47-29, 1P C16, 6 kA, 230 V, на существующую DIN-рейку.",
    });

    expect(plan.primaryMeasureParameterId).toBe("breaker_count");
    expect(plan.parameters).toEqual({
      breaker_count: "12",
      breaker_product_designation: "IEK BA47-29",
      pole_configuration: "1P",
      trip_curve: "C",
      rated_current_a: "16",
      breaking_capacity_ka: "6",
      rated_voltage_v: "230",
      mounting_system: "EXISTING_DIN_RAIL",
    });
    expect(plan.parameters).not.toHaveProperty("selection_basis_reference");
    expect(plan.parameters).not.toHaveProperty("breaker_installation_labor_h");
    expect(plan.parameters).not.toHaveProperty("breaker_retained_spare_piece");
  });
});

describe("consumer canonical residual-current-device installation handoff", () => {
  it("keeps only the explicitly selected RCCB facts and count", () => {
    const catalog: CanonicalEstimateCatalogItem = {
      catalogId: RESIDUAL_CURRENT_DEVICE_INSTALLATION_CATALOG_ID,
      releaseId: "00000000-0000-5000-8000-000000000026",
      namespace: "global",
      domain: "electrical",
      workKey: "electrical_interior_rcd_install_standard",
      titleRu: "Монтаж выбранного УЗО на существующей DIN-рейке",
      definitionVersion: 4,
      applicability: {},
      professionalMetadata: {},
      parameterSchema: RESIDUAL_CURRENT_DEVICE_INSTALLATION_PARAMETERS.map((parameter) => ({
        parameterId: parameter.parameter_id,
        ordinal: parameter.ordinal,
        valueType: parameter.value_type as
          CanonicalEstimateCatalogItem["parameterSchema"][number]["valueType"],
        unitId: parameter.unit_id,
        titleRu: parameter.title_ru,
        required: parameter.required,
        defaultValue: parameter.default_value,
        constraints: parameter.constraints_json ?? {},
        semanticParameterKey: String(
          parameter.truth_metadata.semantic_parameter_key ?? parameter.parameter_id,
        ),
        visibilityRole: parameter.truth_metadata.visibility_role as
          CanonicalEstimateCatalogItem["parameterSchema"][number]["visibilityRole"],
        valueSourceRole: parameter.truth_metadata.value_source_role as
          CanonicalEstimateCatalogItem["parameterSchema"][number]["valueSourceRole"],
        preliminaryCompilationAllowed:
          parameter.truth_metadata.preliminary_compilation_allowed === true,
      })),
    };

    const plan = buildCanonicalBaselinePlan({
      catalog,
      prompt: "Установить 8 шт. УЗО, модель ABB F202, RCCB 2P 40 A, 30 mA, тип A, 230 V, на существующую DIN-рейку.",
    });

    expect(plan.primaryMeasureParameterId).toBe("rcd_count");
    expect(plan.parameters).toEqual({
      rcd_count: "8",
      rcd_product_designation: "ABB F202",
      rcd_device_type: "RCCB",
      pole_configuration: "2P",
      rated_current_a: "40",
      rated_residual_current_ma: "30",
      residual_current_type: "A",
      rated_voltage_v: "230",
      mounting_system: "EXISTING_DIN_RAIL",
    });
    expect(plan.parameters).not.toHaveProperty("selection_basis_reference");
    expect(plan.parameters).not.toHaveProperty("rcd_installation_labor_h");
    expect(plan.parameters).not.toHaveProperty("rcd_retained_spare_piece");
  });
});

describe("consumer canonical addressable smoke-detector handoff", () => {
  it("keeps selected detector and base identity without inventing project resources", () => {
    const catalog: CanonicalEstimateCatalogItem = {
      catalogId: ADDRESSABLE_SMOKE_DETECTOR_CATALOG_ID,
      releaseId: "00000000-0000-5000-8000-000000000027",
      namespace: "global",
      domain: "fire_alarm",
      workKey: "electrical_interior_fire_alarm_install_standard",
      titleRu: "Монтаж адресного дымового извещателя с базой",
      definitionVersion: 5,
      applicability: {},
      professionalMetadata: {},
      parameterSchema: ADDRESSABLE_SMOKE_DETECTOR_PARAMETERS.map((parameter) => ({
        parameterId: parameter.parameter_id,
        ordinal: parameter.ordinal,
        valueType: parameter.value_type as
          CanonicalEstimateCatalogItem["parameterSchema"][number]["valueType"],
        unitId: parameter.unit_id,
        titleRu: parameter.title_ru,
        required: parameter.required,
        defaultValue: parameter.default_value,
        constraints: parameter.constraints_json ?? {},
        semanticParameterKey: String(
          parameter.truth_metadata.semantic_parameter_key ?? parameter.parameter_id,
        ),
        visibilityRole: parameter.truth_metadata.visibility_role as
          CanonicalEstimateCatalogItem["parameterSchema"][number]["visibilityRole"],
        valueSourceRole: parameter.truth_metadata.value_source_role as
          CanonicalEstimateCatalogItem["parameterSchema"][number]["valueSourceRole"],
        preliminaryCompilationAllowed:
          parameter.truth_metadata.preliminary_compilation_allowed === true,
      })),
    };

    const plan = buildCanonicalBaselinePlan({
      catalog,
      prompt: "Установить 25 шт. адресных оптико-электронных дымовых извещателей, модель извещателя DET-A25-OPT, модель базы BASE-A25.",
    });

    expect(plan.primaryMeasureParameterId).toBe("detector_count");
    expect(plan.parameters).toEqual({
      detector_count: "25",
      detector_type: "ADDRESSABLE_OPTICAL_SMOKE",
      base_type: "MATCHED_ADDRESSABLE_DETECTOR_BASE",
      detector_product_designation: "DET-A25-OPT",
      base_product_designation: "BASE-A25",
    });
    expect(plan.parameters).not.toHaveProperty("fastener_quantity_set");
    expect(plan.parameters).not.toHaveProperty("detector_installation_labor_h");
    expect(plan.parameters).not.toHaveProperty("detector_retained_spare_piece");
  });
});

describe("consumer canonical pump-unit installation handoff", () => {
  it("keeps selected pump, count and passport duty without inventing project resources", () => {
    const catalog: CanonicalEstimateCatalogItem = {
      catalogId: PUMP_UNIT_ALIGNMENT_CONNECTION_CATALOG_ID,
      releaseId: "00000000-0000-5000-8000-000000000028",
      namespace: "global",
      domain: "plumbing",
      workKey: "plumbing_interior_pump_install_standard",
      titleRu: "Монтаж, центровка и подключение насосного агрегата на раме",
      definitionVersion: 5,
      applicability: {},
      professionalMetadata: {},
      parameterSchema: PUMP_UNIT_ALIGNMENT_CONNECTION_PARAMETERS.map((parameter) => ({
        parameterId: parameter.parameter_id,
        ordinal: parameter.ordinal,
        valueType: parameter.value_type as
          CanonicalEstimateCatalogItem["parameterSchema"][number]["valueType"],
        unitId: parameter.unit_id,
        titleRu: parameter.title_ru,
        required: parameter.required,
        defaultValue: parameter.default_value,
        constraints: parameter.constraints_json ?? {},
        semanticParameterKey: String(
          parameter.truth_metadata.semantic_parameter_key ?? parameter.parameter_id,
        ),
        visibilityRole: parameter.truth_metadata.visibility_role as
          CanonicalEstimateCatalogItem["parameterSchema"][number]["visibilityRole"],
        valueSourceRole: parameter.truth_metadata.value_source_role as
          CanonicalEstimateCatalogItem["parameterSchema"][number]["valueSourceRole"],
        preliminaryCompilationAllowed:
          parameter.truth_metadata.preliminary_compilation_allowed === true,
      })),
    };

    const plan = buildCanonicalBaselinePlan({
      catalog,
      prompt: "Смонтировать 2 насосных агрегата, модель PUMP-Q45-H55, на раме, Q=45 м3/ч, H=55 м.",
    });

    expect(plan.primaryMeasureParameterId).toBe("pump_count");
    expect(plan.parameters).toEqual({
      pump_count: "2",
      pump_unit_product_designation: "PUMP-Q45-H55",
      design_flow_m3_h: "45",
      design_head_m: "55",
      pump_configuration: "PUMP_MOTOR_ON_BASEFRAME",
    });
    expect(plan.parameters).not.toHaveProperty("anchor_set_quantity");
    expect(plan.parameters).not.toHaveProperty("pump_installation_alignment_labor_h");
    expect(plan.parameters).not.toHaveProperty("pump_retained_spare_set");
  });
});

describe("consumer canonical hot-water boiler piping handoff", () => {
  it("keeps selected boiler, burner and passport duty without inventing project resources", () => {
    const catalog: CanonicalEstimateCatalogItem = {
      catalogId: HOT_WATER_BOILER_PIPING_CATALOG_ID,
      releaseId: "00000000-0000-5000-8000-000000000029",
      namespace: "global",
      domain: "heating",
      workKey: "hot_water_boiler_piping",
      titleRu: "Монтаж и обвязка водогрейного котла 500 кВт на природном газе",
      definitionVersion: 7,
      applicability: {},
      professionalMetadata: {},
      parameterSchema: HOT_WATER_BOILER_PIPING_PARAMETERS.map((parameter) => ({
        parameterId: parameter.parameter_id,
        ordinal: parameter.ordinal,
        valueType: parameter.value_type as
          CanonicalEstimateCatalogItem["parameterSchema"][number]["valueType"],
        unitId: parameter.unit_id,
        titleRu: parameter.title_ru,
        required: parameter.required,
        defaultValue: parameter.default_value,
        constraints: parameter.constraints_json ?? {},
        semanticParameterKey: String(
          parameter.truth_metadata.semantic_parameter_key ?? parameter.parameter_id,
        ),
        visibilityRole: parameter.truth_metadata.visibility_role as
          CanonicalEstimateCatalogItem["parameterSchema"][number]["visibilityRole"],
        valueSourceRole: parameter.truth_metadata.value_source_role as
          CanonicalEstimateCatalogItem["parameterSchema"][number]["valueSourceRole"],
        preliminaryCompilationAllowed:
          parameter.truth_metadata.preliminary_compilation_allowed === true,
      })),
    };

    const plan = buildCanonicalBaselinePlan({
      catalog,
      prompt: "Смонтировать и обвязать 1 водогрейный котёл, модель котла BOILER-500-NG, 500 кВт, природный газ, отдельная модулируемая газовая горелка, модель горелки BURNER-500-MOD.",
    });

    expect(plan.primaryMeasureParameterId).toBe("boiler_count");
    expect(plan.parameters).toEqual({
      boiler_count: "1",
      thermal_power_kw: "500",
      fuel_type: "NATURAL_GAS",
      burner_configuration: "SEPARATE_MODULATING_GAS_BURNER",
      boiler_product_designation: "BOILER-500-NG",
      burner_product_designation: "BURNER-500-MOD",
    });
    expect(plan.parameters).not.toHaveProperty("flange_set_quantity");
    expect(plan.parameters).not.toHaveProperty("boiler_installation_piping_labor_h");
    expect(plan.parameters).not.toHaveProperty("boiler_retained_spare_set");
  });
});

describe("consumer canonical industrial steel pipe butt-weld handoff", () => {
  it("keeps joint geometry, steel and selected WPS without inventing project resources", () => {
    const catalog: CanonicalEstimateCatalogItem = {
      catalogId: INDUSTRIAL_STEEL_PIPE_BUTT_WELD_CATALOG_ID,
      releaseId: "00000000-0000-5000-8000-000000000030",
      namespace: "global",
      domain: "process_piping",
      workKey: "industrial_steel_pipe_butt_weld",
      titleRu: "Сварка стыка стального технологического трубопровода",
      definitionVersion: 5,
      applicability: {},
      professionalMetadata: {},
      parameterSchema: INDUSTRIAL_STEEL_PIPE_BUTT_WELD_PARAMETERS.map((parameter) => ({
        parameterId: parameter.parameter_id,
        ordinal: parameter.ordinal,
        valueType: parameter.value_type as
          CanonicalEstimateCatalogItem["parameterSchema"][number]["valueType"],
        unitId: parameter.unit_id,
        titleRu: parameter.title_ru,
        required: parameter.required,
        defaultValue: parameter.default_value,
        constraints: parameter.constraints_json ?? {},
        semanticParameterKey: String(
          parameter.truth_metadata.semantic_parameter_key ?? parameter.parameter_id,
        ),
        visibilityRole: parameter.truth_metadata.visibility_role as
          CanonicalEstimateCatalogItem["parameterSchema"][number]["visibilityRole"],
        valueSourceRole: parameter.truth_metadata.value_source_role as
          CanonicalEstimateCatalogItem["parameterSchema"][number]["valueSourceRole"],
        preliminaryCompilationAllowed:
          parameter.truth_metadata.preliminary_compilation_allowed === true,
      })),
    };

    const plan = buildCanonicalBaselinePlan({
      catalog,
      prompt: "Сварить 16 стыков трубы Ø219×8 мм, сталь 09Г2С, WPS WPS-219-GMAW.",
    });

    expect(plan.primaryMeasureParameterId).toBe("joint_count");
    expect(plan.parameters).toEqual({
      joint_count: "16",
      outside_diameter_mm: "219",
      wall_thickness_mm: "8",
      steel_grade: "09Г2С",
      welding_procedure_designation: "WPS-219-GMAW",
    });
    expect(plan.parameters).not.toHaveProperty("welding_wire_mass_kg");
    expect(plan.parameters).not.toHaveProperty("weld_fitup_labor_h");
    expect(plan.parameters).not.toHaveProperty("welding_wire_retained_reserve_kg");
  });
});

describe("consumer canonical Cat.6 cable handoff", () => {
  it("keeps route length, line count and cable identity without inventing project resources", () => {
    const catalog: CanonicalEstimateCatalogItem = {
      catalogId: CAT6_TWISTED_PAIR_CABLE_CATALOG_ID,
      releaseId: "00000000-0000-5000-8000-000000000024",
      namespace: "global",
      domain: "telecom",
      workKey: "site_telecom_connection",
      titleRu: "Прокладка кабеля U/UTP Cat.6, 4 пары, LSZH",
      definitionVersion: 4,
      applicability: {},
      professionalMetadata: {},
      parameterSchema: CAT6_TWISTED_PAIR_CABLE_PARAMETERS.map((parameter) => ({
        parameterId: parameter.parameter_id,
        ordinal: parameter.ordinal,
        valueType: parameter.value_type as
          CanonicalEstimateCatalogItem["parameterSchema"][number]["valueType"],
        unitId: parameter.unit_id,
        titleRu: parameter.title_ru,
        required: parameter.required,
        defaultValue: parameter.default_value,
        constraints: parameter.constraints_json ?? {},
        semanticParameterKey: String(
          parameter.truth_metadata.semantic_parameter_key ?? parameter.parameter_id,
        ),
        visibilityRole: parameter.truth_metadata.visibility_role as
          CanonicalEstimateCatalogItem["parameterSchema"][number]["visibilityRole"],
        valueSourceRole: parameter.truth_metadata.value_source_role as
          CanonicalEstimateCatalogItem["parameterSchema"][number]["valueSourceRole"],
        preliminaryCompilationAllowed:
          parameter.truth_metadata.preliminary_compilation_allowed === true,
      })),
    };

    const plan = buildCanonicalBaselinePlan({
      catalog,
      prompt: "Прокладка 300 м кабеля U/UTP Cat.6 LSZH для 12 линий.",
    });

    expect(plan.primaryMeasureParameterId).toBe("length_m");
    expect(plan.parameters).toEqual({
      length_m: "300",
      line_count: "12",
      cable_type: "U_UTP_CAT6_4PAIR_LSZH",
    });
    expect(plan.parameters).not.toHaveProperty("cat6_installation_labor_h");
    expect(plan.parameters).not.toHaveProperty("cable_expected_loss_ratio");
  });
});

describe("consumer canonical optical-fiber splicing handoff", () => {
  it("keeps the splice count and fiber standard without inventing consumables or labor", () => {
    const catalog: CanonicalEstimateCatalogItem = {
      catalogId: OPTICAL_FIBER_SPLICING_CATALOG_ID,
      releaseId: "00000000-0000-5000-8000-000000000025",
      namespace: "global",
      domain: "telecom",
      workKey: "fiber_optic_connection",
      titleRu: "Сварка оптических волокон SM G.652D с измерением затухания",
      definitionVersion: 4,
      applicability: {},
      professionalMetadata: {},
      parameterSchema: OPTICAL_FIBER_SPLICING_PARAMETERS.map((parameter) => ({
        parameterId: parameter.parameter_id,
        ordinal: parameter.ordinal,
        valueType: parameter.value_type as
          CanonicalEstimateCatalogItem["parameterSchema"][number]["valueType"],
        unitId: parameter.unit_id,
        titleRu: parameter.title_ru,
        required: parameter.required,
        defaultValue: parameter.default_value,
        constraints: parameter.constraints_json ?? {},
        semanticParameterKey: String(
          parameter.truth_metadata.semantic_parameter_key ?? parameter.parameter_id,
        ),
        visibilityRole: parameter.truth_metadata.visibility_role as
          CanonicalEstimateCatalogItem["parameterSchema"][number]["visibilityRole"],
        valueSourceRole: parameter.truth_metadata.value_source_role as
          CanonicalEstimateCatalogItem["parameterSchema"][number]["valueSourceRole"],
        preliminaryCompilationAllowed:
          parameter.truth_metadata.preliminary_compilation_allowed === true,
      })),
    };

    const plan = buildCanonicalBaselinePlan({
      catalog,
      prompt: "Сварка оптических волокон: количество 48 шт, волокно SM G.652D.",
    });

    expect(plan.primaryMeasureParameterId).toBe("splice_count");
    expect(plan.parameters).toEqual({
      splice_count: "48",
      fiber_standard: "SM_G652D",
    });
    expect(plan.parameters).not.toHaveProperty("fiber_splicing_labor_h");
    expect(plan.parameters).not.toHaveProperty("sleeve_expected_waste_piece");
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

  const bridgeAsphaltCatalog = (): CanonicalEstimateCatalogItem => {
    const catalog = asphaltCatalog();
    catalog.catalogId = "canonical-work:expanded:bridge_asphalt";
    catalog.workKey = "bridge_asphalt";
    catalog.parameterSchema = catalog.parameterSchema.map((parameter) => ({
      ...parameter,
      parameterId: parameter.parameterId === "length_m"
        ? "bridge_length_m"
        : parameter.parameterId === "width_m"
          ? "bridge_width_m"
          : parameter.parameterId,
      valueSourceRole: ["length_m", "width_m"].includes(parameter.parameterId)
        ? "USER_MEASURED"
        : parameter.valueSourceRole,
    }));
    return catalog;
  };

  const asphaltLevelCatalog = (): CanonicalEstimateCatalogItem => ({
    catalogId:
      "canonical-work:base:paving_roads_landscape_interior_asphalt_level_small_area",
    releaseId: "00000000-0000-5000-8000-000000000017",
    namespace: "global",
    domain: "roadworks",
    workKey: "paving_roads_landscape_interior_asphalt_level_small_area",
    titleRu: "Выравнивание асфальтового покрытия на малой площади",
    definitionVersion: 12,
    applicability: {},
    professionalMetadata: {},
    parameterSchema: [
      {
        parameterId: "area_m2",
        ordinal: 0,
        valueType: "decimal",
        unitId: "m2",
        titleRu: "Площадь выравниваемого участка",
        required: true,
        preliminaryCompilationAllowed: true,
        defaultValue: null,
        constraints: { min: 0.001 },
        visibilityRole: "USER_INPUT",
        valueSourceRole: "USER_MEASURED",
      },
      {
        parameterId: "layer_thickness_mm",
        ordinal: 1,
        valueType: "decimal",
        unitId: "mm",
        titleRu: "Общая толщина выравнивающего слоя",
        required: true,
        preliminaryCompilationAllowed: true,
        defaultValue: null,
        constraints: { min: 30, max: 200, multipleOf: 5 },
        visibilityRole: "USER_INPUT",
        valueSourceRole: "USER_MEASURED",
      },
    ],
  });

  const asphaltCompactionCatalog = (): CanonicalEstimateCatalogItem => ({
    catalogId:
      "canonical-work:base:paving_roads_landscape_interior_asphalt_compact_large_area",
    releaseId: "00000000-0000-5000-8000-000000000020",
    namespace: "global",
    domain: "roadworks",
    workKey: "paving_roads_landscape_interior_asphalt_compact_large_area",
    titleRu: "Уплотнение уже уложенного асфальтового покрытия большой площади",
    definitionVersion: 8,
    applicability: {},
    professionalMetadata: {},
    parameterSchema: [{
      parameterId: "area_m2",
      ordinal: 0,
      valueType: "decimal",
      unitId: "m2",
      titleRu: "Площадь уплотняемого покрытия",
      required: true,
      preliminaryCompilationAllowed: true,
      defaultValue: null,
      constraints: { min: 0.001 },
      visibilityRole: "USER_INPUT",
      valueSourceRole: "USER_MEASURED",
    }],
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

  it("routes only the measured area to the standalone 5000 m² compaction owner", () => {
    const plan = buildCanonicalBaselinePlan({
      catalog: asphaltCompactionCatalog(),
      prompt: "Только уплотнение уже уложенного асфальта 5 000 м².",
    });

    expect(plan.primaryMeasureParameterId).toBe("area_m2");
    expect(plan.parameters).toEqual({ area_m2: "5000" });
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

  it("routes the ordinary 900 m2 by 50 mm paving request without inventing plan geometry", () => {
    const plan = buildCanonicalBaselinePlan({
      catalog: asphaltCatalog(),
      prompt: "Устройство асфальтобетонного покрытия 900 м², верхний слой 50 мм.",
    });

    expect(plan.primaryMeasureParameterId).toBe("area_m2");
    expect(plan.parameters).toMatchObject({
      area_m2: 900,
      wearing_layer_thickness_mm: 50,
    });
    expect(plan.parameters).not.toHaveProperty("length_m");
    expect(plan.parameters).not.toHaveProperty("width_m");
  });

  it("routes the MASTER 900 m2 x 50 mm shorthand to the same explicit inputs", () => {
    const plan = buildCanonicalBaselinePlan({
      catalog: asphaltCatalog(),
      prompt: "Устройство асфальтобетонного покрытия 900 м² × 50 мм.",
    });

    expect(plan.parameters).toMatchObject({
      area_m2: 900,
      wearing_layer_thickness_mm: 50,
    });
    expect(plan.parameters).not.toHaveProperty("length_m");
    expect(plan.parameters).not.toHaveProperty("width_m");
  });

  it("keeps a non-default 70 mm upper layer from ordinary text", () => {
    const plan = buildCanonicalBaselinePlan({
      catalog: asphaltCatalog(),
      prompt: "Устройство асфальтобетонного покрытия 900 м², верхний слой 70 мм.",
    });

    expect(plan.parameters).toMatchObject({
      area_m2: 900,
      wearing_layer_thickness_mm: 70,
    });
    expect(plan.parameters).not.toHaveProperty("asphalt_layer_2_thickness_mm");
  });

  it("keeps the 100 m2 leveling request free of an invented layer thickness", () => {
    const plan = buildCanonicalBaselinePlan({
      catalog: asphaltLevelCatalog(),
      prompt: "Выравнивание асфальтового покрытия 100 м².",
    });

    expect(plan.primaryMeasureParameterId).toBe("area_m2");
    expect(plan.parameters).toEqual({ area_m2: "100" });
  });

  it("submits the leveling thickness only when the user states it", () => {
    const plan = buildCanonicalBaselinePlan({
      catalog: asphaltLevelCatalog(),
      prompt: "Выравнивание асфальтового покрытия 100 м² толщиной 100 мм.",
    });

    expect(plan.parameters).toEqual({
      area_m2: "100",
      layer_thickness_mm: "100",
    });
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
    const catalog = bridgeAsphaltCatalog();

    const plan = buildCanonicalBaselinePlan({
      catalog,
      prompt: "Устройство асфальтобетонного покрытия моста 200 метров длина и 32 метра ширина",
    });

    expect(plan.parameters).toMatchObject({
      bridge_length_m: 200,
      bridge_width_m: 32,
      area_m2: "6400",
    });
    expect(plan.primaryMeasureParameterId).toBe("area_m2");
  });

  it.each([
    ["Асфальтобетонное покрытие моста 200 × 3,2 м", 3.2, "640"],
    ["Асфальтобетонное покрытие моста: длина 200 м, ширина 30 м", 30, "6000"],
  ])("keeps every typed width digit and derives area for %s", (prompt, width, area) => {
    const catalog = bridgeAsphaltCatalog();

    const plan = buildCanonicalBaselinePlan({ catalog, prompt });

    expect(plan.parameters).toMatchObject({
      bridge_length_m: 200,
      bridge_width_m: width,
      area_m2: area,
    });
  });
});
