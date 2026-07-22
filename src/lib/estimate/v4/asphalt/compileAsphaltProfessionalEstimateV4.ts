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
import { buildAsphaltFullRoadInfrastructureAssemblyV4 } from "./asphaltFullRoadInfrastructureAssemblyV4";
import { buildAsphaltFullRoadExpandedBoqV4 } from "./asphaltFullRoadExpandedBoqV4";
import {
  buildAsphaltPreliminaryAssemblyPolicyV4,
  type AsphaltDeclaredAssumptionV4,
  type AsphaltPreliminaryAssemblyPolicyV4,
} from "./asphaltPreliminaryAssemblyPolicyV4";
import {
  ASPHALT_PROFESSIONAL_PASSPORT_BASE_V4,
} from "./asphaltProfessionalPassportV4";
import { asphaltPublicSelectionLabelV4 } from "./asphaltProfessionalPresentationV4";
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
  costing_mode?: "COMPOSITE_RATE" | "RESOURCE_BASED" | "ANALYTICAL_ONLY" | "INFORMATIONAL_SUBTOTAL";
  cost_ownership_id?: string | null;
  informational?: boolean;
  component_type?: NonNullable<BoqLineDefinitionV4["component_type"]>;
  specification_status?: NonNullable<BoqLineDefinitionV4["specification_status"]>;
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
  if (!value) return null;
  const directLabel = parameter?.choices.find((item) => item.value === value)?.label_ru;
  const structuredLabel = parameter?.structured_group?.fields
    .flatMap((field) => field.choices)
    .find((item) => item.value === value)?.label_ru;
  return asphaltPublicSelectionLabelV4(value, directLabel ?? structuredLabel);
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

function professionalCategory(category: BoqCategoryV4): NonNullable<BoqLineDefinitionV4["professional_category"]> {
  if (category === "material") return "MATERIAL";
  if (category === "labor") return "LABOR";
  if (category === "work" || category === "temporary_work") return "WORK";
  if (category === "equipment") return "EQUIPMENT";
  if (category === "machinery") return "MACHINERY";
  if (category === "transport") return "LOGISTICS";
  if (category === "testing") return "LAB_CONTROL";
  if (category === "documentation") return "DOCUMENTATION";
  return "SERVICE";
}

function componentType(category: BoqCategoryV4): NonNullable<BoqLineDefinitionV4["component_type"]> {
  if (category === "material") return "MATERIAL";
  if (category === "labor") return "LABOR";
  if (category === "work" || category === "temporary_work") return "WORK_OUTPUT";
  if (category === "machinery" || category === "equipment") return "MACHINERY";
  if (category === "transport") return "LOGISTICS";
  if (category === "testing") return "QUALITY_CONTROL";
  if (category === "documentation") return "DOCUMENTATION";
  return "SERVICE";
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
      .filter((assumption) => assumption.canonical_key === "scope_profile" || Object.hasOwn(row.input_values, assumption.canonical_key) || assumption.affected_row_ids.includes(row.row_id))
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
      professional_category: professionalCategory(row.category),
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
      costing_mode: row.costing_mode ?? (row.informational ? "ANALYTICAL_ONLY" : "RESOURCE_BASED"),
      priced: false,
      parent_wbs_id: `wbs:${row.wbs_code}`,
      cost_ownership_id: row.cost_ownership_id ?? `cost:${row.row_id}`,
      informational: row.informational ?? false,
      component_type: row.component_type ?? componentType(row.category),
      specification_status: row.specification_status
        ?? (/^asphalt_layer_\d+_material$/u.test(row.row_id)
          ? "SPECIFICATION_REQUIRES_PROJECT_CONFIRMATION"
          : "PRELIMINARY_ENGINEERING_ASSUMPTION"),
      procurement_eligible: row.procurement === true,
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

  const scopeProfile = assemblyPolicy.profile_id;
  const fullConstruction = scopeProfile === "new_full_road_pavement" || scopeProfile === "new_full_road_infrastructure" || scopeProfile === "parking_full_construction";
  if (positive(area.value) && fullConstruction) {
    const temporaryTrafficCount = numericValue(values.get("temporary_traffic_service_count"));
    if (positive(temporaryTrafficCount)) addLine({ row_id: "temporary_traffic_management", wbs_code: "01", section: "Услуги", phase: "preparation", category: "subcontract_service", name_ru: "Временная организация дорожного движения на период строительства", action: "организовать", action_object: "временное движение", specification_ru: "Схема ограждения, объездов, знаков и этапности — по проекту организации движения; предварительно учтена одна услуга на объект.", unit_id: "service", formula_id: "temporary_traffic_service_count", expression: "temporary_traffic_service_count", input_units: { temporary_traffic_service_count: "service" }, input_values: { temporary_traffic_service_count: temporaryTrafficCount }, quantity: temporaryTrafficCount, applicability: "scope in [NEW_FULL_ROAD_PAVEMENT, PARKING_FULL_CONSTRUCTION]", inclusion_reason_ru: "Полное строительство требует отдельной организации безопасного временного движения.", exclusion_rule: "Заменить утверждённой схемой и фактическим объёмом.", source_ids: ["eaeu_tr_ts_014_2011"] });
    const clearingFactor = numericValue(values.get("site_clearing_factor"));
    if (positive(clearingFactor)) {
      const input = withArea({ site_clearing_factor: "one" }, { site_clearing_factor: clearingFactor });
      addLine({ row_id: "site_clearing", wbs_code: "01", section: "Работы", phase: "preparation", category: "work", name_ru: "Расчистка полосы строительства дорожной одежды", action: "расчистить", action_object: "полосу строительства", specification_ru: "Удаление поверхностного мусора и неподходящих предметов в пределах подтверждённой площади без скрытого вывоза грунта.", unit_id: "m2", formula_id: "site_clearing_area", expression: `${areaExpression} * site_clearing_factor`, input_units: input.units, input_values: input.values, quantity: area.value * clearingFactor, applicability: "full construction scope", inclusion_reason_ru: "Расчистка раскрыта как отдельная подготовительная операция.", exclusion_rule: "Уточнить границы по стройгенплану.", source_ids: ["kg_krer_2015_collection_27"] });
      addLine({ row_id: "site_preparation", wbs_code: "01", section: "Работы", phase: "preparation", category: "work", name_ru: "Подготовка территории к земляным работам", action: "подготовить", action_object: "территорию", specification_ru: "Планировочная подготовка фронта земляных работ после расчистки, до снятия растительного слоя.", unit_id: "m2", formula_id: "site_preparation_area", expression: `${areaExpression} * site_clearing_factor`, input_units: input.units, input_values: input.values, quantity: area.value * clearingFactor, applicability: "full construction scope", inclusion_reason_ru: "Подготовка территории отделена от расчистки и земляных операций.", exclusion_rule: "Уточнить технологией производства работ.", source_ids: ["kg_krer_2015_collection_27"] });
    }

    const earthworkRequired = booleanValue(values.get("earthwork_required"));
    const topsoilThickness = numericValue(values.get("topsoil_thickness_mm"));
    const excavationDepth = numericValue(values.get("subgrade_excavation_depth_mm"));
    const soilDensity = numericValue(values.get("excavated_soil_density_t_m3"));
    const haulDistance = numericValue(values.get("earthwork_haul_distance_km"));
    const payload = numericValue(values.get("truck_payload_t"));
    const densityInterval = numericValue(values.get("subgrade_density_test_interval_m2"));
    if (earthworkRequired === true && positive(topsoilThickness) && positive(excavationDepth) && positive(soilDensity) && positive(haulDistance) && positive(payload)) {
      const topsoilVolume = area.value * topsoilThickness / 1000;
      const excavationVolume = area.value * excavationDepth / 1000;
      const soilMass = excavationVolume * soilDensity;
      const soilTrips = Math.ceil(soilMass / payload);
      const topsoilInput = withArea({ topsoil_thickness_mm: "mm" }, { topsoil_thickness_mm: topsoilThickness });
      const excavationInput = withArea({ subgrade_excavation_depth_mm: "mm" }, { subgrade_excavation_depth_mm: excavationDepth });
      addLine({ row_id: "topsoil_stripping", wbs_code: "02", section: "Земляное полотно", phase: "earthwork", category: "work", name_ru: "Снятие растительного слоя в полосе строительства", action: "снять", action_object: "растительный слой", specification_ru: `Предварительная толщина ${topsoilThickness} мм; фактическая граница устанавливается обследованием и проектом.`, unit_id: "m3", formula_id: "topsoil_stripping_volume", expression: `${areaExpression} * topsoil_thickness_mm / 1000`, input_units: topsoilInput.units, input_values: topsoilInput.values, quantity: topsoilVolume, applicability: "full construction AND earthwork_required", inclusion_reason_ru: "Полный scope включает снятие растительного слоя отдельным физическим объёмом.", exclusion_rule: "Заменить проектной ведомостью земляных масс.", source_ids: ["kg_krer_2015_collection_27"] });
      addLine({ row_id: "subgrade_excavation", wbs_code: "02", section: "Земляное полотно", phase: "earthwork", category: "work", name_ru: "Разработка грунта земляного полотна", action: "разработать", action_object: "грунт земляного полотна", specification_ru: `Предварительная средняя глубина ${excavationDepth} мм; категория грунта и откосы требуют проекта.`, unit_id: "m3", formula_id: "subgrade_excavation_volume", expression: `${areaExpression} * subgrade_excavation_depth_mm / 1000`, input_units: excavationInput.units, input_values: excavationInput.values, quantity: excavationVolume, applicability: "full construction AND earthwork_required", inclusion_reason_ru: "Разработка грунта раскрыта отдельно от погрузки, перемещения и вывоза.", exclusion_rule: "Заменить балансом земляных масс.", source_ids: ["kg_krer_2015_collection_27"] });
      addLine({ row_id: "soil_loading", wbs_code: "02", section: "Земляное полотно", phase: "earthwork", category: "work", name_ru: "Погрузка разработанного грунта в автосамосвалы", action: "погрузить", action_object: "разработанный грунт", specification_ru: "Погрузка только вывозимого объёма; повторная стоимость доставки исключается cost-ownership правилами.", unit_id: "m3", formula_id: "soil_loading_volume", expression: `${areaExpression} * subgrade_excavation_depth_mm / 1000`, input_units: excavationInput.units, input_values: excavationInput.values, quantity: excavationVolume, applicability: "full construction AND excavated soil hauled", inclusion_reason_ru: "Погрузка является отдельной оплачиваемой операцией.", exclusion_rule: "Исключить объём повторного использования на объекте.", source_ids: ["kg_krer_2015_collection_27"], cost_ownership_id: "cost:earthwork:soil_loading" });
      addLine({ row_id: "soil_movement", wbs_code: "02", section: "Земляное полотно", phase: "earthwork", category: "work", name_ru: "Внутриплощадочное перемещение разработанного грунта", action: "переместить", action_object: "разработанный грунт", specification_ru: "Аналитический объём для баланса земляных масс; не оценивается повторно вместе со сплошным вывозом.", unit_id: "m3", formula_id: "soil_movement_volume", expression: `${areaExpression} * subgrade_excavation_depth_mm / 1000`, input_units: excavationInput.units, input_values: excavationInput.values, quantity: excavationVolume, applicability: "full construction preliminary earth balance", inclusion_reason_ru: "Перемещение показано для полноты WBS до подтверждения баланса.", exclusion_rule: "Разделить на повторное использование и вывоз по проекту.", source_ids: ["kg_krer_2015_collection_27"], costing_mode: "ANALYTICAL_ONLY", informational: true, cost_ownership_id: "cost:earthwork:soil_balance" });
      const haulInput = withArea({ subgrade_excavation_depth_mm: "mm", excavated_soil_density_t_m3: "t_m3", earthwork_haul_distance_km: "km" }, { subgrade_excavation_depth_mm: excavationDepth, excavated_soil_density_t_m3: soilDensity, earthwork_haul_distance_km: haulDistance });
      addLine({ row_id: "soil_haul", wbs_code: "02", section: "Логистика", phase: "earthwork", category: "transport", name_ru: "Вывоз разработанного грунта за пределы объекта", action: "вывезти", action_object: "разработанный грунт", specification_ru: `Расчётная плотность ${soilDensity} т/м³; плечо ${haulDistance} км; пункт приёма требует подтверждения.`, unit_id: "t_km", formula_id: "soil_haul_tkm", expression: `${areaExpression} * subgrade_excavation_depth_mm / 1000 * excavated_soil_density_t_m3 * earthwork_haul_distance_km`, input_units: haulInput.units, input_values: haulInput.values, quantity: soilMass * haulDistance, applicability: "full construction AND excavated soil hauled", inclusion_reason_ru: "Транспортная работа рассчитана из массы и явного плеча.", exclusion_rule: "Пересчитать по фактическому балансу и маршруту.", source_ids: ["kg_krer_2015_collection_27"], cost_ownership_id: "cost:earthwork:soil_transport" });
      addLine({ row_id: "soil_trips", wbs_code: "02", section: "Логистика", phase: "earthwork", category: "transport", name_ru: "Рейсы автосамосвалов для вывоза грунта", action: "выполнить рейсы", action_object: "вывоз грунта", specification_ru: `Расчётная масса ${round(soilMass)} т и полезная загрузка ${payload} т/рейс.`, unit_id: "trip", formula_id: "soil_trip_count", expression: "ceil(excavated_soil_mass_t / truck_payload_t)", input_units: { excavated_soil_mass_t: "t", truck_payload_t: "t_trip" }, input_values: { excavated_soil_mass_t: soilMass, truck_payload_t: payload }, quantity: soilTrips, applicability: "full construction AND excavated soil hauled", inclusion_reason_ru: "Рейсы рассчитаны из массы и грузоподъёмности.", exclusion_rule: "Не оценивать повторно, если ставка т·км уже включает транспортный цикл.", source_ids: ["kg_krer_2015_collection_27"], costing_mode: "ANALYTICAL_ONLY", informational: true, cost_ownership_id: "cost:earthwork:soil_transport" });
      addLine({ row_id: "soil_disposal", wbs_code: "02", section: "Услуги", phase: "earthwork", category: "subcontract_service", name_ru: "Приём и утилизация непригодного грунта", action: "утилизировать", action_object: "непригодный грунт", specification_ru: "Место, класс грунта, разрешение и тариф не назначаются без подтверждённого пункта приёма.", unit_id: "m3", formula_id: "soil_disposal_volume", expression: `${areaExpression} * subgrade_excavation_depth_mm / 1000`, input_units: excavationInput.units, input_values: excavationInput.values, quantity: excavationVolume, applicability: "full construction preliminary disposal", inclusion_reason_ru: "Утилизация раскрыта отдельно от транспорта без фиктивной цены.", exclusion_rule: "Исключить объём пригодного повторно используемого грунта.", source_ids: ["eaeu_tr_ts_014_2011"] });
      addLine({ row_id: "earthwork_grading", wbs_code: "02", section: "Земляное полотно", phase: "earthwork", category: "work", name_ru: "Планировка земляного полотна", action: "спланировать", action_object: "земляное полотно", specification_ru: "Планировка поверхности после разработки грунта до профилирования и уплотнения.", unit_id: "m2", formula_id: "earthwork_grading_area", expression: areaExpression, input_units: areaUnits, input_values: areaValues, quantity: area.value, applicability: "full construction", inclusion_reason_ru: "Планировка является атомарной операцией земляного WBS.", exclusion_rule: "Уточнить границы проектом.", source_ids: ["kg_krer_2015_collection_27"] });
      addLine({ row_id: "subgrade_profiling", wbs_code: "02", section: "Земляное полотно", phase: "earthwork", category: "work", name_ru: "Профилирование земляного полотна по отметкам и уклонам", action: "профилировать", action_object: "земляное полотно", specification_ru: "Формирование проектного поперечного и продольного профиля перед уплотнением.", unit_id: "m2", formula_id: "subgrade_profiling_area", expression: areaExpression, input_units: areaUnits, input_values: areaValues, quantity: area.value, applicability: "full construction", inclusion_reason_ru: "Профилирование отделено от планировки и уплотнения.", exclusion_rule: "Уточнить проектным профилем.", source_ids: ["kg_krer_2015_collection_27"] });
      addLine({ row_id: "subgrade_compaction", wbs_code: "02", section: "Земляное полотно", phase: "earthwork", category: "work", name_ru: "Послойное уплотнение земляного полотна", action: "уплотнить", action_object: "земляное полотно", specification_ru: "Требуемый коэффициент уплотнения, влажность и число проходов определяются проектом и пробным участком.", unit_id: "m2", formula_id: "subgrade_compaction_area", expression: areaExpression, input_units: areaUnits, input_values: areaValues, quantity: area.value, applicability: "full construction", inclusion_reason_ru: "Уплотнение раскрыто отдельной физической операцией.", exclusion_rule: "Уточнить послойные объёмы проектом.", source_ids: ["kg_krer_2015_collection_27"] });
      if (positive(densityInterval)) addLine({ row_id: "subgrade_density_control", wbs_code: "02", section: "Контроль качества", phase: "earthwork", category: "testing", name_ru: "Контроль плотности земляного полотна", action: "испытать", action_object: "уплотнённое земляное полотно", specification_ru: `Предварительная периодичность: одна точка на ${densityInterval} м²; метод и критерий — по программе контроля.`, unit_id: "test", formula_id: "subgrade_density_tests", expression: `ceil(${areaExpression} / subgrade_density_test_interval_m2)`, input_units: withArea({ subgrade_density_test_interval_m2: "m2_test" }, { subgrade_density_test_interval_m2: densityInterval }).units, input_values: withArea({ subgrade_density_test_interval_m2: "m2_test" }, { subgrade_density_test_interval_m2: densityInterval }).values, quantity: Math.ceil(area.value / densityInterval), applicability: "full construction", inclusion_reason_ru: "Число точек связано с площадью и явной периодичностью.", exclusion_rule: "Заменить утверждённой программой контроля.", source_ids: ["kg_mtd_road_quality_control"] });

      const machineRows: { row_id: string; name: string; quantity: number; productivity: number; unit: "m3_machine_hour" | "m2_machine_hour"; basis: number; basisUnit: "m3" | "m2"; key: string }[] = [];
      const excavatorProductivity = numericValue(values.get("excavator_productivity_m3_per_machine_hour"));
      const loaderProductivity = numericValue(values.get("loader_productivity_m3_per_machine_hour"));
      const bulldozerProductivity = numericValue(values.get("bulldozer_productivity_m2_per_machine_hour"));
      const subgradeRollerProductivity = numericValue(values.get("subgrade_roller_productivity_m2_per_machine_hour"));
      if (positive(excavatorProductivity)) machineRows.push({ row_id: "excavator", name: "Экскаватор для разработки грунта", quantity: excavationVolume / excavatorProductivity, productivity: excavatorProductivity, unit: "m3_machine_hour", basis: excavationVolume, basisUnit: "m3", key: "excavator_productivity_m3_per_machine_hour" });
      if (positive(loaderProductivity)) machineRows.push({ row_id: "wheel_loader", name: "Фронтальный погрузчик для погрузки грунта", quantity: excavationVolume / loaderProductivity, productivity: loaderProductivity, unit: "m3_machine_hour", basis: excavationVolume, basisUnit: "m3", key: "loader_productivity_m3_per_machine_hour" });
      if (positive(bulldozerProductivity)) machineRows.push({ row_id: "bulldozer", name: "Бульдозер для планировки земляного полотна", quantity: area.value / bulldozerProductivity, productivity: bulldozerProductivity, unit: "m2_machine_hour", basis: area.value, basisUnit: "m2", key: "bulldozer_productivity_m2_per_machine_hour" });
      if (positive(subgradeRollerProductivity)) machineRows.push({ row_id: "subgrade_roller", name: "Грунтовый вибрационный каток для уплотнения земляного полотна", quantity: area.value / subgradeRollerProductivity, productivity: subgradeRollerProductivity, unit: "m2_machine_hour", basis: area.value, basisUnit: "m2", key: "subgrade_roller_productivity_m2_per_machine_hour" });
      for (const machine of machineRows) addLine({ row_id: machine.row_id, wbs_code: "10", section: "Машины", phase: "earthwork", category: "machinery", name_ru: machine.name, action: "эксплуатировать", action_object: machine.name.toLocaleLowerCase("ru-RU"), specification_ru: `Машино-часы рассчитаны по производительности ${machine.productivity} ${machine.unit}; марка и состав парка определяются ППР.`, unit_id: "machine_hour", formula_id: `${machine.row_id}_machine_hours`, expression: `${machine.row_id}_work_quantity / ${machine.key}`, input_units: { [`${machine.row_id}_work_quantity`]: machine.basisUnit, [machine.key]: machine.unit }, input_values: { [`${machine.row_id}_work_quantity`]: machine.basis, [machine.key]: machine.productivity }, quantity: machine.quantity, applicability: "full construction earthwork", inclusion_reason_ru: "Техника рассчитана отдельно по измеримому объёму и производительности.", exclusion_rule: "Не оценивать вместе с комплексной ставкой той же операции.", source_ids: ["kg_krer_2015_collection_27"], cost_ownership_id: `cost:earthwork:${machine.row_id}` });
      const laborStages = [
        { rowId: "preparation_workers", key: "preparation_worker_productivity_m2_per_man_hour", wbs: "01", name: "Затраты труда рабочих подготовительного этапа дорожного строительства", qualification: "Рабочие по подготовке территории и временной организации фронта работ" },
        { rowId: "earthwork_workers", key: "earthwork_worker_productivity_m2_per_man_hour", wbs: "02", name: "Затраты труда рабочих земляного этапа", qualification: "Дорожные рабочие по планировке, профилированию и контролю земляного полотна" },
        { rowId: "base_workers", key: "base_worker_productivity_m2_per_man_hour", wbs: "03", name: "Затраты труда рабочих по устройству подстилающих и щебёночных слоёв", qualification: "Дорожные рабочие по распределению, увлажнению и послойному уплотнению основания" },
      ];
      for (const stage of laborStages) {
        const productivity = numericValue(values.get(stage.key));
        if (!positive(productivity)) continue;
        addLine({ row_id: stage.rowId, wbs_code: stage.wbs, section: "Труд", phase: stage.wbs === "01" ? "preparation" : stage.wbs === "02" ? "earthwork" : "base", category: "labor", name_ru: stage.name, action: "выполнить", action_object: "атомарные операции соответствующего WBS", specification_ru: `${stage.qualification}; состав звена и разряды подтверждаются применимой нормой и ППР.`, unit_id: "man_hour", formula_id: `${stage.rowId}_hours`, expression: `${areaExpression} / ${stage.key}`, input_units: withArea({ [stage.key]: "m2_man_hour" }, { [stage.key]: productivity }).units, input_values: withArea({ [stage.key]: "m2_man_hour" }, { [stage.key]: productivity }).values, quantity: area.value / productivity, applicability: "full construction resource-based costing", inclusion_reason_ru: "Трудозатраты рассчитаны по площади этапа и явной производительности.", exclusion_rule: "Не оценивать одновременно с комплексной ставкой, включающей труд.", source_ids: ["kg_krer_2015_collection_27"], cost_ownership_id: `cost:labor:${stage.rowId}` });
      }
    }
  }

  if (positive(area.value) && scopeProfile === "overlay_on_existing_pavement") addLine({ row_id: "existing_pavement_repairs", wbs_code: "01", section: "Работы", phase: "preparation", category: "work", name_ru: "Локальная подготовка дефектов существующего покрытия перед усилением", action: "подготовить", action_object: "дефекты существующего покрытия", specification_ru: "Очистка, разделка трещин и локальное восстановление учитываются предварительно по площади усиления; фактические карты определяются обследованием.", unit_id: "m2", formula_id: "existing_pavement_repairs_area", expression: areaExpression, input_units: areaUnits, input_values: areaValues, quantity: area.value, applicability: "OVERLAY_ON_EXISTING_PAVEMENT", inclusion_reason_ru: "Усиление требует явной подготовки существующего покрытия.", exclusion_rule: "Заменить дефектной ведомостью.", source_ids: ["kg_mtd_road_quality_control"] });
  if (positive(area.value) && scopeProfile === "local_patch_repair") {
    addLine({ row_id: "local_patch_saw_cutting", wbs_code: "01", section: "Работы", phase: "preparation", category: "work", name_ru: "Оконтуривание карт локального ремонта резкой покрытия", action: "нарезать", action_object: "границы ремонтных карт", specification_ru: "Периметр предварительно не отделён от площади; строка показывает измеримую ремонтную площадь до дефектной ведомости.", unit_id: "m2", formula_id: "local_patch_saw_cutting_basis", expression: areaExpression, input_units: areaUnits, input_values: areaValues, quantity: area.value, applicability: "LOCAL_PATCH_REPAIR", inclusion_reason_ru: "Оконтуривание обязательно для локального ремонта.", exclusion_rule: "Заменить погонной длиной карт после обследования.", source_ids: ["kg_krer_2015_collection_27"] });
    addLine({ row_id: "local_patch_removal", wbs_code: "01", section: "Работы", phase: "preparation", category: "work", name_ru: "Удаление разрушенного покрытия в границах ремонтных карт", action: "удалить", action_object: "разрушенное покрытие", specification_ru: "Глубина удаления принимается равной толщине восстанавливаемого слоя и уточняется дефектной ведомостью.", unit_id: "m2", formula_id: "local_patch_removal_area", expression: areaExpression, input_units: areaUnits, input_values: areaValues, quantity: area.value, applicability: "LOCAL_PATCH_REPAIR", inclusion_reason_ru: "Разрушенный материал удаляется до восстановления карты.", exclusion_rule: "Уточнить глубину и объём вывоза.", source_ids: ["kg_krer_2015_collection_27"] });
    addLine({ row_id: "local_patch_base_preparation", wbs_code: "01", section: "Работы", phase: "preparation", category: "work", name_ru: "Подготовка основания локальных ремонтных карт", action: "подготовить", action_object: "основание ремонтных карт", specification_ru: "Очистка и локальное исправление основания после удаления разрушенного покрытия.", unit_id: "m2", formula_id: "local_patch_base_preparation_area", expression: areaExpression, input_units: areaUnits, input_values: areaValues, quantity: area.value, applicability: "LOCAL_PATCH_REPAIR", inclusion_reason_ru: "Основание карты готовится до нанесения вяжущего.", exclusion_rule: "Заменить дефектной ведомостью.", source_ids: ["kg_krer_2015_collection_27"] });
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
      const compactedVolume = area.value * thickness / 1000;
      const inputs = withArea({ sand_thickness_mm: "mm", sand_compaction_factor: "one", sand_waste_percent: "percent" }, { sand_thickness_mm: thickness, sand_compaction_factor: factor, sand_waste_percent: waste });
      addLine({ row_id: "sand_material", wbs_code: "03", section: "Материалы", phase: "base", category: "material", name_ru: "Песок для подстилающего слоя", action: "поставить", action_object: "песок", specification_ru: `Песок для дорожного основания; соответствие проекту и испытаниям заполнителя; слой ${thickness} мм.`, unit_id: "m3", formula_id: "sand_delivery_volume", expression: `${areaExpression} * sand_thickness_mm / 1000 * sand_compaction_factor * (1 + sand_waste_percent / 100)`, input_units: inputs.units, input_values: inputs.values, quantity, applicability: "sand_layer_required == true", inclusion_reason_ru: "Песчаный слой подтверждён пользователем.", exclusion_rule: "Исключить при sand_layer_required != true.", source_ids: ["kg_krer_2015_collection_27"], price_key: "road_sand_project_spec", procurement: true, waste_coefficient: waste / 100 });
      addLine({ row_id: "sand_placement", wbs_code: "03", section: "Работы", phase: "base", category: "work", name_ru: "Распределение песка подстилающего слоя", action: "распределить", action_object: "песок", specification_ru: `Уплотнённый проектный объём ${round(compactedVolume)} м³ при толщине ${thickness} мм; уплотнение учтено отдельной строкой.`, unit_id: "m3", formula_id: "sand_compacted_volume", expression: `${areaExpression} * sand_thickness_mm / 1000`, input_units: withArea({ sand_thickness_mm: "mm" }, { sand_thickness_mm: thickness }).units, input_values: withArea({ sand_thickness_mm: "mm" }, { sand_thickness_mm: thickness }).values, quantity: compactedVolume, applicability: "sand_layer_required == true", inclusion_reason_ru: "Распределение отделено от увлажнения и уплотнения.", exclusion_rule: "Исключить при sand_layer_required != true.", source_ids: ["kg_krer_2015_collection_27"] });
      const sandDensity = numericValue(values.get("sand_density_t_m3"));
      const sourceDistance = numericValue(values.get("aggregate_source_distance_km"));
      const payload = numericValue(values.get("truck_payload_t"));
      if (positive(sandDensity) && positive(sourceDistance) && positive(payload)) {
        const mass = quantity * sandDensity;
        addLine({ row_id: "sand_delivery", wbs_code: "03", section: "Логистика", phase: "base", category: "transport", name_ru: "Доставка песка для подстилающего слоя", action: "доставить", action_object: "песок", specification_ru: `Расчётная насыпная плотность ${sandDensity} т/м³; плечо поставки ${sourceDistance} км.`, unit_id: "t_km", formula_id: "sand_delivery_tkm", expression: "sand_material_m3 * sand_density_t_m3 * aggregate_source_distance_km", input_units: { sand_material_m3: "m3", sand_density_t_m3: "t_m3", aggregate_source_distance_km: "km" }, input_values: { sand_material_m3: quantity, sand_density_t_m3: sandDensity, aggregate_source_distance_km: sourceDistance }, quantity: mass * sourceDistance, applicability: "sand_layer_required == true", inclusion_reason_ru: "Доставка песка рассчитана отдельно по массе и плечу.", exclusion_rule: "Пересчитать после выбора карьера и поставщика.", source_ids: ["kg_krer_2015_collection_27"], cost_ownership_id: "cost:base:sand_transport" });
        addLine({ row_id: "sand_trips", wbs_code: "03", section: "Логистика", phase: "base", category: "transport", name_ru: "Рейсы автосамосвалов для доставки песка", action: "выполнить рейсы", action_object: "доставку песка", specification_ru: `Масса ${round(mass)} т; полезная загрузка ${payload} т/рейс.`, unit_id: "trip", formula_id: "sand_trip_count", expression: "ceil(sand_mass_t / truck_payload_t)", input_units: { sand_mass_t: "t", truck_payload_t: "t_trip" }, input_values: { sand_mass_t: mass, truck_payload_t: payload }, quantity: Math.ceil(mass / payload), applicability: "sand_layer_required == true", inclusion_reason_ru: "Рейсы рассчитаны из массы и грузоподъёмности.", exclusion_rule: "Аналитическая строка не оценивается повторно вместе с т·км.", source_ids: ["kg_krer_2015_collection_27"], costing_mode: "ANALYTICAL_ONLY", informational: true, cost_ownership_id: "cost:base:sand_transport" });
      }
      const waterRate = numericValue(values.get("sand_water_rate_m3_m3"));
      if (positive(waterRate)) {
        const waterQuantity = compactedVolume * waterRate;
        addLine({ row_id: "sand_moistening_water", wbs_code: "03", section: "Материалы", phase: "base", category: "material", name_ru: "Технологическая вода для увлажнения песчаного слоя", action: "поставить", action_object: "технологическую воду", specification_ru: `Предварительная норма ${waterRate} м³ воды на 1 м³ уплотнённого песка; фактическая влажность определяется лабораторно.`, unit_id: "m3", formula_id: "sand_moistening_water_quantity", expression: "sand_compacted_volume_m3 * sand_water_rate_m3_m3", input_units: { sand_compacted_volume_m3: "m3", sand_water_rate_m3_m3: "one" }, input_values: { sand_compacted_volume_m3: compactedVolume, sand_water_rate_m3_m3: waterRate }, quantity: waterQuantity, applicability: "sand_layer_required == true", inclusion_reason_ru: "Вода является отдельным физическим ресурсом.", exclusion_rule: "Пересчитать по фактической влажности песка.", source_ids: ["kg_krer_2015_collection_27"], price_key: "technical_water_project_source", procurement: true });
        addLine({ row_id: "sand_moistening", wbs_code: "03", section: "Работы", phase: "base", category: "work", name_ru: "Увлажнение песчаного слоя до оптимальной влажности", action: "увлажнить", action_object: "песчаный слой", specification_ru: "Равномерное распределение технологической воды перед уплотнением; объём воды показан отдельной материальной строкой.", unit_id: "m3", formula_id: "sand_moistening_work", expression: "sand_moistening_water_m3", input_units: { sand_moistening_water_m3: "m3" }, input_values: { sand_moistening_water_m3: waterQuantity }, quantity: waterQuantity, applicability: "sand_layer_required == true", inclusion_reason_ru: "Увлажнение отделено от распределения и уплотнения.", exclusion_rule: "Исключить только при подтверждённой естественной оптимальной влажности.", source_ids: ["kg_krer_2015_collection_27"] });
      }
      addLine({ row_id: "sand_compaction", wbs_code: "03", section: "Работы", phase: "base", category: "work", name_ru: "Послойное уплотнение песчаного слоя", action: "уплотнить", action_object: "песчаный слой", specification_ru: "Послойное уплотнение до проектного коэффициента; число проходов определяется пробным участком.", unit_id: "m2", formula_id: "sand_compaction_area", expression: areaExpression, input_units: areaUnits, input_values: areaValues, quantity: area.value, applicability: "sand_layer_required == true", inclusion_reason_ru: "Уплотнение выделено самостоятельной операцией.", exclusion_rule: "Исключить при sand_layer_required != true.", source_ids: ["kg_krer_2015_collection_27"] });
      const baseTestInterval = numericValue(values.get("base_density_test_interval_m2"));
      if (positive(baseTestInterval)) {
        const testInput = withArea({ base_density_test_interval_m2: "m2_test" }, { base_density_test_interval_m2: baseTestInterval });
        const testCount = Math.ceil(area.value / baseTestInterval);
        addLine({ row_id: "sand_thickness_control", wbs_code: "03", section: "Контроль качества", phase: "base", category: "testing", name_ru: "Контроль толщины песчаного слоя", action: "измерить", action_object: "толщину песчаного слоя", specification_ru: `Предварительная периодичность одна точка на ${baseTestInterval} м².`, unit_id: "test", formula_id: "sand_thickness_tests", expression: `ceil(${areaExpression} / base_density_test_interval_m2)`, input_units: testInput.units, input_values: testInput.values, quantity: testCount, applicability: "sand_layer_required == true", inclusion_reason_ru: "Количество измерений связано с площадью.", exclusion_rule: "Заменить программой контроля.", source_ids: ["kg_mtd_road_quality_control"] });
        addLine({ row_id: "sand_density_control", wbs_code: "03", section: "Контроль качества", phase: "base", category: "testing", name_ru: "Контроль плотности песчаного слоя", action: "испытать", action_object: "уплотнённый песчаный слой", specification_ru: `Предварительная периодичность одна точка на ${baseTestInterval} м².`, unit_id: "test", formula_id: "sand_density_tests", expression: `ceil(${areaExpression} / base_density_test_interval_m2)`, input_units: testInput.units, input_values: testInput.values, quantity: testCount, applicability: "sand_layer_required == true", inclusion_reason_ru: "Количество испытаний связано с площадью.", exclusion_rule: "Заменить утверждённой программой контроля.", source_ids: ["kg_mtd_road_quality_control"] });
      }
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
    const fractionLabelRu = choiceLabel("crushed_layers", layer.fraction) ?? "по проектной спецификации";
    addLine({ row_id: `${prefix}_material`, wbs_code: "03", section: "Материалы", phase: "base", category: "material", name_ru: `Щебень ${fractionLabelRu} для ${layerRoleRu(layer.position, crushedLayers.length)} основания`, action: "поставить", action_object: "щебень", specification_ru: `Фракция ${fractionLabelRu}; проектная толщина ${layer.thickness_mm} мм; коэффициент к уплотнённому объёму ${layer.compaction_factor}; технологический запас ${layer.waste_percent} %; соответствие — по проекту и испытаниям заполнителя.`, unit_id: "m3", formula_id: `${prefix}_delivery_volume`, expression: `${areaExpression} * ${prefix}_thickness_mm / 1000 * ${prefix}_compaction_factor * (1 + ${prefix}_waste_percent / 100)`, input_units: input.units, input_values: input.values, quantity: delivery, applicability: `crushed layer ${layer.position} confirmed`, inclusion_reason_ru: `Подтверждён щебёночный слой ${layer.position}.`, exclusion_rule: "Исключить при отсутствии подтверждённой толщины, фракции или коэффициентов.", source_ids: ["kg_krer_2015_collection_27"], price_key: `road_crushed_${layer.fraction}`, procurement: true, waste_coefficient: layer.waste_percent / 100 });
    addLine({ row_id: `${prefix}_placement`, wbs_code: "04", section: "Работы", phase: "base", category: "work", name_ru: `Распределение щебня слоя основания ${layer.position}`, action: "распределить", action_object: "щебень", specification_ru: `Фракция: ${fractionLabelRu}; проектная толщина после уплотнения ${layer.thickness_mm} мм; уплотнение учтено отдельно.`, unit_id: "m3", formula_id: `${prefix}_compacted_volume`, expression: `${areaExpression} * ${prefix}_thickness_mm / 1000`, input_units: withArea({ [`${prefix}_thickness_mm`]: "mm" }, { [`${prefix}_thickness_mm`]: layer.thickness_mm }).units, input_values: withArea({ [`${prefix}_thickness_mm`]: "mm" }, { [`${prefix}_thickness_mm`]: layer.thickness_mm }).values, quantity: compacted, applicability: `crushed layer ${layer.position} confirmed`, inclusion_reason_ru: `Распределение слоя ${layer.position} отделено от профилирования и уплотнения.`, exclusion_rule: "Исключить при отсутствии слоя.", source_ids: ["kg_krer_2015_collection_27"] });
    const crushedDensity = numericValue(values.get("crushed_density_t_m3"));
    const sourceDistance = numericValue(values.get("aggregate_source_distance_km"));
    const payload = numericValue(values.get("truck_payload_t"));
    if (positive(crushedDensity) && positive(sourceDistance) && positive(payload)) {
      const mass = delivery * crushedDensity;
      addLine({ row_id: `${prefix}_delivery`, wbs_code: "04", section: "Логистика", phase: "base", category: "transport", name_ru: `Доставка щебня слоя основания ${layer.position}`, action: "доставить", action_object: "щебень", specification_ru: `Фракция ${fractionLabelRu}; насыпная плотность ${crushedDensity} т/м³; плечо ${sourceDistance} км.`, unit_id: "t_km", formula_id: `${prefix}_delivery_tkm`, expression: `${prefix}_material_m3 * crushed_density_t_m3 * aggregate_source_distance_km`, input_units: { [`${prefix}_material_m3`]: "m3", crushed_density_t_m3: "t_m3", aggregate_source_distance_km: "km" }, input_values: { [`${prefix}_material_m3`]: delivery, crushed_density_t_m3: crushedDensity, aggregate_source_distance_km: sourceDistance }, quantity: mass * sourceDistance, applicability: `crushed layer ${layer.position} confirmed`, inclusion_reason_ru: "Доставка каждой фракции рассчитана отдельно.", exclusion_rule: "Пересчитать после выбора карьера и маршрута.", source_ids: ["kg_krer_2015_collection_27"], cost_ownership_id: `cost:base:${prefix}:transport` });
      addLine({ row_id: `${prefix}_trips`, wbs_code: "04", section: "Логистика", phase: "base", category: "transport", name_ru: `Рейсы автосамосвалов для щебня слоя ${layer.position}`, action: "выполнить рейсы", action_object: "доставку щебня", specification_ru: `Расчётная масса ${round(mass)} т; загрузка ${payload} т/рейс.`, unit_id: "trip", formula_id: `${prefix}_trip_count`, expression: `ceil(${prefix}_mass_t / truck_payload_t)`, input_units: { [`${prefix}_mass_t`]: "t", truck_payload_t: "t_trip" }, input_values: { [`${prefix}_mass_t`]: mass, truck_payload_t: payload }, quantity: Math.ceil(mass / payload), applicability: `crushed layer ${layer.position} confirmed`, inclusion_reason_ru: "Рейсы рассчитаны из массы и загрузки.", exclusion_rule: "Аналитическая строка не оценивается повторно вместе с т·км.", source_ids: ["kg_krer_2015_collection_27"], costing_mode: "ANALYTICAL_ONLY", informational: true, cost_ownership_id: `cost:base:${prefix}:transport` });
    }
    const layerAreaInput = withArea({ [`${prefix}_thickness_mm`]: "mm" }, { [`${prefix}_thickness_mm`]: layer.thickness_mm });
    addLine({ row_id: `${prefix}_profiling`, wbs_code: "04", section: "Работы", phase: "base", category: "work", name_ru: `Профилирование щебёночного слоя ${layer.position}`, action: "профилировать", action_object: "щебёночный слой", specification_ru: "Формирование проектных отметок, поперечного уклона и ровности до уплотнения.", unit_id: "m2", formula_id: `${prefix}_profiling_area`, expression: areaExpression, input_units: layerAreaInput.units, input_values: layerAreaInput.values, quantity: area.value, applicability: `crushed layer ${layer.position} confirmed`, inclusion_reason_ru: "Профилирование раскрыто атомарно.", exclusion_rule: "Исключить при отсутствии слоя.", source_ids: ["kg_krer_2015_collection_27"] });
    addLine({ row_id: `${prefix}_keying`, wbs_code: "04", section: "Работы", phase: "base", category: "work", name_ru: `Расклинцовка щебёночного слоя ${layer.position}`, action: "расклинцевать", action_object: "щебёночный слой", specification_ru: "Необходимость и материал расклинцовки подтверждаются проектной конструкцией; предварительно показан измеримый фронт работ без придуманной отдельной фракции.", unit_id: "m2", formula_id: `${prefix}_keying_area`, expression: areaExpression, input_units: layerAreaInput.units, input_values: layerAreaInput.values, quantity: area.value, applicability: `crushed layer ${layer.position} full base assembly`, inclusion_reason_ru: "Расклинцовка проверяется как отдельный WBS-узел.", exclusion_rule: "Исключить либо заменить материальной нормой по проекту.", source_ids: ["kg_krer_2015_collection_27"], costing_mode: "ANALYTICAL_ONLY", informational: true });
    const waterRate = numericValue(values.get("crushed_water_rate_m3_m3"));
    if (positive(waterRate)) {
      const waterQuantity = compacted * waterRate;
      addLine({ row_id: `${prefix}_moistening_water`, wbs_code: "04", section: "Материалы", phase: "base", category: "material", name_ru: `Технологическая вода для щебёночного слоя ${layer.position}`, action: "поставить", action_object: "технологическую воду", specification_ru: `Предварительная норма ${waterRate} м³/м³ уплотнённого слоя; корректируется по влажности материала.`, unit_id: "m3", formula_id: `${prefix}_moistening_water_quantity`, expression: `${prefix}_compacted_m3 * crushed_water_rate_m3_m3`, input_units: { [`${prefix}_compacted_m3`]: "m3", crushed_water_rate_m3_m3: "one" }, input_values: { [`${prefix}_compacted_m3`]: compacted, crushed_water_rate_m3_m3: waterRate }, quantity: waterQuantity, applicability: `crushed layer ${layer.position} confirmed`, inclusion_reason_ru: "Технологическая вода выделена физическим ресурсом.", exclusion_rule: "Пересчитать по фактической влажности.", source_ids: ["kg_krer_2015_collection_27"], price_key: "technical_water_project_source", procurement: true });
      addLine({ row_id: `${prefix}_moistening`, wbs_code: "04", section: "Работы", phase: "base", category: "work", name_ru: `Увлажнение щебёночного слоя ${layer.position}`, action: "увлажнить", action_object: "щебёночный слой", specification_ru: "Равномерное увлажнение перед уплотнением; вода учтена отдельной материальной строкой.", unit_id: "m3", formula_id: `${prefix}_moistening_work`, expression: `${prefix}_water_m3`, input_units: { [`${prefix}_water_m3`]: "m3" }, input_values: { [`${prefix}_water_m3`]: waterQuantity }, quantity: waterQuantity, applicability: `crushed layer ${layer.position} confirmed`, inclusion_reason_ru: "Увлажнение отделено от уплотнения.", exclusion_rule: "Исключить при подтверждённой оптимальной влажности без добавления воды.", source_ids: ["kg_krer_2015_collection_27"] });
    }
    addLine({ row_id: `${prefix}_compaction`, wbs_code: "04", section: "Работы", phase: "base", category: "work", name_ru: `Послойное уплотнение щебёночного слоя ${layer.position}`, action: "уплотнить", action_object: "щебёночный слой", specification_ru: "Число проходов, влажность и требуемый коэффициент подтверждаются пробным участком и проектом.", unit_id: "m2", formula_id: `${prefix}_compaction_area`, expression: areaExpression, input_units: layerAreaInput.units, input_values: layerAreaInput.values, quantity: area.value, applicability: `crushed layer ${layer.position} confirmed`, inclusion_reason_ru: "Уплотнение выделено самостоятельной операцией.", exclusion_rule: "Исключить при отсутствии слоя.", source_ids: ["kg_krer_2015_collection_27"] });
    const testInterval = numericValue(values.get("base_density_test_interval_m2"));
    if (positive(testInterval)) {
      const tests = Math.ceil(area.value / testInterval);
      const testInput = withArea({ base_density_test_interval_m2: "m2_test" }, { base_density_test_interval_m2: testInterval });
      addLine({ row_id: `${prefix}_elevation_control`, wbs_code: "04", section: "Контроль качества", phase: "base", category: "testing", name_ru: `Контроль отметок и толщины щебёночного слоя ${layer.position}`, action: "измерить", action_object: "отметки и толщину слоя", specification_ru: `Предварительная периодичность одна точка на ${testInterval} м².`, unit_id: "test", formula_id: `${prefix}_elevation_tests`, expression: `ceil(${areaExpression} / base_density_test_interval_m2)`, input_units: testInput.units, input_values: testInput.values, quantity: tests, applicability: `crushed layer ${layer.position} confirmed`, inclusion_reason_ru: "Количество точек связано с площадью слоя.", exclusion_rule: "Заменить программой геодезического контроля.", source_ids: ["kg_mtd_road_quality_control"] });
      addLine({ row_id: `${prefix}_density_control`, wbs_code: "04", section: "Контроль качества", phase: "base", category: "testing", name_ru: `Контроль плотности щебёночного слоя ${layer.position}`, action: "испытать", action_object: "уплотнённый щебёночный слой", specification_ru: `Предварительная периодичность одна точка на ${testInterval} м².`, unit_id: "test", formula_id: `${prefix}_density_tests`, expression: `ceil(${areaExpression} / base_density_test_interval_m2)`, input_units: testInput.units, input_values: testInput.values, quantity: tests, applicability: `crushed layer ${layer.position} confirmed`, inclusion_reason_ru: "Количество испытаний связано с площадью слоя.", exclusion_rule: "Заменить утверждённой программой контроля.", source_ids: ["kg_mtd_road_quality_control"] });
    }
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
      const layerWbs = layer.position === 1 ? "05" : "06";
      addLine({ row_id: `${prefix}_paving`, wbs_code: layerWbs, section: "Работы", phase: "pavement", category: "work", name_ru: `Механизированная укладка ${role} асфальтобетонного покрытия`, action: "уложить", action_object: "асфальтобетонный слой", specification_ru: `Проектная толщина ${layer.thickness_mm} мм; температурный режим и непрерывность подачи подтверждаются ППР/техкартой.`, unit_id: "m2", formula_id: `${prefix}_paving_area`, expression: areaExpression, input_units: areaUnits, input_values: areaValues, quantity: area.value, applicability: `asphalt layer ${layer.position} thickness confirmed`, inclusion_reason_ru: `Наличие и толщина слоя ${layer.position} определены сборкой или пользователем.`, exclusion_rule: "Исключить при отсутствии слоя или его толщины.", source_ids: ["kg_krer_2015_collection_27"] });
      addLine({ row_id: `${prefix}_preliminary_compaction`, wbs_code: layerWbs, section: "Работы", phase: "pavement", category: "work", name_ru: `Предварительное уплотнение ${role} асфальтобетонного покрытия`, action: "предварительно уплотнить", action_object: "асфальтобетонный слой", specification_ru: "Режим проходов и температура уплотнения уточняются технологической картой.", unit_id: "m2", formula_id: `${prefix}_preliminary_compaction_area`, expression: areaExpression, input_units: areaUnits, input_values: areaValues, quantity: area.value, applicability: `asphalt layer ${layer.position} confirmed`, inclusion_reason_ru: `Предварительное уплотнение относится ко всей площади слоя ${layer.position}.`, exclusion_rule: "Исключить при отсутствии слоя.", source_ids: ["kg_krer_2015_collection_27"] });
      addLine({ row_id: `${prefix}_main_compaction`, wbs_code: layerWbs, section: "Работы", phase: "pavement", category: "work", name_ru: `Основное уплотнение ${role} асфальтобетонного покрытия`, action: "уплотнить", action_object: "асфальтобетонный слой", specification_ru: "Основное уплотнение до проектной плотности; число проходов — по пробному участку/техкарте.", unit_id: "m2", formula_id: `${prefix}_main_compaction_area`, expression: areaExpression, input_units: areaUnits, input_values: areaValues, quantity: area.value, applicability: `asphalt layer ${layer.position} confirmed`, inclusion_reason_ru: `Основное уплотнение относится ко всей площади слоя ${layer.position}.`, exclusion_rule: "Исключить при отсутствии слоя.", source_ids: ["kg_krer_2015_collection_27"] });
      addLine({ row_id: `${prefix}_final_compaction`, wbs_code: layerWbs, section: "Работы", phase: "pavement", category: "work", name_ru: `Окончательное уплотнение ${role} асфальтобетонного покрытия`, action: "окончательно уплотнить", action_object: "асфальтобетонный слой", specification_ru: "Окончательное уплотнение и устранение следов проходов в допустимом температурном диапазоне.", unit_id: "m2", formula_id: `${prefix}_final_compaction_area`, expression: areaExpression, input_units: areaUnits, input_values: areaValues, quantity: area.value, applicability: `asphalt layer ${layer.position} confirmed`, inclusion_reason_ru: `Окончательное уплотнение относится ко всей площади слоя ${layer.position}.`, exclusion_rule: "Исключить при отсутствии слоя.", source_ids: ["kg_krer_2015_collection_27"] });
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
    const mixtureLabel = choiceLabel("asphalt_layers", layer.mixture_type) ?? layer.mixture_type;
    addLine({ row_id: materialRowId, wbs_code: layer.position === 1 ? "05" : "06", section: "Материалы", phase: "pavement", category: "material", name_ru: mixtureLabel, action: "поставить", action_object: "асфальтобетонную смесь", specification_ru: `Назначение слоя: ${layerRoleRu(layer.position, asphaltLayers.length)}; профессиональная спецификация: ${mixtureLabel}; точная марка/класс и применимый стандарт — по проекту; статус: SPECIFICATION_REQUIRES_PROJECT_CONFIRMATION; проектная толщина ${layer.thickness_mm} мм; расчётная плотность ${layer.density_t_m3} т/м³; технологический запас ${layer.waste_percent} %.`, unit_id: "t", formula_id: `${prefix}_mass`, expression: `${areaExpression} * ${prefix}_thickness_mm / 1000 * ${prefix}_density_t_m3 * (1 + ${prefix}_waste_percent / 100)`, input_units: input.units, input_values: input.values, quantity, applicability: `asphalt layer ${layer.position} confirmed`, inclusion_reason_ru: `Подтверждены назначение, предварительный тип, толщина, плотность и запас слоя ${layer.position}; точная марка остаётся проектным выбором.`, exclusion_rule: "Исключить при неполной спецификации слоя.", source_ids: ["kg_krer_2015_collection_27"], price_key: `asphalt_mix_${layer.mixture_type}`, procurement: true, waste_coefficient: layer.waste_percent / 100, specification_status: "SPECIFICATION_REQUIRES_PROJECT_CONFIRMATION" });
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
    addLine({ row_id: "longitudinal_joints", wbs_code: "06", section: "Работы", phase: "pavement", category: "work", name_ru: "Устройство продольных стыков асфальтобетонного покрытия", action: "устроить", action_object: "продольные стыки", specification_ru: `Предварительная схема полос принята по рабочей ширине ${paverWorkingWidth} м; герметизация учтена отдельной строкой.`, unit_id: "m", formula_id: "longitudinal_joint_length", expression: `${areaExpression} / paver_working_width_m`, input_units: withArea({ paver_working_width_m: "m" }, { paver_working_width_m: paverWorkingWidth }).units, input_values: withArea({ paver_working_width_m: "m" }, { paver_working_width_m: paverWorkingWidth }).values, quantity: longitudinalLength, applicability: "pavement_assembly_selected", inclusion_reason_ru: "Длина получена из площади и принятой рабочей ширины укладки.", exclusion_rule: "Пересчитать после утверждения схемы полос.", source_ids: ["kg_krer_2015_collection_27"] });
    addLine({ row_id: "transverse_joints", wbs_code: "06", section: "Работы", phase: "pavement", category: "work", name_ru: "Устройство поперечных стыков асфальтобетонного покрытия", action: "устроить", action_object: "поперечные стыки", specification_ru: `Предварительная длина технологической захватки ${pavingShiftLength} м; герметизация учтена отдельной строкой.`, unit_id: "m", formula_id: "transverse_joint_length", expression: `${areaExpression} / paving_shift_length_m`, input_units: withArea({ paving_shift_length_m: "m" }, { paving_shift_length_m: pavingShiftLength }).units, input_values: withArea({ paving_shift_length_m: "m" }, { paving_shift_length_m: pavingShiftLength }).values, quantity: transverseLength, applicability: "pavement_assembly_selected", inclusion_reason_ru: "Длина получена из площади и принятой длины технологической захватки.", exclusion_rule: "Пересчитать после утверждения графика захваток.", source_ids: ["kg_krer_2015_collection_27"] });
    addLine({ row_id: "joint_sealing_material", wbs_code: "04", section: "Материалы", phase: "pavement", category: "material", name_ru: "Материал для герметизации продольных и поперечных стыков", action: "поставить", action_object: "материал для герметизации стыков", specification_ru: "Тип материала и поперечное сечение — по проекту/техкарте; предварительная закупочная единица — метр обрабатываемого стыка.", unit_id: "m", formula_id: "joint_sealing_material_length", expression: "longitudinal_joint_length_m + transverse_joint_length_m", input_units: { longitudinal_joint_length_m: "m", transverse_joint_length_m: "m" }, input_values: { longitudinal_joint_length_m: longitudinalLength, transverse_joint_length_m: transverseLength }, quantity: longitudinalLength + transverseLength, applicability: "pavement_joints_present", inclusion_reason_ru: "Материал привязан к рассчитанной суммарной длине стыков.", exclusion_rule: "Заменить расходом конкретного материала после выбора спецификации.", source_ids: ["engineering_assumption:asphalt-preliminary-assembly:v1:paver_working_width_m"], price_key: "asphalt_joint_sealing_material_project_spec", procurement: true });
    addLine({ row_id: "joint_sealing_application", wbs_code: "06", section: "Работы", phase: "pavement", category: "work", name_ru: "Герметизация продольных и поперечных стыков покрытия", action: "герметизировать", action_object: "стыки покрытия", specification_ru: "Очистка и нанесение выбранного герметизирующего материала по техкарте; материал учтён отдельной закупочной строкой.", unit_id: "m", formula_id: "joint_sealing_application_length", expression: "longitudinal_joint_length_m + transverse_joint_length_m", input_units: { longitudinal_joint_length_m: "m", transverse_joint_length_m: "m" }, input_values: { longitudinal_joint_length_m: longitudinalLength, transverse_joint_length_m: transverseLength }, quantity: longitudinalLength + transverseLength, applicability: "pavement_joints_present", inclusion_reason_ru: "Герметизация отделена от устройства стыков и материала.", exclusion_rule: "Пересчитать по утверждённой схеме стыков.", source_ids: ["kg_krer_2015_collection_27"] });
    addLine({ row_id: "edge_treatment", wbs_code: "04", section: "Работы", phase: "pavement", category: "work", name_ru: "Обработка кромок перед устройством стыков покрытия", action: "обработать", action_object: "кромки асфальтобетонных полос и захваток", specification_ru: "Очистка, выравнивание и подготовка кромок перед сопряжением и герметизацией; длина привязана к рассчитанным продольным и поперечным стыкам.", unit_id: "m", formula_id: "edge_treatment_length", expression: "longitudinal_joint_length_m + transverse_joint_length_m", input_units: { longitudinal_joint_length_m: "m", transverse_joint_length_m: "m" }, input_values: { longitudinal_joint_length_m: longitudinalLength, transverse_joint_length_m: transverseLength }, quantity: longitudinalLength + transverseLength, applicability: "pavement_joints_present", inclusion_reason_ru: "Обработка кромок является отдельной операцией, предшествующей устройству стыков.", exclusion_rule: "Пересчитать по утверждённой схеме полос и захваток.", source_ids: ["kg_krer_2015_collection_27"] });
  }

  if (positive(area.value)) {
    const laborProductivity = numericValue(values.get("road_worker_productivity_m2_per_man_hour"));
    if (positive(laborProductivity)) {
      const input = withArea({ road_worker_productivity_m2_per_man_hour: "m2_man_hour" }, { road_worker_productivity_m2_per_man_hour: laborProductivity });
      addLine({ row_id: "road_workers", wbs_code: "09", section: "Труд", phase: "pavement", category: "labor", name_ru: "Затраты труда дорожных рабочих асфальтобетонного потока", action: "выполнить", action_object: "укладку, стыки и вспомогательные операции покрытия", specification_ru: "Квалификация, разряды и состав звена определяются применимой нормой и ППР; строка относится только к асфальтобетонному этапу.", unit_id: "man_hour", formula_id: "road_worker_hours", expression: `${areaExpression} / road_worker_productivity_m2_per_man_hour`, input_units: input.units, input_values: input.values, quantity: area.value / laborProductivity, applicability: "confirmed_labor_productivity", inclusion_reason_ru: "Трудозатраты асфальтобетонного потока рассчитаны по площади и производительности.", exclusion_rule: "Не оценивать одновременно с комплексной ставкой, включающей труд.", source_ids: ["kg_krer_2015_collection_27"], productivity: laborProductivity, cost_ownership_id: "cost:labor:asphalt_pavement" });
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
      addAreaMachine({ key: "base_roller_productivity_m2_per_machine_hour", rowId: "base_roller", title: "Вибрационный каток для уплотнения подстилающих и щебёночных слоёв", coverageArea: area.value * Math.max(1, crushedLayers.length + (sandRequired === true ? 1 : 0)), phase: "base", wbs: "04" });
      addAreaMachine({ key: "water_truck_productivity_m2_per_machine_hour", rowId: "water_truck", title: "Поливомоечная машина для увлажнения слоёв основания", coverageArea: area.value * Math.max(1, crushedLayers.length + (sandRequired === true ? 1 : 0)), phase: "base", wbs: "04" });
    }
  }

  if (positive(millingVolume)) {
    addLine({ row_id: "milled_material_loading", wbs_code: "02", section: "Работы", phase: "preparation", category: "work", name_ru: "Погрузка фрезерованного асфальтобетона", action: "погрузить", action_object: "фрезерованный материал", specification_ru: "Погрузка снятого материала в транспорт отдельно от фрезерования и перевозки.", unit_id: "m3", formula_id: "milled_material_loading_volume", expression: "milling_volume_m3", input_units: { milling_volume_m3: "m3" }, input_values: { milling_volume_m3: millingVolume }, quantity: millingVolume, applicability: "milling_required == true", inclusion_reason_ru: "После фрезерования материал должен быть погружен для вывоза.", exclusion_rule: "Исключить при подтверждённом повторном использовании без погрузки.", source_ids: ["kg_krer_2015_collection_27"] });
    const millingProductivity = numericValue(values.get("milling_productivity_m3_per_machine_hour"));
    if (positive(millingProductivity)) {
      addLine({ row_id: "milling_machine", wbs_code: "02", section: "Машины", phase: "preparation", category: "machinery", name_ru: "Дорожная фреза", action: "эксплуатировать", action_object: "дорожную фрезу", specification_ru: "Ширина барабана и производительность подтверждаются ППР для заданной глубины и покрытия.", unit_id: "machine_hour", formula_id: "milling_machine_hours", expression: "milling_volume_m3 / milling_productivity_m3_per_machine_hour", input_units: { milling_volume_m3: "m3", milling_productivity_m3_per_machine_hour: "m3_machine_hour" }, input_values: { milling_volume_m3: millingVolume, milling_productivity_m3_per_machine_hour: millingProductivity }, quantity: millingVolume / millingProductivity, applicability: "milling_required == true AND confirmed_productivity", inclusion_reason_ru: "Фрезерование и производительность фрезы подтверждены.", exclusion_rule: "Исключить без фрезерования или производительности.", source_ids: ["kg_krer_2015_collection_27"], productivity: millingProductivity });
    } else requireExpert("milling", "MISSING_MILLING_MACHINE_PRODUCTIVITY");
    const disposalDistance = numericValue(values.get("disposal_distance_km"));
    if (nonNegative(disposalDistance)) {
      addLine({ row_id: "milled_material_transport", wbs_code: "07", section: "Транспорт", phase: "logistics", category: "transport", name_ru: "Перевозка снятого асфальтобетона", action: "перевезти", action_object: "снятый асфальтобетон", specification_ru: `Маршрут и место приёмки подтверждаются; расстояние ${disposalDistance} км.`, unit_id: "m3_km", formula_id: "milled_material_transport_work", expression: "milling_volume_m3 * disposal_distance_km", input_units: { milling_volume_m3: "m3", disposal_distance_km: "km" }, input_values: { milling_volume_m3: millingVolume, disposal_distance_km: disposalDistance }, quantity: millingVolume * disposalDistance, applicability: "milling_required == true AND disposal_distance_confirmed", inclusion_reason_ru: "Подтверждены объём фрезерования и расстояние вывоза.", exclusion_rule: "Исключить без фрезерования или подтверждённого маршрута.", source_ids: ["kg_krer_2015_collection_27"] });
      addLine({ row_id: "milled_material_disposal", wbs_code: "07", section: "Услуги", phase: "logistics", category: "subcontract_service", name_ru: "Приём и утилизация фрезерованного асфальтобетона", action: "передать", action_object: "фрезерованный материал", specification_ru: "Пункт приёма и способ обращения подтверждаются до назначения цены; повторное использование учитывается отдельным решением.", unit_id: "m3", formula_id: "milled_material_disposal_volume", expression: "milling_volume_m3", input_units: { milling_volume_m3: "m3" }, input_values: { milling_volume_m3: millingVolume }, quantity: millingVolume, applicability: "milling_required == true", inclusion_reason_ru: "Утилизация раскрыта отдельно от перевозки.", exclusion_rule: "Исключить при подтверждённом повторном использовании.", source_ids: ["eaeu_tr_ts_014_2011"] });
    } else requireExpert("milling", "MISSING_MILLING_DISPOSAL_DISTANCE");
  }

  const fullRoadInfrastructure = scopeProfile === "new_full_road_infrastructure";
  if (fullRoadInfrastructure) {
    const fullRoadInput = {
      area_m2: area.value,
      length_m: quantityBasis.length_m,
      values,
    };
    for (const infrastructureLine of buildAsphaltFullRoadInfrastructureAssemblyV4(fullRoadInput)) addLine(infrastructureLine);
    for (const expandedLine of buildAsphaltFullRoadExpandedBoqV4(fullRoadInput)) addLine(expandedLine);
  }

  const curbRequired = booleanValue(values.get("curb_required"));
  const curbType = stringValue(values.get("curb_type"));
  const curbLength = numericValue(values.get("curb_length_m"));
  if (!fullRoadInfrastructure && curbRequired === true && positive(curbLength) && curbType) {
    const common = { expression: "curb_length_m", input_units: { curb_length_m: "m" }, input_values: { curb_length_m: curbLength }, quantity: curbLength };
    const specification = `Тип: ${choiceLabel("curb_type", curbType) ?? curbType}; геометрия, класс бетона, прочность и морозостойкость — по проектной спецификации.`;
    addLine({ row_id: "curb_material", wbs_code: "05", section: "Материалы", phase: "road_furniture", category: "material", name_ru: "Бортовой камень", action: "поставить", action_object: "бортовой камень", specification_ru: specification, unit_id: "m", formula_id: "curb_material_length", ...common, applicability: "curb_required == true AND curb_type confirmed AND curb_length_m > 0", inclusion_reason_ru: "Пользователь подтвердил бортовой камень, его тип и длину.", exclusion_rule: "Исключить без явного подтверждения, типа или положительной длины.", source_ids: ["kg_krer_2015_collection_27"], price_key: `road_curb_${curbType}`, procurement: true });
    addLine({ row_id: "curb_installation", wbs_code: "05", section: "Работы", phase: "road_furniture", category: "work", name_ru: "Установка бортового камня", action: "установить", action_object: "бортовой камень", specification_ru: `${specification} Основание, бетон обоймы и отметки подтверждаются проектом.`, unit_id: "m", formula_id: "curb_installation_length", ...common, applicability: "curb_required == true AND curb_type confirmed AND curb_length_m > 0", inclusion_reason_ru: "Пользователь подтвердил бортовой камень, его тип и длину.", exclusion_rule: "Исключить без явного подтверждения, типа или положительной длины.", source_ids: ["kg_krer_2015_collection_27"] });
  } else if (!fullRoadInfrastructure && curbRequired === true) {
    unresolved.add("MISSING_CURB_TYPE_OR_LENGTH");
  }

  const drainageRequired = booleanValue(values.get("drainage_required"));
  const drainageType = stringValue(values.get("drainage_type"));
  const drainageLength = numericValue(values.get("drainage_length_m"));
  if (!fullRoadInfrastructure && drainageRequired === true && drainageType && drainageType !== "unknown" && positive(drainageLength)) {
    const common = { expression: "drainage_length_m", input_units: { drainage_length_m: "m" }, input_values: { drainage_length_m: drainageLength }, quantity: drainageLength };
    const specification = `Система: ${choiceLabel("drainage_type", drainageType) ?? drainageType}; сечение, материал, класс нагрузки и уклоны — по проекту.`;
    addLine({ row_id: "drainage_material", wbs_code: "05", section: "Материалы", phase: "road_furniture", category: "material", name_ru: "Элементы системы водоотвода", action: "поставить", action_object: "элементы водоотвода", specification_ru: specification, unit_id: "m", formula_id: "drainage_material_length", ...common, applicability: "drainage_required == true AND type and length confirmed", inclusion_reason_ru: "Пользователь подтвердил новый водоотвод, тип и длину.", exclusion_rule: "Исключить без явного подтверждения, типа или длины.", source_ids: ["kg_krer_2015_collection_27"], price_key: `road_drainage_${drainageType}`, procurement: true });
    addLine({ row_id: "drainage_installation", wbs_code: "05", section: "Работы", phase: "road_furniture", category: "work", name_ru: "Устройство системы водоотвода", action: "устроить", action_object: "водоотвод", specification_ru: specification, unit_id: "m", formula_id: "drainage_installation_length", ...common, applicability: "drainage_required == true AND type and length confirmed", inclusion_reason_ru: "Пользователь подтвердил новый водоотвод, тип и длину.", exclusion_rule: "Исключить без явного подтверждения, типа или длины.", source_ids: ["kg_krer_2015_collection_27"] });
  } else if (!fullRoadInfrastructure && drainageRequired === true) {
    requireExpert("drainage", "MISSING_DRAINAGE_LENGTH_OR_SPECIFICATION");
  }

  const utilityPipesRequired = booleanValue(values.get("utility_pipes_required"));
  const utilityPipeType = stringValue(values.get("utility_pipe_type"));
  const utilityPipeLength = numericValue(values.get("utility_pipe_length_m"));
  if (!fullRoadInfrastructure && utilityPipesRequired === true && utilityPipeType && positive(utilityPipeLength)) {
    const common = { expression: "utility_pipe_length_m", input_units: { utility_pipe_length_m: "m" }, input_values: { utility_pipe_length_m: utilityPipeLength }, quantity: utilityPipeLength };
    const specification = `Тип: ${choiceLabel("utility_pipe_type", utilityPipeType) ?? utilityPipeType}; диаметр, материал, кольцевая жёсткость и узлы — по проектной спецификации.`;
    addLine({ row_id: "utility_pipes_material", wbs_code: "05", section: "Материалы", phase: "road_furniture", category: "material", name_ru: "Труба или футляр инженерной сети", action: "поставить", action_object: "трубу или футляр", specification_ru: specification, unit_id: "m", formula_id: "utility_pipe_material_length", ...common, applicability: "utility_pipes_required == true AND type and length confirmed", inclusion_reason_ru: "Пользователь подтвердил трубу/футляр, тип и длину.", exclusion_rule: "Исключить без явного подтверждения, типа или длины.", source_ids: ["kg_krer_2015_collection_27"], price_key: `road_utility_pipe_${utilityPipeType}`, procurement: true });
    addLine({ row_id: "utility_pipes_installation", wbs_code: "05", section: "Работы", phase: "road_furniture", category: "work", name_ru: "Устройство трубы или футляра", action: "смонтировать", action_object: "трубу или футляр", specification_ru: specification, unit_id: "m", formula_id: "utility_pipe_installation_length", ...common, applicability: "utility_pipes_required == true AND type and length confirmed", inclusion_reason_ru: "Пользователь подтвердил трубу/футляр, тип и длину.", exclusion_rule: "Исключить без явного подтверждения, типа или длины.", source_ids: ["kg_krer_2015_collection_27"] });
  } else if (!fullRoadInfrastructure && utilityPipesRequired === true) unresolved.add("MISSING_UTILITY_PIPE_TYPE_OR_LENGTH");

  const signsRequired = booleanValue(values.get("traffic_signs_required"));
  const signs = numericValue(values.get("traffic_signs_count"));
  if (!fullRoadInfrastructure && signsRequired === true && positive(signs)) {
    const common = { expression: "traffic_signs_count", input_units: { traffic_signs_count: "pcs" }, input_values: { traffic_signs_count: signs }, quantity: signs };
    addLine({ row_id: "traffic_signs_material", wbs_code: "05", section: "Материалы", phase: "road_furniture", category: "material", name_ru: "Дорожные знаки с опорами", action: "поставить", action_object: "дорожные знаки", specification_ru: "Типоразмер, плёнка, опоры и схема — строго по подтверждённому проекту организации движения.", unit_id: "pcs", formula_id: "traffic_sign_material_count", ...common, applicability: "traffic_signs_required == true AND count confirmed", inclusion_reason_ru: "Пользователь подтвердил знаки и количество.", exclusion_rule: "Исключить без подтверждения или количества.", source_ids: ["eaeu_tr_ts_014_2011"], price_key: "traffic_sign_project_spec", procurement: true });
    addLine({ row_id: "traffic_signs_installation", wbs_code: "05", section: "Работы", phase: "road_furniture", category: "work", name_ru: "Установка дорожных знаков", action: "установить", action_object: "дорожные знаки", specification_ru: "Места, высоты и узлы установки — по подтверждённой схеме организации движения.", unit_id: "pcs", formula_id: "traffic_sign_installation_count", ...common, applicability: "traffic_signs_required == true AND count confirmed", inclusion_reason_ru: "Пользователь подтвердил знаки и количество.", exclusion_rule: "Исключить без подтверждения или количества.", source_ids: ["eaeu_tr_ts_014_2011"] });
  } else if (!fullRoadInfrastructure && signsRequired === true) unresolved.add("MISSING_TRAFFIC_SIGNS_COUNT");

  const markingRequired = booleanValue(values.get("road_marking_required"));
  const markingArea = numericValue(values.get("road_marking_area_m2"));
  if (!fullRoadInfrastructure && markingRequired === true && positive(markingArea)) {
    addLine({ row_id: "road_marking", wbs_code: "05", section: "Работы", phase: "road_furniture", category: "work", name_ru: "Нанесение дорожной разметки", action: "нанести", action_object: "дорожную разметку", specification_ru: "Схема, тип материала, цвет, толщина и подготовка поверхности — по проекту организации движения; материал не включён без нормы расхода.", unit_id: "m2", formula_id: "road_marking_area", expression: "road_marking_area_m2", input_units: { road_marking_area_m2: "m2" }, input_values: { road_marking_area_m2: markingArea }, quantity: markingArea, applicability: "road_marking_required == true AND area confirmed", inclusion_reason_ru: "Пользователь подтвердил разметку и измеримую площадь.", exclusion_rule: "Исключить без подтверждения или площади.", source_ids: ["eaeu_tr_ts_014_2011"] });
  } else if (!fullRoadInfrastructure && markingRequired === true) unresolved.add("MISSING_ROAD_MARKING_AREA");

  const guardrailRequired = booleanValue(values.get("guardrail_required"));
  const guardrail = numericValue(values.get("guardrail_length_m"));
  if (!fullRoadInfrastructure && guardrailRequired === true && positive(guardrail)) {
    const common = { expression: "guardrail_length_m", input_units: { guardrail_length_m: "m" }, input_values: { guardrail_length_m: guardrail }, quantity: guardrail };
    addLine({ row_id: "guardrail_material", wbs_code: "05", section: "Материалы", phase: "road_furniture", category: "material", name_ru: "Барьерное дорожное ограждение", action: "поставить", action_object: "барьерное ограждение", specification_ru: "Уровень удержания, рабочая ширина, стойки, окончания и покрытие — по проекту безопасности.", unit_id: "m", formula_id: "guardrail_material_length", ...common, applicability: "guardrail_required == true AND length confirmed", inclusion_reason_ru: "Пользователь подтвердил ограждение и длину.", exclusion_rule: "Исключить без подтверждения или длины.", source_ids: ["eaeu_tr_ts_014_2011"], price_key: "guardrail_project_spec", procurement: true });
    addLine({ row_id: "guardrail_installation", wbs_code: "05", section: "Работы", phase: "road_furniture", category: "work", name_ru: "Монтаж барьерного дорожного ограждения", action: "смонтировать", action_object: "барьерное ограждение", specification_ru: "Шаг стоек, анкеровка, окончания и сопряжения — по проекту безопасности.", unit_id: "m", formula_id: "guardrail_installation_length", ...common, applicability: "guardrail_required == true AND length confirmed", inclusion_reason_ru: "Пользователь подтвердил ограждение и длину.", exclusion_rule: "Исключить без подтверждения или длины.", source_ids: ["eaeu_tr_ts_014_2011"] });
  } else if (!fullRoadInfrastructure && guardrailRequired === true) unresolved.add("MISSING_GUARDRAIL_LENGTH");

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
    const qualityArea = area.value;
    const layerFactor = Math.max(1, completeAsphaltLayers.length);
    const addAreaFrequencyControl = (input: { rowId: string; title: string; actionObject: string; intervalKey: string; perLayer: boolean; specification: string }): void => {
      const interval = numericValue(values.get(input.intervalKey));
      if (!positive(interval)) {
        requireExpert("laboratory", `MISSING_${input.intervalKey.toUpperCase()}`);
        return;
      }
      const multiplier = input.perLayer ? layerFactor : 1;
      const formulaInputs = withArea({ [input.intervalKey]: "m2_test", quality_layer_factor: "one" }, { [input.intervalKey]: interval, quality_layer_factor: multiplier });
      addLine({ row_id: input.rowId, wbs_code: "12", section: "Контроль качества", phase: "quality", category: "testing", name_ru: input.title, action: "выполнить", action_object: input.actionObject, specification_ru: `${input.specification} Предварительная периодичность: одно испытание на ${interval} м²${input.perLayer ? " каждого слоя" : " покрытия"}.`, unit_id: "test", formula_id: `${input.rowId}_count`, expression: `ceil(${areaExpression} * quality_layer_factor / ${input.intervalKey})`, input_units: formulaInputs.units, input_values: formulaInputs.values, quantity: Math.ceil(qualityArea * multiplier / interval), applicability: "laboratory_control selected AND interval available", inclusion_reason_ru: "Количество рассчитано по площади, слоям и явной периодичности.", exclusion_rule: "Заменить утверждённой программой контроля.", source_ids: ["kg_mtd_road_quality_control"], productivity: interval });
    };
    addAreaFrequencyControl({ rowId: "incoming_material_control", title: "Входной контроль материалов дорожной одежды", actionObject: "поступающие материалы и документы качества", intervalKey: "incoming_control_interval_m2_per_test", perLayer: true, specification: "Проверка паспортов, маркировки и применимых показателей каждой партии без подмены лабораторной приёмки." });
    addAreaFrequencyControl({ rowId: "asphalt_compaction_control", title: "Контроль коэффициента уплотнения асфальтобетонных слоёв", actionObject: "коэффициент уплотнения каждого слоя", intervalKey: "compaction_control_interval_m2_per_test", perLayer: true, specification: "Метод, схема точек и критерии принимаются программой контроля." });
    addAreaFrequencyControl({ rowId: "asphalt_core_sampling", title: "Отбор кернов асфальтобетонного покрытия", actionObject: "керны каждого слоя", intervalKey: "core_sampling_interval_m2_per_test", perLayer: true, specification: "Места отбора, восстановление отверстий и состав испытаний устанавливаются программой." });
    const interval = numericValue(values.get("laboratory_test_interval_m2_per_test"));
    if (positive(interval)) addLine({ row_id: "laboratory_tests", wbs_code: "12", section: "Контроль качества", phase: "quality", category: "testing", name_ru: "Лабораторные испытания асфальтобетонного покрытия", action: "выполнить", action_object: "комплекс лабораторных испытаний", specification_ru: `Форма контроля: ${choiceLabel("laboratory_control", laboratory) ?? laboratory}; состав испытаний — по утверждённой программе контроля; расчёт выполнен по площади каждого слоя.`, unit_id: "test", formula_id: "laboratory_tests", expression: `ceil(${areaExpression} * asphalt_quality_layer_factor / laboratory_test_interval_m2_per_test)`, input_units: withArea({ asphalt_quality_layer_factor: "one", laboratory_test_interval_m2_per_test: "m2_test" }, { asphalt_quality_layer_factor: layerFactor, laboratory_test_interval_m2_per_test: interval }).units, input_values: withArea({ asphalt_quality_layer_factor: "one", laboratory_test_interval_m2_per_test: "m2_test" }, { asphalt_quality_layer_factor: layerFactor, laboratory_test_interval_m2_per_test: interval }).values, quantity: Math.ceil(area.value * layerFactor / interval), applicability: "laboratory_control selected AND interval confirmed", inclusion_reason_ru: "Количество испытаний связано с площадью и числом слоёв.", exclusion_rule: "Исключить при laboratory_control == none или заменить программой контроля.", source_ids: ["kg_mtd_road_quality_control"], productivity: interval });
    else requireExpert("laboratory", "MISSING_LABORATORY_TEST_INTERVAL");
    const payload = numericValue(values.get("truck_payload_t"));
    const tripsPerTest = numericValue(values.get("temperature_control_trips_per_test"));
    if (positive(payload) && positive(tripsPerTest)) {
      const totalTrips = completeAsphaltLayers.reduce((sum, item) => sum + Math.ceil(item.quantity / payload), 0);
      if (totalTrips > 0) addLine({ row_id: "asphalt_temperature_control", wbs_code: "12", section: "Контроль качества", phase: "quality", category: "testing", name_ru: "Контроль температуры асфальтобетонной смеси при доставке и укладке", action: "измерить", action_object: "температуру смеси", specification_ru: `Предварительная периодичность: одно измерение на ${tripsPerTest} рейсов; точки и допустимый диапазон — по техкарте конкретной смеси.`, unit_id: "test", formula_id: "asphalt_temperature_control_count", expression: "ceil(total_asphalt_trip_count / temperature_control_trips_per_test)", input_units: { total_asphalt_trip_count: "trip", temperature_control_trips_per_test: "trip_test" }, input_values: { total_asphalt_trip_count: totalTrips, temperature_control_trips_per_test: tripsPerTest }, quantity: Math.ceil(totalTrips / tripsPerTest), applicability: "asphalt delivery trips > 0", inclusion_reason_ru: "Число измерений связано с фактическим расчётным числом рейсов.", exclusion_rule: "Заменить периодичностью технологической карты.", source_ids: ["kg_mtd_road_quality_control"] });
    }
  }

  if (positive(area.value)) {
    const layerFactor = Math.max(1, completeAsphaltLayers.length);
    const smoothnessInterval = numericValue(values.get("smoothness_control_interval_m2_per_test"));
    if (positive(smoothnessInterval)) addLine({ row_id: "surface_smoothness_control", wbs_code: "12", section: "Контроль качества", phase: "quality", category: "testing", name_ru: "Контроль ровности и отметок готового покрытия", action: "измерить", action_object: "ровность и отметки покрытия", specification_ru: `Приёмочный контроль по программе качества; один измерительный участок на ${smoothnessInterval} м².`, unit_id: "test", formula_id: "surface_smoothness_control_count", expression: `ceil(${areaExpression} / smoothness_control_interval_m2_per_test)`, input_units: withArea({ smoothness_control_interval_m2_per_test: "m2_test" }, { smoothness_control_interval_m2_per_test: smoothnessInterval }).units, input_values: withArea({ smoothness_control_interval_m2_per_test: "m2_test" }, { smoothness_control_interval_m2_per_test: smoothnessInterval }).values, quantity: Math.ceil(area.value / smoothnessInterval), applicability: "pavement_assembly_completed", inclusion_reason_ru: "Количество измерений связано с площадью.", exclusion_rule: "Заменить утверждённой программой приёмки.", source_ids: ["kg_mtd_road_quality_control"] });
    const thicknessInterval = numericValue(values.get("thickness_control_interval_m2_per_test"));
    if (positive(thicknessInterval)) addLine({ row_id: "pavement_thickness_control", wbs_code: "12", section: "Контроль качества", phase: "quality", category: "testing", name_ru: "Контроль толщины асфальтобетонных слоёв", action: "измерить", action_object: "толщину каждого слоя покрытия", specification_ru: `Предварительная периодичность одна точка на ${thicknessInterval} м² каждого слоя.`, unit_id: "test", formula_id: "pavement_thickness_control_count", expression: `ceil(${areaExpression} * asphalt_thickness_layer_factor / thickness_control_interval_m2_per_test)`, input_units: withArea({ asphalt_thickness_layer_factor: "one", thickness_control_interval_m2_per_test: "m2_test" }, { asphalt_thickness_layer_factor: layerFactor, thickness_control_interval_m2_per_test: thicknessInterval }).units, input_values: withArea({ asphalt_thickness_layer_factor: "one", thickness_control_interval_m2_per_test: "m2_test" }, { asphalt_thickness_layer_factor: layerFactor, thickness_control_interval_m2_per_test: thicknessInterval }).values, quantity: Math.ceil(area.value * layerFactor / thicknessInterval), applicability: "pavement_assembly_completed", inclusion_reason_ru: "Количество точек связано с площадью и числом слоёв.", exclusion_rule: "Заменить утверждённой программой контроля.", source_ids: ["kg_mtd_road_quality_control"] });
    const protocolCount = numericValue(values.get("laboratory_protocol_count"));
    if (positive(protocolCount)) addLine({ row_id: "laboratory_protocol", wbs_code: "12", section: "Документация", phase: "quality", category: "documentation", name_ru: "Комплект лабораторных протоколов контроля дорожной одежды", action: "оформить", action_object: "лабораторные протоколы", specification_ru: "Протоколы входного, операционного и приёмочного контроля с идентификацией проб, слоёв и результатов.", unit_id: "document", formula_id: "laboratory_protocol_count", expression: "laboratory_protocol_count", input_units: { laboratory_protocol_count: "document" }, input_values: { laboratory_protocol_count: protocolCount }, quantity: protocolCount, applicability: "laboratory_control selected", inclusion_reason_ru: "Результаты контроля оформляются отдельным комплектом.", exclusion_rule: "Уточнить состав программой качества.", source_ids: ["kg_mtd_road_quality_control"] });
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
