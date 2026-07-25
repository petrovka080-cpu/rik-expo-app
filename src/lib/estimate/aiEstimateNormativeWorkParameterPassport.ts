import {
  buildProfessionalWorkPassport,
  clearProfessionalWorkPassportBuildCaches,
  listProfessionalWorkPassportTemplateIds,
} from "./buildProfessionalWorkPassport";
import {
  buildAiEstimateParameterSchema,
  clearAiEstimateParameterSchemaCache,
  type AiEstimateParameterInputKind,
  type AiEstimateParameterRequiredFor,
  type AiEstimateParameterSchemaField,
  type AiEstimateParameterSchemaFieldSource,
} from "./aiEstimateParameterSchema";
import {
  aiEstimateCanonicalUnitForParameter,
  aiEstimateRuLabelForParameter,
  aiEstimateRuUnitForParameter,
  isAiEstimateTechnicalHiddenParam,
} from "./aiEstimateRuParameterDictionary";
import {
  classifyAiEstimateNormativeWorkFamily,
  normativeSeedsForWorkFamily,
  type AiEstimateNormativeWorkFamily,
} from "./aiEstimateNormativeParameterFamilies";
import type { ProfessionalBoqRecipeRow, ProfessionalWorkPassport } from "./workPassportContract";

export type AiEstimateNormativeParameterRole =
  | "required_for_quantity"
  | "required_for_professional_accuracy"
  | "optional_accuracy_improver";

export type AiEstimateNormativeParameterSource =
  | AiEstimateParameterSchemaFieldSource
  | "family_normative_seed";

export type AiEstimateNormativeParameterRequirement = {
  key: string;
  labelRu: string;
  unit: string | null;
  unitRu: string;
  role: AiEstimateNormativeParameterRole;
  requiredFor: AiEstimateParameterRequiredFor;
  inputKind: AiEstimateParameterInputKind;
  source: AiEstimateNormativeParameterSource;
  family: AiEstimateNormativeWorkFamily;
  affectsRowIds: string[];
  affectsRowTitlesRu: string[];
  formulaRefs: string[];
  userQuestionRu: string;
  missingReasonRu: string;
  normativeBasisRu: string;
  sourceRegistryIds: string[];
  priority: number;
};

export type AiEstimateNormativeWorkParameterPassport = {
  templateId: string;
  templateNameRu: string;
  familyId: string;
  workFamily: AiEstimateNormativeWorkFamily;
  catalogTotalTemplates: number;
  rowCount: number;
  sourceQuality: ProfessionalWorkPassport["sources"]["sourceQuality"];
  requirements: AiEstimateNormativeParameterRequirement[];
  requiredForQuantity: AiEstimateNormativeParameterRequirement[];
  requiredForProfessionalAccuracy: AiEstimateNormativeParameterRequirement[];
  optionalAccuracyImprovers: AiEstimateNormativeParameterRequirement[];
};

const passportCache = new Map<string, AiEstimateNormativeWorkParameterPassport | null>();
const NORMATIVE_PARAMETER_PASSPORT_CACHE_LIMIT = 128;

function rememberNormativePassport(
  key: string,
  passport: AiEstimateNormativeWorkParameterPassport | null,
): AiEstimateNormativeWorkParameterPassport | null {
  passportCache.delete(key);
  passportCache.set(key, passport);
  while (passportCache.size > NORMATIVE_PARAMETER_PASSPORT_CACHE_LIMIT) {
    const oldest = passportCache.keys().next().value;
    if (oldest == null) break;
    passportCache.delete(oldest);
  }
  return passport;
}

const QUANTITY_PARAMETER_KEYS = new Set([
  "q",
  "area_m2",
  "facade_area_m2",
  "roof_area_m2",
  "glazing_area_m2",
  "bathroom_floor_area_m2",
  "bathroom_wall_tile_area_m2",
  "net_wall_area_m2",
  "paint_total_area_m2",
  "length_m",
  "line_length_m",
  "channel_length_m",
  "width_m",
  "height_m",
  "ceiling_height_m",
  "thickness_m",
  "depth_mm",
  "trench_depth_m",
  "trench_width_m",
  "diameter_mm",
  "volume_m3",
  "count",
  "bathrooms_count",
  "doors_count",
  "roof_windows_count",
  "poles_count",
  "electrical_points",
  "water_points",
  "sewer_points",
  "voltage_kv",
  "power_kw",
  "power_mw",
  "capacity",
  "work_package",
]);

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function formulaText(row: ProfessionalBoqRecipeRow): string {
  return [
    row.quantityFormula,
    row.calculationTraceTemplate,
    row.formulaId,
    row.rowId,
  ].join(" ");
}

function formulaReferencesKey(text: string, key: string): boolean {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-zA-Z0-9_])${escaped}($|[^a-zA-Z0-9_])`).test(text);
}

function rowText(row: ProfessionalBoqRecipeRow): string {
  return `${row.titleRu} ${row.quantityFormula} ${row.calculationTraceTemplate}`;
}

function inferRowsForKey(rows: readonly ProfessionalBoqRecipeRow[], key: string): ProfessionalBoqRecipeRow[] {
  const direct = rows.filter((row) => formulaReferencesKey(formulaText(row), key));
  if (direct.length > 0) return direct;
  if (key === "q" || key === "work_package") return [...rows];
  if (key === "area_m2") return rows.filter((row) => /area|floor|wall|ceiling|paint|tile|m2/i.test(rowText(row))).slice(0, 24);
  if (/_area_m2$/.test(key)) {
    const areaToken = key.replace(/_area_m2$/, "");
    const scoped = rows.filter((row) => new RegExp(areaToken.replace(/_/g, "|"), "i").test(rowText(row)));
    return (scoped.length > 0 ? scoped : rows).slice(0, 24);
  }
  if (/(length|width|height|depth|thickness|diameter|section|capacity|points|count|volume|power|voltage|phase|pole|bathroom|door|window)/.test(key)) {
    return rows.slice(0, Math.min(rows.length, 18));
  }
  if (/(material|equipment|site|access|location|drawings|specification|complexity)/.test(key)) {
    return rows.slice(0, Math.min(rows.length, 12));
  }
  return rows.slice(0, Math.min(rows.length, 6));
}

function formulasForRows(rows: readonly ProfessionalBoqRecipeRow[]): string[] {
  return unique(rows.map((row) => row.quantityFormula).filter(Boolean)).slice(0, 12);
}

function roleForField(field: AiEstimateParameterSchemaField): AiEstimateNormativeParameterRole {
  if (field.source === "formula_dependency") return "required_for_quantity";
  if (field.required || QUANTITY_PARAMETER_KEYS.has(field.key)) return "required_for_quantity";
  if (field.requiredFor === "contract_ready" || field.source === "passport_optional") {
    return "required_for_professional_accuracy";
  }
  return "optional_accuracy_improver";
}

function requiredForRole(role: AiEstimateNormativeParameterRole): AiEstimateParameterRequiredFor {
  if (role === "required_for_professional_accuracy") return "contract_ready";
  return "better_accuracy";
}

function inputKindForKey(key: string): AiEstimateParameterInputKind {
  if (key === "package_mode") return "select";
  if (/^(is_|has_)/.test(key)) return "boolean";
  if (aiEstimateCanonicalUnitForParameter(key) || QUANTITY_PARAMETER_KEYS.has(key)) return "number";
  return "text";
}

function priorityForRequirement(role: AiEstimateNormativeParameterRole, key: string, basePriority = 80): number {
  const dimensionBoost = QUANTITY_PARAMETER_KEYS.has(key) ? -8 : 0;
  if (role === "required_for_quantity") return 10 + dimensionBoost + basePriority / 100;
  if (role === "required_for_professional_accuracy") return 30 + dimensionBoost + basePriority / 100;
  return 60 + basePriority / 100;
}

function questionFor(labelRu: string, role: AiEstimateNormativeParameterRole): string {
  if (role === "required_for_quantity") return `Уточните ${labelRu.toLocaleLowerCase("ru-RU")}, чтобы пересчитать объемы по строкам сметы.`;
  if (role === "required_for_professional_accuracy") return `Уточните ${labelRu.toLocaleLowerCase("ru-RU")}, чтобы довести предварительную смету до рабочей точности.`;
  return `Можно уточнить ${labelRu.toLocaleLowerCase("ru-RU")}, чтобы повысить точность закупочного пакета.`;
}

function reasonFor(role: AiEstimateNormativeParameterRole): string {
  if (role === "required_for_quantity") return "параметр влияет на количество работ и материалов";
  if (role === "required_for_professional_accuracy") return "параметр нужен для рабочей сметы и проверки спецификации";
  return "параметр уточняет условия площадки или состав работ";
}

function normativeBasisFor(passport: ProfessionalWorkPassport): string {
  return passport.sources.sourceQuality === "source_backed"
    ? "паспорта работ и привязанного нормпакета"
    : "инженерной расчетной формулы паспорта работ";
}

function requirementFromField(
  passport: ProfessionalWorkPassport,
  workFamily: AiEstimateNormativeWorkFamily,
  field: AiEstimateParameterSchemaField,
): AiEstimateNormativeParameterRequirement {
  const role = roleForField(field);
  return {
    key: field.key,
    labelRu: field.labelRu,
    unit: field.unit,
    unitRu: field.unitRu,
    role,
    requiredFor: field.requiredFor,
    inputKind: field.inputKind,
    source: field.source,
    family: workFamily,
    affectsRowIds: field.affectsRowIds,
    affectsRowTitlesRu: field.affectsRowTitlesRu,
    formulaRefs: field.formulaRefs,
    userQuestionRu: questionFor(field.labelRu, role),
    missingReasonRu: reasonFor(role),
    normativeBasisRu: normativeBasisFor(passport),
    sourceRegistryIds: passport.sources.sourceRegistryIds,
    priority: priorityForRequirement(role, field.key, field.priority),
  };
}

function requirementFromSeed(
  passport: ProfessionalWorkPassport,
  workFamily: AiEstimateNormativeWorkFamily,
  key: string,
  role: AiEstimateNormativeParameterRole,
): AiEstimateNormativeParameterRequirement {
  const rows = inferRowsForKey(passport.boqRecipe.allRows, key);
  const unit = aiEstimateCanonicalUnitForParameter(key) ?? null;
  const labelRu = aiEstimateRuLabelForParameter(key);
  return {
    key,
    labelRu,
    unit,
    unitRu: aiEstimateRuUnitForParameter(key, unit),
    role,
    requiredFor: requiredForRole(role),
    inputKind: inputKindForKey(key),
    source: "family_normative_seed",
    family: workFamily,
    affectsRowIds: rows.map((row) => row.rowId),
    affectsRowTitlesRu: rows.map((row) => row.titleRu).slice(0, 12),
    formulaRefs: formulasForRows(rows),
    userQuestionRu: questionFor(labelRu, role),
    missingReasonRu: reasonFor(role),
    normativeBasisRu: normativeBasisFor(passport),
    sourceRegistryIds: passport.sources.sourceRegistryIds,
    priority: priorityForRequirement(role, key, 70),
  };
}

function sortRequirements(
  requirements: readonly AiEstimateNormativeParameterRequirement[],
): AiEstimateNormativeParameterRequirement[] {
  return [...requirements].sort((a, b) =>
    a.priority - b.priority ||
    a.labelRu.localeCompare(b.labelRu, "ru") ||
    a.key.localeCompare(b.key),
  );
}

export function buildAiEstimateNormativeWorkParameterPassport(
  templateId: string | null | undefined,
): AiEstimateNormativeWorkParameterPassport | null {
  const key = String(templateId ?? "").trim();
  if (!key) return null;
  if (passportCache.has(key)) return passportCache.get(key) ?? null;

  const passport = buildProfessionalWorkPassport(key);
  const schema = buildAiEstimateParameterSchema(key);
  if (!passport || !schema) {
    return rememberNormativePassport(key, null);
  }

  const workFamily = classifyAiEstimateNormativeWorkFamily(passport);
  const requirementsByKey = new Map<string, AiEstimateNormativeParameterRequirement>();
  for (const field of schema.fields) {
    if (isAiEstimateTechnicalHiddenParam(field.key)) continue;
    requirementsByKey.set(field.key, requirementFromField(passport, workFamily, field));
  }
  for (const seed of normativeSeedsForWorkFamily(workFamily)) {
    if (isAiEstimateTechnicalHiddenParam(seed.key) || requirementsByKey.has(seed.key)) continue;
    requirementsByKey.set(seed.key, requirementFromSeed(passport, workFamily, seed.key, seed.role));
  }

  const requirements = sortRequirements([...requirementsByKey.values()]);
  const result: AiEstimateNormativeWorkParameterPassport = {
    templateId: passport.templateId,
    templateNameRu: passport.localizedNameRu,
    familyId: passport.familyId,
    workFamily,
    catalogTotalTemplates: listProfessionalWorkPassportTemplateIds().length,
    rowCount: passport.boqRecipe.rowCount,
    sourceQuality: passport.sources.sourceQuality,
    requirements,
    requiredForQuantity: requirements.filter((item) => item.role === "required_for_quantity"),
    requiredForProfessionalAccuracy: requirements.filter((item) => item.role === "required_for_professional_accuracy"),
    optionalAccuracyImprovers: requirements.filter((item) => item.role === "optional_accuracy_improver"),
  };
  return rememberNormativePassport(key, result);
}

export function clearAiEstimateNormativeWorkParameterPassportCache(): void {
  passportCache.clear();
  clearAiEstimateParameterSchemaCache();
  clearProfessionalWorkPassportBuildCaches();
}

export function listAiEstimateNormativeWorkParameterPassportTemplateIds(): string[] {
  return listProfessionalWorkPassportTemplateIds();
}
