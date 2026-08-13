import type {
  ProfessionalAssemblyFormulaV4,
  ProfessionalAssemblyParameterDefinitionV4,
  ProfessionalAssemblyRowDefinitionV4,
  ProfessionalChildAssemblyV4,
} from "../../professionalProjectAssemblyV4";
import {
  createProfessionalEstimateDomainFactoryV1,
  type ProfessionalAssemblyProfileV1,
  type ProfessionalCanonicalTechnologyV1,
  type ProfessionalDomainParameterDefinitionV1,
  type ProfessionalDomainParameterSchemaV1,
  type ProfessionalEstimateDomainPackageV1,
  type ProfessionalFormulaPackV1,
  type ProfessionalNormativeProfileV1,
  type ProfessionalResourceCompletenessPolicyV1,
} from "../../domainFactory";
import { INTERIOR_FINISHES_WAVE_1_DOMAIN_PACKAGE } from "../interiorFinishesWave1";
import {
  INTERIOR_FINISHES_COMPLETE_DOMAIN_ID,
  INTERIOR_FINISHES_COMPLETE_DOMAIN_VERSION,
  INTERIOR_FINISHES_COMPLETE_RECORD_COUNT,
  INTERIOR_FINISHES_DOMAIN_CATALOG_BINDINGS,
  INTERIOR_FINISHES_NEW_INVENTORY,
  type InteriorFinishesDomainInventoryRow,
} from "./inventory";
import {
  INTERIOR_SCOPE_LABELS_RU,
  interiorMaterialLabelRu,
  interiorMaterialSystemKey,
  interiorOperationProfile,
  type InteriorFormulaKind,
} from "./technologyProfiles";
import {
  buildDrywallCeilingBulkheadProfessionalPackagePartsV3,
} from "./drywallCeilingBulkheadProfessionalV3";
import {
  buildDrywallArchitecturalElementProfessionalPackagePartsV4,
  buildDrywallFlatCeilingProfessionalPackagePartsV6,
  isDrywallFlatCeilingProfessionalCatalogIdV6,
} from "./drywallArchitecturalElementsProfessionalV4";

const ALWAYS = { kind: "ALWAYS" } as const;
const FULL_ONLY = { kind: "EQUALS", parameter_id: "estimate_scope_mode", value: "FULL_APPLICABLE_SCOPE" } as const;

type InteriorProfessionalOverlayV4 = {
  contract: { group: string; variant: string };
  schema: ProfessionalDomainParameterSchemaV1;
  child_assemblies: readonly ProfessionalChildAssemblyV4[];
  normative_profile: ProfessionalNormativeProfileV1;
  required_stages: readonly string[];
  optional_stages: readonly string[];
  resource_policy: ProfessionalResourceCompletenessPolicyV1;
};

type InteriorProfessionalOverlayProviderV4 = (
  inventory: InteriorFinishesDomainInventoryRow,
) => InteriorProfessionalOverlayV4 | null;

const INTERIOR_PROFESSIONAL_OVERLAY_PROVIDERS_V4: readonly InteriorProfessionalOverlayProviderV4[] = Object.freeze([
  buildDrywallCeilingBulkheadProfessionalPackagePartsV3,
  buildDrywallArchitecturalElementProfessionalPackagePartsV4,
  buildDrywallFlatCeilingProfessionalPackagePartsV6,
]);

function resolveInteriorProfessionalOverlayV4(
  inventory: InteriorFinishesDomainInventoryRow,
): InteriorProfessionalOverlayV4 | null {
  const matches = INTERIOR_PROFESSIONAL_OVERLAY_PROVIDERS_V4
    .map((provider) => provider(inventory))
    .filter((value): value is InteriorProfessionalOverlayV4 => value !== null);
  if (matches.length > 1) {
    throw new Error(`INTERIOR_PROFESSIONAL_OWNER_DUPLICATE:${inventory.catalog_id}`);
  }
  return matches[0] ?? null;
}

function parameter(
  parameter_id: string,
  label_ru: string,
  input_type: ProfessionalDomainParameterDefinitionV1["input_type"],
  priority: ProfessionalDomainParameterDefinitionV1["priority"],
  unit_id: string | null,
  formula_consumers: readonly string[],
  options: {
    minimum?: number;
    maximum?: number;
    choices?: readonly { value: string; label_ru: string }[];
    fullOnly?: boolean;
  } = {},
): ProfessionalDomainParameterDefinitionV1 {
  const condition = options.fullOnly ? FULL_ONLY : ALWAYS;
  return {
    parameter_id,
    label_ru,
    unit_id,
    priority,
    input_type,
    ...(options.minimum == null ? {} : { minimum: options.minimum }),
    ...(options.maximum == null ? {} : { maximum: options.maximum }),
    ...(options.choices ? { choices: options.choices } : {}),
    visible_when: condition,
    required_when: condition,
    formula_consumers,
    source_ownership: ["USER_EXPLICIT", "PROJECT_DOCUMENT", "MATERIAL_PASSPORT", "APPLICABLE_NORM"],
  };
}

function formulaParameters(kind: InteriorFormulaKind): ProfessionalDomainParameterDefinitionV1[] {
  if (kind === "LAYER_KG") {
    return [
      parameter("layer_thickness_mm", "Толщина технологического слоя по проекту", "number", "P0", "mm", ["primary_material"], { minimum: 0.1, maximum: 500 }),
      parameter("material_consumption_kg_m2_mm", "Расход выбранного состава на 1 м² при толщине 1 мм", "number", "P0", "kg_per_m2_mm", ["primary_material"], { minimum: 0.001, maximum: 100 }),
    ];
  }
  if (kind === "COAT_KG") {
    return [
      parameter("coat_count", "Количество технологических слоёв по проекту", "number", "P0", "item", ["primary_material"], { minimum: 1, maximum: 20 }),
      parameter("material_consumption_kg_m2_coat", "Расход выбранного состава на 1 м² одного слоя", "number", "P0", "kg_per_m2_coat", ["primary_material"], { minimum: 0.001, maximum: 100 }),
    ];
  }
  if (kind === "AREA_MATERIAL") {
    return [
      parameter("material_consumption_m2_m2", "Расход выбранного материала с учётом проектного раскроя", "number", "P0", "m2_per_m2", ["primary_material"], { minimum: 0.001, maximum: 10 }),
      parameter("material_mass_kg_per_unit", "Масса 1 м² выбранного материала", "number", "P0", "kg_per_m2", ["material_mass"], { minimum: 0.001, maximum: 1_000 }),
    ];
  }
  return [
    parameter("material_consumption_kg_m2", "Расход выбранного состава или расходника на 1 м²", "number", "P0", "kg_per_m2", ["primary_material"], { minimum: 0.001, maximum: 1_000 }),
  ];
}

function repairRequired(row: InteriorFinishesDomainInventoryRow): boolean {
  return row.scope_capability === "repair" || ["repair", "replace"].includes(row.work_type);
}

function scopeParameters(
  row: InteriorFinishesDomainInventoryRow,
): ProfessionalDomainParameterDefinitionV1[] {
  const scope = row.scope_capability;
  const result: ProfessionalDomainParameterDefinitionV1[] = [];
  if (scope === "small_area") {
    result.push(parameter("small_area_detail_productivity_m2_per_man_hour", "Производительность ручной доводки малой площади", "number", "P1", "m2_per_man_hour", ["small_area_detail_labor"], { minimum: 0.01, maximum: 10_000, fullOnly: true }));
  }
  if (scope === "large_area") {
    result.push(parameter("large_area_handling_productivity_kg_per_machine_hour", "Производительность механизированной подачи материалов", "number", "P1", "kg_per_machine_hour", ["large_area_handling_equipment"], { minimum: 0.01, maximum: 100_000, fullOnly: true }));
  }
  if (scope === "wet_zone") {
    result.push(
      parameter("wet_zone_protection_rate_kg_m2", "Расход совместимой защиты примыканий мокрой зоны", "number", "P1", "kg_per_m2", ["wet_zone_protection_material"], { minimum: 0.001, maximum: 100, fullOnly: true }),
      parameter("wet_zone_test_interval_m2", "Площадь на одну проверку влажности и непрерывности защиты", "number", "P1", "m2_per_test", ["wet_zone_tests"], { minimum: 0.01, maximum: 1_000_000, fullOnly: true }),
    );
  }
  if (scope === "technical_room") {
    result.push(
      parameter("technical_protection_rate_kg_m2", "Расход защитного материала технического помещения", "number", "P1", "kg_per_m2", ["technical_protection_material"], { minimum: 0.001, maximum: 100, fullOnly: true }),
      parameter("technical_detail_productivity_m2_per_man_hour", "Производительность обработки вводов и примыканий", "number", "P1", "m2_per_man_hour", ["technical_detail_labor"], { minimum: 0.01, maximum: 10_000, fullOnly: true }),
    );
  }
  if (scope === "high_load") {
    result.push(
      parameter("high_load_reinforcement_rate_m2_m2", "Расход армирующего слоя зоны высокой нагрузки", "number", "P1", "m2_per_m2", ["high_load_reinforcement_material"], { minimum: 0.001, maximum: 10, fullOnly: true }),
      parameter("high_load_reinforcement_productivity_m2_per_man_hour", "Производительность монтажа армирующего слоя", "number", "P1", "m2_per_man_hour", ["high_load_reinforcement_labor"], { minimum: 0.01, maximum: 10_000, fullOnly: true }),
    );
  }
  if (repairRequired(row)) {
    result.push(
      parameter("removal_area_m2", "Площадь удаления существующей отделки", "number", "P1", "m2", ["repair_removal_labor", "repair_removed_waste", "repair_waste_transport"], { minimum: 0.001, maximum: 10_000_000, fullOnly: true }),
      parameter("removed_mass_kg_m2", "Масса удаляемой отделки на 1 м²", "number", "P1", "kg_per_m2", ["repair_removed_waste", "repair_waste_transport"], { minimum: 0.001, maximum: 10_000, fullOnly: true }),
      parameter("removal_productivity_m2_per_man_hour", "Производительность удаления существующей отделки", "number", "P1", "m2_per_man_hour", ["repair_removal_labor"], { minimum: 0.01, maximum: 10_000, fullOnly: true }),
      parameter("repair_waste_haul_distance_km", "Расстояние вывоза демонтированной отделки", "number", "P1", "km", ["repair_waste_transport"], { minimum: 0.1, maximum: 5_000, fullOnly: true }),
    );
  }
  return result;
}

function schemaFor(row: InteriorFinishesDomainInventoryRow): ProfessionalDomainParameterSchemaV1 {
  const profile = interiorOperationProfile(row);
  const technologyId = row.canonical_technology_id;
  return {
    schema_id: `${technologyId}:parameter-schema:v1`,
    schema_version: "1.0.0",
    technology_id: technologyId,
    parameters: [
      parameter("work_included", "Выбранная операция включена в объём проекта", "boolean", "P0", null, [], { choices: [{ value: "true", label_ru: "Да" }, { value: "false", label_ru: "Нет" }] }),
      parameter("estimate_scope_mode", "Состав расчёта", "choice", "P0", null, [], { choices: [{ value: "MINIMAL_EXPLICIT_SCOPE", label_ru: "Минимальный явно выбранный состав" }, { value: "FULL_APPLICABLE_SCOPE", label_ru: "Полный применимый состав" }] }),
      parameter("scope_capability", "Условия участка", "choice", "P0", null, [], { choices: [{ value: row.scope_capability, label_ru: INTERIOR_SCOPE_LABELS_RU[row.scope_capability] }] }),
      parameter("funding_source", "Источник финансирования проекта", "choice", "P0", null, [], { choices: [{ value: "PRIVATE_RECOMMENDED", label_ru: "Частное финансирование" }, { value: "STATE_BUDGET", label_ru: "Государственный бюджет" }, { value: "EXTRA_BUDGETARY_FUND", label_ru: "Внебюджетный фонд" }] }),
      parameter("project_type", "Тип объекта по проекту", "text", "P0", null, []),
      parameter("area_m2", "Площадь отделочной поверхности", "number", "P2", "m2", ["area_m2"], { minimum: 0.01, maximum: 10_000_000 }),
      parameter("length_m", "Длина участка", "number", "P2", "m", ["area_m2"], { minimum: 0.01, maximum: 100_000 }),
      parameter("width_m", "Ширина или высота участка", "number", "P2", "m", ["area_m2"], { minimum: 0.01, maximum: 100_000 }),
      parameter("surface_type", "Материал и тип основания", "choice", "P0", null, [], { choices: [{ value: "CONCRETE", label_ru: "Бетон" }, { value: "MASONRY", label_ru: "Кладка" }, { value: "CEMENT_BASE", label_ru: "Цементное основание" }, { value: "GYPSUM_BOARD", label_ru: "Гипсокартон" }, { value: "WOOD_BASE", label_ru: "Деревянное основание" }, { value: "PROJECT_SPECIFIED", label_ru: "По проекту" }] }),
      parameter("existing_condition", "Состояние основания", "choice", "P0", null, [], { choices: [{ value: "ACCEPTED", label_ru: "Принято и готово" }, { value: "LOCAL_REPAIR_REQUIRED", label_ru: "Требуется локальный ремонт" }, { value: "FULL_PREPARATION_REQUIRED", label_ru: "Требуется полная подготовка" }] }),
      parameter("application_method", "Способ выполнения", "choice", "P0", null, [], { choices: [{ value: "MANUAL", label_ru: "Ручной" }, { value: "MECHANIZED", label_ru: "Механизированный" }, { value: "PROJECT_SPECIFIED", label_ru: "По проекту" }] }),
      parameter("product_profile_id", "Паспорт выбранного материала или системы", "text", "P0", null, []),
      parameter("normative_rate_code", "Код применимой ресурсной нормы", "text", "P0", null, []),
      ...formulaParameters(profile.formula_kind),
      parameter("labor_productivity_m2_per_man_hour", "Производительность труда по принятой норме", "number", "P0", "m2_per_man_hour", ["application_labor"], { minimum: 0.01, maximum: 100_000 }),
      parameter("equipment_productivity_m2_per_machine_hour", "Производительность применимого механизма", "number", "P0", "m2_per_machine_hour", ["application_equipment"], { minimum: 0.01, maximum: 100_000 }),
      parameter("preparation_productivity_m2_per_man_hour", "Производительность подготовки основания", "number", "P1", "m2_per_man_hour", ["preparation_labor"], { minimum: 0.01, maximum: 100_000, fullOnly: true }),
      parameter("protective_consumables_rate_kg_m2", "Расход защитных и очистных расходников", "number", "P1", "kg_per_m2", ["protective_consumables"], { minimum: 0.001, maximum: 100, fullOnly: true }),
      parameter("system_accessory_rate_per_m2", "Расход отдельных системных аксессуаров на 1 м²", "number", "P1", "item_per_m2", ["system_accessories"], { minimum: 0.001, maximum: 1_000, fullOnly: true }),
      parameter("waste_percent", "Проектный процент технологических потерь", "number", "P1", "percent", ["waste_output"], { minimum: 0, maximum: 50, fullOnly: true }),
      parameter("delivery_distance_km", "Расстояние доставки материалов", "number", "P1", "km", ["transport_t_km"], { minimum: 0.1, maximum: 5_000, fullOnly: true }),
      parameter("truck_payload_t", "Полезная грузоподъёмность транспорта", "number", "P1", "t", ["delivery_trips"], { minimum: 0.1, maximum: 100, fullOnly: true }),
      parameter("loading_productivity_kg_per_man_hour", "Производительность погрузки и разгрузки", "number", "P1", "kg_per_man_hour", ["loading_labor"], { minimum: 0.1, maximum: 100_000, fullOnly: true }),
      parameter("waste_handling_productivity_kg_per_man_hour", "Производительность сбора и перемещения отходов", "number", "P1", "kg_per_man_hour", ["waste_handling_labor"], { minimum: 0.1, maximum: 100_000, fullOnly: true }),
      parameter("qa_interval_m2_per_test", "Площадь на одну контрольную проверку", "number", "P1", "m2_per_test", ["quality_tests"], { minimum: 0.01, maximum: 1_000_000, fullOnly: true }),
      parameter("documentation_record_count", "Количество актов и записей исполнительной документации", "number", "P1", "item", ["documentation_records"], { minimum: 1, maximum: 10_000, fullOnly: true }),
      ...scopeParameters(row),
    ],
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
}

function assemblyParameter(
  parameter_id: string,
  title_ru: string,
  role: ProfessionalAssemblyParameterDefinitionV4["role"],
  unit_id: string | null,
  required_for: ProfessionalAssemblyParameterDefinitionV4["required_for"],
): ProfessionalAssemblyParameterDefinitionV4 {
  return { parameter_id, title_ru, role, unit_id, required_for };
}

function formula(
  formula_id: string,
  expression: string,
  input_parameter_ids: readonly string[],
  output_unit_id: string,
  calculate: ProfessionalAssemblyFormulaV4["calculate"],
): ProfessionalAssemblyFormulaV4 {
  return { formula_id, expression, input_parameter_ids, output_unit_id, calculate };
}

function primaryFormula(kind: InteriorFormulaKind, technologyId: string): ProfessionalAssemblyFormulaV4 {
  if (kind === "LAYER_KG") return formula(`${technologyId}:primary-material:v1`, "area_m2 × layer_thickness_mm × material_consumption_kg_m2_mm", ["area_m2", "layer_thickness_mm", "material_consumption_kg_m2_mm"], "kg", (v) => v.area_m2 * v.layer_thickness_mm * v.material_consumption_kg_m2_mm);
  if (kind === "COAT_KG") return formula(`${technologyId}:primary-material:v1`, "area_m2 × coat_count × material_consumption_kg_m2_coat", ["area_m2", "coat_count", "material_consumption_kg_m2_coat"], "kg", (v) => v.area_m2 * v.coat_count * v.material_consumption_kg_m2_coat);
  if (kind === "AREA_MATERIAL") return formula(`${technologyId}:primary-material:v1`, "area_m2 × material_consumption_m2_m2", ["area_m2", "material_consumption_m2_m2"], "m2", (v) => v.area_m2 * v.material_consumption_m2_m2);
  return formula(`${technologyId}:primary-material:v1`, "area_m2 × material_consumption_kg_m2", ["area_m2", "material_consumption_kg_m2"], "kg", (v) => v.area_m2 * v.material_consumption_kg_m2);
}

function massFormula(kind: InteriorFormulaKind, technologyId: string): ProfessionalAssemblyFormulaV4 {
  const primary = primaryFormula(kind, technologyId);
  return primary.output_unit_id === "kg"
    ? { ...primary, formula_id: `${technologyId}:material-mass:v1` }
    : formula(`${technologyId}:material-mass:v1`, `(${primary.expression}) × material_mass_kg_per_unit`, [...primary.input_parameter_ids, "material_mass_kg_per_unit"], "kg", (v) => primary.calculate(v) * v.material_mass_kg_per_unit);
}

function normativeSourceId(rowData: InteriorFinishesDomainInventoryRow): string {
  return repairRequired(rowData) ? "kg_krerr_2015_application_guidance" : "kg_krer_2015_application_guidance";
}

function boqRow(
  inventory: InteriorFinishesDomainInventoryRow,
  rowId: string,
  section: string,
  category: ProfessionalAssemblyRowDefinitionV4["category"],
  titleRu: string,
  rowFormula: ProfessionalAssemblyFormulaV4,
  supportedScope: "BOTH" | "FULL_ONLY" = "FULL_ONLY",
  costOwnership: ProfessionalAssemblyRowDefinitionV4["cost_ownership"] = "priced_resource",
): ProfessionalAssemblyRowDefinitionV4 {
  const technologyId = inventory.canonical_technology_id;
  return {
    row_id: `${technologyId}:row:${rowId}`,
    section,
    category,
    title_ru: titleRu,
    formula: rowFormula,
    cost_ownership: costOwnership,
    cost_owner_id: `${technologyId}:cost-owner:${rowId}`,
    semantic_owner: `${technologyId}:semantic-owner:${rowId}`,
    normative_source_ids: [normativeSourceId(inventory)],
    inclusion_condition: supportedScope === "BOTH" ? "work_included=true" : "work_included=true AND scope_mode=FULL_APPLICABLE_SCOPE",
    procurement_eligible: ["material", "transport", "waste"].includes(category),
  };
}

function mainAssembly(inventory: InteriorFinishesDomainInventoryRow): ProfessionalChildAssemblyV4 {
  const profile = interiorOperationProfile(inventory);
  const technologyId = inventory.canonical_technology_id;
  const primary = primaryFormula(profile.formula_kind, technologyId);
  const materialLabel = interiorMaterialLabelRu(inventory);
  return {
    child_passport_id: `${technologyId}:main-passport`, child_passport_version: "1.0.0",
    domain_owner: INTERIOR_FINISHES_COMPLETE_DOMAIN_ID, assembly_id: `${technologyId}:main-assembly:v1`,
    title_ru: inventory.localized_name_ru, scope_trigger_parameter: "work_included", scope_trigger_values: [true],
    supported_scope_modes: ["MINIMAL_EXPLICIT_SCOPE", "FULL_APPLICABLE_SCOPE"],
    parameters: [
      assemblyParameter("work_included", "Операция включена", "SCOPE_TRIGGER", null, ["MINIMAL_EXPLICIT_SCOPE", "FULL_APPLICABLE_SCOPE"]),
      assemblyParameter("area_m2", "Расчётная площадь", "PROJECT_QUANTITY", "m2", ["MINIMAL_EXPLICIT_SCOPE", "FULL_APPLICABLE_SCOPE"]),
      ...primary.input_parameter_ids.filter((id) => id !== "area_m2").map((id) => assemblyParameter(id, id, "MATERIAL_PASSPORT_VALUE", null, ["MINIMAL_EXPLICIT_SCOPE", "FULL_APPLICABLE_SCOPE"])),
      assemblyParameter("labor_productivity_m2_per_man_hour", "Производительность труда", "NORM_RATE", "m2_per_man_hour", ["MINIMAL_EXPLICIT_SCOPE", "FULL_APPLICABLE_SCOPE"]),
      assemblyParameter("equipment_productivity_m2_per_machine_hour", "Производительность механизма", "NORM_RATE", "m2_per_machine_hour", ["MINIMAL_EXPLICIT_SCOPE", "FULL_APPLICABLE_SCOPE"]),
    ],
    rows: [
      boqRow(inventory, "primary_material", "Основные материалы", "material", `${profile.main_resource_ru} для ${materialLabel}`, primary, "BOTH"),
      boqRow(inventory, "application_labor", "Труд рабочих", "labor", `${profile.operation_label_ru}: ${inventory.localized_name_ru}`, formula(`${technologyId}:application-labor:v1`, "area_m2 ÷ labor_productivity_m2_per_man_hour", ["area_m2", "labor_productivity_m2_per_man_hour"], "man_hour", (v) => v.area_m2 / v.labor_productivity_m2_per_man_hour), "BOTH"),
      boqRow(inventory, "application_equipment", "Машины и механизмы", "equipment", profile.equipment_ru, formula(`${technologyId}:application-equipment:v1`, "area_m2 ÷ equipment_productivity_m2_per_machine_hour", ["area_m2", "equipment_productivity_m2_per_machine_hour"], "machine_hour", (v) => v.area_m2 / v.equipment_productivity_m2_per_machine_hour), "BOTH"),
    ],
  };
}

function fullAssembly(inventory: InteriorFinishesDomainInventoryRow): ProfessionalChildAssemblyV4 {
  const profile = interiorOperationProfile(inventory);
  const technologyId = inventory.canonical_technology_id;
  const primary = primaryFormula(profile.formula_kind, technologyId);
  const mass = massFormula(profile.formula_kind, technologyId);
  return {
    child_passport_id: `${technologyId}:full-passport`, child_passport_version: "1.0.0",
    domain_owner: INTERIOR_FINISHES_COMPLETE_DOMAIN_ID, assembly_id: `${technologyId}:full-assembly:v1`,
    title_ru: `Полный применимый состав: ${inventory.localized_name_ru}`, scope_trigger_parameter: "work_included", scope_trigger_values: [true],
    supported_scope_modes: ["FULL_APPLICABLE_SCOPE"],
    parameters: [
      assemblyParameter("work_included", "Операция включена", "SCOPE_TRIGGER", null, ["FULL_APPLICABLE_SCOPE"]),
      assemblyParameter("area_m2", "Расчётная площадь", "PROJECT_QUANTITY", "m2", ["FULL_APPLICABLE_SCOPE"]),
      ...mass.input_parameter_ids.filter((id) => id !== "area_m2").map((id) => assemblyParameter(id, id, id.includes("productivity") ? "NORM_RATE" : "MATERIAL_PASSPORT_VALUE", null, ["FULL_APPLICABLE_SCOPE"])),
      assemblyParameter("preparation_productivity_m2_per_man_hour", "Производительность подготовки", "NORM_RATE", "m2_per_man_hour", ["FULL_APPLICABLE_SCOPE"]),
      assemblyParameter("protective_consumables_rate_kg_m2", "Расход защитных расходников", "MATERIAL_PASSPORT_VALUE", "kg_per_m2", ["FULL_APPLICABLE_SCOPE"]),
      assemblyParameter("system_accessory_rate_per_m2", "Расход системных аксессуаров", "MATERIAL_PASSPORT_VALUE", "item_per_m2", ["FULL_APPLICABLE_SCOPE"]),
      assemblyParameter("waste_percent", "Технологические потери", "PROJECT_QUANTITY", "percent", ["FULL_APPLICABLE_SCOPE"]),
      assemblyParameter("delivery_distance_km", "Расстояние доставки", "LOGISTICS_VALUE", "km", ["FULL_APPLICABLE_SCOPE"]),
      assemblyParameter("truck_payload_t", "Грузоподъёмность", "LOGISTICS_VALUE", "t", ["FULL_APPLICABLE_SCOPE"]),
      assemblyParameter("loading_productivity_kg_per_man_hour", "Производительность погрузки", "NORM_RATE", "kg_per_man_hour", ["FULL_APPLICABLE_SCOPE"]),
      assemblyParameter("waste_handling_productivity_kg_per_man_hour", "Производительность обращения с отходами", "NORM_RATE", "kg_per_man_hour", ["FULL_APPLICABLE_SCOPE"]),
      assemblyParameter("qa_interval_m2_per_test", "Интервал контроля", "CONTROL_PLAN_VALUE", "m2_per_test", ["FULL_APPLICABLE_SCOPE"]),
      assemblyParameter("documentation_record_count", "Документы", "CONTROL_PLAN_VALUE", "item", ["FULL_APPLICABLE_SCOPE"]),
    ],
    rows: [
      boqRow(inventory, "preparation_labor", "Подготовка основания", "labor", `Подготовка основания перед операцией «${inventory.localized_name_ru}»`, formula(`${technologyId}:preparation-labor:v1`, "area_m2 ÷ preparation_productivity_m2_per_man_hour", ["area_m2", "preparation_productivity_m2_per_man_hour"], "man_hour", (v) => v.area_m2 / v.preparation_productivity_m2_per_man_hour)),
      boqRow(inventory, "protective_consumables", "Защита и расходники", "material", `Защитные и очистные расходники для операции «${inventory.localized_name_ru}»`, formula(`${technologyId}:protective-consumables:v1`, "area_m2 × protective_consumables_rate_kg_m2", ["area_m2", "protective_consumables_rate_kg_m2"], "kg", (v) => v.area_m2 * v.protective_consumables_rate_kg_m2)),
      boqRow(inventory, "system_accessories", "Системные аксессуары", "material", `Отдельные крепёжные, профильные или сопрягающие элементы для ${interiorMaterialLabelRu(inventory)}`, formula(`${technologyId}:system-accessories:v1`, "area_m2 × system_accessory_rate_per_m2", ["area_m2", "system_accessory_rate_per_m2"], "item", (v) => v.area_m2 * v.system_accessory_rate_per_m2)),
      boqRow(inventory, "transport_t_km", "Внешняя логистика", "transport", `Транспортная работа по доставке материалов для «${inventory.localized_name_ru}»`, formula(`${technologyId}:transport-t-km:v1`, `((${mass.expression}) ÷ 1000) × delivery_distance_km`, [...mass.input_parameter_ids, "delivery_distance_km"], "t_km", (v) => (mass.calculate(v) / 1000) * v.delivery_distance_km)),
      boqRow(inventory, "delivery_trips", "Внешняя логистика", "transport", `Рейсы доставки материалов для «${inventory.localized_name_ru}»`, formula(`${technologyId}:delivery-trips:v1`, `ceil(((${mass.expression}) ÷ 1000) ÷ truck_payload_t)`, [...mass.input_parameter_ids, "truck_payload_t"], "trip", (v) => Math.ceil((mass.calculate(v) / 1000) / v.truck_payload_t))),
      boqRow(inventory, "loading_labor", "Погрузка, разгрузка и подъём", "labor", `Погрузочно-разгрузочные работы для «${inventory.localized_name_ru}»`, formula(`${technologyId}:loading-labor:v1`, `(${mass.expression}) ÷ loading_productivity_kg_per_man_hour`, [...mass.input_parameter_ids, "loading_productivity_kg_per_man_hour"], "man_hour", (v) => mass.calculate(v) / v.loading_productivity_kg_per_man_hour)),
      boqRow(inventory, "waste_output", "Отходы и переработка", "waste", `Технологические отходы операции «${inventory.localized_name_ru}»`, formula(`${technologyId}:waste-output:v1`, `(${primary.expression}) × waste_percent ÷ 100`, [...primary.input_parameter_ids, "waste_percent"], primary.output_unit_id, (v) => primary.calculate(v) * v.waste_percent / 100), "FULL_ONLY", "informational_output"),
      boqRow(inventory, "waste_handling_labor", "Отходы и переработка", "labor", `Сбор и внутреннее перемещение отходов после «${inventory.localized_name_ru}»`, formula(`${technologyId}:waste-handling-labor:v1`, `((${mass.expression}) × waste_percent ÷ 100) ÷ waste_handling_productivity_kg_per_man_hour`, [...mass.input_parameter_ids, "waste_percent", "waste_handling_productivity_kg_per_man_hour"], "man_hour", (v) => (mass.calculate(v) * v.waste_percent / 100) / v.waste_handling_productivity_kg_per_man_hour)),
      boqRow(inventory, "quality_tests", "Контроль качества", "testing", `Контроль основания, геометрии и результата операции «${inventory.localized_name_ru}»`, formula(`${technologyId}:quality-tests:v1`, "ceil(area_m2 ÷ qa_interval_m2_per_test)", ["area_m2", "qa_interval_m2_per_test"], "test", (v) => Math.ceil(v.area_m2 / v.qa_interval_m2_per_test))),
      boqRow(inventory, "documentation_records", "Исполнительная документация", "documentation", `Акты, паспорта материалов и записи контроля для «${inventory.localized_name_ru}»`, formula(`${technologyId}:documentation-records:v1`, "documentation_record_count", ["documentation_record_count"], "item", (v) => v.documentation_record_count)),
    ],
  };
}

function scopeAssembly(inventory: InteriorFinishesDomainInventoryRow): ProfessionalChildAssemblyV4 | null {
  const scope = inventory.scope_capability;
  const technologyId = inventory.canonical_technology_id;
  const mass = massFormula(interiorOperationProfile(inventory).formula_kind, technologyId);
  const parameters: ProfessionalAssemblyParameterDefinitionV4[] = [assemblyParameter("work_included", "Операция включена", "SCOPE_TRIGGER", null, ["FULL_APPLICABLE_SCOPE"])];
  const rows: ProfessionalAssemblyRowDefinitionV4[] = [];
  if (scope === "small_area") {
    parameters.push(assemblyParameter("area_m2", "Площадь", "PROJECT_QUANTITY", "m2", ["FULL_APPLICABLE_SCOPE"]), assemblyParameter("small_area_detail_productivity_m2_per_man_hour", "Производительность ручной доводки", "NORM_RATE", "m2_per_man_hour", ["FULL_APPLICABLE_SCOPE"]));
    rows.push(boqRow(inventory, "small_area_detail_labor", "Особые условия малой площади", "labor", `Ручная доводка границ малой площади для «${inventory.localized_name_ru}»`, formula(`${technologyId}:small-area-detail:v1`, "area_m2 ÷ small_area_detail_productivity_m2_per_man_hour", ["area_m2", "small_area_detail_productivity_m2_per_man_hour"], "man_hour", (v) => v.area_m2 / v.small_area_detail_productivity_m2_per_man_hour)));
  } else if (scope === "large_area") {
    parameters.push(...mass.input_parameter_ids.map((id) => assemblyParameter(id, id, id === "area_m2" ? "PROJECT_QUANTITY" : "MATERIAL_PASSPORT_VALUE", null, ["FULL_APPLICABLE_SCOPE"])), assemblyParameter("large_area_handling_productivity_kg_per_machine_hour", "Производительность подачи", "NORM_RATE", "kg_per_machine_hour", ["FULL_APPLICABLE_SCOPE"]));
    rows.push(boqRow(inventory, "large_area_handling_equipment", "Механизированная подача", "equipment", `Механизированная подача материалов большой площади для «${inventory.localized_name_ru}»`, formula(`${technologyId}:large-area-handling:v1`, `(${mass.expression}) ÷ large_area_handling_productivity_kg_per_machine_hour`, [...mass.input_parameter_ids, "large_area_handling_productivity_kg_per_machine_hour"], "machine_hour", (v) => mass.calculate(v) / v.large_area_handling_productivity_kg_per_machine_hour)));
  } else if (scope === "wet_zone") {
    parameters.push(assemblyParameter("area_m2", "Площадь", "PROJECT_QUANTITY", "m2", ["FULL_APPLICABLE_SCOPE"]), assemblyParameter("wet_zone_protection_rate_kg_m2", "Расход защиты", "MATERIAL_PASSPORT_VALUE", "kg_per_m2", ["FULL_APPLICABLE_SCOPE"]), assemblyParameter("wet_zone_test_interval_m2", "Интервал испытаний", "CONTROL_PLAN_VALUE", "m2_per_test", ["FULL_APPLICABLE_SCOPE"]));
    rows.push(
      boqRow(inventory, "wet_zone_protection_material", "Защита мокрой зоны", "material", `Совместимый защитный состав и материалы примыканий для «${inventory.localized_name_ru}»`, formula(`${technologyId}:wet-zone-protection:v1`, "area_m2 × wet_zone_protection_rate_kg_m2", ["area_m2", "wet_zone_protection_rate_kg_m2"], "kg", (v) => v.area_m2 * v.wet_zone_protection_rate_kg_m2)),
      boqRow(inventory, "wet_zone_tests", "Контроль мокрой зоны", "testing", `Проверки влажности и непрерывности защиты для «${inventory.localized_name_ru}»`, formula(`${technologyId}:wet-zone-tests:v1`, "ceil(area_m2 ÷ wet_zone_test_interval_m2)", ["area_m2", "wet_zone_test_interval_m2"], "test", (v) => Math.ceil(v.area_m2 / v.wet_zone_test_interval_m2))),
    );
  } else if (scope === "technical_room") {
    parameters.push(assemblyParameter("area_m2", "Площадь", "PROJECT_QUANTITY", "m2", ["FULL_APPLICABLE_SCOPE"]), assemblyParameter("technical_protection_rate_kg_m2", "Расход защиты", "MATERIAL_PASSPORT_VALUE", "kg_per_m2", ["FULL_APPLICABLE_SCOPE"]), assemblyParameter("technical_detail_productivity_m2_per_man_hour", "Производительность деталировки", "NORM_RATE", "m2_per_man_hour", ["FULL_APPLICABLE_SCOPE"]));
    rows.push(
      boqRow(inventory, "technical_protection_material", "Защита технического помещения", "material", `Защитный материал технического помещения для «${inventory.localized_name_ru}»`, formula(`${technologyId}:technical-protection:v1`, "area_m2 × technical_protection_rate_kg_m2", ["area_m2", "technical_protection_rate_kg_m2"], "kg", (v) => v.area_m2 * v.technical_protection_rate_kg_m2)),
      boqRow(inventory, "technical_detail_labor", "Инженерные вводы и примыкания", "labor", `Обработка вводов и примыканий для «${inventory.localized_name_ru}»`, formula(`${technologyId}:technical-detail:v1`, "area_m2 ÷ technical_detail_productivity_m2_per_man_hour", ["area_m2", "technical_detail_productivity_m2_per_man_hour"], "man_hour", (v) => v.area_m2 / v.technical_detail_productivity_m2_per_man_hour)),
    );
  } else if (scope === "high_load") {
    parameters.push(assemblyParameter("area_m2", "Площадь", "PROJECT_QUANTITY", "m2", ["FULL_APPLICABLE_SCOPE"]), assemblyParameter("high_load_reinforcement_rate_m2_m2", "Расход армирования", "MATERIAL_PASSPORT_VALUE", "m2_per_m2", ["FULL_APPLICABLE_SCOPE"]), assemblyParameter("high_load_reinforcement_productivity_m2_per_man_hour", "Производительность армирования", "NORM_RATE", "m2_per_man_hour", ["FULL_APPLICABLE_SCOPE"]));
    rows.push(
      boqRow(inventory, "high_load_reinforcement_material", "Армирование высокой нагрузки", "material", `Армирующий слой зоны высокой нагрузки для «${inventory.localized_name_ru}»`, formula(`${technologyId}:high-load-reinforcement:v1`, "area_m2 × high_load_reinforcement_rate_m2_m2", ["area_m2", "high_load_reinforcement_rate_m2_m2"], "m2", (v) => v.area_m2 * v.high_load_reinforcement_rate_m2_m2)),
      boqRow(inventory, "high_load_reinforcement_labor", "Армирование высокой нагрузки", "labor", `Монтаж армирующего слоя для «${inventory.localized_name_ru}»`, formula(`${technologyId}:high-load-reinforcement-labor:v1`, "area_m2 ÷ high_load_reinforcement_productivity_m2_per_man_hour", ["area_m2", "high_load_reinforcement_productivity_m2_per_man_hour"], "man_hour", (v) => v.area_m2 / v.high_load_reinforcement_productivity_m2_per_man_hour)),
    );
  }
  if (repairRequired(inventory)) {
    parameters.push(assemblyParameter("removal_area_m2", "Площадь удаления", "PROJECT_QUANTITY", "m2", ["FULL_APPLICABLE_SCOPE"]), assemblyParameter("removed_mass_kg_m2", "Масса удаления", "PROJECT_QUANTITY", "kg_per_m2", ["FULL_APPLICABLE_SCOPE"]), assemblyParameter("removal_productivity_m2_per_man_hour", "Производительность удаления", "NORM_RATE", "m2_per_man_hour", ["FULL_APPLICABLE_SCOPE"]), assemblyParameter("repair_waste_haul_distance_km", "Расстояние вывоза", "LOGISTICS_VALUE", "km", ["FULL_APPLICABLE_SCOPE"]));
    rows.push(
      boqRow(inventory, "repair_removal_labor", "Снятие существующей отделки", "labor", `Удаление существующей отделки перед «${inventory.localized_name_ru}»`, formula(`${technologyId}:repair-removal-labor:v1`, "removal_area_m2 ÷ removal_productivity_m2_per_man_hour", ["removal_area_m2", "removal_productivity_m2_per_man_hour"], "man_hour", (v) => v.removal_area_m2 / v.removal_productivity_m2_per_man_hour)),
      boqRow(inventory, "repair_removed_waste", "Демонтажные отходы", "waste", `Отходы удалённой отделки перед «${inventory.localized_name_ru}»`, formula(`${technologyId}:repair-removed-waste:v1`, "removal_area_m2 × removed_mass_kg_m2", ["removal_area_m2", "removed_mass_kg_m2"], "kg", (v) => v.removal_area_m2 * v.removed_mass_kg_m2)),
      boqRow(inventory, "repair_waste_transport", "Вывоз демонтажных отходов", "transport", `Транспортная работа по вывозу отходов перед «${inventory.localized_name_ru}»`, formula(`${technologyId}:repair-waste-transport:v1`, "(removal_area_m2 × removed_mass_kg_m2 ÷ 1000) × repair_waste_haul_distance_km", ["removal_area_m2", "removed_mass_kg_m2", "repair_waste_haul_distance_km"], "t_km", (v) => (v.removal_area_m2 * v.removed_mass_kg_m2 / 1000) * v.repair_waste_haul_distance_km)),
    );
  }
  if (rows.length === 0) return null;
  return {
    child_passport_id: `${technologyId}:conditional-passport`, child_passport_version: "1.0.0",
    domain_owner: INTERIOR_FINISHES_COMPLETE_DOMAIN_ID, assembly_id: `${technologyId}:conditional-assembly:v1`,
    title_ru: `Условия ${INTERIOR_SCOPE_LABELS_RU[scope]}: ${inventory.localized_name_ru}`,
    scope_trigger_parameter: "work_included", scope_trigger_values: [true], supported_scope_modes: ["FULL_APPLICABLE_SCOPE"], parameters, rows,
  };
}

function adaptWave1SchemaForCompleteDomain(
  schema: ProfessionalDomainParameterSchemaV1,
): ProfessionalDomainParameterSchemaV1 {
  const area = schema.parameters.find((item) => item.parameter_id === "area_m2");
  if (!area) return schema;
  return {
    ...schema,
    parameters: [
      ...schema.parameters.map((item) => item.parameter_id === "area_m2" ? { ...item, priority: "P2" as const } : item),
      parameter("length_m", "Длина участка отделки", "number", "P2", "m", ["area_m2"], { minimum: 0.01, maximum: 100_000 }),
      parameter("width_m", "Ширина или высота участка отделки", "number", "P2", "m", ["area_m2"], { minimum: 0.01, maximum: 100_000 }),
    ],
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
}

const technologies: ProfessionalCanonicalTechnologyV1[] = [...INTERIOR_FINISHES_WAVE_1_DOMAIN_PACKAGE.canonical_technologies];
const schemas: ProfessionalDomainParameterSchemaV1[] = INTERIOR_FINISHES_WAVE_1_DOMAIN_PACKAGE.parameter_schemas.map(adaptWave1SchemaForCompleteDomain);
const normativeProfiles: ProfessionalNormativeProfileV1[] = [...INTERIOR_FINISHES_WAVE_1_DOMAIN_PACKAGE.normative_profiles];
const formulaPacks: ProfessionalFormulaPackV1[] = [...INTERIOR_FINISHES_WAVE_1_DOMAIN_PACKAGE.formula_packs];
const assemblyProfiles: ProfessionalAssemblyProfileV1[] = [...INTERIOR_FINISHES_WAVE_1_DOMAIN_PACKAGE.assembly_profiles];
const resourcePolicies: ProfessionalResourceCompletenessPolicyV1[] = [...INTERIOR_FINISHES_WAVE_1_DOMAIN_PACKAGE.resource_completeness_policies];

for (const inventory of INTERIOR_FINISHES_NEW_INVENTORY) {
  const profile = interiorOperationProfile(inventory);
  const technologyId = inventory.canonical_technology_id;
  const professionalOverlay = resolveInteriorProfessionalOverlayV4(inventory);
  const schema = professionalOverlay?.schema ?? schemaFor(inventory);
  const resourceSourceId = normativeSourceId(inventory);
  const normProfile: ProfessionalNormativeProfileV1 = professionalOverlay?.normative_profile ?? {
    profile_id: `${technologyId}:kg-resource-profile:v1`, profile_version: "1.0.0", technology_id: technologyId,
    jurisdiction: "KG", requested_source_ids: [resourceSourceId], requested_source_types: ["RESOURCE_ESTIMATE_NORM"],
    rejected_foreign_source_ids: ["ru_gesn_15", "ru_fer_15"],
  };
  const conditional = professionalOverlay ? null : scopeAssembly(inventory);
  const children = professionalOverlay?.child_assemblies ?? [mainAssembly(inventory), fullAssembly(inventory), ...(conditional ? [conditional] : [])];
  const formulaPackId = `${technologyId}:formula-pack:v1`;
  const assemblyProfileId = `${technologyId}:assembly-profile:v1`;
  const policyId = professionalOverlay?.resource_policy.policy_id ?? `${technologyId}:resource-policy:v1`;
  technologies.push({
    technology_id: technologyId,
    operation_class: inventory.work_type.toUpperCase(),
    method: professionalOverlay
      ? `DRYWALL_PROFESSIONAL_OVERLAY:${professionalOverlay.contract.group}:${professionalOverlay.contract.variant}:${inventory.catalog_id}`
      : `${inventory.calculator_family_id}:${inventory.source_domain_id}:${inventory.work_type}:${inventory.scope_capability}`,
    material_system: isDrywallFlatCeilingProfessionalCatalogIdV6(inventory.catalog_id)
      ? "FLAT_CEILING"
      : inventory.work_type === "paint" ? "PAINT" : inventory.work_type === "prime" ? "PRIMER" : interiorMaterialSystemKey(inventory),
    output: { dimension: "AREA", unit_id: "m2" },
    required_stages: professionalOverlay?.required_stages ?? [...profile.required_stages, `SCOPE_${inventory.scope_capability.toUpperCase()}`],
    optional_stages: professionalOverlay?.optional_stages ?? profile.optional_stages,
    forbidden_stages: ["ASPHALT_STAGE", "UNSOURCED_ONE_BUNDLE_RESOURCE", "GENERIC_INTERIOR_INSTALLATION"],
    parameter_schema_id: schema.schema_id, formula_pack_id: formulaPackId, assembly_profile_id: assemblyProfileId,
    normative_profile_ids: [normProfile.profile_id], resource_completeness_policy_id: policyId,
  });
  schemas.push(schema);
  normativeProfiles.push(normProfile);
  formulaPacks.push({
    formula_pack_id: formulaPackId, formula_pack_version: "1.0.0", technology_id: technologyId,
    formula_ids: children.flatMap((child) => child.rows.map((row) => row.formula.formula_id)),
    unit_trace_contract: ["formula_expression", "input_parameter_ids", "input_values_with_sources", "output_unit", "substitution_trace"],
  });
  assemblyProfiles.push({ assembly_profile_id: assemblyProfileId, assembly_profile_version: "1.0.0", technology_id: technologyId, child_assemblies: children });
  resourcePolicies.push(professionalOverlay?.resource_policy ?? {
    policy_id: policyId, technology_id: technologyId,
    required_categories: ["material", "labor", "equipment", "transport", "waste", "testing", "documentation"],
    optional_categories: ["subcontract_service", "temporary_work"],
    forbidden_generic_rows: ["Материалы", "Работы", "Оборудование", "Другое", "Комплект работ", "Основные материалы"],
    one_bundle_resource_replacement_forbidden: true,
  });
}

export const INTERIOR_FINISHES_DOMAIN_PACKAGE: ProfessionalEstimateDomainPackageV1 = {
  manifest: {
    domain_id: INTERIOR_FINISHES_COMPLETE_DOMAIN_ID,
    domain_version: INTERIOR_FINISHES_COMPLETE_DOMAIN_VERSION,
    catalog_record_count: INTERIOR_FINISHES_COMPLETE_RECORD_COUNT,
    canonical_technology_count: INTERIOR_FINISHES_COMPLETE_RECORD_COUNT,
    alias_count: 0,
    excluded_count: 0,
    supported_scopes: ["MINIMAL_EXPLICIT_SCOPE", "FULL_APPLICABLE_SCOPE"],
    supported_jurisdictions: ["KG"],
    passports: technologies.map((technology) => `domain-passport:${technology.technology_id}`),
    schemas: schemas.map((schema) => schema.schema_id),
    formula_packs: formulaPacks.map((pack) => pack.formula_pack_id),
    normative_profiles: normativeProfiles.map((profile) => profile.profile_id),
    child_assembly_dependencies: ["demolition", "waterproofing", "insulation", "mep_opening_closure"],
    readiness: "IMPLEMENTATION_READY",
  },
  catalog_bindings: INTERIOR_FINISHES_DOMAIN_CATALOG_BINDINGS,
  canonical_technologies: technologies,
  parameter_schemas: schemas,
  normative_profiles: normativeProfiles,
  formula_packs: formulaPacks,
  assembly_profiles: assemblyProfiles,
  resource_completeness_policies: resourcePolicies,
};

export const interiorFinishesDomainFactory = createProfessionalEstimateDomainFactoryV1(
  INTERIOR_FINISHES_DOMAIN_PACKAGE,
);

if (
  technologies.length !== INTERIOR_FINISHES_COMPLETE_RECORD_COUNT ||
  schemas.length !== INTERIOR_FINISHES_COMPLETE_RECORD_COUNT ||
  formulaPacks.length !== INTERIOR_FINISHES_COMPLETE_RECORD_COUNT ||
  assemblyProfiles.length !== INTERIOR_FINISHES_COMPLETE_RECORD_COUNT ||
  resourcePolicies.length !== INTERIOR_FINISHES_COMPLETE_RECORD_COUNT
) {
  throw new Error("INTERIOR_FINISHES_PACKAGE_DENOMINATOR_MISMATCH");
}
