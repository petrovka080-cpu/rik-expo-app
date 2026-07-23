import { professionalEstimatePassportId } from "./professionalEstimatePassportV4";
import type { CalculationArchetypeV4 } from "./multiDomainProfessionalCorpusV4";

export type ReferenceParameterV4 = {
  parameterId: string;
  labelRu: string;
  quantityType: "length" | "area" | "volume" | "mass" | "count" | "ratio" | "density" | "productivity";
  unit: string;
  requiredLevel: "P0" | "P1" | "P2";
  minimum: number;
  maximum: number;
  defaultValue: number | null;
  defaultSource: string | null;
  formulaConsumers: readonly string[];
  validationRules: readonly string[];
};

export type ReferenceFormulaNodeV4 = {
  formulaNodeId: string;
  operation: "IDENTITY" | "MULTIPLY" | "DIVIDE" | "CEIL_DIVIDE";
  inputs: readonly string[];
  output: string;
  outputUnit: string;
  coefficient: number;
  coefficientSource: "ENGINEERING_FORMULA" | "USER_INPUT";
  applicability: string;
  roundingPolicy: "NONE" | "CEIL_INTEGER" | "ROUND_6";
};

export type ReferenceBoqRowV4 = {
  rowDefinitionId: string;
  semanticOwner: string;
  category: "preparation" | "materials" | "labor" | "equipment" | "transport" | "disposal" | "services" | "quality_control" | "documentation";
  professionalNameRu: string;
  unit: string;
  formulaNodeId: string;
  sourceId: string;
  inclusionReason: string;
  priceState: "PRICE_REQUIRED";
};

export type MultiDomainReferencePassportV4 = {
  catalogWorkId: string;
  professionalEstimatePassportId: string;
  calculationStrategyId: string;
  formulaGraphVersion: "1.0.0";
  professionalNameRu: string;
  shortNameRu: string;
  originalNormName: string;
  domain: "construction";
  group: string;
  workType: string;
  workSubtype: string;
  technology: string;
  resultQuantity: string;
  resultUnit: string;
  applicability: readonly string[];
  exclusions: readonly string[];
  synonyms: readonly string[];
  methodologyProfile: "REFERENCE_METHOD";
  legalStatus: "REFERENCE_METHOD";
  primaryArchetype: CalculationArchetypeV4;
  supportingArchetypes: readonly CalculationArchetypeV4[];
  parameters: readonly ReferenceParameterV4[];
  formulaGraph: readonly ReferenceFormulaNodeV4[];
  boq: readonly ReferenceBoqRowV4[];
  sourceIds: readonly string[];
  readiness: readonly [
    "SOURCE_IDENTIFIED",
    "PARAMETER_CONTRACT_READY",
    "FORMULA_GRAPH_READY",
    "BOQ_READY",
    "SOURCE_TRACEABILITY_READY",
  ];
  semanticOwner: string;
};

type PassportSeed = Omit<MultiDomainReferencePassportV4,
  "professionalEstimatePassportId" | "semanticOwner" | "formulaGraphVersion" | "methodologyProfile" |
  "legalStatus" | "domain" | "readiness">;

const p0 = (
  parameterId: string,
  labelRu: string,
  quantityType: ReferenceParameterV4["quantityType"],
  unit: string,
  maximum: number,
  formulaConsumers: readonly string[],
): ReferenceParameterV4 => ({
  parameterId, labelRu, quantityType, unit, requiredLevel: "P0", minimum: 0.000001,
  maximum, defaultValue: null, defaultSource: null, formulaConsumers,
  validationRules: ["FINITE", "GREATER_THAN_ZERO", `MAX_${maximum}`],
});

const node = (
  formulaNodeId: string,
  operation: ReferenceFormulaNodeV4["operation"],
  inputs: readonly string[],
  outputUnit: string,
  roundingPolicy: ReferenceFormulaNodeV4["roundingPolicy"] = "ROUND_6",
): ReferenceFormulaNodeV4 => ({
  formulaNodeId, operation, inputs, output: formulaNodeId, outputUnit, coefficient: 1,
  coefficientSource: "ENGINEERING_FORMULA", applicability: "Обязательный узел выбранной работы",
  roundingPolicy,
});

const row = (
  owner: string,
  rowDefinitionId: string,
  category: ReferenceBoqRowV4["category"],
  professionalNameRu: string,
  unit: string,
  formulaNodeId: string,
  sourceId: string,
): ReferenceBoqRowV4 => ({
  rowDefinitionId, semanticOwner: professionalEstimatePassportId(owner), category, professionalNameRu,
  unit, formulaNodeId, sourceId, inclusionReason: "Неотъемлемый результат или ресурс конкретной технологии",
  priceState: "PRICE_REQUIRED",
});

function passport(seed: PassportSeed): MultiDomainReferencePassportV4 {
  const id = professionalEstimatePassportId(seed.catalogWorkId);
  return {
    ...seed,
    professionalEstimatePassportId: id,
    semanticOwner: id,
    formulaGraphVersion: "1.0.0",
    methodologyProfile: "REFERENCE_METHOD",
    legalStatus: "REFERENCE_METHOD",
    domain: "construction",
    readiness: [
      "SOURCE_IDENTIFIED", "PARAMETER_CONTRACT_READY", "FORMULA_GRAPH_READY", "BOQ_READY",
      "SOURCE_TRACEABILITY_READY",
    ],
  };
}

const common = {
  applicability: ["Объём и технология подтверждены пользователем или проектом"],
  exclusions: ["Проектирование", "Стоимость ресурсов", "Работы вне явно выбранной технологии"],
} as const;

export const MULTI_DOMAIN_REFERENCE_PASSPORTS_V4: readonly MultiDomainReferencePassportV4[] = [
  passport({
    catalogWorkId: "building_structure_demolition", calculationStrategyId: "DEMOLITION_VOLUME_V1",
    professionalNameRu: "Разборка строительных конструкций", shortNameRu: "Разборка конструкций",
    originalNormName: "Разборка зданий и строительных конструкций", group: "preparation_demolition",
    workType: "demolition", workSubtype: "structure", technology: "mechanized_or_manual",
    resultQuantity: "demolished_volume", resultUnit: "m3", ...common,
    synonyms: ["демонтаж конструкций", "разобрать конструкцию", "снести конструкцию"],
    primaryArchetype: "DEMOLITION", supportingArchetypes: ["VOLUME", "MASS"],
    parameters: [
      p0("volume_m3", "Объём демонтируемых конструкций", "volume", "m3", 1_000_000, ["demolished_volume"]),
      p0("waste_density_t_m3", "Плотность демонтируемого материала", "density", "t/m3", 10, ["waste_mass"]),
      p0("truck_payload_t", "Грузоподъёмность транспорта", "mass", "t", 100, ["haul_trips"]),
    ],
    formulaGraph: [
      node("demolished_volume", "IDENTITY", ["volume_m3"], "m3"),
      node("waste_mass", "MULTIPLY", ["demolished_volume", "waste_density_t_m3"], "t"),
      node("haul_trips", "CEIL_DIVIDE", ["waste_mass", "truck_payload_t"], "trip", "CEIL_INTEGER"),
    ],
    boq: [
      row("building_structure_demolition", "demolition_work", "labor", "Разборка строительных конструкций", "m3", "demolished_volume", "ru_gesn_21"),
      row("building_structure_demolition", "demolition_waste", "disposal", "Погрузка и передача отходов разборки", "t", "waste_mass", "engineering_geometry"),
      row("building_structure_demolition", "demolition_haul", "transport", "Рейсы транспорта для вывоза отходов разборки", "trip", "haul_trips", "engineering_geometry"),
    ], sourceIds: ["ru_gesn_21", "engineering_geometry"],
  }),
  passport({
    catalogWorkId: "trench_excavation", calculationStrategyId: "TRENCH_GEOMETRY_V1",
    professionalNameRu: "Разработка грунта траншеи", shortNameRu: "Разработка траншеи",
    originalNormName: "Разработка грунта в траншеях", group: "earthworks", workType: "earthworks",
    workSubtype: "trench", technology: "excavation", resultQuantity: "excavation_volume", resultUnit: "m3", ...common,
    synonyms: ["выкопать траншею", "рытьё траншеи", "земляные работы траншея"],
    primaryArchetype: "VOLUME", supportingArchetypes: ["MASS", "EQUIPMENT_INSTALLATION"],
    parameters: [
      p0("length_m", "Длина траншеи", "length", "m", 1_000_000, ["excavation_volume"]),
      p0("width_m", "Ширина траншеи", "length", "m", 100, ["excavation_volume"]),
      p0("depth_m", "Глубина траншеи", "length", "m", 100, ["excavation_volume"]),
      p0("productivity_m3_h", "Производительность разработки", "productivity", "m3/h", 10_000, ["excavator_hours"]),
    ],
    formulaGraph: [
      node("trench_area", "MULTIPLY", ["length_m", "width_m"], "m2"),
      node("excavation_volume", "MULTIPLY", ["trench_area", "depth_m"], "m3"),
      node("excavator_hours", "DIVIDE", ["excavation_volume", "productivity_m3_h"], "h"),
    ],
    boq: [
      row("trench_excavation", "trench_excavation_work", "labor", "Разработка грунта траншеи", "m3", "excavation_volume", "engineering_geometry"),
      row("trench_excavation", "trench_excavator", "equipment", "Работа землеройной машины", "h", "excavator_hours", "user_productivity"),
      row("trench_excavation", "trench_geometry_control", "quality_control", "Геодезический контроль профиля траншеи", "m", "length_m", "engineering_geometry"),
    ], sourceIds: ["engineering_geometry", "user_productivity"],
  }),
  passport({
    catalogWorkId: "strip_foundation", calculationStrategyId: "STRIP_FOUNDATION_ASSEMBLY_V1",
    professionalNameRu: "Устройство монолитного ленточного фундамента", shortNameRu: "Ленточный фундамент",
    originalNormName: "Устройство ленточных фундаментов железобетонных", group: "foundations",
    workType: "foundation", workSubtype: "strip", technology: "cast_in_place",
    resultQuantity: "foundation_concrete_volume", resultUnit: "m3", ...common,
    synonyms: ["залить ленточный фундамент", "монолитная лента", "бетонная лента фундамента"],
    primaryArchetype: "ASSEMBLY", supportingArchetypes: ["VOLUME", "MASS"],
    parameters: [
      p0("length_m", "Суммарная длина ленты", "length", "m", 1_000_000, ["foundation_plan_area"]),
      p0("width_m", "Ширина ленты", "length", "m", 20, ["foundation_plan_area"]),
      p0("height_m", "Высота ленты", "length", "m", 20, ["foundation_concrete_volume", "foundation_formwork_area"]),
      p0("rebar_rate_kg_m3", "Расход арматуры по проекту", "ratio", "kg/m3", 1_000, ["foundation_rebar_mass"]),
    ],
    formulaGraph: [
      node("foundation_plan_area", "MULTIPLY", ["length_m", "width_m"], "m2"),
      node("foundation_concrete_volume", "MULTIPLY", ["foundation_plan_area", "height_m"], "m3"),
      node("foundation_rebar_mass", "MULTIPLY", ["foundation_concrete_volume", "rebar_rate_kg_m3"], "kg"),
      node("foundation_formwork_area", "MULTIPLY", ["length_m", "height_m"], "m2"),
    ],
    boq: [
      row("strip_foundation", "foundation_concrete", "materials", "Бетонная смесь монолитного ленточного фундамента", "m3", "foundation_concrete_volume", "ru_gesn_06"),
      row("strip_foundation", "foundation_rebar", "materials", "Арматура ленточного фундамента по проекту", "kg", "foundation_rebar_mass", "user_project_rate"),
      row("strip_foundation", "foundation_formwork", "preparation", "Опалубка боковых граней фундаментной ленты", "m2", "foundation_formwork_area", "engineering_geometry"),
    ], sourceIds: ["ru_gesn_06", "user_project_rate", "engineering_geometry"],
  }),
  passport({
    catalogWorkId: "monolithic_slab_concreting", calculationStrategyId: "SLAB_CONCRETING_V1",
    professionalNameRu: "Бетонирование монолитной плиты", shortNameRu: "Бетонирование плиты",
    originalNormName: "Бетонирование плит перекрытий", group: "concrete", workType: "concrete",
    workSubtype: "slab", technology: "cast_in_place", resultQuantity: "slab_concrete_volume", resultUnit: "m3", ...common,
    synonyms: ["залить плиту", "монолитная плита бетон", "бетонировать перекрытие"],
    primaryArchetype: "VOLUME", supportingArchetypes: ["AREA_LAYER", "MASS"],
    parameters: [
      p0("area_m2", "Площадь плиты", "area", "m2", 10_000_000, ["slab_concrete_volume"]),
      p0("thickness_mm", "Толщина плиты", "length", "mm", 5_000, ["thickness_m"]),
      p0("rebar_rate_kg_m3", "Расход арматуры по проекту", "ratio", "kg/m3", 1_000, ["slab_rebar_mass"]),
    ],
    formulaGraph: [
      { ...node("thickness_m", "IDENTITY", ["thickness_mm"], "m"), coefficient: 0.001 },
      node("slab_concrete_volume", "MULTIPLY", ["area_m2", "thickness_m"], "m3"),
      node("slab_rebar_mass", "MULTIPLY", ["slab_concrete_volume", "rebar_rate_kg_m3"], "kg"),
    ],
    boq: [
      row("monolithic_slab_concreting", "slab_concrete", "materials", "Бетонная смесь монолитной плиты", "m3", "slab_concrete_volume", "ru_gesn_06"),
      row("monolithic_slab_concreting", "slab_rebar", "materials", "Арматура монолитной плиты по проекту", "kg", "slab_rebar_mass", "user_project_rate"),
      row("monolithic_slab_concreting", "slab_concreting_work", "labor", "Укладка и уплотнение бетонной смеси плиты", "m3", "slab_concrete_volume", "ru_gesn_06"),
    ], sourceIds: ["ru_gesn_06", "user_project_rate", "engineering_geometry"],
  }),
  passport({
    catalogWorkId: "masonry_wall", calculationStrategyId: "MASONRY_WALL_VOLUME_V1",
    professionalNameRu: "Кладка стены из кирпича", shortNameRu: "Кладка стены",
    originalNormName: "Кладка стен из кирпича", group: "masonry", workType: "masonry",
    workSubtype: "wall", technology: "brick_masonry", resultQuantity: "masonry_volume", resultUnit: "m3", ...common,
    synonyms: ["выложить стену", "кирпичная кладка", "построить стену из кирпича"],
    primaryArchetype: "VOLUME", supportingArchetypes: ["AREA_LAYER", "LABOR_SERVICE"],
    parameters: [
      p0("length_m", "Длина стены", "length", "m", 1_000_000, ["wall_area"]),
      p0("height_m", "Высота стены", "length", "m", 100, ["wall_area"]),
      p0("thickness_m", "Толщина кладки", "length", "m", 10, ["masonry_volume"]),
      p0("brick_rate_pcs_m3", "Расход кирпича для выбранного формата", "ratio", "pcs/m3", 5_000, ["brick_count"]),
    ],
    formulaGraph: [
      node("wall_area", "MULTIPLY", ["length_m", "height_m"], "m2"),
      node("masonry_volume", "MULTIPLY", ["wall_area", "thickness_m"], "m3"),
      node("brick_count", "MULTIPLY", ["masonry_volume", "brick_rate_pcs_m3"], "pcs", "CEIL_INTEGER"),
    ],
    boq: [
      row("masonry_wall", "masonry_brick", "materials", "Кирпич для кладки стены выбранного формата", "pcs", "brick_count", "user_material_rate"),
      row("masonry_wall", "masonry_work", "labor", "Кладка кирпичной стены", "m3", "masonry_volume", "ru_gesn_08"),
      row("masonry_wall", "masonry_geometry_control", "quality_control", "Контроль геометрии кирпичной кладки", "m2", "wall_area", "engineering_geometry"),
    ], sourceIds: ["ru_gesn_08", "user_material_rate", "engineering_geometry"],
  }),
  passport({
    catalogWorkId: "wall_plaster", calculationStrategyId: "WALL_PLASTER_LAYER_V1",
    professionalNameRu: "Оштукатуривание стен", shortNameRu: "Штукатурка стен",
    originalNormName: "Оштукатуривание поверхностей стен", group: "interior_finishes", workType: "finishing",
    workSubtype: "plaster", technology: "wet_plaster", resultQuantity: "plaster_area", resultUnit: "m2", ...common,
    synonyms: ["оштукатурить стену", "штукатурка по стенам", "выровнять стены штукатуркой"],
    primaryArchetype: "AREA_LAYER", supportingArchetypes: ["MASS", "LABOR_SERVICE"],
    parameters: [
      p0("area_m2", "Площадь оштукатуривания", "area", "m2", 10_000_000, ["plaster_area", "plaster_volume"]),
      p0("thickness_mm", "Средняя толщина слоя", "length", "mm", 500, ["thickness_m"]),
      p0("mix_rate_kg_m2_mm", "Расход сухой смеси на 1 м²·мм", "ratio", "kg/m2/mm", 10, ["plaster_mix_mass"]),
    ],
    formulaGraph: [
      node("plaster_area", "IDENTITY", ["area_m2"], "m2"),
      { ...node("thickness_m", "IDENTITY", ["thickness_mm"], "m"), coefficient: 0.001 },
      node("plaster_volume", "MULTIPLY", ["area_m2", "thickness_m"], "m3"),
      node("plaster_mix_mass", "MULTIPLY", ["area_m2", "thickness_mm", "mix_rate_kg_m2_mm"], "kg"),
    ],
    boq: [
      row("wall_plaster", "plaster_dry_mix", "materials", "Сухая штукатурная смесь выбранного типа", "kg", "plaster_mix_mass", "manufacturer_or_user_rate"),
      row("wall_plaster", "plaster_application", "labor", "Нанесение и выравнивание штукатурного слоя", "m2", "plaster_area", "ru_gesn_15"),
      row("wall_plaster", "plaster_quality", "quality_control", "Контроль плоскостности оштукатуренной поверхности", "m2", "plaster_area", "ru_gesn_15"),
    ], sourceIds: ["ru_gesn_15", "manufacturer_or_user_rate", "engineering_geometry"],
  }),
  passport({
    catalogWorkId: "roll_roofing", calculationStrategyId: "ROLL_ROOFING_LAYER_V1",
    professionalNameRu: "Устройство рулонной кровли", shortNameRu: "Рулонная кровля",
    originalNormName: "Устройство кровель рулонных", group: "roofing", workType: "roofing",
    workSubtype: "roll_membrane", technology: "bonded_roll_roofing", resultQuantity: "roof_area", resultUnit: "m2", ...common,
    synonyms: ["сделать рулонную крышу", "наплавляемая кровля", "рулонный кровельный ковёр"],
    primaryArchetype: "AREA_LAYER", supportingArchetypes: ["ASSEMBLY", "MASS"],
    parameters: [
      p0("area_m2", "Площадь кровли", "area", "m2", 10_000_000, ["roof_area", "membrane_area"]),
      p0("layers_count", "Количество слоёв", "count", "pcs", 20, ["membrane_area"]),
      p0("waste_factor", "Коэффициент нахлёстов и отходов", "ratio", "ratio", 2, ["membrane_area"]),
    ],
    formulaGraph: [
      node("roof_area", "IDENTITY", ["area_m2"], "m2"),
      node("layered_area", "MULTIPLY", ["area_m2", "layers_count"], "m2"),
      node("membrane_area", "MULTIPLY", ["layered_area", "waste_factor"], "m2"),
    ],
    boq: [
      row("roll_roofing", "roof_membrane", "materials", "Рулонный кровельный материал выбранной системы", "m2", "membrane_area", "user_system_factor"),
      row("roll_roofing", "roll_roofing_work", "labor", "Устройство рулонного кровельного ковра", "m2", "roof_area", "ru_gesn_12"),
      row("roll_roofing", "roof_quality", "quality_control", "Контроль сплошности и нахлёстов рулонной кровли", "m2", "roof_area", "ru_gesn_12"),
    ], sourceIds: ["ru_gesn_12", "user_system_factor", "engineering_geometry"],
  }),
  passport({
    catalogWorkId: "water_pipe_installation", calculationStrategyId: "WATER_PIPE_NETWORK_V1",
    professionalNameRu: "Монтаж внутренней водопроводной трубы", shortNameRu: "Монтаж водопровода",
    originalNormName: "Прокладка трубопроводов внутренних систем водоснабжения", group: "water_supply",
    workType: "network", workSubtype: "water_pipe", technology: "internal_pipeline",
    resultQuantity: "installed_pipe_length", resultUnit: "m", ...common,
    synonyms: ["проложить водопровод", "провести воду трубой", "монтаж трубы воды"],
    primaryArchetype: "NETWORK", supportingArchetypes: ["LINEAR", "COUNT"],
    parameters: [
      p0("length_m", "Проектная длина трубы", "length", "m", 1_000_000, ["installed_pipe_length", "pipe_material_length"]),
      p0("material_factor", "Коэффициент запаса трубы", "ratio", "ratio", 2, ["pipe_material_length"]),
      p0("support_spacing_m", "Шаг креплений", "length", "m", 20, ["support_count"]),
    ],
    formulaGraph: [
      node("installed_pipe_length", "IDENTITY", ["length_m"], "m"),
      node("pipe_material_length", "MULTIPLY", ["length_m", "material_factor"], "m"),
      node("support_count", "CEIL_DIVIDE", ["length_m", "support_spacing_m"], "pcs", "CEIL_INTEGER"),
    ],
    boq: [
      row("water_pipe_installation", "water_pipe", "materials", "Водопроводная труба выбранной системы", "m", "pipe_material_length", "user_system_factor"),
      row("water_pipe_installation", "water_pipe_supports", "materials", "Крепления водопроводной трубы", "pcs", "support_count", "user_project_spacing"),
      row("water_pipe_installation", "water_pipe_work", "labor", "Монтаж внутреннего водопроводного трубопровода", "m", "installed_pipe_length", "ru_gesn_16"),
      row("water_pipe_installation", "water_pressure_test", "quality_control", "Гидравлическое испытание водопроводного трубопровода", "m", "installed_pipe_length", "ru_gesn_16"),
    ], sourceIds: ["ru_gesn_16", "user_system_factor", "user_project_spacing"],
  }),
  passport({
    catalogWorkId: "sewer_pipe_installation", calculationStrategyId: "SEWER_PIPE_NETWORK_V1",
    professionalNameRu: "Прокладка наружной канализационной трубы", shortNameRu: "Прокладка канализации",
    originalNormName: "Прокладка трубопроводов наружных сетей канализации", group: "sewerage",
    workType: "network", workSubtype: "gravity_sewer", technology: "external_pipeline",
    resultQuantity: "installed_sewer_length", resultUnit: "m", ...common,
    synonyms: ["проложить канализацию", "канализационная труба", "наружная сеть стоков"],
    primaryArchetype: "NETWORK", supportingArchetypes: ["LINEAR", "COUNT"],
    parameters: [
      p0("length_m", "Проектная длина канализации", "length", "m", 1_000_000, ["installed_sewer_length", "sewer_material_length"]),
      p0("material_factor", "Коэффициент запаса трубы", "ratio", "ratio", 2, ["sewer_material_length"]),
      p0("pipe_segment_m", "Монтажная длина одной трубы", "length", "m", 20, ["joint_count"]),
    ],
    formulaGraph: [
      node("installed_sewer_length", "IDENTITY", ["length_m"], "m"),
      node("sewer_material_length", "MULTIPLY", ["length_m", "material_factor"], "m"),
      node("joint_count", "CEIL_DIVIDE", ["length_m", "pipe_segment_m"], "pcs", "CEIL_INTEGER"),
    ],
    boq: [
      row("sewer_pipe_installation", "sewer_pipe", "materials", "Канализационная труба выбранной системы", "m", "sewer_material_length", "user_system_factor"),
      row("sewer_pipe_installation", "sewer_joints", "materials", "Соединительные узлы канализационной трубы", "pcs", "joint_count", "engineering_geometry"),
      row("sewer_pipe_installation", "sewer_pipe_work", "labor", "Прокладка наружного канализационного трубопровода", "m", "installed_sewer_length", "ru_gesn_23"),
      row("sewer_pipe_installation", "sewer_line_test", "quality_control", "Контроль проложенного канализационного трубопровода", "m", "installed_sewer_length", "ru_gesn_23"),
    ], sourceIds: ["ru_gesn_23", "user_system_factor", "engineering_geometry"],
  }),
  passport({
    catalogWorkId: "power_cable_laying", calculationStrategyId: "POWER_CABLE_NETWORK_V1",
    professionalNameRu: "Прокладка силового кабеля", shortNameRu: "Прокладка кабеля",
    originalNormName: "Кабели до 35 кВ, прокладываемые по установленным конструкциям", group: "electrical_low_current",
    workType: "electrical", workSubtype: "power_cable", technology: "cable_laying",
    resultQuantity: "installed_cable_length", resultUnit: "m", ...common,
    synonyms: ["положить кабель", "протянуть силовой кабель", "кабельная линия"],
    primaryArchetype: "NETWORK", supportingArchetypes: ["LINEAR", "COUNT"],
    parameters: [
      p0("route_length_m", "Длина кабельной трассы", "length", "m", 1_000_000, ["installed_cable_length", "cable_material_length"]),
      p0("cable_factor", "Коэффициент запаса кабеля", "ratio", "ratio", 2, ["cable_material_length"]),
      p0("fixing_spacing_m", "Шаг креплений кабеля", "length", "m", 20, ["cable_fixing_count"]),
    ],
    formulaGraph: [
      node("installed_cable_length", "IDENTITY", ["route_length_m"], "m"),
      node("cable_material_length", "MULTIPLY", ["route_length_m", "cable_factor"], "m"),
      node("cable_fixing_count", "CEIL_DIVIDE", ["route_length_m", "fixing_spacing_m"], "pcs", "CEIL_INTEGER"),
    ],
    boq: [
      row("power_cable_laying", "power_cable", "materials", "Силовой кабель выбранной марки и сечения", "m", "cable_material_length", "user_system_factor"),
      row("power_cable_laying", "power_cable_fixings", "materials", "Крепления силового кабеля", "pcs", "cable_fixing_count", "user_project_spacing"),
      row("power_cable_laying", "power_cable_work", "labor", "Прокладка силового кабеля", "m", "installed_cable_length", "ru_gesnm_08"),
      row("power_cable_laying", "power_cable_test", "quality_control", "Электрические испытания проложенного кабеля", "m", "installed_cable_length", "ru_gesnm_08"),
    ], sourceIds: ["ru_gesnm_08", "user_system_factor", "user_project_spacing"],
  }),
  passport({
    catalogWorkId: "heating_appliance_installation", calculationStrategyId: "HEATING_APPLIANCE_COUNT_V1",
    professionalNameRu: "Установка отопительного прибора", shortNameRu: "Установка радиатора",
    originalNormName: "Установка отопительных приборов", group: "heating", workType: "heating",
    workSubtype: "heating_appliance", technology: "radiator_installation",
    resultQuantity: "installed_appliance_count", resultUnit: "pcs", ...common,
    synonyms: ["поставить радиатор", "монтаж батареи", "установить отопительный прибор"],
    primaryArchetype: "COUNT", supportingArchetypes: ["EQUIPMENT_INSTALLATION", "LABOR_SERVICE"],
    parameters: [
      p0("appliance_count", "Количество отопительных приборов", "count", "pcs", 100_000, ["installed_appliance_count", "bracket_count", "valve_count"]),
      p0("brackets_per_appliance", "Крепления на один прибор", "ratio", "pcs/pcs", 20, ["bracket_count"]),
      p0("valves_per_appliance", "Арматура на один прибор", "ratio", "pcs/pcs", 20, ["valve_count"]),
    ],
    formulaGraph: [
      node("installed_appliance_count", "IDENTITY", ["appliance_count"], "pcs", "CEIL_INTEGER"),
      node("bracket_count", "MULTIPLY", ["appliance_count", "brackets_per_appliance"], "pcs", "CEIL_INTEGER"),
      node("valve_count", "MULTIPLY", ["appliance_count", "valves_per_appliance"], "pcs", "CEIL_INTEGER"),
    ],
    boq: [
      row("heating_appliance_installation", "heating_appliance", "equipment", "Отопительный прибор выбранного типа", "pcs", "installed_appliance_count", "user_equipment_selection"),
      row("heating_appliance_installation", "heating_brackets", "materials", "Крепления отопительного прибора", "pcs", "bracket_count", "user_system_factor"),
      row("heating_appliance_installation", "heating_valves", "materials", "Подключающая арматура отопительного прибора", "pcs", "valve_count", "user_system_factor"),
      row("heating_appliance_installation", "heating_installation_work", "labor", "Установка и подключение отопительного прибора", "pcs", "installed_appliance_count", "ru_gesnr_65"),
    ], sourceIds: ["ru_gesnr_65", "user_equipment_selection", "user_system_factor"],
  }),
  passport({
    catalogWorkId: "asphalt_pavement", calculationStrategyId: "ASPHALT_SURFACING_ADAPTER_V1",
    professionalNameRu: "Устройство асфальтобетонного покрытия", shortNameRu: "Асфальтобетонное покрытие",
    originalNormName: "Устройство покрытий из горячих асфальтобетонных смесей", group: "roadworks_landscaping",
    workType: "roadworks", workSubtype: "asphalt_surface", technology: "hot_mix_asphalt",
    resultQuantity: "asphalt_area", resultUnit: "m2", ...common,
    synonyms: ["заасфальтировать двор", "уложить асфальт", "асфальтовое покрытие"],
    primaryArchetype: "ASSEMBLY", supportingArchetypes: ["AREA_LAYER", "MASS"],
    parameters: [
      p0("area_m2", "Площадь асфальтобетонного покрытия", "area", "m2", 100_000_000, ["asphalt_area", "asphalt_volume"]),
      p0("thickness_mm", "Проектная толщина слоя", "length", "mm", 1_000, ["asphalt_thickness_m"]),
      p0("density_t_m3", "Плотность асфальтобетонной смеси", "density", "t/m3", 5, ["asphalt_mass"]),
    ],
    formulaGraph: [
      node("asphalt_area", "IDENTITY", ["area_m2"], "m2"),
      { ...node("asphalt_thickness_m", "IDENTITY", ["thickness_mm"], "m"), coefficient: 0.001 },
      node("asphalt_volume", "MULTIPLY", ["asphalt_area", "asphalt_thickness_m"], "m3"),
      node("asphalt_mass", "MULTIPLY", ["asphalt_volume", "density_t_m3"], "t"),
    ],
    boq: [
      row("asphalt_pavement", "asphalt_mix", "materials", "Асфальтобетонная смесь принятого типа", "t", "asphalt_mass", "user_project_density"),
      row("asphalt_pavement", "asphalt_laying", "labor", "Укладка асфальтобетонной смеси", "m2", "asphalt_area", "ru_gesn_27"),
      row("asphalt_pavement", "asphalt_compaction", "equipment", "Комплект уплотнения асфальтобетонного покрытия", "m2", "asphalt_area", "ru_gesn_27"),
      row("asphalt_pavement", "asphalt_quality", "quality_control", "Контроль качества асфальтобетонного покрытия", "m2", "asphalt_area", "ru_gesn_27"),
    ], sourceIds: ["ru_gesn_27", "user_project_density", "engineering_geometry"],
  }),
] as const;

export type CompiledReferenceBoqRowV4 = ReferenceBoqRowV4 & { quantity: number };
export type ReferenceCompilationV4 = {
  passportId: string;
  catalogWorkId: string;
  formulaValues: Readonly<Record<string, number>>;
  boq: readonly CompiledReferenceBoqRowV4[];
};

export function compileMultiDomainReferencePassportV4(
  catalogWorkId: string,
  inputs: Readonly<Record<string, number>>,
): ReferenceCompilationV4 {
  const passport = MULTI_DOMAIN_REFERENCE_PASSPORTS_V4.find((item) => item.catalogWorkId === catalogWorkId);
  if (!passport) throw new Error(`UNKNOWN_REFERENCE_PASSPORT:${catalogWorkId}`);
  const values: Record<string, number> = {};
  for (const parameter of passport.parameters) {
    const value = inputs[parameter.parameterId];
    if (!Number.isFinite(value) || value < parameter.minimum || value > parameter.maximum) {
      throw new Error(`INVALID_P0:${catalogWorkId}:${parameter.parameterId}`);
    }
    values[parameter.parameterId] = value;
  }
  for (const formula of passport.formulaGraph) {
    const operands = formula.inputs.map((input) => {
      const value = values[input];
      if (!Number.isFinite(value)) throw new Error(`UNBOUND_FORMULA_INPUT:${formula.formulaNodeId}:${input}`);
      return value;
    });
    let result = operands[0];
    if (formula.operation === "MULTIPLY") result = operands.reduce((product, value) => product * value, 1);
    if (formula.operation === "DIVIDE" || formula.operation === "CEIL_DIVIDE") result = operands[0] / operands[1];
    result *= formula.coefficient;
    if (formula.roundingPolicy === "CEIL_INTEGER" || formula.operation === "CEIL_DIVIDE") result = Math.ceil(result);
    if (formula.roundingPolicy === "ROUND_6") result = Math.round(result * 1_000_000) / 1_000_000;
    values[formula.output] = result;
  }
  return {
    passportId: passport.professionalEstimatePassportId,
    catalogWorkId,
    formulaValues: values,
    boq: passport.boq.map((definition) => ({ ...definition, quantity: values[definition.formulaNodeId] })),
  };
}
