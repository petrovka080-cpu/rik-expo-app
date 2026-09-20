import type {
  CanonicalEstimateFormulaDefinition,
  CanonicalEstimateParameterDefinition,
  CanonicalEstimateResourceDefinition,
} from "../backendPlatform/canonicalEstimateCompileCore";
import { compileFormulaGraph } from "../backendPlatform/formulaGraph";
import { estimateDeterministicHash } from "../estimateDeterministicHash";
import {
  RICS_NRM2_FORMWORK_NORM_ID,
  RICS_NRM2_FORMWORK_SOURCE_ID,
  RICS_NRM2_FORMWORK_SOURCE_METADATA,
} from "./domainFactory/formworkRicsNrm2PhysicalNormV1";

type Json = Record<string, unknown>;
export type StairsProjectFormworkInputValueR1 = string | number | boolean;

export const STAIRS_PROJECT_FORMWORK_SOURCE_PDF_SHA256 =
  "e5703e5590508170c4f04857a9e362e0e9ecdec4e7c22874e5fad89f5cfe1833";
const PROJECT_SCHEDULE_GUIDE_SHA256 =
  "4d706e90ea4f0bfd501856e659c26fb68d0cc37451eb8f7fce4dc71c16188934";

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
const or = (...operands: Json[]): Json => ({ kind: "or", operands });
const SHORING_REQUIRED = equals("temporary_shoring_required", true);
const SHORING_FORBIDDEN = equals("temporary_shoring_required", false);
const LIFTING_REQUIRED = equals("lifting_equipment_required", true);
const LIFTING_FORBIDDEN = equals("lifting_equipment_required", false);
const RENTAL_RETURNABLE = equals("formwork_supply_mode", "RENTAL_RETURNABLE");
const CONTRACTOR_OWNED = equals("formwork_supply_mode", "CONTRACTOR_OWNED");
const PROJECT_PURCHASE = equals("formwork_supply_mode", "PROJECT_PURCHASE");

const branchText = (requiredWhen: Json, forbiddenWhen: Json): Json => ({
  minLength: 1,
  maxLength: 1_000,
  requiredWhen,
  forbiddenWhen,
});
const branchQuantity = (requiredWhen: Json, forbiddenWhen: Json): Json => ({
  min: 0.001,
  requiredWhen,
  forbiddenWhen,
});

const PARAMETER_SPECS: readonly ParameterSpec[] = Object.freeze([
  { parameterId: "measured_formwork_contact_area_m2", titleRu: "Измеренная площадь контакта опалубки лестницы", valueType: "decimal", unitId: "m2", required: true, constraints: { min: 0.001 } },
  { parameterId: "stairs_geometry_description", titleRu: "Геометрия марша, ступеней и площадок", valueType: "text", unitId: null, required: false, constraints: { minLength: 1, maxLength: 1_000 } },
  { parameterId: "approved_formwork_drawing_reference", titleRu: "Ссылка на проект опалубки лестницы", valueType: "text", unitId: null, required: false, constraints: { minLength: 1, maxLength: 1_000 } },
  { parameterId: "formwork_system_designation", titleRu: "Проектное обозначение системы опалубки лестницы", valueType: "text", unitId: null, required: false, constraints: { minLength: 1, maxLength: 1_000 } },
  { parameterId: "formwork_supply_mode", titleRu: "Способ обеспечения комплектом опалубки", valueType: "enum", unitId: null, required: true, constraints: { values: ["RENTAL_RETURNABLE", "CONTRACTOR_OWNED", "PROJECT_PURCHASE"] } },
  { parameterId: "formwork_facing_area_m2", titleRu: "Площадь щитов или палубы по проектной ведомости", valueType: "decimal", unitId: "m2", required: true, constraints: { min: 0.001 } },
  { parameterId: "formwork_framing_length_m", titleRu: "Длина несущих ригелей и брусьев по ведомости", valueType: "decimal", unitId: "m", required: true, constraints: { min: 0.001 } },
  { parameterId: "riser_and_edge_form_length_m", titleRu: "Длина форм ступеней, подступенков и кромок", valueType: "decimal", unitId: "m", required: true, constraints: { min: 0.001 } },
  { parameterId: "temporary_shoring_required", titleRu: "Требуется временное поддерживание или стойки", valueType: "boolean", unitId: null, required: true, constraints: {} },
  { parameterId: "temporary_shoring_designation", titleRu: "Стойки и поддерживающая система по проекту", valueType: "text", unitId: null, required: false, constraints: branchText(SHORING_REQUIRED, SHORING_FORBIDDEN) },
  { parameterId: "temporary_shoring_quantity_piece", titleRu: "Количество стоек и элементов поддерживания", valueType: "decimal", unitId: "piece", required: false, constraints: branchQuantity(SHORING_REQUIRED, SHORING_FORBIDDEN) },
  { parameterId: "formwork_rental_duration_days", titleRu: "Проектный срок аренды комплекта", valueType: "decimal", unitId: "day", required: false, constraints: branchQuantity(RENTAL_RETURNABLE, or(CONTRACTOR_OWNED, PROJECT_PURCHASE)) },
  { parameterId: "form_release_agent_l", titleRu: "Разделительный состав по проектной ведомости", valueType: "decimal", unitId: "l", required: true, constraints: { min: 0.001 } },
  { parameterId: "formwork_consumables_kg", titleRu: "Крепёж и расходные материалы по ведомости", valueType: "decimal", unitId: "kg", required: true, constraints: { min: 0.001 } },
  { parameterId: "formwork_assembly_worker_h", titleRu: "Трудозатраты на сборку опалубки", valueType: "decimal", unitId: "man_hour", required: true, constraints: { min: 0.001 } },
  { parameterId: "formwork_alignment_worker_h", titleRu: "Трудозатраты на выверку и закрепление", valueType: "decimal", unitId: "man_hour", required: true, constraints: { min: 0.001 } },
  { parameterId: "formwork_stripping_worker_h", titleRu: "Трудозатраты на распалубку", valueType: "decimal", unitId: "man_hour", required: true, constraints: { min: 0.001 } },
  { parameterId: "lifting_equipment_required", titleRu: "Требуется подъёмное оборудование для опалубки", valueType: "boolean", unitId: null, required: true, constraints: {} },
  { parameterId: "lifting_equipment_designation", titleRu: "Подъёмное оборудование по ППР", valueType: "text", unitId: null, required: false, constraints: branchText(LIFTING_REQUIRED, LIFTING_FORBIDDEN) },
  { parameterId: "lifting_machine_h", titleRu: "Машино-время подъёмного оборудования", valueType: "decimal", unitId: "machine_hour", required: false, constraints: branchQuantity(LIFTING_REQUIRED, LIFTING_FORBIDDEN) },
  { parameterId: "formwork_inspection_document_count", titleRu: "Количество комплектов контроля опалубки", valueType: "decimal", unitId: "document", required: true, constraints: { min: 0.001 } },
  { parameterId: "formwork_delivery_trip_count", titleRu: "Количество рейсов доставки опалубки", valueType: "decimal", unitId: "trip", required: true, constraints: { min: 0.001 } },
  { parameterId: "formwork_return_trip_count", titleRu: "Количество рейсов возврата арендной опалубки", valueType: "decimal", unitId: "trip", required: false, constraints: branchQuantity(RENTAL_RETURNABLE, or(CONTRACTOR_OWNED, PROJECT_PURCHASE)) },
]);

export const STAIRS_PROJECT_FORMWORK_NORMATIVE_PARAMETER_IDS = Object.freeze([
  "measured_formwork_contact_area_m2",
] as const);

export type StairsProjectFormworkParameterR1 = CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata: Json;
};

export const STAIRS_PROJECT_FORMWORK_PARAMETERS:
readonly StairsProjectFormworkParameterR1[] = Object.freeze(
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
      contract: "rik-expo-app.stairs-project-formwork-r1",
      semantic_parameter_key: `stairs-project-formwork:${spec.parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: "PROJECT_SPECIFIC_INPUT",
      input_origin_class: spec.parameterId === "measured_formwork_contact_area_m2"
        ? "RICS_NRM2_MEASUREMENT_AND_APPROVED_PROJECT_TAKEOFF"
        : "APPROVED_PROJECT_SCHEDULE_OR_SUPPLIER_QUOTE",
      ...(spec.constraints.requiredWhen
        ? { required_when: spec.constraints.requiredWhen, visible_when: spec.constraints.requiredWhen }
        : {}),
      preliminary_compilation_allowed: false,
      source_confirmation_required: true,
      guide: {
        guide_kind: spec.parameterId === "measured_formwork_contact_area_m2"
          ? "MEASUREMENT_RULE"
          : "PROJECT_DEFINED",
        guide_short_ru: spec.parameterId === "measured_formwork_contact_area_m2"
          ? "Измерьте фактическую площадь контакта опалубки с бетоном по проектной геометрии лестницы; коэффициент м²/м³ не применяется."
          : `${spec.titleRu}: укажите прямое значение из проекта, ведомости комплекта или предложения поставщика.`,
        source_role: spec.parameterId === "measured_formwork_contact_area_m2"
          ? "RICS_NRM2_FORMWORK_MEASUREMENT"
          : "APPROVED_PROJECT_DOCUMENTATION_OR_SUPPLIER_QUOTE",
        source_document: spec.parameterId === "measured_formwork_contact_area_m2"
          ? RICS_NRM2_FORMWORK_SOURCE_ID
          : null,
        source_locator: spec.parameterId === "measured_formwork_contact_area_m2"
          ? RICS_NRM2_FORMWORK_SOURCE_METADATA.exact_locator
          : null,
        guide_version: "stairs-project-formwork-r1",
        source_snapshot_hash: spec.parameterId === "measured_formwork_contact_area_m2"
          ? STAIRS_PROJECT_FORMWORK_SOURCE_PDF_SHA256
          : PROJECT_SCHEDULE_GUIDE_SHA256,
        applicability:
          "RICS NRM 2 определяет измерение площади контакта, но не назначает систему, комплект, расход, аренду или производительность для конкретной лестницы.",
        verified_at: "2026-09-18T00:00:00+06:00",
        guide_validation_policy:
          "REJECT_MISSING_PROJECT_FORMWORK_TAKEOFF_OR_DIRECT_SCHEDULE_WITHOUT_GENERIC_SYSTEM_SUBSTITUTION",
      },
      hidden_default_forbidden: true,
      synthetic: false,
    },
  })),
);

export type StairsProjectFormworkFormulaR1 = CanonicalEstimateFormulaDefinition & {
  output_unit_id: string;
  expression_source: string;
};

function formula(id: string, unit: string, expression: string): StairsProjectFormworkFormulaR1 {
  const compiled = compileFormulaGraph(expression);
  return {
    formula_id: id,
    output_unit_id: unit,
    expression_source: expression,
    ast: compiled.ast,
    input_parameter_ids: compiled.inputParameterIds,
    ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256",
  };
}

export const STAIRS_PROJECT_FORMWORK_FORMULAS:
readonly StairsProjectFormworkFormulaR1[] = Object.freeze([
  formula("stairs_formwork_measured_area_v1", "m2", "measured_formwork_contact_area_m2"),
  formula("stairs_formwork_facing_v1", "m2", "formwork_facing_area_m2"),
  formula("stairs_formwork_framing_v1", "m", "formwork_framing_length_m"),
  formula("stairs_formwork_riser_edges_v1", "m", "riser_and_edge_form_length_m"),
  formula("stairs_formwork_shoring_v1", "piece", "temporary_shoring_quantity_piece"),
  formula("stairs_formwork_release_agent_v1", "l", "form_release_agent_l"),
  formula("stairs_formwork_consumables_v1", "kg", "formwork_consumables_kg"),
  formula("stairs_formwork_assembly_labor_v1", "man_hour", "formwork_assembly_worker_h"),
  formula("stairs_formwork_alignment_labor_v1", "man_hour", "formwork_alignment_worker_h"),
  formula("stairs_formwork_stripping_labor_v1", "man_hour", "formwork_stripping_worker_h"),
  formula("stairs_formwork_lifting_v1", "machine_hour", "lifting_machine_h"),
  formula("stairs_formwork_inspection_v1", "document", "formwork_inspection_document_count"),
  formula("stairs_formwork_delivery_v1", "trip", "formwork_delivery_trip_count"),
  formula("stairs_formwork_return_v1", "trip", "formwork_return_trip_count"),
]);

const literalTrue = Object.freeze({ kind: "literal", value: true });
const greaterThan = (parameterId: string, value: number): Json => ({
  kind: "greater_than",
  parameterId,
  value,
});
const RICS_TRACE = Object.freeze({
  source_id: RICS_NRM2_FORMWORK_SOURCE_ID,
  sourceId: RICS_NRM2_FORMWORK_SOURCE_ID,
  norm_id: RICS_NRM2_FORMWORK_NORM_ID,
  normId: RICS_NRM2_FORMWORK_NORM_ID,
  source_title: RICS_NRM2_FORMWORK_SOURCE_METADATA.source_title,
  source_url: RICS_NRM2_FORMWORK_SOURCE_METADATA.source_url,
  exact_locator: RICS_NRM2_FORMWORK_SOURCE_METADATA.exact_locator,
  source_definition_hash: RICS_NRM2_FORMWORK_SOURCE_METADATA.definition_hash,
  source_pdf_sha256: STAIRS_PROJECT_FORMWORK_SOURCE_PDF_SHA256,
  sourceRole: "MEASUREMENT_ONLY_NOT_SYSTEM_OR_PRODUCTIVITY_SELECTION",
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
    semanticOwnerId: `stairs-project-formwork:${input.rowId}`,
    costOwner: "resource",
    inputParameterIds: [...input.consumerParameterIds],
    normativeMethodGuidanceV1: {
      source_id: RICS_NRM2_FORMWORK_SOURCE_ID,
      norm_id: RICS_NRM2_FORMWORK_NORM_ID,
      operation_class: "MEASURE_AND_INSTALL_PROJECT_SPECIFIED_STAIRS_FORMWORK",
      scope_mode: "MEASURED_CONTACT_AREA_AND_DIRECT_PROJECT_SCHEDULE",
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
    },
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: input.sourceRole,
    quantitySourceRole: "APPROVED_STAIRS_FORMWORK_PROJECT_OR_SUPPLIER_SCHEDULE",
    normativeTrace: [RICS_TRACE, {
      sourceId: "project_stairs_formwork_schedule",
      sourceRole: input.sourceRole,
    }],
    excludedUnownedAssumptions: [
      "automatic Frami or Dokaflex selection",
      "automatic formwork contact area per concrete volume",
      "automatic kit quantities or rental duration",
      "automatic labor or equipment productivity",
      "hidden delivery or return trips",
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

export const STAIRS_PROJECT_FORMWORK_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({ rowId: "work:formwork:stairs-measured-contact-area", ordinal: 0, section: "Работы", category: "construction_work", titleRu: "Устройство опалубки лестницы по измеренной площади контакта", unitId: "m2", formulaId: "stairs_formwork_measured_area_v1", procurementEligible: false, sourceRole: "RICS_NRM2_MEASURED_CONTACT_AREA", consumerParameterIds: ["measured_formwork_contact_area_m2", "stairs_geometry_description", "approved_formwork_drawing_reference", "formwork_system_designation"] }),
  resource({ rowId: "equipment:formwork:stairs-facing", ordinal: 1, section: "Оборудование", category: "equipment", titleRu: "Щиты или палуба опалубки лестницы по проектной ведомости", unitId: "m2", formulaId: "stairs_formwork_facing_v1", procurementEligible: true, sourceRole: "APPROVED_PROJECT_FORMWORK_FACING_SCHEDULE", consumerParameterIds: ["formwork_supply_mode", "formwork_facing_area_m2"] }),
  resource({ rowId: "equipment:formwork:stairs-framing", ordinal: 2, section: "Оборудование", category: "equipment", titleRu: "Ригели и несущие элементы опалубки лестницы", unitId: "m", formulaId: "stairs_formwork_framing_v1", procurementEligible: true, sourceRole: "APPROVED_PROJECT_FORMWORK_FRAMING_SCHEDULE", consumerParameterIds: ["formwork_system_designation", "formwork_framing_length_m"] }),
  resource({ rowId: "material:formwork:stairs-risers-edges", ordinal: 3, section: "Материалы", category: "material", titleRu: "Формы ступеней, подступенков и кромок", unitId: "m", formulaId: "stairs_formwork_riser_edges_v1", procurementEligible: true, sourceRole: "APPROVED_PROJECT_RISER_EDGE_FORM_SCHEDULE", consumerParameterIds: ["riser_and_edge_form_length_m"] }),
  resource({ rowId: "equipment:formwork:stairs-temporary-shoring", ordinal: 4, section: "Оборудование", category: "equipment", titleRu: "Временные стойки и поддерживающая система лестницы", unitId: "piece", formulaId: "stairs_formwork_shoring_v1", inclusionAst: and(SHORING_REQUIRED, greaterThan("temporary_shoring_quantity_piece", 0)), procurementEligible: true, sourceRole: "APPROVED_TEMPORARY_WORKS_SHORING_SCHEDULE", consumerParameterIds: ["temporary_shoring_required", "temporary_shoring_designation", "temporary_shoring_quantity_piece", "formwork_rental_duration_days"] }),
  resource({ rowId: "material:formwork:stairs-release-agent", ordinal: 5, section: "Материалы", category: "material", titleRu: "Разделительный состав для опалубки лестницы", unitId: "l", formulaId: "stairs_formwork_release_agent_v1", procurementEligible: true, sourceRole: "APPROVED_PROJECT_RELEASE_AGENT_SCHEDULE", consumerParameterIds: ["form_release_agent_l"] }),
  resource({ rowId: "material:formwork:stairs-consumables", ordinal: 6, section: "Материалы", category: "material", titleRu: "Крепёж и расходные материалы опалубки лестницы", unitId: "kg", formulaId: "stairs_formwork_consumables_v1", procurementEligible: true, sourceRole: "APPROVED_PROJECT_FORMWORK_CONSUMABLES_SCHEDULE", consumerParameterIds: ["formwork_consumables_kg"] }),
  resource({ rowId: "labor:formwork:stairs-assembly", ordinal: 7, section: "Работы", category: "labor", titleRu: "Сборка опалубки лестницы", unitId: "man_hour", formulaId: "stairs_formwork_assembly_labor_v1", procurementEligible: false, sourceRole: "APPROVED_PROJECT_FORMWORK_LABOR_SCHEDULE", consumerParameterIds: ["formwork_assembly_worker_h"] }),
  resource({ rowId: "labor:formwork:stairs-alignment", ordinal: 8, section: "Работы", category: "labor", titleRu: "Выверка и закрепление опалубки лестницы", unitId: "man_hour", formulaId: "stairs_formwork_alignment_labor_v1", procurementEligible: false, sourceRole: "APPROVED_PROJECT_FORMWORK_LABOR_SCHEDULE", consumerParameterIds: ["formwork_alignment_worker_h"] }),
  resource({ rowId: "labor:formwork:stairs-stripping", ordinal: 9, section: "Работы", category: "labor", titleRu: "Распалубка лестницы", unitId: "man_hour", formulaId: "stairs_formwork_stripping_labor_v1", procurementEligible: false, sourceRole: "APPROVED_PROJECT_FORMWORK_LABOR_SCHEDULE", consumerParameterIds: ["formwork_stripping_worker_h"] }),
  resource({ rowId: "equipment:formwork:stairs-lifting", ordinal: 10, section: "Оборудование", category: "equipment", titleRu: "Подъёмное оборудование для опалубки лестницы", unitId: "machine_hour", formulaId: "stairs_formwork_lifting_v1", inclusionAst: and(LIFTING_REQUIRED, greaterThan("lifting_machine_h", 0)), procurementEligible: true, sourceRole: "APPROVED_PROJECT_LIFTING_SCHEDULE", consumerParameterIds: ["lifting_equipment_required", "lifting_equipment_designation", "lifting_machine_h"] }),
  resource({ rowId: "service:formwork:stairs-inspection", ordinal: 11, section: "Услуги", category: "service", titleRu: "Контроль готовности опалубки лестницы к бетонированию", unitId: "document", formulaId: "stairs_formwork_inspection_v1", procurementEligible: true, sourceRole: "APPROVED_PROJECT_FORMWORK_INSPECTION_PLAN", consumerParameterIds: ["approved_formwork_drawing_reference", "formwork_inspection_document_count"] }),
  resource({ rowId: "delivery:formwork:stairs-outbound", ordinal: 12, section: "Логистика", category: "delivery", titleRu: "Доставка комплекта опалубки лестницы", unitId: "trip", formulaId: "stairs_formwork_delivery_v1", procurementEligible: true, sourceRole: "SUPPLIER_FORMWORK_DELIVERY_QUOTE", consumerParameterIds: ["formwork_delivery_trip_count"] }),
  resource({ rowId: "delivery:formwork:stairs-return", ordinal: 13, section: "Логистика", category: "delivery", titleRu: "Возврат арендного комплекта опалубки лестницы", unitId: "trip", formulaId: "stairs_formwork_return_v1", inclusionAst: and(RENTAL_RETURNABLE, greaterThan("formwork_return_trip_count", 0)), procurementEligible: true, sourceRole: "SUPPLIER_FORMWORK_RETURN_QUOTE", consumerParameterIds: ["formwork_supply_mode", "formwork_return_trip_count"] }),
]);

export type StairsProjectFormworkContextKey =
  | "standard" | "high_load" | "large_area" | "repair"
  | "small_area" | "technical_room" | "wet_zone";

const PROJECT_SCHEDULES: Readonly<Record<
StairsProjectFormworkContextKey,
Readonly<Record<string, StairsProjectFormworkInputValueR1>>
>> = Object.freeze({
  standard: { measured_formwork_contact_area_m2: 72, formwork_supply_mode: "RENTAL_RETURNABLE", formwork_facing_area_m2: 78, formwork_framing_length_m: 128, riser_and_edge_form_length_m: 54, temporary_shoring_required: true, temporary_shoring_designation: "STAIR-SHORE-STANDARD-REV-A", temporary_shoring_quantity_piece: 42, formwork_rental_duration_days: 21, form_release_agent_l: 8, formwork_consumables_kg: 24, formwork_assembly_worker_h: 72, formwork_alignment_worker_h: 20, formwork_stripping_worker_h: 36, lifting_equipment_required: false, formwork_inspection_document_count: 2, formwork_delivery_trip_count: 1, formwork_return_trip_count: 1 },
  high_load: { measured_formwork_contact_area_m2: 168, formwork_supply_mode: "RENTAL_RETURNABLE", formwork_facing_area_m2: 182, formwork_framing_length_m: 310, riser_and_edge_form_length_m: 116, temporary_shoring_required: true, temporary_shoring_designation: "STAIR-SHORE-HIGH-LOAD-REV-A", temporary_shoring_quantity_piece: 110, formwork_rental_duration_days: 35, form_release_agent_l: 19, formwork_consumables_kg: 62, formwork_assembly_worker_h: 184, formwork_alignment_worker_h: 48, formwork_stripping_worker_h: 90, lifting_equipment_required: true, lifting_equipment_designation: "CRANE-STAIR-HIGH-LOAD-REV-A", lifting_machine_h: 10, formwork_inspection_document_count: 4, formwork_delivery_trip_count: 2, formwork_return_trip_count: 2 },
  large_area: { measured_formwork_contact_area_m2: 340, formwork_supply_mode: "RENTAL_RETURNABLE", formwork_facing_area_m2: 365, formwork_framing_length_m: 640, riser_and_edge_form_length_m: 232, temporary_shoring_required: true, temporary_shoring_designation: "STAIR-SHORE-LARGE-AREA-REV-A", temporary_shoring_quantity_piece: 220, formwork_rental_duration_days: 42, form_release_agent_l: 38, formwork_consumables_kg: 126, formwork_assembly_worker_h: 356, formwork_alignment_worker_h: 92, formwork_stripping_worker_h: 172, lifting_equipment_required: true, lifting_equipment_designation: "CRANE-STAIR-LARGE-AREA-REV-A", lifting_machine_h: 22, formwork_inspection_document_count: 6, formwork_delivery_trip_count: 4, formwork_return_trip_count: 4 },
  repair: { measured_formwork_contact_area_m2: 31, formwork_supply_mode: "PROJECT_PURCHASE", formwork_facing_area_m2: 34, formwork_framing_length_m: 58, riser_and_edge_form_length_m: 22, temporary_shoring_required: true, temporary_shoring_designation: "STAIR-SHORE-REPAIR-REV-A", temporary_shoring_quantity_piece: 18, form_release_agent_l: 4, formwork_consumables_kg: 16, formwork_assembly_worker_h: 42, formwork_alignment_worker_h: 14, formwork_stripping_worker_h: 22, lifting_equipment_required: false, formwork_inspection_document_count: 2, formwork_delivery_trip_count: 1 },
  small_area: { measured_formwork_contact_area_m2: 22, formwork_supply_mode: "CONTRACTOR_OWNED", formwork_facing_area_m2: 24, formwork_framing_length_m: 42, riser_and_edge_form_length_m: 17, temporary_shoring_required: true, temporary_shoring_designation: "STAIR-SHORE-SMALL-AREA-REV-A", temporary_shoring_quantity_piece: 14, form_release_agent_l: 3, formwork_consumables_kg: 9, formwork_assembly_worker_h: 28, formwork_alignment_worker_h: 9, formwork_stripping_worker_h: 14, lifting_equipment_required: false, formwork_inspection_document_count: 1, formwork_delivery_trip_count: 1 },
  technical_room: { measured_formwork_contact_area_m2: 58, formwork_supply_mode: "PROJECT_PURCHASE", formwork_facing_area_m2: 64, formwork_framing_length_m: 116, riser_and_edge_form_length_m: 46, temporary_shoring_required: true, temporary_shoring_designation: "STAIR-SHORE-TECHNICAL-ROOM-REV-A", temporary_shoring_quantity_piece: 38, form_release_agent_l: 7, formwork_consumables_kg: 28, formwork_assembly_worker_h: 76, formwork_alignment_worker_h: 24, formwork_stripping_worker_h: 38, lifting_equipment_required: false, formwork_inspection_document_count: 2, formwork_delivery_trip_count: 2 },
  wet_zone: { measured_formwork_contact_area_m2: 106, formwork_supply_mode: "RENTAL_RETURNABLE", formwork_facing_area_m2: 115, formwork_framing_length_m: 202, riser_and_edge_form_length_m: 78, temporary_shoring_required: true, temporary_shoring_designation: "STAIR-SHORE-WET-ZONE-REV-A", temporary_shoring_quantity_piece: 68, formwork_rental_duration_days: 28, form_release_agent_l: 12, formwork_consumables_kg: 43, formwork_assembly_worker_h: 118, formwork_alignment_worker_h: 34, formwork_stripping_worker_h: 58, lifting_equipment_required: true, lifting_equipment_designation: "HOIST-STAIR-WET-ZONE-REV-A", lifting_machine_h: 7, formwork_inspection_document_count: 3, formwork_delivery_trip_count: 2, formwork_return_trip_count: 2 },
});

export function stairsProjectFormworkAcceptanceInputR1(
  contextKey: StairsProjectFormworkContextKey,
): Readonly<Record<string, StairsProjectFormworkInputValueR1>> {
  const reference = contextKey.toUpperCase().replace(/_/gu, "-");
  const schedule = PROJECT_SCHEDULES[contextKey];
  if (!schedule) throw new Error(`STAIRS_PROJECT_FORMWORK_CONTEXT_UNSUPPORTED:${contextKey}`);
  return Object.freeze({
    stairs_geometry_description: `Монолитная лестница STAIR-${reference}; марши, ступени и площадки по проектной геометрии`,
    approved_formwork_drawing_reference: `FW-STAIR-${reference}-REV-A`,
    formwork_system_designation: `PROJECT-STAIR-FORMWORK-${reference}-REV-A`,
    ...schedule,
  });
}
