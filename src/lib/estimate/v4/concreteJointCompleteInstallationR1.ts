import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
  type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../backendPlatform/canonicalEstimateCompileCore";
import { compileFormulaGraph } from "../backendPlatform/formulaGraph";
import { estimateDeterministicHash } from "../estimateDeterministicHash";

type Json = Record<string, unknown>;
export type ConcreteJointCompleteInstallationInputValueR1 = string | number | boolean;

export const CONCRETE_JOINT_COMPLETE_INSTALLATION_SOURCE_ID =
  "src_professional_norm_pack_concrete_aci_302_1_15_project_joint_schedule_v1";
export const CONCRETE_JOINT_COMPLETE_INSTALLATION_NORM_ID =
  "concrete_aci_302_1_15_project_joint_schedule_v1";
export const CONCRETE_JOINT_COMPLETE_INSTALLATION_SOURCE_PDF_SHA256 =
  "a34ec5688dbe335198862af6763436aa097c84c767eb3d147f4dd92514b89c27";
const PROJECT_SCHEDULE_GUIDE_SHA256 =
  "7bbb94ddf1ad665c2ff48554cb6c1ada1dd985c3127d0f4967276456f70b0c6f";

export const CONCRETE_JOINT_COMPLETE_INSTALLATION_SOURCE_METADATA = Object.freeze({
  source_id: CONCRETE_JOINT_COMPLETE_INSTALLATION_SOURCE_ID,
  source_title: "ACI 302.1R-15: Guide to Concrete Floor and Slab Construction — Chapter 5",
  source_document_version: "ACI 302.1R-15 Chapter 5",
  source_url:
    "https://www.concrete.org/Portals/0/Files/PDF/302.1R-15_Chapter5.pdf",
  product_url:
    "https://www.concrete.org/store/productdetail.aspx?ItemID=3021U15&Language=English&Units=US_AND_METRIC",
  exact_locator:
    "Chapter 5 §§5.2.9-5.2.12: isolation, construction and contraction joints; joint layout and details are the designer's responsibility; filling/sealing and load-transfer devices depend on service conditions; reinforcement crossing a movement joint requires an explicit design.",
  definition_hash: CONCRETE_JOINT_COMPLETE_INSTALLATION_SOURCE_PDF_SHA256,
  verified_at: "2026-09-18T00:00:00+06:00",
  universal_productivity_claimed: false,
  universal_consumption_claimed: false,
  quantity_basis: "APPROVED_PROJECT_JOINT_DETAIL_AND_DIRECT_PROJECT_SCHEDULE",
});

export const CONCRETE_JOINT_COMPLETE_INSTALLATION_TARGETS = Object.freeze([
  { contextKey: "standard", catalogId: "canonical-work:base:concrete_foundation_interior_joint_form_standard", titleRu: "Устройство деформационного шва в стандартной зоне", contextRu: "стандартная зона" },
  { contextKey: "high_load", catalogId: "canonical-work:base:concrete_foundation_interior_joint_form_high_load", titleRu: "Устройство деформационного шва в зоне высокой нагрузки", contextRu: "зона высокой нагрузки" },
  { contextKey: "large_area", catalogId: "canonical-work:base:concrete_foundation_interior_joint_form_large_area", titleRu: "Устройство деформационного шва на большой площади", contextRu: "большая площадь" },
  { contextKey: "repair", catalogId: "canonical-work:base:concrete_foundation_interior_joint_form_repair", titleRu: "Устройство деформационного шва на ремонтном участке", contextRu: "ремонтный участок" },
  { contextKey: "small_area", catalogId: "canonical-work:base:concrete_foundation_interior_joint_form_small_area", titleRu: "Устройство деформационного шва на малом участке", contextRu: "малый участок" },
  { contextKey: "technical_room", catalogId: "canonical-work:base:concrete_foundation_interior_joint_form_technical_room", titleRu: "Устройство деформационного шва в техническом помещении", contextRu: "техническое помещение" },
  { contextKey: "wet_zone", catalogId: "canonical-work:base:concrete_foundation_interior_joint_form_wet_zone", titleRu: "Устройство деформационного шва во влажной зоне", contextRu: "влажная зона" },
] as const);

export type ConcreteJointCompleteInstallationContextKey =
  (typeof CONCRETE_JOINT_COMPLETE_INSTALLATION_TARGETS)[number]["contextKey"];

type ParameterSpec = Readonly<{
  parameterId: string;
  titleRu: string;
  valueType: "decimal" | "text" | "enum" | "boolean";
  unitId: string | null;
  required: boolean;
  constraints: Json;
}>;

const equals = (parameterId: string, value: string | boolean): Json => ({
  kind: "equals",
  parameterId,
  value,
});
const and = (...operands: Json[]): Json => ({ kind: "and", operands });
const FILLER_REQUIRED = equals("premolded_filler_required", true);
const FILLER_FORBIDDEN = equals("premolded_filler_required", false);
const BACKER_ROD_REQUIRED = equals("backer_rod_required", true);
const BACKER_ROD_FORBIDDEN = equals("backer_rod_required", false);
const SEALANT_REQUIRED = equals("joint_sealant_required", true);
const SEALANT_FORBIDDEN = equals("joint_sealant_required", false);
const WATERSTOP_REQUIRED = equals("waterstop_required", true);
const WATERSTOP_FORBIDDEN = equals("waterstop_required", false);
const EDGE_PROFILE_REQUIRED = equals("edge_protection_profile_required", true);
const EDGE_PROFILE_FORBIDDEN = equals("edge_protection_profile_required", false);
const LOAD_TRANSFER_REQUIRED = equals("load_transfer_device_required", true);
const LOAD_TRANSFER_FORBIDDEN = equals("load_transfer_device_required", false);
const REINFORCEMENT_REQUIRED = equals("edge_reinforcement_required", true);
const REINFORCEMENT_FORBIDDEN = equals("edge_reinforcement_required", false);
const SAW_CUTTING_REQUIRED = equals("saw_cutting_required", true);
const SAW_CUTTING_FORBIDDEN = equals("saw_cutting_required", false);
const PREPARATION_REQUIRED = equals("surface_preparation_equipment_required", true);
const PREPARATION_FORBIDDEN = equals("surface_preparation_equipment_required", false);
const QUALITY_REQUIRED = equals("joint_quality_control_required", true);
const QUALITY_FORBIDDEN = equals("joint_quality_control_required", false);
const DELIVERY_REQUIRED = equals("separate_material_delivery_required", true);
const DELIVERY_FORBIDDEN = equals("separate_material_delivery_required", false);
const WASTE_REQUIRED = equals("waste_disposal_required", true);
const WASTE_FORBIDDEN = equals("waste_disposal_required", false);

const requiredWhen = (condition: Json): Json => ({ requiredWhen: condition });
const branchText = (condition: Json, forbidden: Json): Json => ({
  minLength: 1,
  maxLength: 1_000,
  requiredWhen: condition,
  forbiddenWhen: forbidden,
});
const branchQuantity = (condition: Json, forbidden: Json): Json => ({
  min: 0.001,
  requiredWhen: condition,
  forbiddenWhen: forbidden,
});

const PARAMETER_SPECS: readonly ParameterSpec[] = Object.freeze([
  { parameterId: "joint_length_m", titleRu: "Длина деформационного шва", valueType: "decimal", unitId: "m", required: true, constraints: { min: 0.001 } },
  { parameterId: "joint_width_mm", titleRu: "Проектная ширина шва", valueType: "decimal", unitId: "mm", required: true, constraints: { min: 0.001 } },
  { parameterId: "joint_depth_mm", titleRu: "Проектная глубина шва", valueType: "decimal", unitId: "mm", required: true, constraints: { min: 0.001 } },
  { parameterId: "joint_type", titleRu: "Проектный тип шва", valueType: "enum", unitId: null, required: true, constraints: { values: ["ISOLATION", "CONSTRUCTION", "CONTRACTION", "EXPANSION_OR_MOVEMENT"] } },
  { parameterId: "joint_location", titleRu: "Расположение и границы шва", valueType: "text", unitId: null, required: false, constraints: { minLength: 1, maxLength: 1_000 } },
  { parameterId: "approved_joint_detail_reference", titleRu: "Ссылка на утверждённый узел шва", valueType: "text", unitId: null, required: false, constraints: { minLength: 1, maxLength: 1_000 } },
  { parameterId: "joint_method_statement_reference", titleRu: "Ссылка на технологическую карту устройства шва", valueType: "text", unitId: null, required: false, constraints: { minLength: 1, maxLength: 1_000 } },
  { parameterId: "joint_installation_worker_h", titleRu: "Трудозатраты на устройство шва по проектной ведомости", valueType: "decimal", unitId: "man_hour", required: true, constraints: { min: 0.001 } },
  { parameterId: "premolded_filler_required", titleRu: "Требуется готовый заполнитель шва", valueType: "boolean", unitId: null, required: true, constraints: {} },
  { parameterId: "premolded_filler_designation", titleRu: "Готовый заполнитель по проектной спецификации", valueType: "text", unitId: null, required: false, constraints: branchText(FILLER_REQUIRED, FILLER_FORBIDDEN) },
  { parameterId: "premolded_filler_length_m", titleRu: "Длина готового заполнителя по ведомости", valueType: "decimal", unitId: "m", required: false, constraints: branchQuantity(FILLER_REQUIRED, FILLER_FORBIDDEN) },
  { parameterId: "backer_rod_required", titleRu: "Требуется уплотнительный шнур", valueType: "boolean", unitId: null, required: true, constraints: {} },
  { parameterId: "backer_rod_designation", titleRu: "Уплотнительный шнур по проектной спецификации", valueType: "text", unitId: null, required: false, constraints: branchText(BACKER_ROD_REQUIRED, BACKER_ROD_FORBIDDEN) },
  { parameterId: "backer_rod_length_m", titleRu: "Длина уплотнительного шнура по ведомости", valueType: "decimal", unitId: "m", required: false, constraints: branchQuantity(BACKER_ROD_REQUIRED, BACKER_ROD_FORBIDDEN) },
  { parameterId: "joint_sealant_required", titleRu: "Требуется герметик или полужёсткий заполнитель", valueType: "boolean", unitId: null, required: true, constraints: {} },
  { parameterId: "joint_sealant_designation", titleRu: "Герметик или полужёсткий заполнитель по проекту", valueType: "text", unitId: null, required: false, constraints: branchText(SEALANT_REQUIRED, SEALANT_FORBIDDEN) },
  { parameterId: "joint_sealant_quantity_l", titleRu: "Количество герметика по проектной ведомости", valueType: "decimal", unitId: "l", required: false, constraints: branchQuantity(SEALANT_REQUIRED, SEALANT_FORBIDDEN) },
  { parameterId: "waterstop_required", titleRu: "Требуется гидроизоляционная шпонка или лента", valueType: "boolean", unitId: null, required: true, constraints: {} },
  { parameterId: "waterstop_designation", titleRu: "Гидроизоляционная шпонка или лента по проекту", valueType: "text", unitId: null, required: false, constraints: branchText(WATERSTOP_REQUIRED, WATERSTOP_FORBIDDEN) },
  { parameterId: "waterstop_length_m", titleRu: "Длина гидроизоляционной шпонки или ленты", valueType: "decimal", unitId: "m", required: false, constraints: branchQuantity(WATERSTOP_REQUIRED, WATERSTOP_FORBIDDEN) },
  { parameterId: "edge_protection_profile_required", titleRu: "Требуется защитный профиль кромок шва", valueType: "boolean", unitId: null, required: true, constraints: {} },
  { parameterId: "edge_protection_profile_designation", titleRu: "Профиль защиты кромок по проекту", valueType: "text", unitId: null, required: false, constraints: branchText(EDGE_PROFILE_REQUIRED, EDGE_PROFILE_FORBIDDEN) },
  { parameterId: "edge_protection_profile_length_m", titleRu: "Длина профиля защиты кромок по ведомости", valueType: "decimal", unitId: "m", required: false, constraints: branchQuantity(EDGE_PROFILE_REQUIRED, EDGE_PROFILE_FORBIDDEN) },
  { parameterId: "load_transfer_device_required", titleRu: "Требуются проектные устройства передачи нагрузки", valueType: "boolean", unitId: null, required: true, constraints: {} },
  { parameterId: "load_transfer_device_designation", titleRu: "Устройство передачи нагрузки по проекту", valueType: "text", unitId: null, required: false, constraints: branchText(LOAD_TRANSFER_REQUIRED, LOAD_TRANSFER_FORBIDDEN) },
  { parameterId: "load_transfer_device_quantity_piece", titleRu: "Количество устройств передачи нагрузки", valueType: "decimal", unitId: "piece", required: false, constraints: branchQuantity(LOAD_TRANSFER_REQUIRED, LOAD_TRANSFER_FORBIDDEN) },
  { parameterId: "edge_reinforcement_required", titleRu: "Требуется отдельное армирование кромок шва", valueType: "boolean", unitId: null, required: true, constraints: {} },
  { parameterId: "edge_reinforcement_designation", titleRu: "Армирование кромок по утверждённой ведомости", valueType: "text", unitId: null, required: false, constraints: branchText(REINFORCEMENT_REQUIRED, REINFORCEMENT_FORBIDDEN) },
  { parameterId: "edge_reinforcement_mass_kg", titleRu: "Масса армирования кромок по ведомости", valueType: "decimal", unitId: "kg", required: false, constraints: branchQuantity(REINFORCEMENT_REQUIRED, REINFORCEMENT_FORBIDDEN) },
  { parameterId: "saw_cutting_required", titleRu: "Требуется нарезка шва", valueType: "boolean", unitId: null, required: true, constraints: {} },
  { parameterId: "saw_cutting_equipment_designation", titleRu: "Оборудование для нарезки по технологической карте", valueType: "text", unitId: null, required: false, constraints: branchText(SAW_CUTTING_REQUIRED, SAW_CUTTING_FORBIDDEN) },
  { parameterId: "saw_cutting_machine_h", titleRu: "Машино-время нарезки шва", valueType: "decimal", unitId: "machine_hour", required: false, constraints: branchQuantity(SAW_CUTTING_REQUIRED, SAW_CUTTING_FORBIDDEN) },
  { parameterId: "surface_preparation_equipment_required", titleRu: "Требуется отдельное оборудование подготовки шва", valueType: "boolean", unitId: null, required: true, constraints: {} },
  { parameterId: "surface_preparation_equipment_designation", titleRu: "Оборудование подготовки шва по технологической карте", valueType: "text", unitId: null, required: false, constraints: branchText(PREPARATION_REQUIRED, PREPARATION_FORBIDDEN) },
  { parameterId: "surface_preparation_machine_h", titleRu: "Машино-время подготовки шва", valueType: "decimal", unitId: "machine_hour", required: false, constraints: branchQuantity(PREPARATION_REQUIRED, PREPARATION_FORBIDDEN) },
  { parameterId: "joint_quality_control_required", titleRu: "Требуется отдельный контроль качества шва", valueType: "boolean", unitId: null, required: true, constraints: {} },
  { parameterId: "joint_quality_plan_reference", titleRu: "План контроля качества шва", valueType: "text", unitId: null, required: false, constraints: { ...requiredWhen(QUALITY_REQUIRED), forbiddenWhen: QUALITY_FORBIDDEN, minLength: 1, maxLength: 1_000 } },
  { parameterId: "joint_quality_report_count", titleRu: "Количество комплектов записей контроля", valueType: "decimal", unitId: "document", required: false, constraints: branchQuantity(QUALITY_REQUIRED, QUALITY_FORBIDDEN) },
  { parameterId: "separate_material_delivery_required", titleRu: "Требуется отдельная доставка материалов шва", valueType: "boolean", unitId: null, required: true, constraints: {} },
  { parameterId: "material_delivery_scope_reference", titleRu: "Маршрут и граница отдельной доставки", valueType: "text", unitId: null, required: false, constraints: branchText(DELIVERY_REQUIRED, DELIVERY_FORBIDDEN) },
  { parameterId: "material_delivery_trip_count", titleRu: "Количество рейсов доставки материалов", valueType: "decimal", unitId: "trip", required: false, constraints: branchQuantity(DELIVERY_REQUIRED, DELIVERY_FORBIDDEN) },
  { parameterId: "waste_disposal_required", titleRu: "Требуется вывоз отходов подготовки шва", valueType: "boolean", unitId: null, required: true, constraints: {} },
  { parameterId: "joint_waste_mass_kg", titleRu: "Масса отходов по проектной ведомости", valueType: "decimal", unitId: "kg", required: false, constraints: branchQuantity(WASTE_REQUIRED, WASTE_FORBIDDEN) },
  { parameterId: "waste_transport_trip_count", titleRu: "Количество рейсов вывоза отходов", valueType: "decimal", unitId: "trip", required: false, constraints: branchQuantity(WASTE_REQUIRED, WASTE_FORBIDDEN) },
]);

export const CONCRETE_JOINT_COMPLETE_INSTALLATION_NORMATIVE_PARAMETER_IDS = Object.freeze([
  "joint_length_m",
  "joint_width_mm",
  "joint_depth_mm",
  "joint_type",
] as const);

const NORMATIVE_PARAMETER_IDS = new Set<string>(
  CONCRETE_JOINT_COMPLETE_INSTALLATION_NORMATIVE_PARAMETER_IDS,
);

export type ConcreteJointCompleteInstallationParameterR1 =
CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata: Json;
};

export const CONCRETE_JOINT_COMPLETE_INSTALLATION_PARAMETERS:
readonly ConcreteJointCompleteInstallationParameterR1[] = Object.freeze(
  PARAMETER_SPECS.map((spec, ordinal) => ({
    parameter_id: spec.parameterId,
    ordinal,
    value_type: spec.valueType,
    unit_id: spec.unitId,
    title_ru: spec.titleRu,
    required: spec.required,
    default_value: null,
    constraints_json: spec.constraints,
    truth_metadata: {
      contract: "rik-expo-app.concrete-joint-complete-installation-r1",
      semantic_parameter_key: `concrete-joint-complete:${spec.parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: "PROJECT_SPECIFIC_INPUT",
      input_origin_class: NORMATIVE_PARAMETER_IDS.has(spec.parameterId)
        ? "ACI_APPLICABILITY_AND_APPROVED_PROJECT_JOINT_DETAIL"
        : "APPROVED_PROJECT_SCHEDULE_OR_SUPPLIER_QUOTE",
      ...(spec.constraints.requiredWhen
        ? { required_when: spec.constraints.requiredWhen, visible_when: spec.constraints.requiredWhen }
        : {}),
      preliminary_compilation_allowed: false,
      source_confirmation_required: true,
      guide: {
        guide_kind: NORMATIVE_PARAMETER_IDS.has(spec.parameterId)
          ? "PRACTICE_REFERENCE"
          : "PROJECT_DEFINED",
        guide_short_ru: NORMATIVE_PARAMETER_IDS.has(spec.parameterId)
          ? `${spec.titleRu}: подтвердите по проектному узлу. ACI не задаёт одно значение для всех швов.`
          : `${spec.titleRu}: укажите только если эта ветка нужна по проекту; значение берётся из ведомости или предложения поставщика.`,
        source_role: NORMATIVE_PARAMETER_IDS.has(spec.parameterId)
          ? "ACI_302_JOINT_DESIGN_APPLICABILITY"
          : "APPROVED_PROJECT_DOCUMENTATION_OR_SUPPLIER_QUOTE",
        source_document: NORMATIVE_PARAMETER_IDS.has(spec.parameterId)
          ? CONCRETE_JOINT_COMPLETE_INSTALLATION_SOURCE_ID
          : null,
        source_locator: NORMATIVE_PARAMETER_IDS.has(spec.parameterId)
          ? CONCRETE_JOINT_COMPLETE_INSTALLATION_SOURCE_METADATA.exact_locator
          : null,
        guide_version: "concrete-joint-complete-installation-r1",
        source_snapshot_hash: NORMATIVE_PARAMETER_IDS.has(spec.parameterId)
          ? CONCRETE_JOINT_COMPLETE_INSTALLATION_SOURCE_PDF_SHA256
          : PROJECT_SCHEDULE_GUIDE_SHA256,
        applicability:
          "Тип и детали шва, заполнение, герметизация, защита кромок, передача нагрузки и армирование выбираются проектом; неизвестные количества не заменяются универсальными нормами.",
        verified_at: CONCRETE_JOINT_COMPLETE_INSTALLATION_SOURCE_METADATA.verified_at,
        guide_validation_policy:
          "REJECT_MISSING_JOINT_GEOMETRY_OR_SELECTED_BRANCH_QUANTITY_WITHOUT_INVENTING_VALUES",
      },
      hidden_default_forbidden: true,
      synthetic: false,
    },
  })),
);

export type ConcreteJointCompleteInstallationFormulaR1 =
CanonicalEstimateFormulaDefinition & {
  output_unit_id: string;
  expression_source: string;
};

function formula(
  formulaId: string,
  outputUnitId: string,
  expressionSource: string,
): ConcreteJointCompleteInstallationFormulaR1 {
  const compiled = compileFormulaGraph(expressionSource);
  return {
    formula_id: formulaId,
    output_unit_id: outputUnitId,
    expression_source: expressionSource,
    ast: compiled.ast,
    input_parameter_ids: compiled.inputParameterIds,
    ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256",
  };
}

export const CONCRETE_JOINT_COMPLETE_INSTALLATION_FORMULAS:
readonly ConcreteJointCompleteInstallationFormulaR1[] = Object.freeze([
  formula("concrete_joint_scope_length_v1", "m", "joint_length_m"),
  formula("concrete_joint_geometry_check_volume_v1", "m3", "joint_length_m * joint_width_mm * joint_depth_mm / 1000000"),
  formula("concrete_joint_installation_labor_v1", "man_hour", "joint_installation_worker_h"),
  formula("concrete_joint_premolded_filler_v1", "m", "premolded_filler_length_m"),
  formula("concrete_joint_backer_rod_v1", "m", "backer_rod_length_m"),
  formula("concrete_joint_sealant_v1", "l", "joint_sealant_quantity_l"),
  formula("concrete_joint_waterstop_v1", "m", "waterstop_length_m"),
  formula("concrete_joint_edge_profile_v1", "m", "edge_protection_profile_length_m"),
  formula("concrete_joint_load_transfer_v1", "piece", "load_transfer_device_quantity_piece"),
  formula("concrete_joint_edge_reinforcement_v1", "kg", "edge_reinforcement_mass_kg"),
  formula("concrete_joint_saw_cutting_v1", "machine_hour", "saw_cutting_machine_h"),
  formula("concrete_joint_surface_preparation_v1", "machine_hour", "surface_preparation_machine_h"),
  formula("concrete_joint_quality_control_v1", "document", "joint_quality_report_count"),
  formula("concrete_joint_material_delivery_v1", "trip", "material_delivery_trip_count"),
  formula("concrete_joint_waste_v1", "kg", "joint_waste_mass_kg"),
  formula("concrete_joint_waste_transport_v1", "trip", "waste_transport_trip_count"),
]);

const literalTrue = Object.freeze({ kind: "literal", value: true });
const greaterThan = (parameterId: string, value: number): Json => ({
  kind: "greater_than",
  parameterId,
  value,
});

const ACI_TRACE = Object.freeze({
  sourceId: CONCRETE_JOINT_COMPLETE_INSTALLATION_SOURCE_ID,
  source_id: CONCRETE_JOINT_COMPLETE_INSTALLATION_SOURCE_ID,
  normId: CONCRETE_JOINT_COMPLETE_INSTALLATION_NORM_ID,
  norm_id: CONCRETE_JOINT_COMPLETE_INSTALLATION_NORM_ID,
  normVersion: CONCRETE_JOINT_COMPLETE_INSTALLATION_SOURCE_METADATA.source_document_version,
  source_title: CONCRETE_JOINT_COMPLETE_INSTALLATION_SOURCE_METADATA.source_title,
  source_url: CONCRETE_JOINT_COMPLETE_INSTALLATION_SOURCE_METADATA.source_url,
  exact_locator: CONCRETE_JOINT_COMPLETE_INSTALLATION_SOURCE_METADATA.exact_locator,
  source_definition_hash: CONCRETE_JOINT_COMPLETE_INSTALLATION_SOURCE_METADATA.definition_hash,
  sourceRole: "JOINT_DESIGN_APPLICABILITY_NOT_UNIVERSAL_CONSUMPTION_OR_PRODUCTIVITY",
});

function resource(input: {
  rowId: string;
  ordinal: number;
  section: string;
  category: string;
  titleRu: string;
  unitId: string;
  formulaId: string;
  procurementEligible: boolean;
  sourceRole: string;
  inclusionAst?: Json;
  consumerParameterIds: readonly string[];
}): CanonicalEstimateResourceDefinition {
  const resourceGraph = {
    formulaId: input.formulaId,
    normalizedUom: input.unitId,
    semanticOwnerId: `concrete-joint-complete:${input.rowId}`,
    costOwner: "resource",
    inputParameterIds: [...input.consumerParameterIds],
    normativeMethodGuidanceV1: {
      source_id: CONCRETE_JOINT_COMPLETE_INSTALLATION_SOURCE_ID,
      norm_id: CONCRETE_JOINT_COMPLETE_INSTALLATION_NORM_ID,
      operation_class: "INSTALL_PROJECT_SPECIFIED_CONCRETE_JOINT",
      scope_mode: "APPROVED_PROJECT_JOINT_DETAIL_AND_DIRECT_SCHEDULE_QUANTITIES",
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
    },
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: input.sourceRole,
    quantitySourceRole: "APPROVED_PROJECT_JOINT_DETAIL_AND_DIRECT_PROJECT_SCHEDULE",
    normativeTrace: [ACI_TRACE, {
      sourceId: "project_concrete_joint_schedule",
      sourceRole: input.sourceRole,
    }],
    excludedUnownedAssumptions: [
      "automatic joint type or product selection",
      "automatic material consumption or waste factor",
      "automatic labor or equipment productivity",
      "reinforcing bars crossing a movement joint without an explicit design",
      "hidden delivery trips",
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

export const CONCRETE_JOINT_COMPLETE_INSTALLATION_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({ rowId: "work:concrete:joint-complete-installation", ordinal: 0, section: "Работы", category: "construction_work", titleRu: "Устройство деформационного шва по утверждённому проектному узлу", unitId: "m", formulaId: "concrete_joint_scope_length_v1", procurementEligible: false, sourceRole: "APPROVED_PROJECT_JOINT_SCOPE", consumerParameterIds: ["joint_length_m", "joint_width_mm", "joint_depth_mm", "joint_type", "joint_location", "approved_joint_detail_reference", "joint_method_statement_reference"] }),
  resource({ rowId: "labor:concrete:joint-complete-installation", ordinal: 1, section: "Работы", category: "labor", titleRu: "Трудозатраты бригады по устройству деформационного шва", unitId: "man_hour", formulaId: "concrete_joint_installation_labor_v1", procurementEligible: false, sourceRole: "APPROVED_PROJECT_JOINT_INSTALLATION_LABOR_SCHEDULE", consumerParameterIds: ["joint_installation_worker_h"] }),
  resource({ rowId: "material:concrete:joint-premolded-filler", ordinal: 2, section: "Материалы", category: "material", titleRu: "Готовый заполнитель деформационного шва по проектной спецификации", unitId: "m", formulaId: "concrete_joint_premolded_filler_v1", inclusionAst: and(FILLER_REQUIRED, greaterThan("premolded_filler_length_m", 0)), procurementEligible: true, sourceRole: "APPROVED_PROJECT_PREMOLDED_FILLER_SCHEDULE", consumerParameterIds: ["premolded_filler_required", "premolded_filler_designation", "premolded_filler_length_m"] }),
  resource({ rowId: "material:concrete:joint-backer-rod", ordinal: 3, section: "Материалы", category: "material", titleRu: "Уплотнительный шнур для шва по проектной спецификации", unitId: "m", formulaId: "concrete_joint_backer_rod_v1", inclusionAst: and(BACKER_ROD_REQUIRED, greaterThan("backer_rod_length_m", 0)), procurementEligible: true, sourceRole: "APPROVED_PROJECT_BACKER_ROD_SCHEDULE", consumerParameterIds: ["backer_rod_required", "backer_rod_designation", "backer_rod_length_m"] }),
  resource({ rowId: "material:concrete:joint-sealant", ordinal: 4, section: "Материалы", category: "material", titleRu: "Герметик или полужёсткий заполнитель шва по проектной спецификации", unitId: "l", formulaId: "concrete_joint_sealant_v1", inclusionAst: and(SEALANT_REQUIRED, greaterThan("joint_sealant_quantity_l", 0)), procurementEligible: true, sourceRole: "APPROVED_PROJECT_JOINT_SEALANT_SCHEDULE", consumerParameterIds: ["joint_width_mm", "joint_depth_mm", "joint_sealant_required", "joint_sealant_designation", "joint_sealant_quantity_l"] }),
  resource({ rowId: "material:concrete:joint-waterstop", ordinal: 5, section: "Материалы", category: "material", titleRu: "Гидроизоляционная шпонка или лента деформационного шва", unitId: "m", formulaId: "concrete_joint_waterstop_v1", inclusionAst: and(WATERSTOP_REQUIRED, greaterThan("waterstop_length_m", 0)), procurementEligible: true, sourceRole: "APPROVED_PROJECT_WATERSTOP_SCHEDULE", consumerParameterIds: ["waterstop_required", "waterstop_designation", "waterstop_length_m"] }),
  resource({ rowId: "material:concrete:joint-edge-profile", ordinal: 6, section: "Материалы", category: "material", titleRu: "Защитный профиль кромок деформационного шва", unitId: "m", formulaId: "concrete_joint_edge_profile_v1", inclusionAst: and(EDGE_PROFILE_REQUIRED, greaterThan("edge_protection_profile_length_m", 0)), procurementEligible: true, sourceRole: "APPROVED_PROJECT_JOINT_EDGE_PROFILE_SCHEDULE", consumerParameterIds: ["edge_protection_profile_required", "edge_protection_profile_designation", "edge_protection_profile_length_m"] }),
  resource({ rowId: "material:concrete:joint-load-transfer-devices", ordinal: 7, section: "Материалы", category: "material", titleRu: "Устройства передачи нагрузки через шов по проекту", unitId: "piece", formulaId: "concrete_joint_load_transfer_v1", inclusionAst: and(LOAD_TRANSFER_REQUIRED, greaterThan("load_transfer_device_quantity_piece", 0)), procurementEligible: true, sourceRole: "APPROVED_PROJECT_LOAD_TRANSFER_DEVICE_SCHEDULE", consumerParameterIds: ["load_transfer_device_required", "load_transfer_device_designation", "load_transfer_device_quantity_piece"] }),
  resource({ rowId: "material:concrete:joint-edge-reinforcement", ordinal: 8, section: "Материалы", category: "material", titleRu: "Армирование кромок шва по утверждённой ведомости", unitId: "kg", formulaId: "concrete_joint_edge_reinforcement_v1", inclusionAst: and(REINFORCEMENT_REQUIRED, greaterThan("edge_reinforcement_mass_kg", 0)), procurementEligible: true, sourceRole: "APPROVED_PROJECT_JOINT_EDGE_REINFORCEMENT_SCHEDULE", consumerParameterIds: ["edge_reinforcement_required", "edge_reinforcement_designation", "edge_reinforcement_mass_kg"] }),
  resource({ rowId: "equipment:concrete:joint-saw-cutting", ordinal: 9, section: "Оборудование", category: "equipment", titleRu: "Оборудование для нарезки шва по технологической карте", unitId: "machine_hour", formulaId: "concrete_joint_saw_cutting_v1", inclusionAst: and(SAW_CUTTING_REQUIRED, greaterThan("saw_cutting_machine_h", 0)), procurementEligible: true, sourceRole: "APPROVED_PROJECT_JOINT_SAW_CUTTING_SCHEDULE", consumerParameterIds: ["saw_cutting_required", "saw_cutting_equipment_designation", "saw_cutting_machine_h"] }),
  resource({ rowId: "equipment:concrete:joint-surface-preparation", ordinal: 10, section: "Оборудование", category: "equipment", titleRu: "Оборудование подготовки поверхностей шва", unitId: "machine_hour", formulaId: "concrete_joint_surface_preparation_v1", inclusionAst: and(PREPARATION_REQUIRED, greaterThan("surface_preparation_machine_h", 0)), procurementEligible: true, sourceRole: "APPROVED_PROJECT_JOINT_PREPARATION_SCHEDULE", consumerParameterIds: ["surface_preparation_equipment_required", "surface_preparation_equipment_designation", "surface_preparation_machine_h"] }),
  resource({ rowId: "service:concrete:joint-quality-control", ordinal: 11, section: "Услуги", category: "service", titleRu: "Контроль качества устройства деформационного шва", unitId: "document", formulaId: "concrete_joint_quality_control_v1", inclusionAst: and(QUALITY_REQUIRED, greaterThan("joint_quality_report_count", 0)), procurementEligible: true, sourceRole: "APPROVED_PROJECT_JOINT_QUALITY_PLAN", consumerParameterIds: ["joint_quality_control_required", "joint_quality_plan_reference", "joint_quality_report_count"] }),
  resource({ rowId: "delivery:concrete:joint-materials", ordinal: 12, section: "Логистика", category: "delivery", titleRu: "Отдельная доставка материалов деформационного шва", unitId: "trip", formulaId: "concrete_joint_material_delivery_v1", inclusionAst: and(DELIVERY_REQUIRED, greaterThan("material_delivery_trip_count", 0)), procurementEligible: true, sourceRole: "SUPPLIER_JOINT_MATERIAL_DELIVERY_QUOTE", consumerParameterIds: ["separate_material_delivery_required", "material_delivery_scope_reference", "material_delivery_trip_count"] }),
  resource({ rowId: "service:concrete:joint-waste-disposal", ordinal: 13, section: "Услуги", category: "service", titleRu: "Приём и утилизация отходов подготовки шва", unitId: "kg", formulaId: "concrete_joint_waste_v1", inclusionAst: and(WASTE_REQUIRED, greaterThan("joint_waste_mass_kg", 0)), procurementEligible: true, sourceRole: "APPROVED_PROJECT_JOINT_WASTE_SCHEDULE", consumerParameterIds: ["waste_disposal_required", "joint_waste_mass_kg"] }),
  resource({ rowId: "delivery:concrete:joint-waste", ordinal: 14, section: "Логистика", category: "delivery", titleRu: "Вывоз отходов подготовки деформационного шва", unitId: "trip", formulaId: "concrete_joint_waste_transport_v1", inclusionAst: and(WASTE_REQUIRED, greaterThan("waste_transport_trip_count", 0)), procurementEligible: true, sourceRole: "APPROVED_PROJECT_JOINT_WASTE_TRANSPORT_SCHEDULE", consumerParameterIds: ["waste_disposal_required", "waste_transport_trip_count"] }),
]);

const PROJECT_SCHEDULES: Readonly<Record<
ConcreteJointCompleteInstallationContextKey,
Readonly<Record<string, ConcreteJointCompleteInstallationInputValueR1>>
>> = Object.freeze({
  standard: { joint_length_m: 42, joint_width_mm: 15, joint_depth_mm: 20, joint_type: "ISOLATION", joint_installation_worker_h: 20, premolded_filler_required: true, premolded_filler_designation: "JF-STANDARD-FILLER-REV-A", premolded_filler_length_m: 42, backer_rod_required: true, backer_rod_designation: "JR-STANDARD-20-REV-A", backer_rod_length_m: 42, joint_sealant_required: true, joint_sealant_designation: "JS-STANDARD-REV-A", joint_sealant_quantity_l: 12.6, waterstop_required: false, edge_protection_profile_required: false, load_transfer_device_required: false, edge_reinforcement_required: false, saw_cutting_required: false, surface_preparation_equipment_required: false, joint_quality_control_required: true, joint_quality_plan_reference: "QP-JOINT-STANDARD-REV-A", joint_quality_report_count: 2, separate_material_delivery_required: false, waste_disposal_required: false },
  high_load: { joint_length_m: 86, joint_width_mm: 20, joint_depth_mm: 25, joint_type: "CONSTRUCTION", joint_installation_worker_h: 64, premolded_filler_required: false, backer_rod_required: false, joint_sealant_required: true, joint_sealant_designation: "JS-HIGH-LOAD-SEMI-RIGID-REV-A", joint_sealant_quantity_l: 43, waterstop_required: false, edge_protection_profile_required: true, edge_protection_profile_designation: "JEP-HIGH-LOAD-REV-A", edge_protection_profile_length_m: 172, load_transfer_device_required: true, load_transfer_device_designation: "LTD-HIGH-LOAD-SLEEVED-DOWEL-REV-A", load_transfer_device_quantity_piece: 144, edge_reinforcement_required: true, edge_reinforcement_designation: "BBS-JOINT-HIGH-LOAD-REV-A; NO-BAR-CROSSING-UNLESS-SLEEVED", edge_reinforcement_mass_kg: 1_180, saw_cutting_required: true, saw_cutting_equipment_designation: "SAW-HIGH-LOAD-REV-A", saw_cutting_machine_h: 12, surface_preparation_equipment_required: true, surface_preparation_equipment_designation: "PREP-HIGH-LOAD-REV-A", surface_preparation_machine_h: 8, joint_quality_control_required: true, joint_quality_plan_reference: "QP-JOINT-HIGH-LOAD-REV-A", joint_quality_report_count: 4, separate_material_delivery_required: true, material_delivery_scope_reference: "LOG-JOINT-HIGH-LOAD-REV-A", material_delivery_trip_count: 2, waste_disposal_required: true, joint_waste_mass_kg: 240, waste_transport_trip_count: 1 },
  large_area: { joint_length_m: 240, joint_width_mm: 8, joint_depth_mm: 35, joint_type: "CONTRACTION", joint_installation_worker_h: 72, premolded_filler_required: false, backer_rod_required: false, joint_sealant_required: true, joint_sealant_designation: "JS-LARGE-AREA-REV-A", joint_sealant_quantity_l: 67.2, waterstop_required: false, edge_protection_profile_required: false, load_transfer_device_required: false, edge_reinforcement_required: false, saw_cutting_required: true, saw_cutting_equipment_designation: "EARLY-ENTRY-SAW-LARGE-AREA-REV-A", saw_cutting_machine_h: 24, surface_preparation_equipment_required: false, joint_quality_control_required: true, joint_quality_plan_reference: "QP-JOINT-LARGE-AREA-REV-A", joint_quality_report_count: 6, separate_material_delivery_required: true, material_delivery_scope_reference: "LOG-JOINT-LARGE-AREA-REV-A", material_delivery_trip_count: 2, waste_disposal_required: false },
  repair: { joint_length_m: 18, joint_width_mm: 18, joint_depth_mm: 30, joint_type: "EXPANSION_OR_MOVEMENT", joint_installation_worker_h: 22, premolded_filler_required: false, backer_rod_required: true, backer_rod_designation: "JR-REPAIR-25-REV-A", backer_rod_length_m: 18, joint_sealant_required: true, joint_sealant_designation: "JS-REPAIR-REV-A", joint_sealant_quantity_l: 9.72, waterstop_required: false, edge_protection_profile_required: false, load_transfer_device_required: false, edge_reinforcement_required: false, saw_cutting_required: false, surface_preparation_equipment_required: true, surface_preparation_equipment_designation: "PREP-REPAIR-REV-A", surface_preparation_machine_h: 6, joint_quality_control_required: true, joint_quality_plan_reference: "QP-JOINT-REPAIR-REV-A", joint_quality_report_count: 2, separate_material_delivery_required: false, waste_disposal_required: true, joint_waste_mass_kg: 95, waste_transport_trip_count: 1 },
  small_area: { joint_length_m: 9, joint_width_mm: 12, joint_depth_mm: 18, joint_type: "ISOLATION", joint_installation_worker_h: 7, premolded_filler_required: true, premolded_filler_designation: "JF-SMALL-AREA-REV-A", premolded_filler_length_m: 9, backer_rod_required: false, joint_sealant_required: false, waterstop_required: false, edge_protection_profile_required: false, load_transfer_device_required: false, edge_reinforcement_required: false, saw_cutting_required: false, surface_preparation_equipment_required: false, joint_quality_control_required: false, separate_material_delivery_required: false, waste_disposal_required: false },
  technical_room: { joint_length_m: 28, joint_width_mm: 20, joint_depth_mm: 25, joint_type: "CONSTRUCTION", joint_installation_worker_h: 24, premolded_filler_required: false, backer_rod_required: false, joint_sealant_required: true, joint_sealant_designation: "JS-TECHNICAL-ROOM-SEMI-RIGID-REV-A", joint_sealant_quantity_l: 14, waterstop_required: false, edge_protection_profile_required: true, edge_protection_profile_designation: "JEP-TECHNICAL-ROOM-REV-A", edge_protection_profile_length_m: 56, load_transfer_device_required: true, load_transfer_device_designation: "LTD-TECHNICAL-ROOM-REV-A", load_transfer_device_quantity_piece: 46, edge_reinforcement_required: false, saw_cutting_required: false, surface_preparation_equipment_required: false, joint_quality_control_required: true, joint_quality_plan_reference: "QP-JOINT-TECHNICAL-ROOM-REV-A", joint_quality_report_count: 2, separate_material_delivery_required: true, material_delivery_scope_reference: "LOG-JOINT-TECHNICAL-ROOM-REV-A", material_delivery_trip_count: 1, waste_disposal_required: false },
  wet_zone: { joint_length_m: 36, joint_width_mm: 25, joint_depth_mm: 30, joint_type: "EXPANSION_OR_MOVEMENT", joint_installation_worker_h: 38, premolded_filler_required: true, premolded_filler_designation: "JF-WET-ZONE-REV-A", premolded_filler_length_m: 36, backer_rod_required: true, backer_rod_designation: "JR-WET-ZONE-32-REV-A", backer_rod_length_m: 36, joint_sealant_required: true, joint_sealant_designation: "JS-WET-ZONE-ELASTOMERIC-REV-A", joint_sealant_quantity_l: 27, waterstop_required: true, waterstop_designation: "WS-WET-ZONE-REV-A", waterstop_length_m: 36, edge_protection_profile_required: false, load_transfer_device_required: false, edge_reinforcement_required: false, saw_cutting_required: false, surface_preparation_equipment_required: true, surface_preparation_equipment_designation: "PREP-WET-ZONE-REV-A", surface_preparation_machine_h: 5, joint_quality_control_required: true, joint_quality_plan_reference: "QP-JOINT-WET-ZONE-REV-A", joint_quality_report_count: 3, separate_material_delivery_required: true, material_delivery_scope_reference: "LOG-JOINT-WET-ZONE-REV-A", material_delivery_trip_count: 1, waste_disposal_required: false },
});

export function concreteJointCompleteInstallationAcceptanceInputR1(
  contextKey: ConcreteJointCompleteInstallationContextKey,
): Readonly<Record<string, ConcreteJointCompleteInstallationInputValueR1>> {
  const target = CONCRETE_JOINT_COMPLETE_INSTALLATION_TARGETS.find(
    (candidate) => candidate.contextKey === contextKey,
  );
  if (!target) {
    throw new Error(`CONCRETE_JOINT_COMPLETE_CONTEXT_UNSUPPORTED:${contextKey}`);
  }
  const reference = contextKey.toUpperCase().replace(/_/gu, "-");
  return Object.freeze({
    joint_location: `Бетонная конструкция; ${target.contextRu}; линия CJ-${reference}`,
    approved_joint_detail_reference: `DETAIL-CJ-${reference}-REV-A`,
    joint_method_statement_reference: `MS-CJ-${reference}-REV-A`,
    ...PROJECT_SCHEDULES[contextKey],
  });
}

export async function compileConcreteJointCompleteInstallationR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId
    ?? CONCRETE_JOINT_COMPLETE_INSTALLATION_TARGETS[0].catalogId;
  if (!CONCRETE_JOINT_COMPLETE_INSTALLATION_TARGETS.some(
    (target) => target.catalogId === catalogId,
  )) {
    throw new Error(`CONCRETE_JOINT_COMPLETE_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.concrete-joint-complete-installation-r1",
    catalogId,
    primaryMeasureParameterId: "joint_length_m",
    parameterDefinitions: [...CONCRETE_JOINT_COMPLETE_INSTALLATION_PARAMETERS],
    formulaDefinitions: [...CONCRETE_JOINT_COMPLETE_INSTALLATION_FORMULAS],
    resourceDefinitions: [...CONCRETE_JOINT_COMPLETE_INSTALLATION_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 18,
    hashJson: async (value) => JSON.stringify(value),
  });
}
