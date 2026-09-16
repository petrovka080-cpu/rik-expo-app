import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
  type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../backendPlatform/canonicalEstimateCompileCore";
import { compileFormulaGraph } from "../backendPlatform/formulaGraph";
import {
  BIA_TN10_MASONRY_NORM_ID,
  BIA_TN10_MASONRY_PRODUCT_PROFILE_ID,
  BIA_TN10_MASONRY_REQUIRED_IDS,
  BIA_TN10_MASONRY_SOURCE_ID,
  BIA_TN10_MASONRY_SOURCE_METADATA,
} from "./domainFactory";

export const MASONRY_BRICK_WALL_BIA_TN10_CATALOG_ID =
  "canonical-work:base:masonry_interior_brick_wall_lay_standard" as const;
export const MASONRY_BRICK_WALL_BIA_TN10_NEUTRAL_CATALOG_IDS = Object.freeze([
  MASONRY_BRICK_WALL_BIA_TN10_CATALOG_ID,
  "canonical-work:base:masonry_interior_brick_wall_lay_large_area",
  "canonical-work:base:masonry_interior_brick_wall_lay_small_area",
  "canonical-work:base:masonry_interior_brick_wall_lay_technical_room",
] as const);
export const MASONRY_BRICK_WALL_BIA_TN10_TITLE_RU =
  "Кладка стены из обожжённого глиняного кирпича по BIA TN 10 Table 4" as const;
export const MASONRY_BRICK_WALL_BIA_TN10_SOURCE_PACK_SHA256 =
  "719fb6aaef220d986eefd6a0104253f08257a17e669923fbce9edca9ae7b52c1" as const;
export const MASONRY_BRICK_WALL_PROJECT_INPUT_GUIDE_SHA256 =
  "c8b80f248ec59176d690b3ff97f8f780d039459f7d4929edf703271cff12fa96" as const;

export type MasonryBrickWallBiaTn10InputValue = string | number | boolean;

export type MasonryBrickWallBiaTn10Parameter = CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata: Record<string, unknown>;
};

export type MasonryBrickWallBiaTn10Formula = CanonicalEstimateFormulaDefinition & {
  output_unit_id: string;
  expression_source: string;
};

const PARAMETER_TITLES_RU: Readonly<Record<string, string>> = Object.freeze({
  product_profile_id: "Профиль нормативного расчёта",
  measured_net_brick_wall_area_m2: "Чистая площадь кирпичной стены после вычета проёмов, м²",
  gross_wall_area_and_opening_deductions: "Проверка общей площади, проёмов и чистой площади",
  fired_clay_brick_confirmed: "Подтверждён обожжённый глиняный кирпич",
  brick_manufacturer_and_designation: "Производитель и точное обозначение кирпича",
  specified_and_nominal_dimensions: "Заданные и номинальные размеры кирпича",
  joint_width_mm: "Толщина растворного шва, мм",
  wall_thickness_and_wythe_configuration: "Толщина стены и число слоёв кладки",
  bond_pattern: "Тип перевязки кладки",
  selected_bia_tn10_table_4_row: "Выбранная строка BIA TN 10 Table 4",
  selected_brick_quantity_per_m2: "Количество кирпича из выбранной строки, шт/м²",
  selected_mortar_quantity_per_m2: "Количество раствора из выбранной строки, м³/м²",
  applicable_bond_correction_factors: "Применимые поправочные коэффициенты перевязки",
  selected_project_breakage_and_waste_allowances: "Проектный бой кирпича и запас раствора",
  supplier_package_quantities: "Размеры упаковок поставщика",
  project_architect_engineer_or_estimator_approval_reference: "Ссылка на согласование архитектора, инженера или сметчика",
  brick_bond_correction_factor: "Числовой коэффициент кирпича из согласованной поправки",
  mortar_bond_correction_factor: "Числовой коэффициент раствора из согласованной поправки",
  brick_breakage_percent: "Согласованный проектный бой кирпича, %",
  mortar_waste_percent: "Согласованный проектный запас раствора, %",
  brick_supplier_package_pieces: "Количество кирпича в упаковке поставщика, шт.",
  mortar_supplier_package_m3: "Объём поставочной партии раствора, м³",
  project_scope_and_applicability_reference: "Проектная ведомость границ и применимости состава кладки",
  wall_layout_length_m: "Суммарная длина стен по проектной разбивке, м",
  wall_height_m: "Проектная высота стены, м",
  wall_connectors_applicable: "Нужны соединители стены с примыкающими конструкциями",
  wall_connector_quantity_piece: "Количество соединителей стены по проектной ведомости, шт.",
  wall_connector_designation: "Тип и обозначение соединителя стены",
  lintels_applicable: "Нужны перемычки над проёмами",
  lintel_total_length_m: "Суммарная длина перемычек по проектной ведомости, м",
  lintel_designation: "Тип и обозначение перемычки",
  dpc_applicable: "Нужна горизонтальная отсечная гидроизоляция под кладкой",
  dpc_area_m2: "Площадь отсечной гидроизоляции по раскладке, м²",
  dpc_product_designation: "Материал и обозначение отсечной гидроизоляции",
  masonry_reinforcement_applicable: "Нужно горизонтальное армирование кладки",
  masonry_reinforcement_mass_kg: "Масса армирования кладки по ведомости, кг",
  masonry_reinforcement_designation: "Тип и обозначение армирования кладки",
  brick_cutting_length_m: "Длина участков резки и подгонки кирпича, м",
  masonry_saw_machine_hours: "Работа машины для мокрой резки кирпича, маш·ч",
  masonry_saw_designation: "Тип машины и диска для резки кирпича",
  material_handling_machine_hours: "Механизированная разгрузка и подача материалов, маш·ч",
  material_handler_designation: "Тип машины для разгрузки и подачи материалов",
  work_platform_applicable: "Нужны отдельные подмости или рабочая площадка",
  work_platform_rental_days: "Срок аренды подмостей или рабочей площадки, сут.",
  work_platform_designation: "Тип подмостей или рабочей площадки",
  engineering_inspection_applicable: "Нужна отдельная инженерная приёмка кладки",
  engineering_inspection_hours: "Продолжительность инженерной приёмки, чел·ч",
  brick_unit_mass_kg: "Масса одного выбранного кирпича по паспорту поставщика, кг",
  brick_delivery_distance_km: "Расстояние доставки кирпича, км",
  brick_delivery_separately_priced: "Доставка кирпича учитывается отдельной строкой",
  mortar_density_kg_m3: "Плотность выбранного кладочного раствора по паспорту, кг/м³",
  mortar_delivery_distance_km: "Расстояние доставки раствора, км",
  mortar_delivery_separately_priced: "Доставка раствора учитывается отдельной строкой",
  waste_haul_applicable: "Нужен отдельный вывоз отходов кладки",
  masonry_waste_mass_t: "Масса отходов кладки к вывозу, т",
  waste_haul_distance_km: "Расстояние вывоза отходов, км",
  lintel_and_connector_schedule_reference: "Ведомость перемычек и соединителей",
  equipment_schedule_reference: "Ведомость оборудования и механизации",
  logistics_plan_reference: "План доставки, разгрузки и вывоза отходов",
  quality_plan_reference: "План контроля и инженерной приёмки кладки",
});

const PARAMETER_UNITS: Readonly<Record<string, string>> = Object.freeze({
  measured_net_brick_wall_area_m2: "m2",
  joint_width_mm: "mm",
  selected_brick_quantity_per_m2: "piece_per_m2",
  selected_mortar_quantity_per_m2: "m3_per_m2",
  brick_bond_correction_factor: "ratio",
  mortar_bond_correction_factor: "ratio",
  brick_breakage_percent: "percent",
  mortar_waste_percent: "percent",
  brick_supplier_package_pieces: "piece",
  mortar_supplier_package_m3: "m3",
  wall_layout_length_m: "m",
  wall_height_m: "m",
  wall_connector_quantity_piece: "piece",
  lintel_total_length_m: "m",
  dpc_area_m2: "m2",
  masonry_reinforcement_mass_kg: "kg",
  brick_cutting_length_m: "m",
  masonry_saw_machine_hours: "machine_hour",
  material_handling_machine_hours: "machine_hour",
  work_platform_rental_days: "day",
  engineering_inspection_hours: "worker_hour",
  brick_unit_mass_kg: "kg",
  brick_delivery_distance_km: "km",
  mortar_density_kg_m3: "kg_per_m3",
  mortar_delivery_distance_km: "km",
  masonry_waste_mass_t: "t",
  waste_haul_distance_km: "km",
});

const EXTRA_NUMERIC_PARAMETER_IDS = Object.freeze([
  "brick_bond_correction_factor",
  "mortar_bond_correction_factor",
  "brick_breakage_percent",
  "mortar_waste_percent",
  "brick_supplier_package_pieces",
  "mortar_supplier_package_m3",
] as const);

const FULL_SCOPE_NUMERIC_PARAMETER_IDS = Object.freeze([
  "wall_layout_length_m",
  "wall_height_m",
  "wall_connector_quantity_piece",
  "lintel_total_length_m",
  "dpc_area_m2",
  "masonry_reinforcement_mass_kg",
  "brick_cutting_length_m",
  "masonry_saw_machine_hours",
  "material_handling_machine_hours",
  "work_platform_rental_days",
  "engineering_inspection_hours",
  "brick_unit_mass_kg",
  "brick_delivery_distance_km",
  "mortar_density_kg_m3",
  "mortar_delivery_distance_km",
  "masonry_waste_mass_t",
  "waste_haul_distance_km",
] as const);

const FULL_SCOPE_BOOLEAN_PARAMETER_IDS = Object.freeze([
  "wall_connectors_applicable",
  "lintels_applicable",
  "dpc_applicable",
  "masonry_reinforcement_applicable",
  "work_platform_applicable",
  "engineering_inspection_applicable",
  "brick_delivery_separately_priced",
  "mortar_delivery_separately_priced",
  "waste_haul_applicable",
] as const);

const FULL_SCOPE_TEXT_PARAMETER_IDS = Object.freeze([
  "project_scope_and_applicability_reference",
  "wall_connector_designation",
  "lintel_designation",
  "dpc_product_designation",
  "masonry_reinforcement_designation",
  "masonry_saw_designation",
  "material_handler_designation",
  "work_platform_designation",
  "lintel_and_connector_schedule_reference",
  "equipment_schedule_reference",
  "logistics_plan_reference",
  "quality_plan_reference",
] as const);

export const MASONRY_BRICK_WALL_BIA_TN10_NORMATIVE_PARAMETER_IDS = Object.freeze([
  "product_profile_id",
  "selected_bia_tn10_table_4_row",
  "selected_brick_quantity_per_m2",
  "selected_mortar_quantity_per_m2",
  "applicable_bond_correction_factors",
  "brick_bond_correction_factor",
  "mortar_bond_correction_factor",
] as const);
const BIA_NORMATIVE_PARAMETER_ID_SET = new Set<string>(
  MASONRY_BRICK_WALL_BIA_TN10_NORMATIVE_PARAMETER_IDS,
);

const ALL_PARAMETER_IDS = Object.freeze([
  "product_profile_id",
  ...BIA_TN10_MASONRY_REQUIRED_IDS,
  ...EXTRA_NUMERIC_PARAMETER_IDS,
  ...FULL_SCOPE_NUMERIC_PARAMETER_IDS,
  ...FULL_SCOPE_BOOLEAN_PARAMETER_IDS,
  ...FULL_SCOPE_TEXT_PARAMETER_IDS,
].filter((value, index, values) => values.indexOf(value) === index));

function parameterValueType(parameterId: string): string {
  if (parameterId === "fired_clay_brick_confirmed"
    || FULL_SCOPE_BOOLEAN_PARAMETER_IDS.includes(parameterId as never)) return "boolean";
  if (parameterId === "product_profile_id") return "enum";
  if (parameterId.endsWith("_m2") || parameterId.endsWith("_mm")
    || parameterId.includes("quantity_per_m2") || EXTRA_NUMERIC_PARAMETER_IDS.includes(parameterId as never)
    || FULL_SCOPE_NUMERIC_PARAMETER_IDS.includes(parameterId as never)) {
    return "decimal";
  }
  return "text";
}

function parameterConstraints(parameterId: string): Record<string, unknown> {
  if (parameterId === "product_profile_id") return { values: [BIA_TN10_MASONRY_PRODUCT_PROFILE_ID] };
  if (parameterId === "fired_clay_brick_confirmed"
    || FULL_SCOPE_BOOLEAN_PARAMETER_IDS.includes(parameterId as never)) return {};
  if (["brick_breakage_percent", "mortar_waste_percent"].includes(parameterId)) return { min: 0, max: 100 };
  if ([
    "wall_connector_quantity_piece",
    "lintel_total_length_m",
    "dpc_area_m2",
    "masonry_reinforcement_mass_kg",
    "work_platform_rental_days",
    "engineering_inspection_hours",
    "masonry_waste_mass_t",
    "waste_haul_distance_km",
  ].includes(parameterId)) return { min: 0 };
  if (parameterValueType(parameterId) === "decimal") return { min: 0.000001 };
  return { maxLength: 500 };
}

export const MASONRY_BRICK_WALL_BIA_TN10_PARAMETERS: readonly MasonryBrickWallBiaTn10Parameter[] =
  Object.freeze(ALL_PARAMETER_IDS.map((parameterId, ordinal) => {
    const normative = BIA_NORMATIVE_PARAMETER_ID_SET.has(parameterId);
    return {
      parameter_id: parameterId,
      ordinal,
      value_type: parameterValueType(parameterId),
      unit_id: PARAMETER_UNITS[parameterId] ?? null,
      title_ru: PARAMETER_TITLES_RU[parameterId] ?? parameterId,
      required: true,
      default_value: null,
      constraints_json: parameterConstraints(parameterId),
      truth_metadata: {
        semantic_parameter_key: `${MASONRY_BRICK_WALL_BIA_TN10_CATALOG_ID}:${parameterId}`,
        visibility_role: "USER_INPUT",
        value_source_role: "PROJECT_SPECIFIC_INPUT",
        input_origin_class: normative ? "SELECTED_NORMATIVE_TABLE" : "PROJECT_OR_SUPPLIER",
        preliminary_compilation_allowed: false,
        source_confirmation_required: true,
        guide: {
          guide_kind: normative ? "MANDATORY_NORM_VALUE" : "PROJECT_DEFINED",
          guide_short_ru: `Укажите подтверждённое значение: ${PARAMETER_TITLES_RU[parameterId] ?? parameterId}.`,
          source_role: normative ? "SELECTED_BIA_TABLE" : "PROJECT_DOCUMENTATION_OR_SUPPLIER_QUOTE",
          source_document: normative ? BIA_TN10_MASONRY_SOURCE_ID : null,
          source_locator: normative ? BIA_TN10_MASONRY_SOURCE_METADATA.exact_locator : null,
          guide_version: "masonry-brick-wall-bia-tn10-r1",
          source_snapshot_hash: normative
            ? MASONRY_BRICK_WALL_BIA_TN10_SOURCE_PACK_SHA256
            : MASONRY_BRICK_WALL_PROJECT_INPUT_GUIDE_SHA256,
          applicability: normative
            ? "Только выбранная строка BIA TN 10 Table 4 для подтверждённого обожжённого глиняного кирпича."
            : "Значение относится к конкретному проекту или поставщику и не выводится из BIA TN 10.",
          verified_at: "2026-09-15T00:00:00+06:00",
          guide_validation_policy: "REJECT_OUTSIDE_EXACT_BIA_TN10_APPLICABILITY",
        },
        synthetic: false,
      },
    };
  }));

function formula(formulaId: string, outputUnitId: string, expressionSource: string): MasonryBrickWallBiaTn10Formula {
  const compiled = compileFormulaGraph(expressionSource);
  return Object.freeze({
    formula_id: formulaId,
    output_unit_id: outputUnitId,
    expression_source: compiled.source,
    ast: compiled.ast,
    input_parameter_ids: compiled.inputParameterIds,
    ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256",
  });
}

export const MASONRY_BRICK_WALL_BIA_TN10_FORMULAS: readonly MasonryBrickWallBiaTn10Formula[] = Object.freeze([
  formula(
    "bia_tn10_brick_net_need_v1",
    "piece",
    "measured_net_brick_wall_area_m2 * selected_brick_quantity_per_m2 * brick_bond_correction_factor",
  ),
  formula(
    "bia_tn10_brick_procurement_v1",
    "piece",
    "ceil((measured_net_brick_wall_area_m2 * selected_brick_quantity_per_m2 * brick_bond_correction_factor * (1 + brick_breakage_percent / 100)) / brick_supplier_package_pieces) * brick_supplier_package_pieces",
  ),
  formula(
    "bia_tn10_mortar_net_need_v1",
    "m3",
    "measured_net_brick_wall_area_m2 * selected_mortar_quantity_per_m2 * mortar_bond_correction_factor",
  ),
  formula(
    "bia_tn10_mortar_procurement_v1",
    "m3",
    "ceil((measured_net_brick_wall_area_m2 * selected_mortar_quantity_per_m2 * mortar_bond_correction_factor * (1 + mortar_waste_percent / 100)) / mortar_supplier_package_m3) * mortar_supplier_package_m3",
  ),
  formula("bia_tn10_measured_wall_area_v1", "m2", "measured_net_brick_wall_area_m2"),
  formula("bia_tn10_wall_layout_length_v2", "m", "wall_layout_length_m"),
  formula("bia_tn10_gross_wall_geometry_v2", "m2", "wall_layout_length_m * wall_height_m"),
  formula("bia_tn10_wall_connectors_v2", "piece", "wall_connector_quantity_piece"),
  formula("bia_tn10_lintels_v2", "m", "lintel_total_length_m"),
  formula("bia_tn10_dpc_v2", "m2", "dpc_area_m2"),
  formula("bia_tn10_reinforcement_v2", "kg", "masonry_reinforcement_mass_kg"),
  formula("bia_tn10_brick_cutting_v2", "m", "brick_cutting_length_m"),
  formula("bia_tn10_masonry_saw_v2", "machine_hour", "masonry_saw_machine_hours"),
  formula("bia_tn10_material_handler_v2", "machine_hour", "material_handling_machine_hours"),
  formula("bia_tn10_work_platform_v2", "day", "work_platform_rental_days"),
  formula("bia_tn10_engineering_inspection_v2", "worker_hour", "engineering_inspection_hours"),
  formula(
    "bia_tn10_brick_delivery_v2",
    "t_km",
    "ceil((measured_net_brick_wall_area_m2 * selected_brick_quantity_per_m2 * brick_bond_correction_factor * (1 + brick_breakage_percent / 100)) / brick_supplier_package_pieces) * brick_supplier_package_pieces * brick_unit_mass_kg / 1000 * brick_delivery_distance_km",
  ),
  formula(
    "bia_tn10_mortar_delivery_v2",
    "t_km",
    "ceil((measured_net_brick_wall_area_m2 * selected_mortar_quantity_per_m2 * mortar_bond_correction_factor * (1 + mortar_waste_percent / 100)) / mortar_supplier_package_m3) * mortar_supplier_package_m3 * mortar_density_kg_m3 / 1000 * mortar_delivery_distance_km",
  ),
  formula("bia_tn10_waste_haul_v2", "t_km", "masonry_waste_mass_t * waste_haul_distance_km"),
]);

const NORMATIVE_TRACE = Object.freeze([{
  document_code: BIA_TN10_MASONRY_SOURCE_ID,
  source_id: BIA_TN10_MASONRY_SOURCE_ID,
  sourceId: BIA_TN10_MASONRY_SOURCE_ID,
  norm_id: BIA_TN10_MASONRY_NORM_ID,
  normId: BIA_TN10_MASONRY_NORM_ID,
  source_title: BIA_TN10_MASONRY_SOURCE_METADATA.source_title,
  source_document_version: BIA_TN10_MASONRY_SOURCE_METADATA.source_document_version,
  normVersion: BIA_TN10_MASONRY_SOURCE_METADATA.source_document_version,
  source_definition_hash: BIA_TN10_MASONRY_SOURCE_METADATA.definition_hash,
  exact_locator: BIA_TN10_MASONRY_SOURCE_METADATA.exact_locator,
  source_url: BIA_TN10_MASONRY_SOURCE_METADATA.source_url,
  applicability: {
    selectedProductProfileId: BIA_TN10_MASONRY_PRODUCT_PROFILE_ID,
    firedClayBrickOnly: true,
    aacAdhesiveAndMeshExcluded: true,
    automaticGenericBinding: false,
  },
}]);

function materialQuantityPolicy(input: {
  materialType: "piece_material" | "wet_mix";
  unit: "piece" | "m3";
  wastePercentParameterId: string;
  procurementPackageSizeParameterId: string;
  formula: string;
  formulaInputParameterIds: readonly string[];
}) {
  return {
    version: "canonical-material-quantity-policy:v1",
    basisVersion: "professional-material-quantity-basis:v1",
    materialType: input.materialType,
    unit: input.unit,
    wastePercent: 0,
    wastePercentParameterId: input.wastePercentParameterId,
    lossPercent: 0,
    procurementUnit: input.unit,
    procurementPackageSize: 1,
    procurementPackageSizeParameterId: input.procurementPackageSizeParameterId,
    formula: input.formula,
    formulaInputs: {},
    formulaInputParameterIds: input.formulaInputParameterIds,
    sourceId: BIA_TN10_MASONRY_SOURCE_ID,
    citationLabel: `${BIA_TN10_MASONRY_SOURCE_METADATA.exact_locator} (${BIA_TN10_MASONRY_SOURCE_METADATA.source_document_version})`,
    quantityDependsOnParams: input.formulaInputParameterIds.filter((id) =>
      id !== input.wastePercentParameterId && id !== input.procurementPackageSizeParameterId),
  };
}

const PHYSICAL_BINDING_BASE = Object.freeze({
  technology_class: "BIA_TN10_FIRED_CLAY_BRICK_MEASUREMENT",
  operation_class: "MEASURE",
  material_system: "BIA_TN10_FIRED_CLAY_BRICK",
  scope_mode: "FULL_APPLICABLE_SCOPE",
  product_profile_id: BIA_TN10_MASONRY_PRODUCT_PROFILE_ID,
  source_id: BIA_TN10_MASONRY_SOURCE_ID,
  applicability_parameter_ids: [...BIA_TN10_MASONRY_REQUIRED_IDS],
  activation: { parameter_id: "product_profile_id", equals: BIA_TN10_MASONRY_PRODUCT_PROFILE_ID },
});

function resource(input: {
  id: string;
  rowId: string;
  ordinal: number;
  section: string;
  category: string;
  titleRu: string;
  unitId: string;
  formulaId: string;
  procurementEligible: boolean;
  inclusionAst?: Record<string, unknown>;
  resourceGraph?: Record<string, unknown>;
  normative?: boolean;
}): CanonicalEstimateResourceDefinition {
  return Object.freeze({
    id: input.id,
    row_id: input.rowId,
    ordinal: input.ordinal,
    section: input.section,
    category: input.category,
    title_ru: input.titleRu,
    unit_id: input.unitId,
    formula_id: input.formulaId,
    inclusion_ast: input.inclusionAst ?? { kind: "literal", value: true },
    resource_graph: { contract: "masonry-brick-wall-bia-tn10-r1", synthetic: false, ...input.resourceGraph },
    procurement_eligible: input.procurementEligible,
    cost_owner_id: input.rowId,
    source_metadata: {
      truth_contract_version: "R3",
      synthetic: false,
      sourceRole: input.normative ? "SELECTED_BIA_TABLE_AND_PROJECT_DOCUMENTATION" : "PROJECT_DOCUMENTATION",
      normativeTrace: input.normative ? NORMATIVE_TRACE : [],
      excludedUnownedMaterials: ["AAC", "thin-bed adhesive", "unscheduled masonry reinforcement"],
      scopeBoundaryParameterId: "project_scope_and_applicability_reference",
    },
    row_sha256: "runtime-publisher-replaces-with-deterministic-sha256",
  });
}

function conditionalPositiveQuantityPolicy(
  applicabilityParameterId: string,
  ...quantityParameterIds: string[]
): Record<string, unknown> {
  return {
    version: "canonical-conditional-positive-quantity:v1",
    applicabilityParameterId,
    quantityParameterIds,
    errorCodeNamespace: "MASONRY_FULL_SCOPE",
  };
}

const BRICK_INPUT_IDS = [
  "measured_net_brick_wall_area_m2",
  "selected_brick_quantity_per_m2",
  "brick_bond_correction_factor",
  "brick_breakage_percent",
  "brick_supplier_package_pieces",
] as const;
const MORTAR_INPUT_IDS = [
  "measured_net_brick_wall_area_m2",
  "selected_mortar_quantity_per_m2",
  "mortar_bond_correction_factor",
  "mortar_waste_percent",
  "mortar_supplier_package_m3",
] as const;

export const MASONRY_BRICK_WALL_BIA_TN10_RESOURCES: readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({
    id: "resource-bia-tn10-fired-clay-brick",
    rowId: "material:bia-tn10:fired-clay-brick",
    ordinal: 0,
    section: "Материалы",
    category: "material",
    titleRu: "Обожжённый глиняный кирпич",
    unitId: "piece",
    formulaId: "bia_tn10_brick_net_need_v1",
    procurementEligible: true,
    normative: true,
    resourceGraph: {
      titleSpecificationParameterIds: ["brick_manufacturer_and_designation", "specified_and_nominal_dimensions"],
      titleSpecificationMode: "APPEND",
      titleSpecificationSeparator: " — ",
      professionalMaterialQuantityPolicyV1: materialQuantityPolicy({
        materialType: "piece_material",
        unit: "piece",
        wastePercentParameterId: "brick_breakage_percent",
        procurementPackageSizeParameterId: "brick_supplier_package_pieces",
        formula: "net selected-table brick need; project breakage; supplier package rounding",
        formulaInputParameterIds: BRICK_INPUT_IDS,
      }),
      professionalPhysicalNormBindingV1: {
        ...PHYSICAL_BINDING_BASE,
        quantity_output_parameter_id: "masonry_selected_brick_procurement_quantity_piece",
        quantity_output_formula_id: "bia_tn10_brick_procurement_v1",
      },
    },
  }),
  resource({
    id: "resource-bia-tn10-masonry-mortar",
    rowId: "material:bia-tn10:masonry-mortar",
    ordinal: 1,
    section: "Материалы",
    category: "material",
    titleRu: "Кладочный раствор по выбранной строке BIA TN 10 Table 4",
    unitId: "m3",
    formulaId: "bia_tn10_mortar_net_need_v1",
    procurementEligible: true,
    normative: true,
    resourceGraph: {
      professionalMaterialQuantityPolicyV1: materialQuantityPolicy({
        materialType: "wet_mix",
        unit: "m3",
        wastePercentParameterId: "mortar_waste_percent",
        procurementPackageSizeParameterId: "mortar_supplier_package_m3",
        formula: "net selected-table mortar need; project waste; supplier batch rounding",
        formulaInputParameterIds: MORTAR_INPUT_IDS,
      }),
      professionalPhysicalNormBindingV1: {
        ...PHYSICAL_BINDING_BASE,
        quantity_output_parameter_id: "masonry_selected_mortar_procurement_quantity_m3",
        quantity_output_formula_id: "bia_tn10_mortar_procurement_v1",
      },
    },
  }),
  resource({
    id: "resource-bia-tn10-brick-laying-work",
    rowId: "work:bia-tn10:brick-wall-laying",
    ordinal: 2,
    section: "Работы",
    category: "construction_work",
    titleRu: "Кладка стены из обожжённого глиняного кирпича по проектной геометрии",
    unitId: "m2",
    formulaId: "bia_tn10_measured_wall_area_v1",
    procurementEligible: false,
  }),
  resource({
    id: "resource-bia-tn10-joint-and-geometry-control",
    rowId: "work:bia-tn10:joint-and-geometry-control",
    ordinal: 3,
    section: "Работы",
    category: "construction_work",
    titleRu: "Контроль геометрии стены, толщины швов и перевязки",
    unitId: "m2",
    formulaId: "bia_tn10_measured_wall_area_v1",
    procurementEligible: false,
  }),
  resource({
    id: "resource-bia-tn10-cleaning-and-handover",
    rowId: "work:bia-tn10:cleaning-and-handover",
    ordinal: 4,
    section: "Работы",
    category: "construction_work",
    titleRu: "Очистка кладки и сдача выполненного участка",
    unitId: "m2",
    formulaId: "bia_tn10_measured_wall_area_v1",
    procurementEligible: false,
  }),
  resource({
    id: "resource-bia-tn10-wall-connectors",
    rowId: "material:bia-tn10:wall-connectors",
    ordinal: 5,
    section: "Материалы",
    category: "material",
    titleRu: "Соединители кирпичной стены с примыкающими конструкциями",
    unitId: "piece",
    formulaId: "bia_tn10_wall_connectors_v2",
    procurementEligible: true,
    inclusionAst: { kind: "parameter", id: "wall_connectors_applicable" },
    resourceGraph: {
      conditionalPositiveQuantityPolicyV1: conditionalPositiveQuantityPolicy(
        "wall_connectors_applicable",
        "wall_connector_quantity_piece",
      ),
      titleSpecificationParameterIds: ["wall_connector_designation"],
      titleSpecificationMode: "APPEND",
      sourceScheduleParameterIds: [
        "wall_connector_quantity_piece",
        "lintel_and_connector_schedule_reference",
      ],
    },
  }),
  resource({
    id: "resource-bia-tn10-lintels",
    rowId: "material:bia-tn10:opening-lintels",
    ordinal: 6,
    section: "Материалы",
    category: "material",
    titleRu: "Перемычки над проёмами кирпичной стены",
    unitId: "m",
    formulaId: "bia_tn10_lintels_v2",
    procurementEligible: true,
    inclusionAst: { kind: "parameter", id: "lintels_applicable" },
    resourceGraph: {
      conditionalPositiveQuantityPolicyV1: conditionalPositiveQuantityPolicy(
        "lintels_applicable",
        "lintel_total_length_m",
      ),
      titleSpecificationParameterIds: ["lintel_designation"],
      titleSpecificationMode: "APPEND",
      sourceScheduleParameterIds: ["lintel_total_length_m", "lintel_and_connector_schedule_reference"],
    },
  }),
  resource({
    id: "resource-bia-tn10-dpc",
    rowId: "material:bia-tn10:dpc-membrane",
    ordinal: 7,
    section: "Материалы",
    category: "material",
    titleRu: "Горизонтальная отсечная гидроизоляция под кирпичной кладкой",
    unitId: "m2",
    formulaId: "bia_tn10_dpc_v2",
    procurementEligible: true,
    inclusionAst: { kind: "parameter", id: "dpc_applicable" },
    resourceGraph: {
      conditionalPositiveQuantityPolicyV1: conditionalPositiveQuantityPolicy(
        "dpc_applicable",
        "dpc_area_m2",
      ),
      titleSpecificationParameterIds: ["dpc_product_designation"],
      titleSpecificationMode: "APPEND",
      sourceScheduleParameterIds: ["dpc_area_m2", "project_scope_and_applicability_reference"],
    },
  }),
  resource({
    id: "resource-bia-tn10-reinforcement",
    rowId: "material:bia-tn10:masonry-reinforcement",
    ordinal: 8,
    section: "Материалы",
    category: "material",
    titleRu: "Горизонтальное армирование кирпичной кладки",
    unitId: "kg",
    formulaId: "bia_tn10_reinforcement_v2",
    procurementEligible: true,
    inclusionAst: { kind: "parameter", id: "masonry_reinforcement_applicable" },
    resourceGraph: {
      conditionalPositiveQuantityPolicyV1: conditionalPositiveQuantityPolicy(
        "masonry_reinforcement_applicable",
        "masonry_reinforcement_mass_kg",
      ),
      titleSpecificationParameterIds: ["masonry_reinforcement_designation"],
      titleSpecificationMode: "APPEND",
      sourceScheduleParameterIds: [
        "masonry_reinforcement_mass_kg",
        "project_scope_and_applicability_reference",
      ],
    },
  }),
  resource({
    id: "resource-bia-tn10-setting-out",
    rowId: "work:bia-tn10:wall-setting-out",
    ordinal: 9,
    section: "Работы",
    category: "construction_work",
    titleRu: "Разбивка осей и положения кирпичной стены",
    unitId: "m",
    formulaId: "bia_tn10_wall_layout_length_v2",
    procurementEligible: false,
    resourceGraph: { sourceScheduleParameterIds: ["wall_layout_length_m"] },
  }),
  resource({
    id: "resource-bia-tn10-gross-geometry-check",
    rowId: "work:bia-tn10:gross-wall-geometry-check",
    ordinal: 10,
    section: "Работы",
    category: "construction_work",
    titleRu: "Проверка общей площади стены и проектных вычетов проёмов",
    unitId: "m2",
    formulaId: "bia_tn10_gross_wall_geometry_v2",
    procurementEligible: false,
    resourceGraph: {
      formulaLabeledValueConsistencyPolicyV1: {
        version: "canonical-formula-labeled-value-consistency:v1",
        textParameterId: "gross_wall_area_and_opening_deductions",
        label: "GROSS_M2",
        absoluteTolerance: 0.000001,
        errorCodeNamespace: "MASONRY_FULL_SCOPE",
        errorCodeSubject: "GROSS_GEOMETRY",
      },
      sourceScheduleParameterIds: [
        "wall_layout_length_m",
        "wall_height_m",
        "gross_wall_area_and_opening_deductions",
      ],
    },
  }),
  resource({
    id: "resource-bia-tn10-brick-cutting",
    rowId: "work:bia-tn10:brick-cutting-and-fitting",
    ordinal: 11,
    section: "Работы",
    category: "construction_work",
    titleRu: "Резка и подгонка обожжённого глиняного кирпича",
    unitId: "m",
    formulaId: "bia_tn10_brick_cutting_v2",
    procurementEligible: false,
    resourceGraph: { sourceScheduleParameterIds: ["brick_cutting_length_m"] },
  }),
  resource({
    id: "resource-bia-tn10-wall-connectors-install",
    rowId: "work:bia-tn10:wall-connectors-install",
    ordinal: 12,
    section: "Работы",
    category: "construction_work",
    titleRu: "Монтаж соединителей кирпичной стены с примыкающими конструкциями",
    unitId: "piece",
    formulaId: "bia_tn10_wall_connectors_v2",
    procurementEligible: false,
    inclusionAst: { kind: "parameter", id: "wall_connectors_applicable" },
  }),
  resource({
    id: "resource-bia-tn10-lintels-install",
    rowId: "work:bia-tn10:opening-lintels-install",
    ordinal: 13,
    section: "Работы",
    category: "construction_work",
    titleRu: "Монтаж перемычек над проёмами кирпичной стены",
    unitId: "m",
    formulaId: "bia_tn10_lintels_v2",
    procurementEligible: false,
    inclusionAst: { kind: "parameter", id: "lintels_applicable" },
  }),
  resource({
    id: "resource-bia-tn10-dpc-install",
    rowId: "work:bia-tn10:dpc-install",
    ordinal: 14,
    section: "Работы",
    category: "construction_work",
    titleRu: "Укладка горизонтальной отсечной гидроизоляции под кирпичной стеной",
    unitId: "m2",
    formulaId: "bia_tn10_dpc_v2",
    procurementEligible: false,
    inclusionAst: { kind: "parameter", id: "dpc_applicable" },
  }),
  resource({
    id: "resource-bia-tn10-reinforcement-install",
    rowId: "work:bia-tn10:masonry-reinforcement-install",
    ordinal: 15,
    section: "Работы",
    category: "construction_work",
    titleRu: "Укладка горизонтального армирования в швы кирпичной кладки",
    unitId: "kg",
    formulaId: "bia_tn10_reinforcement_v2",
    procurementEligible: false,
    inclusionAst: { kind: "parameter", id: "masonry_reinforcement_applicable" },
  }),
  resource({
    id: "resource-bia-tn10-masonry-saw",
    rowId: "equipment:bia-tn10:masonry-saw",
    ordinal: 16,
    section: "Оборудование",
    category: "equipment",
    titleRu: "Машина для мокрой резки обожжённого глиняного кирпича",
    unitId: "machine_hour",
    formulaId: "bia_tn10_masonry_saw_v2",
    procurementEligible: true,
    resourceGraph: {
      titleSpecificationParameterIds: ["masonry_saw_designation"],
      titleSpecificationMode: "APPEND",
      sourceScheduleParameterIds: ["masonry_saw_machine_hours", "equipment_schedule_reference"],
    },
  }),
  resource({
    id: "resource-bia-tn10-material-handler",
    rowId: "equipment:bia-tn10:material-handler",
    ordinal: 17,
    section: "Оборудование",
    category: "equipment",
    titleRu: "Машина для разгрузки и подачи кирпича и раствора",
    unitId: "machine_hour",
    formulaId: "bia_tn10_material_handler_v2",
    procurementEligible: true,
    resourceGraph: {
      titleSpecificationParameterIds: ["material_handler_designation"],
      titleSpecificationMode: "APPEND",
      sourceScheduleParameterIds: ["material_handling_machine_hours", "equipment_schedule_reference"],
    },
  }),
  resource({
    id: "resource-bia-tn10-work-platform",
    rowId: "equipment:bia-tn10:work-platform",
    ordinal: 18,
    section: "Оборудование",
    category: "equipment",
    titleRu: "Подмости или рабочая площадка для кирпичной кладки",
    unitId: "day",
    formulaId: "bia_tn10_work_platform_v2",
    procurementEligible: true,
    inclusionAst: { kind: "parameter", id: "work_platform_applicable" },
    resourceGraph: {
      conditionalPositiveQuantityPolicyV1: conditionalPositiveQuantityPolicy(
        "work_platform_applicable",
        "work_platform_rental_days",
      ),
      titleSpecificationParameterIds: ["work_platform_designation"],
      titleSpecificationMode: "APPEND",
      sourceScheduleParameterIds: ["work_platform_rental_days", "equipment_schedule_reference"],
    },
  }),
  resource({
    id: "resource-bia-tn10-engineering-inspection",
    rowId: "service:bia-tn10:engineering-inspection",
    ordinal: 19,
    section: "Услуги",
    category: "service",
    titleRu: "Инженерная приёмка геометрии, швов и перевязки кирпичной кладки",
    unitId: "worker_hour",
    formulaId: "bia_tn10_engineering_inspection_v2",
    procurementEligible: true,
    inclusionAst: { kind: "parameter", id: "engineering_inspection_applicable" },
    resourceGraph: {
      conditionalPositiveQuantityPolicyV1: conditionalPositiveQuantityPolicy(
        "engineering_inspection_applicable",
        "engineering_inspection_hours",
      ),
      sourceScheduleParameterIds: ["engineering_inspection_hours", "quality_plan_reference"],
    },
  }),
  resource({
    id: "resource-bia-tn10-brick-delivery",
    rowId: "delivery:bia-tn10:fired-clay-brick",
    ordinal: 20,
    section: "Логистика",
    category: "delivery",
    titleRu: "Доставка выбранного обожжённого глиняного кирпича на объект",
    unitId: "t_km",
    formulaId: "bia_tn10_brick_delivery_v2",
    procurementEligible: true,
    inclusionAst: { kind: "parameter", id: "brick_delivery_separately_priced" },
    resourceGraph: {
      conditionalPositiveQuantityPolicyV1: conditionalPositiveQuantityPolicy(
        "brick_delivery_separately_priced",
        "brick_delivery_distance_km",
      ),
      cargo: {
        cargoRu: "обожжённый глиняный кирпич",
        physicalQuantityUom: "t",
        distanceParameterId: "brick_delivery_distance_km",
      },
      sourceScheduleParameterIds: ["brick_unit_mass_kg", "brick_delivery_distance_km", "logistics_plan_reference"],
    },
  }),
  resource({
    id: "resource-bia-tn10-mortar-delivery",
    rowId: "delivery:bia-tn10:masonry-mortar",
    ordinal: 21,
    section: "Логистика",
    category: "delivery",
    titleRu: "Доставка выбранного кладочного раствора на объект",
    unitId: "t_km",
    formulaId: "bia_tn10_mortar_delivery_v2",
    procurementEligible: true,
    inclusionAst: { kind: "parameter", id: "mortar_delivery_separately_priced" },
    resourceGraph: {
      conditionalPositiveQuantityPolicyV1: conditionalPositiveQuantityPolicy(
        "mortar_delivery_separately_priced",
        "mortar_delivery_distance_km",
      ),
      cargo: {
        cargoRu: "кладочный раствор",
        physicalQuantityUom: "t",
        distanceParameterId: "mortar_delivery_distance_km",
      },
      sourceScheduleParameterIds: [
        "mortar_density_kg_m3",
        "mortar_delivery_distance_km",
        "logistics_plan_reference",
      ],
    },
  }),
  resource({
    id: "resource-bia-tn10-waste-haul",
    rowId: "delivery:bia-tn10:masonry-waste-haul",
    ordinal: 22,
    section: "Логистика",
    category: "delivery",
    titleRu: "Вывоз отходов резки и боя кирпичной кладки",
    unitId: "t_km",
    formulaId: "bia_tn10_waste_haul_v2",
    procurementEligible: true,
    inclusionAst: { kind: "parameter", id: "waste_haul_applicable" },
    resourceGraph: {
      conditionalPositiveQuantityPolicyV1: conditionalPositiveQuantityPolicy(
        "waste_haul_applicable",
        "masonry_waste_mass_t",
        "waste_haul_distance_km",
      ),
      cargo: {
        cargoRu: "отходы резки и боя кирпича",
        physicalQuantityUom: "t",
        distanceParameterId: "waste_haul_distance_km",
      },
      sourceScheduleParameterIds: ["masonry_waste_mass_t", "waste_haul_distance_km", "logistics_plan_reference"],
    },
  }),
]);

export const MASONRY_BRICK_WALL_BIA_TN10_EXACT_INPUT: Readonly<Record<string, MasonryBrickWallBiaTn10InputValue>> =
  Object.freeze({
    product_profile_id: BIA_TN10_MASONRY_PRODUCT_PROFILE_ID,
    measured_net_brick_wall_area_m2: 90,
    gross_wall_area_and_opening_deductions: "GROSS_M2=100; OPENINGS_M2=10; NET_M2=90",
    fired_clay_brick_confirmed: true,
    brick_manufacturer_and_designation: "Acme Brick Modular A-101",
    specified_and_nominal_dimensions: "specified=194x92x57mm; nominal=200x100x67mm",
    joint_width_mm: 10,
    wall_thickness_and_wythe_configuration: "WYTHE:single; THICKNESS_MM=100",
    bond_pattern: "RUNNING_BOND",
    selected_bia_tn10_table_4_row: "BIA_TN10_TABLE4:modular-single-wythe-running-bond-10mm",
    selected_brick_quantity_per_m2: 60,
    selected_mortar_quantity_per_m2: 0.02,
    applicable_bond_correction_factors: "BRICK_FACTOR=1.05; MORTAR_FACTOR=1.10",
    selected_project_breakage_and_waste_allowances: "BRICK_PERCENT=3; MORTAR_PERCENT=5",
    supplier_package_quantities: "BRICK_PIECES=500; MORTAR_M3=0.25",
    project_architect_engineer_or_estimator_approval_reference: "A-E-EST-BRICK-REV-C",
    brick_bond_correction_factor: 1.05,
    mortar_bond_correction_factor: 1.1,
    brick_breakage_percent: 3,
    mortar_waste_percent: 5,
    brick_supplier_package_pieces: 500,
    mortar_supplier_package_m3: 0.25,
    project_scope_and_applicability_reference: "BIA-WALL-SCOPE-001-REV-D",
    wall_layout_length_m: 40,
    wall_height_m: 2.5,
    wall_connectors_applicable: true,
    wall_connector_quantity_piece: 80,
    wall_connector_designation: "оцинкованный соединитель стены по ведомости BIA-WALL-LC-001",
    lintels_applicable: true,
    lintel_total_length_m: 12,
    lintel_designation: "сборная железобетонная перемычка по ведомости BIA-WALL-LC-001",
    dpc_applicable: false,
    dpc_area_m2: 0,
    dpc_product_designation: "не применяется: внутренняя стена начинается от подготовленной железобетонной плиты",
    masonry_reinforcement_applicable: false,
    masonry_reinforcement_mass_kg: 0,
    masonry_reinforcement_designation: "не применяется по расчётной ведомости BIA-WALL-SCOPE-001-REV-D",
    brick_cutting_length_m: 20,
    masonry_saw_machine_hours: 8,
    masonry_saw_designation: "машина мокрой резки кирпича с алмазным диском 350 мм",
    material_handling_machine_hours: 6,
    material_handler_designation: "вилочный погрузчик грузоподъёмностью 2,5 т",
    work_platform_applicable: false,
    work_platform_rental_days: 0,
    work_platform_designation: "не применяется: высота стены 2,5 м, работа с уровня подготовленного пола",
    engineering_inspection_applicable: true,
    engineering_inspection_hours: 4,
    brick_unit_mass_kg: 2.2,
    brick_delivery_distance_km: 25,
    brick_delivery_separately_priced: true,
    mortar_density_kg_m3: 2000,
    mortar_delivery_distance_km: 20,
    mortar_delivery_separately_priced: true,
    waste_haul_applicable: true,
    masonry_waste_mass_t: 0.5,
    waste_haul_distance_km: 15,
    lintel_and_connector_schedule_reference: "BIA-WALL-LC-001-REV-B",
    equipment_schedule_reference: "BIA-WALL-EQ-001-REV-A",
    logistics_plan_reference: "BIA-WALL-LOG-001-REV-A",
    quality_plan_reference: "BIA-WALL-QA-001-REV-C",
  });

function fullScopeInputError(code: string): never {
  const error = new Error(code) as Error & { code: string };
  error.code = code;
  throw error;
}

function fullScopeNumber(parameters: Record<string, unknown>, parameterId: string): number {
  const value = Number(parameters[parameterId]);
  if (!Number.isFinite(value) || value < 0) {
    fullScopeInputError(`MASONRY_FULL_SCOPE_INVALID_NUMBER:${parameterId}`);
  }
  return value;
}

function validateFullScopeInputs(parameters: Record<string, unknown>): void {
  const conditionalQuantities = [
    ["wall_connectors_applicable", "wall_connector_quantity_piece"],
    ["lintels_applicable", "lintel_total_length_m"],
    ["dpc_applicable", "dpc_area_m2"],
    ["masonry_reinforcement_applicable", "masonry_reinforcement_mass_kg"],
    ["work_platform_applicable", "work_platform_rental_days"],
    ["engineering_inspection_applicable", "engineering_inspection_hours"],
    ["brick_delivery_separately_priced", "brick_delivery_distance_km"],
    ["mortar_delivery_separately_priced", "mortar_delivery_distance_km"],
    ["waste_haul_applicable", "masonry_waste_mass_t"],
    ["waste_haul_applicable", "waste_haul_distance_km"],
  ] as const;
  for (const [applicabilityId, quantityId] of conditionalQuantities) {
    const applicable = parameters[applicabilityId];
    if (typeof applicable !== "boolean") {
      fullScopeInputError(`MASONRY_FULL_SCOPE_APPLICABILITY_REQUIRED:${applicabilityId}`);
    }
    const quantity = fullScopeNumber(parameters, quantityId);
    if (applicable && quantity <= 0) {
      fullScopeInputError(`MASONRY_FULL_SCOPE_APPLICABLE_QUANTITY_REQUIRED:${quantityId}`);
    }
    if (!applicable && quantity !== 0) {
      fullScopeInputError(`MASONRY_FULL_SCOPE_NOT_APPLICABLE_QUANTITY_CONFLICT:${quantityId}`);
    }
  }
  const grossText = String(parameters.gross_wall_area_and_opening_deductions ?? "");
  const grossMatch = /GROSS_M2\s*=\s*([0-9]+(?:[.,][0-9]+)?)/iu.exec(grossText);
  if (!grossMatch) fullScopeInputError("MASONRY_FULL_SCOPE_GROSS_GEOMETRY_REQUIRED");
  const grossFromDimensions = fullScopeNumber(parameters, "wall_layout_length_m")
    * fullScopeNumber(parameters, "wall_height_m");
  const statedGross = Number(grossMatch[1]!.replace(",", "."));
  if (Math.abs(grossFromDimensions - statedGross) > 0.000001) {
    fullScopeInputError("MASONRY_FULL_SCOPE_GROSS_GEOMETRY_CONFLICT");
  }
}

export async function compileMasonryBrickWallBiaTn10R1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  validateFullScopeInputs(submittedParameters);
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.masonry-brick-wall-bia-tn10-r1",
    catalogId: options.catalogId ?? MASONRY_BRICK_WALL_BIA_TN10_CATALOG_ID,
    primaryMeasureParameterId: "measured_net_brick_wall_area_m2",
    parameterDefinitions: [...MASONRY_BRICK_WALL_BIA_TN10_PARAMETERS],
    formulaDefinitions: [...MASONRY_BRICK_WALL_BIA_TN10_FORMULAS],
    resourceDefinitions: [...MASONRY_BRICK_WALL_BIA_TN10_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 40,
    hashJson: async (value) => JSON.stringify(value),
  });
}
