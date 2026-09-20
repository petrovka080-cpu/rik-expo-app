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
export type ConcreteSlabEmbeddedItemsInputValueR1 = string | number | boolean;

export const CONCRETE_SLAB_EMBEDDED_ITEMS_SOURCE_ID =
  "src_professional_norm_pack_concrete_aci_spec_301_20_project_embedment_schedule_v1";
export const CONCRETE_SLAB_EMBEDDED_ITEMS_TOLERANCE_SOURCE_ID =
  "src_professional_norm_pack_concrete_aci_117_10_embedded_item_tolerances_v1";
export const CONCRETE_SLAB_EMBEDDED_ITEMS_NORM_ID =
  "concrete_aci_spec_301_20_117_10_project_embedment_schedule_v1";
export const CONCRETE_SLAB_EMBEDDED_ITEMS_SOURCE_PDF_SHA256 =
  "7c9dea210cb04812c74b37650dfb2e9199ceacf7c679ef831908955fdad6729a";
export const CONCRETE_SLAB_EMBEDDED_ITEMS_TOLERANCE_PDF_SHA256 =
  "ae014a5dd26dfaf3a5d550e7b57aa8e7d8a97f02a698a0619ed331ec72f83cd9";
const PROJECT_SCHEDULE_GUIDE_SHA256 =
  "42123e5d9adcd174b32049da87bcfbe55b0b7f2cd5ef17a09e599b63f4dddb50";

export const CONCRETE_SLAB_EMBEDDED_ITEMS_SOURCE_METADATA = Object.freeze({
  source_id: CONCRETE_SLAB_EMBEDDED_ITEMS_SOURCE_ID,
  source_title:
    "ACI SPEC-301-20 and ACI 117-10: project requirements, placement and tolerances for embedded items",
  source_document_version: "ACI SPEC-301-20 + ACI 117-10",
  source_url:
    "https://www.concrete.org/Portals/0/Files/PDF/Previews/301-20_preview.pdf",
  product_url:
    "https://www.concrete.org/store/productdetail.aspx?ItemID=301U20&Language=English&Units=US_Units",
  supporting_source_id: CONCRETE_SLAB_EMBEDDED_ITEMS_TOLERANCE_SOURCE_ID,
  supporting_source_url:
    "https://www.concrete.org/portals/0/files/pdf/previews/117-10web.pdf",
  exact_locator:
    "ACI SPEC-301-20 public description and preview pp. 2-3: project-specific requirements, embedded items, testing and inspection; ACI 117-10 public preview p. 3: Section 2.3 placement of embedded items and Section 7.5 embedded plates.",
  definition_hash: CONCRETE_SLAB_EMBEDDED_ITEMS_SOURCE_PDF_SHA256,
  supporting_definition_hash: CONCRETE_SLAB_EMBEDDED_ITEMS_TOLERANCE_PDF_SHA256,
  verified_at: "2026-09-18T00:00:00+06:00",
  universal_productivity_claimed: false,
  universal_consumption_claimed: false,
  quantity_basis: "APPROVED_EMBEDMENT_DRAWINGS_AND_DIRECT_PROJECT_SCHEDULE",
});

export const CONCRETE_SLAB_EMBEDDED_ITEMS_TARGETS = Object.freeze([
  { contextKey: "standard", catalogId: "canonical-work:base:concrete_foundation_interior_concrete_slab_anchor_standard", titleRu: "Монтаж закладных для бетонной плиты в стандартной зоне", contextRu: "стандартная зона" },
  { contextKey: "high_load", catalogId: "canonical-work:base:concrete_foundation_interior_concrete_slab_anchor_high_load", titleRu: "Монтаж закладных для бетонной плиты для высокой нагрузки", contextRu: "зона высокой нагрузки" },
  { contextKey: "large_area", catalogId: "canonical-work:base:concrete_foundation_interior_concrete_slab_anchor_large_area", titleRu: "Монтаж закладных для бетонной плиты на большой площади", contextRu: "большая площадь" },
  { contextKey: "small_area", catalogId: "canonical-work:base:concrete_foundation_interior_concrete_slab_anchor_small_area", titleRu: "Монтаж закладных для бетонной плиты на малой площади", contextRu: "малая площадь" },
  { contextKey: "technical_room", catalogId: "canonical-work:base:concrete_foundation_interior_concrete_slab_anchor_technical_room", titleRu: "Монтаж закладных для бетонной плиты в техническом помещении", contextRu: "техническое помещение" },
  { contextKey: "wet_zone", catalogId: "canonical-work:base:concrete_foundation_interior_concrete_slab_anchor_wet_zone", titleRu: "Монтаж закладных для бетонной плиты во влажной зоне", contextRu: "влажная зона" },
] as const);

export type ConcreteSlabEmbeddedItemsContextKey =
  (typeof CONCRETE_SLAB_EMBEDDED_ITEMS_TARGETS)[number]["contextKey"];

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
const WELDING_REQUIRED = equals("field_welding_required", true);
const WELDING_FORBIDDEN = equals("field_welding_required", false);
const SUPPORT_REQUIRED = equals("temporary_support_required", true);
const SUPPORT_FORBIDDEN = equals("temporary_support_required", false);
const LIFT_REQUIRED = equals("lifting_equipment_required", true);
const LIFT_FORBIDDEN = equals("lifting_equipment_required", false);
const SURVEY_REQUIRED = equals("survey_control_required", true);
const SURVEY_FORBIDDEN = equals("survey_control_required", false);
const COATING_REQUIRED = equals("coating_touchup_required", true);
const COATING_FORBIDDEN = equals("coating_touchup_required", false);
const MOBILIZATION_SEPARATE = equals("equipment_mobilization_pricing_mode", "SEPARATE");
const MOBILIZATION_INCLUDED = equals(
  "equipment_mobilization_pricing_mode",
  "INCLUDED_IN_EQUIPMENT_RATE",
);

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
  { parameterId: "embedded_item_count_piece", titleRu: "Количество закладных изделий по проектной ведомости", valueType: "decimal", unitId: "piece", required: true, constraints: { min: 0.001 } },
  { parameterId: "embedded_item_total_mass_kg", titleRu: "Общая масса закладных изделий по проектной ведомости", valueType: "decimal", unitId: "kg", required: true, constraints: { min: 0.001 } },
  { parameterId: "approved_embedment_design_reference", titleRu: "Утверждённый проект закладных изделий и анкеровки", valueType: "text", unitId: null, required: true, constraints: { minLength: 1, maxLength: 1_000 } },
  { parameterId: "embedded_item_schedule_reference", titleRu: "Проектная ведомость закладных изделий", valueType: "text", unitId: null, required: true, constraints: { minLength: 1, maxLength: 1_000 } },
  { parameterId: "approved_placement_drawing_reference", titleRu: "Утверждённый план расположения закладных изделий", valueType: "text", unitId: null, required: true, constraints: { minLength: 1, maxLength: 1_000 } },
  { parameterId: "slab_location", titleRu: "Участок бетонной плиты для монтажа закладных", valueType: "text", unitId: null, required: true, constraints: { minLength: 1, maxLength: 1_000 } },
  { parameterId: "tolerance_specification_reference", titleRu: "Проектные допуски положения и отметок закладных", valueType: "text", unitId: null, required: true, constraints: { minLength: 1, maxLength: 1_000 } },
  { parameterId: "installation_method_statement_reference", titleRu: "Технологическая карта монтажа и фиксации закладных", valueType: "text", unitId: null, required: true, constraints: { minLength: 1, maxLength: 1_000 } },
  { parameterId: "embedded_item_designation", titleRu: "Обозначение закладных изделий по проектной спецификации", valueType: "text", unitId: null, required: true, constraints: { minLength: 1, maxLength: 1_000 } },
  { parameterId: "layout_worker_h", titleRu: "Трудозатраты на разбивку мест закладных", valueType: "decimal", unitId: "man_hour", required: true, constraints: { min: 0.001 } },
  { parameterId: "positioning_worker_h", titleRu: "Трудозатраты на установку закладных в проектное положение", valueType: "decimal", unitId: "man_hour", required: true, constraints: { min: 0.001 } },
  { parameterId: "fixing_worker_h", titleRu: "Трудозатраты на фиксацию закладных до бетонирования", valueType: "decimal", unitId: "man_hour", required: true, constraints: { min: 0.001 } },
  { parameterId: "field_welding_required", titleRu: "Требуется монтажная сварка закладных по проекту", valueType: "boolean", unitId: null, required: true, constraints: {} },
  { parameterId: "approved_welding_procedure_reference", titleRu: "Утверждённая процедура монтажной сварки", valueType: "text", unitId: null, required: false, constraints: conditionalText(WELDING_REQUIRED, WELDING_FORBIDDEN) },
  { parameterId: "welding_worker_h", titleRu: "Трудозатраты на монтажную сварку закладных", valueType: "decimal", unitId: "man_hour", required: false, constraints: conditionalQuantity(WELDING_REQUIRED, WELDING_FORBIDDEN) },
  { parameterId: "welding_consumable_designation", titleRu: "Сварочные материалы по утверждённой процедуре", valueType: "text", unitId: null, required: false, constraints: conditionalText(WELDING_REQUIRED, WELDING_FORBIDDEN) },
  { parameterId: "welding_consumable_quantity_kg", titleRu: "Количество сварочных материалов по проектной ведомости", valueType: "decimal", unitId: "kg", required: false, constraints: conditionalQuantity(WELDING_REQUIRED, WELDING_FORBIDDEN) },
  { parameterId: "temporary_support_required", titleRu: "Требуются отдельные монтажные опоры или фиксаторы", valueType: "boolean", unitId: null, required: true, constraints: {} },
  { parameterId: "temporary_support_designation", titleRu: "Монтажные опоры и фиксаторы по проектной спецификации", valueType: "text", unitId: null, required: false, constraints: conditionalText(SUPPORT_REQUIRED, SUPPORT_FORBIDDEN) },
  { parameterId: "temporary_support_quantity_kg", titleRu: "Количество монтажных опор и фиксаторов по ведомости", valueType: "decimal", unitId: "kg", required: false, constraints: conditionalQuantity(SUPPORT_REQUIRED, SUPPORT_FORBIDDEN) },
  { parameterId: "lifting_equipment_required", titleRu: "Требуется отдельное подъёмное оборудование", valueType: "boolean", unitId: null, required: true, constraints: {} },
  { parameterId: "lifting_equipment_designation", titleRu: "Подъёмное оборудование по ведомости механизмов", valueType: "text", unitId: null, required: false, constraints: conditionalText(LIFT_REQUIRED, LIFT_FORBIDDEN) },
  { parameterId: "lifting_equipment_machine_h", titleRu: "Машино-время подъёмного оборудования", valueType: "decimal", unitId: "machine_hour", required: false, constraints: conditionalQuantity(LIFT_REQUIRED, LIFT_FORBIDDEN) },
  { parameterId: "survey_control_required", titleRu: "Требуется отдельный геодезический контроль закладных", valueType: "boolean", unitId: null, required: true, constraints: {} },
  { parameterId: "survey_report_count", titleRu: "Комплект записей геодезического контроля закладных", valueType: "decimal", unitId: "document", required: false, constraints: conditionalQuantity(SURVEY_REQUIRED, SURVEY_FORBIDDEN) },
  { parameterId: "inspection_record_count", titleRu: "Комплект записей освидетельствования закладных до бетонирования", valueType: "decimal", unitId: "document", required: true, constraints: { min: 0.001 } },
  { parameterId: "coating_touchup_required", titleRu: "Требуется восстановление защитного покрытия закладных", valueType: "boolean", unitId: null, required: true, constraints: {} },
  { parameterId: "coating_touchup_designation", titleRu: "Материал восстановления защитного покрытия по проекту", valueType: "text", unitId: null, required: false, constraints: conditionalText(COATING_REQUIRED, COATING_FORBIDDEN) },
  { parameterId: "coating_touchup_quantity_kg", titleRu: "Количество материала защитного покрытия по ведомости", valueType: "decimal", unitId: "kg", required: false, constraints: conditionalQuantity(COATING_REQUIRED, COATING_FORBIDDEN) },
  { parameterId: "coating_touchup_worker_h", titleRu: "Трудозатраты на восстановление защитного покрытия", valueType: "decimal", unitId: "man_hour", required: false, constraints: conditionalQuantity(COATING_REQUIRED, COATING_FORBIDDEN) },
  { parameterId: "embedded_items_delivery_trip_count", titleRu: "Рейсы доставки закладных изделий", valueType: "decimal", unitId: "trip", required: true, constraints: { min: 0.001 } },
  { parameterId: "equipment_mobilization_pricing_mode", titleRu: "Учёт доставки и возврата подъёмного оборудования", valueType: "enum", unitId: null, required: false, constraints: { values: ["SEPARATE", "INCLUDED_IN_EQUIPMENT_RATE"], requiredWhen: LIFT_REQUIRED, forbiddenWhen: LIFT_FORBIDDEN } },
  { parameterId: "equipment_mobilization_trip_count", titleRu: "Рейсы доставки и возврата подъёмного оборудования", valueType: "decimal", unitId: "trip", required: false, constraints: { min: 0.001, requiredWhen: and(LIFT_REQUIRED, MOBILIZATION_SEPARATE), forbiddenWhen: or(LIFT_FORBIDDEN, MOBILIZATION_INCLUDED) } },
  { parameterId: "mobilization_scope_reference", titleRu: "Маршрут и граница мобилизации подъёмного оборудования", valueType: "text", unitId: null, required: false, constraints: { minLength: 1, maxLength: 1_000, requiredWhen: and(LIFT_REQUIRED, MOBILIZATION_SEPARATE), forbiddenWhen: or(LIFT_FORBIDDEN, MOBILIZATION_INCLUDED) } },
]);

export const CONCRETE_SLAB_EMBEDDED_ITEMS_NORMATIVE_PARAMETER_IDS = Object.freeze([
  "embedded_item_count_piece",
  "embedded_item_total_mass_kg",
  "approved_embedment_design_reference",
  "embedded_item_schedule_reference",
  "approved_placement_drawing_reference",
  "slab_location",
  "tolerance_specification_reference",
  "installation_method_statement_reference",
] as const);

const NORMATIVE_PARAMETER_IDS = new Set<string>(
  CONCRETE_SLAB_EMBEDDED_ITEMS_NORMATIVE_PARAMETER_IDS,
);

export type ConcreteSlabEmbeddedItemsParameterR1 = CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata: Json;
};

export const CONCRETE_SLAB_EMBEDDED_ITEMS_PARAMETERS:
readonly ConcreteSlabEmbeddedItemsParameterR1[] = Object.freeze(
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
      contract: "rik-expo-app.concrete-slab-embedded-items-r1",
      semantic_parameter_key: `concrete-slab-embedded-items:${spec.parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: "PROJECT_SPECIFIC_INPUT",
      input_origin_class: NORMATIVE_PARAMETER_IDS.has(spec.parameterId)
        ? "ACI_APPLICABILITY_AND_APPROVED_PROJECT_EMBEDMENT_DOCUMENTS"
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
        guide_short_ru: `${spec.titleRu}: укажите значение из утверждённого проекта, ведомости, технологической карты или коммерческого предложения.`,
        source_role: NORMATIVE_PARAMETER_IDS.has(spec.parameterId)
          ? "ACI_301_117_EMBEDMENT_APPLICABILITY_AND_PROJECT_REQUIREMENTS"
          : "APPROVED_PROJECT_DOCUMENTATION_OR_SUPPLIER_QUOTE",
        source_document: NORMATIVE_PARAMETER_IDS.has(spec.parameterId)
          ? CONCRETE_SLAB_EMBEDDED_ITEMS_SOURCE_ID
          : null,
        source_locator: NORMATIVE_PARAMETER_IDS.has(spec.parameterId)
          ? CONCRETE_SLAB_EMBEDDED_ITEMS_SOURCE_METADATA.exact_locator
          : null,
        guide_version: "concrete-slab-embedded-items-r1",
        source_snapshot_hash: NORMATIVE_PARAMETER_IDS.has(spec.parameterId)
          ? CONCRETE_SLAB_EMBEDDED_ITEMS_SOURCE_PDF_SHA256
          : PROJECT_SCHEDULE_GUIDE_SHA256,
        applicability:
          "ACI 301 и ACI 117 задают область требований к закладным, контролю и допускам, но не дают универсального расхода или производительности для любого проекта.",
        verified_at: CONCRETE_SLAB_EMBEDDED_ITEMS_SOURCE_METADATA.verified_at,
        guide_validation_policy:
          "REJECT_MISSING_PROJECT_EMBEDMENT_DESIGN_DRAWING_TOLERANCE_OR_DIRECT_SCHEDULE",
      },
      hidden_default_forbidden: true,
      synthetic: false,
    },
  })),
);

export type ConcreteSlabEmbeddedItemsFormulaR1 = CanonicalEstimateFormulaDefinition & {
  output_unit_id: string;
  expression_source: string;
};

function formula(
  formulaId: string,
  outputUnitId: string,
  expressionSource: string,
): ConcreteSlabEmbeddedItemsFormulaR1 {
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

export const CONCRETE_SLAB_EMBEDDED_ITEMS_FORMULAS:
readonly ConcreteSlabEmbeddedItemsFormulaR1[] = Object.freeze([
  formula("slab_embedded_items_scope_count_v1", "piece", "embedded_item_count_piece"),
  formula("slab_embedded_items_mass_v1", "kg", "embedded_item_total_mass_kg"),
  formula("slab_embedded_items_layout_labor_v1", "man_hour", "layout_worker_h"),
  formula("slab_embedded_items_positioning_labor_v1", "man_hour", "positioning_worker_h"),
  formula("slab_embedded_items_fixing_labor_v1", "man_hour", "fixing_worker_h"),
  formula("slab_embedded_items_welding_labor_v1", "man_hour", "welding_worker_h"),
  formula("slab_embedded_items_welding_consumables_v1", "kg", "welding_consumable_quantity_kg"),
  formula("slab_embedded_items_temporary_support_v1", "kg", "temporary_support_quantity_kg"),
  formula("slab_embedded_items_lifting_equipment_v1", "machine_hour", "lifting_equipment_machine_h"),
  formula("slab_embedded_items_survey_reports_v1", "document", "survey_report_count"),
  formula("slab_embedded_items_inspection_records_v1", "document", "inspection_record_count"),
  formula("slab_embedded_items_coating_material_v1", "kg", "coating_touchup_quantity_kg"),
  formula("slab_embedded_items_coating_labor_v1", "man_hour", "coating_touchup_worker_h"),
  formula("slab_embedded_items_delivery_v1", "trip", "embedded_items_delivery_trip_count"),
  formula("slab_embedded_items_equipment_mobilization_v1", "trip", "equipment_mobilization_trip_count"),
]);

const literalTrue = Object.freeze({ kind: "literal", value: true });
const greaterThan = (parameterId: string, value: number): Json => ({
  kind: "greater_than",
  parameterId,
  value,
});

const ACI_TRACE = Object.freeze({
  sourceId: CONCRETE_SLAB_EMBEDDED_ITEMS_SOURCE_ID,
  source_id: CONCRETE_SLAB_EMBEDDED_ITEMS_SOURCE_ID,
  normId: CONCRETE_SLAB_EMBEDDED_ITEMS_NORM_ID,
  norm_id: CONCRETE_SLAB_EMBEDDED_ITEMS_NORM_ID,
  normVersion: CONCRETE_SLAB_EMBEDDED_ITEMS_SOURCE_METADATA.source_document_version,
  source_title: CONCRETE_SLAB_EMBEDDED_ITEMS_SOURCE_METADATA.source_title,
  source_url: CONCRETE_SLAB_EMBEDDED_ITEMS_SOURCE_METADATA.source_url,
  exact_locator: CONCRETE_SLAB_EMBEDDED_ITEMS_SOURCE_METADATA.exact_locator,
  source_definition_hash: CONCRETE_SLAB_EMBEDDED_ITEMS_SOURCE_METADATA.definition_hash,
  supporting_source_id: CONCRETE_SLAB_EMBEDDED_ITEMS_TOLERANCE_SOURCE_ID,
  supporting_source_definition_hash:
    CONCRETE_SLAB_EMBEDDED_ITEMS_TOLERANCE_PDF_SHA256,
  sourceRole: "METHOD_AND_TOLERANCE_APPLICABILITY_NOT_UNIVERSAL_CONSUMPTION_OR_PRODUCTIVITY",
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
    semanticOwnerId: `concrete-slab-embedded-items:${input.rowId}`,
    costOwner: "resource",
    inputParameterIds: [...input.consumerParameterIds],
    normativeMethodGuidanceV1: {
      source_id: CONCRETE_SLAB_EMBEDDED_ITEMS_SOURCE_ID,
      norm_id: CONCRETE_SLAB_EMBEDDED_ITEMS_NORM_ID,
      operation_class: "PLACE_AND_FIX_PROJECT_SPECIFIED_EMBEDDED_ITEMS_BEFORE_CONCRETING",
      scope_mode: "APPROVED_DRAWINGS_AND_DIRECT_PROJECT_SCHEDULE_QUANTITIES",
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
    },
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: input.sourceRole,
    quantitySourceRole: "APPROVED_EMBEDMENT_DRAWINGS_AND_DIRECT_PROJECT_SCHEDULE",
    normativeTrace: [ACI_TRACE, {
      sourceId: "project_concrete_slab_embedded_items_schedule",
      sourceRole: input.sourceRole,
    }],
    excludedUnownedAssumptions: [
      "automatic embedded-item mass or count",
      "automatic labor productivity",
      "automatic welding or coating scope",
      "automatic temporary supports",
      "automatic lifting-equipment duration",
      "hidden mobilization trips",
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

export const CONCRETE_SLAB_EMBEDDED_ITEMS_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({ rowId: "material:concrete:slab-embedded-items", ordinal: 0, section: "Материалы", category: "material", titleRu: "Закладные изделия по проектной спецификации", unitId: "kg", formulaId: "slab_embedded_items_mass_v1", procurementEligible: true, sourceRole: "APPROVED_PROJECT_EMBEDDED_ITEM_TAKEOFF", consumerParameterIds: ["embedded_item_count_piece", "embedded_item_total_mass_kg", "embedded_item_designation", "embedded_item_schedule_reference"] }),
  resource({ rowId: "work:concrete:slab-embedded-items-layout", ordinal: 1, section: "Работы", category: "construction_work", titleRu: "Разбивка мест установки закладных изделий", unitId: "man_hour", formulaId: "slab_embedded_items_layout_labor_v1", procurementEligible: false, sourceRole: "APPROVED_PROJECT_LAYOUT_LABOR_SCHEDULE", consumerParameterIds: ["approved_placement_drawing_reference", "slab_location", "tolerance_specification_reference", "layout_worker_h"] }),
  resource({ rowId: "work:concrete:slab-embedded-items-positioning", ordinal: 2, section: "Работы", category: "construction_work", titleRu: "Установка закладных изделий в проектное положение", unitId: "man_hour", formulaId: "slab_embedded_items_positioning_labor_v1", procurementEligible: false, sourceRole: "APPROVED_PROJECT_POSITIONING_LABOR_SCHEDULE", consumerParameterIds: ["approved_embedment_design_reference", "approved_placement_drawing_reference", "installation_method_statement_reference", "positioning_worker_h"] }),
  resource({ rowId: "work:concrete:slab-embedded-items-fixing", ordinal: 3, section: "Работы", category: "construction_work", titleRu: "Фиксация закладных изделий до бетонирования", unitId: "man_hour", formulaId: "slab_embedded_items_fixing_labor_v1", procurementEligible: false, sourceRole: "APPROVED_PROJECT_FIXING_LABOR_SCHEDULE", consumerParameterIds: ["installation_method_statement_reference", "fixing_worker_h"] }),
  resource({ rowId: "work:concrete:slab-embedded-items-welding", ordinal: 4, section: "Работы", category: "construction_work", titleRu: "Монтажная сварка закладных изделий по утверждённой процедуре", unitId: "man_hour", formulaId: "slab_embedded_items_welding_labor_v1", inclusionAst: and(WELDING_REQUIRED, greaterThan("welding_worker_h", 0)), procurementEligible: false, sourceRole: "APPROVED_WELDING_PROCEDURE_AND_LABOR_SCHEDULE", consumerParameterIds: ["field_welding_required", "approved_welding_procedure_reference", "welding_worker_h"] }),
  resource({ rowId: "material:concrete:slab-embedded-items-welding-consumables", ordinal: 5, section: "Материалы", category: "material", titleRu: "Сварочные материалы для закладных по утверждённой процедуре", unitId: "kg", formulaId: "slab_embedded_items_welding_consumables_v1", inclusionAst: and(WELDING_REQUIRED, greaterThan("welding_consumable_quantity_kg", 0)), procurementEligible: true, sourceRole: "APPROVED_WELDING_CONSUMABLE_TAKEOFF", consumerParameterIds: ["field_welding_required", "approved_welding_procedure_reference", "welding_consumable_designation", "welding_consumable_quantity_kg"] }),
  resource({ rowId: "material:concrete:slab-embedded-items-temporary-support", ordinal: 6, section: "Материалы", category: "material", titleRu: "Монтажные опоры и фиксаторы закладных по проекту", unitId: "kg", formulaId: "slab_embedded_items_temporary_support_v1", inclusionAst: and(SUPPORT_REQUIRED, greaterThan("temporary_support_quantity_kg", 0)), procurementEligible: true, sourceRole: "APPROVED_TEMPORARY_SUPPORT_TAKEOFF", consumerParameterIds: ["temporary_support_required", "temporary_support_designation", "temporary_support_quantity_kg"] }),
  resource({ rowId: "equipment:concrete:slab-embedded-items-lifting", ordinal: 7, section: "Техника", category: "equipment", titleRu: "Подъёмное оборудование для монтажа закладных", unitId: "machine_hour", formulaId: "slab_embedded_items_lifting_equipment_v1", inclusionAst: and(LIFT_REQUIRED, greaterThan("lifting_equipment_machine_h", 0)), procurementEligible: true, sourceRole: "APPROVED_PROJECT_LIFTING_EQUIPMENT_SCHEDULE", consumerParameterIds: ["lifting_equipment_required", "lifting_equipment_designation", "lifting_equipment_machine_h"] }),
  resource({ rowId: "service:concrete:slab-embedded-items-survey", ordinal: 8, section: "Услуги", category: "service", titleRu: "Геодезический контроль положения и отметок закладных", unitId: "document", formulaId: "slab_embedded_items_survey_reports_v1", inclusionAst: and(SURVEY_REQUIRED, greaterThan("survey_report_count", 0)), procurementEligible: true, sourceRole: "APPROVED_PROJECT_SURVEY_CONTROL_PLAN", consumerParameterIds: ["survey_control_required", "tolerance_specification_reference", "survey_report_count"] }),
  resource({ rowId: "service:concrete:slab-embedded-items-inspection", ordinal: 9, section: "Услуги", category: "service", titleRu: "Освидетельствование закладных изделий до бетонирования", unitId: "document", formulaId: "slab_embedded_items_inspection_records_v1", procurementEligible: true, sourceRole: "APPROVED_PROJECT_INSPECTION_PLAN", consumerParameterIds: ["approved_embedment_design_reference", "approved_placement_drawing_reference", "tolerance_specification_reference", "inspection_record_count"] }),
  resource({ rowId: "work:concrete:slab-embedded-items-coating", ordinal: 10, section: "Работы", category: "construction_work", titleRu: "Восстановление защитного покрытия закладных изделий", unitId: "man_hour", formulaId: "slab_embedded_items_coating_labor_v1", inclusionAst: and(COATING_REQUIRED, greaterThan("coating_touchup_worker_h", 0)), procurementEligible: false, sourceRole: "APPROVED_PROJECT_COATING_TOUCHUP_LABOR_SCHEDULE", consumerParameterIds: ["coating_touchup_required", "coating_touchup_designation", "coating_touchup_worker_h"] }),
  resource({ rowId: "material:concrete:slab-embedded-items-coating", ordinal: 11, section: "Материалы", category: "material", titleRu: "Материал восстановления защитного покрытия закладных", unitId: "kg", formulaId: "slab_embedded_items_coating_material_v1", inclusionAst: and(COATING_REQUIRED, greaterThan("coating_touchup_quantity_kg", 0)), procurementEligible: true, sourceRole: "APPROVED_PROJECT_COATING_TOUCHUP_TAKEOFF", consumerParameterIds: ["coating_touchup_required", "coating_touchup_designation", "coating_touchup_quantity_kg"] }),
  resource({ rowId: "delivery:concrete:slab-embedded-items", ordinal: 12, section: "Логистика", category: "delivery", titleRu: "Доставка закладных изделий на объект", unitId: "trip", formulaId: "slab_embedded_items_delivery_v1", procurementEligible: true, sourceRole: "SUPPLIER_ROUTE_AND_DELIVERY_QUOTE", consumerParameterIds: ["embedded_item_count_piece", "embedded_item_total_mass_kg", "embedded_items_delivery_trip_count"] }),
  resource({ rowId: "delivery:concrete:slab-embedded-items-equipment-mobilization", ordinal: 13, section: "Логистика", category: "delivery", titleRu: "Доставка и возврат подъёмного оборудования", unitId: "trip", formulaId: "slab_embedded_items_equipment_mobilization_v1", inclusionAst: and(LIFT_REQUIRED, MOBILIZATION_SEPARATE, greaterThan("equipment_mobilization_trip_count", 0)), procurementEligible: true, sourceRole: "SUPPLIER_ROUTE_AND_MOBILIZATION_QUOTE", consumerParameterIds: ["lifting_equipment_required", "equipment_mobilization_pricing_mode", "equipment_mobilization_trip_count", "mobilization_scope_reference"] }),
]);

const PROJECT_SCHEDULES: Readonly<Record<
ConcreteSlabEmbeddedItemsContextKey,
Readonly<Record<string, ConcreteSlabEmbeddedItemsInputValueR1>>
>> = Object.freeze({
  standard: { embedded_item_count_piece: 18, embedded_item_total_mass_kg: 620, layout_worker_h: 6, positioning_worker_h: 14, fixing_worker_h: 12, field_welding_required: true, approved_welding_procedure_reference: "WPS-CS-EMBED-STANDARD-REV-A", welding_worker_h: 8, welding_consumable_designation: "WELD-CONS-CS-EMBED-STANDARD-REV-A", welding_consumable_quantity_kg: 5, temporary_support_required: true, temporary_support_designation: "SUPPORT-CS-EMBED-STANDARD-REV-A", temporary_support_quantity_kg: 42, lifting_equipment_required: true, lifting_equipment_designation: "LIFT-CS-EMBED-STANDARD-REV-A", lifting_equipment_machine_h: 4, survey_control_required: true, survey_report_count: 2, inspection_record_count: 2, coating_touchup_required: false, embedded_items_delivery_trip_count: 2, equipment_mobilization_pricing_mode: "INCLUDED_IN_EQUIPMENT_RATE" },
  high_load: { embedded_item_count_piece: 28, embedded_item_total_mass_kg: 1650, layout_worker_h: 10, positioning_worker_h: 26, fixing_worker_h: 22, field_welding_required: true, approved_welding_procedure_reference: "WPS-CS-EMBED-HIGH-LOAD-REV-A", welding_worker_h: 18, welding_consumable_designation: "WELD-CONS-CS-EMBED-HIGH-LOAD-REV-A", welding_consumable_quantity_kg: 12, temporary_support_required: true, temporary_support_designation: "SUPPORT-CS-EMBED-HIGH-LOAD-REV-A", temporary_support_quantity_kg: 96, lifting_equipment_required: true, lifting_equipment_designation: "LIFT-CS-EMBED-HIGH-LOAD-REV-A", lifting_equipment_machine_h: 10, survey_control_required: true, survey_report_count: 3, inspection_record_count: 4, coating_touchup_required: true, coating_touchup_designation: "COATING-CS-EMBED-HIGH-LOAD-REV-A", coating_touchup_quantity_kg: 6, coating_touchup_worker_h: 5, embedded_items_delivery_trip_count: 3, equipment_mobilization_pricing_mode: "SEPARATE", equipment_mobilization_trip_count: 2, mobilization_scope_reference: "LOG-CS-EMBED-HIGH-LOAD-RETURN-INCLUDED" },
  large_area: { embedded_item_count_piece: 52, embedded_item_total_mass_kg: 2400, layout_worker_h: 16, positioning_worker_h: 38, fixing_worker_h: 34, field_welding_required: true, approved_welding_procedure_reference: "WPS-CS-EMBED-LARGE-AREA-REV-A", welding_worker_h: 26, welding_consumable_designation: "WELD-CONS-CS-EMBED-LARGE-AREA-REV-A", welding_consumable_quantity_kg: 18, temporary_support_required: true, temporary_support_designation: "SUPPORT-CS-EMBED-LARGE-AREA-REV-A", temporary_support_quantity_kg: 140, lifting_equipment_required: true, lifting_equipment_designation: "LIFT-CS-EMBED-LARGE-AREA-REV-A", lifting_equipment_machine_h: 16, survey_control_required: true, survey_report_count: 5, inspection_record_count: 6, coating_touchup_required: false, embedded_items_delivery_trip_count: 5, equipment_mobilization_pricing_mode: "SEPARATE", equipment_mobilization_trip_count: 2, mobilization_scope_reference: "LOG-CS-EMBED-LARGE-AREA-RETURN-INCLUDED" },
  small_area: { embedded_item_count_piece: 6, embedded_item_total_mass_kg: 180, layout_worker_h: 3, positioning_worker_h: 6, fixing_worker_h: 5, field_welding_required: false, temporary_support_required: false, lifting_equipment_required: false, survey_control_required: false, inspection_record_count: 1, coating_touchup_required: false, embedded_items_delivery_trip_count: 1 },
  technical_room: { embedded_item_count_piece: 10, embedded_item_total_mass_kg: 360, layout_worker_h: 5, positioning_worker_h: 10, fixing_worker_h: 9, field_welding_required: true, approved_welding_procedure_reference: "WPS-CS-EMBED-TECHNICAL-ROOM-REV-A", welding_worker_h: 6, welding_consumable_designation: "WELD-CONS-CS-EMBED-TECHNICAL-ROOM-REV-A", welding_consumable_quantity_kg: 4, temporary_support_required: false, lifting_equipment_required: true, lifting_equipment_designation: "LIFT-CS-EMBED-TECHNICAL-ROOM-REV-A", lifting_equipment_machine_h: 3, survey_control_required: true, survey_report_count: 2, inspection_record_count: 2, coating_touchup_required: false, embedded_items_delivery_trip_count: 1, equipment_mobilization_pricing_mode: "INCLUDED_IN_EQUIPMENT_RATE" },
  wet_zone: { embedded_item_count_piece: 14, embedded_item_total_mass_kg: 540, layout_worker_h: 6, positioning_worker_h: 13, fixing_worker_h: 11, field_welding_required: true, approved_welding_procedure_reference: "WPS-CS-EMBED-WET-ZONE-REV-A", welding_worker_h: 8, welding_consumable_designation: "WELD-CONS-CS-EMBED-WET-ZONE-REV-A", welding_consumable_quantity_kg: 5, temporary_support_required: true, temporary_support_designation: "SUPPORT-CS-EMBED-WET-ZONE-REV-A", temporary_support_quantity_kg: 38, lifting_equipment_required: true, lifting_equipment_designation: "LIFT-CS-EMBED-WET-ZONE-REV-A", lifting_equipment_machine_h: 4, survey_control_required: true, survey_report_count: 2, inspection_record_count: 3, coating_touchup_required: true, coating_touchup_designation: "COATING-CS-EMBED-WET-ZONE-REV-A", coating_touchup_quantity_kg: 5, coating_touchup_worker_h: 5, embedded_items_delivery_trip_count: 2, equipment_mobilization_pricing_mode: "SEPARATE", equipment_mobilization_trip_count: 2, mobilization_scope_reference: "LOG-CS-EMBED-WET-ZONE-RETURN-INCLUDED" },
});

export function concreteSlabEmbeddedItemsAcceptanceInputR1(
  contextKey: ConcreteSlabEmbeddedItemsContextKey,
): Readonly<Record<string, ConcreteSlabEmbeddedItemsInputValueR1>> {
  const target = CONCRETE_SLAB_EMBEDDED_ITEMS_TARGETS.find(
    (candidate) => candidate.contextKey === contextKey,
  );
  if (!target) throw new Error(`CONCRETE_SLAB_EMBEDDED_ITEMS_CONTEXT_UNSUPPORTED:${contextKey}`);
  const reference = contextKey.toUpperCase().replace(/_/gu, "-");
  return Object.freeze({
    approved_embedment_design_reference: `DESIGN-CS-EMBED-${reference}-REV-A`,
    embedded_item_schedule_reference: `SCHEDULE-CS-EMBED-${reference}-REV-A`,
    approved_placement_drawing_reference: `DRAWING-CS-EMBED-${reference}-REV-A`,
    slab_location: `Бетонная плита; ${target.contextRu}; захватка CS-EMBED-${reference}`,
    tolerance_specification_reference: `TOL-CS-EMBED-${reference}-REV-A`,
    installation_method_statement_reference: `MS-CS-EMBED-${reference}-REV-A`,
    embedded_item_designation: `EMBEDDED-ITEM-CS-${reference}-REV-A`,
    ...PROJECT_SCHEDULES[contextKey],
  });
}

export async function compileConcreteSlabEmbeddedItemsR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? CONCRETE_SLAB_EMBEDDED_ITEMS_TARGETS[0].catalogId;
  if (!CONCRETE_SLAB_EMBEDDED_ITEMS_TARGETS.some((target) => target.catalogId === catalogId)) {
    throw new Error(`CONCRETE_SLAB_EMBEDDED_ITEMS_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.concrete-slab-embedded-items-r1",
    catalogId,
    primaryMeasureParameterId: "embedded_item_count_piece",
    parameterDefinitions: [...CONCRETE_SLAB_EMBEDDED_ITEMS_PARAMETERS],
    formulaDefinitions: [...CONCRETE_SLAB_EMBEDDED_ITEMS_FORMULAS],
    resourceDefinitions: [...CONCRETE_SLAB_EMBEDDED_ITEMS_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 18,
    hashJson: async (value) => JSON.stringify(value),
  });
}
