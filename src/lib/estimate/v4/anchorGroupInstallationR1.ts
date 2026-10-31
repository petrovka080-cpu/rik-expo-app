import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
  type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../backendPlatform/canonicalEstimateCompileCore";
import { compileFormulaGraph } from "../backendPlatform/formulaGraph";
import { estimateDeterministicHash } from "../estimateDeterministicHash";

type InputValue = string | number | boolean;
type Json = Record<string, unknown>;

import {
  ANCHOR_GROUP_PROJECT_SCHEDULE_SOURCE_ID,
  ANCHOR_GROUP_PROJECT_SCHEDULE_NORM_ID,
  ANCHOR_GROUP_PROJECT_SCHEDULE_PRODUCT_PROFILE_ID,
  ANCHOR_GROUP_PROJECT_SCHEDULE_SOURCE_METADATA,
  ANCHOR_GROUP_INSTALLATION_TARGETS,
  ANCHOR_GROUP_INSTALLATION_PARAMETERS,
  type AnchorGroupInstallationContextKey,
  type AnchorGroupInstallationParameter,
} from "../contracts/anchorGroupInstallationParametersR1";
export {
  ANCHOR_GROUP_PROJECT_SCHEDULE_SOURCE_ID,
  ANCHOR_GROUP_PROJECT_SCHEDULE_NORM_ID,
  ANCHOR_GROUP_PROJECT_SCHEDULE_PRODUCT_PROFILE_ID,
  ANCHOR_GROUP_PROJECT_SCHEDULE_SOURCE_METADATA,
  ANCHOR_GROUP_INSTALLATION_TARGETS,
  ANCHOR_GROUP_INSTALLATION_PARAMETERS,
} from "../contracts/anchorGroupInstallationParametersR1";
export type {
  AnchorGroupInstallationContextKey,
  AnchorGroupInstallationParameter,
} from "../contracts/anchorGroupInstallationParametersR1";

export const ANCHOR_GROUP_INSTALLATION_NORMATIVE_PARAMETER_IDS = Object.freeze([
  "product_profile_id",
  "approved_anchor_group_schedule_reference",
  "structural_drawing_revision_reference",
  "method_statement_reference",
] as const);

function formula(formulaId: string, outputUnitId: string, expression: string) {
  const compiled = compileFormulaGraph(expression);
  return {
    formula_id: formulaId,
    output_unit_id: outputUnitId,
    expression_source: expression,
    ast: compiled.ast,
    input_parameter_ids: compiled.inputParameterIds,
    ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256",
  };
}

export type AnchorGroupInstallationFormula = CanonicalEstimateFormulaDefinition & {
  output_unit_id: string;
  expression_source: string;
};

export const ANCHOR_GROUP_INSTALLATION_FORMULAS:
readonly AnchorGroupInstallationFormula[] = Object.freeze([
  formula("anchor_group_count_v1", "piece", "anchor_group_count"),
  formula("anchor_bolt_quantity_v1", "piece", "anchor_group_count * bolts_per_group"),
  formula("thread_protection_cap_quantity_v1", "piece", "thread_protection_cap_quantity_piece"),
  formula("nut_quantity_v1", "piece", "nut_quantity_piece"),
  formula("washer_quantity_v1", "piece", "washer_quantity_piece"),
  formula("installation_template_quantity_v1", "piece", "installation_template_quantity_piece"),
  formula("fixing_accessory_quantity_v1", "set", "fixing_accessory_quantity_set"),
  formula("protective_material_quantity_v1", "kg", "protective_material_quantity_kg"),
  formula("welding_consumable_quantity_v1", "kg", "welding_consumable_quantity_kg"),
  formula("survey_setout_labor_v1", "man_hour", "survey_setout_worker_h"),
  formula("template_assembly_labor_v1", "man_hour", "template_assembly_worker_h"),
  formula("anchor_installation_alignment_labor_v1", "man_hour", "anchor_installation_alignment_worker_h"),
  formula("fixing_labor_v1", "man_hour", "fixing_worker_h"),
  formula("protective_application_labor_v1", "man_hour", "protective_application_worker_h"),
  formula("lifting_machine_time_v1", "machine_hour", "lifting_machine_h"),
  formula("welding_equipment_time_v1", "machine_hour", "welding_equipment_h"),
  formula("survey_equipment_time_v1", "machine_hour", "survey_equipment_h"),
  formula("geometry_control_service_v1", "service_hour", "geometry_control_service_h"),
  formula("acceptance_inspection_service_v1", "service_hour", "acceptance_inspection_service_h"),
  formula("documentation_package_v1", "document", "documentation_package_count"),
  formula("torque_tool_time_v1", "machine_hour", "torque_tool_machine_h"),
  formula("torque_control_service_v1", "service_hour", "torque_control_service_h"),
  formula("anchor_group_delivery_v1", "t_km", "delivered_anchor_group_mass_kg / 1000 * delivery_distance_km"),
  formula("temporary_brace_quantity_v1", "piece", "temporary_brace_quantity_piece"),
  formula("temporary_brace_labor_v1", "man_hour", "temporary_brace_worker_h"),
  formula("base_grout_quantity_v1", "kg", "base_grout_quantity_kg"),
  formula("base_grout_labor_v1", "man_hour", "base_grout_worker_h"),
]);

const literalTrue = Object.freeze({ kind: "literal", value: true });
const equals = (parameterId: string, value: InputValue) => ({ kind: "equals", parameterId, value });
const greaterThan = (parameterId: string, value: number) => ({ kind: "greater_than", parameterId, value });
const and = (...operands: Json[]) => ({ kind: "and", operands });

function resource(input: {
  rowId: string;
  ordinal: number;
  section: string;
  category: string;
  titleRu: string;
  unitId: string;
  formulaId: string;
  inclusionAst?: Json;
  procurementEligible: boolean;
  titleParameterIds?: string[];
  derivedInputParameterIds?: string[];
  validationInputParameterIds?: string[];
  sourceRole?: string;
}): CanonicalEstimateResourceDefinition {
  const normativeTrace = [{
    sourceId: ANCHOR_GROUP_PROJECT_SCHEDULE_SOURCE_ID,
    source_id: ANCHOR_GROUP_PROJECT_SCHEDULE_SOURCE_ID,
    normId: ANCHOR_GROUP_PROJECT_SCHEDULE_NORM_ID,
    norm_id: ANCHOR_GROUP_PROJECT_SCHEDULE_NORM_ID,
    normVersion: ANCHOR_GROUP_PROJECT_SCHEDULE_SOURCE_METADATA.source_document_version,
    source_title: ANCHOR_GROUP_PROJECT_SCHEDULE_SOURCE_METADATA.source_title,
    exact_locator: ANCHOR_GROUP_PROJECT_SCHEDULE_SOURCE_METADATA.exact_locator,
    source_definition_hash: ANCHOR_GROUP_PROJECT_SCHEDULE_SOURCE_METADATA.definition_hash,
    sourceRole: input.sourceRole ?? "APPROVED_PROJECT_DOCUMENTATION",
  }];
  const resourceGraph = {
    formulaId: input.formulaId,
    normalizedUom: input.unitId,
    semanticOwnerId: `anchor-group-installation:${input.rowId}`,
    costOwner: "resource",
    ...(input.titleParameterIds ? {
      titleSpecificationParameterIds: input.titleParameterIds,
      titleSpecificationMode: "APPEND",
      titleSpecificationSeparator: " ",
    } : {}),
    ...(input.derivedInputParameterIds ? {
      derivedInputParameterIds: input.derivedInputParameterIds,
    } : {}),
    ...(input.validationInputParameterIds ? {
      validationInputParameterIds: input.validationInputParameterIds,
    } : {}),
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: input.sourceRole ?? "APPROVED_PROJECT_DOCUMENTATION",
    normativeTrace,
    excludedUnownedAssumptions: [
      "ready-mix concrete quantity or contingency",
      "reinforcement kilograms per cubic metre",
      "formwork square metres per cubic metre",
      "automatic labor or equipment productivity",
      "hidden delivery distance",
      "invented price",
    ],
  };
  return {
    id: `resource-${input.rowId.replace(/:/gu, "-")}`,
    row_id: input.rowId,
    ordinal: input.ordinal,
    section: input.section,
    category: input.category,
    title_ru: input.titleRu,
    unit_id: input.unitId,
    formula_id: input.formulaId,
    inclusion_ast: input.inclusionAst ?? literalTrue,
    resource_graph: resourceGraph,
    procurement_eligible: input.procurementEligible,
    cost_owner_id: input.rowId,
    source_metadata: sourceMetadata,
    row_sha256: estimateDeterministicHash({ input, resourceGraph, sourceMetadata }),
  };
}

const protective = equals("protective_system_applicable", true);
const welded = equals("welded_fixing_applicable", true);
const lifting = equals("lifting_equipment_applicable", true);
const torque = equals("torque_control_applicable", true);
const delivery = and(
  equals("delivery_pricing_mode", "SEPARATE"),
  greaterThan("delivered_anchor_group_mass_kg", 0),
  greaterThan("delivery_distance_km", 0),
);

export const ANCHOR_GROUP_INSTALLATION_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({ rowId: "material:anchor-group:anchor-bolts", ordinal: 0, section: "Материалы", category: "material", titleRu: "Анкерные болты по утверждённой спецификации", unitId: "piece", formulaId: "anchor_bolt_quantity_v1", procurementEligible: true, titleParameterIds: ["anchor_bolt_designation"], derivedInputParameterIds: ["anchor_group_count", "bolts_per_group"], validationInputParameterIds: ["anchor_bolt_quantity_piece"] }),
  resource({ rowId: "material:anchor-group:nuts", ordinal: 1, section: "Материалы", category: "material", titleRu: "Гайки анкерной группы", unitId: "piece", formulaId: "nut_quantity_v1", procurementEligible: true, titleParameterIds: ["nut_designation"] }),
  resource({ rowId: "material:anchor-group:washers", ordinal: 2, section: "Материалы", category: "material", titleRu: "Шайбы анкерной группы", unitId: "piece", formulaId: "washer_quantity_v1", procurementEligible: true, titleParameterIds: ["washer_designation"] }),
  resource({ rowId: "material:anchor-group:installation-template", ordinal: 3, section: "Материалы", category: "material", titleRu: "Установочный шаблон анкерной группы", unitId: "piece", formulaId: "installation_template_quantity_v1", procurementEligible: true, titleParameterIds: ["installation_template_designation"] }),
  resource({ rowId: "material:anchor-group:fixing-accessories", ordinal: 4, section: "Материалы", category: "material", titleRu: "Фиксаторы и крепёжные приспособления", unitId: "set", formulaId: "fixing_accessory_quantity_v1", procurementEligible: true, titleParameterIds: ["fixing_accessory_designation"] }),
  resource({ rowId: "material:anchor-group:protective-system", ordinal: 5, section: "Материалы", category: "material", titleRu: "Материал защитной системы анкеров", unitId: "kg", formulaId: "protective_material_quantity_v1", inclusionAst: protective, procurementEligible: true, titleParameterIds: ["protective_system_designation"] }),
  resource({ rowId: "material:anchor-group:welding-consumables", ordinal: 6, section: "Материалы", category: "material", titleRu: "Сварочные расходные материалы для фиксации", unitId: "kg", formulaId: "welding_consumable_quantity_v1", inclusionAst: welded, procurementEligible: true, titleParameterIds: ["welding_consumable_designation"] }),
  resource({ rowId: "work:anchor-group:survey-setout", ordinal: 7, section: "Работы", category: "construction_work", titleRu: "Геодезическая разбивка осей анкерной группы", unitId: "man_hour", formulaId: "survey_setout_labor_v1", procurementEligible: false }),
  resource({ rowId: "work:anchor-group:template-assembly", ordinal: 8, section: "Работы", category: "construction_work", titleRu: "Сборка и установка шаблона", unitId: "man_hour", formulaId: "template_assembly_labor_v1", procurementEligible: false }),
  resource({ rowId: "work:anchor-group:install-align", ordinal: 9, section: "Работы", category: "construction_work", titleRu: "Установка и выверка анкерных болтов", unitId: "man_hour", formulaId: "anchor_installation_alignment_labor_v1", procurementEligible: false }),
  resource({ rowId: "work:anchor-group:fix", ordinal: 10, section: "Работы", category: "construction_work", titleRu: "Фиксация анкерной группы по ППР", unitId: "man_hour", formulaId: "fixing_labor_v1", procurementEligible: false }),
  resource({ rowId: "work:anchor-group:protect", ordinal: 11, section: "Работы", category: "construction_work", titleRu: "Защитная обработка анкеров", unitId: "man_hour", formulaId: "protective_application_labor_v1", inclusionAst: protective, procurementEligible: false }),
  resource({ rowId: "equipment:anchor-group:lifting", ordinal: 12, section: "Техника", category: "equipment", titleRu: "Подъёмное оборудование для анкерной группы", unitId: "machine_hour", formulaId: "lifting_machine_time_v1", inclusionAst: lifting, procurementEligible: true, titleParameterIds: ["lifting_equipment_designation"] }),
  resource({ rowId: "equipment:anchor-group:welding", ordinal: 13, section: "Техника", category: "equipment", titleRu: "Сварочное оборудование для проектной фиксации", unitId: "machine_hour", formulaId: "welding_equipment_time_v1", inclusionAst: welded, procurementEligible: true }),
  resource({ rowId: "equipment:anchor-group:survey", ordinal: 14, section: "Техника", category: "equipment", titleRu: "Геодезическое оборудование", unitId: "machine_hour", formulaId: "survey_equipment_time_v1", procurementEligible: true }),
  resource({ rowId: "equipment:anchor-group:torque-tool", ordinal: 15, section: "Техника", category: "equipment", titleRu: "Тарированный динамометрический инструмент", unitId: "machine_hour", formulaId: "torque_tool_time_v1", inclusionAst: torque, procurementEligible: true }),
  resource({ rowId: "service:anchor-group:geometry-control", ordinal: 16, section: "Услуги и контроль", category: "service", titleRu: "Геодезический контроль положения анкерной группы", unitId: "service_hour", formulaId: "geometry_control_service_v1", procurementEligible: true, sourceRole: "PROJECT_QUALITY_PLAN" }),
  resource({ rowId: "service:anchor-group:acceptance", ordinal: 17, section: "Услуги и контроль", category: "service", titleRu: "Инженерная приёмка анкерной группы", unitId: "service_hour", formulaId: "acceptance_inspection_service_v1", procurementEligible: true, sourceRole: "PROJECT_QUALITY_PLAN" }),
  resource({ rowId: "service:anchor-group:documents", ordinal: 18, section: "Услуги и контроль", category: "service", titleRu: "Комплект исполнительной документации", unitId: "document", formulaId: "documentation_package_v1", procurementEligible: true, sourceRole: "PROJECT_QUALITY_PLAN" }),
  resource({ rowId: "service:anchor-group:torque-control", ordinal: 19, section: "Услуги и контроль", category: "service", titleRu: "Контроль затяжки соединений по проекту", unitId: "service_hour", formulaId: "torque_control_service_v1", inclusionAst: torque, procurementEligible: true, sourceRole: "PROJECT_QUALITY_PLAN" }),
  resource({ rowId: "delivery:anchor-group:supply", ordinal: 20, section: "Доставка", category: "delivery", titleRu: "Доставка комплекта анкерной группы", unitId: "t_km", formulaId: "anchor_group_delivery_v1", inclusionAst: delivery, procurementEligible: true, sourceRole: "SUPPLIER_ROUTE_AND_PACKING_LIST" }),
  resource({ rowId: "work:anchor-group:install-align-groups", ordinal: 21, section: "Работы", category: "construction_work", titleRu: "Установка и выверка анкерной группы по шаблону", unitId: "piece", formulaId: "anchor_group_count_v1", procurementEligible: false, sourceRole: "PROJECT_ANCHOR_GROUP_SCHEDULE" }),
  resource({ rowId: "material:anchor-group:thread-protection-caps", ordinal: 22, section: "Материалы", category: "material", titleRu: "Защитные колпачки резьбы анкерных болтов", unitId: "piece", formulaId: "thread_protection_cap_quantity_v1", procurementEligible: true, titleParameterIds: ["thread_protection_cap_designation"], sourceRole: "PROJECT_ANCHOR_GROUP_SCHEDULE" }),
  resource({ rowId: "material:anchor-group:temporary-braces", ordinal: 23, section: "Условные материалы", category: "material", titleRu: "Временные раскосы для фиксации анкерной группы", unitId: "piece", formulaId: "temporary_brace_quantity_v1", inclusionAst: equals("temporary_brace_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["temporary_brace_designation"], sourceRole: "PROJECT_METHOD_STATEMENT" }),
  resource({ rowId: "work:anchor-group:temporary-braces", ordinal: 24, section: "Условные работы", category: "construction_work", titleRu: "Установка и снятие временных раскосов анкерной группы", unitId: "man_hour", formulaId: "temporary_brace_labor_v1", inclusionAst: equals("temporary_brace_mode", "REQUIRED"), procurementEligible: false, sourceRole: "PROJECT_METHOD_STATEMENT" }),
  resource({ rowId: "material:anchor-group:non-shrink-base-grout", ordinal: 25, section: "Условные материалы", category: "material", titleRu: "Безусадочная подливочная смесь под опорной деталью", unitId: "kg", formulaId: "base_grout_quantity_v1", inclusionAst: equals("base_grout_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["base_grout_designation"], sourceRole: "PROJECT_STRUCTURAL_DETAIL" }),
  resource({ rowId: "work:anchor-group:non-shrink-base-grout", ordinal: 26, section: "Условные работы", category: "construction_work", titleRu: "Устройство безусадочной подливки под опорной деталью", unitId: "man_hour", formulaId: "base_grout_labor_v1", inclusionAst: equals("base_grout_mode", "REQUIRED"), procurementEligible: false, sourceRole: "PROJECT_STRUCTURAL_DETAIL" }),
]);

const BASE_INPUT: Readonly<Record<string, InputValue>> = Object.freeze({
  product_profile_id: ANCHOR_GROUP_PROJECT_SCHEDULE_PRODUCT_PROFILE_ID,
  thread_protection_cap_designation: "Защитный колпачок резьбы по спецификации анкерной группы",
  nut_designation: "AG-NUT-PROJECT",
  washer_designation: "AG-WASHER-PROJECT",
  installation_template_designation: "AG-TEMPLATE-PROJECT",
  fixing_accessory_designation: "AG-FIXTURE-PROJECT",
  protective_system_applicable: true,
  protective_system_designation: "AG-PROTECTION-PROJECT",
  welded_fixing_applicable: false,
  welding_consumable_designation: "NOT_APPLICABLE:METHOD_STATEMENT_HAS_NO_WELDED_FIXING",
  welding_consumable_quantity_kg: 0,
  lifting_equipment_applicable: false,
  lifting_equipment_designation: "NOT_APPLICABLE:MANUAL_HANDLING_CONFIRMED_BY_METHOD_STATEMENT",
  lifting_machine_h: 0,
  welding_equipment_h: 0,
  delivery_pricing_mode: "SEPARATE",
  torque_control_applicable: false,
  torque_tool_machine_h: 0,
  torque_control_service_h: 0,
  temporary_brace_mode: "NOT_REQUIRED",
  base_grout_mode: "NOT_REQUIRED",
});

const PROJECT_SCHEDULES: Readonly<Record<
AnchorGroupInstallationContextKey,
Readonly<Record<string, InputValue>>
>> = Object.freeze({
  standard: { anchor_bolt_designation: "AG-M24-STD", anchor_bolt_quantity_piece: 16, nut_quantity_piece: 32, washer_quantity_piece: 32, installation_template_quantity_piece: 1, fixing_accessory_quantity_set: 1, protective_material_quantity_kg: 2.4, survey_setout_worker_h: 4, template_assembly_worker_h: 6, anchor_installation_alignment_worker_h: 12, fixing_worker_h: 5, protective_application_worker_h: 3, survey_equipment_h: 3, geometry_control_service_h: 3, acceptance_inspection_service_h: 2, documentation_package_count: 1, delivered_anchor_group_mass_kg: 420, delivery_distance_km: 18 },
  high_load: { anchor_bolt_designation: "AG-M42-HL", anchor_bolt_quantity_piece: 48, nut_quantity_piece: 96, washer_quantity_piece: 96, installation_template_quantity_piece: 3, fixing_accessory_quantity_set: 3, protective_material_quantity_kg: 9.5, welded_fixing_applicable: true, welding_consumable_designation: "AG-WELD-HL-PROJECT", welding_consumable_quantity_kg: 7.2, survey_setout_worker_h: 10, template_assembly_worker_h: 28, anchor_installation_alignment_worker_h: 54, fixing_worker_h: 26, protective_application_worker_h: 12, lifting_equipment_applicable: true, lifting_equipment_designation: "Автокран по ППР AG-HL", lifting_machine_h: 12, welding_equipment_h: 10, survey_equipment_h: 8, geometry_control_service_h: 8, acceptance_inspection_service_h: 6, documentation_package_count: 2, delivered_anchor_group_mass_kg: 2_850, delivery_distance_km: 34, torque_control_applicable: true, torque_tool_machine_h: 5, torque_control_service_h: 5 },
  technical_room: { anchor_bolt_designation: "AG-M24-TR", anchor_bolt_quantity_piece: 20, nut_quantity_piece: 40, washer_quantity_piece: 40, installation_template_quantity_piece: 2, fixing_accessory_quantity_set: 2, protective_material_quantity_kg: 3.5, welded_fixing_applicable: true, welding_consumable_designation: "AG-WELD-TR-PROJECT", welding_consumable_quantity_kg: 2.2, survey_setout_worker_h: 5, template_assembly_worker_h: 9, anchor_installation_alignment_worker_h: 18, fixing_worker_h: 9, protective_application_worker_h: 4, welding_equipment_h: 4, survey_equipment_h: 4, geometry_control_service_h: 4, acceptance_inspection_service_h: 3, documentation_package_count: 1, delivered_anchor_group_mass_kg: 620, delivery_distance_km: 20, torque_control_applicable: true, torque_tool_machine_h: 3, torque_control_service_h: 3 },
  wet_zone: { anchor_bolt_designation: "AG-M30-WZ", anchor_bolt_quantity_piece: 24, nut_quantity_piece: 48, washer_quantity_piece: 48, installation_template_quantity_piece: 2, fixing_accessory_quantity_set: 2, protective_system_designation: "AG-WZ-PROTECTION-PROJECT", protective_material_quantity_kg: 7.5, survey_setout_worker_h: 6, template_assembly_worker_h: 12, anchor_installation_alignment_worker_h: 24, fixing_worker_h: 11, protective_application_worker_h: 10, lifting_equipment_applicable: true, lifting_equipment_designation: "Кран-манипулятор по ППР AG-WZ", lifting_machine_h: 6, survey_equipment_h: 5, geometry_control_service_h: 5, acceptance_inspection_service_h: 4, documentation_package_count: 2, delivered_anchor_group_mass_kg: 1_150, delivery_distance_km: 26, torque_control_applicable: true, torque_tool_machine_h: 3, torque_control_service_h: 3 },
});

const GROUP_GEOMETRY: Readonly<Record<
AnchorGroupInstallationContextKey,
Readonly<{ anchor_group_count: number; bolts_per_group: number }>
>> = Object.freeze({
  standard: { anchor_group_count: 4, bolts_per_group: 4 },
  high_load: { anchor_group_count: 8, bolts_per_group: 6 },
  technical_room: { anchor_group_count: 5, bolts_per_group: 4 },
  wet_zone: { anchor_group_count: 6, bolts_per_group: 4 },
});

export function anchorGroupInstallationAcceptanceInputR1(
  contextKey: AnchorGroupInstallationContextKey,
): Readonly<Record<string, InputValue>> {
  const target = ANCHOR_GROUP_INSTALLATION_TARGETS.find(
    (candidate) => candidate.contextKey === contextKey,
  );
  if (!target) throw new Error(`ANCHOR_GROUP_INSTALLATION_CONTEXT_UNSUPPORTED:${contextKey}`);
  const reference = contextKey.toUpperCase().replace(/_/gu, "-");
  const geometry = GROUP_GEOMETRY[contextKey];
  return Object.freeze({
    ...BASE_INPUT,
    ...PROJECT_SCHEDULES[contextKey],
    ...geometry,
    thread_protection_cap_quantity_piece:
      geometry.anchor_group_count * geometry.bolts_per_group,
    approved_anchor_group_schedule_reference: `AGS-${reference}-REV-A`,
    structural_drawing_revision_reference: `STR-AG-${reference}-REV-A`,
    method_statement_reference: `MS-AG-${reference}-REV-A`,
  });
}

export async function compileAnchorGroupInstallationR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? ANCHOR_GROUP_INSTALLATION_TARGETS[0].catalogId;
  if (!ANCHOR_GROUP_INSTALLATION_TARGETS.some((target) => target.catalogId === catalogId)) {
    throw new Error(`ANCHOR_GROUP_INSTALLATION_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  const normalizedParameters = { ...submittedParameters };
  const groupCount = Number(normalizedParameters.anchor_group_count);
  const boltsPerGroup = Number(normalizedParameters.bolts_per_group);
  if (Number.isFinite(groupCount) && Number.isFinite(boltsPerGroup)) {
    const derivedBoltQuantity = groupCount * boltsPerGroup;
    const suppliedBoltQuantity = normalizedParameters.anchor_bolt_quantity_piece;
    if (suppliedBoltQuantity == null) {
      normalizedParameters.anchor_bolt_quantity_piece = derivedBoltQuantity;
    } else if (Number.isFinite(Number(suppliedBoltQuantity))
      && Math.abs(Number(suppliedBoltQuantity) - derivedBoltQuantity) > 1e-9) {
      throw Object.assign(new Error(
        "ANCHOR_GROUP_INSTALLATION_BOLT_QUANTITY_MISMATCH",
      ), { code: "PARAMETER_VALIDATION_FAILED" });
    }
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.anchor-group-installation-r1",
    catalogId,
    primaryMeasureParameterId: "anchor_group_count",
    parameterDefinitions: [...ANCHOR_GROUP_INSTALLATION_PARAMETERS],
    formulaDefinitions: [...ANCHOR_GROUP_INSTALLATION_FORMULAS],
    resourceDefinitions: [...ANCHOR_GROUP_INSTALLATION_RESOURCES],
    submittedParameters: normalizedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 28,
    hashJson: async (value) => JSON.stringify(value),
  });
}

export const ANCHOR_GROUP_INSTALLATION_SOURCE_METADATA = Object.freeze({
  sourceId: ANCHOR_GROUP_PROJECT_SCHEDULE_SOURCE_ID,
  normId: ANCHOR_GROUP_PROJECT_SCHEDULE_NORM_ID,
  productProfileId: ANCHOR_GROUP_PROJECT_SCHEDULE_PRODUCT_PROFILE_ID,
  formula: "explicit approved project quantities; delivery mass / 1000 * distance",
  previousReadyMixFactorRejected: true,
  previousReinforcementKgPerM3Rejected: true,
  previousFormworkM2PerM3Rejected: true,
  automaticLaborProductivityRejected: true,
  automaticEquipmentProductivityRejected: true,
});
