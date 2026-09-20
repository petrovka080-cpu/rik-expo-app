import {
  buildCanonicalBaselinePlan,
  extractPromptOwnedProfessionalParameters,
} from
  "../../src/features/consumerRepair/consumerCanonicalBaselineCompile";
import type { CanonicalEstimateCatalogItem } from
  "../../src/lib/estimate/backendPlatform/contracts";

function schema(parameterIds: readonly string[]): CanonicalEstimateCatalogItem["parameterSchema"] {
  return parameterIds.map((parameterId, ordinal) => ({
    parameterId,
    ordinal,
    valueType: "text",
    unitId: null,
    titleRu: parameterId,
    required: false,
    defaultValue: null,
    constraints: {},
    semanticParameterKey: parameterId,
    visibilityRole: "USER_INPUT",
    valueSourceRole: "PROJECT_DOCUMENTATION",
    normativeLinks: [],
    formulaConsumers: [],
    resourceBranchConsumers: [],
    validationRules: [],
    provenance: {},
  })) as CanonicalEstimateCatalogItem["parameterSchema"];
}

describe("MASTER-30 shared prompt-owned professional parameter ingress", () => {
  test("adapts the explicit drainage route length to the selected successor schema", () => {
    const parameterSchema = schema(["length_m", "load_class"]).map((parameter, ordinal) => ({
      ...parameter,
      ordinal,
      valueType: ordinal === 0 ? "decimal" as const : "text" as const,
      unitId: ordinal === 0 ? "m" : null,
      formulaConsumers: ordinal === 0 ? ["drainage_channel_install_length_v1"] : [],
    }));
    const catalog = {
      catalogId: "canonical-work:base:paving_roads_landscape_interior_asphalt_drain_large_area",
      workKey: "surface_drainage_channel",
      parameterSchema,
    } as unknown as CanonicalEstimateCatalogItem;

    expect(buildCanonicalBaselinePlan({
      catalog,
      prompt: "Монтаж водоотводного лотка с решёткой, длина 80 м, класс нагрузки D400",
    })).toMatchObject({
      parameters: { length_m: "80", load_class: "D400" },
      primaryMeasureParameterId: "length_m",
    });
  });

  test("extracts the explicitly stated total installed steel mass", () => {
    expect(extractPromptOwnedProfessionalParameters(
      schema(["element_count_piece", "total_installed_mass_t"]),
      "Монтаж и выверка стальных колонн и балок, количество 30 шт., общая масса 30 т",
    )).toEqual({ element_count_piece: "30", total_installed_mass_t: "30" });
  });

  test("extracts named pile geometry without inventing absent concrete or reinforcement grades", () => {
    const result = extractPromptOwnedProfessionalParameters(
      schema([
        "pile_count", "pile_diameter_mm", "pile_length_m", "concrete_class",
        "watertightness", "frost_resistance", "mobility", "reinforcement_class",
      ]),
      "Устройство буронабивных железобетонных свай, количество 12 шт., диаметр 600 мм, длина 12 м",
    );

    expect(result).toEqual({ pile_count: "12", pile_diameter_mm: "600", pile_length_m: "12" });
  });

  test("preserves explicit concrete specification and pump method over a visible baseline", () => {
    expect(extractPromptOwnedProfessionalParameters(
      schema(["concrete_class", "watertightness", "frost_resistance", "mobility", "placement_method"]),
      "Бетонирование 24 м³, бетон B25 W8 F150 П4, подача бетононасосом",
    )).toEqual({
      concrete_class: "B25",
      watertightness: "W8",
      frost_resistance: "F150",
      mobility: "P4",
      placement_method: "pump",
    });
  });

  test("extracts pipe identity, route geometry and filter facts only when named", () => {
    expect(extractPromptOwnedProfessionalParameters(
      schema([
        "length_m", "pipe_material_grade", "ring_stiffness_class", "pipe_outside_diameter_mm",
        "slope_m_per_m", "geotextile_areal_density_g_m2", "aggregate_fraction", "perforation_type",
      ]),
      "Укладка перфорированной трубы ПВХ SN8 Ø160 мм, длина 100 м, уклон 0,008, геотекстиль 300 г/м², щебень 20–40 мм",
    )).toMatchObject({
      pipe_material_grade: "PVC-U",
      ring_stiffness_class: "SN8",
      pipe_outside_diameter_mm: "160",
      slope_m_per_m: "0.008",
      geotextile_areal_density_g_m2: "300",
      aggregate_fraction: "20–40 мм",
      perforation_type: "перфорированная",
    });
  });

  test("extracts visible radiator, sprinkler, cable and luminaire specifications", () => {
    expect(extractPromptOwnedProfessionalParameters(
      schema(["radiator_count", "radiator_type", "radiator_height_mm", "radiator_length_mm", "connection_type"]),
      "Монтаж радиаторов тип 22, 500×1000 мм, количество 8 шт., нижнее подключение",
    )).toMatchObject({
      radiator_count: "8",
      radiator_type: "22",
      radiator_height_mm: "500",
      radiator_length_mm: "1000",
      connection_type: "нижнее подключение",
    });
    expect(extractPromptOwnedProfessionalParameters(
      schema(["sprinkler_count", "k_factor", "temperature_rating_c", "thread_size_inch"]),
      "Спринклеры K80, 68 °C, резьба 1/2 дюйма, количество 40 шт.",
    )).toMatchObject({ sprinkler_count: "40", k_factor: "80", temperature_rating_c: "68", thread_size_inch: "1/2" });
    expect(extractPromptOwnedProfessionalParameters(
      schema(["core_count", "conductor_area_mm2", "cable_mark"]),
      "Кабель ВВГнг(А)-LS 5×6 мм²",
    )).toMatchObject({ core_count: "5", conductor_area_mm2: "6", cable_mark: "ВВГнг(А)-LS" });
    expect(extractPromptOwnedProfessionalParameters(
      schema(["luminaire_count", "rated_power", "ingress_protection", "mounting_type"]),
      "Светильники 36 Вт, IP40, количество 30 шт., накладной монтаж",
    )).toMatchObject({ luminaire_count: "30", rated_power: "36_W", ingress_protection: "IP40", mounting_type: "SURFACE" });
  });

  test("extracts explicit plant and data-center quantities without adding project-only configuration", () => {
    expect(extractPromptOwnedProfessionalParameters(
      schema(["pump_count", "design_flow_m3_h", "design_head_m", "pump_configuration"]),
      "Насосные агрегаты 45 м³/ч, напор 55 м, количество 2 шт.",
    )).toEqual({ pump_count: "2", design_flow_m3_h: "45", design_head_m: "55" });
    expect(extractPromptOwnedProfessionalParameters(
      schema(["boiler_count", "thermal_power_kw", "fuel_type", "burner_configuration"]),
      "Водогрейный котёл 500 кВт на природном газе, количество 1 шт.",
    )).toEqual({ boiler_count: "1", thermal_power_kw: "500", fuel_type: "NATURAL_GAS" });
    expect(extractPromptOwnedProfessionalParameters(
      schema(["rack_count", "rack_height_u", "rack_depth_mm"]),
      "Серверные шкафы 42U, глубина 1200 мм, количество 6 шт.",
    )).toEqual({ rack_count: "6", rack_height_u: "42", rack_depth_mm: "1200" });
  });

  test("does not select a disconnected context parameter as the compile primary measure", () => {
    const parameterSchema = schema(["structure_volume_m3", "rebar_d12_mass_kg"])
      .map((parameter, ordinal) => ({
        ...parameter,
        ordinal,
        valueType: "decimal" as const,
        unitId: ordinal === 0 ? "m3" : "kg",
        formulaConsumers: ordinal === 0 ? [] : ["rebar_d12_mass_v1"],
      }));
    const catalog = {
      catalogId: "canonical-work:base:reinforcement-frame",
      workKey: "reinforcement-frame",
      parameterSchema,
    } as unknown as CanonicalEstimateCatalogItem;

    expect(buildCanonicalBaselinePlan({
      catalog,
      prompt: "Монтаж каркаса, объём конструкции 20 м³, BBS подтверждена",
    }).primaryMeasureParameterId).toBe("rebar_d12_mass_kg");
  });
});
