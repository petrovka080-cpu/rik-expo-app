import type {
  ProfessionalAssemblyFormulaV4,
  ProfessionalAssemblyParameterDefinitionV4,
  ProfessionalAssemblyRowDefinitionV4,
  ProfessionalChildAssemblyV4,
  ProfessionalEstimateScopeModeV4,
  ProfessionalNormativeRowTraceV3,
} from "../../professionalProjectAssemblyV4";
import type {
  ProfessionalDomainParameterDefinitionV1,
  ProfessionalDomainParameterSchemaV1,
  ProfessionalNormativeProfileV1,
  ProfessionalResourceCompletenessPolicyV1,
} from "../../domainFactory";
import type { InteriorFinishesDomainInventoryRow } from "./inventory";

export const DRYWALL_CEILING_BULKHEAD_PROFESSIONAL_CATALOG_IDS_V3 = Object.freeze([
  "drywall_ceiling_interior_bulkhead_frame_large_area",
  "drywall_ceiling_interior_bulkhead_frame_small_area",
  "drywall_ceiling_interior_bulkhead_frame_standard",
  "drywall_ceiling_interior_bulkhead_frame_technical_room",
  "drywall_ceiling_interior_bulkhead_frame_wet_zone",
  "drywall_ceiling_interior_bulkhead_align_large_area",
  "drywall_ceiling_interior_bulkhead_align_small_area",
  "drywall_ceiling_interior_bulkhead_align_standard",
  "drywall_ceiling_interior_bulkhead_align_technical_room",
  "drywall_ceiling_interior_bulkhead_align_wet_zone",
  "drywall_ceiling_interior_bulkhead_clad_high_load",
  "drywall_ceiling_interior_bulkhead_clad_large_area",
  "drywall_ceiling_interior_bulkhead_clad_small_area",
  "drywall_ceiling_interior_bulkhead_clad_standard",
  "drywall_ceiling_interior_bulkhead_clad_technical_room",
  "drywall_ceiling_interior_bulkhead_clad_wet_zone",
] as const);

export type DrywallCeilingBulkheadProfessionalGroupV3 = "FRAME" | "ALIGN" | "CLAD";
export type DrywallCeilingBulkheadProfessionalVariantV3 =
  | "standard"
  | "large_area"
  | "small_area"
  | "technical_room"
  | "wet_zone"
  | "high_load";

const AUTHORIZED = new Set<string>(DRYWALL_CEILING_BULKHEAD_PROFESSIONAL_CATALOG_IDS_V3);
const ALWAYS = { kind: "ALWAYS" } as const;
const FULL_ONLY = {
  kind: "EQUALS",
  parameter_id: "estimate_scope_mode",
  value: "FULL_APPLICABLE_SCOPE",
} as const;
const BOTH_SCOPES = ["MINIMAL_EXPLICIT_SCOPE", "FULL_APPLICABLE_SCOPE"] as const;
const FULL_SCOPE = ["FULL_APPLICABLE_SCOPE"] as const;

const KG_SP_SOURCE_ID = "KG_SP_KR_65_101_2025";
const KG_KRER_SOURCE_ID = "KG_KRER_10_05_011";

export function drywallCeilingBulkheadProfessionalOwnerIdV3(catalogId: string): string {
  if (!AUTHORIZED.has(catalogId)) throw new Error(`DRYWALL_CEILING_BULKHEAD_OWNER_OUTSIDE_SCOPE:${catalogId}`);
  return `domain-passport:drywall-ceiling-bulkhead-professional-v3:${catalogId}`;
}

export function drywallCeilingBulkheadCalculationStrategyIdV3(catalogId: string): string {
  if (!AUTHORIZED.has(catalogId)) throw new Error(`DRYWALL_CEILING_BULKHEAD_STRATEGY_OUTSIDE_SCOPE:${catalogId}`);
  return `drywall-ceiling-bulkhead-professional-v3:${catalogId}:calculation-strategy`;
}

export function drywallCeilingBulkheadRowSemanticOwnerIdV3(catalogId: string, rowKey: string): string {
  const normalizedRowKey = rowKey.trim();
  if (!normalizedRowKey) throw new Error(`DRYWALL_CEILING_BULKHEAD_ROW_OWNER_KEY_MISSING:${catalogId}`);
  return `${drywallCeilingBulkheadProfessionalOwnerIdV3(catalogId)}:row:${normalizedRowKey}`;
}

type ParameterSpec = {
  parameter_id: string;
  label_ru: string;
  input_type: ProfessionalDomainParameterDefinitionV1["input_type"];
  priority: ProfessionalDomainParameterDefinitionV1["priority"];
  unit_id: string | null;
  role: ProfessionalAssemblyParameterDefinitionV4["role"] | null;
  required_for: readonly ProfessionalEstimateScopeModeV4[];
  minimum?: number;
  maximum?: number;
  choices?: readonly { value: string; label_ru: string }[];
};

type RowSpec = {
  row_key: string;
  section: string;
  category: ProfessionalAssemblyRowDefinitionV4["category"];
  title_ru: string;
  formula: ProfessionalAssemblyFormulaV4;
  scopes: "BOTH" | "FULL_ONLY";
  cost_ownership: ProfessionalAssemblyRowDefinitionV4["cost_ownership"];
  procurement_eligible: boolean;
  krer_locator: string;
  sp_locator: string;
  resource_class: string;
};

export type DrywallCeilingBulkheadProfessionalWorkContractV3 = {
  schema_version: "DrywallCeilingBulkheadProfessionalWorkContractV3";
  catalog_id: string;
  work_key: string;
  title_ru: string;
  group: DrywallCeilingBulkheadProfessionalGroupV3;
  group_order: 1 | 2 | 3;
  variant: DrywallCeilingBulkheadProfessionalVariantV3;
  normative_source_ids: readonly [typeof KG_SP_SOURCE_ID, typeof KG_KRER_SOURCE_ID];
  required_stages: readonly string[];
  optional_stages: readonly string[];
  owned_cost_scope: readonly string[];
  forbidden_cost_scope: readonly string[];
  non_cost_dependencies: readonly string[];
  regional_lane_count: 11;
  global_decision_count: 8;
  normative_proof_bundle_id: string;
  professional_proof_bundle_id: string;
};

export type DrywallCeilingBulkheadProfessionalPackagePartsV3 = {
  contract: DrywallCeilingBulkheadProfessionalWorkContractV3;
  schema: ProfessionalDomainParameterSchemaV1;
  child_assemblies: readonly ProfessionalChildAssemblyV4[];
  normative_profile: ProfessionalNormativeProfileV1;
  required_stages: readonly string[];
  optional_stages: readonly string[];
  resource_policy: ProfessionalResourceCompletenessPolicyV1;
};

function groupOf(catalogId: string): DrywallCeilingBulkheadProfessionalGroupV3 {
  if (catalogId.includes("_frame_")) return "FRAME";
  if (catalogId.includes("_align_")) return "ALIGN";
  if (catalogId.includes("_clad_")) return "CLAD";
  throw new Error(`DRYWALL_CEILING_BULKHEAD_GROUP_NOT_FOUND:${catalogId}`);
}

function variantOf(catalogId: string): DrywallCeilingBulkheadProfessionalVariantV3 {
  for (const variant of ["technical_room", "large_area", "small_area", "wet_zone", "high_load", "standard"] as const) {
    if (catalogId.endsWith(`_${variant}`)) return variant;
  }
  throw new Error(`DRYWALL_CEILING_BULKHEAD_VARIANT_NOT_FOUND:${catalogId}`);
}

function param(
  parameter_id: string,
  label_ru: string,
  input_type: ParameterSpec["input_type"],
  priority: ParameterSpec["priority"],
  unit_id: string | null,
  role: ParameterSpec["role"],
  required_for: ParameterSpec["required_for"],
  bounds: { minimum?: number; maximum?: number; choices?: ParameterSpec["choices"] } = {},
): ParameterSpec {
  return { parameter_id, label_ru, input_type, priority, unit_id, role, required_for, ...bounds };
}

function numeric(
  parameterId: string,
  labelRu: string,
  unitId: string,
  role: Exclude<ParameterSpec["role"], null>,
  scopes: ParameterSpec["required_for"] = BOTH_SCOPES,
  minimum = 0.000001,
  maximum = 100_000_000,
  priority: ParameterSpec["priority"] = scopes === FULL_SCOPE ? "P1" : "P0",
): ParameterSpec {
  return param(parameterId, labelRu, "number", priority, unitId, role, scopes, { minimum, maximum });
}

function formula(
  technologyId: string,
  rowKey: string,
  expression: string,
  inputParameterIds: readonly string[],
  outputUnitId: string,
  calculate: ProfessionalAssemblyFormulaV4["calculate"],
): ProfessionalAssemblyFormulaV4 {
  return {
    formula_id: `${technologyId}:drywall-ceiling-bulkhead-professional-v3:${rowKey}:FormulaGraphV3`,
    expression,
    input_parameter_ids: inputParameterIds,
    output_unit_id: outputUnitId,
    calculate,
  };
}

function row(
  technologyId: string,
  rowKey: string,
  section: string,
  category: RowSpec["category"],
  titleRu: string,
  expression: string,
  inputs: readonly string[],
  outputUnit: string,
  calculate: ProfessionalAssemblyFormulaV4["calculate"],
  options: Partial<Omit<RowSpec, "row_key" | "section" | "category" | "title_ru" | "formula">> = {},
): RowSpec {
  return {
    row_key: rowKey,
    section,
    category,
    title_ru: titleRu,
    formula: formula(technologyId, rowKey, expression, inputs, outputUnit, calculate),
    scopes: options.scopes ?? "BOTH",
    cost_ownership: options.cost_ownership ?? "priced_resource",
    procurement_eligible: options.procurement_eligible ?? (category === "material" || category === "transport"),
    krer_locator: options.krer_locator ?? "Раздел 5, таблица КРЕР 10-05-011, измеритель 100 м²",
    sp_locator: options.sp_locator ?? "СП КР 65-101:2025, пп. 7.7.1–7.7.5 и таблица 7.8",
    resource_class: options.resource_class ?? category,
  };
}

function commonParameters(
  scopeCapability: string,
  group: DrywallCeilingBulkheadProfessionalGroupV3,
): ParameterSpec[] {
  return [
    param("work_included", "Работа включена в проектную смету", "boolean", "P0", null, "SCOPE_TRIGGER", BOTH_SCOPES, {
      choices: [{ value: "true", label_ru: "Да" }, { value: "false", label_ru: "Нет" }],
    }),
    param("estimate_scope_mode", "Состав профессиональной сметы", "choice", "P0", null, null, BOTH_SCOPES, {
      choices: [
        { value: "MINIMAL_EXPLICIT_SCOPE", label_ru: "Минимальный явно заданный состав" },
        { value: "FULL_APPLICABLE_SCOPE", label_ru: "Полный применимый состав" },
      ],
    }),
    param("scope_capability", "Контекст варианта", "choice", "P0", null, null, BOTH_SCOPES, {
      choices: [{ value: scopeCapability, label_ru: scopeCapability }],
    }),
    param("funding_source", "Источник финансирования", "choice", "P0", null, null, BOTH_SCOPES, {
      choices: [
        { value: "PRIVATE_RECOMMENDED", label_ru: "Частное финансирование" },
        { value: "STATE_BUDGET", label_ru: "Государственный бюджет" },
        { value: "EXTRA_BUDGETARY_FUND", label_ru: "Внебюджетный фонд" },
      ],
    }),
    param("project_type", "Тип объекта по проекту", "text", "P0", null, null, BOTH_SCOPES),
    param("product_profile_id", "Паспорт выбранной совместимой системы", "text", "P0", null, null, BOTH_SCOPES),
    param("normative_rate_code", "Точная применимая расценка КРЕР 10-05-011", "text", "P0", null, null, BOTH_SCOPES),
    param("area_m2", "Контрольная площадь потолочного короба из проекта или старой ревизии", "number", "P2", "m2", "PROJECT_QUANTITY", BOTH_SCOPES, { minimum: 0.01, maximum: 10_000_000 }),
    param("length_m", "Проектная длина поверхности короба", "number", "P2", "m", null, BOTH_SCOPES, { minimum: 0.01, maximum: 100_000 }),
    param("width_m", "Проектная ширина/высота поверхности короба", "number", "P2", "m", null, BOTH_SCOPES, { minimum: 0.01, maximum: 100_000 }),
    numeric("horizontal_face_area_m2", "Суммарная площадь горизонтальных граней", "m2", "PROJECT_QUANTITY"),
    numeric("vertical_face_length_m", "Суммарная длина вертикальных граней", "m", "PROJECT_QUANTITY"),
    numeric("vertical_face_count", "Количество вертикальных граней одинакового опуска", "item", "PROJECT_QUANTITY", BOTH_SCOPES, 1, 10_000),
    numeric("end_face_area_m2", "Суммарная площадь торцевых граней", "m2", "PROJECT_QUANTITY", BOTH_SCOPES, 0, 10_000_000),
    numeric("return_face_area_m2", "Суммарная площадь возвратов и переходов", "m2", "PROJECT_QUANTITY", BOTH_SCOPES, 0, 10_000_000),
    numeric("opening_area_m2", "Суммарная площадь вычитаемых проемов", "m2", "PROJECT_QUANTITY", BOTH_SCOPES, 0, 10_000_000),
    numeric("internal_corner_length_m", "Длина внутренних углов", "m", "PROJECT_QUANTITY"),
    numeric("external_corner_length_m", "Длина наружных углов", "m", "PROJECT_QUANTITY"),
    numeric("transition_length_m", "Длина ступеней и переходов", "m", "PROJECT_QUANTITY", BOTH_SCOPES, 0, 10_000_000),
    numeric("opening_perimeter_m", "Периметр проемов, люков и проходок", "m", "PROJECT_QUANTITY", BOTH_SCOPES, 0, 10_000_000),
    numeric("working_height_m", "Высота производства работ", "m", "PROJECT_QUANTITY", BOTH_SCOPES, 0.1, 100),
    numeric("perimeter_length_m", "Длина периметра и примыканий короба", "m", "PROJECT_QUANTITY"),
    numeric("bulkhead_drop_height_m", "Высота опуска короба", "m", "PROJECT_QUANTITY", BOTH_SCOPES, 0.01, 100),
    numeric("board_layer_count", "Число проектных слоев листовой обшивки", "item", "PROJECT_QUANTITY", BOTH_SCOPES, 1, 12),
    numeric("board_thickness_mm", "Проектная толщина листа", "mm", "MATERIAL_PASSPORT_VALUE", BOTH_SCOPES, 1, 100),
    param("board_type", "Тип листа по проекту и паспорту системы", "text", "P0", null, "DEPENDENCY_REFERENCE", BOTH_SCOPES),
    param("moisture_class", "Класс влажностного воздействия", "text", "P0", null, "DEPENDENCY_REFERENCE", BOTH_SCOPES),
    param("fire_rating_class", "Требуемый класс огнестойкости", "text", "P0", null, "DEPENDENCY_REFERENCE", BOTH_SCOPES),
    param("acoustic_class", "Требуемый акустический класс", "text", "P0", null, "DEPENDENCY_REFERENCE", BOTH_SCOPES),
    param("design_load_class", "Класс проектной нагрузки", "text", "P0", null, "DEPENDENCY_REFERENCE", BOTH_SCOPES),
    param("substrate_type", "Тип несущего основания и маршрут анкеровки", "text", "P0", null, "DEPENDENCY_REFERENCE", BOTH_SCOPES),
    param("exact_system_route", "Выбранная совместимая система П112/П113/П131/П116 либо проектный эквивалент", "text", "P0", null, "DEPENDENCY_REFERENCE", BOTH_SCOPES),
    param("surface_quality_level", "Проектный уровень подготовки поверхности Q1/Q2/Q3/Q4", "text", "P0", null, "DEPENDENCY_REFERENCE", BOTH_SCOPES),
    param("project_system_compatibility_reference", "Ссылка на проверку совместимости проектной системы", "text", "P0", null, "DEPENDENCY_REFERENCE", BOTH_SCOPES),
    param("price_basis_reference", "Источник цен: прайс-лист, котировка или pricebook", "text", "P0", null, "PRICE_SOURCE_REFERENCE", BOTH_SCOPES),
    param("price_basis_date", "Дата ценового источника (ГГГГ-ММ-ДД)", "text", "P0", null, "PRICE_SOURCE_REFERENCE", BOTH_SCOPES),
    ...(group === "FRAME" ? [] : [
      param("accepted_frame_revision_id", "Принятая ревизия FRAME (non-cost dependency)", "text", "P0", null, "DEPENDENCY_REFERENCE", BOTH_SCOPES),
    ]),
    ...(group === "ALIGN" ? [
      param("alignment_separate_scope_basis", "Основание отдельной платной ALIGN: приемочная съемка либо коррекция ранее принятого FRAME", "text", "P0", null, "DEPENDENCY_REFERENCE", BOTH_SCOPES),
    ] : []),
    ...(group === "CLAD" ? [
      param("accepted_alignment_revision_id", "Принятая ревизия ALIGN (non-cost dependency)", "text", "P0", null, "DEPENDENCY_REFERENCE", BOTH_SCOPES),
    ] : []),
  ];
}

const CLADDING_GEOMETRY_EXPRESSION = "horizontal_face_area_m2 + vertical_face_length_m × bulkhead_drop_height_m × vertical_face_count + end_face_area_m2 + return_face_area_m2 - opening_area_m2";
const CLADDING_GEOMETRY_INPUTS = [
  "horizontal_face_area_m2",
  "vertical_face_length_m",
  "bulkhead_drop_height_m",
  "vertical_face_count",
  "end_face_area_m2",
  "return_face_area_m2",
  "opening_area_m2",
] as const;

function calculateCladdingGeometryArea(values: Readonly<Record<string, number>>): number {
  return values.horizontal_face_area_m2 +
    values.vertical_face_length_m * values.bulkhead_drop_height_m * values.vertical_face_count +
    values.end_face_area_m2 +
    values.return_face_area_m2 -
    values.opening_area_m2;
}

type ProfessionalCompletionPackageInput = {
  technologyId: string;
  group: DrywallCeilingBulkheadProfessionalGroupV3;
  massExpression: string;
  massInputs: readonly string[];
  calculateMassKg: (values: Readonly<Record<string, number>>) => number;
  wasteExpression: string;
  wasteInputs: readonly string[];
  calculateWasteKg: (values: Readonly<Record<string, number>>) => number;
  workAreaExpression: string;
  workAreaInputs: readonly string[];
  calculateWorkAreaM2: (values: Readonly<Record<string, number>>) => number;
};

/**
 * Общая production-декомпозиция операций, которые нужны для каждого из трех
 * самостоятельных cost owners. Количества и цены остаются runtime inputs:
 * отсутствие проектного объема или котировки не скрывает применимый ресурс.
 */
function professionalCompletionParameters(): ParameterSpec[] {
  return [
    numeric("condition_survey_productivity_m2_per_man_hour", "Производительность входного обследования фронта работ", "m2_per_man_hour", "NORM_RATE", FULL_SCOPE),
    numeric("protection_area_m2", "Площадь защиты смежных конструкций и оборудования", "m2", "PROJECT_QUANTITY", FULL_SCOPE),
    numeric("protection_install_productivity_m2_per_man_hour", "Производительность устройства защитного покрытия", "m2_per_man_hour", "NORM_RATE", FULL_SCOPE),
    numeric("protection_remove_productivity_m2_per_man_hour", "Производительность снятия защитного покрытия", "m2_per_man_hour", "NORM_RATE", FULL_SCOPE),
    numeric("dust_control_consumable_kg_m2", "Расход материалов локального пылеулавливания", "kg_per_m2", "MATERIAL_PASSPORT_VALUE", FULL_SCOPE),
    numeric("mobile_access_productivity_m2_per_machine_hour", "Производительность средств подмащивания по площади", "m2_per_machine_hour", "NORM_RATE", FULL_SCOPE),
    numeric("mobile_access_setup_productivity_service_per_man_hour", "Производительность монтажа и демонтажа средств подмащивания", "service_per_man_hour", "NORM_RATE", FULL_SCOPE),
    numeric("work_zone_safety_service_count", "Количество организаций безопасной рабочей зоны", "service", "PROJECT_QUANTITY", FULL_SCOPE, 1, 100_000),
    numeric("temporary_lighting_machine_hours", "Машино-часы временного освещения рабочей зоны", "machine_hour", "PROJECT_QUANTITY", FULL_SCOPE),
    numeric("storage_acclimatization_productivity_kg_per_man_hour", "Производительность приемки, складирования и акклиматизации", "kg_per_man_hour", "NORM_RATE", FULL_SCOPE),
    numeric("supplier_loading_productivity_kg_per_man_hour", "Производительность погрузки у поставщика", "kg_per_man_hour", "NORM_RATE", FULL_SCOPE),
    numeric("site_unloading_productivity_kg_per_man_hour", "Производительность разгрузки на объекте", "kg_per_man_hour", "NORM_RATE", FULL_SCOPE),
    numeric("intrasite_handling_productivity_kg_per_man_hour", "Производительность внутриплощадочного перемещения", "kg_per_man_hour", "NORM_RATE", FULL_SCOPE),
    numeric("vertical_lift_productivity_kg_per_machine_hour", "Производительность механизированного подъема в рабочую зону", "kg_per_machine_hour", "NORM_RATE", FULL_SCOPE),
    numeric("waste_container_capacity_kg_item", "Вместимость отдельной тары для отходов", "kg_per_item", "MATERIAL_PASSPORT_VALUE", FULL_SCOPE),
    numeric("waste_collection_productivity_kg_per_man_hour", "Производительность сбора отходов", "kg_per_man_hour", "NORM_RATE", FULL_SCOPE),
    numeric("waste_sorting_productivity_kg_per_man_hour", "Производительность сортировки отходов", "kg_per_man_hour", "NORM_RATE", FULL_SCOPE),
    numeric("waste_loading_productivity_kg_per_man_hour", "Производительность погрузки отходов", "kg_per_man_hour", "NORM_RATE", FULL_SCOPE),
    numeric("waste_haul_distance_km", "Расстояние вывоза отходов до подтвержденного получателя", "km", "LOGISTICS_VALUE", FULL_SCOPE, 0.1, 5_000),
    numeric("final_cleaning_productivity_m2_per_man_hour", "Производительность финишной очистки рабочей зоны", "m2_per_man_hour", "NORM_RATE", FULL_SCOPE),
    numeric("system_review_service_count", "Количество проверок совместимости проектной системы специалистом", "service", "CONTROL_PLAN_VALUE", FULL_SCOPE, 1, 100_000),
    numeric("shop_drawing_service_count", "Количество комплектов рабочих схем и раскладок", "service", "CONTROL_PLAN_VALUE", FULL_SCOPE, 1, 100_000),
    numeric("interdisciplinary_coordination_service_count", "Количество координаций с электрическими, ОВиК и пожарными сетями", "service", "CONTROL_PLAN_VALUE", FULL_SCOPE, 1, 100_000),
    numeric("incoming_material_batch_count", "Количество отдельно принимаемых партий материалов", "test", "CONTROL_PLAN_VALUE", FULL_SCOPE, 1, 1_000_000),
    numeric("material_certificate_document_count", "Количество записей паспортов и сертификатов материалов", "document", "CONTROL_PLAN_VALUE", FULL_SCOPE, 1, 1_000_000),
    numeric("hidden_work_document_count", "Количество актов скрытых работ", "document", "CONTROL_PLAN_VALUE", FULL_SCOPE, 1, 1_000_000),
    numeric("quality_protocol_document_count", "Количество протоколов измерений и приемки", "document", "CONTROL_PLAN_VALUE", FULL_SCOPE, 1, 1_000_000),
    numeric("executive_scheme_document_count", "Количество исполнительных схем", "document", "CONTROL_PLAN_VALUE", FULL_SCOPE, 1, 1_000_000),
    numeric("handover_document_package_count", "Количество комплектов приемочной документации", "document", "CONTROL_PLAN_VALUE", FULL_SCOPE, 1, 1_000_000),
    numeric("procurement_package_document_count", "Количество комплектов закупочной спецификации", "document", "CONTROL_PLAN_VALUE", FULL_SCOPE, 1, 1_000_000),
  ];
}

function professionalCompletionRows(input: ProfessionalCompletionPackageInput): RowSpec[] {
  const { technologyId: t, group, massExpression, massInputs, calculateMassKg, wasteExpression, wasteInputs, calculateWasteKg, workAreaExpression, workAreaInputs, calculateWorkAreaM2 } = input;
  const prefix = group.toLowerCase();
  const executionLocator = group === "FRAME"
    ? "КРЕР 10-05-011-02, состав работ пп. 1–7; объем по проекту и ППР"
    : group === "ALIGN"
      ? "КРЕР 10-05-011-02, состав работ пп. 1, 4–6; без повторной стоимости каркаса"
      : "КРЕР 10-05-011-02, состав работ п. 8; без стоимости каркаса и шпаклевочного слоя";
  const completionOptions = { scopes: "FULL_ONLY" as const, krer_locator: executionLocator };
  return [
    row(t, `${prefix}_geometry_output`, "Геометрия", "work", `Расчетная площадь граней, торцов и переходов ${group} за вычетом проемов`, workAreaExpression, workAreaInputs, "m2", calculateWorkAreaM2, { ...completionOptions, cost_ownership: "informational_output", procurement_eligible: false, resource_class: "geometry control output" }),
    row(t, `${prefix}_condition_survey`, "Подготовка", "labor", `Входное обследование и приемка фронта ${group}`, `(${workAreaExpression}) ÷ condition_survey_productivity_m2_per_man_hour`, [...workAreaInputs, "condition_survey_productivity_m2_per_man_hour"], "man_hour", (v) => calculateWorkAreaM2(v) / v.condition_survey_productivity_m2_per_man_hour, completionOptions),
    row(t, `${prefix}_adjacent_protection`, "Защита смежных зон", "material", `Защитное покрытие смежных конструкций и оборудования для ${group}`, "protection_area_m2", ["protection_area_m2"], "m2", (v) => v.protection_area_m2, { ...completionOptions, procurement_eligible: true }),
    row(t, `${prefix}_protection_install_labor`, "Защита смежных зон", "labor", `Устройство защитного покрытия перед ${group}`, "protection_area_m2 ÷ protection_install_productivity_m2_per_man_hour", ["protection_area_m2", "protection_install_productivity_m2_per_man_hour"], "man_hour", (v) => v.protection_area_m2 / v.protection_install_productivity_m2_per_man_hour, completionOptions),
    row(t, `${prefix}_protection_remove_labor`, "Защита смежных зон", "labor", `Снятие защитного покрытия после ${group}`, "protection_area_m2 ÷ protection_remove_productivity_m2_per_man_hour", ["protection_area_m2", "protection_remove_productivity_m2_per_man_hour"], "man_hour", (v) => v.protection_area_m2 / v.protection_remove_productivity_m2_per_man_hour, completionOptions),
    row(t, `${prefix}_dust_control_consumable`, "Расходные материалы", "material", `Материалы локального пылеулавливания при ${group}`, `(${workAreaExpression}) × dust_control_consumable_kg_m2`, [...workAreaInputs, "dust_control_consumable_kg_m2"], "kg", (v) => calculateWorkAreaM2(v) * v.dust_control_consumable_kg_m2, { ...completionOptions, procurement_eligible: true }),
    row(t, `${prefix}_mobile_access_equipment`, "Средства подмащивания", "equipment", `Передвижное средство подмащивания для ${group}`, `(${workAreaExpression}) ÷ mobile_access_productivity_m2_per_machine_hour`, [...workAreaInputs, "mobile_access_productivity_m2_per_machine_hour"], "machine_hour", (v) => calculateWorkAreaM2(v) / v.mobile_access_productivity_m2_per_machine_hour, completionOptions),
    row(t, `${prefix}_mobile_access_setup_labor`, "Средства подмащивания", "labor", `Монтаж, перестановка и демонтаж средств подмащивания ${group}`, "work_zone_safety_service_count ÷ mobile_access_setup_productivity_service_per_man_hour", ["work_zone_safety_service_count", "mobile_access_setup_productivity_service_per_man_hour"], "man_hour", (v) => v.work_zone_safety_service_count / v.mobile_access_setup_productivity_service_per_man_hour, completionOptions),
    row(t, `${prefix}_work_zone_safety`, "Временные работы", "temporary_work", `Организация и снятие безопасной рабочей зоны ${group}`, "work_zone_safety_service_count", ["work_zone_safety_service_count"], "service", (v) => v.work_zone_safety_service_count, { ...completionOptions, procurement_eligible: false, resource_class: "work-zone safety temporary work" }),
    row(t, `${prefix}_temporary_lighting`, "Временные работы", "equipment", `Временное освещение рабочей зоны ${group}`, "temporary_lighting_machine_hours", ["temporary_lighting_machine_hours"], "machine_hour", (v) => v.temporary_lighting_machine_hours, { ...completionOptions, procurement_eligible: false, resource_class: "temporary lighting equipment" }),
    row(t, `${prefix}_transport`, "Логистика", "transport", `Транспортная работа поставки ресурсов ${group}`, `((${massExpression}) ÷ 1000) × delivery_distance_km`, [...massInputs, "delivery_distance_km"], "t_km", (v) => (calculateMassKg(v) / 1000) * v.delivery_distance_km, completionOptions),
    row(t, `${prefix}_supplier_loading_labor`, "Логистика", "labor", `Погрузка ресурсов ${group} у поставщика`, `(${massExpression}) ÷ supplier_loading_productivity_kg_per_man_hour`, [...massInputs, "supplier_loading_productivity_kg_per_man_hour"], "man_hour", (v) => calculateMassKg(v) / v.supplier_loading_productivity_kg_per_man_hour, completionOptions),
    row(t, `${prefix}_site_unloading_labor`, "Логистика", "labor", `Разгрузка ресурсов ${group} на объекте`, `(${massExpression}) ÷ site_unloading_productivity_kg_per_man_hour`, [...massInputs, "site_unloading_productivity_kg_per_man_hour"], "man_hour", (v) => calculateMassKg(v) / v.site_unloading_productivity_kg_per_man_hour, completionOptions),
    row(t, `${prefix}_intrasite_handling_labor`, "Логистика", "labor", `Внутриплощадочное перемещение ресурсов ${group}`, `(${massExpression}) ÷ intrasite_handling_productivity_kg_per_man_hour`, [...massInputs, "intrasite_handling_productivity_kg_per_man_hour"], "man_hour", (v) => calculateMassKg(v) / v.intrasite_handling_productivity_kg_per_man_hour, completionOptions),
    row(t, `${prefix}_vertical_lift_equipment`, "Логистика", "equipment", `Механизированный подъем ресурсов ${group} в рабочую зону`, `(${massExpression}) ÷ vertical_lift_productivity_kg_per_machine_hour`, [...massInputs, "vertical_lift_productivity_kg_per_machine_hour"], "machine_hour", (v) => calculateMassKg(v) / v.vertical_lift_productivity_kg_per_machine_hour, completionOptions),
    row(t, `${prefix}_storage_acclimatization_labor`, "Логистика", "labor", `Приемка, складирование и технологическая акклиматизация ресурсов ${group}`, `(${massExpression}) ÷ storage_acclimatization_productivity_kg_per_man_hour`, [...massInputs, "storage_acclimatization_productivity_kg_per_man_hour"], "man_hour", (v) => calculateMassKg(v) / v.storage_acclimatization_productivity_kg_per_man_hour, completionOptions),
    row(t, `${prefix}_waste_output`, "Отходы", "waste", `Материальный баланс отходов ${group}`, wasteExpression, wasteInputs, "kg", calculateWasteKg, { ...completionOptions, cost_ownership: "informational_output", procurement_eligible: false }),
    row(t, `${prefix}_waste_containers`, "Отходы", "material", `Отдельная тара для отходов ${group}`, `ceil((${wasteExpression}) ÷ waste_container_capacity_kg_item)`, [...wasteInputs, "waste_container_capacity_kg_item"], "item", (v) => Math.ceil(calculateWasteKg(v) / v.waste_container_capacity_kg_item), { ...completionOptions, procurement_eligible: true }),
    row(t, `${prefix}_waste_collection_labor`, "Отходы", "labor", `Сбор отходов ${group}`, `(${wasteExpression}) ÷ waste_collection_productivity_kg_per_man_hour`, [...wasteInputs, "waste_collection_productivity_kg_per_man_hour"], "man_hour", (v) => calculateWasteKg(v) / v.waste_collection_productivity_kg_per_man_hour, completionOptions),
    row(t, `${prefix}_waste_sorting_labor`, "Отходы", "labor", `Сортировка отходов ${group} по потокам`, `(${wasteExpression}) ÷ waste_sorting_productivity_kg_per_man_hour`, [...wasteInputs, "waste_sorting_productivity_kg_per_man_hour"], "man_hour", (v) => calculateWasteKg(v) / v.waste_sorting_productivity_kg_per_man_hour, completionOptions),
    row(t, `${prefix}_waste_loading_labor`, "Отходы", "labor", `Погрузка отходов ${group} для вывоза`, `(${wasteExpression}) ÷ waste_loading_productivity_kg_per_man_hour`, [...wasteInputs, "waste_loading_productivity_kg_per_man_hour"], "man_hour", (v) => calculateWasteKg(v) / v.waste_loading_productivity_kg_per_man_hour, completionOptions),
    row(t, `${prefix}_waste_haul`, "Отходы", "transport", `Транспортная работа вывоза отходов ${group}`, `((${wasteExpression}) ÷ 1000) × waste_haul_distance_km`, [...wasteInputs, "waste_haul_distance_km"], "t_km", (v) => (calculateWasteKg(v) / 1000) * v.waste_haul_distance_km, { ...completionOptions, procurement_eligible: false }),
    row(t, `${prefix}_waste_disposal`, "Отходы", "subcontract_service", `Прием и утилизация отходов ${group} подтвержденным получателем`, `(${wasteExpression}) ÷ 1000`, wasteInputs, "t", (v) => calculateWasteKg(v) / 1000, { ...completionOptions, procurement_eligible: false, resource_class: "verified waste receiver service" }),
    row(t, `${prefix}_final_cleaning_labor`, "Завершение", "labor", `Финишная очистка рабочей зоны после ${group}`, `(${workAreaExpression}) ÷ final_cleaning_productivity_m2_per_man_hour`, [...workAreaInputs, "final_cleaning_productivity_m2_per_man_hour"], "man_hour", (v) => calculateWorkAreaM2(v) / v.final_cleaning_productivity_m2_per_man_hour, completionOptions),
    row(t, `${prefix}_system_compatibility_review`, "Инженерные услуги", "subcontract_service", `Проверка специалистом совместимости проектной системы ${group}`, "system_review_service_count", ["system_review_service_count"], "service", (v) => v.system_review_service_count, { ...completionOptions, procurement_eligible: false, resource_class: "specialist system review" }),
    row(t, `${prefix}_shop_drawings`, "Инженерные услуги", "subcontract_service", `Рабочие схемы и раскладки профилей/листов ${group}`, "shop_drawing_service_count", ["shop_drawing_service_count"], "service", (v) => v.shop_drawing_service_count, { ...completionOptions, procurement_eligible: false, resource_class: "shop drawings" }),
    row(t, `${prefix}_interdisciplinary_coordination`, "Инженерные услуги", "subcontract_service", `Координация ${group} с электрическими, ОВиК и пожарными сетями`, "interdisciplinary_coordination_service_count", ["interdisciplinary_coordination_service_count"], "service", (v) => v.interdisciplinary_coordination_service_count, { ...completionOptions, procurement_eligible: false, resource_class: "MEP coordination" }),
    row(t, `${prefix}_incoming_material_tests`, "Входной контроль", "testing", `Входной контроль отдельных партий материалов ${group}`, "incoming_material_batch_count", ["incoming_material_batch_count"], "test", (v) => v.incoming_material_batch_count, { ...completionOptions, procurement_eligible: false }),
    row(t, `${prefix}_material_certificate_register`, "Исполнительная документация", "documentation", `Реестр паспортов и сертификатов материалов ${group}`, "material_certificate_document_count", ["material_certificate_document_count"], "document", (v) => v.material_certificate_document_count, { ...completionOptions, procurement_eligible: false }),
    row(t, `${prefix}_hidden_work_act`, "Исполнительная документация", "documentation", `Акты скрытых работ ${group}`, "hidden_work_document_count", ["hidden_work_document_count"], "document", (v) => v.hidden_work_document_count, { ...completionOptions, procurement_eligible: false }),
    row(t, `${prefix}_quality_protocol`, "Исполнительная документация", "documentation", `Протоколы измерений и приемки ${group}`, "quality_protocol_document_count", ["quality_protocol_document_count"], "document", (v) => v.quality_protocol_document_count, { ...completionOptions, procurement_eligible: false }),
    row(t, `${prefix}_executive_scheme`, "Исполнительная документация", "documentation", `Исполнительные схемы фактической геометрии ${group}`, "executive_scheme_document_count", ["executive_scheme_document_count"], "document", (v) => v.executive_scheme_document_count, { ...completionOptions, procurement_eligible: false }),
    row(t, `${prefix}_handover_package`, "Приемочная документация", "documentation", `Комплект приемочной документации ${group}`, "handover_document_package_count", ["handover_document_package_count"], "document", (v) => v.handover_document_package_count, { ...completionOptions, procurement_eligible: false }),
    row(t, `${prefix}_procurement_package`, "Закупочная документация", "documentation", `Комплект закупочной спецификации ресурсов ${group}`, "procurement_package_document_count", ["procurement_package_document_count"], "document", (v) => v.procurement_package_document_count, { ...completionOptions, procurement_eligible: false, resource_class: "procurement package" }),
  ];
}

function frameDefinition(
  inventory: InteriorFinishesDomainInventoryRow,
  variant: DrywallCeilingBulkheadProfessionalVariantV3,
): { parameters: ParameterSpec[]; rows: RowSpec[] } {
  const t = inventory.canonical_technology_id;
  const parameters = [
    ...commonParameters(inventory.scope_capability, "FRAME"),
    ...professionalCompletionParameters(),
    numeric("perimeter_profile_run_count", "Число проектных ниток направляющего профиля", "item", "PROJECT_QUANTITY", BOTH_SCOPES, 1, 12),
    numeric("primary_profile_spacing_m", "Шаг основных профилей", "m", "PROJECT_QUANTITY", BOTH_SCOPES, 0.05, 5),
    numeric("cross_profile_spacing_m", "Шаг несущих поперечных профилей", "m", "PROJECT_QUANTITY", BOTH_SCOPES, 0.05, 5),
    numeric("suspension_spacing_m", "Шаг подвесов по профилю", "m", "PROJECT_QUANTITY", BOTH_SCOPES, 0.05, 5),
    numeric("anchor_spacing_m", "Шаг анкеров направляющего профиля", "m", "PROJECT_QUANTITY", BOTH_SCOPES, 0.05, 5),
    numeric("separation_tape_run_count", "Число ниток разделительной ленты", "item", "PROJECT_QUANTITY", BOTH_SCOPES, 1, 12),
    numeric("perimeter_profile_mass_kg_m", "Масса направляющего профиля по паспорту", "kg_per_m", "MATERIAL_PASSPORT_VALUE"),
    numeric("primary_profile_mass_kg_m", "Масса основного профиля по паспорту", "kg_per_m", "MATERIAL_PASSPORT_VALUE"),
    numeric("cross_profile_mass_kg_m", "Масса несущего профиля по паспорту", "kg_per_m", "MATERIAL_PASSPORT_VALUE"),
    numeric("suspension_mass_kg_item", "Масса подвеса/тяги по паспорту", "kg_per_item", "MATERIAL_PASSPORT_VALUE"),
    numeric("suspension_rod_length_m_item", "Длина тяги/шпильки одного подвеса", "m_per_item", "PROJECT_QUANTITY"),
    numeric("suspension_rod_mass_kg_m", "Масса тяги/шпильки подвеса на метр", "kg_per_m", "MATERIAL_PASSPORT_VALUE"),
    numeric("connector_mass_kg_item", "Масса соединителя по паспорту", "kg_per_item", "MATERIAL_PASSPORT_VALUE"),
    numeric("anchor_mass_kg_item", "Масса анкера по паспорту", "kg_per_item", "MATERIAL_PASSPORT_VALUE"),
    numeric("suspension_anchor_mass_kg_item", "Масса анкера подвеса по паспорту", "kg_per_item", "MATERIAL_PASSPORT_VALUE"),
    numeric("profile_extension_count", "Количество удлинителей профиля по карте стыков", "item", "PROJECT_QUANTITY", BOTH_SCOPES, 0, 1_000_000),
    numeric("profile_extension_mass_kg_item", "Масса удлинителя профиля", "kg_per_item", "MATERIAL_PASSPORT_VALUE"),
    numeric("profile_screw_rate_item_m2", "Расход шурупов LN/LB соединения каркаса", "item_per_m2", "MATERIAL_PASSPORT_VALUE"),
    numeric("profile_screw_mass_kg_item", "Масса шурупа LN/LB", "kg_per_item", "MATERIAL_PASSPORT_VALUE"),
    numeric("corner_connector_spacing_m", "Шаг угловых/торцевых соединителей", "m", "PROJECT_QUANTITY", BOTH_SCOPES, 0.01, 10),
    numeric("corner_connector_mass_kg_item", "Масса углового/торцевого соединителя", "kg_per_item", "MATERIAL_PASSPORT_VALUE"),
    numeric("sealing_tape_run_count", "Число ниток уплотнительной ленты под направляющими", "item", "PROJECT_QUANTITY", BOTH_SCOPES, 1, 12),
    numeric("sealing_tape_mass_kg_m", "Масса уплотнительной ленты", "kg_per_m", "MATERIAL_PASSPORT_VALUE"),
    numeric("profile_cut_length_m", "Суммарная длина резов профиля", "m", "PROJECT_QUANTITY"),
    numeric("cut_protection_rate_kg_m", "Расход состава восстановления защиты мест реза", "kg_per_m", "MATERIAL_PASSPORT_VALUE"),
    numeric("separation_tape_mass_kg_m", "Масса разделительной ленты по паспорту", "kg_per_m", "MATERIAL_PASSPORT_VALUE"),
    numeric("setting_out_line_length_m", "Длина линий разметки", "m", "PROJECT_QUANTITY"),
    numeric("setting_out_productivity_m_per_man_hour", "Проверенная производительность разметки", "m_per_man_hour", "NORM_RATE"),
    numeric("anchor_layout_productivity_item_per_man_hour", "Производительность разметки точек анкеров и подвесов", "item_per_man_hour", "NORM_RATE"),
    numeric("anchor_drilling_productivity_item_per_man_hour", "Производительность сверления и подготовки анкеров", "item_per_man_hour", "NORM_RATE"),
    numeric("perimeter_install_productivity_m_per_man_hour", "Производительность монтажа направляющих", "m_per_man_hour", "NORM_RATE"),
    numeric("suspension_install_productivity_item_per_man_hour", "Производительность монтажа подвесов и тяг", "item_per_man_hour", "NORM_RATE"),
    numeric("profile_cut_productivity_m_per_man_hour", "Производительность раскроя профилей", "m_per_man_hour", "NORM_RATE"),
    numeric("profile_assembly_productivity_m2_per_man_hour", "Производительность сборки основных и несущих профилей", "m2_per_man_hour", "NORM_RATE"),
    numeric("connector_install_productivity_item_per_man_hour", "Производительность монтажа соединителей", "item_per_man_hour", "NORM_RATE"),
    numeric("cut_protection_productivity_m_per_man_hour", "Производительность восстановления защиты мест реза", "m_per_man_hour", "NORM_RATE"),
    numeric("frame_perforator_productivity_m2_per_machine_hour", "Проверенная производительность перфоратора FRAME", "m2_per_machine_hour", "NORM_RATE"),
    numeric("frame_profile_cutter_productivity_m2_per_machine_hour", "Проверенная производительность инструмента резки профиля", "m2_per_machine_hour", "NORM_RATE"),
    numeric("frame_drill_productivity_item_per_machine_hour", "Производительность электрической дрели по точкам крепления", "item_per_machine_hour", "NORM_RATE"),
    numeric("frame_laser_productivity_m_per_machine_hour", "Производительность лазерного построителя по линиям", "m_per_machine_hour", "NORM_RATE"),
    numeric("frame_distance_meter_productivity_m2_per_machine_hour", "Производительность дальномера при обмере геометрии", "m2_per_machine_hour", "NORM_RATE"),
    numeric("torque_tool_productivity_item_per_machine_hour", "Производительность контроля крепежа динамометрическим инструментом", "item_per_machine_hour", "NORM_RATE"),
    numeric("anchor_pull_test_count", "Количество испытаний анкеров на вырыв по проектному risk decision", "test", "CONTROL_PLAN_VALUE", FULL_SCOPE, 0, 100_000),
    numeric("delivery_distance_km", "Расстояние поставки материалов FRAME", "km", "LOGISTICS_VALUE", FULL_SCOPE, 0.1, 5_000),
    numeric("waste_percent", "Проектный процент отходов FRAME", "percent", "PROJECT_QUANTITY", FULL_SCOPE, 0.01, 50),
    numeric("qa_interval_m2_per_test", "Площадь FRAME на одну приемочную проверку", "m2_per_test", "CONTROL_PLAN_VALUE", FULL_SCOPE),
    numeric("documentation_record_count", "Количество актов и записей FRAME", "item", "CONTROL_PLAN_VALUE", FULL_SCOPE, 1, 10_000),
  ];
  const usesSuspendedFrame = variant !== "small_area";
  const usesOneLevelConnectors = usesSuspendedFrame && variant !== "large_area";
  const primaryLength = usesSuspendedFrame ? `(${CLADDING_GEOMETRY_EXPRESSION}) ÷ primary_profile_spacing_m` : "0";
  const crossLength = usesSuspendedFrame ? `(${CLADDING_GEOMETRY_EXPRESSION}) ÷ cross_profile_spacing_m` : "0";
  const suspensionCount = usesSuspendedFrame ? `ceil((${primaryLength}) ÷ suspension_spacing_m)` : "0";
  const connectorCount = usesOneLevelConnectors ? `ceil((${CLADDING_GEOMETRY_EXPRESSION}) ÷ (primary_profile_spacing_m × cross_profile_spacing_m))` : "0";
  const anchorCount = "ceil(perimeter_length_m ÷ anchor_spacing_m)";
  const frameConnectorCountExpression = `ceil((internal_corner_length_m + external_corner_length_m + transition_length_m) ÷ corner_connector_spacing_m)`;
  const frameConnectorCount = (v: Readonly<Record<string, number>>) => Math.ceil((v.internal_corner_length_m + v.external_corner_length_m + v.transition_length_m) / v.corner_connector_spacing_m);
  const profileScrewCountExpression = `ceil((${CLADDING_GEOMETRY_EXPRESSION}) × profile_screw_rate_item_m2)`;
  const profileScrewCount = (v: Readonly<Record<string, number>>) => Math.ceil(calculateCladdingGeometryArea(v) * v.profile_screw_rate_item_m2);
  const baseMassExpression = `perimeter_length_m × perimeter_profile_run_count × perimeter_profile_mass_kg_m + (${primaryLength}) × primary_profile_mass_kg_m + (${crossLength}) × cross_profile_mass_kg_m + (${suspensionCount}) × (suspension_mass_kg_item + suspension_rod_length_m_item × suspension_rod_mass_kg_m + suspension_anchor_mass_kg_item) + (${connectorCount}) × connector_mass_kg_item + (${anchorCount}) × anchor_mass_kg_item + profile_extension_count × profile_extension_mass_kg_item + (${profileScrewCountExpression}) × profile_screw_mass_kg_item + (${frameConnectorCountExpression}) × corner_connector_mass_kg_item + perimeter_length_m × separation_tape_run_count × separation_tape_mass_kg_m + perimeter_length_m × sealing_tape_run_count × sealing_tape_mass_kg_m + profile_cut_length_m × cut_protection_rate_kg_m`;
  const baseMassInputs = ["perimeter_length_m", "perimeter_profile_run_count", "perimeter_profile_mass_kg_m", ...CLADDING_GEOMETRY_INPUTS, "primary_profile_spacing_m", "primary_profile_mass_kg_m", "cross_profile_spacing_m", "cross_profile_mass_kg_m", "suspension_spacing_m", "suspension_mass_kg_item", "suspension_rod_length_m_item", "suspension_rod_mass_kg_m", "suspension_anchor_mass_kg_item", "connector_mass_kg_item", "anchor_spacing_m", "anchor_mass_kg_item", "profile_extension_count", "profile_extension_mass_kg_item", "profile_screw_rate_item_m2", "profile_screw_mass_kg_item", "internal_corner_length_m", "external_corner_length_m", "transition_length_m", "corner_connector_spacing_m", "corner_connector_mass_kg_item", "separation_tape_run_count", "separation_tape_mass_kg_m", "sealing_tape_run_count", "sealing_tape_mass_kg_m", "profile_cut_length_m", "cut_protection_rate_kg_m"];
  const baseMass = (v: Readonly<Record<string, number>>) =>
    v.perimeter_length_m * v.perimeter_profile_run_count * v.perimeter_profile_mass_kg_m +
    (usesSuspendedFrame ? (calculateCladdingGeometryArea(v) / v.primary_profile_spacing_m) * v.primary_profile_mass_kg_m : 0) +
    (usesSuspendedFrame ? (calculateCladdingGeometryArea(v) / v.cross_profile_spacing_m) * v.cross_profile_mass_kg_m : 0) +
    (usesSuspendedFrame ? Math.ceil((calculateCladdingGeometryArea(v) / v.primary_profile_spacing_m) / v.suspension_spacing_m) * (v.suspension_mass_kg_item + v.suspension_rod_length_m_item * v.suspension_rod_mass_kg_m + v.suspension_anchor_mass_kg_item) : 0) +
    (usesOneLevelConnectors ? Math.ceil(calculateCladdingGeometryArea(v) / (v.primary_profile_spacing_m * v.cross_profile_spacing_m)) * v.connector_mass_kg_item : 0) +
    Math.ceil(v.perimeter_length_m / v.anchor_spacing_m) * v.anchor_mass_kg_item +
    v.profile_extension_count * v.profile_extension_mass_kg_item +
    profileScrewCount(v) * v.profile_screw_mass_kg_item +
    frameConnectorCount(v) * v.corner_connector_mass_kg_item +
    v.perimeter_length_m * v.separation_tape_run_count * v.separation_tape_mass_kg_m +
    v.perimeter_length_m * v.sealing_tape_run_count * v.sealing_tape_mass_kg_m +
    v.profile_cut_length_m * v.cut_protection_rate_kg_m;
  const rows: RowSpec[] = [
    row(t, "perimeter_profiles", "Каркас", "material", "Направляющие профили периметра потолочного короба", "perimeter_length_m × perimeter_profile_run_count", ["perimeter_length_m", "perimeter_profile_run_count"], "m", (v) => v.perimeter_length_m * v.perimeter_profile_run_count, { krer_locator: "КРЕР 10-05-011-02, состав работ пп. 2–3; ресурс С09-0406-0040" }),
    row(t, "primary_profiles", "Каркас", "material", "Основные потолочные профили", primaryLength, [...CLADDING_GEOMETRY_INPUTS, "primary_profile_spacing_m"], "m", (v) => usesSuspendedFrame ? calculateCladdingGeometryArea(v) / v.primary_profile_spacing_m : 0, { krer_locator: "КРЕР 10-05-011-02, состав работ п. 5; ресурс С09-0407-0001" }),
    row(t, "cross_profiles", "Каркас", "material", "Несущие поперечные профили", crossLength, [...CLADDING_GEOMETRY_INPUTS, "cross_profile_spacing_m"], "m", (v) => usesSuspendedFrame ? calculateCladdingGeometryArea(v) / v.cross_profile_spacing_m : 0, { krer_locator: "КРЕР 10-05-011-02, состав работ п. 5; ресурс С09-0407-0001" }),
    row(t, "suspensions", "Подвесы", "material", "Выбранные подвесы/зажимы exact system route", suspensionCount, [...CLADDING_GEOMETRY_INPUTS, "primary_profile_spacing_m", "suspension_spacing_m"], "item", (v) => usesSuspendedFrame ? Math.ceil((calculateCladdingGeometryArea(v) / v.primary_profile_spacing_m) / v.suspension_spacing_m) : 0, { krer_locator: "КРЕР 10-05-011-01/02, состав работ п. 4; тип подвеса выбирается без смешивания альтернатив" }),
    row(t, "suspension_rods", "Подвесы", "material", "Тяги, шпильки либо верхние части нониус-подвесов exact system route", `(${suspensionCount}) × suspension_rod_length_m_item`, [...CLADDING_GEOMETRY_INPUTS, "primary_profile_spacing_m", "suspension_spacing_m", "suspension_rod_length_m_item"], "m", (v) => usesSuspendedFrame ? Math.ceil((calculateCladdingGeometryArea(v) / v.primary_profile_spacing_m) / v.suspension_spacing_m) * v.suspension_rod_length_m_item : 0, { krer_locator: "КРЕР 10-05-011-01/02, подвесы и тяги; точный компонент по паспорту выбранной системы" }),
    row(t, "suspension_anchors", "Анкеры", "material", "Анкерные элементы каждого подвеса", suspensionCount, [...CLADDING_GEOMETRY_INPUTS, "primary_profile_spacing_m", "suspension_spacing_m"], "item", (v) => usesSuspendedFrame ? Math.ceil((calculateCladdingGeometryArea(v) / v.primary_profile_spacing_m) / v.suspension_spacing_m) : 0, { krer_locator: "КРЕР 10-05-011-02, состав работ п. 4; анкер подвеса учитывается отдельно от подвеса" }),
    row(t, "profile_connectors", "Соединители", "material", "Одноуровневые соединители профилей", connectorCount, [...CLADDING_GEOMETRY_INPUTS, "primary_profile_spacing_m", "cross_profile_spacing_m"], "item", (v) => usesOneLevelConnectors ? Math.ceil(calculateCladdingGeometryArea(v) / (v.primary_profile_spacing_m * v.cross_profile_spacing_m)) : 0, { krer_locator: "КРЕР 10-05-011-02, состав работ п. 6; ресурс С09-0409-0003" }),
    row(t, "profile_extensions", "Соединители", "material", "Удлинители потолочных профилей по карте стыков", "profile_extension_count", ["profile_extension_count"], "item", (v) => v.profile_extension_count, { krer_locator: "КРЕР 10-05-011-01/02, ресурсная ведомость удлинителей; количество по карте стыков" }),
    row(t, "profile_connection_screws", "Крепеж каркаса", "material", "Шурупы LN/LB для соединения металлических профилей", profileScrewCountExpression, [...CLADDING_GEOMETRY_INPUTS, "profile_screw_rate_item_m2"], "item", profileScrewCount, { krer_locator: "КРЕР 10-05-011-01/02, шурупы соединения металлических элементов" }),
    row(t, "corner_connectors", "Углы и переходы", "material", "Угловые и торцевые соединители граней короба", frameConnectorCountExpression, ["internal_corner_length_m", "external_corner_length_m", "transition_length_m", "corner_connector_spacing_m"], "item", frameConnectorCount, { krer_locator: "КРЕР 10-05-011-01/02; количество уточняется проектными узлами углов, торцов и переходов" }),
    row(t, "anchors", "Анкеры", "material", "Анкерные дюбели крепления каркаса", anchorCount, ["perimeter_length_m", "anchor_spacing_m"], "item", (v) => Math.ceil(v.perimeter_length_m / v.anchor_spacing_m), { krer_locator: "КРЕР 10-05-011-02, состав работ п. 3; ресурс С01-1902-0002" }),
    row(t, "separation_tape", "Примыкания", "material", "Разделительная лента в местах сопряжений", "perimeter_length_m × separation_tape_run_count", ["perimeter_length_m", "separation_tape_run_count"], "m", (v) => v.perimeter_length_m * v.separation_tape_run_count, { krer_locator: "КРЕР 10-05-011-02, состав работ п. 7; ресурс С01-4114-0005" }),
    row(t, "sealing_tape", "Примыкания", "material", "Уплотнительная лента под направляющими профилями", "perimeter_length_m × sealing_tape_run_count", ["perimeter_length_m", "sealing_tape_run_count"], "m", (v) => v.perimeter_length_m * v.sealing_tape_run_count, { krer_locator: "КРЕР 10-05-011-01/02, уплотнительная лента под направляющими" }),
    row(t, "profile_cut_protection", "Защита металла", "material", "Состав восстановления защитного покрытия мест реза профиля", "profile_cut_length_m × cut_protection_rate_kg_m", ["profile_cut_length_m", "cut_protection_rate_kg_m"], "kg", (v) => v.profile_cut_length_m * v.cut_protection_rate_kg_m, { krer_locator: "КРЕР 10-05-011-01/02; применимость и расход по проекту и паспорту металлической системы" }),
    row(t, "setting_out_labor", "Труд", "labor", "Разметка проектного положения каркаса", "setting_out_line_length_m ÷ setting_out_productivity_m_per_man_hour", ["setting_out_line_length_m", "setting_out_productivity_m_per_man_hour"], "man_hour", (v) => v.setting_out_line_length_m / v.setting_out_productivity_m_per_man_hour, { krer_locator: "КРЕР 10-05-011-02, состав работ п. 1; строка 1 «Затраты труда рабочих»" }),
    row(t, "anchor_point_layout_labor", "Труд", "labor", "Разметка точек анкеров направляющих и подвесов", `(${suspensionCount} + ${anchorCount}) ÷ anchor_layout_productivity_item_per_man_hour`, [...CLADDING_GEOMETRY_INPUTS, "primary_profile_spacing_m", "suspension_spacing_m", "perimeter_length_m", "anchor_spacing_m", "anchor_layout_productivity_item_per_man_hour"], "man_hour", (v) => (Math.ceil((calculateCladdingGeometryArea(v) / v.primary_profile_spacing_m) / v.suspension_spacing_m) + Math.ceil(v.perimeter_length_m / v.anchor_spacing_m)) / v.anchor_layout_productivity_item_per_man_hour, { krer_locator: "КРЕР 10-05-011-02, состав работ пп. 2–4; разметка точек выделена по ППР" }),
    row(t, "anchor_drilling_labor", "Труд", "labor", "Сверление отверстий и подготовка основания под анкеры", `(${suspensionCount} + ${anchorCount}) ÷ anchor_drilling_productivity_item_per_man_hour`, [...CLADDING_GEOMETRY_INPUTS, "primary_profile_spacing_m", "suspension_spacing_m", "perimeter_length_m", "anchor_spacing_m", "anchor_drilling_productivity_item_per_man_hour"], "man_hour", (v) => (Math.ceil((calculateCladdingGeometryArea(v) / v.primary_profile_spacing_m) / v.suspension_spacing_m) + Math.ceil(v.perimeter_length_m / v.anchor_spacing_m)) / v.anchor_drilling_productivity_item_per_man_hour, { krer_locator: "КРЕР 10-05-011-02, состав работ пп. 2–4; подготовка основания" }),
    row(t, "perimeter_install_labor", "Труд", "labor", "Монтаж уплотнительной ленты и направляющих профилей", "perimeter_length_m × perimeter_profile_run_count ÷ perimeter_install_productivity_m_per_man_hour", ["perimeter_length_m", "perimeter_profile_run_count", "perimeter_install_productivity_m_per_man_hour"], "man_hour", (v) => v.perimeter_length_m * v.perimeter_profile_run_count / v.perimeter_install_productivity_m_per_man_hour, { krer_locator: "КРЕР 10-05-011-02, состав работ пп. 2–3" }),
    row(t, "suspension_install_labor", "Труд", "labor", "Монтаж анкеров, подвесов и тяг", `(${suspensionCount}) ÷ suspension_install_productivity_item_per_man_hour`, [...CLADDING_GEOMETRY_INPUTS, "primary_profile_spacing_m", "suspension_spacing_m", "suspension_install_productivity_item_per_man_hour"], "man_hour", (v) => Math.ceil((calculateCladdingGeometryArea(v) / v.primary_profile_spacing_m) / v.suspension_spacing_m) / v.suspension_install_productivity_item_per_man_hour, { krer_locator: "КРЕР 10-05-011-02, состав работ п. 4" }),
    row(t, "profile_cutting_labor", "Труд", "labor", "Раскрой основных, несущих и направляющих профилей", "profile_cut_length_m ÷ profile_cut_productivity_m_per_man_hour", ["profile_cut_length_m", "profile_cut_productivity_m_per_man_hour"], "man_hour", (v) => v.profile_cut_length_m / v.profile_cut_productivity_m_per_man_hour, { krer_locator: "КРЕР 10-05-011-01/02; электрические ножницы и труд раскроя" }),
    row(t, "profile_assembly_labor", "Труд", "labor", "Установка основных и несущих профилей по всем граням", `(${CLADDING_GEOMETRY_EXPRESSION}) ÷ profile_assembly_productivity_m2_per_man_hour`, [...CLADDING_GEOMETRY_INPUTS, "profile_assembly_productivity_m2_per_man_hour"], "man_hour", (v) => calculateCladdingGeometryArea(v) / v.profile_assembly_productivity_m2_per_man_hour, { krer_locator: "КРЕР 10-05-011-02, состав работ п. 5" }),
    row(t, "connector_install_labor", "Труд", "labor", "Монтаж соединителей, удлинителей, углов и переходов", `(${connectorCount} + profile_extension_count + ${frameConnectorCountExpression}) ÷ connector_install_productivity_item_per_man_hour`, [...CLADDING_GEOMETRY_INPUTS, "primary_profile_spacing_m", "cross_profile_spacing_m", "profile_extension_count", "internal_corner_length_m", "external_corner_length_m", "transition_length_m", "corner_connector_spacing_m", "connector_install_productivity_item_per_man_hour"], "man_hour", (v) => (Math.ceil(calculateCladdingGeometryArea(v) / (v.primary_profile_spacing_m * v.cross_profile_spacing_m)) + v.profile_extension_count + frameConnectorCount(v)) / v.connector_install_productivity_item_per_man_hour, { krer_locator: "КРЕР 10-05-011-02, состав работ п. 6" }),
    row(t, "cut_protection_labor", "Труд", "labor", "Восстановление защитного покрытия мест реза металлических элементов", "profile_cut_length_m ÷ cut_protection_productivity_m_per_man_hour", ["profile_cut_length_m", "cut_protection_productivity_m_per_man_hour"], "man_hour", (v) => v.profile_cut_length_m / v.cut_protection_productivity_m_per_man_hour, { krer_locator: "КРЕР 10-05-011-01/02; отдельная операция по проекту/паспорту системы" }),
    row(t, "frame_perforator_equipment", "Оборудование", "equipment", "Перфоратор для анкеровки FRAME", `(${CLADDING_GEOMETRY_EXPRESSION}) ÷ frame_perforator_productivity_m2_per_machine_hour`, [...CLADDING_GEOMETRY_INPUTS, "frame_perforator_productivity_m2_per_machine_hour"], "machine_hour", (v) => calculateCladdingGeometryArea(v) / v.frame_perforator_productivity_m2_per_machine_hour, { krer_locator: "КРЕР 10-05-011-02, машина Х33-0462" }),
    row(t, "frame_profile_cutter_equipment", "Оборудование", "equipment", "Электрические ножницы для резки профилей FRAME", `(${CLADDING_GEOMETRY_EXPRESSION}) ÷ frame_profile_cutter_productivity_m2_per_machine_hour`, [...CLADDING_GEOMETRY_INPUTS, "frame_profile_cutter_productivity_m2_per_machine_hour"], "machine_hour", (v) => calculateCladdingGeometryArea(v) / v.frame_profile_cutter_productivity_m2_per_machine_hour, { krer_locator: "КРЕР 10-05-011-02, машина Х33-0840; отдельный технологический маршрут резки" }),
    row(t, "frame_drill_equipment", "Оборудование", "equipment", "Электрическая дрель для соединения элементов FRAME", `(${profileScrewCountExpression}) ÷ frame_drill_productivity_item_per_machine_hour`, [...CLADDING_GEOMETRY_INPUTS, "profile_screw_rate_item_m2", "frame_drill_productivity_item_per_machine_hour"], "machine_hour", (v) => profileScrewCount(v) / v.frame_drill_productivity_item_per_machine_hour, { krer_locator: "КРЕР 10-05-011-01/02, ресурсная ведомость машин; электрическая дрель по ППР" }),
    row(t, "frame_laser_equipment", "Оборудование", "equipment", "Лазерный построитель плоскостей FRAME", "setting_out_line_length_m ÷ frame_laser_productivity_m_per_machine_hour", ["setting_out_line_length_m", "frame_laser_productivity_m_per_machine_hour"], "machine_hour", (v) => v.setting_out_line_length_m / v.frame_laser_productivity_m_per_machine_hour, { krer_locator: "КРЕР 10-05-011-02, состав работ п. 1; инструментальный маршрут по ППР" }),
    row(t, "frame_distance_meter_equipment", "Оборудование", "equipment", "Лазерный дальномер и измерительный комплект FRAME", `(${CLADDING_GEOMETRY_EXPRESSION}) ÷ frame_distance_meter_productivity_m2_per_machine_hour`, [...CLADDING_GEOMETRY_INPUTS, "frame_distance_meter_productivity_m2_per_machine_hour"], "machine_hour", (v) => calculateCladdingGeometryArea(v) / v.frame_distance_meter_productivity_m2_per_machine_hour, { krer_locator: "КРЕР 10-05-011-02, состав работ п. 1; обмер сложной геометрии по ППР" }),
    row(t, "frame_torque_tool_equipment", "Контроль крепежа", "equipment", "Динамометрический инструмент контроля крепежа FRAME", `(${suspensionCount} + ${anchorCount}) ÷ torque_tool_productivity_item_per_machine_hour`, [...CLADDING_GEOMETRY_INPUTS, "primary_profile_spacing_m", "suspension_spacing_m", "perimeter_length_m", "anchor_spacing_m", "torque_tool_productivity_item_per_machine_hour"], "machine_hour", (v) => (Math.ceil((calculateCladdingGeometryArea(v) / v.primary_profile_spacing_m) / v.suspension_spacing_m) + Math.ceil(v.perimeter_length_m / v.anchor_spacing_m)) / v.torque_tool_productivity_item_per_machine_hour, { krer_locator: "КРЕР 10-05-011-01/02; контроль по проектному плану качества" }),
    row(t, "anchor_pull_tests", "Контроль крепежа", "testing", "Испытания анкеров на вырыв по проектному risk decision", "anchor_pull_test_count", ["anchor_pull_test_count"], "test", (v) => v.anchor_pull_test_count, { scopes: "FULL_ONLY", krer_locator: "КРЕР 10-05-011-01/02; количество испытаний по проекту и плану контроля", sp_locator: "СП КР 65-101:2025, пп. 4.4–4.9; несущая способность основания подтверждается проектом" }),
  ];

  let massExpression = baseMassExpression;
  let massInputs = [...baseMassInputs];
  let massCalculate = baseMass;
  if (variant === "large_area") {
    rows.splice(rows.findIndex((item) => item.row_key === "profile_connectors"), 1);
    parameters.push(
      numeric("large_area_handling_productivity_kg_per_machine_hour", "Производительность механизированной подачи на большой площади", "kg_per_machine_hour", "NORM_RATE"),
      numeric("large_area_staging_zone_count", "Количество зон складирования большой площади", "item", "PROJECT_QUANTITY", BOTH_SCOPES, 1, 10_000),
      numeric("large_area_staging_productivity_zone_per_machine_hour", "Производительность перестановки между зонами", "item_per_machine_hour", "NORM_RATE"),
      numeric("large_area_control_joint_length_m", "Длина деформационных/контрольных швов большой площади", "m", "PROJECT_QUANTITY", BOTH_SCOPES, 0, 1_000_000),
      numeric("large_area_control_joint_profile_mass_kg_m", "Масса профиля контрольного шва", "kg_per_m", "MATERIAL_PASSPORT_VALUE"),
      numeric("large_area_two_level_connector_count", "Количество двухуровневых соединителей выбранной системы", "item", "PROJECT_QUANTITY", BOTH_SCOPES, 0, 10_000_000),
      numeric("large_area_two_level_connector_mass_kg_item", "Масса двухуровневого соединителя", "kg_per_item", "MATERIAL_PASSPORT_VALUE"),
      numeric("large_area_structural_review_service_count", "Количество расчетов шага, прогиба и стыков большой площади", "service", "CONTROL_PLAN_VALUE", BOTH_SCOPES, 1, 100_000),
    );
    rows.push(
      row(t, "large_area_material_handling", "Механизированная подача", "equipment", "Механизированная подача элементов FRAME между зонами складирования", `(${massExpression}) ÷ large_area_handling_productivity_kg_per_machine_hour + large_area_staging_zone_count ÷ large_area_staging_productivity_zone_per_machine_hour`, [...massInputs, "large_area_handling_productivity_kg_per_machine_hour", "large_area_staging_zone_count", "large_area_staging_productivity_zone_per_machine_hour"], "machine_hour", (v) => baseMass(v) / v.large_area_handling_productivity_kg_per_machine_hour + v.large_area_staging_zone_count / v.large_area_staging_productivity_zone_per_machine_hour, { krer_locator: "КРЕР 10-05-011-02, измеритель 100 м²; подача — отдельный проектный маршрут", resource_class: "large-area material handling" }),
      row(t, "large_area_control_joint_profile", "Деформационные швы", "material", "Профиль деформационного/контрольного шва большой площади", "large_area_control_joint_length_m", ["large_area_control_joint_length_m"], "m", (v) => v.large_area_control_joint_length_m, { krer_locator: "КРЕР 10-05-011-01/02; длина и узел по проекту большой площади" }),
      row(t, "large_area_two_level_connectors", "Соединители", "material", "Двухуровневые соединители exact system route большой площади", "large_area_two_level_connector_count", ["large_area_two_level_connector_count"], "item", (v) => v.large_area_two_level_connector_count, { krer_locator: "КРЕР 10-05-011-01, система П112; только при выбранном двухуровневом маршруте" }),
      row(t, "large_area_structural_review", "Инженерные услуги", "subcontract_service", "Расчет шага, прогиба, стыков и контрольных швов большой площади", "large_area_structural_review_service_count", ["large_area_structural_review_service_count"], "service", (v) => v.large_area_structural_review_service_count, { procurement_eligible: false, krer_locator: "КРЕР 10-05-011-01/02 используется как benchmark; расчет выполняется по проектной системе" }),
    );
    massExpression += " + large_area_control_joint_length_m × large_area_control_joint_profile_mass_kg_m + large_area_two_level_connector_count × large_area_two_level_connector_mass_kg_item";
    massInputs.push("large_area_control_joint_length_m", "large_area_control_joint_profile_mass_kg_m", "large_area_two_level_connector_count", "large_area_two_level_connector_mass_kg_item");
    const previous = massCalculate;
    massCalculate = (v) => previous(v) + v.large_area_control_joint_length_m * v.large_area_control_joint_profile_mass_kg_m + v.large_area_two_level_connector_count * v.large_area_two_level_connector_mass_kg_item;
  } else if (variant === "small_area") {
    for (const excludedRow of ["primary_profiles", "cross_profiles", "suspensions", "suspension_rods", "suspension_anchors", "profile_connectors", "suspension_install_labor"]) {
      const index = rows.findIndex((item) => item.row_key === excludedRow);
      if (index >= 0) rows.splice(index, 1);
    }
    parameters.push(
      numeric("small_area_corner_count", "Количество углов и коротких возвратов", "item", "PROJECT_QUANTITY", BOTH_SCOPES, 1, 100_000),
      numeric("small_area_corner_productivity_item_per_man_hour", "Производительность деталировки углов", "item_per_man_hour", "NORM_RATE"),
      numeric("small_area_self_supporting_profile_length_m", "Длина ПН/ПС профиля самонесущих участков", "m", "PROJECT_QUANTITY", BOTH_SCOPES, 0, 1_000_000),
      numeric("small_area_self_supporting_profile_mass_kg_m", "Масса ПН/ПС профиля самонесущего участка", "kg_per_m", "MATERIAL_PASSPORT_VALUE"),
      numeric("small_area_self_supporting_stud_length_m", "Длина стоечного ПС профиля самонесущих участков", "m", "PROJECT_QUANTITY", BOTH_SCOPES, 0, 1_000_000),
      numeric("small_area_self_supporting_stud_mass_kg_m", "Масса стоечного ПС профиля", "kg_per_m", "MATERIAL_PASSPORT_VALUE"),
    );
    rows.push(
      row(t, "small_area_corner_detail_labor", "Деталировка", "labor", "Подрезка и сборка каркаса в углах малой площади", "small_area_corner_count ÷ small_area_corner_productivity_item_per_man_hour", ["small_area_corner_count", "small_area_corner_productivity_item_per_man_hour"], "man_hour", (v) => v.small_area_corner_count / v.small_area_corner_productivity_item_per_man_hour, { krer_locator: "КРЕР 10-05-011-02, состав работ пп. 5–6; проектная деталировка углов" }),
      row(t, "small_area_self_supporting_guide_profiles", "Самонесущие участки", "material", "Направляющие ПН профили самонесущих коробчатых участков", "small_area_self_supporting_profile_length_m", ["small_area_self_supporting_profile_length_m"], "m", (v) => v.small_area_self_supporting_profile_length_m, { krer_locator: "КРЕР 10-05-011 применяется по аналогии; exact П131/проектный маршрут подтверждается отдельно" }),
      row(t, "small_area_self_supporting_stud_profiles", "Самонесущие участки", "material", "Стоечные ПС профили самонесущих коробчатых участков", "small_area_self_supporting_stud_length_m", ["small_area_self_supporting_stud_length_m"], "m", (v) => v.small_area_self_supporting_stud_length_m, { krer_locator: "КРЕР 10-05-011 применяется по аналогии; exact П131/проектный маршрут подтверждается отдельно" }),
    );
    massExpression += " + small_area_self_supporting_profile_length_m × small_area_self_supporting_profile_mass_kg_m + small_area_self_supporting_stud_length_m × small_area_self_supporting_stud_mass_kg_m";
    massInputs.push("small_area_self_supporting_profile_length_m", "small_area_self_supporting_profile_mass_kg_m", "small_area_self_supporting_stud_length_m", "small_area_self_supporting_stud_mass_kg_m");
    const previous = massCalculate;
    massCalculate = (v) => previous(v) + v.small_area_self_supporting_profile_length_m * v.small_area_self_supporting_profile_mass_kg_m + v.small_area_self_supporting_stud_length_m * v.small_area_self_supporting_stud_mass_kg_m;
  } else if (variant === "technical_room") {
    parameters.push(
      numeric("technical_service_opening_count", "Количество инженерных проходов", "item", "PROJECT_QUANTITY", BOTH_SCOPES, 1, 100_000),
      numeric("technical_opening_profile_m_per_opening", "Профиль усиления на один инженерный проход", "m_per_item", "MATERIAL_PASSPORT_VALUE"),
      numeric("technical_opening_profile_mass_kg_m", "Масса профиля усиления инженерных проходов", "kg_per_m", "MATERIAL_PASSPORT_VALUE"),
      numeric("technical_opening_productivity_item_per_man_hour", "Производительность обрамления инженерных проходов", "item_per_man_hour", "NORM_RATE"),
      numeric("technical_opening_reinforcement_fastener_item", "Крепеж усиления инженерных проходов", "item", "PROJECT_QUANTITY", BOTH_SCOPES, 0, 1_000_000),
      numeric("technical_opening_fastener_mass_kg_item", "Масса крепежа усиления инженерных проходов", "kg_per_item", "MATERIAL_PASSPORT_VALUE"),
      numeric("technical_mep_coordination_service_count", "Количество BIM/MEP координаций проходок и сервисных зон", "service", "CONTROL_PLAN_VALUE", BOTH_SCOPES, 1, 100_000),
    );
    rows.push(
      row(t, "technical_opening_profiles", "Инженерные проходы", "material", "Профили обрамления инженерных проходов", "technical_service_opening_count × technical_opening_profile_m_per_opening", ["technical_service_opening_count", "technical_opening_profile_m_per_opening"], "m", (v) => v.technical_service_opening_count * v.technical_opening_profile_m_per_opening, { krer_locator: "КРЕР 10-05-011-02, профили С09-0407; количество по проекту технического помещения" }),
      row(t, "technical_opening_frame_labor", "Инженерные проходы", "labor", "Обрамление проходов каркасом", "technical_service_opening_count ÷ technical_opening_productivity_item_per_man_hour", ["technical_service_opening_count", "technical_opening_productivity_item_per_man_hour"], "man_hour", (v) => v.technical_service_opening_count / v.technical_opening_productivity_item_per_man_hour, { krer_locator: "КРЕР 10-05-011-02, состав работ пп. 5–6; проектные узлы проходов" }),
      row(t, "technical_opening_reinforcement_fasteners", "Инженерные проходы", "material", "Крепеж усилений вокруг проходов и люков", "technical_opening_reinforcement_fastener_item", ["technical_opening_reinforcement_fastener_item"], "item", (v) => v.technical_opening_reinforcement_fastener_item, { krer_locator: "КРЕР 10-05-011-01/02; количество по проектным узлам проходов" }),
      row(t, "technical_mep_coordination", "Инженерные услуги", "subcontract_service", "BIM/MEP координация каркаса, проходок и сервисных зазоров", "technical_mep_coordination_service_count", ["technical_mep_coordination_service_count"], "service", (v) => v.technical_mep_coordination_service_count, { procurement_eligible: false, krer_locator: "КРЕР 10-05-011-01/02; координация выделена как проектная услуга без стоимости инженерных сетей" }),
    );
    massExpression += " + technical_service_opening_count × technical_opening_profile_m_per_opening × technical_opening_profile_mass_kg_m + technical_opening_reinforcement_fastener_item × technical_opening_fastener_mass_kg_item";
    massInputs.push("technical_service_opening_count", "technical_opening_profile_m_per_opening", "technical_opening_profile_mass_kg_m", "technical_opening_reinforcement_fastener_item", "technical_opening_fastener_mass_kg_item");
    const previous = massCalculate;
    massCalculate = (v) => previous(v) + v.technical_service_opening_count * v.technical_opening_profile_m_per_opening * v.technical_opening_profile_mass_kg_m + v.technical_opening_reinforcement_fastener_item * v.technical_opening_fastener_mass_kg_item;
  } else if (variant === "wet_zone") {
    parameters.push(
      numeric("wet_zone_corrosion_protection_rate_kg_m2", "Расход совместимой антикоррозионной защиты", "kg_per_m2", "MATERIAL_PASSPORT_VALUE"),
      numeric("wet_zone_protection_productivity_m2_per_man_hour", "Производительность нанесения защиты", "m2_per_man_hour", "NORM_RATE"),
      numeric("wet_zone_frame_test_interval_m2", "Интервал контроля защитного исполнения", "m2_per_test", "CONTROL_PLAN_VALUE"),
      numeric("wet_zone_corrosion_fastener_count", "Количество коррозионностойкого крепежа влажной зоны", "item", "PROJECT_QUANTITY", BOTH_SCOPES, 0, 10_000_000),
      numeric("wet_zone_corrosion_fastener_mass_kg_item", "Масса коррозионностойкого крепежа", "kg_per_item", "MATERIAL_PASSPORT_VALUE"),
    );
    rows.push(
      row(t, "wet_zone_corrosion_protection", "Защита влажной зоны", "material", "Совместимая антикоррозионная защита элементов FRAME", `(${CLADDING_GEOMETRY_EXPRESSION}) × wet_zone_corrosion_protection_rate_kg_m2`, [...CLADDING_GEOMETRY_INPUTS, "wet_zone_corrosion_protection_rate_kg_m2"], "kg", (v) => calculateCladdingGeometryArea(v) * v.wet_zone_corrosion_protection_rate_kg_m2, { krer_locator: "КРЕР 10-05-011-02; специальная защита определяется проектом и паспортом системы" }),
      row(t, "wet_zone_protection_labor", "Защита влажной зоны", "labor", "Нанесение антикоррозионной защиты FRAME", `(${CLADDING_GEOMETRY_EXPRESSION}) ÷ wet_zone_protection_productivity_m2_per_man_hour`, [...CLADDING_GEOMETRY_INPUTS, "wet_zone_protection_productivity_m2_per_man_hour"], "man_hour", (v) => calculateCladdingGeometryArea(v) / v.wet_zone_protection_productivity_m2_per_man_hour),
      row(t, "wet_zone_corrosion_fasteners", "Защита влажной зоны", "material", "Коррозионностойкий крепеж FRAME влажной зоны", "wet_zone_corrosion_fastener_count", ["wet_zone_corrosion_fastener_count"], "item", (v) => v.wet_zone_corrosion_fastener_count, { krer_locator: "КРЕР 10-05-011-01/02; исполнение по паспорту wet-zone system" }),
      row(t, "wet_zone_frame_tests", "Контроль влажной зоны", "testing", "Контроль непрерывности защитного исполнения FRAME", "ceil(area_m2 ÷ wet_zone_frame_test_interval_m2)", ["area_m2", "wet_zone_frame_test_interval_m2"], "test", (v) => Math.ceil(v.area_m2 / v.wet_zone_frame_test_interval_m2), { sp_locator: "СП КР 65-101:2025, пп. 4.4–4.9; требования проекта и паспорта влажностойкой системы" }),
    );
    massExpression += ` + (${CLADDING_GEOMETRY_EXPRESSION}) × wet_zone_corrosion_protection_rate_kg_m2 + wet_zone_corrosion_fastener_count × wet_zone_corrosion_fastener_mass_kg_item`;
    massInputs.push("wet_zone_corrosion_protection_rate_kg_m2", "wet_zone_corrosion_fastener_count", "wet_zone_corrosion_fastener_mass_kg_item");
    const previous = massCalculate;
    massCalculate = (v) => previous(v) + calculateCladdingGeometryArea(v) * v.wet_zone_corrosion_protection_rate_kg_m2 + v.wet_zone_corrosion_fastener_count * v.wet_zone_corrosion_fastener_mass_kg_item;
  }

  massInputs = [...new Set(massInputs)];
  rows.push(
    ...professionalCompletionRows({
      technologyId: t,
      group: "FRAME",
      massExpression,
      massInputs,
      calculateMassKg: massCalculate,
      wasteExpression: `(${massExpression}) × waste_percent ÷ 100`,
      wasteInputs: [...massInputs, "waste_percent"],
      calculateWasteKg: (v) => massCalculate(v) * v.waste_percent / 100,
      workAreaExpression: CLADDING_GEOMETRY_EXPRESSION,
      workAreaInputs: CLADDING_GEOMETRY_INPUTS,
      calculateWorkAreaM2: calculateCladdingGeometryArea,
    }),
    row(t, "frame_geometry_tests", "Контроль качества", "testing", "Приемка геометрии, плоскости и отметок FRAME", "ceil(area_m2 ÷ qa_interval_m2_per_test)", ["area_m2", "qa_interval_m2_per_test"], "test", (v) => Math.ceil(v.area_m2 / v.qa_interval_m2_per_test), { scopes: "FULL_ONLY", sp_locator: "СП КР 65-101:2025, п. 7.7.1 и таблица 7.8" }),
    row(t, "frame_documentation", "Исполнительная документация", "documentation", "Записи журнала производства работ FRAME", "documentation_record_count", ["documentation_record_count"], "document", (v) => v.documentation_record_count, { scopes: "FULL_ONLY", sp_locator: "СП КР 65-101:2025, пп. 4.4–4.9" }),
  );
  return { parameters, rows };
}

function alignDefinition(
  inventory: InteriorFinishesDomainInventoryRow,
  variant: DrywallCeilingBulkheadProfessionalVariantV3,
): { parameters: ParameterSpec[]; rows: RowSpec[] } {
  const t = inventory.canonical_technology_id;
  const parameters = [
    ...commonParameters(inventory.scope_capability, "ALIGN"),
    ...professionalCompletionParameters(),
    numeric("reference_grid_point_count", "Количество точек опорной геодезической сетки", "item", "PROJECT_QUANTITY", BOTH_SCOPES, 1, 1_000_000),
    numeric("survey_productivity_point_per_man_hour", "Производительность съемки опорной сетки", "item_per_man_hour", "NORM_RATE"),
    numeric("alignment_point_count", "Количество регулируемых узлов существующего каркаса", "item", "PROJECT_QUANTITY", BOTH_SCOPES, 1, 10_000_000),
    numeric("adjustment_consumable_item_per_point", "Расход регулировочных расходников на узел", "item_per_item", "MATERIAL_PASSPORT_VALUE"),
    numeric("adjustment_consumable_mass_kg_item", "Масса одного регулировочного расходника", "kg_per_item", "MATERIAL_PASSPORT_VALUE"),
    numeric("adjustment_productivity_point_per_man_hour", "Производительность регулировки узлов", "item_per_man_hour", "NORM_RATE"),
    numeric("laser_productivity_point_per_machine_hour", "Производительность лазерного контроля", "item_per_machine_hour", "NORM_RATE"),
    numeric("reference_line_length_m", "Длина опорных контрольных линий", "m", "PROJECT_QUANTITY"),
    numeric("reference_line_consumable_mass_kg_m", "Масса разметочного расходника на метр", "kg_per_m", "MATERIAL_PASSPORT_VALUE"),
    numeric("local_correction_point_count", "Количество локальных корректировок", "item", "PROJECT_QUANTITY", BOTH_SCOPES, 1, 10_000_000),
    numeric("local_correction_productivity_point_per_man_hour", "Производительность локальной коррекции", "item_per_man_hour", "NORM_RATE"),
    numeric("defective_minor_fastener_count", "Количество доказанно дефектных мелких крепежных элементов для замены", "item", "PROJECT_QUANTITY", BOTH_SCOPES, 0, 10_000_000),
    numeric("defective_minor_fastener_mass_kg_item", "Масса заменяемого мелкого крепежа", "kg_per_item", "MATERIAL_PASSPORT_VALUE"),
    numeric("diagonal_verticality_point_count", "Количество измерений диагоналей, вертикальности, торцов и переходов", "item", "PROJECT_QUANTITY", BOTH_SCOPES, 1, 10_000_000),
    numeric("distance_meter_productivity_point_per_machine_hour", "Производительность дальномера по контрольным точкам", "item_per_machine_hour", "NORM_RATE"),
    numeric("alignment_screwdriver_productivity_point_per_machine_hour", "Производительность шуруповерта при локальной коррекции", "item_per_machine_hour", "NORM_RATE"),
    numeric("alignment_torque_productivity_point_per_machine_hour", "Производительность динамометрического контроля соединений", "item_per_machine_hour", "NORM_RATE"),
    numeric("executive_survey_service_count", "Количество независимых исполнительных съемок ALIGN", "service", "CONTROL_PLAN_VALUE", FULL_SCOPE, 0, 100_000),
    numeric("plane_qa_interval_m2_per_test", "Площадь на одну приемку плоскости", "m2_per_test", "CONTROL_PLAN_VALUE"),
    numeric("delivery_distance_km", "Расстояние поставки регулировочных расходников", "km", "LOGISTICS_VALUE", FULL_SCOPE, 0.1, 5_000),
    numeric("waste_percent", "Проектный процент отходов регулировочных расходников", "percent", "PROJECT_QUANTITY", FULL_SCOPE, 0.01, 50),
    numeric("documentation_record_count", "Количество актов и записей ALIGN", "item", "CONTROL_PLAN_VALUE", FULL_SCOPE, 1, 10_000),
  ];
  let massExpression = "alignment_point_count × adjustment_consumable_item_per_point × adjustment_consumable_mass_kg_item + reference_line_length_m × reference_line_consumable_mass_kg_m + defective_minor_fastener_count × defective_minor_fastener_mass_kg_item";
  let massInputs = ["alignment_point_count", "adjustment_consumable_item_per_point", "adjustment_consumable_mass_kg_item", "reference_line_length_m", "reference_line_consumable_mass_kg_m", "defective_minor_fastener_count", "defective_minor_fastener_mass_kg_item"];
  let massCalculate = (v: Readonly<Record<string, number>>) =>
    v.alignment_point_count * v.adjustment_consumable_item_per_point * v.adjustment_consumable_mass_kg_item +
    v.reference_line_length_m * v.reference_line_consumable_mass_kg_m +
    v.defective_minor_fastener_count * v.defective_minor_fastener_mass_kg_item;
  const rows: RowSpec[] = [
    row(t, "reference_plane_survey", "Геодезическая проверка", "labor", "Съемка опорной плоскости принятого каркаса", "reference_grid_point_count ÷ survey_productivity_point_per_man_hour", ["reference_grid_point_count", "survey_productivity_point_per_man_hour"], "man_hour", (v) => v.reference_grid_point_count / v.survey_productivity_point_per_man_hour, { krer_locator: "КРЕР 10-05-011-02, состав работ п. 1; ALIGN выделен по проектному журналу", sp_locator: "СП КР 65-101:2025, п. 7.7.1" }),
    row(t, "reference_line_consumables", "Опорная плоскость", "material", "Разметочные расходники опорной плоскости", "reference_line_length_m", ["reference_line_length_m"], "m", (v) => v.reference_line_length_m, { krer_locator: "КРЕР 10-05-011-02, состав работ п. 1; расход по проектной карте ALIGN" }),
    row(t, "adjustment_consumables", "Регулировка", "material", "Регулировочные расходники существующих узлов без повторного каркаса", "alignment_point_count × adjustment_consumable_item_per_point", ["alignment_point_count", "adjustment_consumable_item_per_point"], "item", (v) => v.alignment_point_count * v.adjustment_consumable_item_per_point, { krer_locator: "КРЕР 10-05-011-02, состав работ пп. 4–6; только регулировочные расходники, профили исключены" }),
    row(t, "defective_minor_fasteners", "Локальная коррекция", "material", "Только доказанно дефектный мелкий крепеж для локальной замены", "defective_minor_fastener_count", ["defective_minor_fastener_count"], "item", (v) => v.defective_minor_fastener_count, { krer_locator: "КРЕР 10-05-011-01/02; полный FRAME исключен, disposition каждого дефекта подтверждается журналом" }),
    row(t, "alignment_labor", "Регулировка", "labor", "Регулировка существующих узлов каркаса по опорной плоскости", "alignment_point_count ÷ adjustment_productivity_point_per_man_hour", ["alignment_point_count", "adjustment_productivity_point_per_man_hour"], "man_hour", (v) => v.alignment_point_count / v.adjustment_productivity_point_per_man_hour, { krer_locator: "КРЕР 10-05-011-02, состав работ пп. 4–6; трудовой расход по проверенной разбивке", sp_locator: "СП КР 65-101:2025, п. 7.7.1" }),
    row(t, "laser_alignment_equipment", "Инструментальный контроль", "equipment", "Лазерный нивелир для ALIGN", "reference_grid_point_count ÷ laser_productivity_point_per_machine_hour", ["reference_grid_point_count", "laser_productivity_point_per_machine_hour"], "machine_hour", (v) => v.reference_grid_point_count / v.laser_productivity_point_per_machine_hour, { krer_locator: "КРЕР 10-05-011-02, ресурсная ведомость; приборный маршрут подтверждается ППР", sp_locator: "СП КР 65-101:2025, п. 7.7.1 и таблица 7.8" }),
    row(t, "alignment_distance_meter_equipment", "Инструментальный контроль", "equipment", "Дальномер и измерительный комплект диагоналей, торцов и переходов", "diagonal_verticality_point_count ÷ distance_meter_productivity_point_per_machine_hour", ["diagonal_verticality_point_count", "distance_meter_productivity_point_per_machine_hour"], "machine_hour", (v) => v.diagonal_verticality_point_count / v.distance_meter_productivity_point_per_machine_hour, { krer_locator: "КРЕР 10-05-011-01/02; инструментальная съемка по отдельному ALIGN scope" }),
    row(t, "alignment_screwdriver_equipment", "Локальная коррекция", "equipment", "Шуруповерт для локальной подтяжки и замены крепежа", "local_correction_point_count ÷ alignment_screwdriver_productivity_point_per_machine_hour", ["local_correction_point_count", "alignment_screwdriver_productivity_point_per_machine_hour"], "machine_hour", (v) => v.local_correction_point_count / v.alignment_screwdriver_productivity_point_per_machine_hour, { krer_locator: "КРЕР 10-05-011-01/02, шуруповерт; только отдельная коррекция после принятого FRAME" }),
    row(t, "alignment_torque_equipment", "Инструментальный контроль", "equipment", "Динамометрический инструмент проверки соединителей и крепежа", "alignment_point_count ÷ alignment_torque_productivity_point_per_machine_hour", ["alignment_point_count", "alignment_torque_productivity_point_per_machine_hour"], "machine_hour", (v) => v.alignment_point_count / v.alignment_torque_productivity_point_per_machine_hour, { krer_locator: "КРЕР 10-05-011-01/02; контроль по отдельному плану качества ALIGN" }),
    row(t, "local_correction_labor", "Локальная коррекция", "labor", "Локальная коррекция узлов без замены профилей", "local_correction_point_count ÷ local_correction_productivity_point_per_man_hour", ["local_correction_point_count", "local_correction_productivity_point_per_man_hour"], "man_hour", (v) => v.local_correction_point_count / v.local_correction_productivity_point_per_man_hour, { krer_locator: "КРЕР 10-05-011-02, состав работ пп. 4–6; повторная стоимость каркаса запрещена" }),
    row(t, "plane_acceptance_tests", "Контроль качества", "testing", "Измерительная приемка плоскости ALIGN", `ceil((${CLADDING_GEOMETRY_EXPRESSION}) ÷ plane_qa_interval_m2_per_test)`, [...CLADDING_GEOMETRY_INPUTS, "plane_qa_interval_m2_per_test"], "test", (v) => Math.ceil(calculateCladdingGeometryArea(v) / v.plane_qa_interval_m2_per_test), { sp_locator: "СП КР 65-101:2025, пп. 7.7.4–7.7.5 и таблица 7.8" }),
    row(t, "alignment_executive_survey", "Инженерные услуги", "subcontract_service", "Независимая исполнительная геодезическая/лазерная съемка ALIGN", "executive_survey_service_count", ["executive_survey_service_count"], "service", (v) => v.executive_survey_service_count, { scopes: "FULL_ONLY", procurement_eligible: false, krer_locator: "КРЕР 10-05-011-01/02; внешняя услуга допускается только если не включена в труд ALIGN" }),
  ];
  if (variant === "large_area") {
    parameters.push(
      numeric("large_area_instrument_zone_count", "Количество инструментальных зон большой площади", "item", "PROJECT_QUANTITY", BOTH_SCOPES, 1, 100_000),
      numeric("large_area_instrument_setup_productivity_zone_per_machine_hour", "Производительность перестановки прибора", "item_per_machine_hour", "NORM_RATE"),
    );
    rows.push(row(t, "large_area_instrument_relocation", "Большая площадь", "equipment", "Перестановка и повторная привязка нивелира по зонам", "large_area_instrument_zone_count ÷ large_area_instrument_setup_productivity_zone_per_machine_hour", ["large_area_instrument_zone_count", "large_area_instrument_setup_productivity_zone_per_machine_hour"], "machine_hour", (v) => v.large_area_instrument_zone_count / v.large_area_instrument_setup_productivity_zone_per_machine_hour, { sp_locator: "СП КР 65-101:2025, таблица 7.8; контроль отдельных участков 50–70 м²" }));
  } else if (variant === "small_area") {
    parameters.push(
      numeric("small_area_corner_count", "Количество внутренних и наружных углов", "item", "PROJECT_QUANTITY", BOTH_SCOPES, 1, 100_000),
      numeric("small_area_corner_alignment_productivity_item_per_man_hour", "Производительность юстировки углов", "item_per_man_hour", "NORM_RATE"),
    );
    rows.push(row(t, "small_area_corner_alignment", "Малая площадь", "labor", "Юстировка коротких граней и углов короба", "small_area_corner_count ÷ small_area_corner_alignment_productivity_item_per_man_hour", ["small_area_corner_count", "small_area_corner_alignment_productivity_item_per_man_hour"], "man_hour", (v) => v.small_area_corner_count / v.small_area_corner_alignment_productivity_item_per_man_hour));
  } else if (variant === "technical_room") {
    parameters.push(
      numeric("technical_obstruction_count", "Количество инженерных препятствий", "item", "PROJECT_QUANTITY", BOTH_SCOPES, 1, 100_000),
      numeric("technical_clearance_productivity_item_per_man_hour", "Производительность проверки зазоров", "item_per_man_hour", "NORM_RATE"),
    );
    rows.push(row(t, "technical_clearance_alignment", "Техническое помещение", "labor", "Проверка и юстировка зазоров у инженерных вводов", "technical_obstruction_count ÷ technical_clearance_productivity_item_per_man_hour", ["technical_obstruction_count", "technical_clearance_productivity_item_per_man_hour"], "man_hour", (v) => v.technical_obstruction_count / v.technical_clearance_productivity_item_per_man_hour, { sp_locator: "СП КР 65-101:2025, п. 7.7.1; проектные зазоры инженерных вводов" }));
  } else if (variant === "wet_zone") {
    parameters.push(
      numeric("wet_zone_adjustment_point_count", "Количество защищенных регулировочных узлов", "item", "PROJECT_QUANTITY", BOTH_SCOPES, 1, 1_000_000),
      numeric("wet_zone_adjustment_consumable_mass_kg_item", "Масса защищенного регулировочного расходника", "kg_per_item", "MATERIAL_PASSPORT_VALUE"),
      numeric("wet_zone_alignment_test_interval_m2", "Интервал контроля влажной зоны ALIGN", "m2_per_test", "CONTROL_PLAN_VALUE"),
    );
    rows.push(
      row(t, "wet_zone_adjustment_consumables", "Влажная зона", "material", "Коррозионностойкие регулировочные расходники ALIGN", "wet_zone_adjustment_point_count", ["wet_zone_adjustment_point_count"], "item", (v) => v.wet_zone_adjustment_point_count),
      row(t, "wet_zone_alignment_tests", "Влажная зона", "testing", "Контроль защищенных узлов и плоскости влажной зоны", "ceil(area_m2 ÷ wet_zone_alignment_test_interval_m2)", ["area_m2", "wet_zone_alignment_test_interval_m2"], "test", (v) => Math.ceil(v.area_m2 / v.wet_zone_alignment_test_interval_m2), { sp_locator: "СП КР 65-101:2025, пп. 4.4–4.9 и таблица 7.8; паспорт влажностойкой системы" }),
    );
    massExpression += " + wet_zone_adjustment_point_count × wet_zone_adjustment_consumable_mass_kg_item";
    massInputs = [...massInputs, "wet_zone_adjustment_point_count", "wet_zone_adjustment_consumable_mass_kg_item"];
    const previous = massCalculate;
    massCalculate = (v) => previous(v) + v.wet_zone_adjustment_point_count * v.wet_zone_adjustment_consumable_mass_kg_item;
  }
  massInputs = [...new Set(massInputs)];
  rows.push(
    ...professionalCompletionRows({
      technologyId: t,
      group: "ALIGN",
      massExpression,
      massInputs,
      calculateMassKg: massCalculate,
      wasteExpression: `(${massExpression}) × waste_percent ÷ 100`,
      wasteInputs: [...massInputs, "waste_percent"],
      calculateWasteKg: (v) => massCalculate(v) * v.waste_percent / 100,
      workAreaExpression: CLADDING_GEOMETRY_EXPRESSION,
      workAreaInputs: CLADDING_GEOMETRY_INPUTS,
      calculateWorkAreaM2: calculateCladdingGeometryArea,
    }),
    row(t, "align_documentation", "Исполнительная документация", "documentation", "Записи журнала регулировки и контроля ALIGN", "documentation_record_count", ["documentation_record_count"], "document", (v) => v.documentation_record_count, { scopes: "FULL_ONLY", sp_locator: "СП КР 65-101:2025, пп. 4.7–4.9" }),
  );
  return { parameters, rows };
}

function cladDefinition(
  inventory: InteriorFinishesDomainInventoryRow,
  variant: DrywallCeilingBulkheadProfessionalVariantV3,
): { parameters: ParameterSpec[]; rows: RowSpec[] } {
  const t = inventory.canonical_technology_id;
  const parameters = [
    ...commonParameters(inventory.scope_capability, "CLAD"),
    ...professionalCompletionParameters(),
    numeric("board_cutting_waste_percent", "Проектный процент отходов раскроя листов", "percent", "PROJECT_QUANTITY", BOTH_SCOPES, 0.01, 50),
    numeric("fastener_rate_item_m2_layer", "Расход самонарезающих винтов на м² одного слоя", "item_per_m2_layer", "MATERIAL_PASSPORT_VALUE"),
    numeric("board_mass_kg_m2", "Масса выбранного листа по паспорту", "kg_per_m2", "MATERIAL_PASSPORT_VALUE"),
    numeric("fastener_mass_kg_item", "Масса одного винта по паспорту", "kg_per_item", "MATERIAL_PASSPORT_VALUE"),
    numeric("sheet_cutting_productivity_m2_per_man_hour", "Производительность раскроя выбранного листа", "m2_per_man_hour", "NORM_RATE"),
    numeric("sheet_fixing_productivity_m2_per_man_hour", "Производительность крепления листов", "m2_per_man_hour", "NORM_RATE"),
    numeric("sheet_layout_line_length_m", "Длина линий карты раскладки листов", "m", "PROJECT_QUANTITY"),
    numeric("sheet_layout_productivity_m_per_man_hour", "Производительность переноса карты раскладки", "m_per_man_hour", "NORM_RATE"),
    numeric("cut_edge_length_m", "Длина открытых резаных кромок листов", "m", "PROJECT_QUANTITY"),
    numeric("cut_edge_primer_kg_m", "Расход совместимого состава обработки резаной кромки", "kg_per_m", "MATERIAL_PASSPORT_VALUE"),
    numeric("cut_edge_treatment_productivity_m_per_man_hour", "Производительность обработки резаных кромок", "m_per_man_hour", "NORM_RATE"),
    numeric("sheet_joint_length_m", "Фактическая длина стыков по раскладке листов", "m", "PROJECT_QUANTITY"),
    numeric("joint_tape_run_count", "Число ниток армирующей ленты на стыках", "item", "PROJECT_QUANTITY", BOTH_SCOPES, 1, 12),
    numeric("joint_tape_mass_kg_m", "Масса армирующей ленты стыков", "kg_per_m", "MATERIAL_PASSPORT_VALUE"),
    numeric("joint_compound_rate_kg_m", "Расход шпаклевки для швов на метр стыка", "kg_per_m", "MATERIAL_PASSPORT_VALUE"),
    numeric("fastener_recess_compound_kg_m2", "Расход шпаклевки углублений крепежа", "kg_per_m2", "MATERIAL_PASSPORT_VALUE"),
    numeric("finish_putty_rate_kg_m2", "Расход финишной шпаклевки для уровня Q2/Q3/Q4", "kg_per_m2", "MATERIAL_PASSPORT_VALUE"),
    numeric("surface_primer_rate_l_m2", "Расход грунтовки готовой поверхности", "l_per_m2", "MATERIAL_PASSPORT_VALUE"),
    numeric("surface_primer_density_kg_l", "Плотность грунтовки по паспорту", "kg_per_l", "MATERIAL_PASSPORT_VALUE"),
    numeric("external_corner_profile_mass_kg_m", "Масса углозащитного профиля наружных углов", "kg_per_m", "MATERIAL_PASSPORT_VALUE"),
    numeric("internal_corner_tape_mass_kg_m", "Масса гибкой армирующей ленты внутренних углов", "kg_per_m", "MATERIAL_PASSPORT_VALUE"),
    numeric("edge_profile_length_m", "Длина торцевого/окантовочного профиля", "m", "PROJECT_QUANTITY", BOTH_SCOPES, 0, 1_000_000),
    numeric("edge_profile_mass_kg_m", "Масса торцевого/окантовочного профиля", "kg_per_m", "MATERIAL_PASSPORT_VALUE"),
    numeric("shadow_joint_profile_length_m", "Длина проектного профиля теневого шва", "m", "PROJECT_QUANTITY", BOTH_SCOPES, 0, 1_000_000),
    numeric("shadow_joint_profile_mass_kg_m", "Масса профиля теневого шва", "kg_per_m", "MATERIAL_PASSPORT_VALUE"),
    numeric("acoustic_sealant_rate_kg_m", "Расход эластичного/акустического герметика примыканий", "kg_per_m", "MATERIAL_PASSPORT_VALUE"),
    numeric("acoustic_tape_length_m", "Длина проектной уплотнительной/акустической ленты CLAD", "m", "PROJECT_QUANTITY", BOTH_SCOPES, 0, 1_000_000),
    numeric("acoustic_tape_mass_kg_m", "Масса акустической ленты CLAD", "kg_per_m", "MATERIAL_PASSPORT_VALUE"),
    numeric("insulation_area_m2", "Площадь проектной акустической/огнезащитной изоляции", "m2", "PROJECT_QUANTITY", BOTH_SCOPES, 0, 10_000_000),
    numeric("insulation_mass_kg_m2", "Масса изоляции на м² по паспорту", "kg_per_m2", "MATERIAL_PASSPORT_VALUE"),
    numeric("protective_membrane_area_m2", "Площадь проектной пароизоляционной/защитной мембраны", "m2", "PROJECT_QUANTITY", BOTH_SCOPES, 0, 10_000_000),
    numeric("protective_membrane_mass_kg_m2", "Масса мембраны на м² по паспорту", "kg_per_m2", "MATERIAL_PASSPORT_VALUE"),
    numeric("joint_treatment_productivity_m_per_man_hour", "Производительность заполнения и армирования стыков", "m_per_man_hour", "NORM_RATE"),
    numeric("corner_install_productivity_m_per_man_hour", "Производительность армирования углов", "m_per_man_hour", "NORM_RATE"),
    numeric("surface_putty_productivity_m2_per_man_hour", "Производительность подготовки поверхности Q2/Q3/Q4", "m2_per_man_hour", "NORM_RATE"),
    numeric("surface_sanding_productivity_m2_per_man_hour", "Производительность шлифования поверхности", "m2_per_man_hour", "NORM_RATE"),
    numeric("surface_priming_productivity_m2_per_man_hour", "Производительность грунтования поверхности", "m2_per_man_hour", "NORM_RATE"),
    numeric("compound_mixer_productivity_kg_per_machine_hour", "Производительность миксера шпаклевочных составов", "kg_per_machine_hour", "NORM_RATE"),
    numeric("surface_sander_productivity_m2_per_machine_hour", "Производительность шлифовальной машины", "m2_per_machine_hour", "NORM_RATE"),
    numeric("industrial_vacuum_productivity_m2_per_machine_hour", "Производительность промышленного пылесоса", "m2_per_machine_hour", "NORM_RATE"),
    numeric("screw_control_interval_m2_per_test", "Площадь на проверку шага и заглубления шурупов", "m2_per_test", "CONTROL_PLAN_VALUE"),
    numeric("surface_quality_interval_m2_per_test", "Площадь на проверку уровня поверхности Q1–Q4", "m2_per_test", "CONTROL_PLAN_VALUE"),
    numeric("mockup_acceptance_service_count", "Количество образцов сложного узла и их приемок", "service", "CONTROL_PLAN_VALUE", FULL_SCOPE, 0, 100_000),
    numeric("board_cutter_productivity_m2_per_machine_hour", "Производительность оборудования раскроя листов", "m2_per_machine_hour", "NORM_RATE"),
    numeric("dust_extractor_productivity_m2_per_machine_hour", "Производительность локального пылеудаления при раскрое", "m2_per_machine_hour", "NORM_RATE"),
    numeric("screwdriver_productivity_m2_per_machine_hour", "Производительность шуруповерта", "m2_per_machine_hour", "NORM_RATE"),
    numeric("cladding_qa_interval_m2_per_test", "Площадь на одну приемочную проверку CLAD", "m2_per_test", "CONTROL_PLAN_VALUE"),
    numeric("delivery_distance_km", "Расстояние доставки листов и винтов", "km", "LOGISTICS_VALUE", FULL_SCOPE, 0.1, 5_000),
    numeric("sheet_lift_productivity_kg_per_machine_hour", "Производительность листового подъемника", "kg_per_machine_hour", "NORM_RATE", FULL_SCOPE),
    numeric("documentation_record_count", "Количество актов и записей CLAD", "item", "CONTROL_PLAN_VALUE", FULL_SCOPE, 1, 10_000),
  ];
  const netBoardExpression = `(${CLADDING_GEOMETRY_EXPRESSION}) × board_layer_count`;
  const grossBoardExpression = `(${netBoardExpression}) × (1 + board_cutting_waste_percent ÷ 100)`;
  const screwExpression = `ceil((${CLADDING_GEOMETRY_EXPRESSION}) × board_layer_count × fastener_rate_item_m2_layer)`;
  const finishMaterialMassExpression = `sheet_joint_length_m × joint_tape_run_count × joint_tape_mass_kg_m + sheet_joint_length_m × joint_compound_rate_kg_m + (${CLADDING_GEOMETRY_EXPRESSION}) × fastener_recess_compound_kg_m2 + (${CLADDING_GEOMETRY_EXPRESSION}) × finish_putty_rate_kg_m2 + (${CLADDING_GEOMETRY_EXPRESSION}) × surface_primer_rate_l_m2 × surface_primer_density_kg_l + external_corner_length_m × external_corner_profile_mass_kg_m + internal_corner_length_m × internal_corner_tape_mass_kg_m + edge_profile_length_m × edge_profile_mass_kg_m + shadow_joint_profile_length_m × shadow_joint_profile_mass_kg_m + perimeter_length_m × acoustic_sealant_rate_kg_m + acoustic_tape_length_m × acoustic_tape_mass_kg_m + insulation_area_m2 × insulation_mass_kg_m2 + protective_membrane_area_m2 × protective_membrane_mass_kg_m2`;
  const finishMaterialMassInputs = ["sheet_joint_length_m", "joint_tape_run_count", "joint_tape_mass_kg_m", "joint_compound_rate_kg_m", ...CLADDING_GEOMETRY_INPUTS, "fastener_recess_compound_kg_m2", "finish_putty_rate_kg_m2", "surface_primer_rate_l_m2", "surface_primer_density_kg_l", "external_corner_length_m", "external_corner_profile_mass_kg_m", "internal_corner_length_m", "internal_corner_tape_mass_kg_m", "edge_profile_length_m", "edge_profile_mass_kg_m", "shadow_joint_profile_length_m", "shadow_joint_profile_mass_kg_m", "perimeter_length_m", "acoustic_sealant_rate_kg_m", "acoustic_tape_length_m", "acoustic_tape_mass_kg_m", "insulation_area_m2", "insulation_mass_kg_m2", "protective_membrane_area_m2", "protective_membrane_mass_kg_m2"];
  const calculateFinishMaterialMass = (v: Readonly<Record<string, number>>) =>
    v.sheet_joint_length_m * v.joint_tape_run_count * v.joint_tape_mass_kg_m +
    v.sheet_joint_length_m * v.joint_compound_rate_kg_m +
    calculateCladdingGeometryArea(v) * v.fastener_recess_compound_kg_m2 +
    calculateCladdingGeometryArea(v) * v.finish_putty_rate_kg_m2 +
    calculateCladdingGeometryArea(v) * v.surface_primer_rate_l_m2 * v.surface_primer_density_kg_l +
    v.external_corner_length_m * v.external_corner_profile_mass_kg_m +
    v.internal_corner_length_m * v.internal_corner_tape_mass_kg_m +
    v.edge_profile_length_m * v.edge_profile_mass_kg_m +
    v.shadow_joint_profile_length_m * v.shadow_joint_profile_mass_kg_m +
    v.perimeter_length_m * v.acoustic_sealant_rate_kg_m +
    v.acoustic_tape_length_m * v.acoustic_tape_mass_kg_m +
    v.insulation_area_m2 * v.insulation_mass_kg_m2 +
    v.protective_membrane_area_m2 * v.protective_membrane_mass_kg_m2;
  const baseMassExpression = `(${grossBoardExpression}) × board_mass_kg_m2 + (${screwExpression}) × fastener_mass_kg_item + cut_edge_length_m × cut_edge_primer_kg_m + ${finishMaterialMassExpression}`;
  const baseMassInputs = [...new Set([...CLADDING_GEOMETRY_INPUTS, "board_layer_count", "board_cutting_waste_percent", "board_mass_kg_m2", "fastener_rate_item_m2_layer", "fastener_mass_kg_item", "cut_edge_length_m", "cut_edge_primer_kg_m", ...finishMaterialMassInputs])];
  const grossBoard = (v: Readonly<Record<string, number>>) => calculateCladdingGeometryArea(v) * v.board_layer_count * (1 + v.board_cutting_waste_percent / 100);
  const screwCount = (v: Readonly<Record<string, number>>) => Math.ceil(calculateCladdingGeometryArea(v) * v.board_layer_count * v.fastener_rate_item_m2_layer);
  const baseMass = (v: Readonly<Record<string, number>>) => grossBoard(v) * v.board_mass_kg_m2 + screwCount(v) * v.fastener_mass_kg_item + v.cut_edge_length_m * v.cut_edge_primer_kg_m + calculateFinishMaterialMass(v);
  let massExpression = baseMassExpression;
  let massInputs = [...baseMassInputs];
  let massCalculate = baseMass;
  const rows: RowSpec[] = [
    row(t, "gypsum_board_sheets", "Листовая обшивка", "material", `Листы ${inventory.localized_name_ru}`, grossBoardExpression, [...CLADDING_GEOMETRY_INPUTS, "board_layer_count", "board_cutting_waste_percent"], "m2", grossBoard, { krer_locator: "КРЕР 10-05-011-02, состав работ п. 8; ресурс С01-4402-0002" }),
    row(t, "sheet_screws", "Крепеж листов", "material", "Самонарезающие винты крепления листов", screwExpression, [...CLADDING_GEOMETRY_INPUTS, "board_layer_count", "fastener_rate_item_m2_layer"], "item", screwCount, { krer_locator: "КРЕР 10-05-011-02, состав работ п. 8; ресурс С01-0505-0005" }),
    row(t, "cut_edge_primer", "Подготовка кромок", "material", "Совместимый состав обработки резаных кромок листов", "cut_edge_length_m × cut_edge_primer_kg_m", ["cut_edge_length_m", "cut_edge_primer_kg_m"], "kg", (v) => v.cut_edge_length_m * v.cut_edge_primer_kg_m, { krer_locator: "КРЕР 10-05-011-02, состав работ п. 8; расход по паспорту выбранной листовой системы" }),
    row(t, "joint_reinforcement_tape", "Стыки", "material", "Армирующая бумажная/стекловолоконная лента стыков", "sheet_joint_length_m × joint_tape_run_count", ["sheet_joint_length_m", "joint_tape_run_count"], "m", (v) => v.sheet_joint_length_m * v.joint_tape_run_count, { krer_locator: "КРЕР 10-05-011-01/02, армирующая лента; фактическая длина по раскладке листов" }),
    row(t, "joint_compound", "Стыки", "material", "Совместимая шпаклевка заполнения стыков и углублений крепежа", "sheet_joint_length_m × joint_compound_rate_kg_m", ["sheet_joint_length_m", "joint_compound_rate_kg_m"], "kg", (v) => v.sheet_joint_length_m * v.joint_compound_rate_kg_m, { krer_locator: "КРЕР 10-05-011-01/02, шпаклевочная смесь для заделки швов" }),
    row(t, "fastener_recess_compound", "Стыки", "material", "Шпаклевка углублений от крепежа", `(${CLADDING_GEOMETRY_EXPRESSION}) × fastener_recess_compound_kg_m2`, [...CLADDING_GEOMETRY_INPUTS, "fastener_recess_compound_kg_m2"], "kg", (v) => calculateCladdingGeometryArea(v) * v.fastener_recess_compound_kg_m2, { krer_locator: "КРЕР 10-05-011-01/02, шпаклевочная смесь; расход по паспорту и уровню поверхности" }),
    row(t, "finish_putty", "Подготовка поверхности", "material", "Финишная шпаклевка уровня Q2/Q3/Q4", `(${CLADDING_GEOMETRY_EXPRESSION}) × finish_putty_rate_kg_m2`, [...CLADDING_GEOMETRY_INPUTS, "finish_putty_rate_kg_m2"], "kg", (v) => calculateCladdingGeometryArea(v) * v.finish_putty_rate_kg_m2, { krer_locator: "КРЕР 10-05-011-01/02 используется как ресурсный benchmark; уровень Q по проекту" }),
    row(t, "surface_primer", "Подготовка поверхности", "material", "Грунтовка подготовленной поверхности", `(${CLADDING_GEOMETRY_EXPRESSION}) × surface_primer_rate_l_m2`, [...CLADDING_GEOMETRY_INPUTS, "surface_primer_rate_l_m2"], "l", (v) => calculateCladdingGeometryArea(v) * v.surface_primer_rate_l_m2, { krer_locator: "КРЕР 10-05-011-01/02, грунтовка; расход по паспорту выбранной системы" }),
    row(t, "external_corner_profile", "Углы", "material", "Углозащитный профиль наружных углов", "external_corner_length_m", ["external_corner_length_m"], "m", (v) => v.external_corner_length_m, { krer_locator: "КРЕР 10-05-011-01/02; количество по фактической геометрии наружных углов" }),
    row(t, "internal_corner_tape", "Углы", "material", "Гибкая армирующая лента внутренних углов", "internal_corner_length_m", ["internal_corner_length_m"], "m", (v) => v.internal_corner_length_m, { krer_locator: "КРЕР 10-05-011-01/02; количество по фактической геометрии внутренних углов" }),
    row(t, "edge_profile", "Торцы", "material", "Торцевой/окантовочный профиль листовой обшивки", "edge_profile_length_m", ["edge_profile_length_m"], "m", (v) => v.edge_profile_length_m, { krer_locator: "КРЕР 10-05-011-01/02; проектная длина открытых торцов" }),
    row(t, "shadow_joint_profile", "Примыкания", "material", "Профиль проектного теневого шва", "shadow_joint_profile_length_m", ["shadow_joint_profile_length_m"], "m", (v) => v.shadow_joint_profile_length_m, { krer_locator: "КРЕР 10-05-011 применяется как benchmark; включение только по проектному узлу теневого шва" }),
    row(t, "acoustic_joint_sealant", "Примыкания", "material", "Эластичный акустический герметик примыканий", "perimeter_length_m × acoustic_sealant_rate_kg_m", ["perimeter_length_m", "acoustic_sealant_rate_kg_m"], "kg", (v) => v.perimeter_length_m * v.acoustic_sealant_rate_kg_m, { krer_locator: "КРЕР 10-05-011 применяется как benchmark; назначение по проектному акустическому классу" }),
    row(t, "acoustic_tape", "Примыкания", "material", "Уплотнительная/акустическая лента CLAD по проектному узлу", "acoustic_tape_length_m", ["acoustic_tape_length_m"], "m", (v) => v.acoustic_tape_length_m, { krer_locator: "КРЕР 10-05-011 применяется как benchmark; включение и длина по проектному акустическому узлу" }),
    row(t, "acoustic_fire_insulation", "Изоляция", "material", "Проектная акустическая/огнезащитная минераловатная изоляция", "insulation_area_m2", ["insulation_area_m2"], "m2", (v) => v.insulation_area_m2, { krer_locator: "КРЕР 10-05-011 применяется как benchmark; exact ресурс и площадь по проекту" }),
    row(t, "protective_membrane", "Изоляция", "material", "Проектная пароизоляционная/защитная мембрана", "protective_membrane_area_m2", ["protective_membrane_area_m2"], "m2", (v) => v.protective_membrane_area_m2, { krer_locator: "КРЕР 10-05-011 применяется как benchmark; необходимость конструкции подтверждается проектным расчетом" }),
    row(t, "sheet_layout_labor", "Разметка листов", "labor", "Перенос проектной карты раскладки и разбежки листов", "sheet_layout_line_length_m ÷ sheet_layout_productivity_m_per_man_hour", ["sheet_layout_line_length_m", "sheet_layout_productivity_m_per_man_hour"], "man_hour", (v) => v.sheet_layout_line_length_m / v.sheet_layout_productivity_m_per_man_hour, { krer_locator: "КРЕР 10-05-011-02, состав работ п. 8; карта раскладки по проекту", sp_locator: "СП КР 65-101:2025, пп. 7.7.1–7.7.2" }),
    row(t, "sheet_cutting_labor", "Труд", "labor", "Раскрой листов по карте раскроя", `(${grossBoardExpression}) ÷ sheet_cutting_productivity_m2_per_man_hour`, [...CLADDING_GEOMETRY_INPUTS, "board_layer_count", "board_cutting_waste_percent", "sheet_cutting_productivity_m2_per_man_hour"], "man_hour", (v) => grossBoard(v) / v.sheet_cutting_productivity_m2_per_man_hour, { krer_locator: "КРЕР 10-05-011-02, состав работ п. 8; строка 1 «Затраты труда рабочих»", sp_locator: "СП КР 65-101:2025, п. 7.7.2" }),
    row(t, "cut_edge_treatment_labor", "Подготовка кромок", "labor", "Обработка резаных кромок до крепления листов", "cut_edge_length_m ÷ cut_edge_treatment_productivity_m_per_man_hour", ["cut_edge_length_m", "cut_edge_treatment_productivity_m_per_man_hour"], "man_hour", (v) => v.cut_edge_length_m / v.cut_edge_treatment_productivity_m_per_man_hour, { krer_locator: "КРЕР 10-05-011-02, состав работ п. 8; технология по паспорту выбранной системы" }),
    row(t, "sheet_fixing_labor", "Труд", "labor", "Крепление листов к принятому каркасу", `(${netBoardExpression}) ÷ sheet_fixing_productivity_m2_per_man_hour`, [...CLADDING_GEOMETRY_INPUTS, "board_layer_count", "sheet_fixing_productivity_m2_per_man_hour"], "man_hour", (v) => (calculateCladdingGeometryArea(v) * v.board_layer_count) / v.sheet_fixing_productivity_m2_per_man_hour, { krer_locator: "КРЕР 10-05-011-02, состав работ п. 8; строка 1 «Затраты труда рабочих»", sp_locator: "СП КР 65-101:2025, пп. 7.7.1–7.7.2" }),
    row(t, "joint_treatment_labor", "Стыки", "labor", "Заполнение, армирование и выведение стыков листов", "sheet_joint_length_m ÷ joint_treatment_productivity_m_per_man_hour", ["sheet_joint_length_m", "joint_treatment_productivity_m_per_man_hour"], "man_hour", (v) => v.sheet_joint_length_m / v.joint_treatment_productivity_m_per_man_hour, { krer_locator: "КРЕР 10-05-011-01/02, шпаклевание и армирование стыков; труд выделен по операции" }),
    row(t, "corner_treatment_labor", "Углы", "labor", "Армирование и выведение внутренних и наружных углов", "(internal_corner_length_m + external_corner_length_m) ÷ corner_install_productivity_m_per_man_hour", ["internal_corner_length_m", "external_corner_length_m", "corner_install_productivity_m_per_man_hour"], "man_hour", (v) => (v.internal_corner_length_m + v.external_corner_length_m) / v.corner_install_productivity_m_per_man_hour, { krer_locator: "КРЕР 10-05-011-01/02; фактическая геометрия углов" }),
    row(t, "surface_putty_labor", "Подготовка поверхности", "labor", "Подготовка поверхности до проектного уровня Q2/Q3/Q4", `(${CLADDING_GEOMETRY_EXPRESSION}) ÷ surface_putty_productivity_m2_per_man_hour`, [...CLADDING_GEOMETRY_INPUTS, "surface_putty_productivity_m2_per_man_hour"], "man_hour", (v) => calculateCladdingGeometryArea(v) / v.surface_putty_productivity_m2_per_man_hour, { krer_locator: "КРЕР 10-05-011-01/02; уровень поверхности и расход труда по проекту" }),
    row(t, "surface_sanding_labor", "Подготовка поверхности", "labor", "Шлифование подготовленной поверхности с пылеудалением", `(${CLADDING_GEOMETRY_EXPRESSION}) ÷ surface_sanding_productivity_m2_per_man_hour`, [...CLADDING_GEOMETRY_INPUTS, "surface_sanding_productivity_m2_per_man_hour"], "man_hour", (v) => calculateCladdingGeometryArea(v) / v.surface_sanding_productivity_m2_per_man_hour, { krer_locator: "КРЕР 10-05-011-01/02; отдельная операция подготовки поверхности" }),
    row(t, "surface_priming_labor", "Подготовка поверхности", "labor", "Грунтование подготовленной поверхности", `(${CLADDING_GEOMETRY_EXPRESSION}) ÷ surface_priming_productivity_m2_per_man_hour`, [...CLADDING_GEOMETRY_INPUTS, "surface_priming_productivity_m2_per_man_hour"], "man_hour", (v) => calculateCladdingGeometryArea(v) / v.surface_priming_productivity_m2_per_man_hour, { krer_locator: "КРЕР 10-05-011-01/02; грунтование выделено по операции" }),
    row(t, "board_cutter_equipment", "Оборудование", "equipment", "Оборудование раскроя листов", `(${grossBoardExpression}) ÷ board_cutter_productivity_m2_per_machine_hour`, [...CLADDING_GEOMETRY_INPUTS, "board_layer_count", "board_cutting_waste_percent", "board_cutter_productivity_m2_per_machine_hour"], "machine_hour", (v) => grossBoard(v) / v.board_cutter_productivity_m2_per_machine_hour, { krer_locator: "КРЕР 10-05-011-02, машина Х33-0840; оборудование раскроя выделено отдельным ресурсом" }),
    row(t, "dust_extractor_equipment", "Оборудование", "equipment", "Оборудование локального пылеудаления при раскрое", `(${grossBoardExpression}) ÷ dust_extractor_productivity_m2_per_machine_hour`, [...CLADDING_GEOMETRY_INPUTS, "board_layer_count", "board_cutting_waste_percent", "dust_extractor_productivity_m2_per_machine_hour"], "machine_hour", (v) => grossBoard(v) / v.dust_extractor_productivity_m2_per_machine_hour, { krer_locator: "КРЕР 10-05-011-02, состав работ п. 8; способ пылеудаления по ППР" }),
    row(t, "screwdriver_equipment", "Оборудование", "equipment", "Шуруповерт для крепления листов", `(${netBoardExpression}) ÷ screwdriver_productivity_m2_per_machine_hour`, [...CLADDING_GEOMETRY_INPUTS, "board_layer_count", "screwdriver_productivity_m2_per_machine_hour"], "machine_hour", (v) => (calculateCladdingGeometryArea(v) * v.board_layer_count) / v.screwdriver_productivity_m2_per_machine_hour, { krer_locator: "КРЕР 10-05-011-02, машина Х33-0840" }),
    row(t, "compound_mixer_equipment", "Оборудование", "equipment", "Миксер шпаклевочных и отделочных составов", `(sheet_joint_length_m × joint_compound_rate_kg_m + (${CLADDING_GEOMETRY_EXPRESSION}) × fastener_recess_compound_kg_m2 + (${CLADDING_GEOMETRY_EXPRESSION}) × finish_putty_rate_kg_m2) ÷ compound_mixer_productivity_kg_per_machine_hour`, ["sheet_joint_length_m", "joint_compound_rate_kg_m", ...CLADDING_GEOMETRY_INPUTS, "fastener_recess_compound_kg_m2", "finish_putty_rate_kg_m2", "compound_mixer_productivity_kg_per_machine_hour"], "machine_hour", (v) => (v.sheet_joint_length_m * v.joint_compound_rate_kg_m + calculateCladdingGeometryArea(v) * v.fastener_recess_compound_kg_m2 + calculateCladdingGeometryArea(v) * v.finish_putty_rate_kg_m2) / v.compound_mixer_productivity_kg_per_machine_hour, { krer_locator: "КРЕР 10-05-011-01/02; механизация приготовления составов по ППР" }),
    row(t, "surface_sander_equipment", "Оборудование", "equipment", "Шлифовальная машина подготовки поверхности", `(${CLADDING_GEOMETRY_EXPRESSION}) ÷ surface_sander_productivity_m2_per_machine_hour`, [...CLADDING_GEOMETRY_INPUTS, "surface_sander_productivity_m2_per_machine_hour"], "machine_hour", (v) => calculateCladdingGeometryArea(v) / v.surface_sander_productivity_m2_per_machine_hour, { krer_locator: "КРЕР 10-05-011-01/02; механизация по ППР" }),
    row(t, "industrial_vacuum_equipment", "Оборудование", "equipment", "Промышленный пылесос при раскрое и шлифовании", `(${CLADDING_GEOMETRY_EXPRESSION}) ÷ industrial_vacuum_productivity_m2_per_machine_hour`, [...CLADDING_GEOMETRY_INPUTS, "industrial_vacuum_productivity_m2_per_machine_hour"], "machine_hour", (v) => calculateCladdingGeometryArea(v) / v.industrial_vacuum_productivity_m2_per_machine_hour, { krer_locator: "КРЕР 10-05-011-01/02; пылеудаление по ППР и требованиям рабочей зоны" }),
    row(t, "cladding_acceptance_tests", "Контроль качества", "testing", "Приемка плоскости, жесткости и стыков листов", `ceil((${CLADDING_GEOMETRY_EXPRESSION}) ÷ cladding_qa_interval_m2_per_test)`, [...CLADDING_GEOMETRY_INPUTS, "cladding_qa_interval_m2_per_test"], "test", (v) => Math.ceil(calculateCladdingGeometryArea(v) / v.cladding_qa_interval_m2_per_test), { sp_locator: "СП КР 65-101:2025, пп. 7.7.4–7.7.5 и таблица 7.8" }),
    row(t, "screw_depth_tests", "Контроль качества", "testing", "Контроль шага, типа и заглубления шурупов", `ceil((${CLADDING_GEOMETRY_EXPRESSION}) ÷ screw_control_interval_m2_per_test)`, [...CLADDING_GEOMETRY_INPUTS, "screw_control_interval_m2_per_test"], "test", (v) => Math.ceil(calculateCladdingGeometryArea(v) / v.screw_control_interval_m2_per_test), { sp_locator: "СП КР 65-101:2025, пп. 7.7.1–7.7.5; паспорт выбранной системы" }),
    row(t, "surface_quality_tests", "Контроль качества", "testing", "Контроль качества стыков и проектного уровня поверхности Q1–Q4", `ceil((${CLADDING_GEOMETRY_EXPRESSION}) ÷ surface_quality_interval_m2_per_test)`, [...CLADDING_GEOMETRY_INPUTS, "surface_quality_interval_m2_per_test"], "test", (v) => Math.ceil(calculateCladdingGeometryArea(v) / v.surface_quality_interval_m2_per_test), { sp_locator: "СП КР 65-101:2025, пп. 4.4–4.9 и таблица 7.8; уровень поверхности по проекту" }),
    row(t, "complex_node_mockup", "Инженерные услуги", "subcontract_service", "Изготовление и приемка образца сложного узла CLAD", "mockup_acceptance_service_count", ["mockup_acceptance_service_count"], "service", (v) => v.mockup_acceptance_service_count, { scopes: "FULL_ONLY", procurement_eligible: false, krer_locator: "КРЕР 10-05-011 используется как benchmark; применимость mock-up по проектному плану качества" }),
  ];
  if (variant === "large_area") {
    parameters.push(
      numeric("large_area_staging_zone_count", "Количество зон подачи листов", "item", "PROJECT_QUANTITY", BOTH_SCOPES, 1, 100_000),
      numeric("large_area_staging_productivity_zone_per_machine_hour", "Производительность перестановки подъемника", "item_per_machine_hour", "NORM_RATE"),
      numeric("large_area_clad_control_joint_length_m", "Длина контрольных швов листовой обшивки", "m", "PROJECT_QUANTITY", BOTH_SCOPES, 0, 1_000_000),
      numeric("large_area_clad_control_joint_mass_kg_m", "Масса профиля контрольного шва CLAD", "kg_per_m", "MATERIAL_PASSPORT_VALUE"),
      numeric("large_area_layout_service_count", "Количество разработок карты захваток и раскладки листов", "service", "CONTROL_PLAN_VALUE", BOTH_SCOPES, 1, 100_000),
    );
    rows.push(
      row(t, "large_area_sheet_staging", "Большая площадь", "equipment", "Перестановка листового подъемника между зонами", "large_area_staging_zone_count ÷ large_area_staging_productivity_zone_per_machine_hour", ["large_area_staging_zone_count", "large_area_staging_productivity_zone_per_machine_hour"], "machine_hour", (v) => v.large_area_staging_zone_count / v.large_area_staging_productivity_zone_per_machine_hour),
      row(t, "large_area_clad_control_joint", "Большая площадь", "material", "Профиль контрольного шва листовой обшивки большой площади", "large_area_clad_control_joint_length_m", ["large_area_clad_control_joint_length_m"], "m", (v) => v.large_area_clad_control_joint_length_m, { krer_locator: "КРЕР 10-05-011-01/02; exact расположение по проекту и карте захваток" }),
      row(t, "large_area_layout_service", "Инженерные услуги", "subcontract_service", "Карта захваток, контрольных швов и раскладки листов большой площади", "large_area_layout_service_count", ["large_area_layout_service_count"], "service", (v) => v.large_area_layout_service_count, { procurement_eligible: false, krer_locator: "КРЕР 10-05-011-01/02 используется как benchmark; карта является проектным deliverable" }),
    );
    massExpression += " + large_area_clad_control_joint_length_m × large_area_clad_control_joint_mass_kg_m";
    massInputs.push("large_area_clad_control_joint_length_m", "large_area_clad_control_joint_mass_kg_m");
    const previous = massCalculate;
    massCalculate = (v) => previous(v) + v.large_area_clad_control_joint_length_m * v.large_area_clad_control_joint_mass_kg_m;
  } else if (variant === "small_area") {
    parameters.push(
      numeric("small_area_cut_edge_length_m", "Длина подрезаемых кромок малой площади", "m", "PROJECT_QUANTITY"),
      numeric("small_area_edge_cutting_productivity_m_per_man_hour", "Производительность ручной подрезки кромок", "m_per_man_hour", "NORM_RATE"),
      numeric("small_area_edge_fastener_spacing_m", "Шаг дополнительного крепежа подрезанных кромок", "m", "PROJECT_QUANTITY", BOTH_SCOPES, 0.01, 2),
    );
    rows.push(
      row(t, "small_area_edge_cutting", "Малая площадь", "labor", "Ручная подрезка коротких кромок и возвратов", "small_area_cut_edge_length_m ÷ small_area_edge_cutting_productivity_m_per_man_hour", ["small_area_cut_edge_length_m", "small_area_edge_cutting_productivity_m_per_man_hour"], "man_hour", (v) => v.small_area_cut_edge_length_m / v.small_area_edge_cutting_productivity_m_per_man_hour),
      row(t, "small_area_edge_screws", "Малая площадь", "material", "Дополнительные винты подрезанных кромок", "ceil(small_area_cut_edge_length_m ÷ small_area_edge_fastener_spacing_m)", ["small_area_cut_edge_length_m", "small_area_edge_fastener_spacing_m"], "item", (v) => Math.ceil(v.small_area_cut_edge_length_m / v.small_area_edge_fastener_spacing_m), { krer_locator: "КРЕР 10-05-011-02, ресурс С01-0505-0005; шаг по проектному узлу" }),
    );
    massExpression += " + ceil(small_area_cut_edge_length_m ÷ small_area_edge_fastener_spacing_m) × fastener_mass_kg_item";
    massInputs.push("small_area_cut_edge_length_m", "small_area_edge_fastener_spacing_m");
    const previous = massCalculate;
    massCalculate = (v) => previous(v) + Math.ceil(v.small_area_cut_edge_length_m / v.small_area_edge_fastener_spacing_m) * v.fastener_mass_kg_item;
  } else if (variant === "technical_room") {
    parameters.push(
      numeric("technical_service_opening_count", "Количество вырезов инженерных проходов", "item", "PROJECT_QUANTITY", BOTH_SCOPES, 1, 100_000),
      numeric("technical_opening_perimeter_m_item", "Периметр кромки одного прохода", "m_per_item", "PROJECT_QUANTITY"),
      numeric("technical_opening_cut_productivity_m_per_man_hour", "Производительность вырезов и обработки кромок", "m_per_man_hour", "NORM_RATE"),
      numeric("technical_opening_fastener_spacing_m", "Шаг крепежа кромок проходов", "m", "PROJECT_QUANTITY", BOTH_SCOPES, 0.01, 2),
      numeric("technical_fire_acoustic_sealant_kg_item", "Расход огнестойкой/акустической заделки одной проходки", "kg_per_item", "MATERIAL_PASSPORT_VALUE"),
      numeric("technical_penetration_sealing_productivity_item_per_man_hour", "Производительность заделки проходок", "item_per_man_hour", "NORM_RATE"),
      numeric("technical_mep_coordination_service_count", "Количество BIM/MEP координаций CLAD", "service", "CONTROL_PLAN_VALUE", BOTH_SCOPES, 1, 100_000),
      param("technical_revision_hatch_owner_reference", "Typed-child/owner ревизионных люков", "text", "P0", null, "DEPENDENCY_REFERENCE", BOTH_SCOPES),
    );
    rows.push(
      row(t, "technical_opening_cutting", "Инженерные проходы", "labor", "Вырезы листов у инженерных проходов", "technical_service_opening_count × technical_opening_perimeter_m_item ÷ technical_opening_cut_productivity_m_per_man_hour", ["technical_service_opening_count", "technical_opening_perimeter_m_item", "technical_opening_cut_productivity_m_per_man_hour"], "man_hour", (v) => (v.technical_service_opening_count * v.technical_opening_perimeter_m_item) / v.technical_opening_cut_productivity_m_per_man_hour),
      row(t, "technical_opening_screws", "Инженерные проходы", "material", "Дополнительные винты кромок инженерных проходов", "ceil(technical_service_opening_count × technical_opening_perimeter_m_item ÷ technical_opening_fastener_spacing_m)", ["technical_service_opening_count", "technical_opening_perimeter_m_item", "technical_opening_fastener_spacing_m"], "item", (v) => Math.ceil((v.technical_service_opening_count * v.technical_opening_perimeter_m_item) / v.technical_opening_fastener_spacing_m), { krer_locator: "КРЕР 10-05-011-02, ресурс С01-0505-0005; количество по проектным проходам" }),
      row(t, "technical_fire_acoustic_sealant", "Инженерные проходы", "material", "Огнестойкая/акустическая заделка проходок листовой обшивки", "technical_service_opening_count × technical_fire_acoustic_sealant_kg_item", ["technical_service_opening_count", "technical_fire_acoustic_sealant_kg_item"], "kg", (v) => v.technical_service_opening_count * v.technical_fire_acoustic_sealant_kg_item, { krer_locator: "КРЕР 10-05-011 применяется как benchmark; точная система заделки по проекту пожарной/акустической защиты" }),
      row(t, "technical_penetration_sealing_labor", "Инженерные проходы", "labor", "Огнестойкая/акустическая герметизация проходок", "technical_service_opening_count ÷ technical_penetration_sealing_productivity_item_per_man_hour", ["technical_service_opening_count", "technical_penetration_sealing_productivity_item_per_man_hour"], "man_hour", (v) => v.technical_service_opening_count / v.technical_penetration_sealing_productivity_item_per_man_hour, { krer_locator: "КРЕР 10-05-011 применяется как benchmark; операция по проектному узлу проходки" }),
      row(t, "technical_mep_coordination", "Инженерные услуги", "subcontract_service", "BIM/MEP координация раскладки, люков и проходок CLAD", "technical_mep_coordination_service_count", ["technical_mep_coordination_service_count"], "service", (v) => v.technical_mep_coordination_service_count, { procurement_eligible: false, krer_locator: "КРЕР 10-05-011-01/02; электрические и ОВиК компоненты остаются non-cost typed children" }),
    );
    massExpression += " + ceil(technical_service_opening_count × technical_opening_perimeter_m_item ÷ technical_opening_fastener_spacing_m) × fastener_mass_kg_item + technical_service_opening_count × technical_fire_acoustic_sealant_kg_item";
    massInputs.push("technical_service_opening_count", "technical_opening_perimeter_m_item", "technical_opening_fastener_spacing_m", "technical_fire_acoustic_sealant_kg_item");
    const previous = massCalculate;
    massCalculate = (v) => previous(v) + Math.ceil((v.technical_service_opening_count * v.technical_opening_perimeter_m_item) / v.technical_opening_fastener_spacing_m) * v.fastener_mass_kg_item + v.technical_service_opening_count * v.technical_fire_acoustic_sealant_kg_item;
  } else if (variant === "wet_zone") {
    parameters.push(
      numeric("wet_zone_penetration_count", "Количество герметизируемых проходов влажной зоны", "item", "PROJECT_QUANTITY", BOTH_SCOPES, 1, 100_000),
      numeric("wet_zone_sealant_kg_per_penetration", "Расход совместимого герметика на проход", "kg_per_item", "MATERIAL_PASSPORT_VALUE"),
      numeric("wet_zone_cladding_test_interval_m2", "Интервал контроля влагостойкой обшивки", "m2_per_test", "CONTROL_PLAN_VALUE"),
      numeric("wet_zone_waterproof_primer_l_m2", "Расход гидроизоляционной грунтовки", "l_per_m2", "MATERIAL_PASSPORT_VALUE"),
      numeric("wet_zone_waterproof_primer_density_kg_l", "Плотность гидроизоляционной грунтовки", "kg_per_l", "MATERIAL_PASSPORT_VALUE"),
      numeric("wet_zone_waterproofing_kg_m2", "Расход обмазочной/жидкой гидроизоляции", "kg_per_m2", "MATERIAL_PASSPORT_VALUE"),
      numeric("wet_zone_waterproof_tape_mass_kg_m", "Масса гидроизоляционной ленты углов и примыканий", "kg_per_m", "MATERIAL_PASSPORT_VALUE"),
      numeric("wet_zone_cuff_count", "Количество манжет гидроизоляции проходок", "item", "PROJECT_QUANTITY", BOTH_SCOPES, 0, 1_000_000),
      numeric("wet_zone_cuff_mass_kg_item", "Масса гидроизоляционной манжеты", "kg_per_item", "MATERIAL_PASSPORT_VALUE"),
      numeric("wet_zone_waterproofing_productivity_m2_per_man_hour", "Производительность устройства гидроизоляции", "m2_per_man_hour", "NORM_RATE"),
      numeric("wet_zone_moisture_test_count", "Количество проверок влажности условий производства", "test", "CONTROL_PLAN_VALUE", BOTH_SCOPES, 1, 100_000),
      numeric("wet_zone_moisture_meter_productivity_test_per_machine_hour", "Производительность влагомера", "test_per_machine_hour", "NORM_RATE"),
    );
    rows.push(
      row(t, "wet_zone_penetration_sealant", "Влажная зона", "material", "Совместимый герметик проходов листовой обшивки", "wet_zone_penetration_count × wet_zone_sealant_kg_per_penetration", ["wet_zone_penetration_count", "wet_zone_sealant_kg_per_penetration"], "kg", (v) => v.wet_zone_penetration_count * v.wet_zone_sealant_kg_per_penetration, { krer_locator: "КРЕР 10-05-011-02; герметизация — по проекту и паспорту влагостойкой системы" }),
      row(t, "wet_zone_waterproof_primer", "Влажная зона", "material", "Гидроизоляционная грунтовка мокрой зоны", `(${CLADDING_GEOMETRY_EXPRESSION}) × wet_zone_waterproof_primer_l_m2`, [...CLADDING_GEOMETRY_INPUTS, "wet_zone_waterproof_primer_l_m2"], "l", (v) => calculateCladdingGeometryArea(v) * v.wet_zone_waterproof_primer_l_m2, { krer_locator: "КРЕР 10-05-011 применяется как benchmark; расход по паспорту wet-zone system" }),
      row(t, "wet_zone_waterproofing", "Влажная зона", "material", "Обмазочная/жидкая гидроизоляция листовой поверхности", `(${CLADDING_GEOMETRY_EXPRESSION}) × wet_zone_waterproofing_kg_m2`, [...CLADDING_GEOMETRY_INPUTS, "wet_zone_waterproofing_kg_m2"], "kg", (v) => calculateCladdingGeometryArea(v) * v.wet_zone_waterproofing_kg_m2, { krer_locator: "КРЕР 10-05-011 применяется как benchmark; система и расход по проекту мокрой зоны" }),
      row(t, "wet_zone_waterproof_tape", "Влажная зона", "material", "Гидроизоляционная лента внутренних/наружных углов и примыканий", "internal_corner_length_m + external_corner_length_m + perimeter_length_m", ["internal_corner_length_m", "external_corner_length_m", "perimeter_length_m"], "m", (v) => v.internal_corner_length_m + v.external_corner_length_m + v.perimeter_length_m, { krer_locator: "КРЕР 10-05-011 применяется как benchmark; фактическая длина по wet-zone узлам" }),
      row(t, "wet_zone_penetration_cuffs", "Влажная зона", "material", "Гидроизоляционные манжеты проходок", "wet_zone_cuff_count", ["wet_zone_cuff_count"], "item", (v) => v.wet_zone_cuff_count, { krer_locator: "КРЕР 10-05-011 применяется как benchmark; количество по проектным проходкам" }),
      row(t, "wet_zone_waterproofing_labor", "Влажная зона", "labor", "Устройство грунтовки, гидроизоляции, лент и манжет", `(${CLADDING_GEOMETRY_EXPRESSION}) ÷ wet_zone_waterproofing_productivity_m2_per_man_hour`, [...CLADDING_GEOMETRY_INPUTS, "wet_zone_waterproofing_productivity_m2_per_man_hour"], "man_hour", (v) => calculateCladdingGeometryArea(v) / v.wet_zone_waterproofing_productivity_m2_per_man_hour, { krer_locator: "КРЕР 10-05-011 применяется как benchmark; труд по exact wet-zone system" }),
      row(t, "wet_zone_moisture_tests", "Влажная зона", "testing", "Контроль влажности основания и условий производства", "wet_zone_moisture_test_count", ["wet_zone_moisture_test_count"], "test", (v) => v.wet_zone_moisture_test_count, { sp_locator: "СП КР 65-101:2025, пп. 4.4–4.9; условия производства по паспорту wet-zone system" }),
      row(t, "wet_zone_moisture_meter", "Влажная зона", "equipment", "Влагомер для контроля условий производства", "wet_zone_moisture_test_count ÷ wet_zone_moisture_meter_productivity_test_per_machine_hour", ["wet_zone_moisture_test_count", "wet_zone_moisture_meter_productivity_test_per_machine_hour"], "machine_hour", (v) => v.wet_zone_moisture_test_count / v.wet_zone_moisture_meter_productivity_test_per_machine_hour, { krer_locator: "КРЕР 10-05-011 применяется как benchmark; приборный контроль по плану качества" }),
      row(t, "wet_zone_cladding_tests", "Влажная зона", "testing", "Контроль листов, крепежа и проходов влажной зоны", "ceil(area_m2 ÷ wet_zone_cladding_test_interval_m2)", ["area_m2", "wet_zone_cladding_test_interval_m2"], "test", (v) => Math.ceil(v.area_m2 / v.wet_zone_cladding_test_interval_m2), { sp_locator: "СП КР 65-101:2025, пп. 4.4–4.9, 7.7.4–7.7.5; паспорт влагостойкой системы" }),
    );
    massExpression += ` + wet_zone_penetration_count × wet_zone_sealant_kg_per_penetration + (${CLADDING_GEOMETRY_EXPRESSION}) × wet_zone_waterproof_primer_l_m2 × wet_zone_waterproof_primer_density_kg_l + (${CLADDING_GEOMETRY_EXPRESSION}) × wet_zone_waterproofing_kg_m2 + (internal_corner_length_m + external_corner_length_m + perimeter_length_m) × wet_zone_waterproof_tape_mass_kg_m + wet_zone_cuff_count × wet_zone_cuff_mass_kg_item`;
    massInputs.push("wet_zone_penetration_count", "wet_zone_sealant_kg_per_penetration", "wet_zone_waterproof_primer_l_m2", "wet_zone_waterproof_primer_density_kg_l", "wet_zone_waterproofing_kg_m2", "internal_corner_length_m", "external_corner_length_m", "perimeter_length_m", "wet_zone_waterproof_tape_mass_kg_m", "wet_zone_cuff_count", "wet_zone_cuff_mass_kg_item");
    const previous = massCalculate;
    massCalculate = (v) => previous(v) + v.wet_zone_penetration_count * v.wet_zone_sealant_kg_per_penetration + calculateCladdingGeometryArea(v) * v.wet_zone_waterproof_primer_l_m2 * v.wet_zone_waterproof_primer_density_kg_l + calculateCladdingGeometryArea(v) * v.wet_zone_waterproofing_kg_m2 + (v.internal_corner_length_m + v.external_corner_length_m + v.perimeter_length_m) * v.wet_zone_waterproof_tape_mass_kg_m + v.wet_zone_cuff_count * v.wet_zone_cuff_mass_kg_item;
  } else if (variant === "high_load") {
    parameters.push(
      numeric("design_load_kn_m2", "Расчетная нагрузка высоконагруженной обшивки", "kN_per_m2", "PROJECT_QUANTITY"),
      numeric("design_verification_capacity_kn_per_test", "Нагрузка, охватываемая одной проверкой проекта", "kN_per_test", "CONTROL_PLAN_VALUE"),
      numeric("high_load_structural_review_service_count", "Количество расчетов совместимой несущей системы high-load", "service", "CONTROL_PLAN_VALUE", BOTH_SCOPES, 1, 100_000),
      param("accepted_high_load_frame_revision_id", "Exact FRAME/typed-child revision с расчетной несущей способностью high-load", "text", "P0", null, "DEPENDENCY_REFERENCE", BOTH_SCOPES),
    );
    rows.push(
      row(t, "high_load_design_verification", "Высокая нагрузка", "testing", "Проверка листовой схемы, крепежа и FRAME dependency по расчетной нагрузке", `ceil((${CLADDING_GEOMETRY_EXPRESSION}) × design_load_kn_m2 ÷ design_verification_capacity_kn_per_test)`, [...CLADDING_GEOMETRY_INPUTS, "design_load_kn_m2", "design_verification_capacity_kn_per_test"], "test", (v) => Math.ceil((calculateCladdingGeometryArea(v) * v.design_load_kn_m2) / v.design_verification_capacity_kn_per_test), { sp_locator: "СП КР 65-101:2025, пп. 7.7.1–7.7.5; расчет нагрузки и паспорт высоконагруженной системы" }),
      row(t, "high_load_structural_review", "Высокая нагрузка", "subcontract_service", "Расчет совместимости слоев, крепежа, профилей, подвесов, анкеров и прогиба", "high_load_structural_review_service_count", ["high_load_structural_review_service_count"], "service", (v) => v.high_load_structural_review_service_count, { procurement_eligible: false, krer_locator: "КРЕР 10-05-011 используется как benchmark; П116/эквивалент — технический системный маршрут, не норма КР" }),
    );
  }
  massInputs = [...new Set(massInputs)];
  rows.push(
    row(t, "sheet_lift_equipment", "Логистика", "equipment", "Листовой подъемник", `(${massExpression}) ÷ sheet_lift_productivity_kg_per_machine_hour`, [...massInputs, "sheet_lift_productivity_kg_per_machine_hour"], "machine_hour", (v) => massCalculate(v) / v.sheet_lift_productivity_kg_per_machine_hour, { scopes: "FULL_ONLY" }),
    row(t, "sheet_cutting_waste", "Отходы", "waste", "Баланс отходов раскроя листов", `(${netBoardExpression}) × board_cutting_waste_percent ÷ 100`, ["area_m2", "board_layer_count", "board_cutting_waste_percent"], "m2", (v) => v.area_m2 * v.board_layer_count * v.board_cutting_waste_percent / 100, { scopes: "FULL_ONLY", cost_ownership: "informational_output", procurement_eligible: false }),
    ...professionalCompletionRows({
      technologyId: t,
      group: "CLAD",
      massExpression,
      massInputs,
      calculateMassKg: massCalculate,
      wasteExpression: `(${netBoardExpression}) × board_cutting_waste_percent ÷ 100 × board_mass_kg_m2`,
      wasteInputs: ["area_m2", "board_layer_count", "board_cutting_waste_percent", "board_mass_kg_m2"],
      calculateWasteKg: (v) => v.area_m2 * v.board_layer_count * v.board_cutting_waste_percent / 100 * v.board_mass_kg_m2,
      workAreaExpression: CLADDING_GEOMETRY_EXPRESSION,
      workAreaInputs: CLADDING_GEOMETRY_INPUTS,
      calculateWorkAreaM2: calculateCladdingGeometryArea,
    }),
    row(t, "clad_documentation", "Исполнительная документация", "documentation", "Записи журнала раскроя и монтажа листов CLAD", "documentation_record_count", ["documentation_record_count"], "document", (v) => v.documentation_record_count, { scopes: "FULL_ONLY", sp_locator: "СП КР 65-101:2025, пп. 4.7–4.9" }),
  );
  return { parameters, rows };
}

function contractFor(inventory: InteriorFinishesDomainInventoryRow): DrywallCeilingBulkheadProfessionalWorkContractV3 {
  const group = groupOf(inventory.catalog_id);
  const variant = variantOf(inventory.catalog_id);
  const groupData = group === "FRAME" ? {
    order: 1 as const,
    required: ["PROJECT_SYSTEM_REVIEW", "GEOMETRY_SURVEY", "SETTING_OUT", "ANCHORING", "PERIMETER_PROFILE_INSTALL", "SUSPENSION_INSTALL", "PROFILE_CUTTING", "PRIMARY_FRAME_INSTALL", "SPECIAL_NODE_ASSEMBLY", "FRAME_GEOMETRY_CONTROL", "LOGISTICS", "WASTE_CLOSEOUT", "DOCUMENTATION"],
    optional: ["OPENING_REINFORCEMENT", "HIGH_LOAD_REINFORCEMENT", "MOISTURE_PROTECTION_INTERFACE"],
    owned: ["perimeter and field profiles", "suspensions/rods/connectors/extensions", "anchors and structural fasteners", "reinforcements and frame special nodes", "frame labor and equipment", "frame geometry acceptance"],
    forbidden: ["gypsum board sheets", "sheet fixing labor", "joint finishing", "final decoration"],
    dependencies: [],
  } : group === "ALIGN" ? {
    order: 2 as const,
    required: ["SEPARATE_SCOPE_AUTHORIZATION", "ACCEPTED_FRAME_SURVEY", "REFERENCE_PLANE_SETUP", "DEFECT_IDENTIFICATION", "SYSTEM_ALIGNMENT", "PLANE_CONTROL", "LOGISTICS", "WASTE_CLOSEOUT", "DOCUMENTATION"],
    optional: ["LOCAL_CORRECTION", "HANGER_ADJUSTMENT"],
    owned: ["independently justified reference plane survey", "post-FRAME adjustment/correction labor", "adjustment consumables only", "plane acceptance"],
    forbidden: ["base frame installation", "gypsum board sheets", "joint finishing", "final decoration"],
    dependencies: ["accepted_frame_revision_id"],
  } : {
    order: 3 as const,
    required: ["FRAME_ACCEPTANCE", "SHEET_LAYOUT", "SHEET_CUTTING", "EDGE_PREPARATION", "SHEET_FIXING", "JOINT_AND_CORNER_TREATMENT", "SURFACE_QUALITY_PREPARATION", "JOINT_GEOMETRY_CONTROL", "LOGISTICS", "WASTE_CLOSEOUT", "DOCUMENTATION"],
    optional: ["SECOND_SHEET_LAYER", "OPENING_DETAILS", "MOISTURE_RESISTANT_BOARD", "FIRE_RATED_BOARD"],
    owned: ["selected board system", "board fasteners", "sheet cutting and fixing labor", "joint/corner treatment", "surface preparation Q1-Q4", "cladding-specific wet/fire/acoustic treatment", "sheet waste", "cladding acceptance"],
    forbidden: ["frame profiles", "frame installation", "electrical/MEP components", "final decorative coating"],
    dependencies: ["accepted_frame_revision_id", "accepted_alignment_revision_id", ...(variant === "high_load" ? ["accepted_high_load_frame_revision_id"] : [])],
  };
  return {
    schema_version: "DrywallCeilingBulkheadProfessionalWorkContractV3",
    catalog_id: inventory.catalog_id,
    work_key: inventory.work_key,
    title_ru: inventory.localized_name_ru,
    group,
    group_order: groupData.order,
    variant,
    normative_source_ids: [KG_SP_SOURCE_ID, KG_KRER_SOURCE_ID],
    required_stages: groupData.required,
    optional_stages: groupData.optional,
    owned_cost_scope: groupData.owned,
    forbidden_cost_scope: groupData.forbidden,
    non_cost_dependencies: groupData.dependencies,
    regional_lane_count: 11,
    global_decision_count: 8,
    normative_proof_bundle_id: `WorkNormativeProofBundleV3:${inventory.catalog_id}`,
    professional_proof_bundle_id: `WorkProfessionalProofBundleV3:${inventory.catalog_id}`,
  };
}

function normativeTrace(
  rowSpec: RowSpec,
): readonly ProfessionalNormativeRowTraceV3[] {
  const quantityRole = rowSpec.category === "testing" || rowSpec.category === "documentation"
    ? "QUALITY_ACCEPTANCE" as const
    : rowSpec.category === "transport" || rowSpec.category === "waste"
      ? "PROJECT_INPUT" as const
      : "QUANTITY_NORM" as const;
  return [
    {
      source_id: KG_KRER_SOURCE_ID,
      document_code: "КРЕР 10-05-011",
      edition: "приказ №52-нпа от 28.04.2022",
      exact_locator: rowSpec.krer_locator,
      source_role: quantityRole,
      applicability: "Ресурсная норма КР применяется как источник состава работ/ресурса; проектные параметры остаются явными runtime inputs.",
      foreign_mandatory_for_kg: false,
    },
    {
      source_id: KG_SP_SOURCE_ID,
      document_code: "СП КР 65-101:2025",
      edition: "официальное издание 2025, приказ №51 от 10.02.2025",
      exact_locator: rowSpec.sp_locator,
      source_role: rowSpec.category === "testing" || rowSpec.category === "documentation"
        ? "QUALITY_ACCEPTANCE"
        : "WORK_EXECUTION",
      applicability: "Обязательная для проекта КР проверка производства и приемки подвесного потолка; иностранная норма не подменяет СП КР.",
      foreign_mandatory_for_kg: false,
    },
  ];
}

function domainParameter(
  spec: ParameterSpec,
  consumers: readonly string[],
): ProfessionalDomainParameterDefinitionV1 {
  const fullOnly = spec.required_for.length === 1 && spec.required_for[0] === "FULL_APPLICABLE_SCOPE";
  return {
    parameter_id: spec.parameter_id,
    label_ru: spec.label_ru,
    unit_id: spec.unit_id,
    priority: spec.priority,
    input_type: spec.input_type,
    ...(spec.minimum == null ? {} : { minimum: spec.minimum }),
    ...(spec.maximum == null ? {} : { maximum: spec.maximum }),
    ...(spec.choices ? { choices: spec.choices } : {}),
    visible_when: fullOnly ? FULL_ONLY : ALWAYS,
    required_when: fullOnly ? FULL_ONLY : ALWAYS,
    formula_consumers: consumers,
    source_ownership: ["USER_EXPLICIT", "PROJECT_DOCUMENT", "MATERIAL_PASSPORT", "APPLICABLE_NORM", "VERIFIED_RATEBOOK"],
  };
}

function assemblyParameter(spec: ParameterSpec, modes: readonly ProfessionalEstimateScopeModeV4[]): ProfessionalAssemblyParameterDefinitionV4 {
  if (!spec.role) throw new Error(`DRYWALL_CEILING_BULKHEAD_ASSEMBLY_PARAMETER_ROLE_MISSING:${spec.parameter_id}`);
  return {
    parameter_id: spec.parameter_id,
    title_ru: spec.label_ru,
    role: spec.role,
    unit_id: spec.unit_id,
    required_for: modes,
  };
}

function buildParts(inventory: InteriorFinishesDomainInventoryRow): DrywallCeilingBulkheadProfessionalPackagePartsV3 {
  const contract = contractFor(inventory);
  const definition = contract.group === "FRAME"
    ? frameDefinition(inventory, contract.variant)
    : contract.group === "ALIGN"
      ? alignDefinition(inventory, contract.variant)
      : cladDefinition(inventory, contract.variant);
  const pricedRows = definition.rows.filter((item) => item.cost_ownership !== "informational_output");
  const priceParameters = pricedRows.map((item) => numeric(
    `unit_price_${item.row_key}_kgs`,
    `Цена ресурса «${item.title_ru}» в KGS за ${item.formula.output_unit_id}`,
    `KGS_per_${item.formula.output_unit_id}`,
    "PRICE_INPUT",
    item.scopes === "FULL_ONLY" ? FULL_SCOPE : BOTH_SCOPES,
    0.01,
    1_000_000_000_000,
    item.scopes === "FULL_ONLY" ? "P1" : "P0",
  ));
  const allParameters = [...definition.parameters, ...priceParameters];
  const parameterById = new Map(allParameters.map((item) => [item.parameter_id, item]));
  if (parameterById.size !== allParameters.length) throw new Error(`DRYWALL_CEILING_BULKHEAD_PARAMETER_DUPLICATE:${inventory.catalog_id}`);
  const contextParameterIds = [...new Set([
    "bulkhead_drop_height_m",
    "board_layer_count",
    "board_thickness_mm",
    ...CLADDING_GEOMETRY_INPUTS,
    "internal_corner_length_m",
    "external_corner_length_m",
    "transition_length_m",
    "opening_perimeter_m",
    "working_height_m",
    ...allParameters
      .filter((item) => item.role === "DEPENDENCY_REFERENCE")
      .map((item) => item.parameter_id),
  ])];
  const dependencies = contract.non_cost_dependencies.map((id) =>
    id === "accepted_frame_revision_id"
      ? "typed-child:FRAME:accepted_frame_revision_id"
      : id === "accepted_alignment_revision_id"
        ? "typed-child:ALIGN:accepted_alignment_revision_id"
        : "typed-child:FRAME:accepted_high_load_frame_revision_id");
  const toAssemblyRow = (item: RowSpec): ProfessionalAssemblyRowDefinitionV4 => {
    const informational = item.cost_ownership === "informational_output";
    return {
      row_id: `${inventory.canonical_technology_id}:drywall-ceiling-bulkhead-professional-v3:row:${item.row_key}`,
      section: item.section,
      category: item.category,
      title_ru: item.title_ru,
      formula: item.formula,
      cost_ownership: item.cost_ownership,
      cost_owner_id: `DRYWALL_CEILING_BULKHEAD_PROFESSIONAL_V3:${contract.group}:${inventory.catalog_id}:${item.row_key}`,
      semantic_owner: drywallCeilingBulkheadRowSemanticOwnerIdV3(inventory.catalog_id, item.row_key),
      normative_source_ids: [KG_SP_SOURCE_ID, KG_KRER_SOURCE_ID],
      inclusion_condition: item.scopes === "FULL_ONLY"
        ? "work_included=true AND scope_mode=FULL_APPLICABLE_SCOPE"
        : "work_included=true",
      procurement_eligible: item.procurement_eligible,
      normative_trace_v3: normativeTrace(item),
      price_route_v3: informational ? {
        kind: "NOT_APPLICABLE_INFORMATIONAL_OUTPUT",
        reason: "Строка материального баланса не образует повторную стоимость.",
      } : {
        kind: "RUNTIME_VALIDATED_INPUT",
        unit_price_parameter_id: `unit_price_${item.row_key}_kgs`,
        price_basis_reference_parameter_id: "price_basis_reference",
        price_basis_date_parameter_id: "price_basis_date",
        currency_from_request: true,
        minimum_exclusive: 0,
      },
      resource_graph_node_v3: {
        graph_version: "ProfessionalResourceGraphV3",
        typed_child_boundary: contract.group,
        resource_class: item.resource_class,
        dependency_ids: dependencies,
        non_cost_dependencies_only: contract.group !== "FRAME",
        context_parameter_ids: contextParameterIds,
        forbidden_cost_scopes: contract.forbidden_cost_scope,
      },
      normative_proof_bundle_id_v3: contract.normative_proof_bundle_id,
      professional_proof_bundle_id_v3: contract.professional_proof_bundle_id,
    };
  };
  const assemblyFor = (
    suffix: "core" | "full",
    modes: readonly ProfessionalEstimateScopeModeV4[],
    rows: readonly RowSpec[],
  ): ProfessionalChildAssemblyV4 => {
    const needed = new Set<string>(["work_included", "price_basis_reference", "price_basis_date", ...contextParameterIds]);
    for (const item of rows) {
      for (const id of item.formula.input_parameter_ids) needed.add(id);
      if (item.cost_ownership !== "informational_output") needed.add(`unit_price_${item.row_key}_kgs`);
    }
    return {
      child_passport_id: `${inventory.canonical_technology_id}:drywall-ceiling-bulkhead-professional-v3:${suffix}-passport:v3`,
      child_passport_version: "3.0.0",
      domain_owner: "interior_finishes_complete_v1",
      assembly_id: `${inventory.canonical_technology_id}:drywall-ceiling-bulkhead-professional-v3:${suffix}-assembly:v3`,
      title_ru: `${suffix === "core" ? "Основной" : "Полный"} состав: ${inventory.localized_name_ru}`,
      scope_trigger_parameter: "work_included",
      scope_trigger_values: [true],
      supported_scope_modes: modes,
      parameters: [...needed].map((id) => {
        const spec = parameterById.get(id);
        if (!spec) throw new Error(`DRYWALL_CEILING_BULKHEAD_ASSEMBLY_PARAMETER_MISSING:${inventory.catalog_id}:${id}`);
        return assemblyParameter(spec, modes);
      }),
      rows: rows.map(toAssemblyRow),
    };
  };
  const coreRows = definition.rows.filter((item) => item.scopes === "BOTH");
  const fullRows = definition.rows.filter((item) => item.scopes === "FULL_ONLY");
  const consumerMap = new Map<string, Set<string>>();
  for (const item of definition.rows) {
    for (const id of item.formula.input_parameter_ids) {
      const consumers = consumerMap.get(id) ?? new Set<string>();
      consumers.add(item.row_key);
      consumerMap.set(id, consumers);
    }
    if (item.cost_ownership !== "informational_output") {
      consumerMap.set(`unit_price_${item.row_key}_kgs`, new Set([item.row_key]));
      for (const id of ["price_basis_reference", "price_basis_date"]) {
        const consumers = consumerMap.get(id) ?? new Set<string>();
        consumers.add(`price-route:${item.row_key}`);
        consumerMap.set(id, consumers);
      }
    }
  }
  for (const id of contextParameterIds) {
    const consumers = consumerMap.get(id) ?? new Set<string>();
    consumers.add(contract.professional_proof_bundle_id);
    consumerMap.set(id, consumers);
  }
  for (const parameter of allParameters) {
    if (consumerMap.has(parameter.parameter_id)) continue;
    consumerMap.set(parameter.parameter_id, new Set([
      parameter.parameter_id === "work_included"
        ? `scope-trigger:${inventory.catalog_id}`
        : contract.professional_proof_bundle_id,
    ]));
  }
  const schema: ProfessionalDomainParameterSchemaV1 = {
    schema_id: `${inventory.canonical_technology_id}:drywall-ceiling-bulkhead-professional-parameter-schema:v3`,
    schema_version: "3.0.0",
    technology_id: inventory.canonical_technology_id,
    parameters: allParameters.map((item) => domainParameter(item, [...(consumerMap.get(item.parameter_id) ?? [])])),
    quantity_alternatives: [["area_m2"], ["length_m", "width_m"]],
    derived_parameter_rules: [{
      target_parameter_id: "area_m2",
      output_unit_id: "m2",
      alternatives: [{
        input_parameter_ids: ["length_m", "width_m"],
        expression: "length_m × width_m",
        calculate: (values) => values.length_m * values.width_m,
      }],
    }],
  };
  return {
    contract,
    schema,
    child_assemblies: [
      assemblyFor("core", BOTH_SCOPES, coreRows),
      assemblyFor("full", FULL_SCOPE, fullRows),
    ],
    normative_profile: {
      profile_id: `${inventory.canonical_technology_id}:drywall-ceiling-bulkhead-kg-proof-profile:v3`,
      profile_version: "3.0.0",
      technology_id: inventory.canonical_technology_id,
      jurisdiction: "KG",
      requested_source_ids: [KG_SP_SOURCE_ID, KG_KRER_SOURCE_ID],
      requested_source_types: ["WORK_EXECUTION_STANDARD", "RESOURCE_ESTIMATE_NORM"],
      rejected_foreign_source_ids: ["RU_SP_163", "RU_GESN_10", "ISO_6308_WITHDRAWN", "ASTM_C1396"],
    },
    required_stages: contract.required_stages,
    optional_stages: contract.optional_stages,
    resource_policy: {
      policy_id: `${inventory.canonical_technology_id}:drywall-ceiling-bulkhead-resource-policy:v3`,
      technology_id: inventory.canonical_technology_id,
      required_categories: ["material", "labor", "equipment", "transport", "waste", "testing", "documentation"],
      optional_categories: ["subcontract_service", "temporary_work"],
      forbidden_generic_rows: ["Материалы", "Работы", "Оборудование", "Другое", "Комплект работ", "Основные материалы"],
      one_bundle_resource_replacement_forbidden: true,
    },
  };
}

export function isDrywallCeilingBulkheadProfessionalCatalogIdV3(catalogId: string): boolean {
  return AUTHORIZED.has(catalogId);
}

export function buildDrywallCeilingBulkheadProfessionalPackagePartsV3(
  inventory: InteriorFinishesDomainInventoryRow,
): DrywallCeilingBulkheadProfessionalPackagePartsV3 | null {
  if (!isDrywallCeilingBulkheadProfessionalCatalogIdV3(inventory.catalog_id)) return null;
  return buildParts(inventory);
}
