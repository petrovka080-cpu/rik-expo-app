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
export type ConcreteSlabVibrationInputValueR1 = string | number | boolean;

export const CONCRETE_SLAB_VIBRATION_SOURCE_ID =
  "src_professional_norm_pack_concrete_aci_309_project_consolidation_schedule_v1";
export const CONCRETE_SLAB_VIBRATION_NORM_ID =
  "concrete_aci_309_project_consolidation_schedule_v1";
export const CONCRETE_SLAB_VIBRATION_SOURCE_PDF_SHA256 =
  "20b986aa1c5905745dc5fceec4ab42921e56dec48952c2bfc8b38161dbb555de";
const PROJECT_SCHEDULE_GUIDE_SHA256 =
  "1b9a2d4164301e64fb781c8918e5ad9d435de8458aaab66c342c644205add1c5";

export const CONCRETE_SLAB_VIBRATION_SOURCE_METADATA = Object.freeze({
  source_id: CONCRETE_SLAB_VIBRATION_SOURCE_ID,
  source_title: "ACI PRC-309-05: Guide for Consolidation of Concrete",
  source_document_version: "ACI 309R-05",
  source_url:
    "https://www.concrete.org/Portals/0/Files/PDF/Previews/30905_2pager.pdf",
  product_url:
    "https://www.concrete.org/store/productdetail.aspx?ItemID=30905&Language=English&Units=US_AND_METRIC",
  exact_locator:
    "Public preview pp. 1-2: abstract and contents; Chapters 4, 5 and 7 cover vibration, internal vibrators and procedure; the method depends on mixture workability and placing conditions.",
  definition_hash: CONCRETE_SLAB_VIBRATION_SOURCE_PDF_SHA256,
  verified_at: "2026-09-18T00:00:00+06:00",
  universal_productivity_claimed: false,
  quantity_basis: "APPROVED_PROJECT_METHOD_STATEMENT_AND_EQUIPMENT_SCHEDULE",
});

export const CONCRETE_SLAB_VIBRATION_TARGETS = Object.freeze([
  { contextKey: "standard", catalogId: "canonical-work:base:concrete_foundation_interior_concrete_slab_vibrate_standard", titleRu: "Вибрирование бетонной плиты в стандартной зоне", contextRu: "стандартная зона" },
  { contextKey: "high_load", catalogId: "canonical-work:base:concrete_foundation_interior_concrete_slab_vibrate_high_load", titleRu: "Вибрирование бетонной плиты для высокой нагрузки", contextRu: "зона высокой нагрузки" },
  { contextKey: "large_area", catalogId: "canonical-work:base:concrete_foundation_interior_concrete_slab_vibrate_large_area", titleRu: "Вибрирование бетонной плиты на большой площади", contextRu: "большая площадь" },
  { contextKey: "repair", catalogId: "canonical-work:base:concrete_foundation_interior_concrete_slab_vibrate_repair", titleRu: "Вибрирование бетонной плиты с локальным ремонтом основания", contextRu: "локальный ремонт основания" },
  { contextKey: "small_area", catalogId: "canonical-work:base:concrete_foundation_interior_concrete_slab_vibrate_small_area", titleRu: "Вибрирование бетонной плиты на малой площади", contextRu: "малая площадь" },
  { contextKey: "technical_room", catalogId: "canonical-work:base:concrete_foundation_interior_concrete_slab_vibrate_technical_room", titleRu: "Вибрирование бетонной плиты в техническом помещении", contextRu: "техническое помещение" },
  { contextKey: "wet_zone", catalogId: "canonical-work:base:concrete_foundation_interior_concrete_slab_vibrate_wet_zone", titleRu: "Вибрирование бетонной плиты во влажной зоне", contextRu: "влажная зона" },
] as const);

/**
 * The 10k catalog also preserves the older `slab_foundation_vibrate_*`
 * identities used by MASTER Appendix B benchmark 2. They describe the same
 * atomic consolidation operation, not construction of the whole slab. Keep
 * them on the same narrow owner instead of the legacy 59-row slab assembly.
 */
export const SLAB_FOUNDATION_VIBRATION_TARGETS = Object.freeze([
  { contextKey: "standard", catalogId: "canonical-work:base:concrete_foundation_interior_slab_foundation_vibrate_standard", titleRu: "Вибрирование плитного фундамента в стандартной зоне", contextRu: "стандартная зона" },
  { contextKey: "high_load", catalogId: "canonical-work:base:concrete_foundation_interior_slab_foundation_vibrate_high_load", titleRu: "Вибрирование плитного фундамента для высокой нагрузки", contextRu: "зона высокой нагрузки" },
  { contextKey: "large_area", catalogId: "canonical-work:base:concrete_foundation_interior_slab_foundation_vibrate_large_area", titleRu: "Вибрирование плитного фундамента на большой площади", contextRu: "большая площадь" },
  { contextKey: "repair", catalogId: "canonical-work:base:concrete_foundation_interior_slab_foundation_vibrate_repair", titleRu: "Вибрирование плитного фундамента с локальным ремонтом основания", contextRu: "локальный ремонт основания" },
  { contextKey: "small_area", catalogId: "canonical-work:base:concrete_foundation_interior_slab_foundation_vibrate_small_area", titleRu: "Вибрирование плитного фундамента на малой площади", contextRu: "малая площадь" },
  { contextKey: "technical_room", catalogId: "canonical-work:base:concrete_foundation_interior_slab_foundation_vibrate_technical_room", titleRu: "Вибрирование плитного фундамента в техническом помещении", contextRu: "техническое помещение" },
  { contextKey: "wet_zone", catalogId: "canonical-work:base:concrete_foundation_interior_slab_foundation_vibrate_wet_zone", titleRu: "Вибрирование плитного фундамента во влажной зоне", contextRu: "влажная зона" },
] as const);

export const ALL_CONCRETE_SLAB_VIBRATION_TARGETS = Object.freeze([
  ...CONCRETE_SLAB_VIBRATION_TARGETS,
  ...SLAB_FOUNDATION_VIBRATION_TARGETS,
]);

export type ConcreteSlabVibrationContextKey =
  (typeof CONCRETE_SLAB_VIBRATION_TARGETS)[number]["contextKey"];

const PARAMETER_SPECS = Object.freeze([
  ["consolidated_concrete_volume_m3", "Объём бетонной смеси, подлежащий виброуплотнению", "decimal", "m3", null],
  ["concrete_mix_reference", "Проектная спецификация бетонной смеси", "text", null, null],
  ["placement_location", "Участок виброуплотнения плиты", "text", null, null],
  ["approved_consolidation_method", "Утверждённый способ уплотнения", "enum", null, ["INTERNAL_VIBRATION"]],
  ["method_statement_reference", "Утверждённая технологическая карта виброуплотнения", "text", null, null],
  ["equipment_schedule_reference", "Ведомость оборудования и машино-времени", "text", null, null],
  ["vibration_worker_h", "Трудозатраты на виброуплотнение", "decimal", "man_hour", null],
  ["internal_vibrator_machine_h", "Работа глубинного вибратора", "decimal", "machine_hour", null],
  ["quality_plan_reference", "План контроля качества виброуплотнения", "text", null, null],
  ["quality_control_document_count", "Комплект записей контроля виброуплотнения", "decimal", "document", null],
  ["equipment_mobilization_pricing_mode", "Учёт доставки и возврата вибратора", "enum", null, ["SEPARATE", "INCLUDED_IN_EQUIPMENT_RATE"]],
  ["equipment_mobilization_trip_count", "Рейсы доставки и возврата вибратора", "decimal", "trip", null],
  ["mobilization_scope_reference", "Маршрут и граница мобилизации вибратора", "text", null, null],
] as const);

export const CONCRETE_SLAB_VIBRATION_NORMATIVE_PARAMETER_IDS = Object.freeze([
  "consolidated_concrete_volume_m3",
  "concrete_mix_reference",
  "placement_location",
  "approved_consolidation_method",
  "method_statement_reference",
] as const);

const NORMATIVE_PARAMETER_IDS = new Set<string>(
  CONCRETE_SLAB_VIBRATION_NORMATIVE_PARAMETER_IDS,
);

export type ConcreteSlabVibrationParameterR1 = CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata: Json;
};

export const CONCRETE_SLAB_VIBRATION_PARAMETERS:
readonly ConcreteSlabVibrationParameterR1[] = Object.freeze(
  PARAMETER_SPECS.map(([parameterId, titleRu, valueType, unitId, enumValues], ordinal) => ({
    parameter_id: parameterId,
    ordinal,
    value_type: valueType,
    unit_id: unitId,
    title_ru: titleRu,
    required: true,
    default_value: null,
    constraints_json: enumValues
      ? { values: enumValues }
      : valueType === "decimal"
        ? { min: parameterId === "consolidated_concrete_volume_m3" ? 0.001 : 0 }
        : valueType === "text"
          ? { minLength: 1, maxLength: 1_000 }
          : {},
    truth_metadata: {
      contract: "rik-expo-app.concrete-slab-vibration-r1",
      semantic_parameter_key: `concrete-slab-vibration:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: "PROJECT_SPECIFIC_INPUT",
      input_origin_class: NORMATIVE_PARAMETER_IDS.has(parameterId)
        ? "ACI_APPLICABILITY_AND_APPROVED_PROJECT_METHOD"
        : "APPROVED_PROJECT_SCHEDULE_OR_SUPPLIER_QUOTE",
      preliminary_compilation_allowed: false,
      source_confirmation_required: true,
      guide: {
        guide_kind: NORMATIVE_PARAMETER_IDS.has(parameterId)
          ? "PRACTICE_REFERENCE"
          : "PROJECT_DEFINED",
        guide_short_ru: `${titleRu}: укажите значение из утверждённой технологической карты, ведомости оборудования или коммерческого предложения.`,
        source_role: NORMATIVE_PARAMETER_IDS.has(parameterId)
          ? "ACI_309_APPLICABILITY_AND_APPROVED_PROJECT_METHOD"
          : "APPROVED_PROJECT_DOCUMENTATION_OR_SUPPLIER_QUOTE",
        source_document: NORMATIVE_PARAMETER_IDS.has(parameterId)
          ? CONCRETE_SLAB_VIBRATION_SOURCE_ID
          : null,
        source_locator: NORMATIVE_PARAMETER_IDS.has(parameterId)
          ? CONCRETE_SLAB_VIBRATION_SOURCE_METADATA.exact_locator
          : null,
        guide_version: "concrete-slab-vibration-r1",
        source_snapshot_hash: NORMATIVE_PARAMETER_IDS.has(parameterId)
          ? CONCRETE_SLAB_VIBRATION_SOURCE_PDF_SHA256
          : PROJECT_SCHEDULE_GUIDE_SHA256,
        applicability:
          "ACI 309 определяет применимость и процедуру уплотнения, но не задаёт универсальную производительность; количества берутся только из проекта.",
        verified_at: CONCRETE_SLAB_VIBRATION_SOURCE_METADATA.verified_at,
        guide_validation_policy:
          "REJECT_MISSING_PROJECT_METHOD_EQUIPMENT_SCHEDULE_OR_NON_INTERNAL_VIBRATION_SCOPE",
      },
      hidden_default_forbidden: true,
      synthetic: false,
    },
  })),
);

export type ConcreteSlabVibrationFormulaR1 = CanonicalEstimateFormulaDefinition & {
  output_unit_id: string;
  expression_source: string;
};

function formula(
  formulaId: string,
  outputUnitId: string,
  expressionSource: string,
): ConcreteSlabVibrationFormulaR1 {
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

export const CONCRETE_SLAB_VIBRATION_FORMULAS:
readonly ConcreteSlabVibrationFormulaR1[] = Object.freeze([
  formula("slab_vibration_scope_volume_v1", "m3", "consolidated_concrete_volume_m3"),
  formula("slab_vibration_labor_v1", "man_hour", "vibration_worker_h"),
  formula("internal_vibrator_machine_time_v1", "machine_hour", "internal_vibrator_machine_h"),
  formula("slab_vibration_quality_documents_v1", "document", "quality_control_document_count"),
  formula("internal_vibrator_mobilization_v1", "trip", "equipment_mobilization_trip_count"),
]);

const literalTrue = Object.freeze({ kind: "literal", value: true });
const and = (...operands: Json[]) => ({ kind: "and", operands });
const equals = (parameterId: string, value: string) => ({ kind: "equals", parameterId, value });
const greaterThan = (parameterId: string, value: number) => ({ kind: "greater_than", parameterId, value });
const present = (parameterId: string) => ({ kind: "present", parameterId });

const ACI_TRACE = Object.freeze({
  sourceId: CONCRETE_SLAB_VIBRATION_SOURCE_ID,
  source_id: CONCRETE_SLAB_VIBRATION_SOURCE_ID,
  normId: CONCRETE_SLAB_VIBRATION_NORM_ID,
  norm_id: CONCRETE_SLAB_VIBRATION_NORM_ID,
  normVersion: CONCRETE_SLAB_VIBRATION_SOURCE_METADATA.source_document_version,
  source_title: CONCRETE_SLAB_VIBRATION_SOURCE_METADATA.source_title,
  source_url: CONCRETE_SLAB_VIBRATION_SOURCE_METADATA.source_url,
  exact_locator: CONCRETE_SLAB_VIBRATION_SOURCE_METADATA.exact_locator,
  source_definition_hash: CONCRETE_SLAB_VIBRATION_SOURCE_METADATA.definition_hash,
  sourceRole: "METHOD_APPLICABILITY_NOT_UNIVERSAL_PRODUCTIVITY",
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
    semanticOwnerId: `concrete-slab-vibration:${input.rowId}`,
    costOwner: "resource",
    inputParameterIds: [...input.consumerParameterIds],
    normativeMethodGuidanceV1: {
      source_id: CONCRETE_SLAB_VIBRATION_SOURCE_ID,
      norm_id: CONCRETE_SLAB_VIBRATION_NORM_ID,
      operation_class: "CONSOLIDATE_FRESH_CONCRETE",
      scope_mode: "PROJECT_SCHEDULE_QUANTITIES",
      universal_productivity_claimed: false,
    },
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: input.sourceRole,
    quantitySourceRole: "APPROVED_PROJECT_METHOD_STATEMENT_AND_EQUIPMENT_SCHEDULE",
    normativeTrace: [ACI_TRACE, {
      sourceId: "project_concrete_slab_vibration_schedule",
      sourceRole: input.sourceRole,
    }],
    excludedUnownedAssumptions: [
      "automatic labor productivity",
      "automatic vibrator productivity",
      "automatic equipment rental duration",
      "hidden mobilization trips",
      "invented consumable materials",
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

export const CONCRETE_SLAB_VIBRATION_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({ rowId: "work:concrete:slab-vibration", ordinal: 0, section: "Работы", category: "construction_work", titleRu: "Виброуплотнение свежеуложенной бетонной смеси плиты", unitId: "man_hour", formulaId: "slab_vibration_labor_v1", inclusionAst: and(present("concrete_mix_reference"), present("placement_location"), present("approved_consolidation_method"), present("method_statement_reference"), present("vibration_worker_h")), procurementEligible: false, sourceRole: "APPROVED_METHOD_STATEMENT_LABOR_SCHEDULE", consumerParameterIds: ["consolidated_concrete_volume_m3", "concrete_mix_reference", "placement_location", "approved_consolidation_method", "method_statement_reference", "vibration_worker_h"] }),
  resource({ rowId: "equipment:concrete:internal-vibrator", ordinal: 1, section: "Оборудование", category: "equipment", titleRu: "Глубинный вибратор по утверждённой ведомости оборудования", unitId: "machine_hour", formulaId: "internal_vibrator_machine_time_v1", inclusionAst: and(present("equipment_schedule_reference"), present("internal_vibrator_machine_h")), procurementEligible: true, sourceRole: "APPROVED_EQUIPMENT_SCHEDULE", consumerParameterIds: ["equipment_schedule_reference", "internal_vibrator_machine_h"] }),
  resource({ rowId: "service:concrete:slab-vibration-quality-control", ordinal: 2, section: "Услуги", category: "service", titleRu: "Контроль и запись выполнения виброуплотнения", unitId: "document", formulaId: "slab_vibration_quality_documents_v1", inclusionAst: and(present("quality_plan_reference"), present("quality_control_document_count")), procurementEligible: true, sourceRole: "APPROVED_PROJECT_QUALITY_PLAN", consumerParameterIds: ["quality_plan_reference", "quality_control_document_count"] }),
  resource({ rowId: "delivery:concrete:internal-vibrator-mobilization", ordinal: 3, section: "Логистика", category: "delivery", titleRu: "Доставка и возврат глубинного вибратора", unitId: "trip", formulaId: "internal_vibrator_mobilization_v1", inclusionAst: and(equals("equipment_mobilization_pricing_mode", "SEPARATE"), greaterThan("equipment_mobilization_trip_count", 0), present("mobilization_scope_reference")), procurementEligible: true, sourceRole: "SUPPLIER_ROUTE_AND_MOBILIZATION_QUOTE", consumerParameterIds: ["equipment_mobilization_pricing_mode", "equipment_mobilization_trip_count", "mobilization_scope_reference"] }),
]);

const PROJECT_SCHEDULES: Readonly<Record<
ConcreteSlabVibrationContextKey,
Readonly<Record<string, ConcreteSlabVibrationInputValueR1>>
>> = Object.freeze({
  standard: { consolidated_concrete_volume_m3: 12, vibration_worker_h: 14, internal_vibrator_machine_h: 4, quality_control_document_count: 1, equipment_mobilization_trip_count: 2 },
  high_load: { consolidated_concrete_volume_m3: 26, vibration_worker_h: 32, internal_vibrator_machine_h: 9, quality_control_document_count: 2, equipment_mobilization_trip_count: 2 },
  large_area: { consolidated_concrete_volume_m3: 54, vibration_worker_h: 62, internal_vibrator_machine_h: 18, quality_control_document_count: 2, equipment_mobilization_trip_count: 2 },
  repair: { consolidated_concrete_volume_m3: 4, vibration_worker_h: 8, internal_vibrator_machine_h: 2, quality_control_document_count: 1, equipment_mobilization_trip_count: 2 },
  small_area: { consolidated_concrete_volume_m3: 3, vibration_worker_h: 6, internal_vibrator_machine_h: 2, quality_control_document_count: 1, equipment_mobilization_trip_count: 0, equipment_mobilization_pricing_mode: "INCLUDED_IN_EQUIPMENT_RATE" },
  technical_room: { consolidated_concrete_volume_m3: 8, vibration_worker_h: 13, internal_vibrator_machine_h: 4, quality_control_document_count: 1, equipment_mobilization_trip_count: 2 },
  wet_zone: { consolidated_concrete_volume_m3: 15, vibration_worker_h: 20, internal_vibrator_machine_h: 6, quality_control_document_count: 2, equipment_mobilization_trip_count: 2 },
});

export function concreteSlabVibrationAcceptanceInputR1(
  contextKey: ConcreteSlabVibrationContextKey,
): Readonly<Record<string, ConcreteSlabVibrationInputValueR1>> {
  const target = CONCRETE_SLAB_VIBRATION_TARGETS.find(
    (candidate) => candidate.contextKey === contextKey,
  );
  if (!target) throw new Error(`CONCRETE_SLAB_VIBRATION_CONTEXT_UNSUPPORTED:${contextKey}`);
  const reference = contextKey.toUpperCase().replace(/_/gu, "-");
  return Object.freeze({
    approved_consolidation_method: "INTERNAL_VIBRATION",
    concrete_mix_reference: `CS-VIB-${reference}-MIX-REV-A`,
    placement_location: `Бетонная плита; ${target.contextRu}; захватка CS-VIB-${reference}`,
    method_statement_reference: `MS-CS-VIB-${reference}-REV-A`,
    equipment_schedule_reference: `EQ-CS-VIB-${reference}-REV-A`,
    quality_plan_reference: `QP-CS-VIB-${reference}-REV-A`,
    equipment_mobilization_pricing_mode: "SEPARATE",
    mobilization_scope_reference: `LOG-CS-VIB-${reference}-RETURN-INCLUDED`,
    ...PROJECT_SCHEDULES[contextKey],
  });
}

export async function compileConcreteSlabVibrationR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? CONCRETE_SLAB_VIBRATION_TARGETS[0].catalogId;
  if (!ALL_CONCRETE_SLAB_VIBRATION_TARGETS.some((target) => target.catalogId === catalogId)) {
    throw new Error(`CONCRETE_SLAB_VIBRATION_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.concrete-slab-vibration-r1",
    catalogId,
    primaryMeasureParameterId: "consolidated_concrete_volume_m3",
    parameterDefinitions: [...CONCRETE_SLAB_VIBRATION_PARAMETERS],
    formulaDefinitions: [...CONCRETE_SLAB_VIBRATION_FORMULAS],
    resourceDefinitions: [...CONCRETE_SLAB_VIBRATION_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 10,
    hashJson: async (value) => JSON.stringify(value),
  });
}
