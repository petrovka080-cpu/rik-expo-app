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
export type ConcreteSlabRepairInputValueR1 = string | number | boolean;

export const CONCRETE_SLAB_REPAIR_SOURCE_ID =
  "src_professional_norm_pack_concrete_aci_562_25_project_repair_schedule_v1";
export const CONCRETE_SLAB_REPAIR_GUIDE_SOURCE_ID =
  "src_professional_norm_pack_concrete_aci_prc_546_23_repair_method_selection_v1";
export const CONCRETE_SLAB_REPAIR_NORM_ID =
  "concrete_aci_562_25_546_23_project_repair_schedule_v1";
export const CONCRETE_SLAB_REPAIR_CODE_PDF_SHA256 =
  "e2660cb138f3c8b5799d9b54d73439d71c1de697110ab094bf1564732542c4fa";
export const CONCRETE_SLAB_REPAIR_GUIDE_PDF_SHA256 =
  "bdbe313456af4f6725aa31da7777925a7736c421cd000773b9bacc8f215c7e50";
const PROJECT_SCHEDULE_GUIDE_SHA256 =
  "03aa630b0d455e1938d4f3131ae47f558a55225e12881658944d2ecf9a314f31";

export const CONCRETE_SLAB_REPAIR_SOURCE_METADATA = Object.freeze({
  source_id: CONCRETE_SLAB_REPAIR_SOURCE_ID,
  source_title:
    "ACI CODE-562-25 and ACI PRC-546-23: assessment, design and method selection for concrete repair",
  source_document_version: "ACI CODE-562-25 + ACI PRC-546-23",
  source_url:
    "https://www.concrete.org/Portals/0/Files/PDF/Previews/562-25_preview.pdf",
  product_url: "https://www.concrete.org/store/productdetail.aspx?itemid=56225",
  supporting_source_id: CONCRETE_SLAB_REPAIR_GUIDE_SOURCE_ID,
  supporting_source_url:
    "https://www.concrete.org/Portals/0/Files/PDF/Previews/546-23_preview.pdf",
  supporting_product_url:
    "https://www.concrete.org/store/productdetail?ItemID=54623&Language=English&Units=US_AND_METRIC",
  exact_locator:
    "ACI CODE-562-25 Chapters 6, 9 and 12-13: assessment, repair design, construction documents and quality assurance; ACI PRC-546-23 public description: selection and application of repair materials and methods.",
  definition_hash: CONCRETE_SLAB_REPAIR_CODE_PDF_SHA256,
  supporting_definition_hash: CONCRETE_SLAB_REPAIR_GUIDE_PDF_SHA256,
  verified_at: "2026-09-18T00:00:00+06:00",
  universal_productivity_claimed: false,
  universal_consumption_claimed: false,
  quantity_basis: "APPROVED_REPAIR_DESIGN_METHOD_AND_DIRECT_PROJECT_SCHEDULE",
});

export const CONCRETE_SLAB_REPAIR_TARGETS = Object.freeze([
  { contextKey: "standard", catalogId: "canonical-work:base:concrete_foundation_interior_concrete_slab_repair_standard", titleRu: "Ремонт бетонной плиты в стандартной зоне", contextRu: "стандартная зона" },
  { contextKey: "high_load", catalogId: "canonical-work:base:concrete_foundation_interior_concrete_slab_repair_high_load", titleRu: "Ремонт бетонной плиты для высокой нагрузки", contextRu: "зона высокой нагрузки" },
  { contextKey: "large_area", catalogId: "canonical-work:base:concrete_foundation_interior_concrete_slab_repair_large_area", titleRu: "Ремонт бетонной плиты на большой площади", contextRu: "большая площадь" },
  { contextKey: "repair", catalogId: "canonical-work:base:concrete_foundation_interior_concrete_slab_repair_repair", titleRu: "Ремонт бетонной плиты с локальным ремонтом основания", contextRu: "локальный ремонт основания" },
  { contextKey: "small_area", catalogId: "canonical-work:base:concrete_foundation_interior_concrete_slab_repair_small_area", titleRu: "Ремонт бетонной плиты на малой площади", contextRu: "малая площадь" },
  { contextKey: "technical_room", catalogId: "canonical-work:base:concrete_foundation_interior_concrete_slab_repair_technical_room", titleRu: "Ремонт бетонной плиты в техническом помещении", contextRu: "техническое помещение" },
  { contextKey: "wet_zone", catalogId: "canonical-work:base:concrete_foundation_interior_concrete_slab_repair_wet_zone", titleRu: "Ремонт бетонной плиты во влажной зоне", contextRu: "влажная зона" },
] as const);

export type ConcreteSlabRepairContextKey =
  (typeof CONCRETE_SLAB_REPAIR_TARGETS)[number]["contextKey"];

type ParameterSpec = Readonly<{
  parameterId: string;
  titleRu: string;
  valueType: "decimal" | "text" | "boolean";
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
const BOND_REQUIRED = equals("bonding_agent_required", true);
const BOND_FORBIDDEN = equals("bonding_agent_required", false);
const REBAR_TREATMENT_REQUIRED = equals("reinforcement_treatment_required", true);
const REBAR_TREATMENT_FORBIDDEN = equals("reinforcement_treatment_required", false);
const CURING_MATERIAL_REQUIRED = equals("curing_material_required", true);
const CURING_MATERIAL_FORBIDDEN = equals("curing_material_required", false);
const REMOVAL_EQUIPMENT_REQUIRED = equals("removal_equipment_required", true);
const REMOVAL_EQUIPMENT_FORBIDDEN = equals("removal_equipment_required", false);
const MIXING_EQUIPMENT_REQUIRED = equals("mixing_equipment_required", true);
const MIXING_EQUIPMENT_FORBIDDEN = equals("mixing_equipment_required", false);
const DUST_CONTROL_REQUIRED = equals("dust_control_equipment_required", true);
const DUST_CONTROL_FORBIDDEN = equals("dust_control_equipment_required", false);
const MATERIAL_TESTING_REQUIRED = equals("material_testing_required", true);
const MATERIAL_TESTING_FORBIDDEN = equals("material_testing_required", false);
const WASTE_DISPOSAL_REQUIRED = equals("waste_disposal_required", true);
const WASTE_DISPOSAL_FORBIDDEN = equals("waste_disposal_required", false);

const conditionalText = (requiredWhen: Json, forbiddenWhen: Json): Json => ({
  minLength: 1,
  maxLength: 1_000,
  requiredWhen,
  forbiddenWhen,
});
const conditionalQuantity = (requiredWhen: Json, forbiddenWhen: Json): Json => ({
  min: 0.001,
  requiredWhen,
  forbiddenWhen,
});

const PARAMETER_SPECS: readonly ParameterSpec[] = Object.freeze([
  { parameterId: "repair_scope_volume_m3", titleRu: "Проектный объём участка ремонта бетонной плиты", valueType: "decimal", unitId: "m3", required: true, constraints: { min: 0.001 } },
  { parameterId: "repair_surface_area_m2", titleRu: "Площадь участка ремонта бетонной плиты", valueType: "decimal", unitId: "m2", required: true, constraints: { min: 0.001 } },
  { parameterId: "condition_assessment_reference", titleRu: "Отчёт обследования и причины повреждения", valueType: "text", unitId: null, required: true, constraints: { minLength: 1, maxLength: 1_000 } },
  { parameterId: "approved_repair_design_reference", titleRu: "Утверждённый проект ремонта бетонной плиты", valueType: "text", unitId: null, required: true, constraints: { minLength: 1, maxLength: 1_000 } },
  { parameterId: "approved_repair_method_designation", titleRu: "Утверждённый способ ремонта бетонной плиты", valueType: "text", unitId: null, required: true, constraints: { minLength: 1, maxLength: 1_000 } },
  { parameterId: "repair_method_statement_reference", titleRu: "Технологическая карта ремонта бетонной плиты", valueType: "text", unitId: null, required: true, constraints: { minLength: 1, maxLength: 1_000 } },
  { parameterId: "repair_material_designation", titleRu: "Ремонтный материал по проектной спецификации", valueType: "text", unitId: null, required: true, constraints: { minLength: 1, maxLength: 1_000 } },
  { parameterId: "repair_material_quantity_kg", titleRu: "Количество ремонтного материала по проектной ведомости", valueType: "decimal", unitId: "kg", required: true, constraints: { min: 0.001 } },
  { parameterId: "damaged_concrete_removal_volume_m3", titleRu: "Объём удаления повреждённого бетона", valueType: "decimal", unitId: "m3", required: true, constraints: { min: 0.001 } },
  { parameterId: "bonding_agent_required", titleRu: "Требуется отдельный контактный состав", valueType: "boolean", unitId: null, required: true, constraints: {} },
  { parameterId: "bonding_agent_designation", titleRu: "Контактный состав по проектной спецификации", valueType: "text", unitId: null, required: false, constraints: conditionalText(BOND_REQUIRED, BOND_FORBIDDEN) },
  { parameterId: "bonding_agent_quantity_kg", titleRu: "Количество контактного состава по проектной ведомости", valueType: "decimal", unitId: "kg", required: false, constraints: conditionalQuantity(BOND_REQUIRED, BOND_FORBIDDEN) },
  { parameterId: "reinforcement_treatment_required", titleRu: "Требуется обработка вскрытой арматуры", valueType: "boolean", unitId: null, required: true, constraints: {} },
  { parameterId: "reinforcement_treatment_designation", titleRu: "Состав обработки арматуры по проектной спецификации", valueType: "text", unitId: null, required: false, constraints: conditionalText(REBAR_TREATMENT_REQUIRED, REBAR_TREATMENT_FORBIDDEN) },
  { parameterId: "reinforcement_treatment_quantity_kg", titleRu: "Количество состава обработки арматуры", valueType: "decimal", unitId: "kg", required: false, constraints: conditionalQuantity(REBAR_TREATMENT_REQUIRED, REBAR_TREATMENT_FORBIDDEN) },
  { parameterId: "curing_material_required", titleRu: "Требуется отдельный материал ухода за ремонтом", valueType: "boolean", unitId: null, required: true, constraints: {} },
  { parameterId: "curing_material_designation", titleRu: "Материал ухода по проектной спецификации", valueType: "text", unitId: null, required: false, constraints: conditionalText(CURING_MATERIAL_REQUIRED, CURING_MATERIAL_FORBIDDEN) },
  { parameterId: "curing_material_quantity_kg", titleRu: "Количество материала ухода по проектной ведомости", valueType: "decimal", unitId: "kg", required: false, constraints: conditionalQuantity(CURING_MATERIAL_REQUIRED, CURING_MATERIAL_FORBIDDEN) },
  { parameterId: "damaged_concrete_removal_worker_h", titleRu: "Трудозатраты на удаление повреждённого бетона", valueType: "decimal", unitId: "man_hour", required: true, constraints: { min: 0.001 } },
  { parameterId: "substrate_preparation_worker_h", titleRu: "Трудозатраты на подготовку ремонтной поверхности", valueType: "decimal", unitId: "man_hour", required: true, constraints: { min: 0.001 } },
  { parameterId: "repair_material_placement_worker_h", titleRu: "Трудозатраты на укладку ремонтного материала", valueType: "decimal", unitId: "man_hour", required: true, constraints: { min: 0.001 } },
  { parameterId: "repair_curing_worker_h", titleRu: "Трудозатраты на уход за отремонтированным участком", valueType: "decimal", unitId: "man_hour", required: true, constraints: { min: 0.001 } },
  { parameterId: "removal_equipment_required", titleRu: "Требуется отдельное оборудование для удаления бетона", valueType: "boolean", unitId: null, required: true, constraints: {} },
  { parameterId: "removal_equipment_designation", titleRu: "Оборудование для удаления бетона по ведомости", valueType: "text", unitId: null, required: false, constraints: conditionalText(REMOVAL_EQUIPMENT_REQUIRED, REMOVAL_EQUIPMENT_FORBIDDEN) },
  { parameterId: "removal_equipment_machine_h", titleRu: "Машино-время оборудования для удаления бетона", valueType: "decimal", unitId: "machine_hour", required: false, constraints: conditionalQuantity(REMOVAL_EQUIPMENT_REQUIRED, REMOVAL_EQUIPMENT_FORBIDDEN) },
  { parameterId: "mixing_equipment_required", titleRu: "Требуется отдельное смесительное оборудование", valueType: "boolean", unitId: null, required: true, constraints: {} },
  { parameterId: "mixing_equipment_designation", titleRu: "Смесительное оборудование по ведомости", valueType: "text", unitId: null, required: false, constraints: conditionalText(MIXING_EQUIPMENT_REQUIRED, MIXING_EQUIPMENT_FORBIDDEN) },
  { parameterId: "mixing_equipment_machine_h", titleRu: "Машино-время смесительного оборудования", valueType: "decimal", unitId: "machine_hour", required: false, constraints: conditionalQuantity(MIXING_EQUIPMENT_REQUIRED, MIXING_EQUIPMENT_FORBIDDEN) },
  { parameterId: "dust_control_equipment_required", titleRu: "Требуется отдельное оборудование пылеудаления", valueType: "boolean", unitId: null, required: true, constraints: {} },
  { parameterId: "dust_control_equipment_designation", titleRu: "Оборудование пылеудаления по ведомости", valueType: "text", unitId: null, required: false, constraints: conditionalText(DUST_CONTROL_REQUIRED, DUST_CONTROL_FORBIDDEN) },
  { parameterId: "dust_control_equipment_machine_h", titleRu: "Машино-время оборудования пылеудаления", valueType: "decimal", unitId: "machine_hour", required: false, constraints: conditionalQuantity(DUST_CONTROL_REQUIRED, DUST_CONTROL_FORBIDDEN) },
  { parameterId: "quality_plan_reference", titleRu: "План контроля качества ремонта", valueType: "text", unitId: null, required: true, constraints: { minLength: 1, maxLength: 1_000 } },
  { parameterId: "inspection_report_count", titleRu: "Комплект записей освидетельствования ремонта", valueType: "decimal", unitId: "document", required: true, constraints: { min: 0.001 } },
  { parameterId: "material_testing_required", titleRu: "Требуются отдельные испытания ремонтных материалов", valueType: "boolean", unitId: null, required: true, constraints: {} },
  { parameterId: "material_test_report_count", titleRu: "Комплект протоколов испытаний ремонтных материалов", valueType: "decimal", unitId: "document", required: false, constraints: conditionalQuantity(MATERIAL_TESTING_REQUIRED, MATERIAL_TESTING_FORBIDDEN) },
  { parameterId: "material_delivery_trip_count", titleRu: "Рейсы доставки ремонтных материалов", valueType: "decimal", unitId: "trip", required: true, constraints: { min: 0.001 } },
  { parameterId: "waste_disposal_required", titleRu: "Требуются отдельные вывоз и размещение отходов", valueType: "boolean", unitId: null, required: true, constraints: {} },
  { parameterId: "waste_disposal_volume_m3", titleRu: "Объём отходов ремонта для размещения", valueType: "decimal", unitId: "m3", required: false, constraints: conditionalQuantity(WASTE_DISPOSAL_REQUIRED, WASTE_DISPOSAL_FORBIDDEN) },
  { parameterId: "waste_transport_trip_count", titleRu: "Рейсы вывоза отходов ремонта", valueType: "decimal", unitId: "trip", required: false, constraints: conditionalQuantity(WASTE_DISPOSAL_REQUIRED, WASTE_DISPOSAL_FORBIDDEN) },
  { parameterId: "waste_route_reference", titleRu: "Маршрут и пункт размещения отходов ремонта", valueType: "text", unitId: null, required: false, constraints: conditionalText(WASTE_DISPOSAL_REQUIRED, WASTE_DISPOSAL_FORBIDDEN) },
]);

export const CONCRETE_SLAB_REPAIR_NORMATIVE_PARAMETER_IDS = Object.freeze([
  "repair_scope_volume_m3",
  "repair_surface_area_m2",
  "condition_assessment_reference",
  "approved_repair_design_reference",
  "approved_repair_method_designation",
  "repair_method_statement_reference",
  "repair_material_designation",
] as const);
const NORMATIVE_PARAMETER_IDS = new Set<string>(CONCRETE_SLAB_REPAIR_NORMATIVE_PARAMETER_IDS);

export type ConcreteSlabRepairParameterR1 = CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata: Json;
};

export const CONCRETE_SLAB_REPAIR_PARAMETERS: readonly ConcreteSlabRepairParameterR1[] =
  Object.freeze(PARAMETER_SPECS.map((spec, ordinal) => ({
    parameter_id: spec.parameterId,
    ordinal,
    value_type: spec.valueType,
    unit_id: spec.unitId,
    title_ru: spec.titleRu,
    required: spec.required,
    default_value: null,
    constraints_json: spec.constraints,
    truth_metadata: {
      contract: "rik-expo-app.concrete-slab-repair-r1",
      semantic_parameter_key: `concrete-slab-repair:${spec.parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: "PROJECT_SPECIFIC_INPUT",
      input_origin_class: NORMATIVE_PARAMETER_IDS.has(spec.parameterId)
        ? "ACI_REPAIR_SCOPE_AND_APPROVED_PROJECT_METHOD"
        : "APPROVED_PROJECT_SCHEDULE_OR_SUPPLIER_QUOTE",
      ...(spec.constraints.requiredWhen
        ? { required_when: spec.constraints.requiredWhen, visible_when: spec.constraints.requiredWhen }
        : {}),
      preliminary_compilation_allowed: false,
      source_confirmation_required: true,
      guide: {
        guide_kind: NORMATIVE_PARAMETER_IDS.has(spec.parameterId) ? "PRACTICE_REFERENCE" : "PROJECT_DEFINED",
        guide_short_ru: `${spec.titleRu}: укажите значение из обследования, утверждённого проекта ремонта, технологической карты, ведомости ресурсов или предложения поставщика.`,
        source_role: NORMATIVE_PARAMETER_IDS.has(spec.parameterId)
          ? "ACI_562_REPAIR_REQUIREMENTS_AND_ACI_546_METHOD_SELECTION"
          : "APPROVED_PROJECT_DOCUMENTATION_OR_SUPPLIER_QUOTE",
        source_document: NORMATIVE_PARAMETER_IDS.has(spec.parameterId) ? CONCRETE_SLAB_REPAIR_SOURCE_ID : null,
        source_locator: NORMATIVE_PARAMETER_IDS.has(spec.parameterId)
          ? CONCRETE_SLAB_REPAIR_SOURCE_METADATA.exact_locator
          : null,
        guide_version: "concrete-slab-repair-r1",
        source_snapshot_hash: NORMATIVE_PARAMETER_IDS.has(spec.parameterId)
          ? CONCRETE_SLAB_REPAIR_CODE_PDF_SHA256
          : PROJECT_SCHEDULE_GUIDE_SHA256,
        applicability:
          "ACI 562 и ACI 546 требуют оценить состояние и выбрать проект ремонта, но не задают универсальные количества материалов, труд, оборудование, логистику или цену для любой плиты.",
        verified_at: CONCRETE_SLAB_REPAIR_SOURCE_METADATA.verified_at,
        guide_validation_policy: "REJECT_MISSING_ASSESSMENT_REPAIR_DESIGN_METHOD_OR_DIRECT_SCHEDULE",
      },
      hidden_default_forbidden: true,
      synthetic: false,
    },
  })));

export type ConcreteSlabRepairFormulaR1 = CanonicalEstimateFormulaDefinition & {
  output_unit_id: string;
  expression_source: string;
};

function formula(formulaId: string, outputUnitId: string, expressionSource: string): ConcreteSlabRepairFormulaR1 {
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

export const CONCRETE_SLAB_REPAIR_FORMULAS: readonly ConcreteSlabRepairFormulaR1[] = Object.freeze([
  formula("slab_repair_scope_volume_v1", "m3", "repair_scope_volume_m3"),
  formula("slab_repair_removal_volume_v1", "m3", "damaged_concrete_removal_volume_m3"),
  formula("slab_repair_material_v1", "kg", "repair_material_quantity_kg"),
  formula("slab_repair_bonding_agent_v1", "kg", "bonding_agent_quantity_kg"),
  formula("slab_repair_reinforcement_treatment_v1", "kg", "reinforcement_treatment_quantity_kg"),
  formula("slab_repair_curing_material_v1", "kg", "curing_material_quantity_kg"),
  formula("slab_repair_removal_labor_v1", "man_hour", "damaged_concrete_removal_worker_h"),
  formula("slab_repair_substrate_labor_v1", "man_hour", "substrate_preparation_worker_h"),
  formula("slab_repair_placement_labor_v1", "man_hour", "repair_material_placement_worker_h"),
  formula("slab_repair_curing_labor_v1", "man_hour", "repair_curing_worker_h"),
  formula("slab_repair_removal_equipment_v1", "machine_hour", "removal_equipment_machine_h"),
  formula("slab_repair_mixing_equipment_v1", "machine_hour", "mixing_equipment_machine_h"),
  formula("slab_repair_dust_control_v1", "machine_hour", "dust_control_equipment_machine_h"),
  formula("slab_repair_inspection_reports_v1", "document", "inspection_report_count"),
  formula("slab_repair_test_reports_v1", "document", "material_test_report_count"),
  formula("slab_repair_material_delivery_v1", "trip", "material_delivery_trip_count"),
  formula("slab_repair_waste_disposal_v1", "m3", "waste_disposal_volume_m3"),
  formula("slab_repair_waste_transport_v1", "trip", "waste_transport_trip_count"),
]);

const literalTrue = Object.freeze({ kind: "literal", value: true });
const greaterThan = (parameterId: string, value: number): Json => ({ kind: "greater_than", parameterId, value });
const ACI_TRACE = Object.freeze({
  sourceId: CONCRETE_SLAB_REPAIR_SOURCE_ID,
  source_id: CONCRETE_SLAB_REPAIR_SOURCE_ID,
  normId: CONCRETE_SLAB_REPAIR_NORM_ID,
  norm_id: CONCRETE_SLAB_REPAIR_NORM_ID,
  normVersion: CONCRETE_SLAB_REPAIR_SOURCE_METADATA.source_document_version,
  source_title: CONCRETE_SLAB_REPAIR_SOURCE_METADATA.source_title,
  source_url: CONCRETE_SLAB_REPAIR_SOURCE_METADATA.source_url,
  exact_locator: CONCRETE_SLAB_REPAIR_SOURCE_METADATA.exact_locator,
  source_definition_hash: CONCRETE_SLAB_REPAIR_SOURCE_METADATA.definition_hash,
  supporting_source_id: CONCRETE_SLAB_REPAIR_GUIDE_SOURCE_ID,
  supporting_source_definition_hash: CONCRETE_SLAB_REPAIR_GUIDE_PDF_SHA256,
  sourceRole: "ASSESSMENT_DESIGN_METHOD_SELECTION_NOT_UNIVERSAL_CONSUMPTION_OR_PRODUCTIVITY",
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
    semanticOwnerId: `concrete-slab-repair:${input.rowId}`,
    costOwner: "resource",
    inputParameterIds: [...input.consumerParameterIds],
    normativeMethodGuidanceV1: {
      source_id: CONCRETE_SLAB_REPAIR_SOURCE_ID,
      supporting_source_id: CONCRETE_SLAB_REPAIR_GUIDE_SOURCE_ID,
      norm_id: CONCRETE_SLAB_REPAIR_NORM_ID,
      operation_class: "REPAIR_EXISTING_CONCRETE_SLAB",
      scope_mode: "APPROVED_REPAIR_DESIGN_AND_DIRECT_SCHEDULE_QUANTITIES",
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
    },
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: input.sourceRole,
    quantitySourceRole: "APPROVED_REPAIR_DESIGN_AND_DIRECT_PROJECT_SCHEDULE",
    normativeTrace: [ACI_TRACE, {
      sourceId: "project_concrete_slab_repair_schedule",
      sourceRole: input.sourceRole,
    }],
    excludedUnownedAssumptions: [
      "automatic repair material consumption",
      "automatic labor or equipment productivity",
      "automatic reinforcement treatment",
      "automatic testing or waste disposal",
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

export const CONCRETE_SLAB_REPAIR_RESOURCES: readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({ rowId: "work:concrete:slab-repair-removal", ordinal: 0, section: "Работы", category: "construction_work", titleRu: "Удаление повреждённого бетона плиты в границах проекта ремонта", unitId: "man_hour", formulaId: "slab_repair_removal_labor_v1", procurementEligible: false, sourceRole: "APPROVED_REPAIR_REMOVAL_LABOR_SCHEDULE", consumerParameterIds: ["condition_assessment_reference", "approved_repair_design_reference", "damaged_concrete_removal_volume_m3", "damaged_concrete_removal_worker_h"] }),
  resource({ rowId: "work:concrete:slab-repair-substrate", ordinal: 1, section: "Работы", category: "construction_work", titleRu: "Подготовка поверхности бетонной плиты к ремонту", unitId: "man_hour", formulaId: "slab_repair_substrate_labor_v1", procurementEligible: false, sourceRole: "APPROVED_REPAIR_SUBSTRATE_LABOR_SCHEDULE", consumerParameterIds: ["repair_surface_area_m2", "approved_repair_method_designation", "repair_method_statement_reference", "substrate_preparation_worker_h"] }),
  resource({ rowId: "work:concrete:slab-repair-placement", ordinal: 2, section: "Работы", category: "construction_work", titleRu: "Укладка и обработка ремонтного материала бетонной плиты", unitId: "man_hour", formulaId: "slab_repair_placement_labor_v1", procurementEligible: false, sourceRole: "APPROVED_REPAIR_PLACEMENT_LABOR_SCHEDULE", consumerParameterIds: ["repair_scope_volume_m3", "repair_material_designation", "repair_material_placement_worker_h"] }),
  resource({ rowId: "work:concrete:slab-repair-curing", ordinal: 3, section: "Работы", category: "construction_work", titleRu: "Уход за отремонтированным участком бетонной плиты", unitId: "man_hour", formulaId: "slab_repair_curing_labor_v1", procurementEligible: false, sourceRole: "APPROVED_REPAIR_CURING_LABOR_SCHEDULE", consumerParameterIds: ["repair_method_statement_reference", "repair_curing_worker_h"] }),
  resource({ rowId: "material:concrete:slab-repair-material", ordinal: 4, section: "Материалы", category: "material", titleRu: "Ремонтный материал для бетонной плиты по проектной спецификации", unitId: "kg", formulaId: "slab_repair_material_v1", procurementEligible: true, sourceRole: "APPROVED_REPAIR_MATERIAL_TAKEOFF", consumerParameterIds: ["repair_material_designation", "repair_material_quantity_kg"] }),
  resource({ rowId: "material:concrete:slab-repair-bonding-agent", ordinal: 5, section: "Материалы", category: "material", titleRu: "Контактный состав для ремонта бетонной плиты", unitId: "kg", formulaId: "slab_repair_bonding_agent_v1", inclusionAst: and(BOND_REQUIRED, greaterThan("bonding_agent_quantity_kg", 0)), procurementEligible: true, sourceRole: "APPROVED_REPAIR_BONDING_AGENT_TAKEOFF", consumerParameterIds: ["bonding_agent_required", "bonding_agent_designation", "bonding_agent_quantity_kg"] }),
  resource({ rowId: "material:concrete:slab-repair-rebar-treatment", ordinal: 6, section: "Материалы", category: "material", titleRu: "Состав обработки вскрытой арматуры бетонной плиты", unitId: "kg", formulaId: "slab_repair_reinforcement_treatment_v1", inclusionAst: and(REBAR_TREATMENT_REQUIRED, greaterThan("reinforcement_treatment_quantity_kg", 0)), procurementEligible: true, sourceRole: "APPROVED_REBAR_TREATMENT_TAKEOFF", consumerParameterIds: ["reinforcement_treatment_required", "reinforcement_treatment_designation", "reinforcement_treatment_quantity_kg"] }),
  resource({ rowId: "material:concrete:slab-repair-curing", ordinal: 7, section: "Материалы", category: "material", titleRu: "Материал ухода за отремонтированным участком", unitId: "kg", formulaId: "slab_repair_curing_material_v1", inclusionAst: and(CURING_MATERIAL_REQUIRED, greaterThan("curing_material_quantity_kg", 0)), procurementEligible: true, sourceRole: "APPROVED_REPAIR_CURING_MATERIAL_TAKEOFF", consumerParameterIds: ["curing_material_required", "curing_material_designation", "curing_material_quantity_kg"] }),
  resource({ rowId: "equipment:concrete:slab-repair-removal", ordinal: 8, section: "Оборудование", category: "equipment", titleRu: "Оборудование для удаления повреждённого бетона", unitId: "machine_hour", formulaId: "slab_repair_removal_equipment_v1", inclusionAst: and(REMOVAL_EQUIPMENT_REQUIRED, greaterThan("removal_equipment_machine_h", 0)), procurementEligible: true, sourceRole: "APPROVED_REPAIR_REMOVAL_EQUIPMENT_SCHEDULE", consumerParameterIds: ["removal_equipment_required", "removal_equipment_designation", "removal_equipment_machine_h"] }),
  resource({ rowId: "equipment:concrete:slab-repair-mixing", ordinal: 9, section: "Оборудование", category: "equipment", titleRu: "Смесительное оборудование для ремонтного материала", unitId: "machine_hour", formulaId: "slab_repair_mixing_equipment_v1", inclusionAst: and(MIXING_EQUIPMENT_REQUIRED, greaterThan("mixing_equipment_machine_h", 0)), procurementEligible: true, sourceRole: "APPROVED_REPAIR_MIXING_EQUIPMENT_SCHEDULE", consumerParameterIds: ["mixing_equipment_required", "mixing_equipment_designation", "mixing_equipment_machine_h"] }),
  resource({ rowId: "equipment:concrete:slab-repair-dust-control", ordinal: 10, section: "Оборудование", category: "equipment", titleRu: "Оборудование пылеудаления при ремонте бетонной плиты", unitId: "machine_hour", formulaId: "slab_repair_dust_control_v1", inclusionAst: and(DUST_CONTROL_REQUIRED, greaterThan("dust_control_equipment_machine_h", 0)), procurementEligible: true, sourceRole: "APPROVED_REPAIR_DUST_CONTROL_EQUIPMENT_SCHEDULE", consumerParameterIds: ["dust_control_equipment_required", "dust_control_equipment_designation", "dust_control_equipment_machine_h"] }),
  resource({ rowId: "service:concrete:slab-repair-inspection", ordinal: 11, section: "Услуги", category: "service", titleRu: "Освидетельствование и контроль качества ремонта бетонной плиты", unitId: "document", formulaId: "slab_repair_inspection_reports_v1", procurementEligible: true, sourceRole: "APPROVED_REPAIR_QUALITY_PLAN", consumerParameterIds: ["quality_plan_reference", "inspection_report_count"] }),
  resource({ rowId: "service:concrete:slab-repair-testing", ordinal: 12, section: "Услуги", category: "service", titleRu: "Испытания ремонтных материалов по плану контроля", unitId: "document", formulaId: "slab_repair_test_reports_v1", inclusionAst: and(MATERIAL_TESTING_REQUIRED, greaterThan("material_test_report_count", 0)), procurementEligible: true, sourceRole: "APPROVED_REPAIR_MATERIAL_TEST_PLAN", consumerParameterIds: ["material_testing_required", "material_test_report_count", "quality_plan_reference"] }),
  resource({ rowId: "delivery:concrete:slab-repair-material", ordinal: 13, section: "Логистика", category: "delivery", titleRu: "Доставка ремонтных материалов для бетонной плиты", unitId: "trip", formulaId: "slab_repair_material_delivery_v1", procurementEligible: true, sourceRole: "SUPPLIER_REPAIR_MATERIAL_DELIVERY_QUOTE", consumerParameterIds: ["repair_material_designation", "material_delivery_trip_count"] }),
  resource({ rowId: "service:concrete:slab-repair-waste-disposal", ordinal: 14, section: "Услуги", category: "service", titleRu: "Приём и размещение отходов ремонта бетонной плиты", unitId: "m3", formulaId: "slab_repair_waste_disposal_v1", inclusionAst: and(WASTE_DISPOSAL_REQUIRED, greaterThan("waste_disposal_volume_m3", 0)), procurementEligible: true, sourceRole: "APPROVED_WASTE_DISPOSAL_SCOPE_AND_QUOTE", consumerParameterIds: ["waste_disposal_required", "waste_disposal_volume_m3", "waste_route_reference"] }),
  resource({ rowId: "delivery:concrete:slab-repair-waste", ordinal: 15, section: "Логистика", category: "delivery", titleRu: "Вывоз отходов ремонта бетонной плиты", unitId: "trip", formulaId: "slab_repair_waste_transport_v1", inclusionAst: and(WASTE_DISPOSAL_REQUIRED, greaterThan("waste_transport_trip_count", 0)), procurementEligible: true, sourceRole: "APPROVED_WASTE_ROUTE_AND_TRANSPORT_QUOTE", consumerParameterIds: ["waste_disposal_required", "waste_transport_trip_count", "waste_route_reference"] }),
]);

const PROJECT_SCHEDULES: Readonly<Record<ConcreteSlabRepairContextKey, Readonly<Record<string, ConcreteSlabRepairInputValueR1>>>> = Object.freeze({
  standard: { repair_scope_volume_m3: 1.8, repair_surface_area_m2: 22, repair_material_quantity_kg: 3400, damaged_concrete_removal_volume_m3: 1.5, bonding_agent_required: true, bonding_agent_designation: "BOND-STANDARD-REV-A", bonding_agent_quantity_kg: 42, reinforcement_treatment_required: false, curing_material_required: true, curing_material_designation: "CURING-STANDARD-REV-A", curing_material_quantity_kg: 18, damaged_concrete_removal_worker_h: 28, substrate_preparation_worker_h: 18, repair_material_placement_worker_h: 30, repair_curing_worker_h: 8, removal_equipment_required: true, removal_equipment_designation: "REMOVAL-STANDARD-REV-A", removal_equipment_machine_h: 12, mixing_equipment_required: true, mixing_equipment_designation: "MIXER-STANDARD-REV-A", mixing_equipment_machine_h: 8, dust_control_equipment_required: true, dust_control_equipment_designation: "DUST-STANDARD-REV-A", dust_control_equipment_machine_h: 12, inspection_report_count: 3, material_testing_required: true, material_test_report_count: 2, material_delivery_trip_count: 2, waste_disposal_required: true, waste_disposal_volume_m3: 1.7, waste_transport_trip_count: 2, waste_route_reference: "WASTE-STANDARD-REV-A" },
  high_load: { repair_scope_volume_m3: 4.2, repair_surface_area_m2: 38, repair_material_quantity_kg: 7800, damaged_concrete_removal_volume_m3: 3.6, bonding_agent_required: true, bonding_agent_designation: "BOND-HIGH-LOAD-REV-A", bonding_agent_quantity_kg: 90, reinforcement_treatment_required: true, reinforcement_treatment_designation: "REBAR-HIGH-LOAD-REV-A", reinforcement_treatment_quantity_kg: 26, curing_material_required: true, curing_material_designation: "CURING-HIGH-LOAD-REV-A", curing_material_quantity_kg: 34, damaged_concrete_removal_worker_h: 60, substrate_preparation_worker_h: 34, repair_material_placement_worker_h: 64, repair_curing_worker_h: 14, removal_equipment_required: true, removal_equipment_designation: "REMOVAL-HIGH-LOAD-REV-A", removal_equipment_machine_h: 26, mixing_equipment_required: true, mixing_equipment_designation: "MIXER-HIGH-LOAD-REV-A", mixing_equipment_machine_h: 18, dust_control_equipment_required: true, dust_control_equipment_designation: "DUST-HIGH-LOAD-REV-A", dust_control_equipment_machine_h: 25, inspection_report_count: 5, material_testing_required: true, material_test_report_count: 4, material_delivery_trip_count: 4, waste_disposal_required: true, waste_disposal_volume_m3: 4.1, waste_transport_trip_count: 4, waste_route_reference: "WASTE-HIGH-LOAD-REV-A" },
  large_area: { repair_scope_volume_m3: 8.5, repair_surface_area_m2: 120, repair_material_quantity_kg: 15800, damaged_concrete_removal_volume_m3: 7.2, bonding_agent_required: true, bonding_agent_designation: "BOND-LARGE-AREA-REV-A", bonding_agent_quantity_kg: 210, reinforcement_treatment_required: true, reinforcement_treatment_designation: "REBAR-LARGE-AREA-REV-A", reinforcement_treatment_quantity_kg: 48, curing_material_required: true, curing_material_designation: "CURING-LARGE-AREA-REV-A", curing_material_quantity_kg: 86, damaged_concrete_removal_worker_h: 110, substrate_preparation_worker_h: 70, repair_material_placement_worker_h: 118, repair_curing_worker_h: 26, removal_equipment_required: true, removal_equipment_designation: "REMOVAL-LARGE-AREA-REV-A", removal_equipment_machine_h: 52, mixing_equipment_required: true, mixing_equipment_designation: "MIXER-LARGE-AREA-REV-A", mixing_equipment_machine_h: 38, dust_control_equipment_required: true, dust_control_equipment_designation: "DUST-LARGE-AREA-REV-A", dust_control_equipment_machine_h: 50, inspection_report_count: 8, material_testing_required: true, material_test_report_count: 6, material_delivery_trip_count: 7, waste_disposal_required: true, waste_disposal_volume_m3: 8, waste_transport_trip_count: 7, waste_route_reference: "WASTE-LARGE-AREA-REV-A" },
  repair: { repair_scope_volume_m3: 1.2, repair_surface_area_m2: 14, repair_material_quantity_kg: 2300, damaged_concrete_removal_volume_m3: 1, bonding_agent_required: true, bonding_agent_designation: "BOND-REPAIR-REV-A", bonding_agent_quantity_kg: 28, reinforcement_treatment_required: true, reinforcement_treatment_designation: "REBAR-REPAIR-REV-A", reinforcement_treatment_quantity_kg: 8, curing_material_required: true, curing_material_designation: "CURING-REPAIR-REV-A", curing_material_quantity_kg: 12, damaged_concrete_removal_worker_h: 22, substrate_preparation_worker_h: 14, repair_material_placement_worker_h: 24, repair_curing_worker_h: 7, removal_equipment_required: true, removal_equipment_designation: "REMOVAL-REPAIR-REV-A", removal_equipment_machine_h: 9, mixing_equipment_required: true, mixing_equipment_designation: "MIXER-REPAIR-REV-A", mixing_equipment_machine_h: 6, dust_control_equipment_required: true, dust_control_equipment_designation: "DUST-REPAIR-REV-A", dust_control_equipment_machine_h: 9, inspection_report_count: 3, material_testing_required: true, material_test_report_count: 2, material_delivery_trip_count: 2, waste_disposal_required: true, waste_disposal_volume_m3: 1.2, waste_transport_trip_count: 2, waste_route_reference: "WASTE-REPAIR-REV-A" },
  small_area: { repair_scope_volume_m3: 0.45, repair_surface_area_m2: 6, repair_material_quantity_kg: 850, damaged_concrete_removal_volume_m3: 0.38, bonding_agent_required: false, reinforcement_treatment_required: false, curing_material_required: false, damaged_concrete_removal_worker_h: 10, substrate_preparation_worker_h: 7, repair_material_placement_worker_h: 10, repair_curing_worker_h: 3, removal_equipment_required: false, mixing_equipment_required: false, dust_control_equipment_required: false, inspection_report_count: 2, material_testing_required: false, material_delivery_trip_count: 1, waste_disposal_required: false },
  technical_room: { repair_scope_volume_m3: 0.9, repair_surface_area_m2: 11, repair_material_quantity_kg: 1700, damaged_concrete_removal_volume_m3: 0.76, bonding_agent_required: true, bonding_agent_designation: "BOND-TECHNICAL-ROOM-REV-A", bonding_agent_quantity_kg: 22, reinforcement_treatment_required: false, curing_material_required: false, damaged_concrete_removal_worker_h: 18, substrate_preparation_worker_h: 12, repair_material_placement_worker_h: 20, repair_curing_worker_h: 6, removal_equipment_required: true, removal_equipment_designation: "REMOVAL-TECHNICAL-ROOM-REV-A", removal_equipment_machine_h: 7, mixing_equipment_required: false, dust_control_equipment_required: true, dust_control_equipment_designation: "DUST-TECHNICAL-ROOM-REV-A", dust_control_equipment_machine_h: 8, inspection_report_count: 3, material_testing_required: false, material_delivery_trip_count: 2, waste_disposal_required: true, waste_disposal_volume_m3: 0.9, waste_transport_trip_count: 2, waste_route_reference: "WASTE-TECHNICAL-ROOM-REV-A" },
  wet_zone: { repair_scope_volume_m3: 2.1, repair_surface_area_m2: 26, repair_material_quantity_kg: 4000, damaged_concrete_removal_volume_m3: 1.8, bonding_agent_required: true, bonding_agent_designation: "BOND-WET-ZONE-REV-A", bonding_agent_quantity_kg: 52, reinforcement_treatment_required: true, reinforcement_treatment_designation: "REBAR-WET-ZONE-REV-A", reinforcement_treatment_quantity_kg: 14, curing_material_required: true, curing_material_designation: "CURING-WET-ZONE-REV-A", curing_material_quantity_kg: 23, damaged_concrete_removal_worker_h: 34, substrate_preparation_worker_h: 24, repair_material_placement_worker_h: 38, repair_curing_worker_h: 10, removal_equipment_required: true, removal_equipment_designation: "REMOVAL-WET-ZONE-REV-A", removal_equipment_machine_h: 15, mixing_equipment_required: true, mixing_equipment_designation: "MIXER-WET-ZONE-REV-A", mixing_equipment_machine_h: 10, dust_control_equipment_required: true, dust_control_equipment_designation: "DUST-WET-ZONE-REV-A", dust_control_equipment_machine_h: 14, inspection_report_count: 4, material_testing_required: true, material_test_report_count: 3, material_delivery_trip_count: 3, waste_disposal_required: true, waste_disposal_volume_m3: 2, waste_transport_trip_count: 3, waste_route_reference: "WASTE-WET-ZONE-REV-A" },
});

export function concreteSlabRepairAcceptanceInputR1(
  contextKey: ConcreteSlabRepairContextKey,
): Readonly<Record<string, ConcreteSlabRepairInputValueR1>> {
  const target = CONCRETE_SLAB_REPAIR_TARGETS.find((candidate) => candidate.contextKey === contextKey);
  if (!target) throw new Error(`CONCRETE_SLAB_REPAIR_CONTEXT_UNSUPPORTED:${contextKey}`);
  const reference = contextKey.toUpperCase().replace(/_/gu, "-");
  return Object.freeze({
    condition_assessment_reference: `ASSESS-CS-REPAIR-${reference}-REV-A`,
    approved_repair_design_reference: `DESIGN-CS-REPAIR-${reference}-REV-A`,
    approved_repair_method_designation: `METHOD-CS-REPAIR-${reference}-REV-A`,
    repair_method_statement_reference: `MS-CS-REPAIR-${reference}-REV-A`,
    repair_material_designation: `MATERIAL-CS-REPAIR-${reference}-REV-A`,
    quality_plan_reference: `QP-CS-REPAIR-${reference}-REV-A`,
    ...PROJECT_SCHEDULES[contextKey],
  });
}

export async function compileConcreteSlabRepairR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? CONCRETE_SLAB_REPAIR_TARGETS[0].catalogId;
  if (!CONCRETE_SLAB_REPAIR_TARGETS.some((target) => target.catalogId === catalogId)) {
    throw new Error(`CONCRETE_SLAB_REPAIR_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.concrete-slab-repair-r1",
    catalogId,
    primaryMeasureParameterId: "repair_scope_volume_m3",
    parameterDefinitions: [...CONCRETE_SLAB_REPAIR_PARAMETERS],
    formulaDefinitions: [...CONCRETE_SLAB_REPAIR_FORMULAS],
    resourceDefinitions: [...CONCRETE_SLAB_REPAIR_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 24,
    hashJson: async (value) => JSON.stringify(value),
  });
}
