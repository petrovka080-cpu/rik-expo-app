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
  _schema: ParameterSchema,
): boolean {
  // MASTER (22): every catalogue work must expose its applicable composition
  // before every exact quantity or branch choice is known. Legacy `false`
  // flags belong to exact/final acceptance; they cannot turn an unknown
  // preliminary input into a hard failure. Invalid supplied values and
  // cross-field conflicts remain blocking, while unresolved values remain
  // visible as preliminary needs outside totals and procurement.
  return true;
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
  return SOURCE_MANAGED_CONSUMER_ROLES.has(schema.valueSourceRole)
    || canonicalEstimateParameterRequiresManagedProfessionalSource(schema);
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
  const safeFallback = fallback?.trim();
  if (safeFallback && /[А-Яа-яЁё]/u.test(safeFallback)) return safeFallback;
  if (/^[A-Za-z][A-Za-z0-9_:-]*$/u.test(normalized)) {
    return "Вариант по проектной документации";
  }
  return normalized;
}
