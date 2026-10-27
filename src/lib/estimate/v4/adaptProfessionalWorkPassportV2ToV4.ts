import { extractAiEstimateFormulaIdentifiers } from "../formula/evaluateAiEstimateQuantityFormula";
import { estimateDeterministicHash } from "../estimateDeterministicHash";
import type {
  ProfessionalWorkPassportV2,
  ProfessionalWorkPassportV2Equipment,
  ProfessionalWorkPassportV2Material,
  ProfessionalWorkPassportV2Operation,
  ProfessionalWorkPassportV2Parameter,
  ProfessionalWorkPassportV2Service,
} from "../professionalWorkPassportV2Contract";
import { validateCategoryUnitV4 } from "./categoryUnitContractV4";
import { canonicalEngineeringUnitIdV4, resolveEngineeringUnitV4 } from "./engineeringUnitRegistryV4";
import { validateFormulaDimensionsV4 } from "./formulaDimensionValidatorV4";
import {
  PROFESSIONAL_ESTIMATE_V4_SCHEMA,
  type BoqCategoryV4,
  type BoqLineDefinitionV4,
  type EvidenceConfidenceV4,
  type FormulaDefinitionV4,
  type NormativeEvidenceV4,
  type OperationV4,
  type ParameterDataTypeV4,
  type ParameterInputKindV4,
  type ParameterNecessityV4,
  type ProfessionalEstimatePassportV4,
  type ResourceRequirementV4,
  type WorkScopeClassV4,
  type WorkSpecificParameterSchemaV4,
  type WorkSpecificParameterV4,
} from "./professionalEstimateV4Contract";

export const PROFESSIONAL_ESTIMATE_V2_TO_V4_ADAPTER_VERSION = "2026-07-22.phase0.v1" as const;

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

function scopeClassForV2(passport: ProfessionalWorkPassportV2): WorkScopeClassV4 {
  const text = `${passport.identity.canonical_name_ru} ${passport.identity.professional_family_id} ${passport.classification.category}`.toLowerCase();
  if (/complex|комплекс|магистрал|город|район|аэропорт|порт|дамб|плотин|infrastructure/.test(text)) {
    return "infrastructure_complex";
  }
  if (/building|house|facility|здани|дом|сооружен|склад|цех|станци|подстанци/.test(text)) return "facility";
  if (/project|package|проект|обследован|изыскан|авторск|технадзор/.test(text)) return "project_package";
  if (/system|network|систем|сет[ьи]|вентиляц|отоплен|водоснаб|канализац|электроснаб/.test(text)) return "system";
  if (passport.classification.template_kind === "expanded_complex_1610" || passport.work_operations.length > 12) {
    return "trade_assembly";
  }
  return "atomic_operation";
}

function necessityForV2(parameter: ProfessionalWorkPassportV2Parameter): ParameterNecessityV4 {
  if (parameter.role === "P0_REQUIRED") return "critical";
  if (parameter.role === "P1_DETAIL") return "recommended";
  if (parameter.role === "COMPUTED" || parameter.role === "SYSTEM_HIDDEN") return "derived";
  return "optional";
}

function inputKindForV2(parameter: ProfessionalWorkPassportV2Parameter): ParameterInputKindV4 {
  if (parameter.role === "SYSTEM_HIDDEN") return "read_only_information";
  if (parameter.role === "COMPUTED") return "derived";
  if (parameter.input_type === "boolean") return "boolean";
  if (parameter.input_type === "select") return "enum";
  if (parameter.input_type === "number") return parameter.unit ? "quantity" : "decimal";
  if (/location|city|address|регион|город|адрес/i.test(`${parameter.canonical_key} ${parameter.label_ru}`)) return "location";
  if (/document|drawing|specification|project|геолог|проект|чертеж|спецификац/i.test(`${parameter.canonical_key} ${parameter.label_ru}`)) return "document";
  if (/material|материал/i.test(`${parameter.canonical_key} ${parameter.label_ru}`)) return "material_selection";
  if (/equipment|machine|оборудован|машин/i.test(`${parameter.canonical_key} ${parameter.label_ru}`)) return "equipment_selection";
  return "text";
}

function dataTypeForInput(inputKind: ParameterInputKindV4): ParameterDataTypeV4 {
  if (inputKind === "quantity" || inputKind === "decimal" || inputKind === "derived") return "number";
  if (inputKind === "integer") return "integer";
  if (inputKind === "boolean") return "boolean";
  if (inputKind === "multiselect") return "string_array";
  if (inputKind === "date") return "date";
  if (inputKind === "document") return "document_reference";
  if (inputKind === "geometry") return "geometry";
  if (inputKind === "enum" || inputKind === "equipment_selection" || inputKind === "material_selection") return "selection";
  return "string";
}

function parameterV4(
  parameter: ProfessionalWorkPassportV2Parameter,
  workId: string,
  familyId: string,
): WorkSpecificParameterV4 {
  const inputKind = inputKindForV2(parameter);
  const unit = resolveEngineeringUnitV4(parameter.unit);
  const dimensionlessUnitId = !unit && (inputKind === "decimal" || inputKind === "integer") ? "one" : null;
  const necessity = necessityForV2(parameter);
  const affectedRows = uniqueSorted([...parameter.affected_materials, ...parameter.affected_operations]);
  return {
    parameter_id: `${workId}:parameter:${parameter.canonical_key}:v4`,
    canonical_key: parameter.canonical_key,
    owner_work_id: workId,
    owner_family_id: familyId,
    professional_name_ru: parameter.label_ru,
    user_help_ru: parameter.help_ru,
    input_kind: inputKind,
    data_type: dataTypeForInput(inputKind),
    necessity,
    dimension: unit?.dimension ?? (inputKind === "decimal" || inputKind === "integer" ? "dimensionless" : null),
    canonical_unit_id: unit?.unit_id ?? dimensionlessUnitId,
    display_unit_ids: unit ? uniqueSorted([unit.unit_id]) : [],
    choices: parameter.allowed_values.map((value) => ({ value, label_ru: value })),
    range: parameter.input_type === "number"
      ? { minimum: parameter.minimum, maximum: parameter.maximum }
      : null,
    step: parameter.input_type === "number" ? 0.01 : null,
    precision: unit?.precision ?? (parameter.input_type === "number" ? 2 : null),
    example_ru: parameter.unit ? `Например: 100 ${unit?.symbol ?? parameter.unit}` : "Например: укажите известное значение",
    default_value: null,
    default_source: null,
    required_condition: parameter.required ? "required_when_parameter_is_applicable" : "not_required",
    applicability_condition: parameter.visibility_rule || "always",
    formula_dependencies: uniqueSorted([...parameter.dependencies, ...parameter.affected_formulas]),
    affected_row_ids: affectedRows,
    specification_bindings: uniqueSorted(parameter.affected_materials),
    price_binding_keys: [],
    provenance: `ProfessionalWorkPassportV2:${parameter.source_type}`,
    confidence: parameter.source_type === "professional_suggestion" ? "low" : "medium",
    validation_message_ru: parameter.input_type === "number"
      ? "Введите значение в допустимом диапазоне и выберите совместимую единицу."
      : "Укажите значение в формате, описанном в поле.",
    missing_value_consequence_ru: necessity === "critical"
      ? "Без значения честный расчёт количества заблокирован."
      : necessity === "recommended"
        ? "Смета останется предварительной и потребует явного допущения."
        : "Параметр будет учтён только при применимости.",
    assumption_when_missing_ru: necessity === "recommended" ? parameter.default_policy : null,
    internal_only: parameter.role === "SYSTEM_HIDDEN",
  };
}

function parameterSchemaV4(passport: ProfessionalWorkPassportV2): WorkSpecificParameterSchemaV4 {
  return {
    schema_id: `${passport.identity.work_id}:parameter-schema:v4-adapter`,
    schema_version: "WorkSpecificParameterSchemaV4",
    owner_work_id: passport.identity.work_id,
    owner_family_id: passport.identity.professional_family_id,
    parameters: passport.parameter_graph.parameters.map((parameter) =>
      parameterV4(parameter, passport.identity.work_id, passport.identity.professional_family_id)),
    mutually_exclusive_input_groups: [],
    question_budget: { initial_maximum: 5, hard_maximum: 12 },
    compatibility_source: "v2_adapter",
  };
}

function serviceCategory(name: string): BoqCategoryV4 {
  if (/испыт|лаборатор|test|commission|пусконалад/i.test(name)) return "testing";
  if (/документ|исполнительн|паспорт|схем|document/i.test(name)) return "documentation";
  if (/разрешен|согласован|permit/i.test(name)) return "permit";
  if (/достав|перевоз|вывоз|транспорт|рейс|haul/i.test(name)) return "transport";
  if (/временн|мобилизац|огражден|лес[аы]|temporary/i.test(name)) return "temporary_work";
  return "subcontract_service";
}

function operationCategory(operation: ProfessionalWorkPassportV2Operation): BoqCategoryV4 {
  const unitId = canonicalEngineeringUnitIdV4(operation.unit);
  if (unitId === "man_hour") return "labor";
  return serviceCategory(operation.exact_name_ru);
}

function equipmentCategory(
  equipment: ProfessionalWorkPassportV2Equipment,
  machineCodes: ReadonlySet<string>,
): BoqCategoryV4 {
  return machineCodes.has(equipment.equipment_code) || /машин|кран|экскават|насос|каток|machine|crane|pump/i.test(equipment.exact_name_ru)
    ? "machinery"
    : "equipment";
}

type V2Line = {
  row_id: string;
  category: BoqCategoryV4;
  title_ru: string;
  technical_specification_ru: string;
  unit: string;
  formula_id: string;
  expression: string;
  applicability: string;
  source_id: string;
  confidence: EvidenceConfidenceV4;
  quality_control_ru: string[];
};

function v2Lines(passport: ProfessionalWorkPassportV2): V2Line[] {
  const machineCodes = new Set(passport.machines.map((item) => item.equipment_code));
  return [
    ...passport.material_assemblies.map((item: ProfessionalWorkPassportV2Material): V2Line => ({
      row_id: item.material_code,
      category: "material",
      title_ru: item.exact_name_ru,
      technical_specification_ru: [item.material_class, item.grade, item.strength, item.size, item.standard].filter(Boolean).join("; "),
      unit: item.unit,
      formula_id: passport.quantity_formulas.find((formula) => formula.expression === item.consumption_formula)?.formula_id ?? `${item.material_code}:formula:v2`,
      expression: item.consumption_formula,
      applicability: item.activation_rule,
      source_id: item.norm_source_id,
      confidence: "medium",
      quality_control_ru: [],
    })),
    ...passport.work_operations.map((item: ProfessionalWorkPassportV2Operation): V2Line => ({
      row_id: item.operation_code,
      category: operationCategory(item),
      title_ru: item.exact_name_ru,
      technical_specification_ru: item.scope_ru,
      unit: item.unit,
      formula_id: passport.quantity_formulas.find((formula) => formula.expression === item.quantity_formula)?.formula_id ?? `${item.operation_code}:formula:v2`,
      expression: item.quantity_formula,
      applicability: item.activation_rule,
      source_id: item.norm_source_id,
      confidence: "medium",
      quality_control_ru: item.quality_control,
    })),
    ...passport.services.map((item: ProfessionalWorkPassportV2Service): V2Line => ({
      row_id: item.service_code,
      category: serviceCategory(item.exact_name_ru),
      title_ru: item.exact_name_ru,
      technical_specification_ru: [item.scope_ru, ...item.provider_requirements].join("; "),
      unit: item.unit,
      formula_id: passport.quantity_formulas.find((formula) => formula.expression === item.quantity_formula)?.formula_id ?? `${item.service_code}:formula:v2`,
      expression: item.quantity_formula,
      applicability: item.activation_rule,
      source_id: item.source_id,
      confidence: "medium",
      quality_control_ru: [],
    })),
    ...passport.equipment.map((item: ProfessionalWorkPassportV2Equipment): V2Line => ({
      row_id: item.equipment_code,
      category: equipmentCategory(item, machineCodes),
      title_ru: item.exact_name_ru,
      technical_specification_ru: [item.equipment_class, item.capacity, ...item.technical_characteristics].filter(Boolean).join("; "),
      unit: item.unit,
      formula_id: passport.quantity_formulas.find((formula) => formula.expression === item.machine_time_formula)?.formula_id ?? `${item.equipment_code}:formula:v2`,
      expression: item.machine_time_formula,
      applicability: item.activation_rule,
      source_id: item.norm_source_id,
      confidence: "medium",
      quality_control_ru: [],
    })),
  ];
}

function formulaV4(
  line: V2Line,
  parameterUnits: ReadonlyMap<string, string | null>,
): FormulaDefinitionV4 {
  const dependencies = extractAiEstimateFormulaIdentifiers(line.expression);
  const inputUnitIds = Object.fromEntries(dependencies.map((key) => [key, parameterUnits.get(key) ?? null]));
  const outputUnitId = canonicalEngineeringUnitIdV4(line.unit);
  const validation = validateFormulaDimensionsV4({
    expression: line.expression,
    input_unit_ids: inputUnitIds,
    output_unit_id: outputUnitId,
  });
  return {
    formula_id: line.formula_id,
    expression: line.expression,
    input_parameter_ids: dependencies,
    input_unit_ids: inputUnitIds,
    output_unit_id: outputUnitId,
    rounding_rule: "preserved_from_v2_expression",
    waste_rule: "preserved_from_v2_or_unresolved",
    applicability: line.applicability,
    source_ids: line.source_id ? [line.source_id] : [],
    dimensional_status: validation.ok ? "valid" : "blocked",
    dimensional_blockers: validation.blockers,
    explanation_trace_ru: `Адаптировано из V2; формула ${line.formula_id}; результат в ${outputUnitId ?? line.unit}.`,
  };
}

function wbsCode(index: number): string {
  return `V2.${String(index + 1).padStart(3, "0")}`;
}

function boqRowV4(line: V2Line, formula: FormulaDefinitionV4, index: number): BoqLineDefinitionV4 {
  const unitId = canonicalEngineeringUnitIdV4(line.unit);
  return {
    row_id: line.row_id,
    wbs_code: wbsCode(index),
    parent_wbs_code: "V2",
    section: line.category,
    phase: "v2_compatibility_import",
    category: line.category,
    professional_name_ru: line.title_ru,
    action: line.category === "material" || line.category === "equipment" ? "поставка" : "выполнение",
    action_object: line.title_ru,
    technical_specification_ru: line.technical_specification_ru,
    unit_id: unitId,
    formula_id: formula.formula_id,
    formula_inputs: formula.input_parameter_ids,
    applicability: line.applicability,
    inclusion_reason_ru: "Строка присутствует в resolved ProfessionalWorkPassportV2.",
    exclusion_rule: "Исключить, если условие применимости не выполнено.",
    waste_coefficient: null,
    consumption_norm: null,
    productivity: null,
    labor_hours: null,
    machine_hours: null,
    source_id: line.source_id || null,
    price_key: null,
    shared_scope_key: null,
    alternative_group: null,
    price_status: "PRICE_MISSING",
    confidence: line.confidence,
    explanation_trace_ru: formula.explanation_trace_ru,
  };
}

function resourceV4(line: V2Line): ResourceRequirementV4 {
  return {
    resource_id: line.row_id,
    category: line.category,
    professional_name_ru: line.title_ru,
    technical_specification_ru: line.technical_specification_ru,
    unit_id: canonicalEngineeringUnitIdV4(line.unit),
    formula_id: line.formula_id,
    applicability: line.applicability,
    inclusion_reason_ru: "Импортировано из ресурсной композиции V2.",
    exclusion_rule: "Не включать при неприменимости.",
    price_key: null,
    shared_scope_key: null,
    alternative_group: null,
    confidence: line.confidence,
    source_ids: line.source_id ? [line.source_id] : [],
  };
}

function operationV4(line: V2Line, index: number): OperationV4 {
  return {
    operation_id: `${line.row_id}:operation:v4-adapter`,
    wbs_code: wbsCode(index),
    professional_name_ru: line.title_ru,
    action: "выполнение",
    action_object: line.title_ru,
    technical_specification_ru: line.technical_specification_ru,
    output_unit_id: canonicalEngineeringUnitIdV4(line.unit),
    formula_id: line.formula_id,
    applicability: line.applicability,
    quality_control_ru: line.quality_control_ru,
    safety_requirements_ru: [],
    source_ids: line.source_id ? [line.source_id] : [],
  };
}

function evidenceV4(passport: ProfessionalWorkPassportV2): NormativeEvidenceV4[] {
  return passport.norm_sources.map((source) => ({
    source_id: source.source_id,
    url_or_document_id: source.source_url,
    title: source.document_title,
    organization: source.publisher,
    jurisdiction: source.jurisdiction,
    effective_date: source.effective_date,
    accessed_at: source.effective_date,
    applicability: source.applicability,
    version: source.edition,
    checksum: source.content_hash,
    license_state: source.license_state,
    linked_row_ids: [],
    linked_parameter_ids: [],
    extracted_fact_ids: [],
    confidence: /official|manufacturer/i.test(source.validation_status) ? "high" : "medium",
  }));
}

export function adaptProfessionalWorkPassportV2ToV4(
  passport: ProfessionalWorkPassportV2,
): ProfessionalEstimatePassportV4 {
  const parameterSchema = parameterSchemaV4(passport);
  const parameterUnits = new Map(parameterSchema.parameters.map((parameter) => [parameter.canonical_key, parameter.canonical_unit_id]));
  const lines = v2Lines(passport);
  const formulas = lines.map((line) => formulaV4(line, parameterUnits));
  const boqRows = lines.map((line, index) => boqRowV4(line, formulas[index], index));
  const scopeClass = scopeClassForV2(passport);
  const unresolved = uniqueSorted([
    "missing_work_specific_overlay",
    ...formulas.flatMap((formula) => formula.dimensional_blockers.map((blocker) => `formula:${formula.formula_id}:${blocker}`)),
    ...boqRows.flatMap((row) => validateCategoryUnitV4({ category: row.category, unit_id: row.unit_id, professional_name_ru: row.professional_name_ru }).blockers.map((blocker) => `row:${row.row_id}:${blocker}`)),
  ]);
  const withoutHash: Omit<ProfessionalEstimatePassportV4, "deterministic_hash"> = {
    schema_version: PROFESSIONAL_ESTIMATE_V4_SCHEMA,
    catalog_work: {
      stable_work_id: passport.identity.work_id,
      catalog_version: passport.version.source_passport_version,
      active: true,
    },
    identity: {
      stable_work_id: passport.identity.work_id,
      professional_name_ru: passport.identity.canonical_name_ru,
      synonyms_ru: passport.identity.synonyms_ru,
      industry: passport.classification.category,
      family_id: passport.identity.professional_family_id,
      action: null,
      object: null,
      technology: null,
      purpose: passport.identity.description_ru,
    },
    scope: {
      scope_class: scopeClass,
      purpose_ru: passport.identity.description_ru,
      included_scope_ru: passport.scope.included_scope_ru,
      excluded_scope_ru: passport.scope.excluded_scope_ru,
      applicability_rules: passport.applicability.applicable_when_ru,
      complexity_rules: passport.applicability.scale_assumptions_ru,
      regional_conditions: [],
    },
    parameter_schema: parameterSchema,
    wbs: [
      { wbs_code: "V2", parent_wbs_code: null, title_ru: "Импортированная структура V2", phase: "v2_compatibility_import", applicability: "always", sequence: 0 },
      ...lines.map((line, index) => ({ wbs_code: wbsCode(index), parent_wbs_code: "V2", title_ru: line.title_ru, phase: "v2_compatibility_import", applicability: line.applicability, sequence: index + 1 })),
    ],
    operations: lines.filter((line) => line.category !== "material" && line.category !== "equipment").map(operationV4),
    resources: lines.map(resourceV4),
    formulas,
    boq_rows: boqRows,
    price_observations: [],
    commercial_lines: [],
    procurement_lines: [],
    normative_evidence: evidenceV4(passport),
    assumptions_ru: passport.applicability.scale_assumptions_ru,
    uncertainty_ru: [
      "V2 не доказывает наличие отдельно проверенного work-specific overlay V4.",
      "Размерности формул, applicability и shared scope требуют V4-валидации и экспертного подтверждения.",
    ],
    confidence: "medium",
    expert_review_status: passport.applicability.expert_review_required ? "EXPERT_REVIEW_REQUIRED" : "NOT_REVIEWED",
    status: "V2_COMPATIBILITY_GAPS_RECORDED",
    inheritance: {
      source_contract: "ProfessionalWorkPassportV2",
      family_passport_id: passport.lineage.professional_family_passport_id,
      work_specific_overlay_id: null,
      adapter_version: PROFESSIONAL_ESTIMATE_V2_TO_V4_ADAPTER_VERSION,
    },
    unresolved_requirements: unresolved,
    semantic_signature: passport.validation.semantic_signature.combined_signature_hash,
  };
  return {
    ...withoutHash,
    deterministic_hash: estimateDeterministicHash(withoutHash),
  };
}
