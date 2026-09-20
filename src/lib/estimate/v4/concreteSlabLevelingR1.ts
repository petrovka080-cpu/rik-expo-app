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
export type ConcreteSlabLevelingInputValueR1 = string | number | boolean;

export const CONCRETE_SLAB_LEVELING_SOURCE_ID =
  "src_professional_norm_pack_concrete_aci_302_1_15_project_leveling_schedule_v1";
export const CONCRETE_SLAB_LEVELING_NORM_ID =
  "concrete_aci_302_1_15_project_leveling_schedule_v1";
export const CONCRETE_SLAB_LEVELING_SOURCE_PDF_SHA256 =
  "53d9619bef8e81b161f35b67ec29fa573fa2f2ca898491f101df26106b9bff13";
const PROJECT_SCHEDULE_GUIDE_SHA256 =
  "1b9a2d4164301e64fb781c8918e5ad9d435de8458aaab66c342c644205add1c5";

export const CONCRETE_SLAB_LEVELING_SOURCE_METADATA = Object.freeze({
  source_id: CONCRETE_SLAB_LEVELING_SOURCE_ID,
  source_title: "ACI PRC-302.1-15: Guide to Concrete Floor and Slab Construction",
  source_document_version: "ACI PRC-302.1-15",
  source_url:
    "https://www.concrete.org/Portals/0/Files/PDF/Previews/302_1R-15_PREVIEW.pdf",
  product_url:
    "https://www.concrete.org/store/productdetail.aspx?ItemID=3021U15&Language=English&Units=US_AND_METRIC",
  exact_locator:
    "Public preview pp. 2-5: purpose/scope and contents; §§6.4 and 10.1-10.3 cover screed guides, tools, spreading, consolidating and finishing, while §10.15 and Chapter 12 cover flatness/levelness and quality control.",
  definition_hash: CONCRETE_SLAB_LEVELING_SOURCE_PDF_SHA256,
  verified_at: "2026-09-18T00:00:00+06:00",
  universal_productivity_claimed: false,
  universal_consumption_claimed: false,
  quantity_basis: "APPROVED_PROJECT_LEVELING_METHOD_AND_DIRECT_PROJECT_SCHEDULE",
});

export const CONCRETE_SLAB_LEVELING_TARGETS = Object.freeze([
  { contextKey: "standard", catalogId: "canonical-work:base:concrete_foundation_interior_concrete_slab_level_standard", titleRu: "Выравнивание бетонной плиты в стандартной зоне", contextRu: "стандартная зона" },
  { contextKey: "high_load", catalogId: "canonical-work:base:concrete_foundation_interior_concrete_slab_level_high_load", titleRu: "Выравнивание бетонной плиты для высокой нагрузки", contextRu: "зона высокой нагрузки" },
  { contextKey: "large_area", catalogId: "canonical-work:base:concrete_foundation_interior_concrete_slab_level_large_area", titleRu: "Выравнивание бетонной плиты на большой площади", contextRu: "большая площадь" },
  { contextKey: "repair", catalogId: "canonical-work:base:concrete_foundation_interior_concrete_slab_level_repair", titleRu: "Выравнивание бетонной плиты с локальным ремонтом основания", contextRu: "локальный ремонт основания" },
  { contextKey: "small_area", catalogId: "canonical-work:base:concrete_foundation_interior_concrete_slab_level_small_area", titleRu: "Выравнивание бетонной плиты на малой площади", contextRu: "малая площадь" },
  { contextKey: "technical_room", catalogId: "canonical-work:base:concrete_foundation_interior_concrete_slab_level_technical_room", titleRu: "Выравнивание бетонной плиты в техническом помещении", contextRu: "техническое помещение" },
  { contextKey: "wet_zone", catalogId: "canonical-work:base:concrete_foundation_interior_concrete_slab_level_wet_zone", titleRu: "Выравнивание бетонной плиты во влажной зоне", contextRu: "влажная зона" },
] as const);

export type ConcreteSlabLevelingContextKey =
  (typeof CONCRETE_SLAB_LEVELING_TARGETS)[number]["contextKey"];

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
const GUIDES_REQUIRED = equals("screed_guides_required", true);
const GUIDES_FORBIDDEN = equals("screed_guides_required", false);
const EQUIPMENT_REQUIRED = equals("separate_leveling_equipment_required", true);
const EQUIPMENT_FORBIDDEN = equals("separate_leveling_equipment_required", false);
const MOBILIZATION_SEPARATE = equals("equipment_mobilization_pricing_mode", "SEPARATE");
const MOBILIZATION_INCLUDED = equals(
  "equipment_mobilization_pricing_mode",
  "INCLUDED_IN_EQUIPMENT_RATE",
);

const PARAMETER_SPECS: readonly ParameterSpec[] = Object.freeze([
  { parameterId: "leveled_concrete_volume_m3", titleRu: "Объём бетонной плиты в границе выравнивания", valueType: "decimal", unitId: "m3", required: true, constraints: { min: 0.001 } },
  { parameterId: "leveling_surface_area_m2", titleRu: "Площадь поверхности бетонной плиты для выравнивания", valueType: "decimal", unitId: "m2", required: true, constraints: { min: 0.001 } },
  { parameterId: "concrete_mix_reference", titleRu: "Проектная спецификация бетонной смеси", valueType: "text", unitId: null, required: true, constraints: { minLength: 1, maxLength: 1_000 } },
  { parameterId: "leveling_location", titleRu: "Участок выравнивания бетонной плиты", valueType: "text", unitId: null, required: true, constraints: { minLength: 1, maxLength: 1_000 } },
  { parameterId: "target_elevation_and_slope_reference", titleRu: "Проектные отметки и уклоны поверхности", valueType: "text", unitId: null, required: true, constraints: { minLength: 1, maxLength: 1_000 } },
  { parameterId: "flatness_levelness_requirement_reference", titleRu: "Проектные требования к ровности и уровню", valueType: "text", unitId: null, required: true, constraints: { minLength: 1, maxLength: 1_000 } },
  { parameterId: "approved_leveling_method_designation", titleRu: "Утверждённый проектом способ выравнивания", valueType: "text", unitId: null, required: true, constraints: { minLength: 1, maxLength: 1_000 } },
  { parameterId: "leveling_method_statement_reference", titleRu: "Утверждённая технологическая карта выравнивания", valueType: "text", unitId: null, required: true, constraints: { minLength: 1, maxLength: 1_000 } },
  { parameterId: "leveling_worker_h", titleRu: "Трудозатраты на выравнивание бетонной плиты", valueType: "decimal", unitId: "man_hour", required: true, constraints: { min: 0.001 } },
  { parameterId: "screed_guides_required", titleRu: "Требуются отдельные направляющие для выравнивания", valueType: "boolean", unitId: null, required: true, constraints: {} },
  { parameterId: "screed_guide_designation", titleRu: "Направляющие по проектной спецификации", valueType: "text", unitId: null, required: false, constraints: { minLength: 1, maxLength: 1_000, requiredWhen: GUIDES_REQUIRED, forbiddenWhen: GUIDES_FORBIDDEN } },
  { parameterId: "screed_guide_length_m", titleRu: "Количество направляющих по проектной ведомости", valueType: "decimal", unitId: "m", required: false, constraints: { min: 0.001, requiredWhen: GUIDES_REQUIRED, forbiddenWhen: GUIDES_FORBIDDEN } },
  { parameterId: "separate_leveling_equipment_required", titleRu: "Требуется отдельное механизированное оборудование для выравнивания", valueType: "boolean", unitId: null, required: true, constraints: {} },
  { parameterId: "leveling_equipment_designation", titleRu: "Оборудование для выравнивания по проектной ведомости", valueType: "text", unitId: null, required: false, constraints: { minLength: 1, maxLength: 1_000, requiredWhen: EQUIPMENT_REQUIRED, forbiddenWhen: EQUIPMENT_FORBIDDEN } },
  { parameterId: "leveling_equipment_machine_h", titleRu: "Машино-время оборудования для выравнивания", valueType: "decimal", unitId: "machine_hour", required: false, constraints: { min: 0.001, requiredWhen: EQUIPMENT_REQUIRED, forbiddenWhen: EQUIPMENT_FORBIDDEN } },
  { parameterId: "quality_plan_reference", titleRu: "План контроля отметок, уклонов и ровности", valueType: "text", unitId: null, required: true, constraints: { minLength: 1, maxLength: 1_000 } },
  { parameterId: "surface_measurement_report_count", titleRu: "Комплект записей измерения поверхности", valueType: "decimal", unitId: "document", required: true, constraints: { min: 0.001 } },
  { parameterId: "equipment_mobilization_pricing_mode", titleRu: "Учёт доставки и возврата оборудования для выравнивания", valueType: "enum", unitId: null, required: false, constraints: { values: ["SEPARATE", "INCLUDED_IN_EQUIPMENT_RATE"], requiredWhen: EQUIPMENT_REQUIRED, forbiddenWhen: EQUIPMENT_FORBIDDEN } },
  { parameterId: "equipment_mobilization_trip_count", titleRu: "Рейсы доставки и возврата оборудования для выравнивания", valueType: "decimal", unitId: "trip", required: false, constraints: { min: 0.001, requiredWhen: and(EQUIPMENT_REQUIRED, MOBILIZATION_SEPARATE), forbiddenWhen: or(EQUIPMENT_FORBIDDEN, MOBILIZATION_INCLUDED) } },
  { parameterId: "mobilization_scope_reference", titleRu: "Маршрут и граница мобилизации оборудования для выравнивания", valueType: "text", unitId: null, required: false, constraints: { minLength: 1, maxLength: 1_000, requiredWhen: and(EQUIPMENT_REQUIRED, MOBILIZATION_SEPARATE), forbiddenWhen: or(EQUIPMENT_FORBIDDEN, MOBILIZATION_INCLUDED) } },
]);

export const CONCRETE_SLAB_LEVELING_NORMATIVE_PARAMETER_IDS = Object.freeze([
  "leveled_concrete_volume_m3",
  "leveling_surface_area_m2",
  "concrete_mix_reference",
  "leveling_location",
  "target_elevation_and_slope_reference",
  "flatness_levelness_requirement_reference",
  "approved_leveling_method_designation",
  "leveling_method_statement_reference",
] as const);

const NORMATIVE_PARAMETER_IDS = new Set<string>(
  CONCRETE_SLAB_LEVELING_NORMATIVE_PARAMETER_IDS,
);

export type ConcreteSlabLevelingParameterR1 = CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata: Json;
};

export const CONCRETE_SLAB_LEVELING_PARAMETERS:
readonly ConcreteSlabLevelingParameterR1[] = Object.freeze(
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
      contract: "rik-expo-app.concrete-slab-leveling-r1",
      semantic_parameter_key: `concrete-slab-leveling:${spec.parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: "PROJECT_SPECIFIC_INPUT",
      input_origin_class: NORMATIVE_PARAMETER_IDS.has(spec.parameterId)
        ? "ACI_APPLICABILITY_AND_APPROVED_PROJECT_METHOD"
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
        guide_short_ru: `${spec.titleRu}: укажите значение из утверждённого проекта, технологической карты, ведомости ресурсов или коммерческого предложения.`,
        source_role: NORMATIVE_PARAMETER_IDS.has(spec.parameterId)
          ? "ACI_302_SLAB_LEVELING_APPLICABILITY_AND_PROJECT_METHOD"
          : "APPROVED_PROJECT_DOCUMENTATION_OR_SUPPLIER_QUOTE",
        source_document: NORMATIVE_PARAMETER_IDS.has(spec.parameterId)
          ? CONCRETE_SLAB_LEVELING_SOURCE_ID
          : null,
        source_locator: NORMATIVE_PARAMETER_IDS.has(spec.parameterId)
          ? CONCRETE_SLAB_LEVELING_SOURCE_METADATA.exact_locator
          : null,
        guide_version: "concrete-slab-leveling-r1",
        source_snapshot_hash: NORMATIVE_PARAMETER_IDS.has(spec.parameterId)
          ? CONCRETE_SLAB_LEVELING_SOURCE_PDF_SHA256
          : PROJECT_SCHEDULE_GUIDE_SHA256,
        applicability:
          "ACI 302.1R-15 описывает операции, инструменты, направляющие и контроль ровности/уровня, но не задаёт универсальные нормы расхода или производительности для любого проекта.",
        verified_at: CONCRETE_SLAB_LEVELING_SOURCE_METADATA.verified_at,
        guide_validation_policy:
          "REJECT_MISSING_PROJECT_LEVELING_METHOD_SURFACE_REQUIREMENTS_OR_DIRECT_SCHEDULE",
      },
      hidden_default_forbidden: true,
      synthetic: false,
    },
  })),
);

export type ConcreteSlabLevelingFormulaR1 = CanonicalEstimateFormulaDefinition & {
  output_unit_id: string;
  expression_source: string;
};

function formula(
  formulaId: string,
  outputUnitId: string,
  expressionSource: string,
): ConcreteSlabLevelingFormulaR1 {
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

export const CONCRETE_SLAB_LEVELING_FORMULAS:
readonly ConcreteSlabLevelingFormulaR1[] = Object.freeze([
  formula("slab_leveling_scope_volume_v1", "m3", "leveled_concrete_volume_m3"),
  formula("slab_leveling_labor_v1", "man_hour", "leveling_worker_h"),
  formula("slab_leveling_guides_v1", "m", "screed_guide_length_m"),
  formula("slab_leveling_equipment_v1", "machine_hour", "leveling_equipment_machine_h"),
  formula("slab_leveling_measurement_reports_v1", "document", "surface_measurement_report_count"),
  formula("slab_leveling_equipment_mobilization_v1", "trip", "equipment_mobilization_trip_count"),
]);

const literalTrue = Object.freeze({ kind: "literal", value: true });
const greaterThan = (parameterId: string, value: number): Json => ({
  kind: "greater_than",
  parameterId,
  value,
});

const ACI_TRACE = Object.freeze({
  sourceId: CONCRETE_SLAB_LEVELING_SOURCE_ID,
  source_id: CONCRETE_SLAB_LEVELING_SOURCE_ID,
  normId: CONCRETE_SLAB_LEVELING_NORM_ID,
  norm_id: CONCRETE_SLAB_LEVELING_NORM_ID,
  normVersion: CONCRETE_SLAB_LEVELING_SOURCE_METADATA.source_document_version,
  source_title: CONCRETE_SLAB_LEVELING_SOURCE_METADATA.source_title,
  source_url: CONCRETE_SLAB_LEVELING_SOURCE_METADATA.source_url,
  exact_locator: CONCRETE_SLAB_LEVELING_SOURCE_METADATA.exact_locator,
  source_definition_hash: CONCRETE_SLAB_LEVELING_SOURCE_METADATA.definition_hash,
  sourceRole: "METHOD_APPLICABILITY_NOT_UNIVERSAL_CONSUMPTION_OR_PRODUCTIVITY",
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
    semanticOwnerId: `concrete-slab-leveling:${input.rowId}`,
    costOwner: "resource",
    inputParameterIds: [...input.consumerParameterIds],
    normativeMethodGuidanceV1: {
      source_id: CONCRETE_SLAB_LEVELING_SOURCE_ID,
      norm_id: CONCRETE_SLAB_LEVELING_NORM_ID,
      operation_class: "LEVEL_AND_STRIKE_OFF_FRESH_CONCRETE_SLAB",
      scope_mode: "PROJECT_METHOD_AND_DIRECT_SCHEDULE_QUANTITIES",
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
    },
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: input.sourceRole,
    quantitySourceRole: "APPROVED_PROJECT_LEVELING_METHOD_AND_DIRECT_PROJECT_SCHEDULE",
    normativeTrace: [ACI_TRACE, {
      sourceId: "project_concrete_slab_leveling_schedule",
      sourceRole: input.sourceRole,
    }],
    excludedUnownedAssumptions: [
      "automatic leveling productivity",
      "automatic guide consumption",
      "automatic equipment rental duration",
      "hidden mobilization trips",
      "invented concrete or finishing materials",
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

export const CONCRETE_SLAB_LEVELING_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({ rowId: "work:concrete:slab-leveling", ordinal: 0, section: "Работы", category: "construction_work", titleRu: "Выравнивание и срезка поверхности свежеуложенной бетонной плиты", unitId: "man_hour", formulaId: "slab_leveling_labor_v1", procurementEligible: false, sourceRole: "APPROVED_LEVELING_METHOD_LABOR_SCHEDULE", consumerParameterIds: ["leveled_concrete_volume_m3", "leveling_surface_area_m2", "concrete_mix_reference", "leveling_location", "target_elevation_and_slope_reference", "flatness_levelness_requirement_reference", "approved_leveling_method_designation", "leveling_method_statement_reference", "leveling_worker_h"] }),
  resource({ rowId: "material:concrete:screed-guides", ordinal: 1, section: "Материалы", category: "material", titleRu: "Направляющие для выравнивания по проектной спецификации", unitId: "m", formulaId: "slab_leveling_guides_v1", inclusionAst: and(GUIDES_REQUIRED, greaterThan("screed_guide_length_m", 0)), procurementEligible: true, sourceRole: "APPROVED_PROJECT_SCREED_GUIDE_TAKEOFF", consumerParameterIds: ["screed_guides_required", "screed_guide_designation", "screed_guide_length_m"] }),
  resource({ rowId: "equipment:concrete:slab-leveling", ordinal: 2, section: "Оборудование", category: "equipment", titleRu: "Оборудование для выравнивания по проектной ведомости", unitId: "machine_hour", formulaId: "slab_leveling_equipment_v1", inclusionAst: and(EQUIPMENT_REQUIRED, greaterThan("leveling_equipment_machine_h", 0)), procurementEligible: true, sourceRole: "APPROVED_PROJECT_EQUIPMENT_SCHEDULE", consumerParameterIds: ["separate_leveling_equipment_required", "leveling_equipment_designation", "leveling_equipment_machine_h"] }),
  resource({ rowId: "service:concrete:slab-leveling-surface-control", ordinal: 3, section: "Услуги", category: "service", titleRu: "Контроль отметок, уклонов, ровности и уровня поверхности", unitId: "document", formulaId: "slab_leveling_measurement_reports_v1", procurementEligible: true, sourceRole: "APPROVED_PROJECT_QUALITY_PLAN", consumerParameterIds: ["target_elevation_and_slope_reference", "flatness_levelness_requirement_reference", "quality_plan_reference", "surface_measurement_report_count"] }),
  resource({ rowId: "delivery:concrete:slab-leveling-equipment-mobilization", ordinal: 4, section: "Логистика", category: "delivery", titleRu: "Доставка и возврат оборудования для выравнивания", unitId: "trip", formulaId: "slab_leveling_equipment_mobilization_v1", inclusionAst: and(EQUIPMENT_REQUIRED, MOBILIZATION_SEPARATE, greaterThan("equipment_mobilization_trip_count", 0)), procurementEligible: true, sourceRole: "SUPPLIER_ROUTE_AND_MOBILIZATION_QUOTE", consumerParameterIds: ["separate_leveling_equipment_required", "equipment_mobilization_pricing_mode", "equipment_mobilization_trip_count", "mobilization_scope_reference"] }),
]);

const PROJECT_SCHEDULES: Readonly<Record<
ConcreteSlabLevelingContextKey,
Readonly<Record<string, ConcreteSlabLevelingInputValueR1>>
>> = Object.freeze({
  standard: { leveled_concrete_volume_m3: 12, leveling_surface_area_m2: 80, approved_leveling_method_designation: "PROJECT-MANUAL-SCREED-STANDARD", leveling_worker_h: 18, screed_guides_required: true, screed_guide_designation: "GUIDE-STANDARD-REV-A", screed_guide_length_m: 42, separate_leveling_equipment_required: false, surface_measurement_report_count: 2 },
  high_load: { leveled_concrete_volume_m3: 26, leveling_surface_area_m2: 150, approved_leveling_method_designation: "PROJECT-POWER-SCREED-HIGH-LOAD", leveling_worker_h: 30, screed_guides_required: true, screed_guide_designation: "GUIDE-HIGH-LOAD-REV-A", screed_guide_length_m: 76, separate_leveling_equipment_required: true, leveling_equipment_designation: "EQ-LEVEL-HIGH-LOAD-REV-A", leveling_equipment_machine_h: 9, surface_measurement_report_count: 3, equipment_mobilization_pricing_mode: "SEPARATE", equipment_mobilization_trip_count: 2, mobilization_scope_reference: "LOG-LEVEL-HIGH-LOAD-RETURN-INCLUDED" },
  large_area: { leveled_concrete_volume_m3: 54, leveling_surface_area_m2: 330, approved_leveling_method_designation: "PROJECT-LASER-GUIDED-SCREED-LARGE-AREA", leveling_worker_h: 44, screed_guides_required: false, separate_leveling_equipment_required: true, leveling_equipment_designation: "EQ-LEVEL-LARGE-AREA-REV-A", leveling_equipment_machine_h: 16, surface_measurement_report_count: 4, equipment_mobilization_pricing_mode: "SEPARATE", equipment_mobilization_trip_count: 2, mobilization_scope_reference: "LOG-LEVEL-LARGE-AREA-RETURN-INCLUDED" },
  repair: { leveled_concrete_volume_m3: 4, leveling_surface_area_m2: 24, approved_leveling_method_designation: "PROJECT-MANUAL-SCREED-REPAIR", leveling_worker_h: 10, screed_guides_required: true, screed_guide_designation: "GUIDE-REPAIR-REV-A", screed_guide_length_m: 18, separate_leveling_equipment_required: false, surface_measurement_report_count: 2 },
  small_area: { leveled_concrete_volume_m3: 3, leveling_surface_area_m2: 18, approved_leveling_method_designation: "PROJECT-MANUAL-SCREED-SMALL-AREA", leveling_worker_h: 7, screed_guides_required: false, separate_leveling_equipment_required: false, surface_measurement_report_count: 1 },
  technical_room: { leveled_concrete_volume_m3: 8, leveling_surface_area_m2: 48, approved_leveling_method_designation: "PROJECT-COMPACT-POWER-SCREED-TECHNICAL-ROOM", leveling_worker_h: 14, screed_guides_required: false, separate_leveling_equipment_required: true, leveling_equipment_designation: "EQ-LEVEL-TECHNICAL-ROOM-REV-A", leveling_equipment_machine_h: 4, surface_measurement_report_count: 2, equipment_mobilization_pricing_mode: "INCLUDED_IN_EQUIPMENT_RATE" },
  wet_zone: { leveled_concrete_volume_m3: 15, leveling_surface_area_m2: 95, approved_leveling_method_designation: "PROJECT-SLOPE-SCREED-WET-ZONE", leveling_worker_h: 24, screed_guides_required: true, screed_guide_designation: "SLOPE-GUIDE-WET-ZONE-REV-A", screed_guide_length_m: 58, separate_leveling_equipment_required: true, leveling_equipment_designation: "EQ-LEVEL-WET-ZONE-REV-A", leveling_equipment_machine_h: 6, surface_measurement_report_count: 3, equipment_mobilization_pricing_mode: "SEPARATE", equipment_mobilization_trip_count: 2, mobilization_scope_reference: "LOG-LEVEL-WET-ZONE-RETURN-INCLUDED" },
});

export function concreteSlabLevelingAcceptanceInputR1(
  contextKey: ConcreteSlabLevelingContextKey,
): Readonly<Record<string, ConcreteSlabLevelingInputValueR1>> {
  const target = CONCRETE_SLAB_LEVELING_TARGETS.find(
    (candidate) => candidate.contextKey === contextKey,
  );
  if (!target) throw new Error(`CONCRETE_SLAB_LEVELING_CONTEXT_UNSUPPORTED:${contextKey}`);
  const reference = contextKey.toUpperCase().replace(/_/gu, "-");
  return Object.freeze({
    concrete_mix_reference: `CS-LEVEL-${reference}-MIX-REV-A`,
    leveling_location: `Бетонная плита; ${target.contextRu}; захватка CS-LEVEL-${reference}`,
    target_elevation_and_slope_reference: `ELEV-SLOPE-CS-LEVEL-${reference}-REV-A`,
    flatness_levelness_requirement_reference: `FL-CS-LEVEL-${reference}-REV-A`,
    leveling_method_statement_reference: `MS-CS-LEVEL-${reference}-REV-A`,
    quality_plan_reference: `QP-CS-LEVEL-${reference}-REV-A`,
    ...PROJECT_SCHEDULES[contextKey],
  });
}

export async function compileConcreteSlabLevelingR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? CONCRETE_SLAB_LEVELING_TARGETS[0].catalogId;
  if (!CONCRETE_SLAB_LEVELING_TARGETS.some((target) => target.catalogId === catalogId)) {
    throw new Error(`CONCRETE_SLAB_LEVELING_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.concrete-slab-leveling-r1",
    catalogId,
    primaryMeasureParameterId: "leveled_concrete_volume_m3",
    parameterDefinitions: [...CONCRETE_SLAB_LEVELING_PARAMETERS],
    formulaDefinitions: [...CONCRETE_SLAB_LEVELING_FORMULAS],
    resourceDefinitions: [...CONCRETE_SLAB_LEVELING_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 8,
    hashJson: async (value) => JSON.stringify(value),
  });
}
