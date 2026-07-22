import { estimateDeterministicHash } from "../../estimateDeterministicHash";
import { validateCategoryUnitV4 } from "../categoryUnitContractV4";
import { validateFormulaDimensionsV4 } from "../formulaDimensionValidatorV4";
import type {
  BoqCategoryV4,
  BoqLineDefinitionV4,
  CommercialLineV4,
  FormulaDefinitionV4,
  OperationV4,
  ProcurementLineV4,
  ProfessionalEstimatePassportV4,
  ResourceRequirementV4,
  UserFactV4,
} from "../professionalEstimateV4Contract";
import { validateProfessionalEstimatePassportV4 } from "../validateProfessionalEstimateV4";
import { composeAsphaltClarificationExperienceV4 } from "./asphaltClarificationExperienceV4";
import {
  buildAsphaltPreliminaryAssemblyPolicyV4,
  type AsphaltDeclaredAssumptionV4,
  type AsphaltPreliminaryAssemblyPolicyV4,
} from "./asphaltPreliminaryAssemblyPolicyV4";
import {
  ASPHALT_PROFESSIONAL_PASSPORT_BASE_V4,
} from "./asphaltProfessionalPassportV4";
import { ASPHALT_WORK_SPECIFIC_PARAMETER_SCHEMA_V4 } from "./asphaltWorkSpecificParameterSchemaV4";
import {
  ASPHALT_PASSPORT_VERSION_V4,
  ASPHALT_PROFESSIONAL_NAME_RU_V4,
  ASPHALT_WORK_ID_V4,
  asphaltParameterIdV4,
} from "./asphaltV4Constants";
import {
  extractAsphaltUserFactsV4,
  type AsphaltLayerFactV4,
} from "./extractAsphaltUserFactsV4";

export type AsphaltCrushedLayerInputV4 = {
  position: number;
  fraction: string | null;
  thickness_mm: number | null;
  compaction_factor: number | null;
  waste_percent: number | null;
};

export type AsphaltCompiledBoqLineV4 = {
  definition: BoqLineDefinitionV4;
  quantity: number;
  formula_input_values: Record<string, number>;
  included_in_procurement: boolean;
  assumption_ids: string[];
};

export type AsphaltQuantityBasisV4 = {
  basis_type: "project" | "reference";
  length_m: number | null;
  width_m: number | null;
  area_m2: number;
  source: "raw_input" | "revision" | "confirmed_parameter" | "reference_policy";
  formula_trace: string;
  assumption_ids: string[];
};

export type AsphaltPriceCoverageV4 = {
  total_rows: number;
  priced_rows: 0;
  missing_price_rows: number;
  coverage_ratio: 0;
  total_amount: null;
  display_total_ru: "Итог не рассчитан: цены не заполнены";
};

export type AsphaltProfessionalEstimateCompilationV4 = {
  passport: ProfessionalEstimatePassportV4;
  compiled_rows: AsphaltCompiledBoqLineV4[];
  extracted_facts: UserFactV4[];
  clarification: ReturnType<typeof composeAsphaltClarificationExperienceV4>;
  price_coverage: AsphaltPriceCoverageV4;
  expert_questions_ru: string[];
  compile_blockers: string[];
  formula_dimension_blockers: string[];
  category_unit_blockers: string[];
  source_trace_complete: boolean;
  preliminary_assembly_policy: AsphaltPreliminaryAssemblyPolicyV4;
  quantity_basis: AsphaltQuantityBasisV4;
};

export type CompileAsphaltProfessionalEstimateV4Input = {
  raw_text: string;
  parameter_overrides?: Readonly<Record<string, unknown>>;
  facts?: readonly UserFactV4[];
};

type LayerInput = AsphaltLayerFactV4 & { mixture_type: string | null };

type AddLineInput = {
  row_id: string;
  wbs_code: string;
  section: string;
  phase: string;
  category: BoqCategoryV4;
  name_ru: string;
  action: string;
  action_object: string;
  specification_ru: string;
  unit_id: string;
  formula_id: string;
  expression: string;
  input_units: Record<string, string>;
  input_values: Record<string, number>;
  quantity: number;
  applicability: string;
  inclusion_reason_ru: string;
  exclusion_rule: string;
  source_ids: string[];
  price_key?: string | null;
  procurement?: boolean;
  waste_coefficient?: number | null;
  consumption_norm?: number | null;
  productivity?: number | null;
};

const EXPERT_QUESTIONS: Record<string, string> = {
  area: "Подтвердите расчётную площадь покрытия или геометрию с исключениями.",
  asphalt_layers: "Подтвердите для каждого асфальтобетонного слоя тип смеси, толщину, плотность по паспорту и технологический запас.",
  crushed_layers: "Подтвердите состав щебёночных слоёв, фракции, толщины и коэффициенты поставки.",
  sand: "Подтвердите толщину песчаного слоя, коэффициент к уплотнённому объёму и технологический запас.",
  milling: "Подтвердите глубину фрезерования и производительность выбранной фрезы.",
  machinery: "Предоставьте производительности машин по ППР, КРЕР или техническим картам для условий участка.",
  labor: "Подтвердите состав звена и производительность дорожных рабочих по применимой норме или ППР.",
  laboratory: "Укажите утверждённую программу контроля и частоту проб/испытаний.",
  emulsion: "Укажите норму розлива и её единицу по проекту или технической карте выбранной эмульсии.",
  drainage: "Предоставьте тип, длину и спецификацию элементов водоотвода.",
  project: "Загрузите проект, ведомость объёмов или спецификацию для подтверждения конструкции дорожной одежды.",
};

function unwrapOverride(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const record = value as Record<string, unknown>;
  if (!("value" in record)) return value;
  return record.source === "derived" ? undefined : record.value;
}

function numericValue(value: unknown): number | null {
  const raw = unwrapOverride(value);
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim()) {
    const parsed = Number(raw.replace(/\s+/g, "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function stringValue(value: unknown): string | null {
  const raw = unwrapOverride(value);
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

function booleanValue(value: unknown): boolean | null {
  const raw = unwrapOverride(value);
  if (typeof raw === "boolean") return raw;
  if (typeof raw !== "string") return null;
  if (/^(?:true|yes|да)$/iu.test(raw.trim())) return true;
  if (/^(?:false|no|нет)$/iu.test(raw.trim())) return false;
  return null;
}

function positive(value: number | null): value is number {
  return value != null && Number.isFinite(value) && value > 0;
}

function nonNegative(value: number | null): value is number {
  return value != null && Number.isFinite(value) && value >= 0;
}

function round(value: number, precision = 6): number {
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function layerRoleRu(position: number, count: number): string {
  if (count <= 1) return "единственного слоя";
  if (position === 1) return "нижнего слоя";
  if (position === count) return "верхнего слоя";
  return `промежуточного слоя ${position}`;
}

function choiceLabel(key: string, value: string | null): string | null {
  const parameter = ASPHALT_WORK_SPECIFIC_PARAMETER_SCHEMA_V4.parameters.find((item) => item.canonical_key === key);
  return value ? parameter?.choices.find((item) => item.value === value)?.label_ru ?? value : null;
}

type MergedAsphaltFacts = {
  values: Map<string, unknown>;
  raw_input_keys: Set<string>;
  confirmed_parameter_keys: Set<string>;
  persisted_assumption_keys: Set<string>;
};

function meaningfulValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  return true;
}

function overrideSource(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = (value as Record<string, unknown>).source;
  return typeof source === "string" ? source : null;
}

function mergeFacts(input: CompileAsphaltProfessionalEstimateV4Input): MergedAsphaltFacts {
  const values = new Map<string, unknown>();
  const rawInputKeys = new Set<string>();
  const confirmedParameterKeys = new Set<string>();
  const persistedAssumptionKeys = new Set<string>();
  const collect = (item: UserFactV4, source: "raw" | "saved") => {
    const prefix = `${ASPHALT_WORK_ID_V4}:parameter:`;
    if (!item.parameter_id?.startsWith(prefix) || !item.parameter_id.endsWith(":v4") || !meaningfulValue(item.value)) return;
    const key = item.parameter_id.slice(prefix.length, -3);
    values.set(key, item.value);
    if (source === "raw") rawInputKeys.add(key);
  };
  for (const item of input.facts ?? []) collect(item, "saved");
  for (const [key, raw] of Object.entries(input.parameter_overrides ?? {})) {
    const source = overrideSource(raw);
    if (source === "edited_by_user") continue;
    const value = unwrapOverride(raw);
    if (!meaningfulValue(value)) continue;
    values.set(key, value);
    if (source === "default_assumption") persistedAssumptionKeys.add(key);
    if (source === "user_input") confirmedParameterKeys.add(key);
  }
  for (const item of extractAsphaltUserFactsV4(input.raw_text).facts) collect(item, "raw");
  for (const [key, raw] of Object.entries(input.parameter_overrides ?? {})) {
    const source = overrideSource(raw);
    if (source !== "edited_by_user") continue;
    const value = unwrapOverride(raw);
    if (!meaningfulValue(value)) continue;
    values.set(key, value);
    confirmedParameterKeys.add(key);
    persistedAssumptionKeys.delete(key);
  }
  return {
    values,
    raw_input_keys: rawInputKeys,
    confirmed_parameter_keys: confirmedParameterKeys,
    persisted_assumption_keys: persistedAssumptionKeys,
  };
}

function normalizeAsphaltLayers(values: ReadonlyMap<string, unknown>): LayerInput[] {
  const group = values.get("asphalt_layers");
  const existing = Array.isArray(group)
    ? group.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object" && !Array.isArray(item)))
    : [];
  const count = Math.min(4, Math.max(0, Math.round(numericValue(values.get("asphalt_layer_count")) ?? existing.length)));
  return Array.from({ length: count }, (_, index) => {
    const position = index + 1;
    const item = existing[index] ?? {};
    return {
      position,
      mixture_type: stringValue(values.get(`asphalt_layer_${position}_mixture_type`)) ?? stringValue(item.mixture_type),
      thickness_mm: numericValue(values.get(`asphalt_layer_${position}_thickness_mm`)) ?? numericValue(item.thickness_mm),
      density_t_m3: numericValue(values.get(`asphalt_layer_${position}_density_t_m3`)) ?? numericValue(item.density_t_m3),
      waste_percent: numericValue(values.get(`asphalt_layer_${position}_waste_percent`)) ?? numericValue(item.waste_percent),
    };
  });
}

function normalizeCrushedLayers(values: ReadonlyMap<string, unknown>): AsphaltCrushedLayerInputV4[] {
  const group = values.get("crushed_layers");
  const existing = Array.isArray(group)
    ? group.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object" && !Array.isArray(item)))
    : [];
  const explicitCount = numericValue(values.get("crushed_layer_count"));
  const count = Math.min(6, Math.max(0, Math.round(explicitCount ?? existing.length)));
  return Array.from({ length: count }, (_, index) => {
    const position = index + 1;
    const item = existing[index] ?? {};
    return {
      position,
      fraction: stringValue(values.get(`crushed_layer_${position}_fraction`)) ?? stringValue(item.fraction),
      thickness_mm: numericValue(values.get(`crushed_layer_${position}_thickness_mm`)) ?? numericValue(item.thickness_mm),
      compaction_factor: numericValue(values.get(`crushed_layer_${position}_compaction_factor`)) ?? numericValue(item.compaction_factor),
      waste_percent: numericValue(values.get(`crushed_layer_${position}_waste_percent`)) ?? numericValue(item.waste_percent),
    };
  });
}

function buildFactSet(
  values: ReadonlyMap<string, unknown>,
  assumptionsByKey: ReadonlyMap<string, AsphaltDeclaredAssumptionV4>,
  derivedKeys: ReadonlySet<string>,
): UserFactV4[] {
  const direct = [...values.entries()].flatMap(([key, value]) => {
    const parameter = ASPHALT_WORK_SPECIFIC_PARAMETER_SCHEMA_V4.parameters.find((item) => item.canonical_key === key);
    if (!parameter) return [];
    const assumption = assumptionsByKey.get(key);
    return [{
      fact_id: `asphalt:compiled:${key}:v4`,
      parameter_id: asphaltParameterIdV4(key),
      value,
      unit_id: parameter.canonical_unit_id,
      provenance: assumption ? "work_specific_default" as const : derivedKeys.has(key) ? "ai_inference" as const : "form_input" as const,
      confirmed: !assumption,
      source_reference: assumption?.source_id ?? (derivedKeys.has(key) ? "derived_quantity_basis" : "compiled_parameter_set"),
      confidence: assumption || derivedKeys.has(key) ? "medium" as const : "high" as const,
    }];
  });
  const structured: UserFactV4[] = [];
  const asphaltLayers = normalizeAsphaltLayers(values);
  if (asphaltLayers.length > 0) {
    structured.push({
      fact_id: "asphalt:compiled:asphalt_layers:v4",
      parameter_id: asphaltParameterIdV4("asphalt_layers"),
      value: asphaltLayers,
      unit_id: null,
      provenance: asphaltLayers.some((layer) => ["mixture_type", "thickness_mm", "density_t_m3", "waste_percent"].some((field) => assumptionsByKey.has(`asphalt_layer_${layer.position}_${field}`))) ? "work_specific_default" : "form_input",
      confirmed: !asphaltLayers.some((layer) => ["mixture_type", "thickness_mm", "density_t_m3", "waste_percent"].some((field) => assumptionsByKey.has(`asphalt_layer_${layer.position}_${field}`))),
      source_reference: "compiled_asphalt_layers",
      confidence: "medium",
    });
  }
  const crushedLayers = normalizeCrushedLayers(values);
  if (crushedLayers.length > 0) {
    structured.push({
      fact_id: "asphalt:compiled:crushed_layers:v4",
      parameter_id: asphaltParameterIdV4("crushed_layers"),
      value: crushedLayers,
      unit_id: null,
      provenance: crushedLayers.some((layer) => ["fraction", "thickness_mm", "compaction_factor", "waste_percent"].some((field) => assumptionsByKey.has(`crushed_layer_${layer.position}_${field}`))) ? "work_specific_default" : "form_input",
      confirmed: !crushedLayers.some((layer) => ["fraction", "thickness_mm", "compaction_factor", "waste_percent"].some((field) => assumptionsByKey.has(`crushed_layer_${layer.position}_${field}`))),
      source_reference: "compiled_crushed_layers",
      confidence: "medium",
    });
  }
  return [...direct.filter((fact) =>
    fact.parameter_id !== asphaltParameterIdV4("asphalt_layers") &&
    fact.parameter_id !== asphaltParameterIdV4("crushed_layers")
  ), ...structured];
}

function areaFormula(values: ReadonlyMap<string, unknown>): {
  value: number | null;
  expression: string;
  input_units: Record<string, string>;
  input_values: Record<string, number>;
  trace_ru: string;
} {
  const geometryMethod = stringValue(values.get("geometry_method"));
  const direct = numericValue(values.get("area_m2"));
  if (geometryMethod !== "length_width" && positive(direct)) return {
    value: direct,
    expression: "area_m2",
    input_units: { area_m2: "m2" },
    input_values: { area_m2: direct },
    trace_ru: `Площадь принята из подтверждённого значения: ${direct} м².`,
  };
  const length = numericValue(values.get("length_m"));
  const width = numericValue(values.get("width_m"));
  const exclusions = numericValue(values.get("exclusions_m2"));
  if (positive(length) && positive(width) && nonNegative(exclusions) && length * width > exclusions) return {
    value: length * width - exclusions,
    expression: "length_m * width_m - exclusions_m2",
    input_units: { length_m: "m", width_m: "m", exclusions_m2: "m2" },
    input_values: { length_m: length, width_m: width, exclusions_m2: exclusions },
    trace_ru: `Площадь: ${length} м × ${width} м − ${exclusions} м² исключений.`,
  };
  return { value: null, expression: "", input_units: {}, input_values: {}, trace_ru: "Площадь не подтверждена." };
}

function lineTypeTitle(category: BoqCategoryV4): string {
  if (category === "work") return "Работы";
  if (category === "material") return "Материалы";
  if (category === "labor") return "Труд";
  if (category === "machinery") return "Машины";
  if (category === "transport") return "Транспорт";
  if (category === "testing") return "Испытания";
  if (category === "documentation") return "Документация";
  return "Услуги";
}

function buildPassport(input: {
  formulas: FormulaDefinitionV4[];
  rows: BoqLineDefinitionV4[];
  operations: OperationV4[];
  resources: ResourceRequirementV4[];
  procurement: ProcurementLineV4[];
  commercial: CommercialLineV4[];
  unresolved: string[];
  assumptions: string[];
}): ProfessionalEstimatePassportV4 {
  const semanticSignature = estimateDeterministicHash({
    work_id: ASPHALT_WORK_ID_V4,
    parameter_ids: ASPHALT_WORK_SPECIFIC_PARAMETER_SCHEMA_V4.parameters.map((item) => item.parameter_id),
    row_ids: input.rows.map((item) => item.row_id),
    formula_ids: input.formulas.map((item) => item.formula_id),
  });
  const withoutHash = {
    schema_version: "ProfessionalEstimatePassportV4" as const,
    ...ASPHALT_PROFESSIONAL_PASSPORT_BASE_V4,
    operations: input.operations,
    resources: input.resources,
    formulas: input.formulas,
    boq_rows: input.rows,
    price_observations: [],
    commercial_lines: input.commercial,
    procurement_lines: input.procurement,
    assumptions_ru: [
      ...ASPHALT_PROFESSIONAL_PASSPORT_BASE_V4.assumptions_ru,
      ...input.assumptions,
    ],
    confidence: input.unresolved.length === 0 ? "high" as const : "medium" as const,
    status: "NATIVE_V4_WORK_SPECIFIC" as const,
    inheritance: {
      source_contract: "ProfessionalEstimatePassportV4" as const,
      family_passport_id: "road_construction:v4:family",
      work_specific_overlay_id: `${ASPHALT_WORK_ID_V4}:overlay:v4`,
      adapter_version: null,
    },
    unresolved_requirements: input.unresolved,
    semantic_signature: semanticSignature,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

export function compileAsphaltProfessionalEstimateV4(
  input: CompileAsphaltProfessionalEstimateV4Input,
): AsphaltProfessionalEstimateCompilationV4 {
  const mergedFacts = mergeFacts(input);
  const values = mergedFacts.values;
  const assemblyPolicy = buildAsphaltPreliminaryAssemblyPolicyV4({
    raw_text: input.raw_text,
    existing_values: values,
    persisted_assumption_keys: mergedFacts.persisted_assumption_keys,
  });
  const assumptionsByKey = new Map(assemblyPolicy.assumptions.map((assumption) => [assumption.canonical_key, assumption]));
  for (const assumption of assemblyPolicy.assumptions) values.set(assumption.canonical_key, assumption.value);
  const initialArea = areaFormula(values);
  const derivedKeys = new Set<string>();
  if (positive(initialArea.value) && !positive(numericValue(values.get("area_m2")))) {
    values.set("area_m2", initialArea.value);
    derivedKeys.add("area_m2");
  }
  const area = areaFormula(values);
  if (!positive(area.value)) throw new Error("ASPHALT_V4_QUANTITY_BASIS_MISSING");
  const quantityBasisAssumptions = assemblyPolicy.assumptions
    .filter((assumption) => ["area_m2", "exclusions_m2"].includes(assumption.canonical_key))
    .map((assumption) => assumption.source_id);
  const referenceBasis = assumptionsByKey.has("area_m2");
  const quantityBasis: AsphaltQuantityBasisV4 = {
    basis_type: referenceBasis ? "reference" : "project",
    length_m: numericValue(values.get("length_m")),
    width_m: numericValue(values.get("width_m")),
    area_m2: area.value,
    source: referenceBasis
      ? "reference_policy"
      : mergedFacts.confirmed_parameter_keys.has("area_m2") || mergedFacts.confirmed_parameter_keys.has("length_m")
        ? "confirmed_parameter"
        : mergedFacts.raw_input_keys.has("area_m2") || mergedFacts.raw_input_keys.has("length_m")
          ? "raw_input"
          : "revision",
    formula_trace: area.expression,
    assumption_ids: quantityBasisAssumptions,
  };
  const facts = buildFactSet(values, assumptionsByKey, derivedKeys);
  const asphaltLayers = normalizeAsphaltLayers(values);
  const crushedLayers = normalizeCrushedLayers(values);
  const formulas: FormulaDefinitionV4[] = [];
  const definitions: BoqLineDefinitionV4[] = [];
  const compiledRows: AsphaltCompiledBoqLineV4[] = [];
  const operations: OperationV4[] = [];
  const resources: ResourceRequirementV4[] = [];
  const procurement: ProcurementLineV4[] = [];
  const commercial: CommercialLineV4[] = [];
  const unresolved = new Set<string>();
  const expertQuestions = new Set<string>();
  const formulaBlockers: string[] = [];
  const categoryBlockers: string[] = [];

  const requireExpert = (key: keyof typeof EXPERT_QUESTIONS, requirement: string) => {
    unresolved.add(requirement);
    expertQuestions.add(EXPERT_QUESTIONS[key]);
  };

  const addFormula = (formulaId: string, expression: string, inputUnits: Record<string, string>, outputUnitId: string, sourceIds: string[], traceRu: string): FormulaDefinitionV4 => {
    const dimensional = validateFormulaDimensionsV4({ expression, input_unit_ids: inputUnits, output_unit_id: outputUnitId });
    formulaBlockers.push(...dimensional.blockers.map((blocker) => `${formulaId}:${blocker}`));
    const formula: FormulaDefinitionV4 = {
      formula_id: formulaId,
      expression,
      input_parameter_ids: Object.keys(inputUnits),
      input_unit_ids: inputUnits,
      output_unit_id: outputUnitId,
      rounding_rule: "round_half_up_to_unit_precision",
      waste_rule: expression.includes("waste_percent") ? "explicit_confirmed_percentage_only" : "none",
      applicability: "formula_is_emitted_only_when_all_inputs_and_inclusion_rule_are_satisfied",
      source_ids: sourceIds,
      dimensional_status: dimensional.ok ? "valid" : "blocked",
      dimensional_blockers: dimensional.blockers,
      explanation_trace_ru: traceRu,
    };
    formulas.push(formula);
    return formula;
  };

  if (positive(area.value)) {
    addFormula("asphalt_area", area.expression, area.input_units, "m2", ["kg_krer_2015_collection_27"], area.trace_ru);
  } else {
    requireExpert("area", "MISSING_CONFIRMED_AREA");
  }

  const addLine = (row: AddLineInput): void => {
    if (!Number.isFinite(row.quantity) || row.quantity < 0) {
      unresolved.add(`INVALID_QUANTITY:${row.row_id}`);
      return;
    }
    const assumptionIds = assemblyPolicy.assumptions
      .filter((assumption) => Object.hasOwn(row.input_values, assumption.canonical_key) || assumption.affected_row_ids.includes(row.row_id))
      .map((assumption) => assumption.source_id);
    const sourceIds = [...new Set([...row.source_ids, ...assumptionIds])];
    const formula = addFormula(row.formula_id, row.expression, row.input_units, row.unit_id, sourceIds, `${row.inclusion_reason_ru} Формула: ${row.expression}. Результат: ${round(row.quantity)} ${row.unit_id}.`);
    const category = validateCategoryUnitV4({ category: row.category, unit_id: row.unit_id, professional_name_ru: row.name_ru });
    categoryBlockers.push(...category.blockers.map((blocker) => `${row.row_id}:${blocker}`));
    const definition: BoqLineDefinitionV4 = {
      row_id: row.row_id,
      wbs_code: row.wbs_code,
      parent_wbs_code: null,
      section: row.section || lineTypeTitle(row.category),
      phase: row.phase,
      category: row.category,
      professional_name_ru: row.name_ru,
      action: row.action,
      action_object: row.action_object,
      technical_specification_ru: row.specification_ru,
      unit_id: row.unit_id,
      formula_id: formula.formula_id,
      formula_inputs: formula.input_parameter_ids,
      applicability: row.applicability,
      inclusion_reason_ru: row.inclusion_reason_ru,
      exclusion_rule: row.exclusion_rule,
      waste_coefficient: row.waste_coefficient ?? null,
      consumption_norm: row.consumption_norm ?? null,
      productivity: row.productivity ?? null,
      labor_hours: row.category === "labor" ? round(row.quantity) : null,
      machine_hours: row.category === "machinery" ? round(row.quantity) : null,
      source_id: sourceIds[0] ?? null,
      price_key: row.price_key ?? null,
      shared_scope_key: null,
      alternative_group: null,
      price_status: "PRICE_MISSING",
      confidence: "high",
      explanation_trace_ru: formula.explanation_trace_ru,
    };
    definitions.push(definition);
    compiledRows.push({ definition, quantity: round(row.quantity), formula_input_values: row.input_values, included_in_procurement: row.procurement === true, assumption_ids: assumptionIds });
    if (row.category === "work") {
      operations.push({
        operation_id: `operation:${row.row_id}`,
        wbs_code: row.wbs_code,
        professional_name_ru: row.name_ru,
        action: row.action,
        action_object: row.action_object,
        technical_specification_ru: row.specification_ru,
        output_unit_id: row.unit_id,
        formula_id: row.formula_id,
        applicability: row.applicability,
        quality_control_ru: ["Приёмка по проекту, ППР и применимой программе контроля."],
        safety_requirements_ru: ["Организация безопасной зоны дорожных работ подтверждается до начала производства."],
        source_ids: sourceIds,
      });
    } else {
      resources.push({
        resource_id: `resource:${row.row_id}`,
        category: row.category,
        professional_name_ru: row.name_ru,
        technical_specification_ru: row.specification_ru,
        unit_id: row.unit_id,
        formula_id: row.formula_id,
        applicability: row.applicability,
        inclusion_reason_ru: row.inclusion_reason_ru,
        exclusion_rule: row.exclusion_rule,
        price_key: row.price_key ?? null,
        shared_scope_key: null,
        alternative_group: null,
        confidence: "high",
        source_ids: sourceIds,
      });
    }
    commercial.push({
      commercial_line_id: `commercial:${row.row_id}`,
      source_row_ids: [row.row_id],
      title_ru: row.name_ru,
      quantity: round(row.quantity),
      unit_id: row.unit_id,
      price_observation_ids: [],
    });
    if (row.procurement) {
      procurement.push({
        procurement_line_id: `procurement:${row.row_id}`,
        resource_id: `resource:${row.row_id}`,
        specification_ru: row.specification_ru,
        quantity: round(row.quantity),
        unit_id: row.unit_id,
        equivalence_group: row.price_key ?? null,
        supplier_constraints_ru: ["Эквивалентность подтверждается по технической спецификации и проекту; бренд не предписывается."],
      });
    }
  };

  const areaExpression = area.expression === "area_m2" ? area.expression : `(${area.expression})`;
  const areaUnits = area.input_units;
  const areaValues = area.input_values;
  const withArea = (extraUnits: Record<string, string>, extraValues: Record<string, number>) => ({
    units: { ...areaUnits, ...extraUnits },
    values: { ...areaValues, ...extraValues },
  });

  if (positive(area.value)) {
    addLine({ row_id: "initial_data_analysis", wbs_code: "01", section: "Услуги", phase: "preparation", category: "subcontract_service", name_ru: "Анализ исходных данных для устройства дорожного покрытия", action: "проанализировать", action_object: "исходные данные объекта", specification_ru: "Проверка задания, геометрии, доступных проектных материалов и ограничений до выезда; результат подлежит инженерной верификации.", unit_id: "service", formula_id: "initial_data_analysis_service", expression: "initial_data_analysis_service_count", input_units: { initial_data_analysis_service_count: "service" }, input_values: { initial_data_analysis_service_count: 1 }, quantity: 1, applicability: "pavement_assembly_selected", inclusion_reason_ru: "Профессиональная предварительная сборка требует анализа исходных данных объекта.", exclusion_rule: "Заменить подтверждённым объёмом инженерного задания.", source_ids: ["kg_mtd_road_quality_control"] });
    addLine({ row_id: "field_site_survey", wbs_code: "01", section: "Услуги", phase: "preparation", category: "subcontract_service", name_ru: "Выездное обследование участка дорожных работ", action: "обследовать", action_object: "участок дорожных работ", specification_ru: "Визуальное обследование основания, подъездов, ограничений и условий производства работ с фиксацией результатов.", unit_id: "service", formula_id: "field_site_survey_service", expression: "field_survey_service_count", input_units: { field_survey_service_count: "service" }, input_values: { field_survey_service_count: 1 }, quantity: 1, applicability: "pavement_assembly_selected", inclusion_reason_ru: "До подтверждения рабочей сметы требуется обследование фактических условий участка.", exclusion_rule: "Заменить актом обследования и фактическим объёмом услуги.", source_ids: ["kg_mtd_road_quality_control"] });
    addLine({ row_id: "base_acceptance", wbs_code: "01", section: "Работы", phase: "preparation", category: "work", name_ru: "Приёмка подготовленного основания под асфальтобетонное покрытие", action: "принять", action_object: "подготовленное основание", specification_ru: "Проверка отметок, уклонов, ровности, плотности и готовности основания до начала розлива эмульсии.", unit_id: "m2", formula_id: "base_acceptance_area", expression: areaExpression, input_units: areaUnits, input_values: areaValues, quantity: area.value, applicability: "pavement_assembly_selected", inclusion_reason_ru: "Площадь покрытия определена; приёмка основания относится ко всей площади.", exclusion_rule: "Не включать без расчётной площади.", source_ids: ["kg_mtd_road_quality_control"] });
    addLine({ row_id: "mechanized_surface_cleaning", wbs_code: "01", section: "Работы", phase: "preparation", category: "work", name_ru: "Механизированная очистка подготовленного основания", action: "очистить", action_object: "поверхность основания", specification_ru: "Удаление пыли и загрязнений механизированным способом перед подгрунтовкой.", unit_id: "m2", formula_id: "mechanized_surface_cleaning_area", expression: areaExpression, input_units: areaUnits, input_values: areaValues, quantity: area.value, applicability: "pavement_assembly_selected", inclusion_reason_ru: "Очистка выполняется по всей принятой площади основания.", exclusion_rule: "Не включать без расчётной площади.", source_ids: ["kg_krer_2015_collection_27"] });
    addLine({ row_id: "geodetic_layout", wbs_code: "01", section: "Услуги", phase: "preparation", category: "subcontract_service", name_ru: "Геодезическая разбивка дорожного покрытия", action: "выполнить", action_object: "геодезическую разбивку", specification_ru: "Перенос проектной геометрии покрытия на местность; схема и точность подтверждаются проектом производства работ.", unit_id: "service", formula_id: "geodetic_layout_service", expression: "geodetic_layout_service_count", input_units: { geodetic_layout_service_count: "service" }, input_values: { geodetic_layout_service_count: 1 }, quantity: 1, applicability: "pavement_assembly_selected", inclusion_reason_ru: "Разбивка является самостоятельной подготовительной операцией выбранной сборки.", exclusion_rule: "Заменить фактическим объёмом геодезического задания.", source_ids: ["kg_mtd_road_quality_control"] });
    addLine({ row_id: "axes_marks_fixing", wbs_code: "01", section: "Услуги", phase: "preparation", category: "subcontract_service", name_ru: "Закрепление осей и высотных отметок покрытия", action: "закрепить", action_object: "оси и высотные отметки", specification_ru: "Установка и сохранение разбивочных знаков для контроля положения и отметок слоёв в ходе производства работ.", unit_id: "service", formula_id: "axes_marks_fixing_service", expression: "axes_marks_fixing_service_count", input_units: { axes_marks_fixing_service_count: "service" }, input_values: { axes_marks_fixing_service_count: 1 }, quantity: 1, applicability: "pavement_assembly_selected", inclusion_reason_ru: "Закрепление разбивки отделено от её создания как самостоятельная физическая операция.", exclusion_rule: "Заменить фактической схемой закрепления проекта.", source_ids: ["kg_mtd_road_quality_control"] });
    addLine({ row_id: "mobilization_demobilization", wbs_code: "01", section: "Услуги", phase: "preparation", category: "subcontract_service", name_ru: "Мобилизация и демобилизация дорожной техники", action: "мобилизовать", action_object: "комплект дорожной техники", specification_ru: "Доставка, развёртывание и вывоз применимого комплекта техники; стоимость определяется коммерческим предложением.", unit_id: "service", formula_id: "mobilization_service", expression: "mobilization_service_count", input_units: { mobilization_service_count: "service" }, input_values: { mobilization_service_count: 1 }, quantity: 1, applicability: "pavement_assembly_selected", inclusion_reason_ru: "Для предварительной сборки принята одна мобилизация и демобилизация.", exclusion_rule: "Заменить подтверждённой схемой мобилизации.", source_ids: ["engineering_assumption:asphalt-preliminary-assembly:v1:mobilization_service_count"] });
    addLine({ row_id: "work_zone_organization", wbs_code: "01", section: "Временные работы", phase: "preparation", category: "temporary_work", name_ru: "Организация рабочей зоны дорожных работ", action: "организовать", action_object: "рабочую зону", specification_ru: "Ограждение и безопасная организация рабочей зоны без включения неподтверждённой временной схемы движения.", unit_id: "service", formula_id: "work_zone_service", expression: "work_zone_service_count", input_units: { work_zone_service_count: "service" }, input_values: { work_zone_service_count: 1 }, quantity: 1, applicability: "pavement_assembly_selected", inclusion_reason_ru: "Для объекта принята одна организация рабочей зоны.", exclusion_rule: "Отдельную организацию движения включать только по applicability.", source_ids: ["eaeu_tr_ts_014_2011"] });
  }

  const constructionMode = stringValue(values.get("construction_mode"));
  const millingRequired = booleanValue(values.get("milling_required"));
  const millingDepth = numericValue(values.get("milling_depth_mm"));
  let millingVolume: number | null = null;
  if (positive(area.value) && constructionMode === "repair" && millingRequired === true) {
    if (positive(millingDepth)) {
      millingVolume = area.value * millingDepth / 1000;
      const inputs = withArea({ milling_depth_mm: "mm" }, { milling_depth_mm: millingDepth });
      addLine({ row_id: "milling", wbs_code: "02", section: "Работы", phase: "preparation", category: "work", name_ru: "Фрезерование существующего асфальтобетонного покрытия", action: "фрезеровать", action_object: "существующее покрытие", specification_ru: `Глубина фрезерования ${millingDepth} мм; обращение со снятым материалом — по проекту и правилам площадки.`, unit_id: "m3", formula_id: "milling_volume", expression: `${areaExpression} * milling_depth_mm / 1000`, input_units: inputs.units, input_values: inputs.values, quantity: millingVolume, applicability: "construction_mode == repair AND milling_required == true", inclusion_reason_ru: "Пользователь подтвердил ремонт и необходимость фрезерования.", exclusion_rule: "Исключить при новом строительстве или milling_required != true.", source_ids: ["kg_krer_2015_collection_27"] });
    } else requireExpert("milling", "MISSING_MILLING_DEPTH");
  }

  const sandRequired = booleanValue(values.get("sand_layer_required"));
  if (positive(area.value) && sandRequired === true) {
    const thickness = numericValue(values.get("sand_thickness_mm"));
    const factor = numericValue(values.get("sand_compaction_factor"));
    const waste = numericValue(values.get("sand_waste_percent"));
    if (positive(thickness) && positive(factor) && nonNegative(waste)) {
      const quantity = area.value * thickness / 1000 * factor * (1 + waste / 100);
      const inputs = withArea({ sand_thickness_mm: "mm", sand_compaction_factor: "one", sand_waste_percent: "percent" }, { sand_thickness_mm: thickness, sand_compaction_factor: factor, sand_waste_percent: waste });
      addLine({ row_id: "sand_material", wbs_code: "03", section: "Материалы", phase: "base", category: "material", name_ru: "Песок для подстилающего слоя", action: "поставить", action_object: "песок", specification_ru: `Песок для дорожного основания; соответствие проекту и испытаниям заполнителя; слой ${thickness} мм.`, unit_id: "m3", formula_id: "sand_delivery_volume", expression: `${areaExpression} * sand_thickness_mm / 1000 * sand_compaction_factor * (1 + sand_waste_percent / 100)`, input_units: inputs.units, input_values: inputs.values, quantity, applicability: "sand_layer_required == true", inclusion_reason_ru: "Песчаный слой подтверждён пользователем.", exclusion_rule: "Исключить при sand_layer_required != true.", source_ids: ["kg_krer_2015_collection_27"], price_key: "road_sand_project_spec", procurement: true, waste_coefficient: waste / 100 });
      addLine({ row_id: "sand_placement", wbs_code: "03", section: "Работы", phase: "base", category: "work", name_ru: "Устройство песчаного подстилающего слоя", action: "устроить и уплотнить", action_object: "песчаный слой", specification_ru: `Проектная толщина после уплотнения ${thickness} мм; контроль отметок и уплотнения по проекту.`, unit_id: "m3", formula_id: "sand_compacted_volume", expression: `${areaExpression} * sand_thickness_mm / 1000`, input_units: withArea({ sand_thickness_mm: "mm" }, { sand_thickness_mm: thickness }).units, input_values: withArea({ sand_thickness_mm: "mm" }, { sand_thickness_mm: thickness }).values, quantity: area.value * thickness / 1000, applicability: "sand_layer_required == true", inclusion_reason_ru: "Песчаный слой подтверждён пользователем.", exclusion_rule: "Исключить при sand_layer_required != true.", source_ids: ["kg_krer_2015_collection_27"] });
    } else requireExpert("sand", "INCOMPLETE_SAND_LAYER_INPUTS");
  }

  for (const layer of crushedLayers) {
    if (!positive(area.value)) break;
    if (!layer.fraction || !positive(layer.thickness_mm) || !positive(layer.compaction_factor) || !nonNegative(layer.waste_percent)) {
      requireExpert("crushed_layers", `INCOMPLETE_CRUSHED_LAYER_${layer.position}`);
      continue;
    }
    const prefix = `crushed_layer_${layer.position}`;
    const input = withArea({ [`${prefix}_thickness_mm`]: "mm", [`${prefix}_compaction_factor`]: "one", [`${prefix}_waste_percent`]: "percent" }, { [`${prefix}_thickness_mm`]: layer.thickness_mm, [`${prefix}_compaction_factor`]: layer.compaction_factor, [`${prefix}_waste_percent`]: layer.waste_percent });
    const compacted = area.value * layer.thickness_mm / 1000;
    const delivery = compacted * layer.compaction_factor * (1 + layer.waste_percent / 100);
    addLine({ row_id: `${prefix}_material`, wbs_code: "03", section: "Материалы", phase: "base", category: "material", name_ru: `Щебень ${choiceLabel("crushed_layers", layer.fraction) ?? layer.fraction} для ${layerRoleRu(layer.position, crushedLayers.length)} основания`, action: "поставить", action_object: "щебень", specification_ru: `Фракция ${choiceLabel("crushed_layers", layer.fraction) ?? layer.fraction}; проектная толщина ${layer.thickness_mm} мм; коэффициент к уплотнённому объёму ${layer.compaction_factor}; технологический запас ${layer.waste_percent} %; соответствие — по проекту и испытаниям заполнителя.`, unit_id: "m3", formula_id: `${prefix}_delivery_volume`, expression: `${areaExpression} * ${prefix}_thickness_mm / 1000 * ${prefix}_compaction_factor * (1 + ${prefix}_waste_percent / 100)`, input_units: input.units, input_values: input.values, quantity: delivery, applicability: `crushed layer ${layer.position} confirmed`, inclusion_reason_ru: `Подтверждён щебёночный слой ${layer.position}.`, exclusion_rule: "Исключить при отсутствии подтверждённой толщины, фракции или коэффициентов.", source_ids: ["kg_krer_2015_collection_27"], price_key: `road_crushed_${layer.fraction}`, procurement: true, waste_coefficient: layer.waste_percent / 100 });
    addLine({ row_id: `${prefix}_placement`, wbs_code: "03", section: "Работы", phase: "base", category: "work", name_ru: `Устройство щебёночного слоя ${layer.position}`, action: "распределить и уплотнить", action_object: "щебёночный слой", specification_ru: `Фракция: ${layer.fraction}; проектная толщина после уплотнения ${layer.thickness_mm} мм.`, unit_id: "m3", formula_id: `${prefix}_compacted_volume`, expression: `${areaExpression} * ${prefix}_thickness_mm / 1000`, input_units: withArea({ [`${prefix}_thickness_mm`]: "mm" }, { [`${prefix}_thickness_mm`]: layer.thickness_mm }).units, input_values: withArea({ [`${prefix}_thickness_mm`]: "mm" }, { [`${prefix}_thickness_mm`]: layer.thickness_mm }).values, quantity: compacted, applicability: `crushed layer ${layer.position} confirmed`, inclusion_reason_ru: `Подтверждён щебёночный слой ${layer.position}.`, exclusion_rule: "Исключить при отсутствии слоя.", source_ids: ["kg_krer_2015_collection_27"] });
  }

  const geotextileRequired = booleanValue(values.get("geotextile_required"));
  if (positive(area.value) && geotextileRequired === true) {
    const type = stringValue(values.get("geotextile_type"));
    const overlap = numericValue(values.get("geotextile_overlap_percent"));
    if (type && nonNegative(overlap)) {
      const input = withArea({ geotextile_overlap_percent: "percent" }, { geotextile_overlap_percent: overlap });
      const quantity = area.value * (1 + overlap / 100);
      addLine({ row_id: "geotextile_material", wbs_code: "03", section: "Материалы", phase: "base", category: "material", name_ru: "Геотекстиль дорожный", action: "поставить", action_object: "геотекстиль", specification_ru: `Назначение: ${choiceLabel("geotextile_type", type) ?? type}; класс прочности, фильтрации и стойкости — по проекту; нахлёст ${overlap} %.`, unit_id: "m2", formula_id: "geotextile_area", expression: `${areaExpression} * (1 + geotextile_overlap_percent / 100)`, input_units: input.units, input_values: input.values, quantity, applicability: "geotextile_required == true", inclusion_reason_ru: "Геотекстиль явно подтверждён.", exclusion_rule: "Исключить при geotextile_required != true.", source_ids: ["kg_krer_2015_collection_27"], price_key: `road_geotextile_${type}`, procurement: true, waste_coefficient: overlap / 100 });
      addLine({ row_id: "geotextile_installation", wbs_code: "03", section: "Работы", phase: "base", category: "work", name_ru: "Укладка геотекстиля", action: "уложить", action_object: "геотекстиль", specification_ru: `Раскладка и соединение полотен по проекту; учтён подтверждённый нахлёст ${overlap} %.`, unit_id: "m2", formula_id: "geotextile_installation_area", expression: `${areaExpression} * (1 + geotextile_overlap_percent / 100)`, input_units: input.units, input_values: input.values, quantity, applicability: "geotextile_required == true", inclusion_reason_ru: "Геотекстиль явно подтверждён.", exclusion_rule: "Исключить при geotextile_required != true.", source_ids: ["kg_krer_2015_collection_27"] });
    } else requireExpert("crushed_layers", "INCOMPLETE_GEOTEXTILE_SPECIFICATION");
  }

  const baseEmulsionRate = numericValue(values.get("base_emulsion_rate_l_m2"));
  if (positive(area.value) && positive(baseEmulsionRate)) {
    const inputValues = withArea({ base_emulsion_rate_l_m2: "l_m2" }, { base_emulsion_rate_l_m2: baseEmulsionRate });
    addLine({ row_id: "base_emulsion_material", wbs_code: "04", section: "Материалы", phase: "pavement", category: "material", name_ru: "Битумная дорожная эмульсия для подгрунтовки основания", action: "поставить", action_object: "битумную дорожную эмульсию", specification_ru: `Тип эмульсии и остаточное вяжущее — по проекту или техкарте; предварительная норма ${baseEmulsionRate} л/м².`, unit_id: "l", formula_id: "base_emulsion_quantity", expression: `${areaExpression} * base_emulsion_rate_l_m2`, input_units: inputValues.units, input_values: inputValues.values, quantity: area.value * baseEmulsionRate, applicability: "prepared_base_accepted", inclusion_reason_ru: "Подгрунтовка подготовленного основания включена выбранной сборкой.", exclusion_rule: "Исключить только при подтверждённой иной технологии подготовки основания.", source_ids: ["manufacturer_bitumina_emulsion_technical_note"], price_key: "bitumen_emulsion_base_coat_project_spec", procurement: true, consumption_norm: baseEmulsionRate });
    addLine({ row_id: "base_emulsion_application", wbs_code: "04", section: "Работы", phase: "pavement", category: "work", name_ru: "Розлив битумной эмульсии по подготовленному основанию", action: "нанести", action_object: "битумную эмульсию", specification_ru: "Равномерный механизированный розлив после приёмки и очистки основания.", unit_id: "m2", formula_id: "base_emulsion_application_area", expression: areaExpression, input_units: areaUnits, input_values: areaValues, quantity: area.value, applicability: "prepared_base_accepted", inclusion_reason_ru: "Обработка выполняется по всей площади основания.", exclusion_rule: "Исключить только при подтверждённой иной технологии.", source_ids: ["kg_krer_2015_collection_27"] });
  }

  const completeAsphaltLayers: { layer: LayerInput; materialRowId: string; quantity: number }[] = [];
  if (asphaltLayers.length === 0) requireExpert("asphalt_layers", "MISSING_ASPHALT_LAYERS");
  for (const layer of asphaltLayers) {
    if (!positive(area.value)) break;
    if (positive(layer.thickness_mm)) {
      const prefix = `asphalt_layer_${layer.position}`;
      const role = layerRoleRu(layer.position, asphaltLayers.length);
      addLine({ row_id: `${prefix}_paving`, wbs_code: "04", section: "Работы", phase: "pavement", category: "work", name_ru: `Механизированная укладка ${role} асфальтобетонного покрытия`, action: "уложить", action_object: "асфальтобетонный слой", specification_ru: `Проектная толщина ${layer.thickness_mm} мм; температурный режим и непрерывность подачи подтверждаются ППР/техкартой.`, unit_id: "m2", formula_id: `${prefix}_paving_area`, expression: areaExpression, input_units: areaUnits, input_values: areaValues, quantity: area.value, applicability: `asphalt layer ${layer.position} thickness confirmed`, inclusion_reason_ru: `Наличие и толщина слоя ${layer.position} определены сборкой или пользователем.`, exclusion_rule: "Исключить при отсутствии слоя или его толщины.", source_ids: ["kg_krer_2015_collection_27"] });
      addLine({ row_id: `${prefix}_preliminary_compaction`, wbs_code: "04", section: "Работы", phase: "pavement", category: "work", name_ru: `Предварительное уплотнение ${role} асфальтобетонного покрытия`, action: "предварительно уплотнить", action_object: "асфальтобетонный слой", specification_ru: "Режим проходов и температура уплотнения уточняются технологической картой.", unit_id: "m2", formula_id: `${prefix}_preliminary_compaction_area`, expression: areaExpression, input_units: areaUnits, input_values: areaValues, quantity: area.value, applicability: `asphalt layer ${layer.position} confirmed`, inclusion_reason_ru: `Предварительное уплотнение относится ко всей площади слоя ${layer.position}.`, exclusion_rule: "Исключить при отсутствии слоя.", source_ids: ["kg_krer_2015_collection_27"] });
      addLine({ row_id: `${prefix}_main_compaction`, wbs_code: "04", section: "Работы", phase: "pavement", category: "work", name_ru: `Основное уплотнение ${role} асфальтобетонного покрытия`, action: "уплотнить", action_object: "асфальтобетонный слой", specification_ru: "Основное уплотнение до проектной плотности; число проходов — по пробному участку/техкарте.", unit_id: "m2", formula_id: `${prefix}_main_compaction_area`, expression: areaExpression, input_units: areaUnits, input_values: areaValues, quantity: area.value, applicability: `asphalt layer ${layer.position} confirmed`, inclusion_reason_ru: `Основное уплотнение относится ко всей площади слоя ${layer.position}.`, exclusion_rule: "Исключить при отсутствии слоя.", source_ids: ["kg_krer_2015_collection_27"] });
      addLine({ row_id: `${prefix}_final_compaction`, wbs_code: "04", section: "Работы", phase: "pavement", category: "work", name_ru: `Окончательное уплотнение ${role} асфальтобетонного покрытия`, action: "окончательно уплотнить", action_object: "асфальтобетонный слой", specification_ru: "Окончательное уплотнение и устранение следов проходов в допустимом температурном диапазоне.", unit_id: "m2", formula_id: `${prefix}_final_compaction_area`, expression: areaExpression, input_units: areaUnits, input_values: areaValues, quantity: area.value, applicability: `asphalt layer ${layer.position} confirmed`, inclusion_reason_ru: `Окончательное уплотнение относится ко всей площади слоя ${layer.position}.`, exclusion_rule: "Исключить при отсутствии слоя.", source_ids: ["kg_krer_2015_collection_27"] });
      addLine({ row_id: `${prefix}_quality_control`, wbs_code: "06", section: "Контроль качества", phase: "quality", category: "work", name_ru: `Операционный контроль ${role} асфальтобетонного покрытия`, action: "проконтролировать", action_object: "уложенный асфальтобетонный слой", specification_ru: "Контроль температуры, толщины, ровности и качества уплотнения по утверждённой программе.", unit_id: "m2", formula_id: `${prefix}_quality_control_area`, expression: areaExpression, input_units: areaUnits, input_values: areaValues, quantity: area.value, applicability: `asphalt layer ${layer.position} confirmed`, inclusion_reason_ru: `Операционный контроль относится ко всей площади слоя ${layer.position}.`, exclusion_rule: "Исключить при отсутствии слоя.", source_ids: ["kg_mtd_road_quality_control"] });
    }
    if (!layer.mixture_type || !positive(layer.thickness_mm) || !positive(layer.density_t_m3) || !nonNegative(layer.waste_percent)) {
      requireExpert("asphalt_layers", `INCOMPLETE_ASPHALT_LAYER_${layer.position}`);
      continue;
    }
    const prefix = `asphalt_layer_${layer.position}`;
    const input = withArea({ [`${prefix}_thickness_mm`]: "mm", [`${prefix}_density_t_m3`]: "t_m3", [`${prefix}_waste_percent`]: "percent" }, { [`${prefix}_thickness_mm`]: layer.thickness_mm, [`${prefix}_density_t_m3`]: layer.density_t_m3, [`${prefix}_waste_percent`]: layer.waste_percent });
    const quantity = area.value * layer.thickness_mm / 1000 * layer.density_t_m3 * (1 + layer.waste_percent / 100);
    const materialRowId = `${prefix}_material`;
    completeAsphaltLayers.push({ layer, materialRowId, quantity });
    addLine({ row_id: materialRowId, wbs_code: "04", section: "Материалы", phase: "pavement", category: "material", name_ru: `Асфальтобетонная смесь для ${layerRoleRu(layer.position, asphaltLayers.length)}`, action: "поставить", action_object: "асфальтобетонную смесь", specification_ru: `Тип смеси: ${choiceLabel("asphalt_layers", layer.mixture_type) ?? layer.mixture_type}; проектная толщина ${layer.thickness_mm} мм; расчётная плотность ${layer.density_t_m3} т/м³ по подтверждённому паспорту смеси; технологический запас ${layer.waste_percent} %; конкретная марка/стандарт — по проектной спецификации.`, unit_id: "t", formula_id: `${prefix}_mass`, expression: `${areaExpression} * ${prefix}_thickness_mm / 1000 * ${prefix}_density_t_m3 * (1 + ${prefix}_waste_percent / 100)`, input_units: input.units, input_values: input.values, quantity, applicability: `asphalt layer ${layer.position} confirmed`, inclusion_reason_ru: `Подтверждены смесь, толщина, плотность и запас слоя ${layer.position}.`, exclusion_rule: "Исключить при неполной спецификации слоя.", source_ids: ["kg_krer_2015_collection_27"], price_key: `asphalt_mix_${layer.mixture_type}`, procurement: true, waste_coefficient: layer.waste_percent / 100 });
  }

  if (positive(area.value) && completeAsphaltLayers.length >= 2) {
    const basis = stringValue(values.get("emulsion_measurement_basis"));
    const rateKey = basis === "litre" ? "emulsion_rate_l_m2" : basis === "kilogram" ? "emulsion_rate_kg_m2" : null;
    const rate = rateKey ? numericValue(values.get(rateKey)) : null;
    if (rateKey && positive(rate)) {
      const outputUnit = basis === "litre" ? "l" : "kg";
      for (let interfaceIndex = 1; interfaceIndex < completeAsphaltLayers.length; interfaceIndex += 1) {
        const rowId = `emulsion_interface_${interfaceIndex}_${interfaceIndex + 1}`;
        const inputValues = withArea({ [rateKey]: basis === "litre" ? "l_m2" : "kg_m2" }, { [rateKey]: rate });
        addLine({ row_id: rowId, wbs_code: "04", section: "Материалы", phase: "pavement", category: "material", name_ru: `Битумная эмульсия между слоями ${interfaceIndex} и ${interfaceIndex + 1}`, action: "нанести", action_object: "битумную эмульсию", specification_ru: `Тип эмульсии и остаточное вяжущее — по проекту/техкарте; подтверждённая норма ${rate} ${basis === "litre" ? "л/м²" : "кг/м²"}.`, unit_id: outputUnit, formula_id: `${rowId}_quantity`, expression: `${areaExpression} * ${rateKey}`, input_units: inputValues.units, input_values: inputValues.values, quantity: area.value * rate, applicability: "two_or_more_complete_asphalt_layers AND confirmed_emulsion_rate", inclusion_reason_ru: "Подтверждена межслойная обработка и измеримая норма розлива.", exclusion_rule: "Исключить для одного слоя или при отсутствии подтверждённой нормы.", source_ids: ["manufacturer_bitumina_emulsion_technical_note"], price_key: "bitumen_emulsion_project_spec", procurement: true, consumption_norm: rate });
        addLine({ row_id: `${rowId}_application`, wbs_code: "04", section: "Работы", phase: "pavement", category: "work", name_ru: `Межслойный розлив эмульсии между слоями ${interfaceIndex} и ${interfaceIndex + 1}`, action: "нанести", action_object: "битумную эмульсию", specification_ru: "Равномерный механизированный розлив по очищенной поверхности нижележащего слоя.", unit_id: "m2", formula_id: `${rowId}_application_area`, expression: areaExpression, input_units: areaUnits, input_values: areaValues, quantity: area.value, applicability: "two_or_more_complete_asphalt_layers", inclusion_reason_ru: "Межслойная обработка требуется для принятой двухслойной сборки.", exclusion_rule: "Исключить для однослойной конструкции.", source_ids: ["kg_krer_2015_collection_27"] });
      }
    } else requireExpert("emulsion", "MISSING_EMULSION_RATE_OR_BASIS");
  }

  const paverWorkingWidth = numericValue(values.get("paver_working_width_m"));
  const pavingShiftLength = numericValue(values.get("paving_shift_length_m"));
  if (positive(area.value) && positive(paverWorkingWidth) && positive(pavingShiftLength)) {
    const longitudinalLength = area.value / paverWorkingWidth;
    const transverseLength = area.value / pavingShiftLength;
    addLine({ row_id: "longitudinal_joints", wbs_code: "04", section: "Работы", phase: "pavement", category: "work", name_ru: "Устройство и герметизация продольных стыков покрытия", action: "устроить и герметизировать", action_object: "продольные стыки", specification_ru: `Предварительная схема полос принята по рабочей ширине ${paverWorkingWidth} м; фактическая раскладка уточняется ППР.`, unit_id: "m", formula_id: "longitudinal_joint_length", expression: `${areaExpression} / paver_working_width_m`, input_units: withArea({ paver_working_width_m: "m" }, { paver_working_width_m: paverWorkingWidth }).units, input_values: withArea({ paver_working_width_m: "m" }, { paver_working_width_m: paverWorkingWidth }).values, quantity: longitudinalLength, applicability: "pavement_assembly_selected", inclusion_reason_ru: "Длина получена из площади и принятой рабочей ширины укладки.", exclusion_rule: "Пересчитать после утверждения схемы полос.", source_ids: ["kg_krer_2015_collection_27"] });
    addLine({ row_id: "transverse_joints", wbs_code: "04", section: "Работы", phase: "pavement", category: "work", name_ru: "Устройство и герметизация поперечных стыков покрытия", action: "устроить и герметизировать", action_object: "поперечные стыки", specification_ru: `Предварительная длина технологической захватки ${pavingShiftLength} м; фактические остановки уточняются ППР.`, unit_id: "m", formula_id: "transverse_joint_length", expression: `${areaExpression} / paving_shift_length_m`, input_units: withArea({ paving_shift_length_m: "m" }, { paving_shift_length_m: pavingShiftLength }).units, input_values: withArea({ paving_shift_length_m: "m" }, { paving_shift_length_m: pavingShiftLength }).values, quantity: transverseLength, applicability: "pavement_assembly_selected", inclusion_reason_ru: "Длина получена из площади и принятой длины технологической захватки.", exclusion_rule: "Пересчитать после утверждения графика захваток.", source_ids: ["kg_krer_2015_collection_27"] });
    addLine({ row_id: "joint_sealing_material", wbs_code: "04", section: "Материалы", phase: "pavement", category: "material", name_ru: "Материал для герметизации продольных и поперечных стыков", action: "поставить", action_object: "материал для герметизации стыков", specification_ru: "Тип материала и поперечное сечение — по проекту/техкарте; предварительная закупочная единица — метр обрабатываемого стыка.", unit_id: "m", formula_id: "joint_sealing_material_length", expression: "longitudinal_joint_length_m + transverse_joint_length_m", input_units: { longitudinal_joint_length_m: "m", transverse_joint_length_m: "m" }, input_values: { longitudinal_joint_length_m: longitudinalLength, transverse_joint_length_m: transverseLength }, quantity: longitudinalLength + transverseLength, applicability: "pavement_joints_present", inclusion_reason_ru: "Материал привязан к рассчитанной суммарной длине стыков.", exclusion_rule: "Заменить расходом конкретного материала после выбора спецификации.", source_ids: ["engineering_assumption:asphalt-preliminary-assembly:v1:paver_working_width_m"], price_key: "asphalt_joint_sealing_material_project_spec", procurement: true });
    addLine({ row_id: "edge_treatment", wbs_code: "04", section: "Работы", phase: "pavement", category: "work", name_ru: "Обработка кромок перед устройством стыков покрытия", action: "обработать", action_object: "кромки асфальтобетонных полос и захваток", specification_ru: "Очистка, выравнивание и подготовка кромок перед сопряжением и герметизацией; длина привязана к рассчитанным продольным и поперечным стыкам.", unit_id: "m", formula_id: "edge_treatment_length", expression: "longitudinal_joint_length_m + transverse_joint_length_m", input_units: { longitudinal_joint_length_m: "m", transverse_joint_length_m: "m" }, input_values: { longitudinal_joint_length_m: longitudinalLength, transverse_joint_length_m: transverseLength }, quantity: longitudinalLength + transverseLength, applicability: "pavement_joints_present", inclusion_reason_ru: "Обработка кромок является отдельной операцией, предшествующей устройству стыков.", exclusion_rule: "Пересчитать по утверждённой схеме полос и захваток.", source_ids: ["kg_krer_2015_collection_27"] });
  }

  if (positive(area.value)) {
    const laborProductivity = numericValue(values.get("road_worker_productivity_m2_per_man_hour"));
    if (positive(laborProductivity)) {
      const input = withArea({ road_worker_productivity_m2_per_man_hour: "m2_man_hour" }, { road_worker_productivity_m2_per_man_hour: laborProductivity });
      addLine({ row_id: "road_workers", wbs_code: "04", section: "Труд", phase: "pavement", category: "labor", name_ru: "Труд дорожных рабочих", action: "выполнить", action_object: "подтверждённый состав дорожных работ", specification_ru: "Состав звена и производительность подтверждаются КРЕР, ППР или дорожным инженером.", unit_id: "man_hour", formula_id: "road_worker_hours", expression: `${areaExpression} / road_worker_productivity_m2_per_man_hour`, input_units: input.units, input_values: input.values, quantity: area.value / laborProductivity, applicability: "confirmed_labor_productivity", inclusion_reason_ru: "Получена подтверждённая производительность дорожных рабочих.", exclusion_rule: "Не рассчитывать трудозатраты без подтверждённой производительности.", source_ids: ["kg_krer_2015_collection_27"], productivity: laborProductivity });
    } else requireExpert("labor", "MISSING_ROAD_WORKER_PRODUCTIVITY");

    const addAreaMachine = (machine: { key: string; rowId: string; title: string; coverageArea: number; phase?: string; wbs?: string }): void => {
      const productivity = numericValue(values.get(machine.key));
      if (!positive(productivity)) {
        requireExpert("machinery", `MISSING_${machine.rowId.toUpperCase()}_PRODUCTIVITY`);
        return;
      }
      const coverageKey = `${machine.rowId}_coverage_area_m2`;
      addLine({ row_id: machine.rowId, wbs_code: machine.wbs ?? "04", section: "Машины", phase: machine.phase ?? "pavement", category: "machinery", name_ru: machine.title, action: "эксплуатировать", action_object: machine.title.toLocaleLowerCase("ru-RU"), specification_ru: "Типоразмер и производительность являются явными входами предварительной сборки и заменяются данными ППР/техкарты.", unit_id: "machine_hour", formula_id: `${machine.rowId}_machine_hours`, expression: `${coverageKey} / ${machine.key}`, input_units: { [coverageKey]: "m2", [machine.key]: "m2_machine_hour" }, input_values: { [coverageKey]: machine.coverageArea, [machine.key]: productivity }, quantity: machine.coverageArea / productivity, applicability: "corresponding_work_is_included", inclusion_reason_ru: `Машина относится к измеримой операции; производительность ${productivity} м²/маш.-ч.`, exclusion_rule: "Исключить вместе с соответствующей работой.", source_ids: ["kg_krer_2015_collection_27"], productivity });
    };
    addAreaMachine({ key: "surface_cleaner_productivity_m2_per_machine_hour", rowId: "surface_cleaner", title: "Механизированная очистительная машина", coverageArea: area.value, phase: "preparation", wbs: "01" });
    const emulsionApplications = 1 + Math.max(0, completeAsphaltLayers.length - 1);
    addAreaMachine({ key: "bitumen_distributor_productivity_m2_per_machine_hour", rowId: "bitumen_distributor", title: "Автогудронатор для розлива битумной эмульсии", coverageArea: area.value * emulsionApplications });
    for (const item of completeAsphaltLayers) {
      const suffix = `layer_${item.layer.position}`;
      addAreaMachine({ key: "paver_productivity_m2_per_machine_hour", rowId: `asphalt_paver_${suffix}`, title: `Асфальтоукладчик для ${layerRoleRu(item.layer.position, completeAsphaltLayers.length)}`, coverageArea: area.value });
      addAreaMachine({ key: "roller_productivity_m2_per_machine_hour", rowId: `smooth_roller_${suffix}`, title: `Вибрационный гладковальцовый каток для ${layerRoleRu(item.layer.position, completeAsphaltLayers.length)}`, coverageArea: area.value });
      addAreaMachine({ key: "pneumatic_roller_productivity_m2_per_machine_hour", rowId: `pneumatic_roller_${suffix}`, title: `Пневмоколёсный каток для ${layerRoleRu(item.layer.position, completeAsphaltLayers.length)}`, coverageArea: area.value });
    }
    if (crushedLayers.length > 0 || sandRequired === true) {
      addAreaMachine({ key: "grader_productivity_m2_per_machine_hour", rowId: "grader", title: "Автогрейдер для профилирования основания", coverageArea: area.value * Math.max(1, crushedLayers.length + (sandRequired === true ? 1 : 0)), phase: "base", wbs: "03" });
    }
  }

  if (positive(millingVolume)) {
    const millingProductivity = numericValue(values.get("milling_productivity_m3_per_machine_hour"));
    if (positive(millingProductivity)) {
      addLine({ row_id: "milling_machine", wbs_code: "02", section: "Машины", phase: "preparation", category: "machinery", name_ru: "Дорожная фреза", action: "эксплуатировать", action_object: "дорожную фрезу", specification_ru: "Ширина барабана и производительность подтверждаются ППР для заданной глубины и покрытия.", unit_id: "machine_hour", formula_id: "milling_machine_hours", expression: "milling_volume_m3 / milling_productivity_m3_per_machine_hour", input_units: { milling_volume_m3: "m3", milling_productivity_m3_per_machine_hour: "m3_machine_hour" }, input_values: { milling_volume_m3: millingVolume, milling_productivity_m3_per_machine_hour: millingProductivity }, quantity: millingVolume / millingProductivity, applicability: "milling_required == true AND confirmed_productivity", inclusion_reason_ru: "Фрезерование и производительность фрезы подтверждены.", exclusion_rule: "Исключить без фрезерования или производительности.", source_ids: ["kg_krer_2015_collection_27"], productivity: millingProductivity });
    } else requireExpert("milling", "MISSING_MILLING_MACHINE_PRODUCTIVITY");
    const disposalDistance = numericValue(values.get("disposal_distance_km"));
    if (nonNegative(disposalDistance)) {
      addLine({ row_id: "milled_material_transport", wbs_code: "07", section: "Транспорт", phase: "logistics", category: "transport", name_ru: "Перевозка снятого асфальтобетона", action: "перевезти", action_object: "снятый асфальтобетон", specification_ru: `Маршрут и место приёмки подтверждаются; расстояние ${disposalDistance} км.`, unit_id: "m3_km", formula_id: "milled_material_transport_work", expression: "milling_volume_m3 * disposal_distance_km", input_units: { milling_volume_m3: "m3", disposal_distance_km: "km" }, input_values: { milling_volume_m3: millingVolume, disposal_distance_km: disposalDistance }, quantity: millingVolume * disposalDistance, applicability: "milling_required == true AND disposal_distance_confirmed", inclusion_reason_ru: "Подтверждены объём фрезерования и расстояние вывоза.", exclusion_rule: "Исключить без фрезерования или подтверждённого маршрута.", source_ids: ["kg_krer_2015_collection_27"] });
    } else requireExpert("milling", "MISSING_MILLING_DISPOSAL_DISTANCE");
  }

  const curbRequired = booleanValue(values.get("curb_required"));
  const curbType = stringValue(values.get("curb_type"));
  const curbLength = numericValue(values.get("curb_length_m"));
  if (curbRequired === true && positive(curbLength) && curbType) {
    const common = { expression: "curb_length_m", input_units: { curb_length_m: "m" }, input_values: { curb_length_m: curbLength }, quantity: curbLength };
    const specification = `Тип: ${choiceLabel("curb_type", curbType) ?? curbType}; геометрия, класс бетона, прочность и морозостойкость — по проектной спецификации.`;
    addLine({ row_id: "curb_material", wbs_code: "05", section: "Материалы", phase: "road_furniture", category: "material", name_ru: "Бортовой камень", action: "поставить", action_object: "бортовой камень", specification_ru: specification, unit_id: "m", formula_id: "curb_material_length", ...common, applicability: "curb_required == true AND curb_type confirmed AND curb_length_m > 0", inclusion_reason_ru: "Пользователь подтвердил бортовой камень, его тип и длину.", exclusion_rule: "Исключить без явного подтверждения, типа или положительной длины.", source_ids: ["kg_krer_2015_collection_27"], price_key: `road_curb_${curbType}`, procurement: true });
    addLine({ row_id: "curb_installation", wbs_code: "05", section: "Работы", phase: "road_furniture", category: "work", name_ru: "Установка бортового камня", action: "установить", action_object: "бортовой камень", specification_ru: `${specification} Основание, бетон обоймы и отметки подтверждаются проектом.`, unit_id: "m", formula_id: "curb_installation_length", ...common, applicability: "curb_required == true AND curb_type confirmed AND curb_length_m > 0", inclusion_reason_ru: "Пользователь подтвердил бортовой камень, его тип и длину.", exclusion_rule: "Исключить без явного подтверждения, типа или положительной длины.", source_ids: ["kg_krer_2015_collection_27"] });
  } else if (curbRequired === true) {
    unresolved.add("MISSING_CURB_TYPE_OR_LENGTH");
  }

  const drainageRequired = booleanValue(values.get("drainage_required"));
  const drainageType = stringValue(values.get("drainage_type"));
  const drainageLength = numericValue(values.get("drainage_length_m"));
  if (drainageRequired === true && drainageType && drainageType !== "unknown" && positive(drainageLength)) {
    const common = { expression: "drainage_length_m", input_units: { drainage_length_m: "m" }, input_values: { drainage_length_m: drainageLength }, quantity: drainageLength };
    const specification = `Система: ${choiceLabel("drainage_type", drainageType) ?? drainageType}; сечение, материал, класс нагрузки и уклоны — по проекту.`;
    addLine({ row_id: "drainage_material", wbs_code: "05", section: "Материалы", phase: "road_furniture", category: "material", name_ru: "Элементы системы водоотвода", action: "поставить", action_object: "элементы водоотвода", specification_ru: specification, unit_id: "m", formula_id: "drainage_material_length", ...common, applicability: "drainage_required == true AND type and length confirmed", inclusion_reason_ru: "Пользователь подтвердил новый водоотвод, тип и длину.", exclusion_rule: "Исключить без явного подтверждения, типа или длины.", source_ids: ["kg_krer_2015_collection_27"], price_key: `road_drainage_${drainageType}`, procurement: true });
    addLine({ row_id: "drainage_installation", wbs_code: "05", section: "Работы", phase: "road_furniture", category: "work", name_ru: "Устройство системы водоотвода", action: "устроить", action_object: "водоотвод", specification_ru: specification, unit_id: "m", formula_id: "drainage_installation_length", ...common, applicability: "drainage_required == true AND type and length confirmed", inclusion_reason_ru: "Пользователь подтвердил новый водоотвод, тип и длину.", exclusion_rule: "Исключить без явного подтверждения, типа или длины.", source_ids: ["kg_krer_2015_collection_27"] });
  } else if (drainageRequired === true) {
    requireExpert("drainage", "MISSING_DRAINAGE_LENGTH_OR_SPECIFICATION");
  }

  const utilityPipesRequired = booleanValue(values.get("utility_pipes_required"));
  const utilityPipeType = stringValue(values.get("utility_pipe_type"));
  const utilityPipeLength = numericValue(values.get("utility_pipe_length_m"));
  if (utilityPipesRequired === true && utilityPipeType && positive(utilityPipeLength)) {
    const common = { expression: "utility_pipe_length_m", input_units: { utility_pipe_length_m: "m" }, input_values: { utility_pipe_length_m: utilityPipeLength }, quantity: utilityPipeLength };
    const specification = `Тип: ${choiceLabel("utility_pipe_type", utilityPipeType) ?? utilityPipeType}; диаметр, материал, кольцевая жёсткость и узлы — по проектной спецификации.`;
    addLine({ row_id: "utility_pipes_material", wbs_code: "05", section: "Материалы", phase: "road_furniture", category: "material", name_ru: "Труба или футляр инженерной сети", action: "поставить", action_object: "трубу или футляр", specification_ru: specification, unit_id: "m", formula_id: "utility_pipe_material_length", ...common, applicability: "utility_pipes_required == true AND type and length confirmed", inclusion_reason_ru: "Пользователь подтвердил трубу/футляр, тип и длину.", exclusion_rule: "Исключить без явного подтверждения, типа или длины.", source_ids: ["kg_krer_2015_collection_27"], price_key: `road_utility_pipe_${utilityPipeType}`, procurement: true });
    addLine({ row_id: "utility_pipes_installation", wbs_code: "05", section: "Работы", phase: "road_furniture", category: "work", name_ru: "Устройство трубы или футляра", action: "смонтировать", action_object: "трубу или футляр", specification_ru: specification, unit_id: "m", formula_id: "utility_pipe_installation_length", ...common, applicability: "utility_pipes_required == true AND type and length confirmed", inclusion_reason_ru: "Пользователь подтвердил трубу/футляр, тип и длину.", exclusion_rule: "Исключить без явного подтверждения, типа или длины.", source_ids: ["kg_krer_2015_collection_27"] });
  } else if (utilityPipesRequired === true) unresolved.add("MISSING_UTILITY_PIPE_TYPE_OR_LENGTH");

  const signsRequired = booleanValue(values.get("traffic_signs_required"));
  const signs = numericValue(values.get("traffic_signs_count"));
  if (signsRequired === true && positive(signs)) {
    const common = { expression: "traffic_signs_count", input_units: { traffic_signs_count: "pcs" }, input_values: { traffic_signs_count: signs }, quantity: signs };
    addLine({ row_id: "traffic_signs_material", wbs_code: "05", section: "Материалы", phase: "road_furniture", category: "material", name_ru: "Дорожные знаки с опорами", action: "поставить", action_object: "дорожные знаки", specification_ru: "Типоразмер, плёнка, опоры и схема — строго по подтверждённому проекту организации движения.", unit_id: "pcs", formula_id: "traffic_sign_material_count", ...common, applicability: "traffic_signs_required == true AND count confirmed", inclusion_reason_ru: "Пользователь подтвердил знаки и количество.", exclusion_rule: "Исключить без подтверждения или количества.", source_ids: ["eaeu_tr_ts_014_2011"], price_key: "traffic_sign_project_spec", procurement: true });
    addLine({ row_id: "traffic_signs_installation", wbs_code: "05", section: "Работы", phase: "road_furniture", category: "work", name_ru: "Установка дорожных знаков", action: "установить", action_object: "дорожные знаки", specification_ru: "Места, высоты и узлы установки — по подтверждённой схеме организации движения.", unit_id: "pcs", formula_id: "traffic_sign_installation_count", ...common, applicability: "traffic_signs_required == true AND count confirmed", inclusion_reason_ru: "Пользователь подтвердил знаки и количество.", exclusion_rule: "Исключить без подтверждения или количества.", source_ids: ["eaeu_tr_ts_014_2011"] });
  } else if (signsRequired === true) unresolved.add("MISSING_TRAFFIC_SIGNS_COUNT");

  const markingRequired = booleanValue(values.get("road_marking_required"));
  const markingArea = numericValue(values.get("road_marking_area_m2"));
  if (markingRequired === true && positive(markingArea)) {
    addLine({ row_id: "road_marking", wbs_code: "05", section: "Работы", phase: "road_furniture", category: "work", name_ru: "Нанесение дорожной разметки", action: "нанести", action_object: "дорожную разметку", specification_ru: "Схема, тип материала, цвет, толщина и подготовка поверхности — по проекту организации движения; материал не включён без нормы расхода.", unit_id: "m2", formula_id: "road_marking_area", expression: "road_marking_area_m2", input_units: { road_marking_area_m2: "m2" }, input_values: { road_marking_area_m2: markingArea }, quantity: markingArea, applicability: "road_marking_required == true AND area confirmed", inclusion_reason_ru: "Пользователь подтвердил разметку и измеримую площадь.", exclusion_rule: "Исключить без подтверждения или площади.", source_ids: ["eaeu_tr_ts_014_2011"] });
  } else if (markingRequired === true) unresolved.add("MISSING_ROAD_MARKING_AREA");

  const guardrailRequired = booleanValue(values.get("guardrail_required"));
  const guardrail = numericValue(values.get("guardrail_length_m"));
  if (guardrailRequired === true && positive(guardrail)) {
    const common = { expression: "guardrail_length_m", input_units: { guardrail_length_m: "m" }, input_values: { guardrail_length_m: guardrail }, quantity: guardrail };
    addLine({ row_id: "guardrail_material", wbs_code: "05", section: "Материалы", phase: "road_furniture", category: "material", name_ru: "Барьерное дорожное ограждение", action: "поставить", action_object: "барьерное ограждение", specification_ru: "Уровень удержания, рабочая ширина, стойки, окончания и покрытие — по проекту безопасности.", unit_id: "m", formula_id: "guardrail_material_length", ...common, applicability: "guardrail_required == true AND length confirmed", inclusion_reason_ru: "Пользователь подтвердил ограждение и длину.", exclusion_rule: "Исключить без подтверждения или длины.", source_ids: ["eaeu_tr_ts_014_2011"], price_key: "guardrail_project_spec", procurement: true });
    addLine({ row_id: "guardrail_installation", wbs_code: "05", section: "Работы", phase: "road_furniture", category: "work", name_ru: "Монтаж барьерного дорожного ограждения", action: "смонтировать", action_object: "барьерное ограждение", specification_ru: "Шаг стоек, анкеровка, окончания и сопряжения — по проекту безопасности.", unit_id: "m", formula_id: "guardrail_installation_length", ...common, applicability: "guardrail_required == true AND length confirmed", inclusion_reason_ru: "Пользователь подтвердил ограждение и длину.", exclusion_rule: "Исключить без подтверждения или длины.", source_ids: ["eaeu_tr_ts_014_2011"] });
  } else if (guardrailRequired === true) unresolved.add("MISSING_GUARDRAIL_LENGTH");

  if (completeAsphaltLayers.length > 0) {
    const distance = numericValue(values.get("asphalt_plant_distance_km"));
    const payload = numericValue(values.get("truck_payload_t"));
    const truckAverageSpeed = numericValue(values.get("truck_average_speed_km_per_machine_hour"));
    const truckTurnaround = numericValue(values.get("truck_turnaround_machine_hours"));
    for (const item of completeAsphaltLayers) {
      const role = layerRoleRu(item.layer.position, completeAsphaltLayers.length);
      const rowPrefix = `asphalt_layer_${item.layer.position}`;
      if (nonNegative(distance)) {
        addLine({ row_id: `${rowPrefix}_delivery`, wbs_code: "07", section: "Логистика", phase: "logistics", category: "transport", name_ru: `Доставка асфальтобетонной смеси для ${role}`, action: "доставить", action_object: "асфальтобетонную смесь", specification_ru: `Предварительное расстояние от АБЗ ${distance} км; температурный режим доставки — по ППР.`, unit_id: "t_km", formula_id: `${rowPrefix}_delivery_tkm`, expression: `${item.materialRowId} * asphalt_plant_distance_km`, input_units: { [item.materialRowId]: "t", asphalt_plant_distance_km: "km" }, input_values: { [item.materialRowId]: item.quantity, asphalt_plant_distance_km: distance }, quantity: item.quantity * distance, applicability: `asphalt layer ${item.layer.position} material compiled`, inclusion_reason_ru: "Транспортная работа рассчитана отдельно для массы данного слоя.", exclusion_rule: "Пересчитать после выбора фактического АБЗ.", source_ids: ["kg_krer_2015_collection_27"] });
      } else unresolved.add("MISSING_ASPHALT_PLANT_DISTANCE");
      if (positive(payload)) {
        const truckTrips = Math.ceil(item.quantity / payload);
        addLine({ row_id: `${rowPrefix}_truck_trips`, wbs_code: "07", section: "Логистика", phase: "logistics", category: "transport", name_ru: `Рейсы автосамосвалов для смеси ${role}`, action: "выполнить рейсы", action_object: "доставку смеси", specification_ru: `Полезная загрузка ${payload} т/рейс; число рейсов округлено вверх.`, unit_id: "trip", formula_id: `${rowPrefix}_truck_trips`, expression: `ceil(${item.materialRowId} / truck_payload_t)`, input_units: { [item.materialRowId]: "t", truck_payload_t: "t_trip" }, input_values: { [item.materialRowId]: item.quantity, truck_payload_t: payload }, quantity: truckTrips, applicability: `asphalt layer ${item.layer.position} material compiled`, inclusion_reason_ru: "Число рейсов рассчитано отдельно для массы данного слоя.", exclusion_rule: "Пересчитать после подтверждения фактической грузоподъёмности.", source_ids: ["kg_krer_2015_collection_27"] });
        if (nonNegative(distance) && positive(truckAverageSpeed) && nonNegative(truckTurnaround)) {
          const truckRowId = `dump_trucks_layer_${item.layer.position}`;
          const tripCountKey = `${rowPrefix}_truck_trip_count`;
          const machineHours = truckTrips * (2 * distance / truckAverageSpeed + truckTurnaround);
          addLine({ row_id: truckRowId, wbs_code: "07", section: "Машины", phase: "logistics", category: "machinery", name_ru: `Автосамосвалы для доставки смеси ${role}`, action: "эксплуатировать", action_object: "автосамосвалы на маршруте доставки смеси", specification_ru: `Предварительный цикл учитывает плечо ${distance} км в одну сторону, среднюю скорость ${truckAverageSpeed} км/маш.-ч и ${truckTurnaround} маш.-ч на погрузку, ожидание и разгрузку рейса.`, unit_id: "machine_hour", formula_id: `${truckRowId}_machine_hours`, expression: `${tripCountKey} * (2 * asphalt_plant_distance_km / truck_average_speed_km_per_machine_hour + truck_turnaround_machine_hours)`, input_units: { [tripCountKey]: "one", asphalt_plant_distance_km: "km", truck_average_speed_km_per_machine_hour: "km_machine_hour", truck_turnaround_machine_hours: "machine_hour" }, input_values: { [tripCountKey]: truckTrips, asphalt_plant_distance_km: distance, truck_average_speed_km_per_machine_hour: truckAverageSpeed, truck_turnaround_machine_hours: truckTurnaround }, quantity: machineHours, applicability: `asphalt layer ${item.layer.position} delivery compiled`, inclusion_reason_ru: "Машино-часы автосамосвалов рассчитаны из числа рейсов и явной продолжительности транспортного цикла.", exclusion_rule: "Пересчитать после подтверждения маршрута, скорости и времени оборота.", source_ids: ["kg_krer_2015_collection_27"], productivity: truckAverageSpeed });
        } else requireExpert("machinery", `MISSING_DUMP_TRUCK_CYCLE_INPUTS_LAYER_${item.layer.position}`);
      }
    }
  }

  const laboratory = stringValue(values.get("laboratory_control"));
  if (positive(area.value) && laboratory && !["none", "unknown"].includes(laboratory)) {
    const interval = numericValue(values.get("laboratory_test_interval_m2_per_test"));
    if (positive(interval)) addLine({ row_id: "laboratory_tests", wbs_code: "06", section: "Испытания", phase: "quality", category: "testing", name_ru: "Лабораторный контроль асфальтобетонного покрытия", action: "выполнить", action_object: "испытания и отбор проб", specification_ru: `Форма контроля: ${choiceLabel("laboratory_control", laboratory) ?? laboratory}; состав испытаний — по утверждённой программе контроля.`, unit_id: "test", formula_id: "laboratory_tests", expression: `ceil(${areaExpression} / laboratory_test_interval_m2_per_test)`, input_units: withArea({ laboratory_test_interval_m2_per_test: "m2_test" }, { laboratory_test_interval_m2_per_test: interval }).units, input_values: withArea({ laboratory_test_interval_m2_per_test: "m2_test" }, { laboratory_test_interval_m2_per_test: interval }).values, quantity: Math.ceil(area.value / interval), applicability: "laboratory_control selected AND interval confirmed", inclusion_reason_ru: "Пользователь выбрал лабораторный контроль и подтвердил частоту.", exclusion_rule: "Исключить при laboratory_control == none или без программы контроля.", source_ids: ["kg_mtd_road_quality_control"], productivity: interval });
    else requireExpert("laboratory", "MISSING_LABORATORY_TEST_INTERVAL");
  }

  if (positive(area.value)) {
    addLine({ row_id: "surface_smoothness_control", wbs_code: "06", section: "Контроль качества", phase: "quality", category: "work", name_ru: "Контроль ровности и отметок готового покрытия", action: "проконтролировать", action_object: "ровность и отметки покрытия", specification_ru: "Приёмочный контроль по проекту и утверждённой программе качества.", unit_id: "m2", formula_id: "surface_smoothness_control_area", expression: areaExpression, input_units: areaUnits, input_values: areaValues, quantity: area.value, applicability: "pavement_assembly_completed", inclusion_reason_ru: "Контроль относится ко всей площади готового покрытия.", exclusion_rule: "Не включать без покрытия.", source_ids: ["kg_mtd_road_quality_control"] });
    addLine({ row_id: "pavement_thickness_control", wbs_code: "06", section: "Контроль качества", phase: "quality", category: "work", name_ru: "Контроль толщины асфальтобетонных слоёв", action: "проконтролировать", action_object: "толщину слоёв покрытия", specification_ru: "Способ и частота измерений устанавливаются программой контроля; площадь является измеримой базой работы.", unit_id: "m2", formula_id: "pavement_thickness_control_area", expression: areaExpression, input_units: areaUnits, input_values: areaValues, quantity: area.value, applicability: "pavement_assembly_completed", inclusion_reason_ru: "Контроль толщины привязан ко всей площади покрытия.", exclusion_rule: "Не включать без покрытия.", source_ids: ["kg_mtd_road_quality_control"] });
    addLine({ row_id: "executive_survey", wbs_code: "06", section: "Услуги", phase: "quality", category: "subcontract_service", name_ru: "Исполнительная геодезическая съёмка покрытия", action: "выполнить", action_object: "исполнительную съёмку", specification_ru: "Фиксация планово-высотного положения и отметок готового покрытия.", unit_id: "service", formula_id: "executive_survey_service", expression: "executive_survey_service_count", input_units: { executive_survey_service_count: "service" }, input_values: { executive_survey_service_count: 1 }, quantity: 1, applicability: "pavement_assembly_completed", inclusion_reason_ru: "В предварительную сборку включена одна исполнительная съёмка объекта.", exclusion_rule: "Заменить объёмом договора геодезического сопровождения.", source_ids: ["kg_mtd_road_quality_control"] });
    addLine({ row_id: "execution_documentation", wbs_code: "06", section: "Документация", phase: "quality", category: "documentation", name_ru: "Комплект исполнительной документации по устройству покрытия", action: "подготовить", action_object: "исполнительную документацию", specification_ru: "Акты, журналы, протоколы контроля и исполнительные схемы в составе, установленном договором и проектом.", unit_id: "document", formula_id: "execution_documentation_count", expression: "execution_documentation_count", input_units: { execution_documentation_count: "document" }, input_values: { execution_documentation_count: 1 }, quantity: 1, applicability: "pavement_assembly_completed", inclusion_reason_ru: "Принят один комплект исполнительной документации на объект.", exclusion_rule: "Уточнить состав документов договором.", source_ids: ["kg_mtd_road_quality_control"] });
  }

  const projectDocument = stringValue(values.get("project_document"));
  if (projectDocument) addLine({ row_id: "project_document", wbs_code: "01", section: "Документация", phase: "preparation", category: "documentation", name_ru: "Проектная документация дорожного покрытия", action: "проверить", action_object: "проект или ведомость", specification_ru: "Загруженный проектный документ с идентифицируемой версией; содержимое требует проверки инженером.", unit_id: "document", formula_id: "project_document_count", expression: "project_document_count", input_units: { project_document_count: "document" }, input_values: { project_document_count: 1 }, quantity: 1, applicability: "project_document uploaded", inclusion_reason_ru: "Пользователь загрузил реальный документ.", exclusion_rule: "Не создавать строку без загруженного документа.", source_ids: ["kg_mtd_road_quality_control"] });

  const assumptions = [
    assemblyPolicy.summary_ru,
    ...assemblyPolicy.assumptions.map((assumption) => `${assumption.canonical_key}: ${assumption.reason_ru}`),
    ...(stringValue(values.get("soil_condition")) === "unknown"
      ? ["Тип и состояние грунта не подтверждены; связанные решения по основанию остаются предметом проекта и проверки дорожного инженера."]
      : []),
  ];
  const passport = buildPassport({ formulas, rows: definitions, operations, resources, procurement, commercial, unresolved: [...unresolved].sort(), assumptions });
  const structural = validateProfessionalEstimatePassportV4(passport);
  const compileBlockers = [...structural.blockers, ...formulaBlockers, ...categoryBlockers];
  return {
    passport,
    compiled_rows: compiledRows,
    extracted_facts: facts,
    clarification: composeAsphaltClarificationExperienceV4({ raw_text: input.raw_text, facts }),
    price_coverage: {
      total_rows: compiledRows.length,
      priced_rows: 0,
      missing_price_rows: compiledRows.length,
      coverage_ratio: 0,
      total_amount: null,
      display_total_ru: "Итог не рассчитан: цены не заполнены",
    },
    expert_questions_ru: [...expertQuestions].sort((left, right) => left.localeCompare(right, "ru")),
    compile_blockers: compileBlockers,
    formula_dimension_blockers: formulaBlockers,
    category_unit_blockers: categoryBlockers,
    source_trace_complete: definitions.every((row) => Boolean(row.source_id && row.explanation_trace_ru)),
    preliminary_assembly_policy: assemblyPolicy,
    quantity_basis: quantityBasis,
  };
}

export const ASPHALT_V4_RUNTIME_TEMPLATE_ID = `${ASPHALT_WORK_ID_V4}_professional_truth_v4_phase1` as const;
export const ASPHALT_V4_RUNTIME_TEMPLATE_VERSION = ASPHALT_PASSPORT_VERSION_V4;
export const ASPHALT_V4_RUNTIME_TITLE_RU = ASPHALT_PROFESSIONAL_NAME_RU_V4;
