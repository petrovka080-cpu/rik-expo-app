import {
  buildAiEstimateParameterSchema,
  clearAiEstimateParameterSchemaCache,
  type AiEstimateParameterSchemaField,
} from "./aiEstimateParameterSchema";
import {
  buildProfessionalWorkPassport,
  clearProfessionalWorkPassportBuildCaches,
  listProfessionalWorkPassportTemplateIds,
} from "./buildProfessionalWorkPassport";
import { estimateDeterministicHash } from "./estimateDeterministicHash";
import { buildNormPackCitationsForRows } from "./normPackCitationContract";
import { buildPublicReferenceEstimateOwnership } from "./publicReferenceEstimateOwnership";
import { getEstimateSourceRecord } from "./sourceRegistry";
import type { EstimateSourceRegistryRecord } from "./sourceRegistryContract";
import type {
  ProfessionalWorkPassportV2,
  ProfessionalWorkPassportV2AcceptanceCase,
  ProfessionalWorkPassportV2Equipment,
  ProfessionalWorkPassportV2Formula,
  ProfessionalWorkPassportV2Material,
  ProfessionalWorkPassportV2MaterialVariant,
  ProfessionalWorkPassportV2NormSource,
  ProfessionalWorkPassportV2Operation,
  ProfessionalWorkPassportV2Parameter,
  ProfessionalWorkPassportV2ParameterRole,
  ProfessionalWorkPassportV2ReferenceEstimate,
  ProfessionalWorkPassportV2SemanticSignature,
  ProfessionalWorkPassportV2Service,
} from "./professionalWorkPassportV2Contract";
import type { ProfessionalBoqRecipeRow, ProfessionalWorkPassport, WorkPassportParameter } from "./workPassportContract";

const RESOLVED_AT = "2026-07-14T00:00:00.000Z";
const SYSTEM_PARAMETER_KEYS = new Set(["source_prompt", "inline_work_prompt", "raw_input", "formula_id", "norm_source"]);
const PROFESSIONAL_WORK_PASSPORT_V2_CACHE_LIMIT = 64;

type RowCitationIndex = Map<string, ReturnType<typeof buildNormPackCitationsForRows>[number]>;

export type ProfessionalWorkPassportV2CacheStats = {
  cache_limit: number;
  cache_size: number;
  cache_hits: number;
  cache_misses: number;
};

let passportV2CacheHits = 0;
let passportV2CacheMisses = 0;
const passportV2Cache = new Map<string, ProfessionalWorkPassportV2>();

function deepFreezeProfessionalWorkPassportV2<T>(value: T, seen = new WeakSet<object>()): T {
  if (value === null || typeof value !== "object") return value;
  const objectValue = value as object;
  if (seen.has(objectValue)) return value;
  seen.add(objectValue);
  Object.values(objectValue as Record<string, unknown>).forEach((nested) => {
    deepFreezeProfessionalWorkPassportV2(nested, seen);
  });
  return Object.freeze(objectValue) as T;
}

function rememberPassportV2(templateId: string, passport: ProfessionalWorkPassportV2): ProfessionalWorkPassportV2 {
  const frozenPassport = deepFreezeProfessionalWorkPassportV2(passport);
  passportV2Cache.delete(templateId);
  passportV2Cache.set(templateId, frozenPassport);
  while (passportV2Cache.size > PROFESSIONAL_WORK_PASSPORT_V2_CACHE_LIMIT) {
    const oldest = passportV2Cache.keys().next().value;
    if (!oldest) break;
    passportV2Cache.delete(oldest);
  }
  return frozenPassport;
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

function compact(value: string): string {
  return value.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function codeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 120);
}

function firstNonEmpty(...values: (string | null | undefined)[]): string {
  return values.find((value) => Boolean(value?.trim()))?.trim() ?? "";
}

function rowCitationIndex(rows: readonly ProfessionalBoqRecipeRow[]): RowCitationIndex {
  return new Map(buildNormPackCitationsForRows(rows).map((citation) => [citation.rowId, citation]));
}

function sourceIdForRow(row: ProfessionalBoqRecipeRow, citations: RowCitationIndex): string {
  return citations.get(row.rowId)?.registrySourceId ?? row.normSourceId;
}

function rowsByIds(rows: readonly ProfessionalBoqRecipeRow[], ids: readonly string[]): ProfessionalBoqRecipeRow[] {
  const wanted = new Set(ids);
  return rows.filter((row) => wanted.has(row.rowId));
}

function rowsForParameter(
  field: Pick<AiEstimateParameterSchemaField, "affectsRowIds">,
  rows: readonly ProfessionalBoqRecipeRow[],
): ProfessionalBoqRecipeRow[] {
  const direct = rowsByIds(rows, field.affectsRowIds);
  return direct.length > 0 ? direct : rows.slice(0, Math.min(rows.length, 8));
}

function roleForField(field: AiEstimateParameterSchemaField): ProfessionalWorkPassportV2ParameterRole {
  if (SYSTEM_PARAMETER_KEYS.has(field.key)) return "SYSTEM_HIDDEN";
  if (field.required) return "P0_REQUIRED";
  if (field.source === "formula_dependency") return "COMPUTED";
  if (field.requiredFor === "contract_ready" || field.source === "passport_optional") return "P1_DETAIL";
  return "P2_CONDITION";
}

function parameterQuestion(field: AiEstimateParameterSchemaField): string {
  const unit = field.unitRu ? `, ${field.unitRu}` : "";
  return `Уточните параметр "${field.labelRu}"${unit}`;
}

function parameterHelp(field: AiEstimateParameterSchemaField): string {
  const affected = field.affectsRowTitlesRu.slice(0, 3).join("; ");
  return affected
    ? `Влияет на строки сметы: ${affected}.`
    : "Используется в формульном графе профессиональной сметы.";
}

function rangeForField(field: AiEstimateParameterSchemaField): { minimum: number | null; maximum: number | null } {
  if (field.inputKind !== "number") return { minimum: null, maximum: null };
  if (/percent|процент/i.test(field.key)) return { minimum: 0, maximum: 100 };
  if (/count|points|pcs/i.test(field.key)) return { minimum: 0, maximum: 100000 };
  return { minimum: 0, maximum: null };
}

function defaultPolicyForField(field: AiEstimateParameterSchemaField, role: ProfessionalWorkPassportV2ParameterRole): string {
  if (role === "SYSTEM_HIDDEN") return "system_bound_from_raw_input_or_runtime_context";
  if (role === "COMPUTED") return "computed_from_quantity_formula_trace_with_visible_override";
  if (field.required) return "ask_or_extract_from_user_raw_input_before_detailed_estimate";
  return "professional_default_allowed_for_preliminary_boq_with_visible_disclosure";
}

function parameterFromField(
  field: AiEstimateParameterSchemaField,
  rows: readonly ProfessionalBoqRecipeRow[],
): ProfessionalWorkPassportV2Parameter {
  const role = roleForField(field);
  const affectedRows = rowsForParameter(field, rows);
  const range = rangeForField(field);
  return {
    canonical_key: field.key,
    label_ru: field.labelRu,
    question_ru: parameterQuestion(field),
    help_ru: parameterHelp(field),
    unit: field.unit,
    input_type: field.inputKind,
    allowed_values: field.inputKind === "select" ? ["base", "detailed", "expert_review_required"] : [],
    required: field.required,
    priority: field.priority,
    minimum: range.minimum,
    maximum: range.maximum,
    default_policy: defaultPolicyForField(field, role),
    source_type: field.source,
    dependencies: uniqueSorted(extractFormulaInputKeys(field.formulaRefs.join(" ")).filter((key) => key !== field.key)),
    affected_formulas: uniqueSorted(field.formulaRefs),
    affected_materials: affectedRows.filter((row) => row.rowType === "material").map((row) => row.rowId),
    affected_operations: affectedRows.filter((row) => row.rowType !== "material").map((row) => row.rowId),
    visibility_rule: role === "SYSTEM_HIDDEN" ? "hidden_from_user" : "visible_when_missing_or_user_requested_detail",
    role,
  };
}

function hiddenParameterFromPassportParam(
  param: WorkPassportParameter,
  rows: readonly ProfessionalBoqRecipeRow[],
): ProfessionalWorkPassportV2Parameter {
  return {
    canonical_key: param.key,
    label_ru: param.labelRu,
    question_ru: "",
    help_ru: "Служебный параметр привязан к исходному запросу и не показывается как повторный вопрос.",
    unit: param.unit,
    input_type: "text",
    allowed_values: [],
    required: param.required,
    priority: 900,
    minimum: null,
    maximum: null,
    default_policy: "system_bound_from_raw_input_or_runtime_context",
    source_type: param.source,
    dependencies: [],
    affected_formulas: uniqueSorted(rows.slice(0, 12).map((row) => row.quantityFormula)),
    affected_materials: rows.filter((row) => row.rowType === "material").slice(0, 12).map((row) => row.rowId),
    affected_operations: rows.filter((row) => row.rowType !== "material").slice(0, 12).map((row) => row.rowId),
    visibility_rule: "hidden_from_user",
    role: "SYSTEM_HIDDEN",
  };
}

function buildParameterGraph(passport: ProfessionalWorkPassport): ProfessionalWorkPassportV2["parameter_graph"] {
  const schema = buildAiEstimateParameterSchema(passport.templateId);
  const rows = passport.boqRecipe.allRows;
  const visibleParameters = (schema?.fields ?? []).map((field) => parameterFromField(field, rows));
  const existing = new Set(visibleParameters.map((param) => param.canonical_key));
  const hidden = [
    ...passport.parameterSchema.required,
    ...passport.parameterSchema.optional,
  ]
    .filter((param) => SYSTEM_PARAMETER_KEYS.has(param.key) && !existing.has(param.key))
    .map((param) => hiddenParameterFromPassportParam(param, rows));
  const parameters = [...visibleParameters, ...hidden].sort((left, right) =>
    left.priority - right.priority || left.label_ru.localeCompare(right.label_ru, "ru")
  );
  const keysByRole = (role: ProfessionalWorkPassportV2ParameterRole) =>
    parameters.filter((param) => param.role === role).map((param) => param.canonical_key);
  return {
    schema_id: passport.parameterSchema.schemaId,
    visible_question_limit: 5,
    parameters,
    p0_required: keysByRole("P0_REQUIRED"),
    p1_detail: keysByRole("P1_DETAIL"),
    p2_condition: keysByRole("P2_CONDITION"),
    computed: keysByRole("COMPUTED"),
    system_hidden: keysByRole("SYSTEM_HIDDEN"),
  };
}

function parseMaterialFacts(title: string) {
  return {
    grade: firstNonEmpty(title.match(/\b(?:D|M|B|A)\d+(?:[.,]\d+)?[A-ZА-Я]*/i)?.[0], null) || null,
    strength: firstNonEmpty(title.match(/\bB\d+(?:[.,]\d+)?\b/i)?.[0], null) || null,
    size: firstNonEmpty(title.match(/\b\d+\s*[xх×]\s*\d+(?:\s*[xх×]\s*\d+)?\s*(?:мм|mm|м|m)\b/i)?.[0], null) || null,
    thickness: firstNonEmpty(title.match(/(?:толщин[а-я]*|thickness)\s*\d+(?:[.,]\d+)?\s*(?:мм|mm|м|m)/i)?.[0], null) || null,
    diameter: firstNonEmpty(title.match(/(?:диаметр[а-я]*|d)\s*\d+(?:[.,]\d+)?\s*(?:мм|mm|м|m)?/i)?.[0], null) || null,
    density: firstNonEmpty(title.match(/(?:плотност[а-я]*|density)\s*\d+(?:[.,]\d+)?\s*(?:кг\/м3|кг\/м³|kg\/m3)?/i)?.[0], null) || null,
  };
}

function materialClass(title: string, familyId: string): string {
  const text = compact(`${title} ${familyId}`);
  if (/бетон|concrete/.test(text)) return "concrete";
  if (/арматур|rebar|steel|сталь/.test(text)) return "reinforcement_or_steel";
  if (/кабель|cable|wire|электр/.test(text)) return "electrical_material";
  if (/труб|pipe|pipeline/.test(text)) return "pipe_material";
  if (/утепл|insulat|mineral|membrane|изоляц/.test(text)) return "insulation_or_membrane";
  if (/раствор|клей|mortar|adhesive|primer|грунт/.test(text)) return "binder_or_coating";
  return `${codeToken(familyId)}_material`;
}

function wasteFactor(row: ProfessionalBoqRecipeRow): string {
  return row.calculationTraceTemplate.match(/wastePercent=([^;]+)/i)?.[1] ?? "trace_defined_or_not_applicable";
}

function materialFromRow(
  row: ProfessionalBoqRecipeRow,
  passport: ProfessionalWorkPassport,
  citations: RowCitationIndex,
): ProfessionalWorkPassportV2Material {
  const facts = parseMaterialFacts(row.titleRu);
  const sourceId = sourceIdForRow(row, citations);
  return {
    material_code: row.rowId,
    exact_name_ru: row.titleRu,
    material_class: materialClass(row.titleRu, passport.familyId),
    grade: facts.grade,
    strength: facts.strength,
    size: facts.size,
    thickness: facts.thickness,
    diameter: facts.diameter,
    density: facts.density,
    standard: row.normSourceTitle || citations.get(row.rowId)?.sourceCitation || null,
    unit: row.sourceUnit,
    consumption_formula: row.quantityFormula,
    waste_factor: wasteFactor(row),
    activation_rule: `active_for_work_id=${passport.templateId}; row_type=material`,
    norm_source_id: sourceId,
    technical_source_id: sourceId,
  };
}

function operationQuality(row: ProfessionalBoqRecipeRow): string[] {
  const title = compact(row.titleRu);
  if (/контроль|испыт|провер|quality|test/.test(title)) return [row.titleRu];
  return [
    "Проверить соответствие объёма, основания и последовательности работ проектным данным.",
    "Зафиксировать результат и замечания в сметном/исполнительном контуре.",
  ];
}

function operationFromRow(row: ProfessionalBoqRecipeRow, citations: RowCitationIndex): ProfessionalWorkPassportV2Operation {
  return {
    operation_code: row.rowId,
    exact_name_ru: row.titleRu,
    scope_ru: `Операция учтена в составе строки "${row.titleRu}".`,
    unit: row.sourceUnit,
    quantity_formula: row.quantityFormula,
    labor_norm: `${row.normId}; ${row.normVersion}`,
    crew: "professional_crew_defined_by_norm_pack_or_expert_review",
    activation_rule: `active_when_formula_applies:${row.formulaId}`,
    quality_control: operationQuality(row),
    norm_source_id: sourceIdForRow(row, citations),
  };
}

function serviceFromRow(row: ProfessionalBoqRecipeRow, citations: RowCitationIndex): ProfessionalWorkPassportV2Service {
  return {
    service_code: row.rowId,
    exact_name_ru: row.titleRu,
    scope_ru: `Услуга учтена как отдельная позиция сметы: ${row.titleRu}.`,
    unit: row.sourceUnit,
    quantity_formula: row.quantityFormula,
    activation_rule: `active_when_formula_applies:${row.formulaId}`,
    provider_requirements: [
      "Исполнитель должен подтвердить состав услуги, объём и применимость источника перед договорной сметой.",
    ],
    source_id: sourceIdForRow(row, citations),
  };
}

function equipmentClass(title: string, familyId: string): string {
  const text = compact(`${title} ${familyId}`);
  if (/экскаватор|excavator|землер/.test(text)) return "earthmoving_machine";
  if (/кран|crane|подъем/.test(text)) return "lifting_machine";
  if (/насос|pump/.test(text)) return "pump_or_pressure_equipment";
  if (/каток|roller|вибр/.test(text)) return "compaction_or_vibration_equipment";
  if (/станц|inverter|server|boiler|transformer|агрегат/.test(text)) return "installed_equipment";
  return `${codeToken(familyId)}_equipment`;
}

function equipmentCapacity(title: string): string | null {
  return firstNonEmpty(
    title.match(/\b\d+(?:[.,]\d+)?\s*(?:т|t|кВт|kw|MW|м3|м³|m3|мм|mm)\b/i)?.[0],
    null,
  ) || null;
}

function equipmentFromRow(
  row: ProfessionalBoqRecipeRow,
  passport: ProfessionalWorkPassport,
  citations: RowCitationIndex,
): ProfessionalWorkPassportV2Equipment {
  return {
    equipment_code: row.rowId,
    exact_name_ru: row.titleRu,
    equipment_class: equipmentClass(row.titleRu, passport.familyId),
    capacity: equipmentCapacity(row.titleRu),
    technical_characteristics: [
      `unit=${row.sourceUnit}`,
      `formula=${row.quantityFormula}`,
      `norm=${row.normId}`,
    ],
    unit: row.sourceUnit,
    machine_time_formula: row.quantityFormula,
    activation_rule: `active_when_formula_applies:${row.formulaId}`,
    norm_source_id: sourceIdForRow(row, citations),
  };
}

const FORMULA_KEY_DENYLIST = new Set([
  "formula_id",
  "norm_id",
  "norm_source",
  "norm_version",
  "result",
  "template_id",
  "row_id",
  "row_code",
  "price_status",
  "included_in_procurement",
]);

function extractFormulaInputKeys(expression: string): string[] {
  const keys = new Set<string>();
  if (/(^|[^a-zA-Z0-9_])q([^a-zA-Z0-9_]|$)/.test(expression)) keys.add("q");
  for (const match of expression.matchAll(/\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g)) {
    const key = match[0];
    if (FORMULA_KEY_DENYLIST.has(key)) continue;
    if (/^(src|norm|source|template|included|price|formula)_/.test(key)) continue;
    keys.add(key);
  }
  return [...keys].sort();
}

function roundingRule(row: ProfessionalBoqRecipeRow): string {
  return row.calculationTraceTemplate.match(/rounding=([^;]+)/i)?.[1] ?? "round_to_4_or_source_defined";
}

function formulaFromRow(row: ProfessionalBoqRecipeRow, citations: RowCitationIndex): ProfessionalWorkPassportV2Formula {
  return {
    formula_id: row.formulaId,
    expression: row.quantityFormula,
    input_keys: extractFormulaInputKeys(row.quantityFormula),
    output_unit: row.sourceUnit,
    rounding_rule: roundingRule(row),
    waste_rule: wasteFactor(row),
    condition_rule: `included_when_row_active:${row.rowId}`,
    source_id: sourceIdForRow(row, citations),
    version: row.normVersion,
  };
}

function normSourceFromRecord(record: EstimateSourceRegistryRecord): ProfessionalWorkPassportV2NormSource {
  return {
    source_id: record.source_id,
    source_url: record.official_url ?? record.citation.url ?? null,
    publisher: record.issuer,
    jurisdiction: record.jurisdiction,
    document_title: record.document_title,
    edition: record.edition,
    effective_date: record.effective_date,
    license_state: record.license_state,
    applicability: record.applicability,
    content_hash: record.content_hash,
    validation_status: record.verification_status,
  };
}

function buildNormSources(citations: RowCitationIndex): ProfessionalWorkPassportV2NormSource[] {
  return uniqueSorted([...citations.values()].map((citation) => citation.registrySourceId))
    .map((sourceId) => getEstimateSourceRecord(sourceId))
    .filter((record): record is EstimateSourceRegistryRecord => Boolean(record))
    .map(normSourceFromRecord);
}

function referenceEstimate(passport: ProfessionalWorkPassport): ProfessionalWorkPassportV2ReferenceEstimate[] {
  const ownership = buildPublicReferenceEstimateOwnership(passport);
  if (!ownership) return [];
  return [{
    reference_owner_id: ownership.reference_owner_id,
    reference_family_id: ownership.reference_family_id,
    validation_status: ownership.validation_status,
    source_registry_ids: ownership.source_registry_ids,
    source_url: ownership.source_url,
    covered_scope_ru: ownership.covered_scope,
    excluded_scope_ru: ownership.excluded_scope,
  }];
}

function buildMaterialVariants(
  passport: ProfessionalWorkPassport,
  citations: RowCitationIndex,
): ProfessionalWorkPassportV2MaterialVariant[] {
  const materials = passport.boqRecipe.materialRows;
  const operations = [...passport.boqRecipe.workRows, ...passport.boqRecipe.laborRows];
  const equipment = passport.boqRecipe.equipmentRows;
  const formulas = passport.boqRecipe.allRows.map((row) => row.formulaId);
  if (materials.length === 0) return [];
  const base: ProfessionalWorkPassportV2MaterialVariant = {
    variant_code: `${passport.templateId}:base_resource_assembly:v1`,
    exact_name_ru: `Базовая ресурсная сборка: ${materials[0].titleRu}`,
    activation_rule: `default_variant_for_work_id=${passport.templateId}`,
    affected_material_codes: materials.map((row) => row.rowId),
    affected_operation_codes: operations.slice(0, 12).map((row) => row.rowId),
    affected_equipment_codes: equipment.slice(0, 8).map((row) => row.rowId),
    affected_formula_ids: uniqueSorted(formulas).slice(0, 24),
    source_ids: uniqueSorted(materials.map((row) => sourceIdForRow(row, citations))),
  };
  const materialSpecific = materials.slice(0, 3).map((row): ProfessionalWorkPassportV2MaterialVariant => ({
    variant_code: `${passport.templateId}:${codeToken(row.rowId)}:material_variant:v1`,
    exact_name_ru: `Вариант материала: ${row.titleRu}`,
    activation_rule: `active_when_user_selects_or_raw_input_mentions:${row.titleRu}`,
    affected_material_codes: [row.rowId],
    affected_operation_codes: operations.slice(0, 8).map((operation) => operation.rowId),
    affected_equipment_codes: equipment.slice(0, 4).map((item) => item.rowId),
    affected_formula_ids: uniqueSorted([row.formulaId, ...operations.slice(0, 4).map((operation) => operation.formulaId)]),
    source_ids: uniqueSorted([sourceIdForRow(row, citations)]),
  }));
  return [base, ...materialSpecific];
}

function signatureHash(value: unknown): string {
  return estimateDeterministicHash(value);
}

function semanticSignature(passport: ProfessionalWorkPassport): ProfessionalWorkPassportV2SemanticSignature {
  const workIntent = {
    work_key: compact(passport.workKey),
    canonical_name: compact(passport.localizedNameRu),
    scope: compact(passport.workDescription.scopeSummary),
  };
  const rowShape = (rows: readonly ProfessionalBoqRecipeRow[]) => rows.map((row) => ({
    title: compact(row.titleRu),
    type: row.rowType,
    unit: row.canonicalUnit,
    formula: compact(row.quantityFormula).replace(new RegExp(codeToken(passport.templateId), "g"), "work"),
    source: row.normSourceId,
  }));
  const parameterSignature = signatureHash([
    ...passport.parameterSchema.required,
    ...passport.parameterSchema.optional,
  ].map((param) => ({
    key: param.key,
    unit: param.unit,
    required: param.required,
  })));
  const materialSignature = signatureHash(rowShape(passport.boqRecipe.materialRows));
  const operationSignature = signatureHash({
    workIntent,
    rows: rowShape([...passport.boqRecipe.workRows, ...passport.boqRecipe.laborRows]),
  });
  const serviceSignature = signatureHash(rowShape([...passport.boqRecipe.serviceRows, ...passport.boqRecipe.transportRows]));
  const equipmentSignature = signatureHash(rowShape(passport.boqRecipe.equipmentRows));
  const formulaSignature = signatureHash({
    workIntent,
    rows: rowShape(passport.boqRecipe.allRows).map((row) => ({
      unit: row.unit,
      formula: row.formula,
      source: row.source,
    })),
  });
  return {
    parameter_signature: parameterSignature,
    material_signature: materialSignature,
    operation_signature: operationSignature,
    service_signature: serviceSignature,
    equipment_signature: equipmentSignature,
    formula_signature: formulaSignature,
    combined_signature_hash: signatureHash({
      parameterSignature,
      materialSignature,
      operationSignature,
      serviceSignature,
      equipmentSignature,
      formulaSignature,
    }),
  };
}

function safetyRequirements(passport: ProfessionalWorkPassport): ProfessionalWorkPassportV2["safety_requirements"] {
  return {
    requirements_ru: [
      "Проверить применимость технологии, доступ к зоне работ и ограничения площадки до договорной сметы.",
      "Опасные и скрытые работы требуют профессиональной проверки, актирования и соблюдения проектных требований.",
      passport.riskPolicy.specialistReviewNoteRequired
        ? "Для этого семейства обязателен комментарий профильного специалиста перед финальной сметой."
        : "Для предварительной сметы требуется раскрыть допущения и отсутствующие исходные данные.",
    ],
    specialist_review_required: passport.riskPolicy.specialistReviewNoteRequired,
    forbidden_final_claims_ru: [
      "Не заявлять финальную договорную стоимость без ценовых источников и экспертной проверки.",
      "Не скрывать отсутствующие проектные данные, региональные цены и ограничения применимости.",
    ],
  };
}

function qualityControl(passport: ProfessionalWorkPassport, citations: RowCitationIndex): ProfessionalWorkPassportV2["quality_control"] {
  const qualityRows = [...passport.boqRecipe.serviceRows, ...passport.boqRecipe.workRows]
    .filter((row) => /контроль|провер|испыт|акт|докум|quality|test|inspection/i.test(row.titleRu));
  return {
    checklist_ru: (qualityRows.length > 0 ? qualityRows : passport.boqRecipe.serviceRows.slice(0, 5))
      .slice(0, 12)
      .map((row) => row.titleRu),
    acceptance_rules_ru: [
      "Каждая строка BOQ должна иметь формулу, источник и трассировку количества.",
      "PDF, snapshot, UI и buyer handoff должны ссылаться на один и тот же resolved passport.",
    ],
    source_ids: uniqueSorted(passport.boqRecipe.allRows.map((row) => sourceIdForRow(row, citations))),
  };
}

function buildValidation(input: {
  passport: ProfessionalWorkPassport;
  parameterGraph: ProfessionalWorkPassportV2["parameter_graph"];
  materials: readonly ProfessionalWorkPassportV2Material[];
  operations: readonly ProfessionalWorkPassportV2Operation[];
  services: readonly ProfessionalWorkPassportV2Service[];
  equipment: readonly ProfessionalWorkPassportV2Equipment[];
  formulas: readonly ProfessionalWorkPassportV2Formula[];
  normSources: readonly ProfessionalWorkPassportV2NormSource[];
  references: readonly ProfessionalWorkPassportV2ReferenceEstimate[];
  signature: ProfessionalWorkPassportV2SemanticSignature;
}): ProfessionalWorkPassportV2["validation"] {
  const visible = input.parameterGraph.parameters.filter((param) => param.role !== "SYSTEM_HIDDEN");
  const deadVisible = visible.filter((param) =>
    param.affected_formulas.length === 0 &&
    param.affected_materials.length === 0 &&
    param.affected_operations.length === 0
  );
  const blockers = [
    input.passport.localizedNameRu.trim() ? "" : "canonical_name_missing",
    input.parameterGraph.p0_required.length <= 5 ? "" : `too_many_p0_questions:${input.parameterGraph.p0_required.length}`,
    input.parameterGraph.parameters.length > 0 ? "" : "parameter_graph_missing",
    input.materials.length > 0 ? "" : "material_assemblies_missing",
    input.operations.length > 0 ? "" : "work_operations_missing",
    input.services.length > 0 ? "" : "services_missing",
    input.equipment.length > 0 ? "" : "equipment_missing",
    input.formulas.length > 0 ? "" : "quantity_formulas_missing",
    input.normSources.length > 0 ? "" : "norm_sources_missing",
    input.references.length > 0 ? "" : "reference_estimates_missing",
    deadVisible.length === 0 ? "" : `dead_visible_parameters:${deadVisible.map((param) => param.canonical_key).join(",")}`,
    input.formulas.every((formula) => formula.source_id && formula.version && formula.expression) ? "" : "formula_trace_missing",
  ].filter(Boolean);
  const legitimateExceptions = [
    input.materials.length === 0 ? "NO_MATERIAL_REQUIRED: source passport has no material row" : "",
    input.services.length === 0 ? "NO_SERVICE_REQUIRED: source passport has no service row" : "",
    input.equipment.length === 0 ? "NO_EQUIPMENT_REQUIRED: source passport has no equipment row" : "",
  ].filter(Boolean);
  return {
    status: blockers.length === 0 ? "SOFTWARE_SEALED_READY_FOR_EXPERT_REVIEW" : "BLOCKED",
    blockers,
    legitimate_exceptions: legitimateExceptions,
    semantic_signature: input.signature,
    resolved_at: RESOLVED_AT,
  };
}

function compileProfessionalWorkPassportV2(templateId: string): ProfessionalWorkPassportV2 | null {
  const passport = buildProfessionalWorkPassport(templateId);
  if (!passport) return null;
  const rows = passport.boqRecipe.allRows;
  const citations = rowCitationIndex(rows);
  const parameterGraph = buildParameterGraph(passport);
  const materials = passport.boqRecipe.materialRows.map((row) => materialFromRow(row, passport, citations));
  const operations = [...passport.boqRecipe.workRows, ...passport.boqRecipe.laborRows].map((row) => operationFromRow(row, citations));
  const services = [...passport.boqRecipe.serviceRows, ...passport.boqRecipe.transportRows].map((row) => serviceFromRow(row, citations));
  const equipment = passport.boqRecipe.equipmentRows.map((row) => equipmentFromRow(row, passport, citations));
  const machines = equipment.filter((item) =>
    /machine|crane|excavator|pump|lifting|earthmoving|compaction|vibration|кран|экскаватор|насос|каток/i.test(
      `${item.equipment_class} ${item.exact_name_ru}`,
    )
  );
  const formulas = rows.map((row) => formulaFromRow(row, citations));
  const normSources = buildNormSources(citations);
  const references = referenceEstimate(passport);
  const signature = semanticSignature(passport);
  const quality = qualityControl(passport, citations);
  const validation = buildValidation({
    passport,
    parameterGraph,
    materials,
    operations,
    services,
    equipment,
    formulas,
    normSources,
    references,
    signature,
  });
  const includedScope = [
    passport.workDescription.scopeSummary,
    `${rows.length} строк BOQ: материалы, операции, услуги, оборудование и трассировка формул.`,
    "Предварительная смета количества без подстановки fake-цен.",
  ];
  const excludedScope = [
    "Региональные цены, наличие у поставщиков и коммерческие условия.",
    "Финальная договорная смета без проектных данных и экспертной подписи.",
    "Работы вне выбранного профессионального семейства и явных параметров пользователя.",
  ];
  return {
    identity: {
      work_id: passport.templateId,
      canonical_name_ru: passport.localizedNameRu,
      short_name_ru: passport.localizedNameRu,
      description_ru: passport.workDescription.scopeSummary,
      synonyms_ru: passport.aliases,
      professional_family_id: passport.familyId,
      normative_family_id: passport.sources.normPackId,
      calculator_id: passport.contentPack.calculatorId,
    },
    classification: {
      template_kind: passport.templateKind,
      category: passport.category,
      estimate_level: passport.estimateLevel,
      work_key: passport.workKey,
      norm_pack_id: passport.sources.normPackId,
      content_pack_ids: [
        passport.contentPack.materialRecipeId,
        passport.contentPack.laborRecipeId,
        passport.contentPack.serviceRecipeId,
        passport.contentPack.equipmentRecipeId,
        passport.contentPack.unitPolicyId,
        passport.contentPack.pricePolicyId,
        passport.contentPack.pdfPolicyId,
        passport.contentPack.buyerHandoffPolicyId,
      ],
    },
    scope: {
      included_scope_ru: includedScope,
      excluded_scope_ru: excludedScope,
      result_ru: `Скомпилированная предварительная BOQ-смета для работы "${passport.localizedNameRu}".`,
      measurement_basis: uniqueSorted(rows.map((row) => row.sourceUnit)).join(", "),
    },
    applicability: {
      applicable_when_ru: [
        `Выбранная работа соответствует семейству ${passport.familyId}.`,
        "Пользовательский текст или выбранный шаблон задаёт измеримый объём.",
        "Проектные данные могут отсутствовать только для предварительного BOQ с раскрытием допущений.",
      ],
      prerequisite_inputs_ru: parameterGraph.p0_required,
      scale_assumptions_ru: [
        `estimate_level=${passport.estimateLevel}`,
        `missing_input_policy=${passport.parameterSchema.missingInputPolicy}`,
      ],
      expert_review_required: passport.riskPolicy.specialistReviewNoteRequired,
    },
    exclusions: {
      excluded_scope_ru: excludedScope,
      price_exclusions_ru: [
        "Цены не считаются подтверждёнными без регионального pricebook/source evidence.",
        "Финальный total запрещён, пока priceStatus остаётся PRICE_MISSING.",
      ],
      external_review_required_ru: [
        "Экспертная проверка обязательна перед договорной сметой и региональным ценообразованием.",
      ],
    },
    parameter_graph: parameterGraph,
    material_variants: buildMaterialVariants(passport, citations),
    material_assemblies: materials,
    work_operations: operations,
    services,
    machines,
    equipment,
    quantity_formulas: formulas,
    norm_sources: normSources,
    reference_estimates: references,
    quality_control: quality,
    safety_requirements: safetyRequirements(passport),
    pricing_requirements: {
      price_state: "PRICE_MISSING_QUANTITY_ONLY",
      fake_total_forbidden: true,
      missing_prices_visible: passport.outputMappings.missingPricesVisibleWithoutFakeTotal,
      regional_pricing_required: true,
    },
    presentation: {
      preview_sections_ru: [
        "Название",
        "Описание",
        "Входные параметры",
        "Варианты материалов",
        "Материалы",
        "Операции",
        "Услуги",
        "Оборудование",
        "Формулы",
        "Источники",
        "Что входит",
        "Что не входит",
        "Статус проверки",
      ],
      ui_pdf_buyer_parity_required: true,
      pdf_rows_equal_snapshot_rows: passport.outputMappings.pdfRowsEqualSnapshotRows,
      buyer_handoff_procurement_subset: passport.outputMappings.buyerHandoffProcurementSubset,
      max_questions_shown: 5,
    },
    validation,
    version: {
      contract_version: "ProfessionalWorkPassportV2",
      compiler_version: "2026-07-14.v1",
      source_passport_version: `${passport.templateKind}:${passport.sources.normVersion}`,
    },
    lineage: {
      professional_family_passport_id: `professional_family:${passport.familyId}:v1`,
      normative_assembly_id: passport.sources.normPackId,
      work_specific_passport_id: `work_specific:${passport.templateId}:v1`,
      work_specific_override_ids: [
        passport.contentPack.unitPolicyId,
        passport.contentPack.pricePolicyId,
        passport.contentPack.pdfPolicyId,
        passport.contentPack.buyerHandoffPolicyId,
      ],
      compiled_resolved_passport_id: `resolved:${passport.templateId}:ProfessionalWorkPassportV2:2026-07-14.v1`,
    },
  };
}

export function buildProfessionalWorkPassportV2(templateId: string): ProfessionalWorkPassportV2 | null {
  const key = String(templateId ?? "").trim();
  if (!key) return null;
  const cached = passportV2Cache.get(key);
  if (cached) {
    passportV2CacheHits += 1;
    passportV2Cache.delete(key);
    passportV2Cache.set(key, cached);
    return cached;
  }
  passportV2CacheMisses += 1;
  const passport = compileProfessionalWorkPassportV2(key);
  return passport ? rememberPassportV2(key, passport) : null;
}

function acceptanceCase(
  passport: ProfessionalWorkPassportV2,
  caseKind: ProfessionalWorkPassportV2AcceptanceCase["case_kind"],
  assertions: Record<string, boolean>,
): ProfessionalWorkPassportV2AcceptanceCase {
  const blockers = Object.entries(assertions)
    .filter(([, passed]) => !passed)
    .map(([key]) => key);
  return {
    case_id: `${passport.identity.work_id}:${caseKind}`,
    work_id: passport.identity.work_id,
    case_kind: caseKind,
    status: blockers.length === 0 ? "ready" : "blocked",
    assertions,
    blockers,
  };
}

export function buildProfessionalWorkPassportV2AcceptanceCases(
  passport: ProfessionalWorkPassportV2,
): ProfessionalWorkPassportV2AcceptanceCase[] {
  const visibleQuestions = passport.parameter_graph.parameters.filter((param) =>
    param.role !== "SYSTEM_HIDDEN" && param.required
  );
  const variant = passport.material_variants.find((item) =>
    item.affected_material_codes.length > 0 &&
    item.affected_operation_codes.length > 0 &&
    item.affected_formula_ids.length > 0
  );
  return [
    acceptanceCase(passport, "A_MINIMAL_REQUEST", {
      resolved_passport_exists: passport.validation.status === "SOFTWARE_SEALED_READY_FOR_EXPERT_REVIEW",
      p0_questions_not_more_than_five: visibleQuestions.length <= 5,
      p0_questions_have_ru_labels: visibleQuestions.every((param) => Boolean(param.label_ru)),
    }),
    acceptanceCase(passport, "B_FULL_REQUEST", {
      professional_boq_created: passport.quantity_formulas.length > 0,
      material_operation_service_equipment_owned:
        passport.material_assemblies.length > 0 &&
        passport.work_operations.length > 0 &&
        passport.services.length > 0 &&
        passport.equipment.length > 0,
      sources_and_formula_trace_present: passport.norm_sources.length > 0 &&
        passport.quantity_formulas.every((formula) => Boolean(formula.source_id && formula.expression)),
    }),
    acceptanceCase(passport, "C_VARIANT_REQUEST", {
      material_or_method_variant_present: Boolean(variant),
      variant_changes_materials_operations_and_formulas: Boolean(
        variant &&
        variant.affected_material_codes.length > 0 &&
        variant.affected_operation_codes.length > 0 &&
        variant.affected_formula_ids.length > 0,
      ),
    }),
    acceptanceCase(passport, "D_SCALE_REQUEST", {
      formulas_are_scale_driven: passport.quantity_formulas.some((formula) => formula.input_keys.length > 0) &&
        passport.quantity_formulas.every((formula) => Boolean(formula.expression && formula.source_id)),
      scale_keeps_pdf_buyer_runtime_parity:
        passport.presentation.pdf_rows_equal_snapshot_rows &&
        passport.presentation.buyer_handoff_procurement_subset,
    }),
  ];
}

export type ProfessionalWorkPassportV2Preview = {
  work_id: string;
  title_ru: string;
  status: string;
  sections: { title_ru: string; lines_ru: string[] }[];
};

function takeNames<T extends { exact_name_ru: string }>(items: readonly T[], count = 8): string[] {
  return items.slice(0, count).map((item) => item.exact_name_ru);
}

export function buildProfessionalWorkPassportV2Preview(
  passport: ProfessionalWorkPassportV2,
): ProfessionalWorkPassportV2Preview {
  return {
    work_id: passport.identity.work_id,
    title_ru: passport.identity.canonical_name_ru,
    status: passport.validation.status,
    sections: [
      { title_ru: "Описание", lines_ru: [passport.identity.description_ru] },
      { title_ru: "Входные параметры", lines_ru: passport.parameter_graph.parameters.filter((param) => param.role !== "SYSTEM_HIDDEN").slice(0, 12).map((param) => `${param.label_ru}${param.unit ? `, ${param.unit}` : ""}`) },
      { title_ru: "Варианты материалов", lines_ru: passport.material_variants.slice(0, 8).map((item) => item.exact_name_ru) },
      { title_ru: "Материалы", lines_ru: takeNames(passport.material_assemblies) },
      { title_ru: "Операции", lines_ru: takeNames(passport.work_operations) },
      { title_ru: "Услуги", lines_ru: takeNames(passport.services) },
      { title_ru: "Оборудование", lines_ru: takeNames(passport.equipment) },
      { title_ru: "Формулы", lines_ru: passport.quantity_formulas.slice(0, 8).map((item) => `${item.formula_id}: ${item.expression}`) },
      { title_ru: "Источники", lines_ru: passport.norm_sources.slice(0, 8).map((item) => `${item.publisher}: ${item.document_title}`) },
      { title_ru: "Что входит", lines_ru: passport.scope.included_scope_ru },
      { title_ru: "Что не входит", lines_ru: passport.scope.excluded_scope_ru },
      { title_ru: "Статус проверки", lines_ru: [passport.validation.status, ...passport.validation.blockers] },
    ],
  };
}

export function listProfessionalWorkPassportV2TemplateIds(): string[] {
  return listProfessionalWorkPassportTemplateIds();
}

export function clearProfessionalWorkPassportV2BuildCaches(): void {
  passportV2Cache.clear();
  passportV2CacheHits = 0;
  passportV2CacheMisses = 0;
  clearProfessionalWorkPassportBuildCaches();
  clearAiEstimateParameterSchemaCache();
}

export function getProfessionalWorkPassportV2CacheStats(): ProfessionalWorkPassportV2CacheStats {
  return {
    cache_limit: PROFESSIONAL_WORK_PASSPORT_V2_CACHE_LIMIT,
    cache_size: passportV2Cache.size,
    cache_hits: passportV2CacheHits,
    cache_misses: passportV2CacheMisses,
  };
}
