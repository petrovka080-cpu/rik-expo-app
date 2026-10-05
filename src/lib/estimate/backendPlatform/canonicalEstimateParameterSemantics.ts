import type { CanonicalEstimateCatalogItem } from "./contracts";
import { hasHumanReadableAiEstimateParameterPassport } from "../aiEstimateRuParameterDictionary";
import { waterMaterialVariantLabelRuR542 } from "./russianTechnologyTitleR542";
import { evaluateInclusionGraph } from "./inclusionGraph";

type ParameterSchema = CanonicalEstimateCatalogItem["parameterSchema"][number];

const SOURCE_MANAGED_CONSUMER_ROLES = new Set<ParameterSchema["valueSourceRole"]>([
  "MANDATORY_NORM_VALUE",
  "NORM_REQUIRED_BUT_PROJECT_SELECTED",
  "MANUFACTURER_CONFIRMED",
  "SELECTED_EQUIPMENT_PASSPORT",
  "SOURCE_BACKED_PRELIMINARY_PROFILE",
  "BACKEND_DERIVED",
]);

const DERIVED_OR_INTERNAL_PARAMETER_ID = /(?:^quantity_|^unit_price_|(?:^|_)(?:compacted_volume|coverage_area|work_quantity|calculated|derived|consumption_total|material_m3|trip_count)(?:_|$))/iu;
const PER_OUTPUT_OR_UNIT_INTERNAL_PARAMETER_ID = /(?:^qty_.+_per_output$|^(?:labor|machine|mass|handling|inspection|waste)_.+_per_unit$)/iu;
const SOURCE_LIKE_PARAMETER_ID = /(?:^quantity_|(?:^|_)(?:productivity|consumption|waste_factor|tack_coat_l_m2|base_emulsion_rate_l_m2|laboratory_test_interval|laboratory_protocol_count|control_interval|sampling_interval)(?:_|$)|(?:^|_)(?:worker|labor|machine)_h(?:ours?)?(?:_|$)|(?:^|_)[a-z0-9]+_per_[a-z0-9_]+$)/iu;
const DERIVED_OR_INTERNAL_TITLE = /^\s*(?:Количество|Объём|Объем):/iu;
const PRELIMINARY_DOCUMENT_SOURCE_ROLES = new Set<string>([
  "PROJECT_DOCUMENTATION",
  "ENGINEERING_DESIGN",
  "SITE_SURVEY",
  "MANUFACTURER_CONFIRMED",
  // Legacy professional families used this pre-contract spelling.
  "PROJECT_SPECIFIC_INPUT",
]);

const VISIBLE_REPLACEABLE_PROFILE_CLASSIFICATIONS = new Set<string>([
  "ASSUMPTION",
  "VISIBLE_PRELIMINARY_SCENARIO",
  "RUNTIME_STRUCTURAL_DEFAULT",
]);

const VISIBLE_REPLACEABLE_PROFILE_SOURCE_ROLES = new Set<string>([
  "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE",
  "VISIBLE_PRELIMINARY_SCENARIO",
  "VISIBLE_BASELINE_ASSUMPTION",
]);

const CANONICAL_CHOICE_LABELS_RU: Readonly<Record<string, string>> = Object.freeze({
  ACCEPTED: "Принято, ремонт не требуется",
  LOCAL_REPAIR_REQUIRED: "Требуется локальный ремонт",
  REPLACEMENT_REQUIRED: "Требуется полная замена",
  NEW_BASE_REQUIRED: "Требуется новое основание",
  RECONSTRUCTION_REQUIRED: "Требуется восстановление слоя",
  LIGHT: "Лёгкая нагрузка",
  MEDIUM: "Средняя нагрузка",
  HEAVY: "Тяжёлая нагрузка",
  VERY_HEAVY: "Особо тяжёлая нагрузка",
  SURFACING_ONLY: "Только покрытие по готовому основанию",
  PAVEMENT_STRUCTURE: "Покрытие и конструкция дорожной одежды",
  FULL_ROAD_INFRASTRUCTURE: "Полная дорога с инфраструктурой",
  TURNKEY_PARKING_WITH_SITE_FEATURES: "Парковка под ключ с обустройством",
  REHABILITATION: "Восстановление существующего покрытия",
  contractor: "Контроль выполняет подрядчик",
  independent: "Независимый лабораторный контроль",
  project_spec: "По программе контроля проекта",
  ROLLED: "Рулонная гидроизоляция",
  MASTIC: "Мастичная гидроизоляция",
  SPRAY_APPLIED: "Напыляемая гидроизоляция",
  DENSE_FINE_GRAINED: "Плотная мелкозернистая смесь",
  DENSE_COARSE_GRAINED: "Плотная крупнозернистая смесь",
  STONE_MASTIC: "Щебёночно-мастичный асфальтобетон",
  POROUS: "Пористая асфальтобетонная смесь",
});

const CONSTRUCTION_CHOICE_LABELS_RU: Readonly<Record<string, string>> = Object.freeze({
  PRELIMINARY_PROFILE: "Предварительные допущения, обследование не выполнено",
  CONFIRMED_PROJECT_FACTS: "Условия подтверждены обследованием и проектом",
  CEMENT_LIME_MINERAL_PLASTER: "Минеральная цементно-известковая штукатурка",
  CT54_EN_GL_0819: "Ceresit CT 54 Silicate Aero, технический лист en GL 08.19",
  CT17_PROFI_EN_GL_03_24: "Ceresit CT 17 PROFI, технический лист en GL 03.24",
  CT17_UNDILUTED: "CT 17 без разбавления",
  CT17_DILUTED_1_TO_1: "CT 17 с водой в соотношении 1:1",
  ALREADY_PRIMED: "Основание уже загрунтовано",
  MANUAL_ROLLER_BRUSH: "Вручную валиком и кистью",
  PAID_SPRAY_EQUIPMENT: "Распыление с отдельной оплатой аппарата",
  SURVEY_PENDING: "Обследование ещё не выполнено",
  CT29_REQUIRED: "Требуется минеральный ремонт CT 29",
  MOISTEN_ONLY: "Увлажнение основания без грунтовки",
  YES: "Подтверждено",
  full_reinforced_structure: "Полное устройство железобетонной конструкции",
  placement_only: "Только укладка и уход за бетонной смесью",
  ready_cages: "Готовые арматурные каркасы",
  site_fabricated: "Изготовление арматурного каркаса на площадке",
  ready_mix: "Готовая бетонная смесь с РБУ",
  pump: "Подача бетононасосом",
  crane_bucket: "Подача краном в бадье",
  direct_chute: "Прямая выгрузка из автобетоносмесителя",
  membrane: "Плёнкообразующий состав",
  water: "Водный уход",
  SEPARATE: "Доставка отдельной строкой",
  INCLUDED_IN_SUPPLY: "Доставка включена в поставку",
  NONE: "Не требуется",
  WATERSTOP: "Рабочий шов с гидрошпонкой",
  sand: "Песчаная подушка",
  crushed_stone: "Щебёночная подушка",
  bituminous_coating: "Обмазочная битумная гидроизоляция",
  sheet_membrane: "Листовая или мембранная гидроизоляция",
  "method-profile:nrmca-cip31:ready-mix-order:v1": "Заказ товарного бетона по NRMCA CIP 31",
  "project-profile:approved-reinforcement-bar-schedule:fhwa-rics:v1": "Масса по утверждённой ведомости арматуры",
});
/**
 * Product editor admission is intentionally fail-closed. A parameter can be
 * editable only when the immutable definition declares user ownership and a
 * concrete calculation consumer. Formula impact alone never proves ownership.
 * Names such as `waste_factor` and `*_productivity_*` are not intrinsically
 * derived: a published definition may explicitly assign those source values to
 * the user. Generated factor/productivity outputs remain excluded by the other
 * ownership, guide and generated-input checks below. Units do not establish
 * ownership either: for example, truck turnaround is a legitimate
 * user/project input measured in machine-hours.
 */
export function isCanonicalEstimateUserEditableParameter(schema: ParameterSchema): boolean {
  if (schema.visibilityRole !== "USER_INPUT") return false;
  if (!hasHumanReadableAiEstimateParameterPassport(schema.parameterId, schema.titleRu)) return false;
  if (DERIVED_OR_INTERNAL_PARAMETER_ID.test(schema.parameterId)) return false;
  if (PER_OUTPUT_OR_UNIT_INTERNAL_PARAMETER_ID.test(schema.parameterId)) return false;
  if (DERIVED_OR_INTERNAL_TITLE.test(schema.titleRu)) return false;
  if (schema.guide?.guideKind === "DERIVED_VALUE_RULE") return false;
  return canonicalEstimateParameterChangesPreliminaryEstimate(schema);
}

/**
 * A field belongs to the calculation screen only when the immutable
 * definition names a formula or resource branch that consumes it. Required
 * document references without a consumer may be useful for a later contract
 * or procurement package, but cannot honestly block a preliminary estimate.
 */
export function canonicalEstimateParameterHasCalculationConsumer(
  schema: ParameterSchema,
): boolean {
  return (schema.formulaConsumers?.length ?? 0) > 0
    || (schema.resourceBranchConsumers?.length ?? 0) > 0;
}

/**
 * A published runtime profile is an application-supplied calculation input,
 * not a hidden norm or a generated output. It must remain visible and
 * replaceable even when its technical id resembles a productivity or labor
 * norm that the ordinary consumer-input admission intentionally rejects.
 */
export function isCanonicalEstimateVisibleReplaceableProfile(
  schema: ParameterSchema,
): boolean {
  if (schema.visibilityRole !== "USER_INPUT") return false;
  if (!canonicalEstimateParameterHasCalculationConsumer(schema)) return false;
  const classification = String(schema.runtimeProfileClassification ?? "")
    .trim()
    .toUpperCase();
  const sourceRole = String(schema.valueSourceRole ?? "").trim().toUpperCase();
  return VISIBLE_REPLACEABLE_PROFILE_CLASSIFICATIONS.has(classification)
    || VISIBLE_REPLACEABLE_PROFILE_SOURCE_ROLES.has(sourceRole);
}

function hasDeclaredConditionalRequirement(schema: ParameterSchema): boolean {
  const raw = schema.requiredWhen ?? schema.constraints.requiredWhen;
  if (typeof raw === "string") {
    return raw.trim().length > 0 && raw.split(/\s+OR\s+/iu)
      .every(clause => /^([A-Za-z][A-Za-z0-9_.:-]*)\s*==\s*(.+)$/u.test(clause.trim()));
  }
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return false;
  const condition = raw as Record<string, unknown>;
  if (typeof condition.kind === "string" && condition.kind.trim()) {
    try {
      // Validate with the shared graph, not a second applicability evaluator.
      // Actual true/false/unknown visibility is resolved by the session owner.
      evaluateInclusionGraph(condition, {});
      return true;
    } catch {
      return false;
    }
  }
  return typeof condition.parameterId === "string" && condition.parameterId.trim().length > 0
    && Object.prototype.hasOwnProperty.call(condition, "equals");
}

function isMandatoryProjectNumericResourceFact(schema: ParameterSchema): boolean {
  return ["decimal", "integer"].includes(schema.valueType)
    && ["CONDITIONAL_PROJECT_FACT", "PROJECT_SPECIFIC_INPUT"].includes(String(schema.valueSourceRole))
    && schema.guide?.guideKind === "PROJECT_DEFINED"
    && schema.guide.guideValidationPolicy === "MANDATORY_BLOCK"
    && (hasDeclaredConditionalRequirement(schema) || (schema.valueSourceRole === "PROJECT_SPECIFIC_INPUT" && schema.required === true))
    && canonicalEstimateParameterHasCalculationConsumer(schema);
}

/** An optional actual project plan can still be needed by an informational
 * resource (for example, the area covered by each QA check). Its immutable
 * project guide admits editing; a missing value does not become a mandatory
 * preliminary input merely because the resource is shown in the estimate. */
export function isCanonicalEstimateOptionalProjectNumericResourceFact(schema: ParameterSchema): boolean {
  return schema.visibilityRole === "USER_INPUT"
    && ["decimal", "integer"].includes(schema.valueType)
    && schema.required !== true
    && (schema.requiredWhen ?? schema.constraints.requiredWhen) == null
    && ["CONDITIONAL_PROJECT_FACT", "PROJECT_SPECIFIC_INPUT"].includes(String(schema.valueSourceRole))
    && schema.guide?.guideKind === "PROJECT_DEFINED"
    && schema.guide.guideValidationPolicy === "MANDATORY_BLOCK"
    && schema.guide.sourceRole === "PROJECT_DOCUMENTATION"
    && Boolean(schema.guide.sourceDocument?.trim() && schema.guide.sourceLocator?.trim())
    && /^[a-f0-9]{64}$/iu.test(schema.guide.sourceSnapshotHash ?? "")
    && (schema.formulaConsumers?.length ?? 0) > 0
    && (schema.resourceBranchConsumers?.length ?? 0) > 0
    && isCanonicalEstimateUserEditableParameter(schema);
}

/** A bounded reference to actual project documentation can mention a rate or
 * consumption. Its checked immutable guide/ownership and real row consumers
 * distinguish it from entering a free-form professional norm. Protected norm,
 * equipment/manufacturer and derived roles are still checked first below. */
function isMandatoryProjectReferenceResourceFact(schema: ParameterSchema): boolean {
  const guide = schema.guide;
  return schema.valueType === "text"
    && ["CONDITIONAL_PROJECT_FACT", "PROJECT_SPECIFIC_INPUT"].includes(String(schema.valueSourceRole))
    && guide?.guideKind === "PROJECT_DEFINED"
    && guide.guideValidationPolicy === "MANDATORY_BLOCK"
    && guide.sourceRole === "PROJECT_DOCUMENTATION"
    && Boolean(guide.sourceDocument?.trim() && guide.sourceLocator?.trim())
    && /^[a-f0-9]{64}$/iu.test(guide.sourceSnapshotHash ?? "")
    && schema.constraints.minLength === 1
    && typeof schema.constraints.maxLength === "number" && schema.constraints.maxLength > 0 && schema.constraints.maxLength <= 1000
    && (hasDeclaredConditionalRequirement(schema) || (schema.valueSourceRole === "PROJECT_SPECIFIC_INPUT" && schema.required === true))
    && (schema.resourceBranchConsumers?.length ?? 0) > 0;
}

/** A required user choice or explicitly owned project gate can supply a BOQ
 * resource without a numeric formula. Mandatory project gates are classified
 * by immutable ownership/guide metadata, not by a reference-like field name.
 */
export function isCanonicalEstimateVisibleUserResourceSelectionParameter(
  schema: ParameterSchema,
): boolean {
  if (schema.visibilityRole !== "USER_INPUT") return false;
  if (["decimal", "integer"].includes(schema.valueType)) {
    return isMandatoryProjectNumericResourceFact(schema) && isCanonicalEstimateUserEditableParameter(schema);
  }
  if (schema.valueType !== "text") return false;
  const conditionalRequirement = hasDeclaredConditionalRequirement(schema);
  if (schema.required !== true && !conditionalRequirement) return false;
  if ((schema.resourceBranchConsumers?.length ?? 0) === 0) return false;
  const sourceRole = String(schema.valueSourceRole ?? "").trim().toUpperCase();
  const mandatoryProjectGate = ((sourceRole === "CONDITIONAL_PROJECT_FACT" && conditionalRequirement)
      || (sourceRole === "PROJECT_SPECIFIC_INPUT" && schema.required === true))
    && schema.guide?.guideKind === "PROJECT_DEFINED"
    && schema.guide?.guideValidationPolicy === "MANDATORY_BLOCK";
  // Legacy document links without explicit preliminary project-gate ownership
  // remain excluded. Norm/source/derived ownership still fails admission below.
  if (!mandatoryProjectGate && /(?:^|_)(?:reference|approval|certificate|document)(?:_|$)/iu.test(schema.parameterId)) return false;
  return (["USER_INPUT", "USER_MEASURED", "PROJECT_SPECIFIC_INPUT"].includes(sourceRole)
    || (sourceRole === "CONDITIONAL_PROJECT_FACT" && conditionalRequirement))
    && !isCanonicalEstimateSourceManagedParameter(schema);
}

/**
 * A resource row may name a document reference only for contract validation.
 * That does not mean the value changes quantity or branch composition. Formula
 * inputs always matter; resource-only values matter on the first screen when
 * they are explicit branch controls (choice/boolean/structured selection).
 */
export function canonicalEstimateParameterChangesPreliminaryEstimate(
  schema: ParameterSchema,
): boolean {
  if ((schema.formulaConsumers?.length ?? 0) > 0) return true;
  if ((schema.resourceBranchConsumers?.length ?? 0) === 0) return false;
  // A declared actual numeric compatibility gate can affect a resource without
  // being an arithmetic multiplier (e.g. the permitted transported length).
  if (isMandatoryProjectNumericResourceFact(schema)) return true;
  const conditional = schema.requiredWhen ?? schema.constraints.requiredWhen;
  const optionalDocumentProfile = schema.valueType === "enum"
    && schema.required !== true
    && schema.defaultValue == null
    && conditional == null
    && PRELIMINARY_DOCUMENT_SOURCE_ROLES.has(String(schema.valueSourceRole ?? ""));
  if (optionalDocumentProfile) return false;
  return schema.valueType === "boolean"
    || schema.valueType === "enum"
    || schema.valueType === "array_object";
}

export function canonicalEstimateParameterAllowsPreliminaryCompilation(
  schema: ParameterSchema,
): boolean {
  // MASTER (22): every catalogue work must expose its applicable composition
  // before every exact quantity or branch choice is known. Legacy `false`
  // flags belong to exact/final acceptance; they cannot turn an unknown
  // preliminary input into a hard failure. Invalid supplied values and
  // cross-field conflicts remain blocking, while unresolved values remain
  // visible as preliminary needs outside totals and procurement.
  // New automatic construction owners explicitly distinguish the small set
  // of real user/project facts from their visible replaceable engineering
  // profile. Only that fail-closed combination opens parameter collection;
  // legacy `false` flags remain non-blocking until their definitions receive
  // the same explicit policy and source ownership.
  const mandatoryPrimaryFact = schema.preliminaryCompilationAllowed === false
    && schema.guide?.guideValidationPolicy === "MANDATORY_BLOCK"
    && String(schema.valueSourceRole ?? "") === "USER_INPUT";
  const mandatoryConditionalProjectFact = schema.preliminaryCompilationAllowed === false
    && schema.guide?.guideValidationPolicy === "MANDATORY_BLOCK"
    && String(schema.valueSourceRole ?? "") === "CONDITIONAL_PROJECT_FACT";
  return !(mandatoryPrimaryFact || mandatoryConditionalProjectFact);
}

/**
 * All estimate entry points must classify the same missing field in the same
 * way. A missing value can be deferred only for the preliminary stage; type,
 * range, geometry and cross-field conflicts always remain blocking.
 */
export function canonicalEstimateBlockingParameterIssues<
  Issue extends { code: string; parameterId: string },
>(
  schema: readonly ParameterSchema[],
  issues: readonly Issue[],
): Issue[] {
  const schemaById = new Map(schema.map((parameter) => [parameter.parameterId, parameter]));
  return issues.filter((issue) => {
    if (issue.code !== "REQUIRED" && issue.code !== "REQUIRED_WHEN") return true;
    const definition = schemaById.get(issue.parameterId);
    return definition == null || !canonicalEstimateParameterAllowsPreliminaryCompilation(definition);
  });
}

/**
 * Consumer UI cannot accept a bare number where the definition requires a
 * normative source. Such values need a bound catalogue norm, approved work
 * method or equipment passport, none of which is represented by the scalar
 * consumer editor today.
 */
export function isCanonicalEstimateConsumerSuppliedParameter(schema: ParameterSchema): boolean {
  if (!isCanonicalEstimateUserEditableParameter(schema)) return false;
  return !isCanonicalEstimateSourceManagedParameter(schema);
}

/**
 * A consumer can describe the object and provide measurements or approved
 * project data. A norm, a selected machine/product passport and a derived
 * value need a bound source; a scalar entered by the customer is not proof of
 * that source.
 */
export function isCanonicalEstimateSourceManagedParameter(schema: ParameterSchema): boolean {
  if (SOURCE_MANAGED_CONSUMER_ROLES.has(schema.valueSourceRole)) return true;
  // A mandatory actual project fact may contain words such as "mass per unit"
  // or "capacity". Its immutable role/guide and consumers establish ownership;
  // the technical-looking name alone cannot turn it into a hidden norm.
  if (isMandatoryProjectNumericResourceFact(schema) || isMandatoryProjectReferenceResourceFact(schema)
    || isCanonicalEstimateOptionalProjectNumericResourceFact(schema)) return false;
  return canonicalEstimateParameterRequiresManagedProfessionalSource(schema);
}

/**
 * A customer may provide dimensions, selected products and project choices,
 * but never becomes the source of a professional norm merely because an old
 * passport labelled the scalar USER_INPUT. The missing value stays visible as
 * a source-managed gap until a checked norm, product passport or work method
 * supplies it.
 */
export function canonicalEstimateParameterRequiresManagedProfessionalSource(
  schema: Pick<ParameterSchema, "parameterId" | "titleRu">,
): boolean {
  return SOURCE_LIKE_PARAMETER_ID.test(schema.parameterId)
    || /(?:расход|производительност|трудозатрат|человеко.?час|машино.?час|коэффициент|норм[аы])/iu
      .test(schema.titleRu);
}

function conditionScalar(value: string): string | number | boolean {
  const normalized = value.trim();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  if (/^[+-]?\d+(?:\.\d+)?$/u.test(normalized)) return Number(normalized);
  return normalized.replace(/^(?:"([\s\S]*)"|'([\s\S]*)')$/u, "$1$2");
}

/** True only while this definition is applicable to the immutable revision. */
export function isCanonicalEstimateParameterRequiredForValues(
  schema: ParameterSchema,
  values: Readonly<Record<string, unknown>>,
): boolean {
  if (schema.required) return true;
  const raw = schema.requiredWhen ?? schema.constraints.requiredWhen;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const condition = raw as Record<string, unknown>;
    if (typeof condition.kind === "string" && condition.kind.trim()) {
      return evaluateInclusionGraph(condition, values);
    }
    const parameterId = String(condition.parameterId ?? "").trim();
    return Boolean(
      parameterId
      && Object.prototype.hasOwnProperty.call(condition, "equals")
      && values[parameterId] === condition.equals,
    );
  }
  if (typeof raw !== "string" || !raw.trim()) return false;
  return raw.split(/\s+OR\s+/iu).some((clause) => {
    const match = /^([A-Za-z][A-Za-z0-9_.:-]*)\s*==\s*(.+)$/u.exec(clause.trim());
    return Boolean(match && values[match[1]] === conditionScalar(match[2]));
  });
}

export function canonicalEstimateParameterChoiceLabelRu(
  parameterId: string,
  value: unknown,
  fallback?: string,
): string {
  const normalized = String(value);
  if (parameterId === "ct54_first_coat_water_ratio") {
    if (normalized === "0") return "Без разбавления";
    if (normalized === "0.1") return "10% воды только в первом слое";
  }
  // Decision values describe opposite branch choices. Do not fall back to the
  // parameter's generic guide/title for both options.
  if (normalized === "NOT_REQUIRED") return "Не требуется";
  if (normalized === "REQUIRED") return "Требуется";
  const constructionLabel = CONSTRUCTION_CHOICE_LABELS_RU[normalized];
  if (constructionLabel) return constructionLabel;
  if (parameterId === "concrete_class" && /^B\d+(?:[.,]\d+)?$/u.test(normalized)) {
    return `Бетон класса ${normalized}`;
  }
  if (parameterId === "watertightness" && /^W\d+$/u.test(normalized)) {
    return `Водонепроницаемость ${normalized}`;
  }
  if (parameterId === "frost_resistance" && /^F\d+$/u.test(normalized)) {
    return `Морозостойкость ${normalized}`;
  }
  if (parameterId === "mobility" && /^P\d+$/u.test(normalized)) {
    return `Подвижность ${normalized}`;
  }
  if (parameterId === "estimate_scope_mode") {
    if (normalized === "MINIMAL_EXPLICIT_SCOPE") return "Базовый состав";
    if (normalized === "FULL_APPLICABLE_SCOPE") return "Полный применимый состав";
  }
  if (parameterId === "material_variant") {
    return waterMaterialVariantLabelRuR542(normalized);
  }
  if (parameterId === "installation_method") {
    if (normalized === "OPEN_TRENCH") return "Открытая траншея";
    if (normalized === "TRENCHLESS") return "Бестраншейная прокладка";
  }
  if (normalized === "PROJECT_SPECIFIED") return "По проектной документации";
  const canonicalLabel = CANONICAL_CHOICE_LABELS_RU[normalized];
  if (canonicalLabel) return canonicalLabel;
  const technologyLabel = waterMaterialVariantLabelRuR542(normalized);
  if (technologyLabel !== normalized) return technologyLabel;
  const safeFallback = fallback?.trim();
  if (safeFallback && /[А-Яа-яЁё]/u.test(safeFallback)) return safeFallback;
  if (/^[A-Za-z][A-Za-z0-9_:-]*$/u.test(normalized)) {
    return "Вариант по проектной документации";
  }
  return normalized;
}
