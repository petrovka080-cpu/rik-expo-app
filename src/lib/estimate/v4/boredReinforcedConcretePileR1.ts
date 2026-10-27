import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
  type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../backendPlatform/canonicalEstimateCompileCore";
import { compileFormulaGraph } from "../backendPlatform/formulaGraph";
import { estimateDeterministicHash } from "../estimateDeterministicHash";

type InputValue = string | number | boolean;
type Json = Record<string, unknown>;

export const BORED_REINFORCED_CONCRETE_PILE_CATALOG_ID =
  "canonical-work:expanded:foundation_pile_field";

export const BORED_PILE_PROJECT_SOURCE_ID =
  "project_bored_pile_schedule_bbs_method_statement_quality_plan_v1";
export const BORED_PILE_PROJECT_NORM_ID =
  "norm:project:bored_pile:schedule_bbs_method_statement_quality_plan:v1";

export const BORED_PILE_PROJECT_SOURCE_METADATA = Object.freeze({
  source_title:
    "Проект свайного поля, ведомость арматурных каркасов, ППР и план контроля качества",
  source_authority:
    "Проектная организация, производственно-технический отдел и служба контроля качества проекта",
  source_document_version: "PROJECT_REVISION_EXPLICIT",
  definition_hash: "eh_bored_pile_project_schedule_r1",
  exact_locator:
    "План свай, спецификация свай и каркасов, технологическая карта бурения и бетонирования, план испытаний",
  use_restriction:
    "Геометрический объём выводится только из явно заданных количества, диаметра и длины свай; арматура, центраторы, машино-часы, испытания и технологические опции принимаются только по проектным документам",
});

type ParameterSpec = Readonly<{
  id: string;
  titleRu: string;
  valueType: "decimal" | "integer" | "enum" | "text";
  unitId: string | null;
  required?: boolean;
  values?: readonly string[];
  minimum?: number;
  requiredWhen?: Json;
  forbiddenWhen?: Json;
  sourceRole?: string;
}>;

const equals = (parameterId: string, value: InputValue): Json => ({
  kind: "equals",
  parameterId,
  value,
});
const literalTrue = Object.freeze({ kind: "literal", value: true });

const temporaryCasingRequired = equals("temporary_casing_mode", "REQUIRED");
const temporaryCasingForbidden = equals("temporary_casing_mode", "NOT_REQUIRED");
const bentoniteRequired = equals("bentonite_slurry_mode", "REQUIRED");
const bentoniteForbidden = equals("bentonite_slurry_mode", "NOT_REQUIRED");
const couplerRequired = equals("rebar_coupler_mode", "REQUIRED");
const couplerForbidden = equals("rebar_coupler_mode", "NOT_REQUIRED");

const PARAMETER_SPECS: readonly ParameterSpec[] = Object.freeze([
  { id: "pile_count", titleRu: "Количество буронабивных свай", valueType: "integer", unitId: "piece", minimum: 1, sourceRole: "PROJECT_PILE_SCHEDULE" },
  { id: "pile_diameter_mm", titleRu: "Проектный диаметр сваи", valueType: "decimal", unitId: "mm", minimum: 0.000_001, sourceRole: "PROJECT_PILE_SCHEDULE" },
  { id: "pile_length_m", titleRu: "Проектная длина сваи", valueType: "decimal", unitId: "m", minimum: 0.000_001, sourceRole: "PROJECT_PILE_SCHEDULE" },
  { id: "concrete_class", titleRu: "Класс бетона", valueType: "text", unitId: null, sourceRole: "PROJECT_PILE_SPECIFICATION" },
  { id: "watertightness", titleRu: "Марка бетона по водонепроницаемости", valueType: "text", unitId: null, sourceRole: "PROJECT_PILE_SPECIFICATION" },
  { id: "frost_resistance", titleRu: "Марка бетона по морозостойкости", valueType: "text", unitId: null, sourceRole: "PROJECT_PILE_SPECIFICATION" },
  { id: "mobility", titleRu: "Подвижность бетонной смеси", valueType: "text", unitId: null, sourceRole: "PROJECT_PILE_SPECIFICATION" },
  { id: "reinforcement_class", titleRu: "Класс арматуры каркаса", valueType: "text", unitId: null, sourceRole: "PROJECT_REINFORCEMENT_SCHEDULE" },
  { id: "reinforcement_quantity_t", titleRu: "Масса арматуры каркасов", valueType: "decimal", unitId: "t", minimum: 0, sourceRole: "PROJECT_REINFORCEMENT_SCHEDULE" },
  { id: "centralizer_specification", titleRu: "Тип центратора арматурного каркаса", valueType: "text", unitId: null, sourceRole: "PROJECT_REINFORCEMENT_SCHEDULE" },
  { id: "centralizer_quantity_piece", titleRu: "Количество центраторов арматурных каркасов", valueType: "decimal", unitId: "piece", minimum: 0, sourceRole: "PROJECT_REINFORCEMENT_SCHEDULE" },
  { id: "drilling_rig_designation", titleRu: "Буровая установка по ППР", valueType: "text", unitId: null, sourceRole: "PROJECT_METHOD_STATEMENT" },
  { id: "drilling_rig_machine_h", titleRu: "Работа буровой установки", valueType: "decimal", unitId: "machine_hour", minimum: 0, sourceRole: "PROJECT_METHOD_STATEMENT" },
  { id: "crane_designation", titleRu: "Кран для монтажа арматурных каркасов по ППР", valueType: "text", unitId: null, sourceRole: "PROJECT_METHOD_STATEMENT" },
  { id: "crane_machine_h", titleRu: "Работа крана для монтажа каркасов", valueType: "decimal", unitId: "machine_hour", minimum: 0, sourceRole: "PROJECT_METHOD_STATEMENT" },
  { id: "integrity_test_method", titleRu: "Метод контроля сплошности свай", valueType: "text", unitId: null, sourceRole: "PROJECT_QUALITY_PLAN" },
  { id: "integrity_test_count", titleRu: "Количество испытаний сплошности свай", valueType: "decimal", unitId: "test", minimum: 0, sourceRole: "PROJECT_QUALITY_PLAN" },
  { id: "drilling_log_count", titleRu: "Количество журналов бурения и бетонирования", valueType: "decimal", unitId: "document", minimum: 0, sourceRole: "PROJECT_QUALITY_PLAN" },
  { id: "temporary_casing_mode", titleRu: "Временная обсадная труба по ППР", valueType: "enum", unitId: null, values: ["NOT_REQUIRED", "REQUIRED"], sourceRole: "PROJECT_METHOD_STATEMENT" },
  { id: "temporary_casing_specification", titleRu: "Тип временной обсадной трубы", valueType: "text", unitId: null, required: false, requiredWhen: temporaryCasingRequired, forbiddenWhen: temporaryCasingForbidden, sourceRole: "PROJECT_METHOD_STATEMENT" },
  { id: "temporary_casing_length_m", titleRu: "Суммарная длина временной обсадной трубы", valueType: "decimal", unitId: "m", minimum: 0, required: false, requiredWhen: temporaryCasingRequired, forbiddenWhen: temporaryCasingForbidden, sourceRole: "PROJECT_METHOD_STATEMENT" },
  { id: "temporary_casing_worker_h", titleRu: "Трудозатраты на установку и извлечение обсадной трубы", valueType: "decimal", unitId: "man_hour", minimum: 0, required: false, requiredWhen: temporaryCasingRequired, forbiddenWhen: temporaryCasingForbidden, sourceRole: "PROJECT_METHOD_STATEMENT" },
  { id: "bentonite_slurry_mode", titleRu: "Бентонитовый раствор по ППР", valueType: "enum", unitId: null, values: ["NOT_REQUIRED", "REQUIRED"], sourceRole: "PROJECT_METHOD_STATEMENT" },
  { id: "bentonite_slurry_specification", titleRu: "Спецификация бентонитового раствора", valueType: "text", unitId: null, required: false, requiredWhen: bentoniteRequired, forbiddenWhen: bentoniteForbidden, sourceRole: "PROJECT_METHOD_STATEMENT" },
  { id: "bentonite_slurry_volume_m3", titleRu: "Объём бентонитового раствора", valueType: "decimal", unitId: "m3", minimum: 0, required: false, requiredWhen: bentoniteRequired, forbiddenWhen: bentoniteForbidden, sourceRole: "PROJECT_METHOD_STATEMENT" },
  { id: "bentonite_service_h", titleRu: "Работа по приготовлению и регенерации бентонитового раствора", valueType: "decimal", unitId: "service_hour", minimum: 0, required: false, requiredWhen: bentoniteRequired, forbiddenWhen: bentoniteForbidden, sourceRole: "PROJECT_METHOD_STATEMENT" },
  { id: "rebar_coupler_mode", titleRu: "Муфтовые соединения арматуры по проекту", valueType: "enum", unitId: null, values: ["NOT_REQUIRED", "REQUIRED"], sourceRole: "PROJECT_REINFORCEMENT_SCHEDULE" },
  { id: "rebar_coupler_specification", titleRu: "Тип арматурной муфты", valueType: "text", unitId: null, required: false, requiredWhen: couplerRequired, forbiddenWhen: couplerForbidden, sourceRole: "PROJECT_REINFORCEMENT_SCHEDULE" },
  { id: "rebar_coupler_quantity_piece", titleRu: "Количество арматурных муфт", valueType: "decimal", unitId: "piece", minimum: 0, required: false, requiredWhen: couplerRequired, forbiddenWhen: couplerForbidden, sourceRole: "PROJECT_REINFORCEMENT_SCHEDULE" },
  { id: "rebar_coupler_worker_h", titleRu: "Трудозатраты на муфтовые соединения арматуры", valueType: "decimal", unitId: "man_hour", minimum: 0, required: false, requiredWhen: couplerRequired, forbiddenWhen: couplerForbidden, sourceRole: "PROJECT_REINFORCEMENT_SCHEDULE" },
]);

export type BoredReinforcedConcretePileParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata: Json;
};

export const BORED_REINFORCED_CONCRETE_PILE_PARAMETERS:
readonly BoredReinforcedConcretePileParameter[] = Object.freeze(PARAMETER_SPECS.map(
  (spec, ordinal) => ({
    parameter_id: spec.id,
    ordinal,
    value_type: spec.valueType,
    unit_id: spec.unitId,
    title_ru: spec.titleRu,
    required: spec.required ?? true,
    default_value: null,
    constraints_json: {
      ...(spec.values ? { values: [...spec.values] } : {}),
      ...(spec.valueType === "decimal" || spec.valueType === "integer"
        ? { min: spec.minimum ?? 0 }
        : {}),
      ...(spec.valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
      ...(spec.requiredWhen ? { requiredWhen: spec.requiredWhen } : {}),
      ...(spec.forbiddenWhen ? { forbiddenWhen: spec.forbiddenWhen } : {}),
    },
    truth_metadata: {
      contract: "rik-expo-app.bored-reinforced-concrete-pile-r1",
      semantic_parameter_key: `bored-reinforced-concrete-pile:${spec.id}`,
      visibility_role: "USER_INPUT",
      value_source_role: "PROJECT_SPECIFIC_INPUT",
      input_origin_class: spec.sourceRole ?? "APPROVED_PROJECT_DOCUMENTATION",
      preliminary_compilation_allowed: true,
      source_confirmation_required: true,
      guide: {
        guide_kind: "PROJECT_DEFINED",
        guide_short_ru: `${spec.titleRu}: укажите подтверждённое проектом, ППР или планом контроля значение.`,
        source_role: spec.sourceRole ?? "APPROVED_PROJECT_DOCUMENTATION",
        source_document: BORED_PILE_PROJECT_SOURCE_ID,
        source_locator: BORED_PILE_PROJECT_SOURCE_METADATA.exact_locator,
        guide_version: "bored-reinforced-concrete-pile-r1",
        source_snapshot_hash: "8f2374f821d66b2d6c9e5b4e2d1dc75161f9f566f56aac867258490ac56a8fc2",
        applicability:
          "Только для заданных буронабивных свай; значения не переносятся на ростверк, ленточный или плитный фундамент.",
        verified_at: "2026-09-19T00:00:00+06:00",
        guide_validation_policy: "REJECT_INVALID_SUPPLIED_VALUE_AND_DEFER_MISSING_PROJECT_VALUE",
      },
      hidden_default_forbidden: true,
      synthetic: false,
    },
  }),
));

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

export type BoredReinforcedConcretePileFormula = CanonicalEstimateFormulaDefinition & {
  output_unit_id: string;
  expression_source: string;
};

export const BORED_REINFORCED_CONCRETE_PILE_FORMULAS:
readonly BoredReinforcedConcretePileFormula[] = Object.freeze([
  formula("pile_count_v1", "piece", "pile_count"),
  formula(
    "theoretical_concrete_volume_v1",
    "m3",
    "pile_count * pile_diameter_mm * pile_diameter_mm / 1000000 * pile_length_m * 0.7853981633974483",
  ),
  formula("reinforcement_quantity_v1", "t", "reinforcement_quantity_t"),
  formula("centralizer_quantity_v1", "piece", "centralizer_quantity_piece"),
  formula("drilling_rig_time_v1", "machine_hour", "drilling_rig_machine_h"),
  formula("crane_time_v1", "machine_hour", "crane_machine_h"),
  formula("integrity_test_count_v1", "test", "integrity_test_count"),
  formula("drilling_log_count_v1", "document", "drilling_log_count"),
  formula("temporary_casing_length_v1", "m", "temporary_casing_length_m"),
  formula("temporary_casing_labor_v1", "man_hour", "temporary_casing_worker_h"),
  formula("bentonite_slurry_volume_v1", "m3", "bentonite_slurry_volume_m3"),
  formula("bentonite_service_time_v1", "service_hour", "bentonite_service_h"),
  formula("rebar_coupler_quantity_v1", "piece", "rebar_coupler_quantity_piece"),
  formula("rebar_coupler_labor_v1", "man_hour", "rebar_coupler_worker_h"),
]);

function resource(input: Readonly<{
  rowId: string;
  ordinal: number;
  section: string;
  category: string;
  titleRu: string;
  unitId: string;
  formulaId: string;
  inclusionAst?: Json;
  procurementEligible: boolean;
  titleParameterIds?: readonly string[];
  sourceRole: string;
}>): CanonicalEstimateResourceDefinition {
  const resourceGraph = {
    formulaId: input.formulaId,
    normalizedUom: input.unitId,
    semanticOwnerId: `bored-reinforced-concrete-pile:${input.rowId}`,
    costOwner: "resource",
    ...(input.titleParameterIds ? {
      titleSpecificationParameterIds: [...input.titleParameterIds],
      titleSpecificationMode: "APPEND",
      titleSpecificationSeparator: " ",
    } : {}),
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: input.sourceRole,
    normativeTrace: [{
      sourceId: BORED_PILE_PROJECT_SOURCE_ID,
      source_id: BORED_PILE_PROJECT_SOURCE_ID,
      normId: BORED_PILE_PROJECT_NORM_ID,
      norm_id: BORED_PILE_PROJECT_NORM_ID,
      normVersion: BORED_PILE_PROJECT_SOURCE_METADATA.source_document_version,
      source_title: BORED_PILE_PROJECT_SOURCE_METADATA.source_title,
      exact_locator: BORED_PILE_PROJECT_SOURCE_METADATA.exact_locator,
      source_definition_hash: BORED_PILE_PROJECT_SOURCE_METADATA.definition_hash,
      sourceRole: input.sourceRole,
    }],
    excludedUnownedAssumptions: [
      "concrete overbreak or waste allowance",
      "reinforcement kilograms per cubic metre",
      "centralizers per reinforcement cage",
      "automatic labor or equipment productivity",
      "automatic integrity test sampling rate",
      "pile cap, strip foundation or foundation slab",
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

export const BORED_REINFORCED_CONCRETE_PILE_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({ rowId: "work:bored-pile:construct", ordinal: 0, section: "Работы", category: "construction_work", titleRu: "Устройство буронабивной железобетонной сваи: бурение, монтаж каркаса и бетонирование", unitId: "piece", formulaId: "pile_count_v1", procurementEligible: false, sourceRole: "PROJECT_PILE_SCHEDULE" }),
  resource({ rowId: "material:bored-pile:ready-mix-concrete", ordinal: 1, section: "Материалы", category: "material", titleRu: "Товарный бетон буронабивной сваи — теоретический геометрический объём без запаса и перебора", unitId: "m3", formulaId: "theoretical_concrete_volume_v1", procurementEligible: true, titleParameterIds: ["concrete_class", "watertightness", "frost_resistance", "mobility"], sourceRole: "GEOMETRIC_DERIVATION_FROM_EXPLICIT_PROJECT_INPUTS" }),
  resource({ rowId: "material:bored-pile:reinforcement-cage", ordinal: 2, section: "Материалы", category: "material", titleRu: "Арматура пространственного каркаса буронабивной сваи", unitId: "t", formulaId: "reinforcement_quantity_v1", procurementEligible: true, titleParameterIds: ["reinforcement_class"], sourceRole: "PROJECT_REINFORCEMENT_SCHEDULE" }),
  resource({ rowId: "material:bored-pile:centralizers", ordinal: 3, section: "Материалы", category: "material", titleRu: "Центраторы арматурного каркаса буронабивной сваи", unitId: "piece", formulaId: "centralizer_quantity_v1", procurementEligible: true, titleParameterIds: ["centralizer_specification"], sourceRole: "PROJECT_REINFORCEMENT_SCHEDULE" }),
  resource({ rowId: "equipment:bored-pile:drilling-rig", ordinal: 4, section: "Техника", category: "equipment", titleRu: "Буровая установка для устройства буронабивных свай", unitId: "machine_hour", formulaId: "drilling_rig_time_v1", procurementEligible: true, titleParameterIds: ["drilling_rig_designation"], sourceRole: "PROJECT_METHOD_STATEMENT" }),
  resource({ rowId: "equipment:bored-pile:crane", ordinal: 5, section: "Техника", category: "equipment", titleRu: "Кран для монтажа арматурных каркасов свай", unitId: "machine_hour", formulaId: "crane_time_v1", procurementEligible: true, titleParameterIds: ["crane_designation"], sourceRole: "PROJECT_METHOD_STATEMENT" }),
  resource({ rowId: "service:bored-pile:integrity-test", ordinal: 6, section: "Контроль качества", category: "service", titleRu: "Контроль сплошности ствола буронабивной сваи", unitId: "test", formulaId: "integrity_test_count_v1", procurementEligible: true, titleParameterIds: ["integrity_test_method"], sourceRole: "PROJECT_QUALITY_PLAN" }),
  resource({ rowId: "service:bored-pile:drilling-log", ordinal: 7, section: "Контроль качества", category: "service", titleRu: "Журнал бурения и бетонирования буронабивной сваи", unitId: "document", formulaId: "drilling_log_count_v1", procurementEligible: true, sourceRole: "PROJECT_QUALITY_PLAN" }),
  resource({ rowId: "material:bored-pile:temporary-casing", ordinal: 8, section: "Условные материалы", category: "material", titleRu: "Временная обсадная труба для скважины", unitId: "m", formulaId: "temporary_casing_length_v1", inclusionAst: temporaryCasingRequired, procurementEligible: true, titleParameterIds: ["temporary_casing_specification"], sourceRole: "PROJECT_METHOD_STATEMENT" }),
  resource({ rowId: "work:bored-pile:temporary-casing", ordinal: 9, section: "Условные работы", category: "construction_work", titleRu: "Установка и извлечение временной обсадной трубы", unitId: "man_hour", formulaId: "temporary_casing_labor_v1", inclusionAst: temporaryCasingRequired, procurementEligible: false, sourceRole: "PROJECT_METHOD_STATEMENT" }),
  resource({ rowId: "material:bored-pile:bentonite-slurry", ordinal: 10, section: "Условные материалы", category: "material", titleRu: "Бентонитовый раствор для крепления стенок скважины", unitId: "m3", formulaId: "bentonite_slurry_volume_v1", inclusionAst: bentoniteRequired, procurementEligible: true, titleParameterIds: ["bentonite_slurry_specification"], sourceRole: "PROJECT_METHOD_STATEMENT" }),
  resource({ rowId: "service:bored-pile:bentonite-system", ordinal: 11, section: "Условные услуги", category: "service", titleRu: "Приготовление, циркуляция и регенерация бентонитового раствора", unitId: "service_hour", formulaId: "bentonite_service_time_v1", inclusionAst: bentoniteRequired, procurementEligible: true, sourceRole: "PROJECT_METHOD_STATEMENT" }),
  resource({ rowId: "material:bored-pile:rebar-couplers", ordinal: 12, section: "Условные материалы", category: "material", titleRu: "Муфты механического соединения арматуры каркаса", unitId: "piece", formulaId: "rebar_coupler_quantity_v1", inclusionAst: couplerRequired, procurementEligible: true, titleParameterIds: ["rebar_coupler_specification"], sourceRole: "PROJECT_REINFORCEMENT_SCHEDULE" }),
  resource({ rowId: "work:bored-pile:rebar-couplers", ordinal: 13, section: "Условные работы", category: "construction_work", titleRu: "Монтаж муфтовых соединений арматурного каркаса", unitId: "man_hour", formulaId: "rebar_coupler_labor_v1", inclusionAst: couplerRequired, procurementEligible: false, sourceRole: "PROJECT_REINFORCEMENT_SCHEDULE" }),
]);

export const BORED_REINFORCED_CONCRETE_PILE_SHORT_INPUT = Object.freeze({
  pile_count: 12,
  pile_diameter_mm: 600,
  pile_length_m: 12,
  concrete_class: "B30",
  watertightness: "W8",
  frost_resistance: "F200",
  mobility: "P4",
  reinforcement_class: "A500C",
});

export const BORED_REINFORCED_CONCRETE_PILE_ACCEPTANCE_INPUT = Object.freeze({
  ...BORED_REINFORCED_CONCRETE_PILE_SHORT_INPUT,
  reinforcement_quantity_t: 11.8,
  centralizer_specification: "Центратор защитного слоя по ведомости каркасов BP-01",
  centralizer_quantity_piece: 96,
  drilling_rig_designation: "Буровая установка BG-28 по ППР BP-MS-01",
  drilling_rig_machine_h: 54,
  crane_designation: "Автокран 25 т по ППР BP-MS-01",
  crane_machine_h: 28,
  integrity_test_method: "Низкодеформационный метод по плану контроля BP-QA-01",
  integrity_test_count: 12,
  drilling_log_count: 12,
  temporary_casing_mode: "NOT_REQUIRED",
  bentonite_slurry_mode: "NOT_REQUIRED",
  rebar_coupler_mode: "NOT_REQUIRED",
});

export async function compileBoredReinforcedConcretePileR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? BORED_REINFORCED_CONCRETE_PILE_CATALOG_ID;
  if (catalogId !== BORED_REINFORCED_CONCRETE_PILE_CATALOG_ID) {
    throw new Error(`BORED_REINFORCED_CONCRETE_PILE_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.bored-reinforced-concrete-pile-r1",
    catalogId,
    primaryMeasureParameterId: "pile_count",
    parameterDefinitions: [...BORED_REINFORCED_CONCRETE_PILE_PARAMETERS],
    formulaDefinitions: [...BORED_REINFORCED_CONCRETE_PILE_FORMULAS],
    resourceDefinitions: [...BORED_REINFORCED_CONCRETE_PILE_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 20,
    hashJson: async (value) => JSON.stringify(value),
  });
}

export const BORED_REINFORCED_CONCRETE_PILE_ACCEPTANCE = Object.freeze({
  contract: "rik-expo-app.bored-reinforced-concrete-pile-r1",
  theoreticalConcreteFormula:
    "pile_count * pile_diameter_mm * pile_diameter_mm / 1000000 * pile_length_m * 0.7853981633974483",
  automaticConcreteOverbreakRejected: true,
  automaticReinforcementKgPerM3Rejected: true,
  automaticCentralizersPerCageRejected: true,
  automaticLaborProductivityRejected: true,
  automaticEquipmentProductivityRejected: true,
  automaticIntegrityTestSamplingRejected: true,
  excludedAdjacentScope: ["pile cap", "strip foundation", "foundation slab"],
});
