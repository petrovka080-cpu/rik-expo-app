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
    param("area_m2", "Чистая площадь потолочного короба", "number", "P2", "m2", "PROJECT_QUANTITY", BOTH_SCOPES, { minimum: 0.01, maximum: 10_000_000 }),
    param("length_m", "Проектная длина поверхности короба", "number", "P2", "m", null, BOTH_SCOPES, { minimum: 0.01, maximum: 100_000 }),
    param("width_m", "Проектная ширина/высота поверхности короба", "number", "P2", "m", null, BOTH_SCOPES, { minimum: 0.01, maximum: 100_000 }),
    numeric("perimeter_length_m", "Длина периметра и примыканий короба", "m", "PROJECT_QUANTITY"),
    numeric("bulkhead_drop_height_m", "Высота опуска короба", "m", "PROJECT_QUANTITY", BOTH_SCOPES, 0.01, 100),
    numeric("board_layer_count", "Число проектных слоев листовой обшивки", "item", "PROJECT_QUANTITY", BOTH_SCOPES, 1, 12),
    numeric("board_thickness_mm", "Проектная толщина листа", "mm", "MATERIAL_PASSPORT_VALUE", BOTH_SCOPES, 1, 100),
    param("board_type", "Тип листа по проекту и паспорту системы", "text", "P0", null, "DEPENDENCY_REFERENCE", BOTH_SCOPES),
    param("moisture_class", "Класс влажностного воздействия", "text", "P0", null, "DEPENDENCY_REFERENCE", BOTH_SCOPES),
    param("fire_rating_class", "Требуемый класс огнестойкости", "text", "P0", null, "DEPENDENCY_REFERENCE", BOTH_SCOPES),
    param("acoustic_class", "Требуемый акустический класс", "text", "P0", null, "DEPENDENCY_REFERENCE", BOTH_SCOPES),
    param("design_load_class", "Класс проектной нагрузки", "text", "P0", null, "DEPENDENCY_REFERENCE", BOTH_SCOPES),
    param("project_system_compatibility_reference", "Ссылка на проверку совместимости проектной системы", "text", "P0", null, "DEPENDENCY_REFERENCE", BOTH_SCOPES),
    param("price_basis_reference", "Источник цен: прайс-лист, котировка или pricebook", "text", "P0", null, "PRICE_SOURCE_REFERENCE", BOTH_SCOPES),
    param("price_basis_date", "Дата ценового источника (ГГГГ-ММ-ДД)", "text", "P0", null, "PRICE_SOURCE_REFERENCE", BOTH_SCOPES),
    ...(group === "FRAME" ? [] : [
      param("accepted_frame_revision_id", "Принятая ревизия FRAME (non-cost dependency)", "text", "P0", null, "DEPENDENCY_REFERENCE", BOTH_SCOPES),
    ]),
    ...(group === "CLAD" ? [
      param("accepted_alignment_revision_id", "Принятая ревизия ALIGN (non-cost dependency)", "text", "P0", null, "DEPENDENCY_REFERENCE", BOTH_SCOPES),
    ] : []),
  ];
}

function frameDefinition(
  inventory: InteriorFinishesDomainInventoryRow,
  variant: DrywallCeilingBulkheadProfessionalVariantV3,
): { parameters: ParameterSpec[]; rows: RowSpec[] } {
  const t = inventory.canonical_technology_id;
  const parameters = [
    ...commonParameters(inventory.scope_capability, "FRAME"),
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
    numeric("connector_mass_kg_item", "Масса соединителя по паспорту", "kg_per_item", "MATERIAL_PASSPORT_VALUE"),
    numeric("anchor_mass_kg_item", "Масса анкера по паспорту", "kg_per_item", "MATERIAL_PASSPORT_VALUE"),
    numeric("separation_tape_mass_kg_m", "Масса разделительной ленты по паспорту", "kg_per_m", "MATERIAL_PASSPORT_VALUE"),
    numeric("setting_out_line_length_m", "Длина линий разметки", "m", "PROJECT_QUANTITY"),
    numeric("setting_out_productivity_m_per_man_hour", "Проверенная производительность разметки", "m_per_man_hour", "NORM_RATE"),
    numeric("frame_labor_productivity_m2_per_man_hour", "Проверенная производительность монтажа FRAME", "m2_per_man_hour", "NORM_RATE"),
    numeric("frame_equipment_productivity_m2_per_machine_hour", "Проверенная производительность монтажного оборудования", "m2_per_machine_hour", "NORM_RATE"),
    numeric("delivery_distance_km", "Расстояние поставки материалов FRAME", "km", "LOGISTICS_VALUE", FULL_SCOPE, 0.1, 5_000),
    numeric("loading_productivity_kg_per_man_hour", "Производительность погрузки/подъема FRAME", "kg_per_man_hour", "NORM_RATE", FULL_SCOPE),
    numeric("waste_percent", "Проектный процент отходов FRAME", "percent", "PROJECT_QUANTITY", FULL_SCOPE, 0.01, 50),
    numeric("waste_handling_productivity_kg_per_man_hour", "Производительность обращения с отходами FRAME", "kg_per_man_hour", "NORM_RATE", FULL_SCOPE),
    numeric("qa_interval_m2_per_test", "Площадь FRAME на одну приемочную проверку", "m2_per_test", "CONTROL_PLAN_VALUE", FULL_SCOPE),
    numeric("documentation_record_count", "Количество актов и записей FRAME", "item", "CONTROL_PLAN_VALUE", FULL_SCOPE, 1, 10_000),
  ];
  const primaryLength = "area_m2 ÷ primary_profile_spacing_m";
  const crossLength = "area_m2 ÷ cross_profile_spacing_m";
  const suspensionCount = `ceil((${primaryLength}) ÷ suspension_spacing_m)`;
  const connectorCount = "ceil(area_m2 ÷ (primary_profile_spacing_m × cross_profile_spacing_m))";
  const anchorCount = "ceil(perimeter_length_m ÷ anchor_spacing_m)";
  const baseMassExpression = `perimeter_length_m × perimeter_profile_run_count × perimeter_profile_mass_kg_m + (${primaryLength}) × primary_profile_mass_kg_m + (${crossLength}) × cross_profile_mass_kg_m + (${suspensionCount}) × suspension_mass_kg_item + (${connectorCount}) × connector_mass_kg_item + (${anchorCount}) × anchor_mass_kg_item + perimeter_length_m × separation_tape_run_count × separation_tape_mass_kg_m`;
  const baseMassInputs = ["perimeter_length_m", "perimeter_profile_run_count", "perimeter_profile_mass_kg_m", "area_m2", "primary_profile_spacing_m", "primary_profile_mass_kg_m", "cross_profile_spacing_m", "cross_profile_mass_kg_m", "suspension_spacing_m", "suspension_mass_kg_item", "connector_mass_kg_item", "anchor_spacing_m", "anchor_mass_kg_item", "separation_tape_run_count", "separation_tape_mass_kg_m"];
  const baseMass = (v: Readonly<Record<string, number>>) =>
    v.perimeter_length_m * v.perimeter_profile_run_count * v.perimeter_profile_mass_kg_m +
    (v.area_m2 / v.primary_profile_spacing_m) * v.primary_profile_mass_kg_m +
    (v.area_m2 / v.cross_profile_spacing_m) * v.cross_profile_mass_kg_m +
    Math.ceil((v.area_m2 / v.primary_profile_spacing_m) / v.suspension_spacing_m) * v.suspension_mass_kg_item +
    Math.ceil(v.area_m2 / (v.primary_profile_spacing_m * v.cross_profile_spacing_m)) * v.connector_mass_kg_item +
    Math.ceil(v.perimeter_length_m / v.anchor_spacing_m) * v.anchor_mass_kg_item +
    v.perimeter_length_m * v.separation_tape_run_count * v.separation_tape_mass_kg_m;
  const rows: RowSpec[] = [
    row(t, "perimeter_profiles", "Каркас", "material", "Направляющие профили периметра потолочного короба", "perimeter_length_m × perimeter_profile_run_count", ["perimeter_length_m", "perimeter_profile_run_count"], "m", (v) => v.perimeter_length_m * v.perimeter_profile_run_count, { krer_locator: "КРЕР 10-05-011-02, состав работ пп. 2–3; ресурс С09-0406-0040" }),
    row(t, "primary_profiles", "Каркас", "material", "Основные потолочные профили", primaryLength, ["area_m2", "primary_profile_spacing_m"], "m", (v) => v.area_m2 / v.primary_profile_spacing_m, { krer_locator: "КРЕР 10-05-011-02, состав работ п. 5; ресурс С09-0407-0001" }),
    row(t, "cross_profiles", "Каркас", "material", "Несущие поперечные профили", crossLength, ["area_m2", "cross_profile_spacing_m"], "m", (v) => v.area_m2 / v.cross_profile_spacing_m, { krer_locator: "КРЕР 10-05-011-02, состав работ п. 5; ресурс С09-0407-0001" }),
    row(t, "suspensions", "Подвесы", "material", "Подвесы с тягами потолочного каркаса", suspensionCount, ["area_m2", "primary_profile_spacing_m", "suspension_spacing_m"], "item", (v) => Math.ceil((v.area_m2 / v.primary_profile_spacing_m) / v.suspension_spacing_m), { krer_locator: "КРЕР 10-05-011-02, состав работ п. 4; ресурс С09-0402-0060" }),
    row(t, "profile_connectors", "Соединители", "material", "Одноуровневые соединители профилей", connectorCount, ["area_m2", "primary_profile_spacing_m", "cross_profile_spacing_m"], "item", (v) => Math.ceil(v.area_m2 / (v.primary_profile_spacing_m * v.cross_profile_spacing_m)), { krer_locator: "КРЕР 10-05-011-02, состав работ п. 6; ресурс С09-0409-0003" }),
    row(t, "anchors", "Анкеры", "material", "Анкерные дюбели крепления каркаса", anchorCount, ["perimeter_length_m", "anchor_spacing_m"], "item", (v) => Math.ceil(v.perimeter_length_m / v.anchor_spacing_m), { krer_locator: "КРЕР 10-05-011-02, состав работ п. 3; ресурс С01-1902-0002" }),
    row(t, "separation_tape", "Примыкания", "material", "Разделительная лента в местах сопряжений", "perimeter_length_m × separation_tape_run_count", ["perimeter_length_m", "separation_tape_run_count"], "m", (v) => v.perimeter_length_m * v.separation_tape_run_count, { krer_locator: "КРЕР 10-05-011-02, состав работ п. 7; ресурс С01-4114-0005" }),
    row(t, "setting_out_labor", "Труд", "labor", "Разметка проектного положения каркаса", "setting_out_line_length_m ÷ setting_out_productivity_m_per_man_hour", ["setting_out_line_length_m", "setting_out_productivity_m_per_man_hour"], "man_hour", (v) => v.setting_out_line_length_m / v.setting_out_productivity_m_per_man_hour, { krer_locator: "КРЕР 10-05-011-02, состав работ п. 1; строка 1 «Затраты труда рабочих»" }),
    row(t, "frame_installation_labor", "Труд", "labor", "Монтаж профилей, подвесов, соединителей и анкеров", "area_m2 ÷ frame_labor_productivity_m2_per_man_hour", ["area_m2", "frame_labor_productivity_m2_per_man_hour"], "man_hour", (v) => v.area_m2 / v.frame_labor_productivity_m2_per_man_hour, { krer_locator: "КРЕР 10-05-011-02, состав работ пп. 2–7; строка 1 «Затраты труда рабочих»" }),
    row(t, "frame_installation_equipment", "Оборудование", "equipment", "Перфоратор и монтажный инструмент FRAME", "area_m2 ÷ frame_equipment_productivity_m2_per_machine_hour", ["area_m2", "frame_equipment_productivity_m2_per_machine_hour"], "machine_hour", (v) => v.area_m2 / v.frame_equipment_productivity_m2_per_machine_hour, { krer_locator: "КРЕР 10-05-011-02, машины Х33-0462 и Х33-0840" }),
  ];

  let massExpression = baseMassExpression;
  let massInputs = [...baseMassInputs];
  let massCalculate = baseMass;
  if (variant === "large_area") {
    parameters.push(
      numeric("large_area_handling_productivity_kg_per_machine_hour", "Производительность механизированной подачи на большой площади", "kg_per_machine_hour", "NORM_RATE"),
      numeric("large_area_staging_zone_count", "Количество зон складирования большой площади", "item", "PROJECT_QUANTITY", BOTH_SCOPES, 1, 10_000),
      numeric("large_area_staging_productivity_zone_per_machine_hour", "Производительность перестановки между зонами", "item_per_machine_hour", "NORM_RATE"),
    );
    rows.push(row(t, "large_area_material_handling", "Механизированная подача", "equipment", "Механизированная подача элементов FRAME между зонами складирования", `(${massExpression}) ÷ large_area_handling_productivity_kg_per_machine_hour + large_area_staging_zone_count ÷ large_area_staging_productivity_zone_per_machine_hour`, [...massInputs, "large_area_handling_productivity_kg_per_machine_hour", "large_area_staging_zone_count", "large_area_staging_productivity_zone_per_machine_hour"], "machine_hour", (v) => baseMass(v) / v.large_area_handling_productivity_kg_per_machine_hour + v.large_area_staging_zone_count / v.large_area_staging_productivity_zone_per_machine_hour, { krer_locator: "КРЕР 10-05-011-02, измеритель 100 м²; подача — отдельный проектный маршрут", resource_class: "large-area material handling" }));
  } else if (variant === "small_area") {
    parameters.push(
      numeric("small_area_corner_count", "Количество углов и коротких возвратов", "item", "PROJECT_QUANTITY", BOTH_SCOPES, 1, 100_000),
      numeric("small_area_corner_productivity_item_per_man_hour", "Производительность деталировки углов", "item_per_man_hour", "NORM_RATE"),
    );
    rows.push(row(t, "small_area_corner_detail_labor", "Деталировка", "labor", "Подрезка и сборка каркаса в углах малой площади", "small_area_corner_count ÷ small_area_corner_productivity_item_per_man_hour", ["small_area_corner_count", "small_area_corner_productivity_item_per_man_hour"], "man_hour", (v) => v.small_area_corner_count / v.small_area_corner_productivity_item_per_man_hour, { krer_locator: "КРЕР 10-05-011-02, состав работ пп. 5–6; проектная деталировка углов" }));
  } else if (variant === "technical_room") {
    parameters.push(
      numeric("technical_service_opening_count", "Количество инженерных проходов", "item", "PROJECT_QUANTITY", BOTH_SCOPES, 1, 100_000),
      numeric("technical_opening_profile_m_per_opening", "Профиль усиления на один инженерный проход", "m_per_item", "MATERIAL_PASSPORT_VALUE"),
      numeric("technical_opening_profile_mass_kg_m", "Масса профиля усиления инженерных проходов", "kg_per_m", "MATERIAL_PASSPORT_VALUE"),
      numeric("technical_opening_productivity_item_per_man_hour", "Производительность обрамления инженерных проходов", "item_per_man_hour", "NORM_RATE"),
    );
    rows.push(
      row(t, "technical_opening_profiles", "Инженерные проходы", "material", "Профили обрамления инженерных проходов", "technical_service_opening_count × technical_opening_profile_m_per_opening", ["technical_service_opening_count", "technical_opening_profile_m_per_opening"], "m", (v) => v.technical_service_opening_count * v.technical_opening_profile_m_per_opening, { krer_locator: "КРЕР 10-05-011-02, профили С09-0407; количество по проекту технического помещения" }),
      row(t, "technical_opening_frame_labor", "Инженерные проходы", "labor", "Обрамление проходов каркасом", "technical_service_opening_count ÷ technical_opening_productivity_item_per_man_hour", ["technical_service_opening_count", "technical_opening_productivity_item_per_man_hour"], "man_hour", (v) => v.technical_service_opening_count / v.technical_opening_productivity_item_per_man_hour, { krer_locator: "КРЕР 10-05-011-02, состав работ пп. 5–6; проектные узлы проходов" }),
    );
    massExpression += " + technical_service_opening_count × technical_opening_profile_m_per_opening × technical_opening_profile_mass_kg_m";
    massInputs.push("technical_service_opening_count", "technical_opening_profile_m_per_opening", "technical_opening_profile_mass_kg_m");
    const previous = massCalculate;
    massCalculate = (v) => previous(v) + v.technical_service_opening_count * v.technical_opening_profile_m_per_opening * v.technical_opening_profile_mass_kg_m;
  } else if (variant === "wet_zone") {
    parameters.push(
      numeric("wet_zone_corrosion_protection_rate_kg_m2", "Расход совместимой антикоррозионной защиты", "kg_per_m2", "MATERIAL_PASSPORT_VALUE"),
      numeric("wet_zone_protection_productivity_m2_per_man_hour", "Производительность нанесения защиты", "m2_per_man_hour", "NORM_RATE"),
      numeric("wet_zone_frame_test_interval_m2", "Интервал контроля защитного исполнения", "m2_per_test", "CONTROL_PLAN_VALUE"),
    );
    rows.push(
      row(t, "wet_zone_corrosion_protection", "Защита влажной зоны", "material", "Совместимая антикоррозионная защита элементов FRAME", "area_m2 × wet_zone_corrosion_protection_rate_kg_m2", ["area_m2", "wet_zone_corrosion_protection_rate_kg_m2"], "kg", (v) => v.area_m2 * v.wet_zone_corrosion_protection_rate_kg_m2, { krer_locator: "КРЕР 10-05-011-02; специальная защита определяется проектом и паспортом системы" }),
      row(t, "wet_zone_protection_labor", "Защита влажной зоны", "labor", "Нанесение антикоррозионной защиты FRAME", "area_m2 ÷ wet_zone_protection_productivity_m2_per_man_hour", ["area_m2", "wet_zone_protection_productivity_m2_per_man_hour"], "man_hour", (v) => v.area_m2 / v.wet_zone_protection_productivity_m2_per_man_hour),
      row(t, "wet_zone_frame_tests", "Контроль влажной зоны", "testing", "Контроль непрерывности защитного исполнения FRAME", "ceil(area_m2 ÷ wet_zone_frame_test_interval_m2)", ["area_m2", "wet_zone_frame_test_interval_m2"], "test", (v) => Math.ceil(v.area_m2 / v.wet_zone_frame_test_interval_m2), { sp_locator: "СП КР 65-101:2025, пп. 4.4–4.9; требования проекта и паспорта влажностойкой системы" }),
    );
    massExpression += " + area_m2 × wet_zone_corrosion_protection_rate_kg_m2";
    massInputs.push("wet_zone_corrosion_protection_rate_kg_m2");
    const previous = massCalculate;
    massCalculate = (v) => previous(v) + v.area_m2 * v.wet_zone_corrosion_protection_rate_kg_m2;
  }

  rows.push(
    row(t, "frame_transport", "Логистика", "transport", "Транспортная работа поставки ресурсов FRAME", `((${massExpression}) ÷ 1000) × delivery_distance_km`, [...massInputs, "delivery_distance_km"], "t_km", (v) => (massCalculate(v) / 1000) * v.delivery_distance_km, { scopes: "FULL_ONLY", krer_locator: "КРЕР 10-05-011-02, ресурсная ведомость; расстояние — проектный логистический ввод" }),
    row(t, "frame_loading_labor", "Логистика", "labor", "Погрузка, разгрузка и подъем ресурсов FRAME", `(${massExpression}) ÷ loading_productivity_kg_per_man_hour`, [...massInputs, "loading_productivity_kg_per_man_hour"], "man_hour", (v) => massCalculate(v) / v.loading_productivity_kg_per_man_hour, { scopes: "FULL_ONLY" }),
    row(t, "frame_waste_output", "Отходы", "waste", "Материальный баланс отходов FRAME", `(${massExpression}) × waste_percent ÷ 100`, [...massInputs, "waste_percent"], "kg", (v) => massCalculate(v) * v.waste_percent / 100, { scopes: "FULL_ONLY", cost_ownership: "informational_output", procurement_eligible: false }),
    row(t, "frame_waste_handling_labor", "Отходы", "labor", "Сбор и перемещение отходов FRAME", `((${massExpression}) × waste_percent ÷ 100) ÷ waste_handling_productivity_kg_per_man_hour`, [...massInputs, "waste_percent", "waste_handling_productivity_kg_per_man_hour"], "man_hour", (v) => (massCalculate(v) * v.waste_percent / 100) / v.waste_handling_productivity_kg_per_man_hour, { scopes: "FULL_ONLY" }),
    row(t, "frame_geometry_tests", "Контроль качества", "testing", "Приемка геометрии, плоскости и отметок FRAME", "ceil(area_m2 ÷ qa_interval_m2_per_test)", ["area_m2", "qa_interval_m2_per_test"], "test", (v) => Math.ceil(v.area_m2 / v.qa_interval_m2_per_test), { scopes: "FULL_ONLY", sp_locator: "СП КР 65-101:2025, п. 7.7.1 и таблица 7.8" }),
    row(t, "frame_documentation", "Исполнительная документация", "documentation", "Акты скрытых работ и приемки FRAME", "documentation_record_count", ["documentation_record_count"], "item", (v) => v.documentation_record_count, { scopes: "FULL_ONLY", sp_locator: "СП КР 65-101:2025, пп. 4.4–4.9" }),
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
    numeric("plane_qa_interval_m2_per_test", "Площадь на одну приемку плоскости", "m2_per_test", "CONTROL_PLAN_VALUE"),
    numeric("delivery_distance_km", "Расстояние поставки регулировочных расходников", "km", "LOGISTICS_VALUE", FULL_SCOPE, 0.1, 5_000),
    numeric("loading_productivity_kg_per_man_hour", "Производительность обращения с расходниками ALIGN", "kg_per_man_hour", "NORM_RATE", FULL_SCOPE),
    numeric("waste_percent", "Проектный процент отходов регулировочных расходников", "percent", "PROJECT_QUANTITY", FULL_SCOPE, 0.01, 50),
    numeric("waste_handling_productivity_kg_per_man_hour", "Производительность обращения с отходами ALIGN", "kg_per_man_hour", "NORM_RATE", FULL_SCOPE),
    numeric("documentation_record_count", "Количество актов и записей ALIGN", "item", "CONTROL_PLAN_VALUE", FULL_SCOPE, 1, 10_000),
  ];
  let massExpression = "alignment_point_count × adjustment_consumable_item_per_point × adjustment_consumable_mass_kg_item + reference_line_length_m × reference_line_consumable_mass_kg_m";
  let massInputs = ["alignment_point_count", "adjustment_consumable_item_per_point", "adjustment_consumable_mass_kg_item", "reference_line_length_m", "reference_line_consumable_mass_kg_m"];
  let massCalculate = (v: Readonly<Record<string, number>>) =>
    v.alignment_point_count * v.adjustment_consumable_item_per_point * v.adjustment_consumable_mass_kg_item +
    v.reference_line_length_m * v.reference_line_consumable_mass_kg_m;
  const rows: RowSpec[] = [
    row(t, "reference_plane_survey", "Геодезическая проверка", "labor", "Съемка опорной плоскости принятого каркаса", "reference_grid_point_count ÷ survey_productivity_point_per_man_hour", ["reference_grid_point_count", "survey_productivity_point_per_man_hour"], "man_hour", (v) => v.reference_grid_point_count / v.survey_productivity_point_per_man_hour, { krer_locator: "КРЕР 10-05-011-02, состав работ п. 1; ALIGN выделен по проектному журналу", sp_locator: "СП КР 65-101:2025, п. 7.7.1" }),
    row(t, "reference_line_consumables", "Опорная плоскость", "material", "Разметочные расходники опорной плоскости", "reference_line_length_m", ["reference_line_length_m"], "m", (v) => v.reference_line_length_m, { krer_locator: "КРЕР 10-05-011-02, состав работ п. 1; расход по проектной карте ALIGN" }),
    row(t, "adjustment_consumables", "Регулировка", "material", "Регулировочные расходники существующих узлов без повторного каркаса", "alignment_point_count × adjustment_consumable_item_per_point", ["alignment_point_count", "adjustment_consumable_item_per_point"], "item", (v) => v.alignment_point_count * v.adjustment_consumable_item_per_point, { krer_locator: "КРЕР 10-05-011-02, состав работ пп. 4–6; только регулировочные расходники, профили исключены" }),
    row(t, "alignment_labor", "Регулировка", "labor", "Регулировка существующих узлов каркаса по опорной плоскости", "alignment_point_count ÷ adjustment_productivity_point_per_man_hour", ["alignment_point_count", "adjustment_productivity_point_per_man_hour"], "man_hour", (v) => v.alignment_point_count / v.adjustment_productivity_point_per_man_hour, { krer_locator: "КРЕР 10-05-011-02, состав работ пп. 4–6; трудовой расход по проверенной разбивке", sp_locator: "СП КР 65-101:2025, п. 7.7.1" }),
    row(t, "laser_alignment_equipment", "Инструментальный контроль", "equipment", "Лазерный нивелир для ALIGN", "reference_grid_point_count ÷ laser_productivity_point_per_machine_hour", ["reference_grid_point_count", "laser_productivity_point_per_machine_hour"], "machine_hour", (v) => v.reference_grid_point_count / v.laser_productivity_point_per_machine_hour, { krer_locator: "КРЕР 10-05-011-02, ресурсная ведомость; приборный маршрут подтверждается ППР", sp_locator: "СП КР 65-101:2025, п. 7.7.1 и таблица 7.8" }),
    row(t, "local_correction_labor", "Локальная коррекция", "labor", "Локальная коррекция узлов без замены профилей", "local_correction_point_count ÷ local_correction_productivity_point_per_man_hour", ["local_correction_point_count", "local_correction_productivity_point_per_man_hour"], "man_hour", (v) => v.local_correction_point_count / v.local_correction_productivity_point_per_man_hour, { krer_locator: "КРЕР 10-05-011-02, состав работ пп. 4–6; повторная стоимость каркаса запрещена" }),
    row(t, "plane_acceptance_tests", "Контроль качества", "testing", "Измерительная приемка плоскости ALIGN", "ceil(area_m2 ÷ plane_qa_interval_m2_per_test)", ["area_m2", "plane_qa_interval_m2_per_test"], "test", (v) => Math.ceil(v.area_m2 / v.plane_qa_interval_m2_per_test), { sp_locator: "СП КР 65-101:2025, пп. 7.7.4–7.7.5 и таблица 7.8" }),
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
  rows.push(
    row(t, "align_transport", "Логистика", "transport", "Транспортная работа регулировочных расходников ALIGN", `((${massExpression}) ÷ 1000) × delivery_distance_km`, [...massInputs, "delivery_distance_km"], "t_km", (v) => (massCalculate(v) / 1000) * v.delivery_distance_km, { scopes: "FULL_ONLY" }),
    row(t, "align_loading_labor", "Логистика", "labor", "Погрузка и подъем регулировочных расходников ALIGN", `(${massExpression}) ÷ loading_productivity_kg_per_man_hour`, [...massInputs, "loading_productivity_kg_per_man_hour"], "man_hour", (v) => massCalculate(v) / v.loading_productivity_kg_per_man_hour, { scopes: "FULL_ONLY" }),
    row(t, "align_waste_output", "Отходы", "waste", "Материальный баланс отходов ALIGN", `(${massExpression}) × waste_percent ÷ 100`, [...massInputs, "waste_percent"], "kg", (v) => massCalculate(v) * v.waste_percent / 100, { scopes: "FULL_ONLY", cost_ownership: "informational_output", procurement_eligible: false }),
    row(t, "align_waste_handling_labor", "Отходы", "labor", "Сбор отходов регулировочных расходников ALIGN", `((${massExpression}) × waste_percent ÷ 100) ÷ waste_handling_productivity_kg_per_man_hour`, [...massInputs, "waste_percent", "waste_handling_productivity_kg_per_man_hour"], "man_hour", (v) => (massCalculate(v) * v.waste_percent / 100) / v.waste_handling_productivity_kg_per_man_hour, { scopes: "FULL_ONLY" }),
    row(t, "align_documentation", "Исполнительная документация", "documentation", "Акт приемки плоскости и журнал ALIGN", "documentation_record_count", ["documentation_record_count"], "item", (v) => v.documentation_record_count, { scopes: "FULL_ONLY", sp_locator: "СП КР 65-101:2025, пп. 4.7–4.9" }),
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
    numeric("board_cutting_waste_percent", "Проектный процент отходов раскроя листов", "percent", "PROJECT_QUANTITY", BOTH_SCOPES, 0.01, 50),
    numeric("fastener_rate_item_m2_layer", "Расход самонарезающих винтов на м² одного слоя", "item_per_m2_layer", "MATERIAL_PASSPORT_VALUE"),
    numeric("board_mass_kg_m2", "Масса выбранного листа по паспорту", "kg_per_m2", "MATERIAL_PASSPORT_VALUE"),
    numeric("fastener_mass_kg_item", "Масса одного винта по паспорту", "kg_per_item", "MATERIAL_PASSPORT_VALUE"),
    numeric("sheet_cutting_productivity_m2_per_man_hour", "Производительность раскроя выбранного листа", "m2_per_man_hour", "NORM_RATE"),
    numeric("sheet_fixing_productivity_m2_per_man_hour", "Производительность крепления листов", "m2_per_man_hour", "NORM_RATE"),
    numeric("screwdriver_productivity_m2_per_machine_hour", "Производительность шуруповерта", "m2_per_machine_hour", "NORM_RATE"),
    numeric("cladding_qa_interval_m2_per_test", "Площадь на одну приемочную проверку CLAD", "m2_per_test", "CONTROL_PLAN_VALUE"),
    numeric("delivery_distance_km", "Расстояние доставки листов и винтов", "km", "LOGISTICS_VALUE", FULL_SCOPE, 0.1, 5_000),
    numeric("loading_productivity_kg_per_man_hour", "Производительность погрузки и подъема CLAD", "kg_per_man_hour", "NORM_RATE", FULL_SCOPE),
    numeric("sheet_lift_productivity_kg_per_machine_hour", "Производительность листового подъемника", "kg_per_machine_hour", "NORM_RATE", FULL_SCOPE),
    numeric("waste_handling_productivity_kg_per_man_hour", "Производительность обращения с отходами листов", "kg_per_man_hour", "NORM_RATE", FULL_SCOPE),
    numeric("documentation_record_count", "Количество актов и записей CLAD", "item", "CONTROL_PLAN_VALUE", FULL_SCOPE, 1, 10_000),
  ];
  const netBoardExpression = "area_m2 × board_layer_count";
  const grossBoardExpression = `(${netBoardExpression}) × (1 + board_cutting_waste_percent ÷ 100)`;
  const screwExpression = "ceil(area_m2 × board_layer_count × fastener_rate_item_m2_layer)";
  const baseMassExpression = `(${grossBoardExpression}) × board_mass_kg_m2 + (${screwExpression}) × fastener_mass_kg_item`;
  const baseMassInputs = ["area_m2", "board_layer_count", "board_cutting_waste_percent", "board_mass_kg_m2", "fastener_rate_item_m2_layer", "fastener_mass_kg_item"];
  const grossBoard = (v: Readonly<Record<string, number>>) => v.area_m2 * v.board_layer_count * (1 + v.board_cutting_waste_percent / 100);
  const screwCount = (v: Readonly<Record<string, number>>) => Math.ceil(v.area_m2 * v.board_layer_count * v.fastener_rate_item_m2_layer);
  const baseMass = (v: Readonly<Record<string, number>>) => grossBoard(v) * v.board_mass_kg_m2 + screwCount(v) * v.fastener_mass_kg_item;
  let massExpression = baseMassExpression;
  let massInputs = [...baseMassInputs];
  let massCalculate = baseMass;
  const rows: RowSpec[] = [
    row(t, "gypsum_board_sheets", "Листовая обшивка", "material", `Листы ${inventory.localized_name_ru}`, grossBoardExpression, ["area_m2", "board_layer_count", "board_cutting_waste_percent"], "m2", grossBoard, { krer_locator: "КРЕР 10-05-011-02, состав работ п. 8; ресурс С01-4402-0002" }),
    row(t, "sheet_screws", "Крепеж листов", "material", "Самонарезающие винты крепления листов", screwExpression, ["area_m2", "board_layer_count", "fastener_rate_item_m2_layer"], "item", screwCount, { krer_locator: "КРЕР 10-05-011-02, состав работ п. 8; ресурс С01-0505-0005" }),
    row(t, "sheet_cutting_labor", "Труд", "labor", "Раскрой листов по карте раскроя", `(${grossBoardExpression}) ÷ sheet_cutting_productivity_m2_per_man_hour`, ["area_m2", "board_layer_count", "board_cutting_waste_percent", "sheet_cutting_productivity_m2_per_man_hour"], "man_hour", (v) => grossBoard(v) / v.sheet_cutting_productivity_m2_per_man_hour, { krer_locator: "КРЕР 10-05-011-02, состав работ п. 8; строка 1 «Затраты труда рабочих»", sp_locator: "СП КР 65-101:2025, п. 7.7.2" }),
    row(t, "sheet_fixing_labor", "Труд", "labor", "Крепление листов к принятому каркасу", `(${netBoardExpression}) ÷ sheet_fixing_productivity_m2_per_man_hour`, ["area_m2", "board_layer_count", "sheet_fixing_productivity_m2_per_man_hour"], "man_hour", (v) => (v.area_m2 * v.board_layer_count) / v.sheet_fixing_productivity_m2_per_man_hour, { krer_locator: "КРЕР 10-05-011-02, состав работ п. 8; строка 1 «Затраты труда рабочих»", sp_locator: "СП КР 65-101:2025, пп. 7.7.1–7.7.2" }),
    row(t, "screwdriver_equipment", "Оборудование", "equipment", "Шуруповерт для крепления листов", `(${netBoardExpression}) ÷ screwdriver_productivity_m2_per_machine_hour`, ["area_m2", "board_layer_count", "screwdriver_productivity_m2_per_machine_hour"], "machine_hour", (v) => (v.area_m2 * v.board_layer_count) / v.screwdriver_productivity_m2_per_machine_hour, { krer_locator: "КРЕР 10-05-011-02, машина Х33-0840" }),
    row(t, "cladding_acceptance_tests", "Контроль качества", "testing", "Приемка плоскости, жесткости и стыков листов", "ceil(area_m2 ÷ cladding_qa_interval_m2_per_test)", ["area_m2", "cladding_qa_interval_m2_per_test"], "test", (v) => Math.ceil(v.area_m2 / v.cladding_qa_interval_m2_per_test), { sp_locator: "СП КР 65-101:2025, пп. 7.7.4–7.7.5 и таблица 7.8" }),
  ];
  if (variant === "large_area") {
    parameters.push(
      numeric("large_area_staging_zone_count", "Количество зон подачи листов", "item", "PROJECT_QUANTITY", BOTH_SCOPES, 1, 100_000),
      numeric("large_area_staging_productivity_zone_per_machine_hour", "Производительность перестановки подъемника", "item_per_machine_hour", "NORM_RATE"),
    );
    rows.push(row(t, "large_area_sheet_staging", "Большая площадь", "equipment", "Перестановка листового подъемника между зонами", "large_area_staging_zone_count ÷ large_area_staging_productivity_zone_per_machine_hour", ["large_area_staging_zone_count", "large_area_staging_productivity_zone_per_machine_hour"], "machine_hour", (v) => v.large_area_staging_zone_count / v.large_area_staging_productivity_zone_per_machine_hour));
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
    );
    rows.push(
      row(t, "technical_opening_cutting", "Инженерные проходы", "labor", "Вырезы листов у инженерных проходов", "technical_service_opening_count × technical_opening_perimeter_m_item ÷ technical_opening_cut_productivity_m_per_man_hour", ["technical_service_opening_count", "technical_opening_perimeter_m_item", "technical_opening_cut_productivity_m_per_man_hour"], "man_hour", (v) => (v.technical_service_opening_count * v.technical_opening_perimeter_m_item) / v.technical_opening_cut_productivity_m_per_man_hour),
      row(t, "technical_opening_screws", "Инженерные проходы", "material", "Дополнительные винты кромок инженерных проходов", "ceil(technical_service_opening_count × technical_opening_perimeter_m_item ÷ technical_opening_fastener_spacing_m)", ["technical_service_opening_count", "technical_opening_perimeter_m_item", "technical_opening_fastener_spacing_m"], "item", (v) => Math.ceil((v.technical_service_opening_count * v.technical_opening_perimeter_m_item) / v.technical_opening_fastener_spacing_m), { krer_locator: "КРЕР 10-05-011-02, ресурс С01-0505-0005; количество по проектным проходам" }),
    );
    massExpression += " + ceil(technical_service_opening_count × technical_opening_perimeter_m_item ÷ technical_opening_fastener_spacing_m) × fastener_mass_kg_item";
    massInputs.push("technical_service_opening_count", "technical_opening_perimeter_m_item", "technical_opening_fastener_spacing_m");
    const previous = massCalculate;
    massCalculate = (v) => previous(v) + Math.ceil((v.technical_service_opening_count * v.technical_opening_perimeter_m_item) / v.technical_opening_fastener_spacing_m) * v.fastener_mass_kg_item;
  } else if (variant === "wet_zone") {
    parameters.push(
      numeric("wet_zone_penetration_count", "Количество герметизируемых проходов влажной зоны", "item", "PROJECT_QUANTITY", BOTH_SCOPES, 1, 100_000),
      numeric("wet_zone_sealant_kg_per_penetration", "Расход совместимого герметика на проход", "kg_per_item", "MATERIAL_PASSPORT_VALUE"),
      numeric("wet_zone_cladding_test_interval_m2", "Интервал контроля влагостойкой обшивки", "m2_per_test", "CONTROL_PLAN_VALUE"),
    );
    rows.push(
      row(t, "wet_zone_penetration_sealant", "Влажная зона", "material", "Совместимый герметик проходов листовой обшивки", "wet_zone_penetration_count × wet_zone_sealant_kg_per_penetration", ["wet_zone_penetration_count", "wet_zone_sealant_kg_per_penetration"], "kg", (v) => v.wet_zone_penetration_count * v.wet_zone_sealant_kg_per_penetration, { krer_locator: "КРЕР 10-05-011-02; герметизация — по проекту и паспорту влагостойкой системы" }),
      row(t, "wet_zone_cladding_tests", "Влажная зона", "testing", "Контроль листов, крепежа и проходов влажной зоны", "ceil(area_m2 ÷ wet_zone_cladding_test_interval_m2)", ["area_m2", "wet_zone_cladding_test_interval_m2"], "test", (v) => Math.ceil(v.area_m2 / v.wet_zone_cladding_test_interval_m2), { sp_locator: "СП КР 65-101:2025, пп. 4.4–4.9, 7.7.4–7.7.5; паспорт влагостойкой системы" }),
    );
    massExpression += " + wet_zone_penetration_count × wet_zone_sealant_kg_per_penetration";
    massInputs.push("wet_zone_penetration_count", "wet_zone_sealant_kg_per_penetration");
    const previous = massCalculate;
    massCalculate = (v) => previous(v) + v.wet_zone_penetration_count * v.wet_zone_sealant_kg_per_penetration;
  } else if (variant === "high_load") {
    parameters.push(
      numeric("design_load_kn_m2", "Расчетная нагрузка высоконагруженной обшивки", "kN_per_m2", "PROJECT_QUANTITY"),
      numeric("design_verification_capacity_kn_per_test", "Нагрузка, охватываемая одной проверкой проекта", "kN_per_test", "CONTROL_PLAN_VALUE"),
    );
    rows.push(row(t, "high_load_design_verification", "Высокая нагрузка", "testing", "Проверка листовой схемы и крепежа по расчетной нагрузке", "ceil(area_m2 × design_load_kn_m2 ÷ design_verification_capacity_kn_per_test)", ["area_m2", "design_load_kn_m2", "design_verification_capacity_kn_per_test"], "test", (v) => Math.ceil((v.area_m2 * v.design_load_kn_m2) / v.design_verification_capacity_kn_per_test), { sp_locator: "СП КР 65-101:2025, пп. 7.7.1–7.7.5; расчет нагрузки и паспорт высоконагруженной системы" }));
  }
  rows.push(
    row(t, "clad_transport", "Логистика", "transport", "Транспортная работа поставки листов и винтов CLAD", `((${massExpression}) ÷ 1000) × delivery_distance_km`, [...massInputs, "delivery_distance_km"], "t_km", (v) => (massCalculate(v) / 1000) * v.delivery_distance_km, { scopes: "FULL_ONLY" }),
    row(t, "clad_loading_labor", "Логистика", "labor", "Погрузка, разгрузка и подъем листов CLAD", `(${massExpression}) ÷ loading_productivity_kg_per_man_hour`, [...massInputs, "loading_productivity_kg_per_man_hour"], "man_hour", (v) => massCalculate(v) / v.loading_productivity_kg_per_man_hour, { scopes: "FULL_ONLY" }),
    row(t, "sheet_lift_equipment", "Логистика", "equipment", "Листовой подъемник", `(${massExpression}) ÷ sheet_lift_productivity_kg_per_machine_hour`, [...massInputs, "sheet_lift_productivity_kg_per_machine_hour"], "machine_hour", (v) => massCalculate(v) / v.sheet_lift_productivity_kg_per_machine_hour, { scopes: "FULL_ONLY" }),
    row(t, "sheet_cutting_waste", "Отходы", "waste", "Баланс отходов раскроя листов", `(${netBoardExpression}) × board_cutting_waste_percent ÷ 100`, ["area_m2", "board_layer_count", "board_cutting_waste_percent"], "m2", (v) => v.area_m2 * v.board_layer_count * v.board_cutting_waste_percent / 100, { scopes: "FULL_ONLY", cost_ownership: "informational_output", procurement_eligible: false }),
    row(t, "clad_waste_handling_labor", "Отходы", "labor", "Сбор и перемещение отходов листов", `((${netBoardExpression}) × board_cutting_waste_percent ÷ 100 × board_mass_kg_m2) ÷ waste_handling_productivity_kg_per_man_hour`, ["area_m2", "board_layer_count", "board_cutting_waste_percent", "board_mass_kg_m2", "waste_handling_productivity_kg_per_man_hour"], "man_hour", (v) => (v.area_m2 * v.board_layer_count * v.board_cutting_waste_percent / 100 * v.board_mass_kg_m2) / v.waste_handling_productivity_kg_per_man_hour, { scopes: "FULL_ONLY" }),
    row(t, "clad_documentation", "Исполнительная документация", "documentation", "Акт приемки листовой обшивки CLAD", "documentation_record_count", ["documentation_record_count"], "item", (v) => v.documentation_record_count, { scopes: "FULL_ONLY", sp_locator: "СП КР 65-101:2025, пп. 4.7–4.9" }),
  );
  return { parameters, rows };
}

function contractFor(inventory: InteriorFinishesDomainInventoryRow): DrywallCeilingBulkheadProfessionalWorkContractV3 {
  const group = groupOf(inventory.catalog_id);
  const variant = variantOf(inventory.catalog_id);
  const groupData = group === "FRAME" ? {
    order: 1 as const,
    required: ["SETTING_OUT", "PERIMETER_PROFILE_INSTALL", "PRIMARY_FRAME_INSTALL", "FRAME_GEOMETRY_CONTROL"],
    optional: ["OPENING_REINFORCEMENT", "HIGH_LOAD_REINFORCEMENT", "MOISTURE_PROTECTION_INTERFACE"],
    owned: ["perimeter profiles", "primary profiles", "suspensions/connectors", "anchors", "frame labor", "frame geometry acceptance"],
    forbidden: ["gypsum board sheets", "sheet fixing labor", "joint finishing", "final decoration"],
    dependencies: [],
  } : group === "ALIGN" ? {
    order: 2 as const,
    required: ["GEOMETRY_SURVEY", "REFERENCE_PLANE_SETUP", "SYSTEM_ALIGNMENT", "PLANE_CONTROL"],
    optional: ["LOCAL_CORRECTION", "HANGER_ADJUSTMENT"],
    owned: ["reference plane survey", "alignment labor", "adjustment consumables", "plane acceptance"],
    forbidden: ["base frame installation", "gypsum board sheets", "joint finishing", "final decoration"],
    dependencies: ["accepted_frame_revision_id"],
  } : {
    order: 3 as const,
    required: ["FRAME_ACCEPTANCE", "SHEET_CUTTING", "SHEET_FIXING", "JOINT_GEOMETRY_CONTROL"],
    optional: ["SECOND_SHEET_LAYER", "OPENING_DETAILS", "MOISTURE_RESISTANT_BOARD", "FIRE_RATED_BOARD"],
    owned: ["gypsum board sheets", "sheet screws", "sheet cutting and fixing labor", "sheet waste", "cladding acceptance"],
    forbidden: ["frame profiles", "frame installation", "joint compound and tape", "final decoration"],
    dependencies: ["accepted_frame_revision_id", "accepted_alignment_revision_id"],
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
    ...allParameters
      .filter((item) => item.role === "DEPENDENCY_REFERENCE")
      .map((item) => item.parameter_id),
  ])];
  const dependencies = contract.non_cost_dependencies.map((id) =>
    id === "accepted_frame_revision_id"
      ? "typed-child:FRAME:accepted_frame_revision_id"
      : "typed-child:ALIGN:accepted_alignment_revision_id");
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
      semantic_owner: drywallCeilingBulkheadProfessionalOwnerIdV3(inventory.catalog_id),
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
