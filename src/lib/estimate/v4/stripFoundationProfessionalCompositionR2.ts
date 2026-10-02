import {
  compileFormulaGraph,
  evaluateFormulaGraph,
  type FormulaAst,
} from "../backendPlatform/formulaGraph";
import { evaluateInclusionGraph, type InclusionGraphAst } from "../backendPlatform/inclusionGraph";
import type { CanonicalEstimateFormulaDefinition } from "../backendPlatform/canonicalEstimateCompileCore";
import {
  CONCRETE_SLAB_CURING_SOURCE_ID,
  CONCRETE_SLAB_CURING_SOURCE_METADATA,
} from "./concreteSlabCuringR1";
import {
  STRIP_FOUNDATION_CONCRETE_PLACEMENT_FORMULAS,
  STRIP_FOUNDATION_CONCRETE_PLACEMENT_PARAMETERS,
  STRIP_FOUNDATION_CONCRETE_PLACEMENT_RESOURCES,
} from "./stripFoundationConcretePlacementR1";
import {
  STRIP_FOUNDATION_REINFORCEMENT_FORMULAS,
  STRIP_FOUNDATION_REINFORCEMENT_PARAMETERS,
  STRIP_FOUNDATION_REINFORCEMENT_RESOURCES,
} from "./stripFoundationReinforcementR1";
import {
  STRIP_FOUNDATION_FORMULAS,
  STRIP_FOUNDATION_GOLD_INPUT,
  STRIP_FOUNDATION_INPUTS,
  STRIP_FOUNDATION_ROWS,
  stripFoundationParameterConsumerRowIds,
  type StripFoundationInput,
  type StripFoundationInputValue,
  type StripFoundationNormSource,
} from "./reinforcedConcreteStripFoundationR1";

export const STRIP_FOUNDATION_PROFESSIONAL_COMPOSITION_R2_CONTRACT =
  "strip-foundation-professional-composition:r5-s27-3-legacy-safe-conditional-defaults" as const;

export const STRIP_FOUNDATION_S26_AUTOMATIC_PROFILE_ID =
  "strip-foundation-preliminary:maxfrank-doka-sika-igolflex-101de:r1" as const;

/**
 * Only resources absent from the composite foundation owner are selected.
 * The primary concrete, reinforcement, placement, fabrication, machines and
 * deliveries stay with the existing composite rows, so this bridge cannot
 * count either the material or its main installation twice.
 */
export const STRIP_FOUNDATION_COMPOSED_TYPED_CHILD_ROW_IDS_R2 = Object.freeze([
  "material:reinforcement:spacer-chairs",
  "material:reinforcement:mechanical-couplers",
  "work:reinforcement:unload-store",
  "work:reinforcement:cover-control",
  "equipment:reinforcement:lifting",
  "service:reinforcement:inspection",
  "service:reinforcement:mill-certificates",
  "service:concrete:acceptance-control",
  "material:concrete:construction-joint-waterstop",
  "work:concrete:construction-joint-waterstop-install",
] as const);

type CompositionCategoryR2 =
  | "material"
  | "construction_work"
  | "machine_equipment"
  | "delivery"
  | "service"
  | "document";

export type StripFoundationProfessionalFormulaR2 = Readonly<{
  formulaId: string;
  outputUnitId: string;
  source: string;
  ast: FormulaAst;
  inputParameterIds: readonly string[];
}>;

export type StripFoundationProfessionalRowR2 = Readonly<{
  rowId: string;
  section: string;
  category: CompositionCategoryR2;
  rowType: "material" | "work" | "equipment" | "service";
  canonicalRuName: string;
  normalizedUom: string;
  formulaId: string;
  applicabilityExpression: InclusionGraphAst;
  semanticOwnerId: string;
  costOwnerId: string;
  resourceId: string;
  procurementEligible: boolean;
  includedInParentRate: boolean;
  visibility: "customer" | "expanded_resource";
  normSource: StripFoundationNormSource;
  sourceMetadata: Readonly<Record<string, unknown>>;
  compositionOrigin: "COMPOSITE_OWNER" | "TYPED_CHILD_OWNER";
  titleSpecificationParameterIds?: readonly string[];
  titleSpecificationMode?: "APPEND" | "REPLACE";
  titleSpecificationSeparator?: " — " | " ";
  cargo?: {
    cargoRu: string;
    vehicleRu: string;
    physicalQuantityFormulaId: string;
    physicalQuantityUom: "m3" | "t";
    distanceParameterId: string;
  };
}>;

const literalTrue: InclusionGraphAst = Object.freeze({ kind: "literal", value: true });
const equals = (parameterId: string, value: string | boolean): InclusionGraphAst => ({
  kind: "equals",
  parameterId,
  value,
});
const greaterThan = (parameterId: string, value: number): InclusionGraphAst => ({
  kind: "greater_than",
  parameterId,
  value,
});
const and = (...operands: InclusionGraphAst[]): InclusionGraphAst => ({ kind: "and", operands });
const fullScope = equals("scope_variant", "full_reinforced_structure");
const automaticProfile = equals("foundation_automatic_profile_id", STRIP_FOUNDATION_S26_AUTOMATIC_PROFILE_ID);
const waterCuring = equals("curing_method", "water");
const separateCuringWaterSupply = and(
  waterCuring,
  equals("curing_water_supply_mode", "separate_equipment"),
);
const returnableRentalFormwork = and(
  fullScope,
  equals("formwork_supply_mode", "rental_returnable"),
);
const asBuiltSurvey = and(
  fullScope,
  equals("as_built_survey_included", true),
);
const horizontalCutoffWaterproofing = and(
  fullScope,
  equals("horizontal_cutoff_waterproofing_included", true),
);
const formworkTieConsumables = and(
  fullScope,
  automaticProfile,
  equals("formwork_tie_consumables_required", true),
);
const includedFormworkTieConsumables = and(
  formworkTieConsumables,
  equals("formwork_tie_consumables_supply_mode", "included_in_formwork_system"),
);
const separatelyPurchasedFormworkTieConsumables = and(
  formworkTieConsumables,
  equals("formwork_tie_consumables_supply_mode", "separate_purchase"),
);
const foundationGroundworks = and(
  fullScope,
  equals("groundworks_included", true),
);
const excavationSupport = and(
  foundationGroundworks,
  equals("excavation_support_required", true),
);
const excavationDewatering = and(
  foundationGroundworks,
  equals("excavation_dewatering_required", true),
);
const separateSiteCleanup = and(
  fullScope,
  equals("site_cleanup_cost_mode", "separate_work"),
);
const separateNonSoilWasteHandling = and(
  fullScope,
  equals("non_soil_waste_handling_mode", "separate_handling"),
);
const nonSoilWastePackaging = and(
  separateNonSoilWasteHandling,
  equals("non_soil_waste_packaging_required", true),
);
const mechanicalCouplers = and(fullScope, equals("mechanical_couplers_applicable", true));
const reinforcementLifting = and(fullScope, equals("lifting_equipment_applicable", true));
const constructionJointWaterstop = equals("construction_joint_mode", "WATERSTOP");
const waterproofingScope = and(fullScope, equals("waterproofing_included", true));
const coatingWaterproofing = and(waterproofingScope, equals("waterproofing_system", "bituminous_coating"));
const formworkTieAccessories = and(fullScope, automaticProfile);
const formworkReleaseAgent = and(fullScope, automaticProfile);
const waterproofingPrimer = and(coatingWaterproofing, automaticProfile);
const waterproofingProtection = and(
  coatingWaterproofing,
  automaticProfile,
  equals("backfill_included", true),
);
const waterproofingDetailReinforcement = and(
  coatingWaterproofing,
  automaticProfile,
  greaterThan("waterproofing_area_m2", 25),
);

const REINFORCEMENT_PARAMETER_IDS = new Set([
  "spacer_chair_designation",
  "spacer_chair_quantity_piece",
  "mechanical_couplers_applicable",
  "mechanical_coupler_designation",
  "mechanical_coupler_quantity_piece",
  "unloading_and_storage_worker_h",
  "cover_control_worker_h",
  "lifting_equipment_applicable",
  "lifting_equipment_designation",
  "lifting_machine_h",
  "reinforcement_inspection_service_h",
  "mill_certificate_package_count",
]);

const CONCRETE_PARAMETER_IDS = new Set([
  "quality_control_document_count",
  "construction_joint_mode",
  "construction_joint_waterstop_specification",
  "construction_joint_waterstop_length_m",
  "construction_joint_installation_worker_h",
]);

function requiredWhen(parameterId: string): InclusionGraphAst {
  if (["mechanical_coupler_designation", "mechanical_coupler_quantity_piece"].includes(parameterId)) {
    return mechanicalCouplers;
  }
  if (["lifting_equipment_designation", "lifting_machine_h"].includes(parameterId)) {
    return reinforcementLifting;
  }
  if (REINFORCEMENT_PARAMETER_IDS.has(parameterId)) return fullScope;
  if ([
    "construction_joint_waterstop_specification",
    "construction_joint_waterstop_length_m",
    "construction_joint_installation_worker_h",
  ].includes(parameterId)) return constructionJointWaterstop;
  return literalTrue;
}

type ChildParameter =
  | (typeof STRIP_FOUNDATION_REINFORCEMENT_PARAMETERS)[number]
  | (typeof STRIP_FOUNDATION_CONCRETE_PLACEMENT_PARAMETERS)[number];

function childGuide(parameter: ChildParameter): string {
  const truth = parameter.truth_metadata as Record<string, unknown>;
  const guide = truth.guide as Record<string, unknown> | undefined;
  return typeof guide?.guide_short_ru === "string" && guide.guide_short_ru.trim()
    ? guide.guide_short_ru
    : `${parameter.title_ru}: укажите подтверждённое проектом значение.`;
}

function projectInputFromChild(parameter: ChildParameter): StripFoundationInput | null {
  const constraints = parameter.constraints_json as Record<string, unknown>;
  const choices = Array.isArray(constraints.values)
    ? constraints.values.map(String)
    : undefined;
  const parameterId = parameter.parameter_id;
  if ([
    "spacer_chair_quantity_piece",
    "unloading_and_storage_worker_h",
    "cover_control_worker_h",
    "reinforcement_inspection_service_h",
    "mill_certificate_package_count",
    "quality_control_document_count",
  ].includes(parameterId)) return null;
  if (parameterId === "spacer_chair_designation") {
    return {
      parameterId,
      titleRu: parameter.title_ru,
      valueType: "text",
      unitId: null,
      visibilityRole: "INTERNAL_ONLY",
      required: true,
      defaultValue: "Блочные фиксаторы MAX FRANK — предварительный профиль для опорных стержней до 8 мм",
      requiredWhen: fullScope,
      guideRu: "Системный предварительный профиль выбирает тип фиксатора; защитный слой уточняется проектом без ручного ввода количества фиксаторов.",
      sourceRole: "OFFICIAL_NORM",
    };
  }
  const automaticDecision = parameterId === "mechanical_couplers_applicable"
    ? false
    : parameterId === "lifting_equipment_applicable"
      ? false
      : parameterId === "construction_joint_mode"
        ? "NONE"
        : undefined;
  return {
    parameterId,
    titleRu: parameter.title_ru,
    valueType: parameter.value_type as StripFoundationInput["valueType"],
    unitId: parameter.unit_id,
    visibilityRole: "USER_INPUT",
    required: automaticDecision === undefined,
    defaultValue: automaticDecision ?? null,
    requiredWhen: requiredWhen(parameterId),
    ...(choices ? { choices } : {}),
    guideRu: childGuide(parameter),
    sourceRole: "PROJECT_DOCUMENTATION",
  };
}

const selectedChildParameters = [
  ...STRIP_FOUNDATION_REINFORCEMENT_PARAMETERS.filter((parameter) =>
    REINFORCEMENT_PARAMETER_IDS.has(parameter.parameter_id)),
  ...STRIP_FOUNDATION_CONCRETE_PLACEMENT_PARAMETERS.filter((parameter) =>
    CONCRETE_PARAMETER_IDS.has(parameter.parameter_id)),
];

function automaticProfileInput(input: {
  parameterId: string;
  titleRu: string;
  valueType: StripFoundationInput["valueType"];
  unitId?: string | null;
  defaultValue: StripFoundationInputValue;
  guideRu: string;
  sourceRole?: StripFoundationInput["sourceRole"];
  visibilityRole?: StripFoundationInput["visibilityRole"];
  required?: boolean;
}): StripFoundationInput {
  return {
    parameterId: input.parameterId,
    titleRu: input.titleRu,
    valueType: input.valueType,
    unitId: input.unitId ?? null,
    visibilityRole: input.visibilityRole ?? "INTERNAL_ONLY",
    required: input.required ?? true,
    defaultValue: input.defaultValue,
    guideRu: input.guideRu,
    sourceRole: input.sourceRole ?? "OFFICIAL_NORM",
  };
}

const sourceGapInputs: readonly StripFoundationInput[] = Object.freeze([
  automaticProfileInput({
    parameterId: "foundation_automatic_profile_id",
    titleRu: "Профиль предварительного расчёта фундамента",
    valueType: "text",
    defaultValue: STRIP_FOUNDATION_S26_AUTOMATIC_PROFILE_ID,
    guideRu: "Выбранный системой профиль связывает источники, применимость, нормы и явные допущения; проектные данные могут уточнить результат.",
  }),
  automaticProfileInput({
    parameterId: "spacer_chair_rate_piece_m2",
    titleRu: "Норма фиксаторов на площадь стороны армированной стены",
    valueType: "decimal",
    unitId: "piece_per_m2",
    defaultValue: 4,
    guideRu: "MAX FRANK/DBV: для блочных фиксаторов стены при опорных стержнях до 8 мм — 4 шт. на м² каждой стороны; это явный консервативный предварительный профиль, не замена проекту армирования.",
  }),
  automaticProfileInput({
    parameterId: "formwork_tie_accessories_designation",
    titleRu: "Спецификация креплений опалубки",
    valueType: "text",
    defaultValue: "Крепления и комплектующие в составе комплекта щитовой опалубки",
    guideRu: "Комплектность учитывается внутри родительской поставки опалубки; отдельная закупка и повторная цена не начисляются.",
    sourceRole: "PROJECT_DOCUMENTATION",
  }),
  automaticProfileInput({
    parameterId: "formwork_release_agent_designation",
    titleRu: "Разделительный состав опалубки",
    valueType: "text",
    defaultValue: "Doka-Trenn для впитывающей поверхности опалубки",
    guideRu: "Выбранный TDS-профиль Doka-Trenn применяется к впитывающей поверхности опалубки.",
  }),
  automaticProfileInput({
    parameterId: "formwork_release_agent_consumption_l_m2",
    titleRu: "Расход разделительного состава Doka-Trenn",
    valueType: "decimal",
    unitId: "l_per_m2",
    defaultValue: 0.01,
    guideRu: "Официальный материал Doka указывает производительность до 100 м² на литр; формула использует 0,01 л/м² площади контакта.",
  }),
  automaticProfileInput({
    parameterId: "waterproofing_coating_designation",
    titleRu: "Обмазочная гидроизоляция",
    valueType: "text",
    defaultValue: "Sika Igolflex-101 DE — предварительный режим защиты от влаги",
    guideRu: "Системный профиль использует двухслойную Sika Igolflex-101 DE; режим воды под давлением требует отдельного проектного уточнения.",
  }),
  automaticProfileInput({
    parameterId: "waterproofing_pressure_exposure",
    titleRu: "Воздействие воды под давлением подтверждено",
    valueType: "boolean",
    defaultValue: false,
    guideRu: "Для предварительной оценки без подтверждения принят режим защиты от влаги 4 л/м²; при подтверждённом водонапорном режиме применяется 5 л/м².",
    sourceRole: "PROJECT_DOCUMENTATION",
    visibilityRole: "USER_INPUT",
    required: false,
  }),
  automaticProfileInput({
    parameterId: "waterproofing_primer_designation",
    titleRu: "Грунтовка гидроизоляционной системы",
    valueType: "text",
    defaultValue: "Sika Igolflex P-01 DE",
    guideRu: "Совместимая грунтовка выбранной системы Sika Igolflex.",
  }),
  automaticProfileInput({
    parameterId: "waterproofing_primer_consumption_l_m2",
    titleRu: "Расход грунтовки Sika Igolflex P-01 DE",
    valueType: "decimal",
    unitId: "l_per_m2",
    defaultValue: 0.05,
    guideRu: "Официальный PDS задаёт 0,050 л/м² для грунтования под битумную толстослойную систему.",
  }),
  automaticProfileInput({
    parameterId: "waterproofing_protection_layer_designation",
    titleRu: "Материал защитного слоя гидроизоляции",
    valueType: "text",
    defaultValue: "SikaShield PB P15 PE 6 mm — защитная плита 1×2 м",
    guideRu: "При обратной засыпке профиль включает защитную плиту, укладываемую встык по полной площади покрытия.",
  }),
  automaticProfileInput({
    parameterId: "waterproofing_detail_reinforcement_designation",
    titleRu: "Материал усиления примыканий гидроизоляции",
    valueType: "text",
    defaultValue: "Sika Igolflex F-01 EU — армирующая стеклоткань",
    guideRu: "Для площади больше 25 м² профиль включает армирование Sika Igolflex F-01 EU с нахлёстом по TDS.",
  }),
  automaticProfileInput({
    parameterId: "waterproofing_detail_reinforcement_consumption_m2_m2",
    titleRu: "Расход армирующей ткани Sika Igolflex F-01 EU",
    valueType: "decimal",
    unitId: "m2_per_m2",
    defaultValue: 1.1,
    guideRu: "Официальный PDS задаёт около 1,10 м² ткани на 1 м² покрытия с нахлёстом не менее 10 см.",
  }),
  {
    parameterId: "formwork_supply_mode",
    titleRu: "Способ обеспечения опалубкой",
    valueType: "enum",
    unitId: null,
    visibilityRole: "USER_INPUT",
    required: true,
    defaultValue: "contractor_owned",
    requiredWhen: fullScope,
    choices: ["contractor_owned", "project_purchase", "rental_returnable"],
    guideRu: "Выберите фактическую коммерческую модель. Возврат поставщику включается только для арендного возвратного комплекта.",
    sourceRole: "PROJECT_DOCUMENTATION",
  },
  {
    parameterId: "formwork_return_distance_km",
    titleRu: "Расстояние возврата арендной опалубки",
    valueType: "decimal",
    unitId: "km",
    visibilityRole: "USER_INPUT",
    required: true,
    defaultValue: null,
    requiredWhen: returnableRentalFormwork,
    guideRu: "Укажите подтверждённый маршрут возврата арендного комплекта поставщику; для собственной или купленной опалубки поле не применяется.",
    sourceRole: "PROJECT_DOCUMENTATION",
  },
  {
    parameterId: "curing_water_m3",
    titleRu: "Вода для ухода за бетоном",
    valueType: "decimal",
    unitId: "m3",
    visibilityRole: "USER_INPUT",
    required: true,
    defaultValue: null,
    requiredWhen: waterCuring,
    guideRu: "Количество берётся непосредственно из утверждённой технологической карты ухода; ACI 308 не задаёт универсальный расход воды.",
    sourceRole: "PROJECT_DOCUMENTATION",
  },
  {
    parameterId: "curing_water_supply_mode",
    titleRu: "Способ подачи воды для ухода",
    valueType: "enum",
    unitId: null,
    visibilityRole: "USER_INPUT",
    required: true,
    defaultValue: null,
    requiredWhen: waterCuring,
    choices: ["site_connection_included_in_curing_work", "separate_equipment"],
    guideRu: "Выберите существующее водоснабжение в составе работ либо отдельно оплачиваемое оборудование подачи.",
    sourceRole: "PROJECT_DOCUMENTATION",
  },
  {
    parameterId: "curing_water_supply_equipment_designation",
    titleRu: "Оборудование подачи воды",
    valueType: "text",
    unitId: null,
    visibilityRole: "USER_INPUT",
    required: true,
    defaultValue: null,
    requiredWhen: separateCuringWaterSupply,
    guideRu: "Укажите выбранное оборудование по технологической карте или ведомости; при подаче от существующего подключения поле не применяется.",
    sourceRole: "SELECTED_EQUIPMENT_PASSPORT",
  },
  {
    parameterId: "curing_water_supply_machine_h",
    titleRu: "Машино-время оборудования подачи воды",
    valueType: "decimal",
    unitId: "machine_hour",
    visibilityRole: "USER_INPUT",
    required: true,
    defaultValue: null,
    requiredWhen: separateCuringWaterSupply,
    guideRu: "Укажите машино-время по утверждённой технологической карте и паспорту выбранного оборудования.",
    sourceRole: "SELECTED_EQUIPMENT_PASSPORT",
  },
  {
    parameterId: "as_built_survey_included",
    titleRu: "Исполнительная геодезическая съёмка входит в заказ",
    valueType: "boolean",
    unitId: null,
    visibilityRole: "USER_INPUT",
    required: true,
    defaultValue: false,
    requiredWhen: fullScope,
    guideRu: "Подтвердите границу заказа по проектному плану геодезического контроля; разбивка осей до работ не заменяет исполнительную съёмку.",
    sourceRole: "PROJECT_DOCUMENTATION",
  },
  {
    parameterId: "as_built_survey_document_count",
    titleRu: "Количество документов исполнительной съёмки",
    valueType: "decimal",
    unitId: "document",
    visibilityRole: "USER_INPUT",
    required: true,
    defaultValue: null,
    requiredWhen: asBuiltSurvey,
    guideRu: "Укажите число оформляемых схем или отчётов из утверждённого плана контроля.",
    sourceRole: "PROJECT_DOCUMENTATION",
  },
  {
    parameterId: "horizontal_cutoff_waterproofing_included",
    titleRu: "Горизонтальная отсечная гидроизоляция входит в заказ",
    valueType: "boolean",
    unitId: null,
    visibilityRole: "USER_INPUT",
    required: true,
    defaultValue: false,
    requiredWhen: fullScope,
    guideRu: "Включите только при наличии проектного узла стены и фундамента; вертикальная гидроизоляция не подтверждает эту ветвь.",
    sourceRole: "PROJECT_DOCUMENTATION",
  },
  {
    parameterId: "horizontal_cutoff_waterproofing_designation",
    titleRu: "Материал горизонтальной отсечной гидроизоляции",
    valueType: "text",
    unitId: null,
    visibilityRole: "USER_INPUT",
    required: true,
    defaultValue: null,
    requiredWhen: horizontalCutoffWaterproofing,
    guideRu: "Укажите систему из проектного узла и её технического листа; универсальный продукт не подставляется.",
    sourceRole: "PROJECT_DOCUMENTATION",
  },
  {
    parameterId: "horizontal_cutoff_waterproofing_area_m2",
    titleRu: "Площадь горизонтальной отсечной гидроизоляции",
    valueType: "decimal",
    unitId: "m2",
    visibilityRole: "USER_INPUT",
    required: true,
    defaultValue: null,
    requiredWhen: horizontalCutoffWaterproofing,
    guideRu: "Укажите прямое количество по проектному узлу с подтверждёнными нахлёстами; площадь вертикальных граней сюда не переносится.",
    sourceRole: "PROJECT_DOCUMENTATION",
  },
  {
    parameterId: "formwork_tie_consumables_required",
    titleRu: "Нужны расходные детали стяжных узлов опалубки",
    valueType: "boolean",
    unitId: null,
    visibilityRole: "USER_INPUT",
    required: true,
    defaultValue: false,
    requiredWhen: fullScope,
    guideRu: "Подтвердите по раскладке выбранной системы необходимость трубок, конусов, заглушек или аналогичных расходных деталей.",
    sourceRole: "PROJECT_DOCUMENTATION",
  },
  {
    parameterId: "formwork_tie_consumables_supply_mode",
    titleRu: "Как оплачиваются расходные детали стяжек",
    valueType: "enum",
    unitId: null,
    visibilityRole: "USER_INPUT",
    required: true,
    defaultValue: null,
    requiredWhen: formworkTieConsumables,
    choices: ["included_in_formwork_system", "separate_purchase"],
    guideRu: "Выберите включение в комплект опалубки либо отдельную закупку; одновременно обе стоимости не начисляются.",
    sourceRole: "PROJECT_DOCUMENTATION",
  },
  {
    parameterId: "formwork_tie_consumables_designation",
    titleRu: "Расходные детали стяжных узлов",
    valueType: "text",
    unitId: null,
    visibilityRole: "USER_INPUT",
    required: true,
    defaultValue: null,
    requiredWhen: formworkTieConsumables,
    guideRu: "Укажите конкретные трубки, конусы, заглушки или комплект по спецификации выбранной опалубочной системы.",
    sourceRole: "PROJECT_DOCUMENTATION",
  },
  {
    parameterId: "formwork_tie_consumables_quantity_piece",
    titleRu: "Количество расходных деталей стяжных узлов",
    valueType: "decimal",
    unitId: "piece",
    visibilityRole: "USER_INPUT",
    required: true,
    defaultValue: null,
    requiredWhen: formworkTieConsumables,
    guideRu: "Введите количество из раскладки и комплектовочной ведомости; автоматическая норма на квадратный метр не применяется.",
    sourceRole: "PROJECT_DOCUMENTATION",
  },
  {
    parameterId: "excavation_support_required",
    titleRu: "Требуется крепление стенок выемки",
    valueType: "boolean",
    unitId: null,
    visibilityRole: "USER_INPUT",
    required: true,
    defaultValue: false,
    requiredWhen: foundationGroundworks,
    guideRu: "Подтвердите по проекту производства земляных работ и инженерно-геологическим условиям; устойчивые проектные откосы не требуют ложного крепления.",
    sourceRole: "PROJECT_DOCUMENTATION",
  },
  {
    parameterId: "excavation_support_designation",
    titleRu: "Система крепления стенок выемки",
    valueType: "text",
    unitId: null,
    visibilityRole: "USER_INPUT",
    required: true,
    defaultValue: null,
    requiredWhen: excavationSupport,
    guideRu: "Укажите систему из утверждённого проекта крепления выемки.",
    sourceRole: "PROJECT_DOCUMENTATION",
  },
  {
    parameterId: "excavation_support_area_m2",
    titleRu: "Площадь крепления стенок выемки",
    valueType: "decimal",
    unitId: "m2",
    visibilityRole: "USER_INPUT",
    required: true,
    defaultValue: null,
    requiredWhen: excavationSupport,
    guideRu: "Введите прямую площадь по утверждённой схеме крепления; объём разработки грунта в неё не преобразуется автоматически.",
    sourceRole: "PROJECT_DOCUMENTATION",
  },
  {
    parameterId: "excavation_dewatering_required",
    titleRu: "Требуется водоотлив из выемки",
    valueType: "boolean",
    unitId: null,
    visibilityRole: "USER_INPUT",
    required: true,
    defaultValue: false,
    requiredWhen: foundationGroundworks,
    guideRu: "Подтвердите по данным о грунтовых водах и ППР; без подтверждения насос в смету не включается.",
    sourceRole: "PROJECT_DOCUMENTATION",
  },
  {
    parameterId: "excavation_dewatering_equipment_designation",
    titleRu: "Оборудование водоотлива",
    valueType: "text",
    unitId: null,
    visibilityRole: "USER_INPUT",
    required: true,
    defaultValue: null,
    requiredWhen: excavationDewatering,
    guideRu: "Укажите насос или установку из утверждённой схемы водоотлива.",
    sourceRole: "SELECTED_EQUIPMENT_PASSPORT",
  },
  {
    parameterId: "excavation_dewatering_machine_h",
    titleRu: "Машино-время водоотлива",
    valueType: "decimal",
    unitId: "machine_hour",
    visibilityRole: "USER_INPUT",
    required: true,
    defaultValue: null,
    requiredWhen: excavationDewatering,
    guideRu: "Введите машино-время по утверждённой схеме и паспорту оборудования; универсальная производительность не подставляется.",
    sourceRole: "SELECTED_EQUIPMENT_PASSPORT",
  },
  {
    parameterId: "site_cleanup_cost_mode",
    titleRu: "Как оплачивается итоговая уборка участка работ",
    valueType: "enum",
    unitId: null,
    visibilityRole: "USER_INPUT",
    required: true,
    defaultValue: "included_in_primary_works",
    requiredWhen: fullScope,
    choices: ["included_in_primary_works", "separate_work"],
    guideRu: "Укажите включение в основные работы либо отдельную оплату; одна и та же уборка не начисляется дважды.",
    sourceRole: "PROJECT_DOCUMENTATION",
  },
  {
    parameterId: "site_cleanup_worker_h",
    titleRu: "Трудозатраты на итоговую уборку",
    valueType: "decimal",
    unitId: "man_hour",
    visibilityRole: "USER_INPUT",
    required: true,
    defaultValue: null,
    requiredWhen: separateSiteCleanup,
    guideRu: "Введите трудозатраты из ППР или подтверждённой расценки; площадь и объём бетона не превращаются в часы автоматически.",
    sourceRole: "PROJECT_DOCUMENTATION",
  },
  {
    parameterId: "non_soil_waste_handling_mode",
    titleRu: "Как учитываются строительные отходы кроме грунта",
    valueType: "enum",
    unitId: null,
    visibilityRole: "USER_INPUT",
    required: true,
    defaultValue: "included_in_primary_works",
    requiredWhen: fullScope,
    choices: ["included_in_primary_works", "separate_handling"],
    guideRu: "Выберите включение в основные работы либо отдельный поток сортировки, вывоза и приёма; грунт учитывается другой ветвью.",
    sourceRole: "PROJECT_DOCUMENTATION",
  },
  {
    parameterId: "non_soil_waste_mass_t",
    titleRu: "Масса строительных отходов кроме грунта",
    valueType: "decimal",
    unitId: "t",
    visibilityRole: "USER_INPUT",
    required: true,
    defaultValue: null,
    requiredWhen: separateNonSoilWasteHandling,
    guideRu: "Введите подтверждённую массу из плана обращения с отходами; она не выводится процентом от бетона или опалубки.",
    sourceRole: "PROJECT_DOCUMENTATION",
  },
  {
    parameterId: "non_soil_waste_haul_distance_km",
    titleRu: "Расстояние вывоза строительных отходов",
    valueType: "decimal",
    unitId: "km",
    visibilityRole: "USER_INPUT",
    required: true,
    defaultValue: null,
    requiredWhen: separateNonSoilWasteHandling,
    guideRu: "Укажите подтверждённый маршрут до выбранного законного получателя отходов.",
    sourceRole: "PROJECT_DOCUMENTATION",
  },
  {
    parameterId: "non_soil_waste_packaging_required",
    titleRu: "Нужна отдельная упаковка строительных отходов",
    valueType: "boolean",
    unitId: null,
    visibilityRole: "USER_INPUT",
    required: true,
    defaultValue: null,
    requiredWhen: separateNonSoilWasteHandling,
    guideRu: "Подтвердите по плану обращения с отходами; контейнерный поток без отдельной упаковки не получает лишние мешки.",
    sourceRole: "PROJECT_DOCUMENTATION",
  },
  {
    parameterId: "non_soil_waste_packaging_designation",
    titleRu: "Упаковка строительных отходов",
    valueType: "text",
    unitId: null,
    visibilityRole: "USER_INPUT",
    required: true,
    defaultValue: null,
    requiredWhen: nonSoilWastePackaging,
    guideRu: "Укажите тип мешка, контейнера или другой упаковки из плана обращения с отходами.",
    sourceRole: "PROJECT_DOCUMENTATION",
  },
  {
    parameterId: "non_soil_waste_packaging_quantity_piece",
    titleRu: "Количество упаковки строительных отходов",
    valueType: "decimal",
    unitId: "piece",
    visibilityRole: "USER_INPUT",
    required: true,
    defaultValue: null,
    requiredWhen: nonSoilWastePackaging,
    guideRu: "Введите прямое количество по плану обращения с отходами; универсальная вместимость упаковки не предполагается.",
    sourceRole: "PROJECT_DOCUMENTATION",
  },
]);

export const STRIP_FOUNDATION_PROFESSIONAL_INPUTS_R2: readonly StripFoundationInput[] = Object.freeze([
  ...STRIP_FOUNDATION_INPUTS,
  ...selectedChildParameters.map(projectInputFromChild).filter(
    (parameter): parameter is StripFoundationInput => parameter != null,
  ),
  ...sourceGapInputs,
]);

const selectedRowIds = new Set<string>(STRIP_FOUNDATION_COMPOSED_TYPED_CHILD_ROW_IDS_R2);
const selectedChildResources = [
  ...STRIP_FOUNDATION_REINFORCEMENT_RESOURCES,
  ...STRIP_FOUNDATION_CONCRETE_PLACEMENT_RESOURCES,
].filter((resource) => selectedRowIds.has(resource.row_id));
const selectedFormulaIds = new Set(selectedChildResources.map((resource) => resource.formula_id));
type ChildCanonicalFormula = CanonicalEstimateFormulaDefinition & Readonly<{
  output_unit_id: string;
  expression_source: string;
}>;

function childCanonicalFormula(
  formula: CanonicalEstimateFormulaDefinition,
): ChildCanonicalFormula {
  const candidate = formula as ChildCanonicalFormula;
  if (!candidate.output_unit_id || !candidate.expression_source) {
    throw new Error(`STRIP_FOUNDATION_CHILD_FORMULA_PRESENTATION_MISSING:${formula.formula_id}`);
  }
  return candidate;
}

const selectedChildFormulaSources: Readonly<Record<string, { outputUnitId: string; source: string }>> = Object.freeze({
  spacer_chair_quantity_v1: {
    outputUnitId: "piece",
    source: "total_axis_length_m * strip_height_m * formwork_sides * spacer_chair_rate_piece_m2",
  },
  unloading_and_storage_labor_v1: { outputUnitId: "t", source: "reinforcement_mass_t" },
  cover_control_labor_v1: { outputUnitId: "t", source: "reinforcement_mass_t" },
  reinforcement_inspection_service_v1: { outputUnitId: "t", source: "reinforcement_mass_t" },
  mill_certificate_package_v1: { outputUnitId: "t", source: "reinforcement_mass_t" },
  quality_control_documents_v1: {
    outputUnitId: "m3",
    source: "total_axis_length_m * strip_width_m * strip_height_m",
  },
});
const selectedChildFormulas = [
  ...STRIP_FOUNDATION_REINFORCEMENT_FORMULAS,
  ...STRIP_FOUNDATION_CONCRETE_PLACEMENT_FORMULAS,
].filter((formula) => selectedFormulaIds.has(formula.formula_id)).map((formula) => {
  const sourceFormula = childCanonicalFormula(formula);
  const replacement = selectedChildFormulaSources[sourceFormula.formula_id];
  if (!replacement) return sourceFormula;
  const compiled = compileFormulaGraph(replacement.source);
  return {
    ...sourceFormula,
    output_unit_id: replacement.outputUnitId,
    expression_source: compiled.source,
    ast: compiled.ast,
    input_parameter_ids: compiled.inputParameterIds,
  };
});

function sourceFormula(
  formulaId: string,
  outputUnitId: string,
  source: string,
): StripFoundationProfessionalFormulaR2 {
  const compiled = compileFormulaGraph(source);
  return {
    formulaId,
    outputUnitId,
    source: compiled.source,
    ast: compiled.ast,
    inputParameterIds: compiled.inputParameterIds,
  };
}

const sourceGapFormulas: readonly StripFoundationProfessionalFormulaR2[] = Object.freeze([
  sourceFormula(
    "axis_setting_out_and_control_service_v1",
    "m",
    "total_axis_length_m",
  ),
  sourceFormula(
    "formwork_tie_accessories_quantity_v1",
    "m2",
    "total_axis_length_m * strip_height_m * formwork_sides",
  ),
  sourceFormula(
    "formwork_release_agent_quantity_v1",
    "l",
    "total_axis_length_m * strip_height_m * formwork_sides * formwork_release_agent_consumption_l_m2",
  ),
  sourceFormula(
    "waterproofing_coating_quantity_v1",
    "l",
    "waterproofing_area_m2 * (waterproofing_pressure_exposure ? 5 : 4)",
  ),
  sourceFormula(
    "waterproofing_primer_quantity_v1",
    "l",
    "waterproofing_area_m2 * waterproofing_primer_consumption_l_m2",
  ),
  sourceFormula(
    "waterproofing_protection_layer_quantity_v1",
    "m2",
    "waterproofing_area_m2",
  ),
  sourceFormula(
    "waterproofing_detail_reinforcement_quantity_v1",
    "m2",
    "waterproofing_area_m2 * waterproofing_detail_reinforcement_consumption_m2_m2",
  ),
  sourceFormula(
    "formwork_return_transport_v1",
    "t_km",
    "formwork_transport_mass_t * formwork_return_distance_km",
  ),
  sourceFormula(
    "foundation_curing_water_quantity_v1",
    "m3",
    "curing_water_m3",
  ),
  sourceFormula(
    "foundation_curing_water_supply_equipment_v1",
    "machine_hour",
    "curing_water_supply_machine_h",
  ),
  sourceFormula(
    "foundation_as_built_survey_length_v1",
    "m",
    "total_axis_length_m",
  ),
  sourceFormula(
    "foundation_as_built_survey_document_count_v1",
    "document",
    "as_built_survey_document_count",
  ),
  sourceFormula(
    "foundation_horizontal_cutoff_waterproofing_area_v1",
    "m2",
    "horizontal_cutoff_waterproofing_area_m2",
  ),
  sourceFormula(
    "formwork_tie_consumables_quantity_v1",
    "piece",
    "formwork_tie_consumables_quantity_piece",
  ),
  sourceFormula(
    "foundation_excavation_support_area_v1",
    "m2",
    "excavation_support_area_m2",
  ),
  sourceFormula(
    "foundation_excavation_dewatering_machine_h_v1",
    "machine_hour",
    "excavation_dewatering_machine_h",
  ),
  sourceFormula(
    "foundation_site_cleanup_worker_h_v1",
    "man_hour",
    "site_cleanup_worker_h",
  ),
  sourceFormula(
    "foundation_non_soil_waste_mass_v1",
    "t",
    "non_soil_waste_mass_t",
  ),
  sourceFormula(
    "foundation_non_soil_waste_haul_v1",
    "t_km",
    "non_soil_waste_mass_t * non_soil_waste_haul_distance_km",
  ),
  sourceFormula(
    "foundation_non_soil_waste_packaging_v1",
    "piece",
    "non_soil_waste_packaging_quantity_piece",
  ),
]);

export const STRIP_FOUNDATION_PROFESSIONAL_FORMULAS_R2:
readonly StripFoundationProfessionalFormulaR2[] = Object.freeze([
  ...STRIP_FOUNDATION_FORMULAS.map((formula) => ({
    formulaId: formula.formulaId,
    outputUnitId: formula.outputUnitId,
    source: formula.source,
    ast: formula.ast,
    inputParameterIds: formula.inputParameterIds,
  })),
  ...selectedChildFormulas.map((formula) => ({
    formulaId: formula.formula_id,
    outputUnitId: formula.output_unit_id,
    source: formula.expression_source,
    ast: formula.ast,
    inputParameterIds: formula.input_parameter_ids,
  })),
  ...sourceGapFormulas,
]);

const sectionByCategory: Record<CompositionCategoryR2, string> = {
  material: "Материалы",
  construction_work: "Строительные работы",
  machine_equipment: "Машины и оборудование",
  delivery: "Доставка",
  service: "Контроль, испытания и документация",
  document: "Исполнительная документация",
};

const rowTypeByCategory: Record<CompositionCategoryR2, StripFoundationProfessionalRowR2["rowType"]> = {
  material: "material",
  construction_work: "work",
  machine_equipment: "equipment",
  delivery: "service",
  service: "service",
  document: "service",
};

function childNormSource(resource: (typeof selectedChildResources)[number]): StripFoundationNormSource {
  const metadata = resource.source_metadata as Record<string, unknown>;
  const traces = Array.isArray(metadata.normativeTrace)
    ? metadata.normativeTrace as Record<string, unknown>[]
    : [];
  const first = traces[0];
  return {
    sourceKey: typeof first?.sourceId === "string" ? first.sourceId : "approved_project_documentation",
    documentCode: typeof metadata.sourceRole === "string" ? metadata.sourceRole : "Рабочая документация",
    officialUrl: "",
    artifactSha256: null,
    tableCode: null,
    rateCode: null,
    meter: "проектная величина",
    pdfPage: null,
    locator: typeof metadata.sourceRole === "string"
      ? metadata.sourceRole
      : "утверждённая проектная, производственная или контрольная ведомость",
  };
}

function childApplicability(resource: (typeof selectedChildResources)[number]): InclusionGraphAst {
  const ast = resource.inclusion_ast as InclusionGraphAst;
  return resource.row_id.includes(":reinforcement:") ? and(fullScope, ast) : ast;
}

function childTitleMetadata(resource: (typeof selectedChildResources)[number]): Pick<
  StripFoundationProfessionalRowR2,
  "titleSpecificationParameterIds" | "titleSpecificationMode" | "titleSpecificationSeparator"
> {
  const graph = resource.resource_graph as Record<string, unknown>;
  const ids = Array.isArray(graph.titleSpecificationParameterIds)
    ? graph.titleSpecificationParameterIds.map(String)
    : undefined;
  return {
    ...(ids ? { titleSpecificationParameterIds: ids } : {}),
    ...(graph.titleSpecificationMode === "APPEND" || graph.titleSpecificationMode === "REPLACE"
      ? { titleSpecificationMode: graph.titleSpecificationMode }
      : {}),
    ...(graph.titleSpecificationSeparator === " " || graph.titleSpecificationSeparator === " — "
      ? { titleSpecificationSeparator: graph.titleSpecificationSeparator }
      : {}),
  };
}

const MAX_FRANK_WALL_SPACER_SOURCE: StripFoundationNormSource = Object.freeze({
  sourceKey: "max_frank_spacers_dbv_wall_r1",
  documentCode: "MAX FRANK Spacers, Distance Tubes, Sealing Cones & Plugs",
  officialUrl: "https://www.maxfrank.com/wAssets/docs/products/brochures/spacers-distance-tubes-sealing-cones-plugs-u-korb-BR-INTGB.pdf",
  artifactSha256: null,
  tableCode: "Recommendations for spacing and number of spacers — walls",
  rateCode: "BLOCK_SPACERS_SUPPORTING_BARS_UP_TO_8MM",
  meter: "4 шт./м² каждой стороны стены",
  pdfPage: 7,
  locator: "Structural element: walls; block spacers; supporting bars up to 8 mm; 4 pcs/m² per wall side",
});

const DOKA_TRENN_SOURCE: StripFoundationNormSource = Object.freeze({
  sourceKey: "doka_trenn_absorbent_formwork_100m2_l_r1",
  documentCode: "Doka-Trenn official product information",
  officialUrl: "https://www.doka.com/au/system-groups/doka-system-components/release-agent/release-agents",
  artifactSha256: null,
  tableCode: null,
  rateCode: "DOKA_TRENN_UP_TO_100_M2_PER_L",
  meter: "до 100 м²/л для впитывающей поверхности",
  pdfPage: null,
  locator: "Doka-Trenn; universal release agent for absorbent formwork surfaces; coverage up to 100 m²/l",
});

const SIKA_IGOLFLEX_101DE_SOURCE: StripFoundationNormSource = Object.freeze({
  sourceKey: "sika_igolflex_101de_system_2025_r1",
  documentCode: "Sika Igolflex-101 DE / P-01 DE / F-01 EU product data sheets",
  officialUrl: "https://pol.sika.com/pl/budownictwo-mieszkaniowe/rozwiazania/izolacja-fundamentow/sika-igolflex-101de.html",
  artifactSha256: null,
  tableCode: "System structure and consumption",
  rateCode: "IGOLFLEX_101DE_DAMP_4L_WATER_5L_P01_005L_F01_110M2",
  meter: "площадь покрытия × подтверждённый расход компонента",
  pdfPage: null,
  locator: "two-coat system; 4.0 l/m² damp proofing or 5.0 l/m² waterproofing; P-01 DE primer 0.050 l/m²; F-01 EU 1.10 m²/m²",
});

const SIKA_PROTECTION_BOARD_SOURCE: StripFoundationNormSource = Object.freeze({
  sourceKey: "sikashield_pb_p15_pe_6mm_2024_r1",
  documentCode: "SikaShield PB P15 PE 6 mm Product Data Sheet",
  officialUrl: "https://gcc.sika.com/dam/dms/gcc/w/pds-sikashield-pbp15pesa6mm.pdf",
  artifactSha256: null,
  tableCode: "Product information and application",
  rateCode: "SIKASHIELD_PB_P15_PE_1X2M_BUTT_JOINT",
  meter: "м² защищаемой гидроизоляции",
  pdfPage: null,
  locator: "1.0 × 2.0 m protection board; protects waterproofing against backfill; continuous butt-joint installation",
});

const compositeRows: StripFoundationProfessionalRowR2[] = STRIP_FOUNDATION_ROWS.map((row) => ({
  rowId: row.rowId,
  section: sectionByCategory[row.category],
  category: row.category,
  rowType: rowTypeByCategory[row.category],
  canonicalRuName: row.rowId === "bituminous_waterproofing"
    ? "Обмазочная гидроизоляция"
    : row.canonicalRuName,
  normalizedUom: row.rowId === "bituminous_waterproofing" ? "l" : row.normalizedUom,
  formulaId: row.rowId === "bituminous_waterproofing"
    ? "waterproofing_coating_quantity_v1"
    : row.formulaId,
  applicabilityExpression: row.applicabilityExpression,
  semanticOwnerId: row.semanticOwnerId,
  costOwnerId: row.costOwner === "rate_item" ? `rate-item:${row.rateItemId}` : row.semanticOwnerId,
  resourceId: row.resourceId,
  procurementEligible: row.category !== "construction_work" && !row.includedInParentRate,
  includedInParentRate: row.includedInParentRate,
  visibility: row.visibility,
  normSource: row.rowId === "bituminous_waterproofing" ? SIKA_IGOLFLEX_101DE_SOURCE : row.normSource,
  sourceMetadata: {
    owner: "r6-concrete:strip-foundation",
    compositionContract: STRIP_FOUNDATION_PROFESSIONAL_COMPOSITION_R2_CONTRACT,
  },
  compositionOrigin: "COMPOSITE_OWNER",
  ...((row.rowId === "bituminous_waterproofing" || row.titleSpecificationParameterIds)
    ? { titleSpecificationParameterIds: row.rowId === "bituminous_waterproofing"
      ? ["waterproofing_coating_designation"]
      : row.titleSpecificationParameterIds }
    : {}),
  ...(row.rowId === "bituminous_waterproofing"
    ? { titleSpecificationMode: "APPEND" as const }
    : row.titleSpecificationMode ? { titleSpecificationMode: row.titleSpecificationMode } : {}),
  ...(row.titleSpecificationSeparator
    ? { titleSpecificationSeparator: row.titleSpecificationSeparator }
    : {}),
  ...(row.cargo ? { cargo: row.cargo } : {}),
}));

const includedChildCostOwnerByRowId: Readonly<Record<string, string>> = Object.freeze({
  "work:reinforcement:unload-store": "r6-concrete:strip-foundation:reinforcement_install",
  "work:reinforcement:cover-control": "r6-concrete:strip-foundation:reinforcement_install",
  "service:reinforcement:inspection": "r6-concrete:strip-foundation:reinforcement_install",
  "service:reinforcement:mill-certificates": "r6-concrete:strip-foundation:reinforcement",
  "service:concrete:acceptance-control": "r6-concrete:strip-foundation:concrete_placement",
});

function childCompositionCategory(category: string): CompositionCategoryR2 {
  switch (category) {
    case "equipment":
      return "machine_equipment";
    case "material":
    case "construction_work":
    case "delivery":
    case "service":
    case "document":
      return category;
    default:
      throw new Error(`STRIP_FOUNDATION_CHILD_CATEGORY_UNSUPPORTED:${category}`);
  }
}

const childRows: StripFoundationProfessionalRowR2[] = selectedChildResources.map((resource) => {
  const category = childCompositionCategory(resource.category);
  const graph = resource.resource_graph as Record<string, unknown>;
  const semanticOwnerId = String(graph.semanticOwnerId ?? resource.cost_owner_id ?? resource.row_id);
  const includedParentCostOwner = includedChildCostOwnerByRowId[resource.row_id];
  const selectedFormula = selectedChildFormulas.find((formula) => formula.formula_id === resource.formula_id);
  return {
    rowId: resource.row_id,
    section: resource.section,
    category,
    rowType: rowTypeByCategory[category],
    canonicalRuName: resource.title_ru,
    normalizedUom: selectedFormula?.output_unit_id ?? resource.unit_id,
    formulaId: resource.formula_id,
    applicabilityExpression: childApplicability(resource),
    semanticOwnerId,
    costOwnerId: includedParentCostOwner ?? String(resource.cost_owner_id ?? semanticOwnerId),
    resourceId: resource.id,
    procurementEligible: includedParentCostOwner ? false : resource.procurement_eligible,
    includedInParentRate: Boolean(includedParentCostOwner),
    visibility: includedParentCostOwner ? "expanded_resource" : "customer",
    normSource: resource.row_id === "material:reinforcement:spacer-chairs"
      ? MAX_FRANK_WALL_SPACER_SOURCE
      : childNormSource(resource),
    sourceMetadata: {
      ...(resource.source_metadata as Record<string, unknown>),
      typedChildRowId: resource.row_id,
      compositionContract: STRIP_FOUNDATION_PROFESSIONAL_COMPOSITION_R2_CONTRACT,
      doubleCountGuard: "UNIQUE_CHILD_RESOURCE_ONLY",
      ...(includedParentCostOwner ? {
        costTreatment: "INCLUDED_IN_RESOURCE_ROWS",
        includedParentCostOwner,
        measuredBasisOnly: true,
      } : {}),
    },
    compositionOrigin: "TYPED_CHILD_OWNER",
    ...childTitleMetadata(resource),
  };
});

const SN_KR_52_02_2024_SOURCE: StripFoundationNormSource = Object.freeze({
  sourceKey: "sn_kr_52_02_2024",
  documentCode: "СН КР 52-02:2024",
  officialUrl: "https://minstroy.gov.kg/ru/state_program/download-pdf/snkr52022024zbk-352665803430043e9.36200818.pdf",
  artifactSha256: null,
  tableCode: null,
  rateCode: null,
  meter: "проектная операция контроля",
  pdfPage: null,
  locator: "пункты 11.5.2, 11.5.6 и 11.5.7; конкретный объём — по проекту геодезических работ",
});

const PROJECT_FORMWORK_SYSTEM_SOURCE: StripFoundationNormSource = Object.freeze({
  sourceKey: "project_formwork_system_schedule",
  documentCode: "Проект опалубки и TDS выбранной системы",
  officialUrl: "",
  artifactSha256: null,
  tableCode: null,
  rateCode: null,
  meter: "проектная спецификация и расход выбранного продукта",
  pdfPage: null,
  locator: "раскладка, комплектовочная ведомость, узлы крепления и технический лист выбранной системы",
});

const ACI_308_CURING_SOURCE: StripFoundationNormSource = Object.freeze({
  sourceKey: CONCRETE_SLAB_CURING_SOURCE_ID,
  documentCode: CONCRETE_SLAB_CURING_SOURCE_METADATA.source_document_version,
  officialUrl: CONCRETE_SLAB_CURING_SOURCE_METADATA.source_url,
  artifactSha256: CONCRETE_SLAB_CURING_SOURCE_METADATA.definition_hash,
  tableCode: null,
  rateCode: null,
  meter: "применимость способа ухода; количества только из утверждённой технологической карты",
  pdfPage: null,
  locator: CONCRETE_SLAB_CURING_SOURCE_METADATA.exact_locator,
});

const PROJECT_HORIZONTAL_CUTOFF_SOURCE: StripFoundationNormSource = Object.freeze({
  sourceKey: "project_wall_foundation_horizontal_cutoff_detail",
  documentCode: "Проектный узел стены и фундамента",
  officialUrl: "",
  artifactSha256: null,
  tableCode: null,
  rateCode: null,
  meter: "прямое количество выбранной системы по проектному узлу",
  pdfPage: null,
  locator: "узел горизонтальной отсечки, спецификация материала, нахлёсты и граница работ",
});

const PROJECT_TEMPORARY_EARTHWORKS_SOURCE: StripFoundationNormSource = Object.freeze({
  sourceKey: "project_excavation_support_and_dewatering_plan",
  documentCode: "ППР земляных работ и данные о грунтовых водах",
  officialUrl: "",
  artifactSha256: null,
  tableCode: null,
  rateCode: null,
  meter: "прямые количества утверждённой схемы временных работ",
  pdfPage: null,
  locator: "крепление стенок, условия устойчивости откосов, водоприток, выбранное оборудование и машино-время",
});

const PROJECT_NON_SOIL_WASTE_SOURCE: StripFoundationNormSource = Object.freeze({
  sourceKey: "project_non_soil_construction_waste_management_plan",
  documentCode: "План обращения со строительными отходами",
  officialUrl: "",
  artifactSha256: null,
  tableCode: null,
  rateCode: null,
  meter: "подтверждённые трудозатраты, масса, упаковка и маршрут",
  pdfPage: null,
  locator: "граница уборки, поток отходов кроме грунта, упаковка, погрузка, получатель и транспортный маршрут",
});

function sourceGapRow(input: {
  rowId: string;
  section: string;
  category: CompositionCategoryR2;
  titleRu: string;
  unitId: string;
  formulaId: string;
  applicability: InclusionGraphAst;
  normSource: StripFoundationNormSource;
  procurementEligible: boolean;
  sourceRole: string;
  titleParameterIds?: readonly string[];
  referenceRoutes?: readonly string[];
  includedInParentRate?: boolean;
  parentCostOwnerId?: string;
  visibility?: StripFoundationProfessionalRowR2["visibility"];
  projectSelectionRequired?: boolean;
  cargo?: StripFoundationProfessionalRowR2["cargo"];
}): StripFoundationProfessionalRowR2 {
  const semanticOwnerId = `strip-foundation-professional:${input.rowId}`;
  const includedInParentRate = input.includedInParentRate ?? false;
  return {
    rowId: input.rowId,
    section: input.section,
    category: input.category,
    rowType: rowTypeByCategory[input.category],
    canonicalRuName: input.titleRu,
    normalizedUom: input.unitId,
    formulaId: input.formulaId,
    applicabilityExpression: input.applicability,
    semanticOwnerId,
    costOwnerId: input.parentCostOwnerId ?? semanticOwnerId,
    resourceId: `strip-foundation-professional-resource:${input.rowId}`,
    procurementEligible: includedInParentRate ? false : input.procurementEligible,
    includedInParentRate,
    visibility: input.visibility ?? "customer",
    normSource: input.normSource,
    sourceMetadata: {
      sourceRole: input.sourceRole,
      compositionContract: STRIP_FOUNDATION_PROFESSIONAL_COMPOSITION_R2_CONTRACT,
      automaticProfileId: STRIP_FOUNDATION_S26_AUTOMATIC_PROFILE_ID,
      projectSelectionRequired: input.projectSelectionRequired ?? false,
      hiddenQuantityDefaultForbidden: true,
      ...(includedInParentRate ? {
        costTreatment: "INCLUDED_IN_RESOURCE_ROWS",
        includedParentCostOwner: input.parentCostOwnerId,
        measuredBasisOnly: true,
      } : {}),
      ...(input.referenceRoutes ? {
        supplementaryReferenceRoutes: input.referenceRoutes,
        manufacturerProductSelected: false,
        foreignMandatoryForKg: false,
      } : {}),
    },
    compositionOrigin: "COMPOSITE_OWNER",
    ...(input.titleParameterIds ? {
      titleSpecificationParameterIds: input.titleParameterIds,
      titleSpecificationMode: "APPEND",
      titleSpecificationSeparator: " — ",
    } : {}),
    ...(input.cargo ? { cargo: input.cargo } : {}),
  };
}

export const STRIP_FOUNDATION_SOURCE_GAP_ROW_IDS_R2 = Object.freeze([
  "work:foundation:axis-setting-out-control",
  "service:foundation:as-built-survey",
  "document:foundation:as-built-survey-record",
  "material:formwork:ties-accessories",
  "material:formwork:release-agent",
  "work:formwork:strip-clean-return-preparation",
  "delivery:formwork:return-kit",
  "material:concrete:curing-water",
  "equipment:concrete:curing-water-supply",
  "material:waterproofing:horizontal-cutoff",
  "work:waterproofing:horizontal-cutoff-install",
  "material:formwork:tie-consumables-included",
  "material:formwork:tie-consumables-separate",
  "material:earthworks:excavation-support",
  "work:earthworks:excavation-support-install-remove",
  "equipment:earthworks:dewatering",
  "work:foundation:site-cleanup",
  "material:foundation:waste-packaging",
  "work:foundation:waste-sort-load",
  "delivery:foundation:construction-waste-haul",
  "service:foundation:construction-waste-disposal",
  "material:waterproofing:system-primer",
  "work:waterproofing:system-primer-application",
  "material:waterproofing:protection-layer",
  "work:waterproofing:protection-layer-install",
  "material:waterproofing:detail-reinforcement",
  "work:waterproofing:detail-reinforcement-install",
] as const);

const sourceGapRows: readonly StripFoundationProfessionalRowR2[] = Object.freeze([
  sourceGapRow({
    rowId: "work:foundation:axis-setting-out-control",
    section: "Геодезическая подготовка и контроль",
    category: "construction_work",
    titleRu: "Разбивка осей и контроль положения фундаментной ленты",
    unitId: "m",
    formulaId: "axis_setting_out_and_control_service_v1",
    applicability: fullScope,
    normSource: SN_KR_52_02_2024_SOURCE,
    procurementEligible: true,
    sourceRole: "PROJECT_SETTING_OUT_PLAN_AND_SN_KR_52_02_2024",
  }),
  sourceGapRow({
    rowId: "service:foundation:as-built-survey",
    section: "Исполнительный геодезический контроль",
    category: "service",
    titleRu: "Исполнительная геодезическая съёмка фундаментной ленты",
    unitId: "m",
    formulaId: "foundation_as_built_survey_length_v1",
    applicability: asBuiltSurvey,
    normSource: SN_KR_52_02_2024_SOURCE,
    procurementEligible: true,
    sourceRole: "PROJECT_SURVEY_CONTROL_PLAN_AND_SN_KR_52_02_2024",
    projectSelectionRequired: true,
  }),
  sourceGapRow({
    rowId: "document:foundation:as-built-survey-record",
    section: "Исполнительная документация",
    category: "document",
    titleRu: "Схема или отчёт исполнительной съёмки фундаментной ленты",
    unitId: "document",
    formulaId: "foundation_as_built_survey_document_count_v1",
    applicability: asBuiltSurvey,
    normSource: SN_KR_52_02_2024_SOURCE,
    procurementEligible: false,
    sourceRole: "PROJECT_SURVEY_CONTROL_PLAN_AND_SN_KR_52_02_2024",
    includedInParentRate: true,
    parentCostOwnerId: "strip-foundation-professional:service:foundation:as-built-survey",
    visibility: "expanded_resource",
    projectSelectionRequired: true,
  }),
  sourceGapRow({
    rowId: "material:formwork:ties-accessories",
    section: "Материалы опалубочной системы",
    category: "material",
    titleRu: "Крепления и комплектующие в составе щитовой опалубки",
    unitId: "m2",
    formulaId: "formwork_tie_accessories_quantity_v1",
    applicability: formworkTieAccessories,
    normSource: PROJECT_FORMWORK_SYSTEM_SOURCE,
    procurementEligible: false,
    sourceRole: "PROJECT_FORMWORK_LAYOUT_AND_SELECTED_SYSTEM_TDS",
    titleParameterIds: ["formwork_tie_accessories_designation"],
    includedInParentRate: true,
    parentCostOwnerId: "r6-concrete:strip-foundation:formwork_system",
    visibility: "expanded_resource",
    referenceRoutes: [
      "https://www.doka.com/en/solutions/overview/index?changecountry=EN",
      "https://www.doka.com/us/system-groups/doka-system-components/form-ties-suspension-cones/index",
    ],
  }),
  sourceGapRow({
    rowId: "material:formwork:release-agent",
    section: "Материалы опалубочной системы",
    category: "material",
    titleRu: "Разделительный состав для выбранной опалубочной системы",
    unitId: "l",
    formulaId: "formwork_release_agent_quantity_v1",
    applicability: formworkReleaseAgent,
    normSource: DOKA_TRENN_SOURCE,
    procurementEligible: true,
    sourceRole: "SELECTED_FORMWORK_RELEASE_AGENT_TDS",
    titleParameterIds: ["formwork_release_agent_designation"],
    referenceRoutes: ["https://www.doka.com/au/system-groups/doka-system-components/release-agent/release-agents"],
  }),
  sourceGapRow({
    rowId: "work:formwork:strip-clean-return-preparation",
    section: "Работы с опалубочной системой",
    category: "construction_work",
    titleRu: "Очистка щитов и подготовка арендной опалубки к возврату",
    unitId: "m2",
    formulaId: "formwork_contact_area",
    applicability: returnableRentalFormwork,
    normSource: PROJECT_FORMWORK_SYSTEM_SOURCE,
    procurementEligible: false,
    sourceRole: "PROJECT_FORMWORK_RETURN_PLAN",
    includedInParentRate: true,
    parentCostOwnerId: "r6-concrete:strip-foundation:formwork_remove",
    visibility: "expanded_resource",
    projectSelectionRequired: true,
  }),
  sourceGapRow({
    rowId: "delivery:formwork:return-kit",
    section: "Логистика опалубочной системы",
    category: "delivery",
    titleRu: "Возврат арендного комплекта опалубки поставщику",
    unitId: "t_km",
    formulaId: "formwork_return_transport_v1",
    applicability: and(
      returnableRentalFormwork,
      equals("delivery_separately_priced", true),
      greaterThan("formwork_return_distance_km", 0),
      greaterThan("formwork_transport_mass_t", 0),
    ),
    normSource: PROJECT_FORMWORK_SYSTEM_SOURCE,
    procurementEligible: true,
    sourceRole: "SUPPLIER_FORMWORK_RETURN_ROUTE_AND_QUOTE",
    projectSelectionRequired: true,
    cargo: {
      cargoRu: "арендный комплект опалубки",
      vehicleRu: "бортовой автомобиль",
      physicalQuantityFormulaId: "formwork_transport_mass",
      physicalQuantityUom: "t",
      distanceParameterId: "formwork_return_distance_km",
    },
  }),
  sourceGapRow({
    rowId: "material:concrete:curing-water",
    section: "Материалы для ухода за бетоном",
    category: "material",
    titleRu: "Вода для ухода за бетоном",
    unitId: "m3",
    formulaId: "foundation_curing_water_quantity_v1",
    applicability: waterCuring,
    normSource: ACI_308_CURING_SOURCE,
    procurementEligible: true,
    sourceRole: "APPROVED_PROJECT_CURING_METHOD_AND_DIRECT_PROJECT_SCHEDULE",
    projectSelectionRequired: true,
    referenceRoutes: [CONCRETE_SLAB_CURING_SOURCE_METADATA.source_url],
  }),
  sourceGapRow({
    rowId: "equipment:concrete:curing-water-supply",
    section: "Механизмы для ухода за бетоном",
    category: "machine_equipment",
    titleRu: "Оборудование для подачи воды при уходе за бетоном",
    unitId: "machine_hour",
    formulaId: "foundation_curing_water_supply_equipment_v1",
    applicability: separateCuringWaterSupply,
    normSource: ACI_308_CURING_SOURCE,
    procurementEligible: true,
    sourceRole: "SELECTED_CURING_WATER_SUPPLY_EQUIPMENT_PASSPORT",
    titleParameterIds: ["curing_water_supply_equipment_designation"],
    projectSelectionRequired: true,
    referenceRoutes: [CONCRETE_SLAB_CURING_SOURCE_METADATA.source_url],
  }),
  sourceGapRow({
    rowId: "material:waterproofing:horizontal-cutoff",
    section: "Материалы гидроизоляционной системы",
    category: "material",
    titleRu: "Горизонтальная отсечная гидроизоляция",
    unitId: "m2",
    formulaId: "foundation_horizontal_cutoff_waterproofing_area_v1",
    applicability: horizontalCutoffWaterproofing,
    normSource: PROJECT_HORIZONTAL_CUTOFF_SOURCE,
    procurementEligible: true,
    sourceRole: "PROJECT_WALL_FOUNDATION_JUNCTION_DETAIL_AND_SELECTED_SYSTEM_TDS",
    titleParameterIds: ["horizontal_cutoff_waterproofing_designation"],
    projectSelectionRequired: true,
  }),
  sourceGapRow({
    rowId: "work:waterproofing:horizontal-cutoff-install",
    section: "Работы гидроизоляционной системы",
    category: "construction_work",
    titleRu: "Монтаж горизонтальной отсечной гидроизоляции",
    unitId: "m2",
    formulaId: "foundation_horizontal_cutoff_waterproofing_area_v1",
    applicability: horizontalCutoffWaterproofing,
    normSource: PROJECT_HORIZONTAL_CUTOFF_SOURCE,
    procurementEligible: false,
    sourceRole: "PROJECT_WALL_FOUNDATION_JUNCTION_DETAIL_AND_SELECTED_SYSTEM_TDS",
    titleParameterIds: ["horizontal_cutoff_waterproofing_designation"],
    projectSelectionRequired: true,
  }),
  sourceGapRow({
    rowId: "material:formwork:tie-consumables-included",
    section: "Материалы опалубочной системы",
    category: "material",
    titleRu: "Расходные детали стяжных узлов в составе комплекта опалубки",
    unitId: "piece",
    formulaId: "formwork_tie_consumables_quantity_v1",
    applicability: includedFormworkTieConsumables,
    normSource: PROJECT_FORMWORK_SYSTEM_SOURCE,
    procurementEligible: false,
    sourceRole: "PROJECT_FORMWORK_LAYOUT_AND_SUPPLIER_KIT_SCHEDULE",
    titleParameterIds: ["formwork_tie_consumables_designation"],
    includedInParentRate: true,
    parentCostOwnerId: "r6-concrete:strip-foundation:formwork_system",
    visibility: "expanded_resource",
    projectSelectionRequired: true,
  }),
  sourceGapRow({
    rowId: "material:formwork:tie-consumables-separate",
    section: "Материалы опалубочной системы",
    category: "material",
    titleRu: "Расходные детали стяжных узлов опалубки",
    unitId: "piece",
    formulaId: "formwork_tie_consumables_quantity_v1",
    applicability: separatelyPurchasedFormworkTieConsumables,
    normSource: PROJECT_FORMWORK_SYSTEM_SOURCE,
    procurementEligible: true,
    sourceRole: "PROJECT_FORMWORK_LAYOUT_AND_SEPARATE_SUPPLIER_QUOTE",
    titleParameterIds: ["formwork_tie_consumables_designation"],
    projectSelectionRequired: true,
  }),
  sourceGapRow({
    rowId: "material:earthworks:excavation-support",
    section: "Временные земляные работы",
    category: "material",
    titleRu: "Комплект крепления стенок выемки",
    unitId: "m2",
    formulaId: "foundation_excavation_support_area_v1",
    applicability: excavationSupport,
    normSource: PROJECT_TEMPORARY_EARTHWORKS_SOURCE,
    procurementEligible: true,
    sourceRole: "PROJECT_EXCAVATION_SUPPORT_PLAN",
    titleParameterIds: ["excavation_support_designation"],
    projectSelectionRequired: true,
  }),
  sourceGapRow({
    rowId: "work:earthworks:excavation-support-install-remove",
    section: "Временные земляные работы",
    category: "construction_work",
    titleRu: "Монтаж и демонтаж крепления стенок выемки",
    unitId: "m2",
    formulaId: "foundation_excavation_support_area_v1",
    applicability: excavationSupport,
    normSource: PROJECT_TEMPORARY_EARTHWORKS_SOURCE,
    procurementEligible: false,
    sourceRole: "PROJECT_EXCAVATION_SUPPORT_PLAN",
    titleParameterIds: ["excavation_support_designation"],
    projectSelectionRequired: true,
  }),
  sourceGapRow({
    rowId: "equipment:earthworks:dewatering",
    section: "Временные земляные работы",
    category: "machine_equipment",
    titleRu: "Оборудование для водоотлива из выемки",
    unitId: "machine_hour",
    formulaId: "foundation_excavation_dewatering_machine_h_v1",
    applicability: excavationDewatering,
    normSource: PROJECT_TEMPORARY_EARTHWORKS_SOURCE,
    procurementEligible: true,
    sourceRole: "PROJECT_DEWATERING_PLAN_AND_SELECTED_EQUIPMENT_PASSPORT",
    titleParameterIds: ["excavation_dewatering_equipment_designation"],
    projectSelectionRequired: true,
  }),
  sourceGapRow({
    rowId: "work:foundation:site-cleanup",
    section: "Завершение работ",
    category: "construction_work",
    titleRu: "Итоговая уборка участка фундаментных работ",
    unitId: "man_hour",
    formulaId: "foundation_site_cleanup_worker_h_v1",
    applicability: separateSiteCleanup,
    normSource: PROJECT_NON_SOIL_WASTE_SOURCE,
    procurementEligible: false,
    sourceRole: "PROJECT_EXECUTION_AND_CLEANUP_PLAN",
    projectSelectionRequired: true,
  }),
  sourceGapRow({
    rowId: "material:foundation:waste-packaging",
    section: "Обращение со строительными отходами",
    category: "material",
    titleRu: "Упаковка строительных отходов кроме грунта",
    unitId: "piece",
    formulaId: "foundation_non_soil_waste_packaging_v1",
    applicability: nonSoilWastePackaging,
    normSource: PROJECT_NON_SOIL_WASTE_SOURCE,
    procurementEligible: true,
    sourceRole: "PROJECT_NON_SOIL_WASTE_MANAGEMENT_PLAN",
    titleParameterIds: ["non_soil_waste_packaging_designation"],
    projectSelectionRequired: true,
  }),
  sourceGapRow({
    rowId: "work:foundation:waste-sort-load",
    section: "Обращение со строительными отходами",
    category: "construction_work",
    titleRu: "Сортировка и погрузка строительных отходов кроме грунта",
    unitId: "t",
    formulaId: "foundation_non_soil_waste_mass_v1",
    applicability: separateNonSoilWasteHandling,
    normSource: PROJECT_NON_SOIL_WASTE_SOURCE,
    procurementEligible: false,
    sourceRole: "PROJECT_NON_SOIL_WASTE_MANAGEMENT_PLAN",
    projectSelectionRequired: true,
  }),
  sourceGapRow({
    rowId: "delivery:foundation:construction-waste-haul",
    section: "Обращение со строительными отходами",
    category: "delivery",
    titleRu: "Вывоз строительных отходов кроме грунта",
    unitId: "t_km",
    formulaId: "foundation_non_soil_waste_haul_v1",
    applicability: and(
      separateNonSoilWasteHandling,
      greaterThan("non_soil_waste_mass_t", 0),
      greaterThan("non_soil_waste_haul_distance_km", 0),
    ),
    normSource: PROJECT_NON_SOIL_WASTE_SOURCE,
    procurementEligible: true,
    sourceRole: "APPROVED_WASTE_RECIPIENT_AND_ROUTE",
    projectSelectionRequired: true,
    cargo: {
      cargoRu: "строительные отходы кроме грунта",
      vehicleRu: "специализированный грузовой автомобиль",
      physicalQuantityFormulaId: "foundation_non_soil_waste_mass_v1",
      physicalQuantityUom: "t",
      distanceParameterId: "non_soil_waste_haul_distance_km",
    },
  }),
  sourceGapRow({
    rowId: "service:foundation:construction-waste-disposal",
    section: "Обращение со строительными отходами",
    category: "service",
    titleRu: "Приём строительных отходов кроме грунта выбранным получателем",
    unitId: "t",
    formulaId: "foundation_non_soil_waste_mass_v1",
    applicability: separateNonSoilWasteHandling,
    normSource: PROJECT_NON_SOIL_WASTE_SOURCE,
    procurementEligible: true,
    sourceRole: "APPROVED_WASTE_RECIPIENT_AND_ACCEPTANCE_QUOTE",
    projectSelectionRequired: true,
  }),
  ...([
    {
      rowId: "material:waterproofing:system-primer",
      section: "Материалы гидроизоляционной системы",
      category: "material" as const,
      titleRu: "Грунтовка выбранной гидроизоляционной системы",
      unitId: "l",
      formulaId: "waterproofing_primer_quantity_v1",
      applicability: waterproofingPrimer,
      procurementEligible: true,
      sourceRole: "SELECTED_WATERPROOFING_PRIMER_TDS",
      titleParameterIds: ["waterproofing_primer_designation"],
    },
    {
      rowId: "work:waterproofing:system-primer-application",
      section: "Работы гидроизоляционной системы",
      category: "construction_work" as const,
      titleRu: "Нанесение грунтовки выбранной гидроизоляционной системы",
      unitId: "m2",
      formulaId: "waterproofing_area",
      applicability: waterproofingPrimer,
      procurementEligible: false,
      sourceRole: "SELECTED_WATERPROOFING_PRIMER_TDS",
      titleParameterIds: ["waterproofing_primer_designation"],
    },
    {
      rowId: "material:waterproofing:protection-layer",
      section: "Материалы гидроизоляционной системы",
      category: "material" as const,
      titleRu: "Защитный слой выбранной гидроизоляционной системы",
      unitId: "m2",
      formulaId: "waterproofing_protection_layer_quantity_v1",
      applicability: waterproofingProtection,
      procurementEligible: true,
      sourceRole: "PROJECT_WATERPROOFING_PROTECTION_DETAIL",
      titleParameterIds: ["waterproofing_protection_layer_designation"],
    },
    {
      rowId: "work:waterproofing:protection-layer-install",
      section: "Работы гидроизоляционной системы",
      category: "construction_work" as const,
      titleRu: "Монтаж защитного слоя выбранной гидроизоляционной системы",
      unitId: "m2",
      formulaId: "waterproofing_protection_layer_quantity_v1",
      applicability: waterproofingProtection,
      procurementEligible: false,
      sourceRole: "PROJECT_WATERPROOFING_PROTECTION_DETAIL",
      titleParameterIds: ["waterproofing_protection_layer_designation"],
    },
    {
      rowId: "material:waterproofing:detail-reinforcement",
      section: "Материалы гидроизоляционной системы",
      category: "material" as const,
      titleRu: "Материал усиления примыканий гидроизоляции",
      unitId: "m2",
      formulaId: "waterproofing_detail_reinforcement_quantity_v1",
      applicability: waterproofingDetailReinforcement,
      procurementEligible: true,
      sourceRole: "PROJECT_WATERPROOFING_DETAIL_REINFORCEMENT",
      titleParameterIds: ["waterproofing_detail_reinforcement_designation"],
    },
    {
      rowId: "work:waterproofing:detail-reinforcement-install",
      section: "Работы гидроизоляционной системы",
      category: "construction_work" as const,
      titleRu: "Монтаж усиления примыканий гидроизоляции",
      unitId: "m2",
      formulaId: "waterproofing_detail_reinforcement_quantity_v1",
      applicability: waterproofingDetailReinforcement,
      procurementEligible: false,
      sourceRole: "PROJECT_WATERPROOFING_DETAIL_REINFORCEMENT",
      titleParameterIds: ["waterproofing_detail_reinforcement_designation"],
    },
  ] as const).map((row) => sourceGapRow({
    ...row,
    normSource: row.rowId.includes("protection-layer")
      ? SIKA_PROTECTION_BOARD_SOURCE
      : SIKA_IGOLFLEX_101DE_SOURCE,
    referenceRoutes: [
      "https://pol.sika.com/pl/budownictwo-mieszkaniowe/rozwiazania/izolacja-fundamentow/sika-igolflex-101de.html",
      "https://pol.sika.com/pl/budownictwo-mieszkaniowe/rozwiazania/izolacja-fundamentow/sika-igolflex-p-01de.html",
      "https://aut.sika.com/de/loesungen/rohbau/sika-igolflex-f-01eu.html",
      "https://gcc.sika.com/dam/dms/gcc/w/pds-sikashield-pbp15pesa6mm.pdf",
    ],
  })),
]);

export const STRIP_FOUNDATION_PROFESSIONAL_ROWS_R2:
readonly StripFoundationProfessionalRowR2[] = Object.freeze([
  ...compositeRows,
  ...childRows,
  ...sourceGapRows,
]);

export const STRIP_FOUNDATION_PROFESSIONAL_GOLD_INPUT_R2:
Readonly<Record<string, StripFoundationInputValue>> = Object.freeze({
  ...STRIP_FOUNDATION_GOLD_INPUT,
  foundation_automatic_profile_id: STRIP_FOUNDATION_S26_AUTOMATIC_PROFILE_ID,
  spacer_chair_designation: "Блочные фиксаторы MAX FRANK — предварительный профиль для опорных стержней до 8 мм",
  spacer_chair_rate_piece_m2: 4,
  mechanical_couplers_applicable: true,
  mechanical_coupler_designation: "PROJECT-COUPLER-D20",
  mechanical_coupler_quantity_piece: 24,
  lifting_equipment_applicable: true,
  lifting_equipment_designation: "PROJECT-LIFT-PLAN-01",
  lifting_machine_h: 5,
  construction_joint_mode: "WATERSTOP",
  construction_joint_waterstop_specification: "PROJECT-WATERSTOP-01",
  construction_joint_waterstop_length_m: 20,
  construction_joint_installation_worker_h: 8,
  formwork_tie_accessories_designation: "Крепления и комплектующие в составе комплекта щитовой опалубки",
  formwork_release_agent_designation: "Doka-Trenn для впитывающей поверхности опалубки",
  formwork_release_agent_consumption_l_m2: 0.01,
  waterproofing_coating_designation: "Sika Igolflex-101 DE — предварительный режим защиты от влаги",
  waterproofing_pressure_exposure: false,
  waterproofing_primer_designation: "Sika Igolflex P-01 DE",
  waterproofing_primer_consumption_l_m2: 0.05,
  waterproofing_protection_layer_designation: "SikaShield PB P15 PE 6 mm — защитная плита 1×2 м",
  waterproofing_detail_reinforcement_designation: "Sika Igolflex F-01 EU — армирующая стеклоткань",
  waterproofing_detail_reinforcement_consumption_m2_m2: 1.1,
  formwork_supply_mode: "rental_returnable",
  formwork_return_distance_km: 18,
  as_built_survey_included: true,
  as_built_survey_document_count: 1,
  horizontal_cutoff_waterproofing_included: true,
  horizontal_cutoff_waterproofing_designation: "PROJECT-HORIZONTAL-CUTOFF-01",
  horizontal_cutoff_waterproofing_area_m2: 22,
  formwork_tie_consumables_required: true,
  formwork_tie_consumables_supply_mode: "separate_purchase",
  formwork_tie_consumables_designation: "PROJECT-FORMWORK-TIE-CONSUMABLES-01",
  formwork_tie_consumables_quantity_piece: 160,
  excavation_support_required: true,
  excavation_support_designation: "PROJECT-EXCAVATION-SUPPORT-01",
  excavation_support_area_m2: 96,
  excavation_dewatering_required: true,
  excavation_dewatering_equipment_designation: "PROJECT-DEWATERING-PUMP-01",
  excavation_dewatering_machine_h: 14,
  site_cleanup_cost_mode: "separate_work",
  site_cleanup_worker_h: 12,
  non_soil_waste_handling_mode: "separate_handling",
  non_soil_waste_mass_t: 0.8,
  non_soil_waste_haul_distance_km: 15,
  non_soil_waste_packaging_required: true,
  non_soil_waste_packaging_designation: "PROJECT-WASTE-BAG-01",
  non_soil_waste_packaging_quantity_piece: 20,
});

export function compileStripFoundationProfessionalGoldR2(
  values: Readonly<Record<string, StripFoundationInputValue>> = STRIP_FOUNDATION_PROFESSIONAL_GOLD_INPUT_R2,
): readonly (StripFoundationProfessionalRowR2 & { evaluatedQuantity: string })[] {
  const formulaById = new Map(STRIP_FOUNDATION_PROFESSIONAL_FORMULAS_R2
    .map((formula) => [formula.formulaId, formula]));
  const numericValues = Object.fromEntries(Object.entries(values));
  return STRIP_FOUNDATION_PROFESSIONAL_ROWS_R2
    .filter((row) => evaluateInclusionGraph(row.applicabilityExpression, values))
    .map((row) => {
      const formula = formulaById.get(row.formulaId);
      if (!formula) throw new Error(`STRIP_FOUNDATION_PROFESSIONAL_FORMULA_MISSING:${row.formulaId}`);
      for (const parameterId of formula.inputParameterIds) {
        if (!(parameterId in numericValues)) {
          throw new Error(`STRIP_FOUNDATION_PROFESSIONAL_INPUT_MISSING:${row.rowId}:${parameterId}`);
        }
      }
      const evaluatedQuantity = evaluateFormulaGraph(
        compileFormulaGraph(formula.source),
        numericValues,
      );
      if (Number(evaluatedQuantity) <= 0) {
        throw new Error(`STRIP_FOUNDATION_PROFESSIONAL_NON_POSITIVE_QUANTITY:${row.rowId}`);
      }
      return { ...row, evaluatedQuantity };
    });
}

function inclusionParameterIds(ast: InclusionGraphAst): string[] {
  const kind = String(ast.kind ?? "");
  if (kind === "parameter") return [String(ast.id ?? "")].filter(Boolean);
  if (["equals", "not_equals", "in", "greater_than", "greater_than_or_equal", "less_than", "less_than_or_equal"]
    .includes(kind)) return [String(ast.parameterId ?? "")].filter(Boolean);
  if (kind === "not" && ast.operand && typeof ast.operand === "object" && !Array.isArray(ast.operand)) {
    return inclusionParameterIds(ast.operand as InclusionGraphAst);
  }
  if ((kind === "and" || kind === "or") && Array.isArray(ast.operands)) {
    return ast.operands
      .filter((operand): operand is InclusionGraphAst => Boolean(operand) && typeof operand === "object")
      .flatMap(inclusionParameterIds);
  }
  return [];
}

export function stripFoundationProfessionalParameterConsumerRowIdsR2(parameterId: string): string[] {
  const formulaIds = new Set(STRIP_FOUNDATION_PROFESSIONAL_FORMULAS_R2
    .filter((formula) => formula.inputParameterIds.includes(parameterId))
    .map((formula) => formula.formulaId));
  const composedConsumers = STRIP_FOUNDATION_PROFESSIONAL_ROWS_R2
    .filter((row) => formulaIds.has(row.formulaId)
      || inclusionParameterIds(row.applicabilityExpression).includes(parameterId)
      || row.titleSpecificationParameterIds?.includes(parameterId))
    .map((row) => row.rowId);
  return [...new Set([
    ...stripFoundationParameterConsumerRowIds(parameterId),
    ...composedConsumers,
  ])].sort();
}

export function auditStripFoundationProfessionalCompositionR2(): {
  contract: typeof STRIP_FOUNDATION_PROFESSIONAL_COMPOSITION_R2_CONTRACT;
  status: "GREEN" | "RED";
  errors: readonly string[];
  baseRowCount: number;
  typedChildRowCount: number;
  sourceGapRowCount: number;
  composedRowCount: number;
} {
  const errors: string[] = [];
  const parameterIds = new Set(STRIP_FOUNDATION_PROFESSIONAL_INPUTS_R2.map((input) => input.parameterId));
  const formulaIds = new Set(STRIP_FOUNDATION_PROFESSIONAL_FORMULAS_R2.map((formula) => formula.formulaId));
  const rowIds = new Set(STRIP_FOUNDATION_PROFESSIONAL_ROWS_R2.map((row) => row.rowId));
  if (parameterIds.size !== STRIP_FOUNDATION_PROFESSIONAL_INPUTS_R2.length) errors.push("DUPLICATE_PARAMETER_ID");
  if (formulaIds.size !== STRIP_FOUNDATION_PROFESSIONAL_FORMULAS_R2.length) errors.push("DUPLICATE_FORMULA_ID");
  if (rowIds.size !== STRIP_FOUNDATION_PROFESSIONAL_ROWS_R2.length) errors.push("DUPLICATE_ROW_ID");
  for (const formula of STRIP_FOUNDATION_PROFESSIONAL_FORMULAS_R2) {
    for (const parameterId of formula.inputParameterIds) {
      if (!parameterIds.has(parameterId)) errors.push(`FORMULA_PARAMETER_MISSING:${formula.formulaId}:${parameterId}`);
    }
  }
  for (const row of STRIP_FOUNDATION_PROFESSIONAL_ROWS_R2) {
    if (!formulaIds.has(row.formulaId)) errors.push(`ROW_FORMULA_MISSING:${row.rowId}:${row.formulaId}`);
    for (const parameterId of inclusionParameterIds(row.applicabilityExpression)) {
      if (!parameterIds.has(parameterId)) errors.push(`ROW_PARAMETER_MISSING:${row.rowId}:${parameterId}`);
    }
    for (const parameterId of row.titleSpecificationParameterIds ?? []) {
      if (!parameterIds.has(parameterId)) errors.push(`ROW_TITLE_PARAMETER_MISSING:${row.rowId}:${parameterId}`);
    }
  }
  const duplicateOwners = STRIP_FOUNDATION_PROFESSIONAL_ROWS_R2
    .map((row) => row.semanticOwnerId)
    .filter((owner, index, owners) => owners.indexOf(owner) !== index);
  if (duplicateOwners.length > 0) errors.push(`DUPLICATE_SEMANTIC_OWNER:${[...new Set(duplicateOwners)].join(",")}`);
  const ownCostOwners = STRIP_FOUNDATION_PROFESSIONAL_ROWS_R2
    .filter((row) => !row.includedInParentRate)
    .map((row) => row.costOwnerId);
  const duplicateOwnCostOwners = ownCostOwners
    .filter((owner, index, owners) => owners.indexOf(owner) !== index);
  if (duplicateOwnCostOwners.length > 0) {
    errors.push(`DUPLICATE_OWN_COST_OWNER:${[...new Set(duplicateOwnCostOwners)].join(",")}`);
  }
  for (const input of STRIP_FOUNDATION_PROFESSIONAL_INPUTS_R2) {
    if (stripFoundationProfessionalParameterConsumerRowIdsR2(input.parameterId).length === 0) {
      errors.push(`PARAMETER_WITHOUT_CONSUMER:${input.parameterId}`);
    }
  }
  for (const rowId of STRIP_FOUNDATION_COMPOSED_TYPED_CHILD_ROW_IDS_R2) {
    if (!rowIds.has(rowId)) errors.push(`TYPED_CHILD_ROW_NOT_COMPOSED:${rowId}`);
  }
  for (const rowId of STRIP_FOUNDATION_SOURCE_GAP_ROW_IDS_R2) {
    if (!rowIds.has(rowId)) errors.push(`SOURCE_GAP_ROW_NOT_COMPOSED:${rowId}`);
  }
  const uniqueErrors = [...new Set(errors)].sort();
  return {
    contract: STRIP_FOUNDATION_PROFESSIONAL_COMPOSITION_R2_CONTRACT,
    status: uniqueErrors.length === 0 ? "GREEN" : "RED",
    errors: uniqueErrors,
    baseRowCount: STRIP_FOUNDATION_ROWS.length,
    typedChildRowCount: childRows.length,
    sourceGapRowCount: sourceGapRows.length,
    composedRowCount: STRIP_FOUNDATION_PROFESSIONAL_ROWS_R2.length,
  };
}
