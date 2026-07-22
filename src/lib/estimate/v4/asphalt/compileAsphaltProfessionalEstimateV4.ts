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

function choiceLabel(key: string, value: string | null): string | null {
  const parameter = ASPHALT_WORK_SPECIFIC_PARAMETER_SCHEMA_V4.parameters.find((item) => item.canonical_key === key);
  return value ? parameter?.choices.find((item) => item.value === value)?.label_ru ?? value : null;
}

function mergeFacts(input: CompileAsphaltProfessionalEstimateV4Input): Map<string, unknown> {
  const values = new Map<string, unknown>();
  for (const item of [...extractAsphaltUserFactsV4(input.raw_text).facts, ...(input.facts ?? [])]) {
    const prefix = `${ASPHALT_WORK_ID_V4}:parameter:`;
    if (!item.parameter_id?.startsWith(prefix) || !item.parameter_id.endsWith(":v4")) continue;
    values.set(item.parameter_id.slice(prefix.length, -3), item.value);
  }
  for (const [key, raw] of Object.entries(input.parameter_overrides ?? {})) {
    const value = unwrapOverride(raw);
    if (value !== undefined) values.set(key, value);
  }
  return values;
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

function buildFactSet(values: ReadonlyMap<string, unknown>): UserFactV4[] {
  return [...values.entries()].flatMap(([key, value]) => {
    const parameter = ASPHALT_WORK_SPECIFIC_PARAMETER_SCHEMA_V4.parameters.find((item) => item.canonical_key === key);
    if (!parameter) return [];
    return [{
      fact_id: `asphalt:compiled:${key}:v4`,
      parameter_id: asphaltParameterIdV4(key),
      value,
      unit_id: parameter.canonical_unit_id,
      provenance: "form_input" as const,
      confirmed: true,
      source_reference: "compiled_parameter_set",
      confidence: "high" as const,
    }];
  });
}

function areaFormula(values: ReadonlyMap<string, unknown>): {
  value: number | null;
  expression: string;
  input_units: Record<string, string>;
  input_values: Record<string, number>;
  trace_ru: string;
} {
  const direct = numericValue(values.get("area_m2"));
  if (positive(direct)) return {
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
  const values = mergeFacts(input);
  const facts = buildFactSet(values);
  const asphaltLayers = normalizeAsphaltLayers(values);
  const crushedLayers = normalizeCrushedLayers(values);
  const area = areaFormula(values);
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
    const formula = addFormula(row.formula_id, row.expression, row.input_units, row.unit_id, row.source_ids, `${row.inclusion_reason_ru} Формула: ${row.expression}. Результат: ${round(row.quantity)} ${row.unit_id}.`);
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
      source_id: row.source_ids[0] ?? null,
      price_key: row.price_key ?? null,
      shared_scope_key: null,
      alternative_group: null,
      price_status: "PRICE_MISSING",
      confidence: "high",
      explanation_trace_ru: formula.explanation_trace_ru,
    };
    definitions.push(definition);
    compiledRows.push({ definition, quantity: round(row.quantity), formula_input_values: row.input_values, included_in_procurement: row.procurement === true });
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
        source_ids: row.source_ids,
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
        source_ids: row.source_ids,
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

  const areaExpression = area.expression;
  const areaUnits = area.input_units;
  const areaValues = area.input_values;
  const withArea = (extraUnits: Record<string, string>, extraValues: Record<string, number>) => ({
    units: { ...areaUnits, ...extraUnits },
    values: { ...areaValues, ...extraValues },
  });

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
    addLine({ row_id: `${prefix}_material`, wbs_code: "03", section: "Материалы", phase: "base", category: "material", name_ru: `Щебень для слоя ${layer.position}`, action: "поставить", action_object: "щебень", specification_ru: `Фракция: ${choiceLabel("crushed_layers", layer.fraction) ?? layer.fraction}; проектная толщина слоя ${layer.thickness_mm} мм; характеристики — по проекту и испытаниям.`, unit_id: "m3", formula_id: `${prefix}_delivery_volume`, expression: `${areaExpression} * ${prefix}_thickness_mm / 1000 * ${prefix}_compaction_factor * (1 + ${prefix}_waste_percent / 100)`, input_units: input.units, input_values: input.values, quantity: delivery, applicability: `crushed layer ${layer.position} confirmed`, inclusion_reason_ru: `Подтверждён щебёночный слой ${layer.position}.`, exclusion_rule: "Исключить при отсутствии подтверждённой толщины, фракции или коэффициентов.", source_ids: ["kg_krer_2015_collection_27"], price_key: `road_crushed_${layer.fraction}`, procurement: true, waste_coefficient: layer.waste_percent / 100 });
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

  const completeAsphaltLayers: { layer: LayerInput; materialRowId: string; quantity: number }[] = [];
  if (asphaltLayers.length === 0) requireExpert("asphalt_layers", "MISSING_ASPHALT_LAYERS");
  for (const layer of asphaltLayers) {
    if (!positive(area.value)) break;
    if (positive(layer.thickness_mm)) {
      const prefix = `asphalt_layer_${layer.position}`;
      addLine({ row_id: `${prefix}_paving`, wbs_code: "04", section: "Работы", phase: "pavement", category: "work", name_ru: `Устройство асфальтобетонного слоя ${layer.position}`, action: "уложить и уплотнить", action_object: "асфальтобетонный слой", specification_ru: `Проектная толщина ${layer.thickness_mm} мм; тип смеси, температурный режим и уплотнение подтверждаются до производства.`, unit_id: "m2", formula_id: `${prefix}_paving_area`, expression: areaExpression, input_units: areaUnits, input_values: areaValues, quantity: area.value, applicability: `asphalt layer ${layer.position} thickness confirmed`, inclusion_reason_ru: `Подтверждены наличие и толщина асфальтобетонного слоя ${layer.position}.`, exclusion_rule: "Исключить при отсутствии слоя или его толщины.", source_ids: ["kg_krer_2015_collection_27"] });
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
    addLine({ row_id: materialRowId, wbs_code: "04", section: "Материалы", phase: "pavement", category: "material", name_ru: `Асфальтобетонная смесь для слоя ${layer.position}`, action: "поставить", action_object: "асфальтобетонную смесь", specification_ru: `Тип: ${choiceLabel("asphalt_layers", layer.mixture_type) ?? layer.mixture_type}; толщина слоя ${layer.thickness_mm} мм; расчётная плотность ${layer.density_t_m3} т/м³ по подтверждённому паспорту смеси.`, unit_id: "t", formula_id: `${prefix}_mass`, expression: `${areaExpression} * ${prefix}_thickness_mm / 1000 * ${prefix}_density_t_m3 * (1 + ${prefix}_waste_percent / 100)`, input_units: input.units, input_values: input.values, quantity, applicability: `asphalt layer ${layer.position} confirmed`, inclusion_reason_ru: `Подтверждены смесь, толщина, плотность и запас слоя ${layer.position}.`, exclusion_rule: "Исключить при неполной спецификации слоя.", source_ids: ["kg_krer_2015_collection_27"], price_key: `asphalt_mix_${layer.mixture_type}`, procurement: true, waste_coefficient: layer.waste_percent / 100 });
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
      }
    } else requireExpert("emulsion", "MISSING_EMULSION_RATE_OR_BASIS");
  }

  if (positive(area.value)) {
    const laborProductivity = numericValue(values.get("road_worker_productivity_m2_per_man_hour"));
    if (positive(laborProductivity)) {
      const input = withArea({ road_worker_productivity_m2_per_man_hour: "m2_man_hour" }, { road_worker_productivity_m2_per_man_hour: laborProductivity });
      addLine({ row_id: "road_workers", wbs_code: "04", section: "Труд", phase: "pavement", category: "labor", name_ru: "Труд дорожных рабочих", action: "выполнить", action_object: "подтверждённый состав дорожных работ", specification_ru: "Состав звена и производительность подтверждаются КРЕР, ППР или дорожным инженером.", unit_id: "man_hour", formula_id: "road_worker_hours", expression: `${areaExpression} / road_worker_productivity_m2_per_man_hour`, input_units: input.units, input_values: input.values, quantity: area.value / laborProductivity, applicability: "confirmed_labor_productivity", inclusion_reason_ru: "Получена подтверждённая производительность дорожных рабочих.", exclusion_rule: "Не рассчитывать трудозатраты без подтверждённой производительности.", source_ids: ["kg_krer_2015_collection_27"], productivity: laborProductivity });
    } else requireExpert("labor", "MISSING_ROAD_WORKER_PRODUCTIVITY");

    const machineInputs: { key: string; rowId: string; title: string; applicable: boolean }[] = [
      { key: "grader_productivity_m2_per_machine_hour", rowId: "grader", title: "Автогрейдер", applicable: crushedLayers.length > 0 || sandRequired === true },
      { key: "roller_productivity_m2_per_machine_hour", rowId: "roller", title: "Дорожный каток", applicable: asphaltLayers.some((item) => positive(item.thickness_mm)) || crushedLayers.length > 0 },
      { key: "paver_productivity_m2_per_machine_hour", rowId: "asphalt_paver", title: "Асфальтоукладчик", applicable: asphaltLayers.some((item) => positive(item.thickness_mm)) },
    ];
    for (const machine of machineInputs) {
      if (!machine.applicable) continue;
      const productivity = numericValue(values.get(machine.key));
      if (!positive(productivity)) {
        requireExpert("machinery", `MISSING_${machine.rowId.toUpperCase()}_PRODUCTIVITY`);
        continue;
      }
      const layerFactor = machine.rowId === "grader" ? Math.max(1, crushedLayers.length + (sandRequired === true ? 1 : 0)) : Math.max(1, asphaltLayers.filter((item) => positive(item.thickness_mm)).length);
      const coverageKey = `${machine.rowId}_coverage_area_m2`;
      const coverageArea = area.value * layerFactor;
      addLine({ row_id: machine.rowId, wbs_code: machine.rowId === "grader" ? "03" : "04", section: "Машины", phase: machine.rowId === "grader" ? "base" : "pavement", category: "machinery", name_ru: machine.title, action: "эксплуатировать", action_object: machine.title.toLocaleLowerCase("ru-RU"), specification_ru: "Типоразмер и производительность машины подтверждаются ППР/технической картой для условий участка.", unit_id: "machine_hour", formula_id: `${machine.rowId}_machine_hours`, expression: `${coverageKey} / ${machine.key}`, input_units: { [coverageKey]: "m2", [machine.key]: "m2_machine_hour" }, input_values: { [coverageKey]: coverageArea, [machine.key]: productivity }, quantity: coverageArea / productivity, applicability: "relevant_layers_present AND confirmed_machine_productivity", inclusion_reason_ru: `Машина применима к подтверждённым слоям; производительность ${productivity} м²/маш.-ч подтверждена.`, exclusion_rule: "Исключить при отсутствии соответствующего слоя или подтверждённой производительности.", source_ids: ["kg_krer_2015_collection_27"], productivity });
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

  const curbLength = numericValue(values.get("curb_length_m"));
  if (positive(curbLength)) {
    const common = { expression: "curb_length_m", input_units: { curb_length_m: "m" }, input_values: { curb_length_m: curbLength }, quantity: curbLength };
    addLine({ row_id: "curb_material", wbs_code: "05", section: "Материалы", phase: "road_furniture", category: "material", name_ru: "Бортовой камень дорожный", action: "поставить", action_object: "бортовой камень", specification_ru: "Тип, геометрия, прочность и морозостойкость — по проекту; количество стыков/элементов уточняется по длине изделия.", unit_id: "m", formula_id: "curb_material_length", ...common, applicability: "curb_length_m > 0", inclusion_reason_ru: "Пользователь задал положительную длину бордюров.", exclusion_rule: "Исключить при нулевой или отсутствующей длине.", source_ids: ["kg_krer_2015_collection_27"], price_key: "road_curb_project_spec", procurement: true });
    addLine({ row_id: "curb_installation", wbs_code: "05", section: "Работы", phase: "road_furniture", category: "work", name_ru: "Установка бортового камня", action: "установить", action_object: "бортовой камень", specification_ru: "Основание, бетон обоймы и отметки должны быть заданы проектом; материалы основания не включены без спецификации.", unit_id: "m", formula_id: "curb_installation_length", ...common, applicability: "curb_length_m > 0", inclusion_reason_ru: "Пользователь задал положительную длину бордюров.", exclusion_rule: "Исключить при нулевой или отсутствующей длине.", source_ids: ["kg_krer_2015_collection_27"] });
  }

  const drainageType = stringValue(values.get("drainage_type"));
  const drainageLength = numericValue(values.get("drainage_length_m"));
  if (drainageType && !["none", "existing", "unknown"].includes(drainageType)) {
    if (positive(drainageLength)) addLine({ row_id: "drainage", wbs_code: "05", section: "Работы", phase: "road_furniture", category: "work", name_ru: "Устройство элементов водоотвода", action: "устроить", action_object: "водоотвод", specification_ru: `Тип: ${choiceLabel("drainage_type", drainageType) ?? drainageType}; сечение, материалы и уклоны — по проекту.`, unit_id: "m", formula_id: "drainage_length", expression: "drainage_length_m", input_units: { drainage_length_m: "m" }, input_values: { drainage_length_m: drainageLength }, quantity: drainageLength, applicability: "drainage_type requires new elements AND length confirmed", inclusion_reason_ru: "Подтверждены тип и длина водоотвода.", exclusion_rule: "Исключить при drainage_type == none/existing или без длины.", source_ids: ["kg_krer_2015_collection_27"] });
    else requireExpert("drainage", "MISSING_DRAINAGE_LENGTH_OR_SPECIFICATION");
  }

  const signs = numericValue(values.get("traffic_signs_count"));
  if (positive(signs)) addLine({ row_id: "traffic_signs", wbs_code: "05", section: "Материалы", phase: "road_furniture", category: "material", name_ru: "Дорожные знаки", action: "поставить", action_object: "дорожные знаки", specification_ru: "Типоразмер, плёнка, опоры и схема установки — строго по проекту организации движения.", unit_id: "pcs", formula_id: "traffic_sign_count", expression: "traffic_signs_count", input_units: { traffic_signs_count: "pcs" }, input_values: { traffic_signs_count: signs }, quantity: signs, applicability: "traffic_signs_count > 0", inclusion_reason_ru: "Пользователь или проект задал количество знаков.", exclusion_rule: "Исключить без проекта/положительного количества.", source_ids: ["eaeu_tr_ts_014_2011"], price_key: "traffic_sign_project_spec", procurement: true });
  const guardrail = numericValue(values.get("guardrail_length_m"));
  if (positive(guardrail)) addLine({ row_id: "guardrail", wbs_code: "05", section: "Материалы", phase: "road_furniture", category: "material", name_ru: "Барьерное дорожное ограждение", action: "поставить", action_object: "барьерное ограждение", specification_ru: "Уровень удержания, рабочая ширина, стойки, окончания и покрытие — по проекту безопасности.", unit_id: "m", formula_id: "guardrail_length", expression: "guardrail_length_m", input_units: { guardrail_length_m: "m" }, input_values: { guardrail_length_m: guardrail }, quantity: guardrail, applicability: "guardrail_length_m > 0", inclusion_reason_ru: "Пользователь или проект задал длину ограждения.", exclusion_rule: "Исключить без проекта/положительной длины.", source_ids: ["eaeu_tr_ts_014_2011"], price_key: "guardrail_project_spec", procurement: true });

  if (completeAsphaltLayers.length > 0) {
    const distance = numericValue(values.get("asphalt_plant_distance_km"));
    const totalMass = completeAsphaltLayers.reduce((sum, item) => sum + item.quantity, 0);
    const massExpression = completeAsphaltLayers.map((item) => item.materialRowId).join(" + ");
    const massUnits = Object.fromEntries(completeAsphaltLayers.map((item) => [item.materialRowId, "t"]));
    const massValues = Object.fromEntries(completeAsphaltLayers.map((item) => [item.materialRowId, item.quantity]));
    if (nonNegative(distance)) addLine({ row_id: "asphalt_delivery", wbs_code: "07", section: "Транспорт", phase: "logistics", category: "transport", name_ru: "Транспортная работа по доставке асфальтобетонной смеси", action: "доставить", action_object: "асфальтобетонную смесь", specification_ru: `Расстояние от АБЗ ${distance} км; время доставки и температурный режим — по ППР.`, unit_id: "t_km", formula_id: "asphalt_delivery_tkm", expression: `(${massExpression}) * asphalt_plant_distance_km`, input_units: { ...massUnits, asphalt_plant_distance_km: "km" }, input_values: { ...massValues, asphalt_plant_distance_km: distance }, quantity: totalMass * distance, applicability: "asphalt_mass_compiled AND plant_distance_confirmed", inclusion_reason_ru: "Подтверждены масса смеси и расстояние до АБЗ.", exclusion_rule: "Исключить без расстояния до АБЗ.", source_ids: ["kg_krer_2015_collection_27"] });
    else unresolved.add("MISSING_ASPHALT_PLANT_DISTANCE");
    const payload = numericValue(values.get("truck_payload_t"));
    if (positive(payload)) addLine({ row_id: "asphalt_truck_trips", wbs_code: "07", section: "Транспорт", phase: "logistics", category: "transport", name_ru: "Рейсы самосвалов с асфальтобетонной смесью", action: "выполнить рейсы", action_object: "доставку смеси", specification_ru: `Подтверждённая полезная загрузка ${payload} т/рейс; число рейсов округляется в закупочно-логистическом представлении вверх.`, unit_id: "trip", formula_id: "asphalt_trips", expression: `ceil((${massExpression}) / truck_payload_t)`, input_units: { ...massUnits, truck_payload_t: "t_trip" }, input_values: { ...massValues, truck_payload_t: payload }, quantity: Math.ceil(totalMass / payload), applicability: "asphalt_mass_compiled AND truck_payload_confirmed", inclusion_reason_ru: "Подтверждены масса смеси и полезная загрузка самосвала.", exclusion_rule: "Исключить без подтверждённой загрузки.", source_ids: ["kg_krer_2015_collection_27"] });
  }

  const laboratory = stringValue(values.get("laboratory_control"));
  if (positive(area.value) && laboratory && !["none", "unknown"].includes(laboratory)) {
    const interval = numericValue(values.get("laboratory_test_interval_m2_per_test"));
    if (positive(interval)) addLine({ row_id: "laboratory_tests", wbs_code: "06", section: "Испытания", phase: "quality", category: "testing", name_ru: "Лабораторный контроль асфальтобетонного покрытия", action: "выполнить", action_object: "испытания и отбор проб", specification_ru: `Форма контроля: ${choiceLabel("laboratory_control", laboratory) ?? laboratory}; состав испытаний — по утверждённой программе контроля.`, unit_id: "test", formula_id: "laboratory_tests", expression: `ceil(${areaExpression} / laboratory_test_interval_m2_per_test)`, input_units: withArea({ laboratory_test_interval_m2_per_test: "m2_test" }, { laboratory_test_interval_m2_per_test: interval }).units, input_values: withArea({ laboratory_test_interval_m2_per_test: "m2_test" }, { laboratory_test_interval_m2_per_test: interval }).values, quantity: Math.ceil(area.value / interval), applicability: "laboratory_control selected AND interval confirmed", inclusion_reason_ru: "Пользователь выбрал лабораторный контроль и подтвердил частоту.", exclusion_rule: "Исключить при laboratory_control == none или без программы контроля.", source_ids: ["kg_mtd_road_quality_control"], productivity: interval });
    else requireExpert("laboratory", "MISSING_LABORATORY_TEST_INTERVAL");
  }

  const projectDocument = stringValue(values.get("project_document"));
  if (projectDocument) addLine({ row_id: "project_document", wbs_code: "01", section: "Документация", phase: "preparation", category: "documentation", name_ru: "Проектная документация дорожного покрытия", action: "проверить", action_object: "проект или ведомость", specification_ru: "Загруженный проектный документ с идентифицируемой версией; содержимое требует проверки инженером.", unit_id: "document", formula_id: "project_document_count", expression: "project_document_count", input_units: { project_document_count: "document" }, input_values: { project_document_count: 1 }, quantity: 1, applicability: "project_document uploaded", inclusion_reason_ru: "Пользователь загрузил реальный документ.", exclusion_rule: "Не создавать строку без загруженного документа.", source_ids: ["kg_mtd_road_quality_control"] });

  const passport = buildPassport({ formulas, rows: definitions, operations, resources, procurement, commercial, unresolved: [...unresolved].sort() });
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
  };
}

export const ASPHALT_V4_RUNTIME_TEMPLATE_ID = `${ASPHALT_WORK_ID_V4}_professional_truth_v4_phase1` as const;
export const ASPHALT_V4_RUNTIME_TEMPLATE_VERSION = ASPHALT_PASSPORT_VERSION_V4;
export const ASPHALT_V4_RUNTIME_TITLE_RU = ASPHALT_PROFESSIONAL_NAME_RU_V4;
