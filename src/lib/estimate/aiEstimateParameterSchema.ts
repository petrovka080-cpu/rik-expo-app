import {
  buildProfessionalWorkPassport,
  listProfessionalWorkPassportTemplateIds,
} from "./buildProfessionalWorkPassport";
import type { EstimateDraftRevisionMissingInput, EstimateDraftRevisionParam } from "./estimateDraftRevisionContract";
import {
  aiEstimateCanonicalUnitForParameter,
  aiEstimateRequiredForRuLabel,
  aiEstimateRuDictionaryEntry,
  aiEstimateRuLabelForParameter,
  aiEstimateRuUnitForParameter,
  hasHumanReadableAiEstimateParameterPassport,
  isAiEstimateTechnicalHiddenParam,
  unitFromKey,
} from "./aiEstimateRuParameterDictionary";
import type { ProfessionalBoqRecipeRow, WorkPassportParameter } from "./workPassportContract";

export type AiEstimateParameterInputKind = "number" | "text" | "boolean" | "select";

export type AiEstimateParameterRequiredFor =
  | "better_accuracy"
  | "contract_ready"
  | "safety_review";

export type AiEstimateParameterSchemaFieldSource =
  | "passport_required"
  | "passport_optional"
  | "formula_dependency"
  | "professional_suggestion";

export type AiEstimateParameterSchemaField = {
  key: string;
  labelRu: string;
  unit: string | null;
  unitRu: string;
  required: boolean;
  requiredFor: AiEstimateParameterRequiredFor;
  inputKind: AiEstimateParameterInputKind;
  editable: true;
  source: AiEstimateParameterSchemaFieldSource;
  affectsRowIds: string[];
  affectsRowTitlesRu: string[];
  formulaRefs: string[];
  aliasesRu: string[];
  suggestWhenMissing: boolean;
  priority: number;
};

export type AiEstimateParameterSchema = {
  templateId: string;
  templateNameRu: string;
  familyId: string;
  catalogTotalTemplates: number;
  supportsFreeOrderInput: true;
  missingInputPolicy: "show_missing_and_continue_preliminary_boq";
  professionalCompletenessPromptRu: string;
  fields: AiEstimateParameterSchemaField[];
  requiredFields: AiEstimateParameterSchemaField[];
  optionalFields: AiEstimateParameterSchemaField[];
};

const schemaCache = new Map<string, AiEstimateParameterSchema | null>();

const IGNORED_FORMULA_KEYS = new Set([
  "formula_id",
  "norm_source",
  "norm_version",
  "row_code",
  "row_id",
  "round_to",
  "source_prompt",
  "price_missing",
  "inline_work_prompt",
  "expanded_complex",
  "included_in_procurement",
]);

const UNIVERSAL_PROFESSIONAL_SUGGESTIONS: { key: string; priority: number; match?: RegExp }[] = [
  { key: "length_m", priority: 30 },
  { key: "width_m", priority: 31 },
  { key: "height_m", priority: 32 },
  { key: "ceiling_height_m", priority: 33, match: /apartment|house|interior|room|tile|floor|wall|ceiling|bathroom|kitchen|renovation|отдел|ремонт|квартир|дом|сануз|плит|стен|пол/i },
  { key: "depth_mm", priority: 34 },
  { key: "thickness_m", priority: 35 },
  { key: "diameter_mm", priority: 36, match: /pipe|pipeline|water|sewer|gas|heat|drain|cable|бур|труб|вод|канал|газ|тепл|кабел/i },
  { key: "count", priority: 37 },
  { key: "bathrooms_count", priority: 38, match: /bathroom|tile|plumbing|renovation|сануз|ванн|душ|плит|сантех|ремонт/i },
  { key: "electrical_points", priority: 39, match: /electric|power|cable|socket|электр|кабел|розет|выключ/i },
  { key: "water_points", priority: 40, match: /water|plumbing|bathroom|kitchen|вод|сантех|сануз|кухн/i },
  { key: "sewer_points", priority: 41, match: /sewer|plumbing|bathroom|канал|сантех|сануз/i },
  { key: "roof_area_m2", priority: 42, match: /roof|кров|крыша/i },
  { key: "insulation_thickness_mm", priority: 43, match: /insulat|утепл|фасад|roof|wall|кров|стен/i },
  { key: "material_specification", priority: 44 },
  { key: "site_access", priority: 45 },
  { key: "work_complexity", priority: 46 },
  { key: "project_location", priority: 60 },
  { key: "drawings_or_specification", priority: 61 },
];

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function textForTemplate(input: {
  templateId: string;
  templateNameRu: string;
  familyId: string;
  category: string;
  aliases: readonly string[];
}): string {
  return [
    input.templateId,
    input.templateNameRu,
    input.familyId,
    input.category,
    ...input.aliases,
  ].join(" ");
}

function fieldRequiredFor(param: WorkPassportParameter): AiEstimateParameterRequiredFor {
  if (param.missingBlocksDetailedEstimate) return "contract_ready";
  return "better_accuracy";
}

function inputKindFor(key: string, unit: string | null): AiEstimateParameterInputKind {
  if (key === "package_mode") return "select";
  if (/^(is_|has_)/.test(key)) return "boolean";
  if (unit || /_(count|points|pcs|m2|m3|mm|lm|m|kw|kv|mw)$/.test(key) || key === "q" || key === "capacity") return "number";
  return "text";
}

function formulaText(row: ProfessionalBoqRecipeRow): string {
  return [
    row.quantityFormula,
    row.calculationTraceTemplate,
    row.formulaId,
  ].join(" ");
}

function formulaReferencesKey(text: string, key: string): boolean {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-zA-Z0-9_])${escaped}($|[^a-zA-Z0-9_])`).test(text);
}

function extractFormulaKeys(rows: readonly ProfessionalBoqRecipeRow[]): string[] {
  const keys = new Set<string>();
  const formulaKeyPattern = /\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g;
  for (const row of rows) {
    for (const match of row.quantityFormula.matchAll(formulaKeyPattern)) {
      const key = match[0];
      if (IGNORED_FORMULA_KEYS.has(key)) continue;
      if (/^(src|norm|source|inline|expanded|included|price|formula)_/.test(key)) continue;
      if (/_formula_v\d+$/i.test(key)) continue;
      keys.add(key);
    }
  }
  return [...keys].sort();
}

function rowsAffectedByParam(rows: readonly ProfessionalBoqRecipeRow[], key: string): ProfessionalBoqRecipeRow[] {
  const direct = rows.filter((row) => formulaReferencesKey(formulaText(row), key));
  if (direct.length > 0) return direct;
  if (key === "q" || key === "area_m2" || key === "length_m" || key === "volume_m3" || key === "count") return [...rows];
  if (key === "ceiling_height_m") {
    const ceilingRows = rows.filter((row) => /wall|paint|tile|partition|ceiling|стен|потол|плит/i.test(`${row.titleRu} ${row.quantityFormula}`));
    return ceilingRows.length > 0 ? ceilingRows : rows.slice(0, Math.min(rows.length, 12));
  }
  if (/(width|height|depth|thickness|diameter|section|capacity|points|count|area|volume|length|doors|bathrooms|windows|poles|power|voltage|phase)/.test(key)) {
    return rows.slice(0, Math.min(rows.length, 12));
  }
  if (
    key === "material_specification" ||
    key === "site_access" ||
    key === "work_complexity" ||
    key === "package_mode" ||
    key === "project_location" ||
    key === "drawings_or_specification" ||
    key === "geology_profile" ||
    key === "loads" ||
    key === "equipment_specification"
  ) {
    return rows.slice(0, Math.min(rows.length, 12));
  }
  return [];
}

function formulasForParam(rows: readonly ProfessionalBoqRecipeRow[], key: string): string[] {
  const affected = rowsAffectedByParam(rows, key);
  return unique(affected.map((row) => row.quantityFormula).filter(Boolean)).slice(0, 12);
}

function fieldFromPassportParam(
  param: WorkPassportParameter,
  rows: readonly ProfessionalBoqRecipeRow[],
): AiEstimateParameterSchemaField {
  const source: AiEstimateParameterSchemaFieldSource = param.required ? "passport_required" : "passport_optional";
  return buildField({
    key: param.key,
    fallbackLabelRu: param.labelRu,
    unit: param.unit,
    required: param.required,
    requiredFor: fieldRequiredFor(param),
    source,
    rows,
    priority: param.required ? 10 : 20,
  });
}

function buildField(input: {
  key: string;
  fallbackLabelRu?: string | null;
  unit?: string | null;
  required: boolean;
  requiredFor: AiEstimateParameterRequiredFor;
  source: AiEstimateParameterSchemaFieldSource;
  rows: readonly ProfessionalBoqRecipeRow[];
  priority: number;
}): AiEstimateParameterSchemaField {
  const dictionary = aiEstimateRuDictionaryEntry(input.key);
  const unit = input.unit ?? dictionary?.unit ?? unitFromKey(input.key);
  const affected = rowsAffectedByParam(input.rows, input.key);
  return {
    key: input.key,
    labelRu: aiEstimateRuLabelForParameter(input.key, input.fallbackLabelRu),
    unit,
    unitRu: aiEstimateRuUnitForParameter(input.key, unit),
    required: input.required,
    requiredFor: input.requiredFor,
    inputKind: inputKindFor(input.key, unit),
    editable: true,
    source: input.source,
    affectsRowIds: affected.map((row) => row.rowId),
    affectsRowTitlesRu: affected.map((row) => row.titleRu).slice(0, 12),
    formulaRefs: formulasForParam(input.rows, input.key),
    aliasesRu: dictionary?.aliasesRu ?? [],
    suggestWhenMissing: !isAiEstimateTechnicalHiddenParam(input.key),
    priority: input.priority,
  };
}

function professionalSuggestionFields(input: {
  rows: readonly ProfessionalBoqRecipeRow[];
  templateText: string;
  existingKeys: Set<string>;
}): AiEstimateParameterSchemaField[] {
  const fields: AiEstimateParameterSchemaField[] = [];
  for (const suggestion of UNIVERSAL_PROFESSIONAL_SUGGESTIONS) {
    if (input.existingKeys.has(suggestion.key)) continue;
    if (suggestion.match && !suggestion.match.test(input.templateText)) continue;
    fields.push(buildField({
      key: suggestion.key,
      required: false,
      requiredFor: suggestion.key === "drawings_or_specification" ? "contract_ready" : "better_accuracy",
      source: "professional_suggestion",
      rows: input.rows,
      priority: suggestion.priority,
    }));
  }
  return fields;
}

function formulaDependencyFields(input: {
  rows: readonly ProfessionalBoqRecipeRow[];
  formulaKeys: readonly string[];
  existingKeys: Set<string>;
}): AiEstimateParameterSchemaField[] {
  return input.formulaKeys
    .filter((key) => !input.existingKeys.has(key))
    .filter((key) => !isAiEstimateTechnicalHiddenParam(key))
    .filter((key) => hasHumanReadableAiEstimateParameterPassport(key))
    .map((key) => buildField({
      key,
      unit: aiEstimateCanonicalUnitForParameter(key),
      required: false,
      requiredFor: "better_accuracy",
      source: "formula_dependency",
      rows: input.rows,
      priority: 25,
    }));
}

function sortFields(fields: readonly AiEstimateParameterSchemaField[]): AiEstimateParameterSchemaField[] {
  return [...fields].sort((a, b) => a.priority - b.priority || a.labelRu.localeCompare(b.labelRu, "ru"));
}

export function buildAiEstimateParameterSchema(templateId: string): AiEstimateParameterSchema | null {
  const key = String(templateId ?? "").trim();
  if (!key) return null;
  if (schemaCache.has(key)) return schemaCache.get(key) ?? null;

  const passport = buildProfessionalWorkPassport(key);
  if (!passport) {
    schemaCache.set(key, null);
    return null;
  }

  const rows = passport.boqRecipe.allRows;
  const passportFields = [
    ...passport.parameterSchema.required,
    ...passport.parameterSchema.optional,
  ]
    .filter((param) => !isAiEstimateTechnicalHiddenParam(param.key))
    .map((param) => fieldFromPassportParam(param, rows));
  const existingKeys = new Set(passportFields.map((field) => field.key));
  const formulaFields = formulaDependencyFields({
    rows,
    formulaKeys: extractFormulaKeys(rows),
    existingKeys,
  });
  for (const field of formulaFields) existingKeys.add(field.key);
  const suggestionFields = professionalSuggestionFields({
    rows,
    templateText: textForTemplate({
      templateId: passport.templateId,
      templateNameRu: passport.localizedNameRu,
      familyId: passport.familyId,
      category: passport.category,
      aliases: passport.aliases,
    }),
    existingKeys,
  });
  const fields = sortFields([...passportFields, ...formulaFields, ...suggestionFields]);
  const schema: AiEstimateParameterSchema = {
    templateId: passport.templateId,
    templateNameRu: passport.localizedNameRu,
    familyId: passport.familyId,
    catalogTotalTemplates: listProfessionalWorkPassportTemplateIds().length,
    supportsFreeOrderInput: true,
    missingInputPolicy: "show_missing_and_continue_preliminary_boq",
    professionalCompletenessPromptRu: "Для профессиональной сметы уточните недостающие размеры, материалы, условия площадки и проектные данные.",
    fields,
    requiredFields: fields.filter((field) => field.required),
    optionalFields: fields.filter((field) => !field.required),
  };
  schemaCache.set(key, schema);
  return schema;
}

export function clearAiEstimateParameterSchemaCache(): void {
  schemaCache.clear();
}

export function buildAiEstimateMissingInputs(input: {
  selectedTemplateId: string | null | undefined;
  params: Record<string, EstimateDraftRevisionParam>;
  existingMissingInputs?: readonly EstimateDraftRevisionMissingInput[];
}): EstimateDraftRevisionMissingInput[] {
  const existing = input.existingMissingInputs ?? [];
  const schema = input.selectedTemplateId ? buildAiEstimateParameterSchema(input.selectedTemplateId) : null;
  if (!schema) return [...existing];
  const presentKeys = new Set(Object.keys(input.params).filter((key) => !isAiEstimateTechnicalHiddenParam(key)));
  const rows = new Map<string, EstimateDraftRevisionMissingInput>();
  for (const item of existing) {
    if (!isAiEstimateTechnicalHiddenParam(item.key)) rows.set(item.key, item);
  }
  for (const field of schema.fields) {
    if (!field.suggestWhenMissing || presentKeys.has(field.key)) continue;
    rows.set(field.key, {
      key: field.key,
      label: field.labelRu,
      blocksPreliminaryEstimate: false,
      requiredFor: field.requiredFor,
    });
  }
  return [...rows.values()].sort((a, b) => {
    const aField = schema.fields.find((field) => field.key === a.key);
    const bField = schema.fields.find((field) => field.key === b.key);
    return (aField?.priority ?? 99) - (bField?.priority ?? 99)
      || aiEstimateRequiredForRuLabel(a.requiredFor).localeCompare(aiEstimateRequiredForRuLabel(b.requiredFor), "ru")
      || a.label.localeCompare(b.label, "ru");
  });
}
