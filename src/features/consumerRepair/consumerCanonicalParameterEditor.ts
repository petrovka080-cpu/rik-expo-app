import {roofScreed25StandaloneInactiveParameterIdsV1,ROOF_SCREED25_STANDALONE_QUESTION_IDS_V1,isRoofScreed25StandaloneCatalogV1,roofScreed25StandaloneGuideTextV1} from '../../lib/estimate/backendPlatform/canonicalRoofScreed25StandaloneV1';
import {roofScreed25InactiveParameterIdsV1,ROOF_SCREED25_QUESTION_PARAMETER_IDS_V1} from '../../lib/estimate/backendPlatform/canonicalRoofScreed25MigrationV1';
import {roofGuttersInactiveParameterIdsV1,ROOF_GUTTERS_QUESTION_PARAMETER_IDS_V1} from '../../lib/estimate/backendPlatform/canonicalRoofHangingGuttersMigrationV1';
import {
  assertCanonicalEstimateParameterSessionSnapshotIdentity,
  type CanonicalEstimateParameterSessionRevision,
  type CanonicalEstimateParameterSessionParent,
} from "../../lib/estimate/backendPlatform/canonicalEstimateParameterSessionSnapshot";
import type {
  ConsumerRepairDraftBundle,
  ConsumerRepairDraftRevisionParamBatchPatch,
} from "../../lib/consumerRequests";
import {
  getCanonicalEstimateCatalogItem,
  getCanonicalEstimateParameterSessionSnapshot,
  getCanonicalEstimateRevision,
  getAllCanonicalEstimateRevisionRows,
  recalculateCanonicalEstimateAndLoad,
} from "../../lib/estimate/backendPlatform/canonicalEstimateClient";
import { canonicalEstimateRecalculateIdempotencyKey } from "../../lib/estimate/backendPlatform/canonicalEstimateCommandIdentity";
import { adaptCanonicalRevisionToStructuredEstimate } from "../../lib/estimate/backendPlatform/canonicalEstimateForemanAdapter";
import {
  canonicalNumericPeerConstraintMessageRu,
  canonicalParameterValidationIssueMessageRu,
  validateCanonicalEstimateParameterInputs,
  type CanonicalParameterValidationIssue,
} from "../../lib/estimate/backendPlatform/canonicalEstimateParameterValidation";
import {
  CanonicalEstimateApiError,
  type CanonicalEstimateCatalogItem,
  type CanonicalEstimateCustomRow,
  type CanonicalEstimateParameterInputValue,
  type CanonicalEstimateRowOverride,
  type CanonicalEstimateRevisionView,
} from "../../lib/estimate/backendPlatform/contracts";
import {
  CANONICAL_PARAMETER_CORE_SCHEMA_VERSION,
  resolveCanonicalParameterVisibility,
  canonicalParameterVisibilityMissingParameterIds,
  type CanonicalParameter,
  type CanonicalParameterSession,
  type CanonicalParameterValue,
} from "../../lib/estimate/canonicalParameters/canonicalParameterCore";
import { resolveInclusionGraph } from "../../lib/estimate/backendPlatform/inclusionGraph";
import { canonicalOrderedSpecificationParameterIds } from '../../lib/estimate/backendPlatform/canonicalOrderedSpecificationBindings';
import { canonicalParameterAffectsEstimateCalculation } from "../../lib/estimate/canonicalParameters/canonicalParameterCalculationRelevance";
import { estimateDeterministicHash } from "../../lib/estimate/estimateDeterministicHash";
import {
  aiEstimateRuLabelForParameter,
} from "../../lib/estimate/aiEstimateRuParameterDictionary";
import {
  mapAiEstimateToForemanDraft,
  verifyForemanAiEstimatePayloadParity,
  type ForemanAiEstimateDraftMapping,
} from "../../lib/foremanAiEstimate";
import type { CatalogItemPickerItem } from "../../lib/catalog/catalogItemPickerTypes";
import { logger } from "../../lib/logger";
import { canonicalPublicEstimateParameterTitleRu } from '../../lib/estimate/backendPlatform/canonicalPublicEstimateLanguageRu';
import {roofLowerLayersInactiveParameterIdsV1,ROOF_LOWER_LAYERS_QUESTION_PARAMETER_IDS_V1} from '../../lib/estimate/backendPlatform/canonicalRoofLowerLayersMigrationV1';
import { createConsumerEstimateHydrationTrace } from "../../lib/consumerRequests/consumerEstimateHydrationTrace";
import {
  assertConsumerCanonicalChildRevision,
  consumerCanonicalInheritedRecalculationInputs,
  consumerCanonicalExplicitMigrationParameters,
  consumerCanonicalExplicitAutomaticParameters,
  resolveConsumerCanonicalRecalculationCatalog,
  type ConsumerCanonicalRecalculationConsent,
} from "./consumerCanonicalReleaseMigration";
import {
  canonicalEstimateBlockingParameterIssues,
  canonicalEstimateConsumerInputRole,
  canonicalEstimateParameterChoiceLabelRu,
  isCanonicalEstimateConsumerSuppliedParameter,
  isCanonicalEstimateSourceManagedParameter,
  isCanonicalEstimateUserEditableParameter,
  isCanonicalEstimateVisibleReplaceableProfile,
  isCanonicalEstimateVisibleUserResourceSelectionParameter,
} from "../../lib/estimate/backendPlatform/canonicalEstimateParameterSemantics";

type EditableSchema = CanonicalEstimateCatalogItem["parameterSchema"][number];

function blockingCanonicalParameterIssues(
  catalog: CanonicalEstimateCatalogItem,
  issues: ReturnType<typeof validateCanonicalEstimateParameterInputs>["issues"],
) {
  return canonicalEstimateBlockingParameterIssues(catalog.parameterSchema, issues);
}

export function parameterIssuesBlockingConsumerCanonicalRecalculation(input: {
  issues: CanonicalParameterValidationIssue[];
  parameterPatchCount: number;
  rowOverrideCount: number;
}): CanonicalParameterValidationIssue[] {
  // A row-only amendment must remain possible for an immutable historical
  // revision whose parameters no longer satisfy a newer client-side validator.
  // The inherited issue still blocks parameter edits and final readiness; it
  // must not turn exclude/restore/price edits into silent no-ops.
  if (input.parameterPatchCount === 0 && input.rowOverrideCount > 0) return [];
  return input.issues;
}

function requestIdentityForRecalculation(input: {
  revision: CanonicalEstimateRevisionView;
  catalog: CanonicalEstimateCatalogItem;
  problemText: string;
}): { sourceRequestText: string; primaryMeasureParameterId: string } {
  const sourceRequestText = input.revision.sourceRequestText?.trim() || input.problemText.trim();
  const primaryMeasureParameterId = input.revision.primaryMeasureParameterId?.trim()
    || input.catalog.parameterSchema.find((parameter) =>
      parameter.parameterId === "area_m2"
      && input.revision.parameters[parameter.parameterId] != null)?.parameterId
    || input.catalog.parameterSchema.find((parameter) =>
      isConsumerMeaningfulCanonicalParameter(parameter)
      && input.revision.parameters[parameter.parameterId] != null)?.parameterId
    || "";
  if (!sourceRequestText || !primaryMeasureParameterId) {
    throw new CanonicalEstimateApiError(
      "Не удалось восстановить исходное задание выбранной версии. Смета не изменена.",
      { code: "SOURCE_REQUEST_IDENTITY_REQUIRED", httpStatus: 409 },
    );
  }
  return { sourceRequestText, primaryMeasureParameterId };
}

export function canonicalCatalogCustomRowClassification(
  item: Pick<CatalogItemPickerItem, "kind" | "category" | "procurementEligible">,
): { section: string; category: string; includedInProcurement: boolean } {
  const tokens = new Set(`${String(item.kind ?? "")} ${String(item.category ?? "")}`
    .trim()
    .toLocaleLowerCase("en-US")
    .split(/[^a-zа-яё]+/u)
    .filter(Boolean));
  const hasAny = (...candidates: string[]) => candidates.some((candidate) => tokens.has(candidate));
  const procurement = (fallback: boolean) => item.procurementEligible ?? fallback;
  if (hasAny("delivery", "logistics", "transport", "freight", "haul", "доставка", "логистика", "транспорт")) {
    return { section: "Доставка", category: "delivery", includedInProcurement: procurement(true) };
  }
  if (hasAny("machinery", "machine", "mechanism", "equipment", "tool", "механизм", "механизмы", "оборудование", "инструмент")) {
    return { section: "Механизмы", category: "machine_equipment", includedInProcurement: procurement(true) };
  }
  if (hasAny("labor", "work", "works", "temporary", "работа", "работы", "труд")) {
    return { section: "Работы", category: "construction_work", includedInProcurement: procurement(false) };
  }
  if (hasAny("service", "services", "testing", "documentation", "commissioning", "supervision", "услуга", "услуги", "испытание")) {
    return { section: "Услуги", category: "service", includedInProcurement: procurement(false) };
  }
  if (hasAny("waste", "отход", "отходы")) {
    return { section: "Отходы", category: "waste", includedInProcurement: procurement(false) };
  }
  return { section: "Материалы", category: "material", includedInProcurement: procurement(true) };
}

export function isConsumerMeaningfulCanonicalParameter(schema: EditableSchema): boolean {
  return isCanonicalEstimateConsumerSuppliedParameter(schema)
    || isCanonicalEstimateVisibleReplaceableProfile(schema)
    || isCanonicalEstimateVisibleUserResourceSelectionParameter(schema);
}

export function consumerCanonicalPrecompileParameterOverrides(input: {
  session: CanonicalParameterSession;
  patches: readonly ConsumerRepairDraftRevisionParamBatchPatch[];
}): Record<string, CanonicalEstimateParameterInputValue> {
  const overrides: Record<string, CanonicalEstimateParameterInputValue> = Object.fromEntries(
    input.session.parameters.flatMap((parameter) =>
      parameter.value == null
      || !["USER_EXPLICIT", "TEXT_EXTRACTED"].includes(parameter.source)
      || !canonicalParameterAffectsEstimateCalculation(parameter)
        ? []
        : [[parameter.parameterId, parameter.value]],
    ),
  );
  for (const patch of input.patches) {
    if (patch.operation === "remove_param") delete overrides[patch.paramKey];
    else overrides[patch.paramKey] = patch.rawValue;
  }
  return overrides;
}

export function normalizedCanonicalNumericValidation(input: {
  minimum: unknown;
  maximum: unknown;
  integer: boolean;
}): { min?: number; max?: number; integer?: true } {
  const rawMinimum = input.minimum == null ? Number.NaN : Number(input.minimum);
  const rawMaximum = input.maximum == null ? Number.NaN : Number(input.maximum);
  const minimum = Number.isFinite(rawMinimum) && Math.abs(rawMinimum) <= Number.EPSILON * 8
    ? 0
    : rawMinimum;
  const maximum = rawMaximum;
  const validPair = Number.isFinite(minimum) && Number.isFinite(maximum) && maximum > minimum;
  return {
    ...(validPair ? { min: minimum, max: maximum } : {}),
    ...(!Number.isFinite(maximum) && Number.isFinite(minimum) ? { min: minimum } : {}),
    ...(!Number.isFinite(minimum) && Number.isFinite(maximum) ? { max: maximum } : {}),
    ...(input.integer ? { integer: true as const } : {}),
  };
}

function allowedValues(schema: EditableSchema): unknown[] {
  const raw = schema.constraints.values
    ?? schema.constraints.allowedValues
    ?? schema.constraints.enum;
  return Array.isArray(raw) ? raw : [];
}

function scalarValue(schema: EditableSchema, value: unknown): CanonicalParameterValue | null {
  if (value == null || value === "") return null;
  if (schema.valueType === "boolean") {
    if (value === true || value === "true" || value === "1" || value === 1) return true;
    if (value === false || value === "false" || value === "0" || value === 0) return false;
    return null;
  }
  if (schema.valueType === "decimal" || schema.valueType === "integer") {
    const parsed = Number(String(value).replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (schema.valueType === "array_object") return JSON.stringify(value);
  return String(value);
}

function parameterSource(input: {
  schema: EditableSchema;
  value: CanonicalParameterValue | null;
  parentValue: unknown;
  rootUserInputPresent: boolean;
  rootUserInputValue: unknown;
}): CanonicalParameter["source"] {
  if (input.value == null) return "MISSING";
  if (input.schema.visibilityRole === "USER_DERIVED_READONLY") return "CALCULATED";
  if (input.rootUserInputPresent
    && String(input.rootUserInputValue) === String(input.value)) return "USER_EXPLICIT";
  if (input.parentValue !== undefined) {
    return String(input.parentValue) === String(input.value) ? "PROJECT_SPECIFIC" : "USER_EXPLICIT";
  }
  // A root revision can contain a value accepted by the definition baseline or
  // extracted during initial compilation. Neither is a confirmation click in
  // this editor, so it must never be presented as user-confirmed provenance.
  return "ASSUMED";
}

function runtimeProfileParameterSource(
  schema: EditableSchema,
): CanonicalParameter["source"] {
  const classification = String(schema.runtimeProfileClassification ?? "")
    .trim()
    .toUpperCase();
  if (classification === "ASSUMPTION"
    || classification === "PRELIMINARY_SOURCE_FORMULA"
    || classification === "VISIBLE_PRELIMINARY_SCENARIO"
    || classification === "RUNTIME_STRUCTURAL_DEFAULT"
    || schema.valueSourceRole === "VISIBLE_PRELIMINARY_SCENARIO"
    || schema.valueSourceRole === "VISIBLE_BASELINE_ASSUMPTION") return "ASSUMED";
  return "NORMATIVE_DERIVED";
}

function scalarConditionValue(value: unknown): CanonicalParameterValue | null {
  if (typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return normalized;
}

function objectVisibilityCondition(raw: unknown): CanonicalParameter["visibilityCondition"] | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const condition = raw as Record<string, unknown>;
  if (condition.kind === "equals") {
    const parameterId = typeof condition.parameterId === "string" ? condition.parameterId.trim() : "";
    const value = scalarConditionValue(condition.value);
    return parameterId && value != null ? { kind: "PARAMETER_EQUALS", parameterId, value } : null;
  }
  if (typeof condition.parameterId === "string" && Object.prototype.hasOwnProperty.call(condition, "equals")) {
    const parameterId = condition.parameterId.trim();
    const value = scalarConditionValue(condition.equals);
    return parameterId && value != null ? { kind: "PARAMETER_EQUALS", parameterId, value } : null;
  }
  if ((condition.kind === "and" || condition.kind === "or") && Array.isArray(condition.operands)) {
    const targetKind = condition.kind === "and" ? "ALL_OF" as const : "ANY_OF" as const;
    const children = condition.operands.map(objectVisibilityCondition);
    if (children.some((candidate) => candidate == null)) return null;
    const flattened = children.flatMap((candidate) => {
      if (!candidate) return [];
      if (candidate.kind === "PARAMETER_EQUALS") {
        return [{ parameterId: candidate.parameterId, value: candidate.value }];
      }
      return candidate.kind === targetKind ? candidate.conditions : [];
    });
    const flattenable = children.every((candidate) =>
      candidate?.kind === "PARAMETER_EQUALS" || candidate?.kind === targetKind
    );
    if (flattenable && flattened.length > 0) return { kind: targetKind, conditions: flattened };
  }
  if (["literal", "parameter", "present", "selected", "not", "and", "or", "greater_than", "greater_than_or_equal", "less_than", "less_than_or_equal", "formula_greater_than"].includes(String(condition.kind))) {
    resolveInclusionGraph(condition, {});
    return { kind: "INCLUSION_GRAPH", ast: JSON.parse(JSON.stringify(condition)) as Record<string, unknown> };
  }
  return null;
}

function parameterVisibilityCondition(schema: EditableSchema): CanonicalParameter["visibilityCondition"] {
  return parameterCondition(schema.visibleWhen ?? schema.requiredWhen ?? schema.constraints.requiredWhen);
}

function parameterCondition(raw: unknown): CanonicalParameter["visibilityCondition"] {
  const structured = objectVisibilityCondition(raw);
  if (structured) return structured;
  const expression = typeof raw === "string" ? raw.trim() : "";
  if (!expression) return { kind: "ALWAYS" };
  const conditions = expression.split(/\s+OR\s+/iu).reduce<{
    parameterId: string;
    value: CanonicalParameterValue;
  }[]>((accepted, clause) => {
    const match = /^([A-Za-z][A-Za-z0-9_.:-]*)\s*==\s*(.+)$/.exec(clause.trim());
    if (!match) return accepted;
    const rawValue = match[2].trim();
    const value: CanonicalParameterValue = rawValue === "true"
      ? true
      : rawValue === "false"
        ? false
        : rawValue;
    accepted.push({ parameterId: match[1], value });
    return accepted;
  }, []);
  if (conditions.length === 0) return { kind: "ALWAYS" };
  if (conditions.length === 1) return {
    kind: "PARAMETER_EQUALS",
    parameterId: conditions[0].parameterId,
    value: conditions[0].value,
  };
  return { kind: "ANY_OF", conditions };
}

function buildParameter(input: {
  schema: EditableSchema;
  parameters: Record<string, unknown>;
  referenceParameters?: Record<string, unknown> | null;
  parentParameters?: Record<string, unknown> | null;
  userInputSnapshot?: Record<string, unknown> | null;
  sourceOverride?: CanonicalParameter["source"];
}): CanonicalParameter {
  const labelRu = aiEstimateRuLabelForParameter(
    input.schema.parameterId,
    // In an admitted canonical question, equality is prose punctuation. Keep
    // the dictionary's technical-ID/code guards; normalize only presentation.
    isConsumerMeaningfulCanonicalParameter(input.schema)
      ? input.schema.titleRu.replace(/\s*=\s*/gu, " — ")
      : input.schema.titleRu,
  );
  const value = scalarValue(input.schema, input.parameters[input.schema.parameterId]);
  const hasRuntimeReference = Object.prototype.hasOwnProperty.call(
    input.referenceParameters ?? {},
    input.schema.parameterId,
  );
  const referenceValue = scalarValue(
    input.schema,
    hasRuntimeReference
      ? input.referenceParameters?.[input.schema.parameterId]
      : input.schema.defaultValue,
  );
  const source = input.sourceOverride ?? parameterSource({
    schema: input.schema,
    value,
    parentValue: input.parentParameters?.[input.schema.parameterId],
    rootUserInputPresent: input.parentParameters == null
      && Object.prototype.hasOwnProperty.call(
        input.userInputSnapshot ?? {},
        input.schema.parameterId,
      ),
    rootUserInputValue: input.userInputSnapshot?.[input.schema.parameterId],
  });
  const choices = allowedValues(input.schema);
  const numericValidation = normalizedCanonicalNumericValidation({
    minimum: input.schema.constraints.min,
    maximum: input.schema.constraints.max,
    integer: input.schema.valueType === "integer",
  });
  const normative = input.schema.normativeLinks?.[0];
  const guide = input.schema.guide;
  const conditional = input.schema.requiredWhen != null || input.schema.constraints.requiredWhen != null;
  const requiredLevel = input.schema.required
    ? "CONTRACT_REQUIRED" as const
    : conditional
      ? "CONDITIONAL" as const
      : "OPTIONAL" as const;
  return {
    parameterId: input.schema.parameterId,
    label: canonicalPublicEstimateParameterTitleRu(input.schema.parameterId, labelRu),
    consumerInputRole: canonicalEstimateConsumerInputRole(input.schema),
    description: input.schema.descriptionRu || guide?.guideShortRu || labelRu,
    value,
    referenceValue,
    referenceSource: referenceValue == null
      ? undefined
      : runtimeProfileParameterSource(input.schema),
    valueType: input.schema.valueType === "decimal" || input.schema.valueType === "integer"
      ? "number"
      : input.schema.valueType === "boolean" ? "boolean" : "string",
    unit: input.schema.unitId,
    requiredLevel,
    visibilityCondition: parameterVisibilityCondition(input.schema),
    ...(conditional ? { requiredCondition: parameterCondition(
      input.schema.requiredWhen ?? input.schema.constraints.requiredWhen,
    ) } : {}),
    validation: {
      ...numericValidation,
      ...(["text", "enum", "array_object"].includes(input.schema.valueType) && input.schema.required
        ? { nonEmpty: true }
        : {}),
    },
    allowedValues: choices.map((choice) => {
      const guideChoice = guide?.guideOptions?.find((candidate) => String(candidate.value) === String(choice));
      return {
        value: scalarValue(input.schema, choice) ?? String(choice),
        label: canonicalEstimateParameterChoiceLabelRu(input.schema.parameterId, choice, guideChoice?.ruleRu),
      };
    }),
    source,
    state: value == null ? (requiredLevel === "OPTIONAL" ? "NOT_APPLICABLE" : "BLOCKING_REQUIRED") : source === "CALCULATED" ? "DERIVED" : source === "ASSUMED" ? "ASSUMED" : "PROVIDED",
    confidence: value == null ? 0 : source === "ASSUMED" ? 0.7 : 1,
    assumption: source === "ASSUMED" ? "Предварительно принято из утверждённого baseline этой работы." : null,
    affectsRows: input.schema.resourceBranchConsumers ?? [],
    affectsFormula: input.schema.formulaConsumers ?? [],
    resourceSelectionInput: isCanonicalEstimateVisibleUserResourceSelectionParameter(input.schema),
    normativeSource: normative ? {
      profile: "KG_PROFILE",
      sourceId: normative.sourceId,
      document: normative.documentTitleRu,
      revision: normative.editionStatus,
      locator: normative.locator,
      checkedAt: normative.verifiedAt,
      sourceHash: guide?.sourceSnapshotHash || estimateDeterministicHash(normative),
    } : null,
    displayOrder: input.schema.ordinal,
    sourceText: source === "USER_EXPLICIT"
      ? "Подтверждено пользователем."
      : source === "TEXT_EXTRACTED"
        ? "Распознано из описания работ."
        : guide?.guideShortRu || null,
    valid: value != null || requiredLevel === "OPTIONAL",
    validationIssues: value == null && requiredLevel !== "OPTIONAL" ? ["VALUE_REQUIRED"] : [],
  };
}

function buildConsumerCanonicalParameterSessionFromValues(input: {
  catalog: CanonicalEstimateCatalogItem;
  draftId: string;
  revisionId: string;
  parameters: Record<string, unknown>;
  referenceParameters?: Record<string, unknown> | null;
  parentParameters?: Record<string, unknown> | null;
  userInputSnapshot?: Record<string, unknown> | null;
  activeNeedParameterIds: ReadonlySet<string>;
  inactiveParameterIds?: ReadonlySet<string>;
  orderedSpecificationParameterIds?: ReadonlySet<string>;
  additionalBlockingIds?: readonly string[];
  sourceByParameterId?: ReadonlyMap<string, CanonicalParameter["source"]>;
  schemaId: string;
  schemaVersion: string;
  calculationVersion: string;
  checksum: string;
  createdAt: string;
}): CanonicalParameterSession {
  const allParameters = input.catalog.parameterSchema
    .filter((schema) => isConsumerMeaningfulCanonicalParameter(schema)
      || (input.parameters[schema.parameterId] != null
        && isCanonicalEstimateUserEditableParameter(schema))
      || (input.activeNeedParameterIds.has(schema.parameterId)
        && !isCanonicalEstimateSourceManagedParameter(schema)
        && (schema.visibilityRole === "USER_INPUT"
          || isCanonicalEstimateUserEditableParameter(schema))))
    .map((schema) => buildParameter({
      schema: schema.guide && isRoofScreed25StandaloneCatalogV1({catalogId:input.catalog.catalogId,
        definitionVersion:input.catalog.definitionVersion,metadata:input.catalog.professionalMetadata})
        && roofScreed25StandaloneGuideTextV1(schema.parameterId)
        ? {...schema,guide:{...schema.guide,guideShortRu:roofScreed25StandaloneGuideTextV1(schema.parameterId)!}} : schema,
      parameters: input.parameters,
      referenceParameters: input.referenceParameters,
      parentParameters: input.parentParameters,
      userInputSnapshot: input.userInputSnapshot,
      sourceOverride: input.parameters[schema.parameterId] == null
        ? isCanonicalEstimateSourceManagedParameter(schema)
          ? runtimeProfileParameterSource(schema)
          : undefined
        : input.sourceByParameterId?.get(schema.parameterId)
          ?? (Object.prototype.hasOwnProperty.call(
            input.userInputSnapshot ?? {},
            schema.parameterId,
          )
            ? "USER_EXPLICIT"
            : ['PRELIMINARY_SOURCE_FORMULA', 'CATALOGUE_SOURCE_SELECTION'].includes(String(schema.runtimeProfileClassification))
              ? runtimeProfileParameterSource(schema)
              : input.parentParameters?.[schema.parameterId] !== undefined
            && String(input.parentParameters[schema.parameterId])
              !== String(input.parameters[schema.parameterId])
              ? "USER_EXPLICIT"
              : isCanonicalEstimateSourceManagedParameter(schema)
                ? runtimeProfileParameterSource(schema)
                : undefined),
    })).map((parameter): CanonicalParameter => input.inactiveParameterIds?.has(parameter.parameterId)
      ? { ...parameter, visibilityCondition: { kind: 'INCLUSION_GRAPH', ast: { kind: 'literal', value: false } } }
      : input.orderedSpecificationParameterIds?.has(parameter.parameterId)
        ? { ...parameter, visibilityCondition: { kind: 'ALWAYS' }, requiredCondition: { kind: 'ALWAYS' } }
        : parameter);
  const values = new Map(allParameters
    .filter((parameter) => parameter.value != null)
    .map((parameter) => [parameter.parameterId, parameter.value!] as const));
  const conditionState = (parameter: CanonicalParameter): boolean | null => {
    // A backend need is authoritative only inside its applicable branch. The
    // client parser maps an unsupported/newer expression to ALWAYS. For a
    // supported expression, an absent dependency is unknown while an explicit
    // mismatch is false; this keeps a selected backend need visible without
    // reviving a branch the user's known inputs disabled.
    return resolveCanonicalParameterVisibility(parameter.visibilityCondition, values);
  };
  const parameterById = new Map(allParameters.map(parameter => [parameter.parameterId, parameter]));
  const activeQuestionIds = new Set<string>();
  const visitQuestion = (id: string, path: ReadonlySet<string>): void => {
    const parameter = parameterById.get(id);
    if (!parameter || conditionState(parameter) === false) return;
    const selectors = canonicalParameterVisibilityMissingParameterIds(parameter.visibilityCondition, values);
    const editableSelectors = selectors.filter(selector => parameterById.has(selector));
    // Preserve a question on malformed/cyclic or unsupported dependency graphs;
    // never turn an unresolved backend need into a complete editor session.
    if (path.has(id) || editableSelectors.length === 0) {
      activeQuestionIds.add(id);
      return;
    }
    const nextPath = new Set([...path, id]);
    // A technology/supply choice decides which numerical branch can apply.
    // Ask that choice before quantities for all competing undecided variants.
    const branchChoices = editableSelectors.filter(selector => {
      const candidate = parameterById.get(selector);
      return candidate?.value == null && (candidate?.valueType === "boolean" || Boolean(candidate?.allowedValues?.length));
    });
    (branchChoices.length > 0 ? branchChoices : editableSelectors).forEach(selector => visitQuestion(selector, nextPath));
  };
  input.activeNeedParameterIds.forEach(id => visitQuestion(id, new Set()));
  const rawVisibleParameters = allParameters.filter((parameter) => {
    const state = conditionState(parameter);
    return activeQuestionIds.has(parameter.parameterId)
      ? state !== false
      : state === true;
  });
  const visibleParameters = rawVisibleParameters.map((parameter): CanonicalParameter =>
    parameter.value == null && activeQuestionIds.has(parameter.parameterId)
      ? {
        ...parameter,
        requiredLevel: "BLOCKING_REQUIRED",
        state: "BLOCKING_REQUIRED",
        valid: false,
        validationIssues: parameter.validationIssues.includes("VALUE_REQUIRED")
          ? parameter.validationIssues
          : [...parameter.validationIssues, "VALUE_REQUIRED"],
      }
      : parameter
  );
  const visibleParameterIds = new Set(visibleParameters.map((parameter) => parameter.parameterId));
  const inactiveConditionalParameters = allParameters.filter((parameter) =>
    !visibleParameterIds.has(parameter.parameterId)
  );
  const blockingMissingParameterIds = [...new Set([
    ...visibleParameters
    .filter((parameter) => parameter.requiredLevel === "BLOCKING_REQUIRED" && parameter.value == null)
    .map((parameter) => parameter.parameterId),
    ...(input.additionalBlockingIds ?? []),
  ])];
  const contractMissingParameterIds = visibleParameters
    .filter((parameter) => (
      parameter.requiredLevel === "CONTRACT_REQUIRED" || parameter.requiredLevel === "CONDITIONAL"
    ) && parameter.value == null)
    .map((parameter) => parameter.parameterId);
  const assumptionParameterIds = visibleParameters
    .filter((parameter) => parameter.source === "ASSUMED")
    .map((parameter) => parameter.parameterId);
  const invalidParameterIds = visibleParameters
    .filter((parameter) => parameter.value != null && !parameter.valid)
    .map((parameter) => parameter.parameterId);
  const status = invalidParameterIds.length > 0
    ? "INVALID" as const
    : blockingMissingParameterIds.length > 0
      ? "BLOCKING_REQUIRED" as const
      : contractMissingParameterIds.length > 0 || assumptionParameterIds.length > 0
        ? "PRELIMINARY_WITH_ASSUMPTIONS" as const
        : "COMPLETE" as const;
  const fingerprint = estimateDeterministicHash({
    revisionId: input.revisionId,
    checksum: input.checksum,
    parameters: allParameters.map((parameter) => ({
      id: parameter.parameterId,
      value: parameter.value,
      source: parameter.source,
      referenceValue: parameter.referenceValue,
      referenceSource: parameter.referenceSource,
    })),
  });
  return {
    coreSchemaVersion: CANONICAL_PARAMETER_CORE_SCHEMA_VERSION,
    sessionId: `backend-session:${input.revisionId}`,
    draftId: input.draftId,
    revisionId: input.revisionId,
    schemaId: input.schemaId,
    schemaVersion: input.schemaVersion,
    workPassportId: input.catalog.catalogId,
    canonicalWorkKey: input.catalog.workKey,
    calculationVersion: input.calculationVersion,
    status,
    parameters: visibleParameters,
    inactiveConditionalParameters,
    blockingMissingParameterIds,
    contractMissingParameterIds,
    assumptionParameterIds,
    invalidParameterIds,
    fingerprint,
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
  };
}

export function buildConsumerCanonicalParameterSession(input: {
  catalog: CanonicalEstimateCatalogItem;
  revision: CanonicalEstimateParameterSessionRevision;
  parent?: CanonicalEstimateParameterSessionParent | null;
  draftId: string;
}): CanonicalParameterSession {
  const activeNeedParameterIds = new Set((input.revision.preliminaryNeeds ?? [])
    .filter((need) => need.selected)
    .flatMap((need) => need.missingParameterIds));
  // A spare fitting has a real order even when the installed-count branch is zero.
  // Only server-projected exact specification questions receive this exception.
  const orderedSpecificationParameterIds = new Set([
    ...(input.revision.orderedSpecificationParameterIds ?? []),
    ...canonicalOrderedSpecificationParameterIds(input.catalog.orderedSpecificationBindings,
      input.revision.amendmentContract?.rowOverrides, input.revision.parameters),
    ...(input.revision.preliminaryNeeds ?? [])
    .filter(need => need.selected && Number(need.quantity) > 0)
    .flatMap(need => (need.orderedSpecificationParameterIds ?? []).filter(id => need.missingParameterIds.includes(id))),
  ]);
  // The compiled revision is the authoritative description of which source
  // inputs still prevent selected resource rows from receiving quantities.
  // Some cumulative definitions intentionally keep engineering/norm inputs
  // optional at schema level so a partial BOQ can be saved. Once a selected
  // row names such an input in preliminaryNeeds, presenting it as
  // NOT_APPLICABLE would create a false "0 parameters" state while backend
  // rows remain unresolved. Promote only those active, visible needs to a
  // contract clarification; inactive conditional branches remain hidden.
  // A manually added catalog row has no definition parameter that can carry its quantity.
  // Keep that input visible and approval-blocking until the user edits the row itself.
  const unresolvedManualQuantityIds = (input.revision.preliminaryNeeds ?? [])
    .filter((need) => need.selected && need.quantity == null
      && need.needState === "QUANTITY_REQUIRED" && need.missingParameterIds.length === 0)
    .map((need) => `${need.rowId}:quantity`);
  const session = buildConsumerCanonicalParameterSessionFromValues({
    catalog: input.catalog,
    draftId: input.draftId,
    revisionId: input.revision.revisionId,
    parameters: input.revision.parameters,
    referenceParameters: input.revision.acceptedBaselineSnapshot
      ?? input.revision.assumptionSnapshot
      ?? null,
    parentParameters: input.parent?.parameters ?? null,
    userInputSnapshot: input.revision.userInputSnapshot,
    activeNeedParameterIds: new Set([
      ...activeNeedParameterIds,
    ]),
    inactiveParameterIds:new Set([...roofScreed25StandaloneInactiveParameterIdsV1({catalogId:input.catalog.catalogId,
      definitionVersion:input.catalog.definitionVersion,metadata:input.catalog.professionalMetadata,selection:input.revision.compositionSelectionV1}),...(input.revision.excludedScopeParameterIdsV1??(input.revision.roofStageRestorationV6?roofScreed25InactiveParameterIdsV1({receipt:input.revision.roofStageRestorationV6,definitionId:input.revision.definitionVersionId,catalogId:input.revision.catalogId,selection:input.revision.compositionSelectionV1}):input.revision.roofStageRestorationV5?roofGuttersInactiveParameterIdsV1({receipt:input.revision.roofStageRestorationV5,definitionId:input.revision.definitionVersionId,catalogId:input.revision.catalogId,selection:input.revision.compositionSelectionV1}):roofLowerLayersInactiveParameterIdsV1({receipt:input.revision.roofStageRestorationV4,definitionId:input.revision.definitionVersionId,catalogId:input.revision.catalogId,selection:input.revision.compositionSelectionV1})))
      .filter(id=>ROOF_GUTTERS_QUESTION_PARAMETER_IDS_V1.includes(id)||ROOF_SCREED25_QUESTION_PARAMETER_IDS_V1.includes(id)||ROOF_SCREED25_STANDALONE_QUESTION_IDS_V1.includes(id))]),
    additionalBlockingIds: unresolvedManualQuantityIds,
    orderedSpecificationParameterIds,
    schemaId: input.revision.parameterSchemaHash || `backend-schema:${input.catalog.catalogId}`,
    schemaVersion: `definition:${input.catalog.definitionVersion}`,
    calculationVersion: input.revision.compilerVersion,
    checksum: input.revision.checksumSha256,
    createdAt: input.revision.createdAt,
  });
  return input.revision.contentWithdrawalReasonRu
    ? { ...session, status: "BLOCKING_REQUIRED", contentWithdrawalReasonRu: input.revision.contentWithdrawalReasonRu }
    : session;
}

export function buildConsumerCanonicalPrecompileParameterSession(input: {
  catalog: CanonicalEstimateCatalogItem;
  draftId: string;
  parameters: Record<string, CanonicalEstimateParameterInputValue>;
  missingParameterIds: readonly string[];
  userExplicitParameterIds?: readonly string[];
  textExtractedParameterIds?: readonly string[];
  createdAt?: string;
}): CanonicalParameterSession {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const sessionIdentity = estimateDeterministicHash({
    draftId: input.draftId,
    releaseId: input.catalog.releaseId,
    catalogId: input.catalog.catalogId,
    parameters: input.parameters,
    missingParameterIds: input.missingParameterIds,
  });
  const explicitIds = new Set(input.userExplicitParameterIds ?? []);
  const textExtractedIds = new Set(
    input.textExtractedParameterIds ?? Object.keys(input.parameters),
  );
  const sourceByParameterId = new Map<string, CanonicalParameter["source"]>(
    Object.keys(input.parameters).map((parameterId) => [
      parameterId,
      explicitIds.has(parameterId)
        ? "USER_EXPLICIT"
        : textExtractedIds.has(parameterId)
          ? "TEXT_EXTRACTED"
          : "ASSUMED",
    ]),
  );
  const userInputSnapshot = Object.fromEntries(
    Object.entries(input.parameters).filter(([parameterId]) =>
      explicitIds.has(parameterId) || textExtractedIds.has(parameterId)
    ),
  );
  const referenceParameters = Object.fromEntries(
    Object.entries(input.parameters).filter(([parameterId]) =>
      sourceByParameterId.get(parameterId) === "ASSUMED"
    ),
  );
  return buildConsumerCanonicalParameterSessionFromValues({
    catalog: input.catalog,
    draftId: input.draftId,
    revisionId: `precompile:${sessionIdentity}`,
    parameters: input.parameters,
    referenceParameters,
    userInputSnapshot,
    activeNeedParameterIds: new Set(input.missingParameterIds),
    sourceByParameterId,
    schemaId: `backend-schema:${input.catalog.catalogId}`,
    schemaVersion: `definition:${input.catalog.definitionVersion}`,
    calculationVersion: `precompile:${input.catalog.definitionVersion}`,
    checksum: sessionIdentity,
    createdAt,
  });
}

export async function loadConsumerCanonicalParameterSession(input: {
  revisionId: string;
  draftId: string;
}): Promise<CanonicalParameterSession> {
  const startedAt = Date.now();
  const hydrationTrace = createConsumerEstimateHydrationTrace();
  const snapshot = await hydrationTrace.measureAsync("PARAMETER_SNAPSHOT_FETCH",
    () => getCanonicalEstimateParameterSessionSnapshot(input.revisionId, undefined, hydrationTrace));
  assertCanonicalEstimateParameterSessionSnapshotIdentity(snapshot, input.revisionId);
  const { revision, catalog, parent } = snapshot;
  if (catalog.releaseId !== revision.releaseId) {
    throw new CanonicalEstimateApiError("Параметры не открыты: версия каталога не совпадает со сметой.", {
      code: "REVISION_RELEASE_MISMATCH",
      httpStatus: 409,
    });
  }
  const session = hydrationTrace.measureSync("PARAMETER_SESSION_BUILD",
    () => buildConsumerCanonicalParameterSession({ catalog, revision, parent, draftId: input.draftId }));
  logger.releaseEvidence("RikEstimateParameters", "REVISION_PARAMETER_SESSION_READY", {
    stage: "REVISION_PARAMETER_SESSION_READY", elapsedMs: Date.now() - startedAt,
    revisionId: revision.revisionId, parameterCount: session.parameters.length,
    missingCount: session.blockingMissingParameterIds.length,
  });
  return session;
}

export async function loadConsumerCanonicalRevisionDraftMapping(input: {
  revisionId: string;
  problemText?: string | null;
}): Promise<ForemanAiEstimateDraftMapping> {
  const revision = await getCanonicalEstimateRevision(input.revisionId);
  const [snapshot, rows] = await Promise.all([
    getCanonicalEstimateParameterSessionSnapshot(input.revisionId),
    getAllCanonicalEstimateRevisionRows({ revisionId: revision.revisionId }),
  ]);
  assertCanonicalEstimateParameterSessionSnapshotIdentity(snapshot, input.revisionId);
  const catalog = snapshot.catalog;
  if (catalog.releaseId !== revision.releaseId) {
    throw new CanonicalEstimateApiError("Смета не открыта: версия каталога не совпадает с выбранной версией сметы.", {
      code: "REVISION_RELEASE_MISMATCH",
      httpStatus: 409,
    });
  }
  if (revision.status === "failed" || rows.length !== revision.rowCount) {
    throw new CanonicalEstimateApiError("Смета не открыта: backend не подтвердил полный состав выбранной версии.", {
      code: "REVISION_ROW_PARITY_MISMATCH",
      httpStatus: 409,
    });
  }
  const estimate = adaptCanonicalRevisionToStructuredEstimate({
    catalog,
    revision,
    rows,
    inputText: input.problemText?.trim() || catalog.titleRu,
  });
  const mapping = mapAiEstimateToForemanDraft({
    estimate,
    context: {
      objectName: "Заявка на ремонт",
      levelName: "",
      systemName: "",
      zoneName: "",
      sourceScreen: "foreman_materials",
    },
    estimateRevisionId: revision.revisionId,
    estimateReleaseId: revision.releaseId,
  });
  const parity = verifyForemanAiEstimatePayloadParity(mapping);
  if (!parity.ok || mapping.payload.rows.length !== revision.rowCount) {
    throw new CanonicalEstimateApiError("Смета не открыта: нарушено соответствие строк выбранной backend-версии.", {
      code: "CANONICAL_REVISION_PROJECTION_PARITY_FAILED",
      httpStatus: 409,
    });
  }
  return mapping;
}

export async function recalculateConsumerCanonicalEstimate(input: {
  revisionId: string;
  draftId: string;
  problemText: string;
  patches: ConsumerRepairDraftRevisionParamBatchPatch[];
  rowOverrides?: Record<string, CanonicalEstimateRowOverride>;
  roofPrimerPrerequisiteV1?: import('../../lib/estimate/backendPlatform/canonicalRoofPrimerPrerequisiteV1').RoofPrimerPrerequisiteCommandV1|null;
  compositionSelectionV1?: import('../../lib/estimate/backendPlatform/canonicalEstimateCompositionSelectionV1').CanonicalEstimateCompositionSelectionV1|null;
} & ConsumerCanonicalRecalculationConsent): Promise<{ mapping: ForemanAiEstimateDraftMapping; session: CanonicalParameterSession; recovered?: boolean; quantityPolicyTransition?: boolean }> {
  const revision = await getCanonicalEstimateRevision(input.revisionId);
  const { catalog, releaseMigration, recoveredRevision, quantityClearPreview } = await resolveConsumerCanonicalRecalculationCatalog({ ...input, revision,
    allowQuantityClearTransition: true, hasNewRowAmendments: Object.keys(input.rowOverrides ?? {}).length > 0||Object.hasOwn(input,'roofPrimerPrerequisiteV1')||Object.hasOwn(input,'compositionSelectionV1'), parameterPatchKeys: input.patches.map(patch => patch.paramKey) });
  const rawInputs: Record<string, unknown> = consumerCanonicalInheritedRecalculationInputs(revision, catalog);
  if (!quantityClearPreview) for (const patch of input.patches) rawInputs[patch.paramKey] = patch.rawValue;
  const validation = validateCanonicalEstimateParameterInputs({ schema: catalog.parameterSchema, rawInputs });
  const blockingIssues = parameterIssuesBlockingConsumerCanonicalRecalculation({
    issues: blockingCanonicalParameterIssues(catalog, validation.issues),
    parameterPatchCount: input.patches.length,
    rowOverrideCount: Object.keys(input.rowOverrides ?? {}).length,
  });
  if (blockingIssues.length > 0) {
    const geometryConflict = blockingIssues.some((issue) => issue.code === "GEOMETRY_CONFLICT");
    const peerIssue = blockingIssues.find((issue) => issue.code === "CROSS_FIELD");
    const peerMessage = peerIssue ? canonicalNumericPeerConstraintMessageRu(catalog.parameterSchema, peerIssue) : null;
    throw new CanonicalEstimateApiError(
      geometryConflict
        ? "Параметры не сохранены: площадь не совпадает с длиной × шириной. Исправьте площадь либо размеры объекта."
        : peerMessage ?? `Параметры не сохранены: ${blockingIssues.map((issue) => canonicalParameterValidationIssueMessageRu(catalog.parameterSchema, issue)).join(" ")}`,
      { code: "INVALID_PARAMETER_INPUT", httpStatus: 400 },
    );
  }
  const parameters = (quantityClearPreview ? revision.userInputSnapshot : releaseMigration
    ? consumerCanonicalExplicitMigrationParameters(catalog, validation.parameters, rawInputs)
    : consumerCanonicalExplicitAutomaticParameters(catalog, validation.parameters, rawInputs)) as Record<string, CanonicalEstimateParameterInputValue>;
  const requestIdentity = requestIdentityForRecalculation({
    revision,
    catalog,
    problemText: input.problemText,
  });
  const rowOverrides: Record<string, CanonicalEstimateRowOverride> = quantityClearPreview
    ? Object.fromEntries(quantityClearPreview.rows.map(row => [row.rowId, { quantity: null, provenance: { kind: 'manual' } }]))
    : { ...revision.amendmentContract.rowOverrides };
  for (const [rowId, override] of Object.entries(input.rowOverrides ?? {})) {
    rowOverrides[rowId] = { ...rowOverrides[rowId], ...override };
  }
  const customRows = revision.amendmentContract.customRows;
  const derivedQuantityClearV1 = quantityClearPreview ? {
    contractVersion: 'canonical-fusion-derived-quantity-clear/v1' as const, acknowledged: true as const,
    parentChecksumSha256: quantityClearPreview.parentChecksumSha256, clearedRowIds: quantityClearPreview.rows.map(row => row.rowId),
  } : undefined;
  input.assertMutationSource?.();
  const result = recoveredRevision ? {
    revision: await getCanonicalEstimateRevision(recoveredRevision.revisionId),
    rows: await getAllCanonicalEstimateRevisionRows({ revisionId: recoveredRevision.revisionId }),
  } : await recalculateCanonicalEstimateAndLoad({
    consumerIntent: true,
    request: {
      idempotencyKey: canonicalEstimateRecalculateIdempotencyKey({
        parentRevisionId: revision.revisionId,
        parameters,
        rowOverrides,
        customRows,
        releaseMigration,
        derivedQuantityClearV1,
        ...(Object.hasOwn(input,'roofPrimerPrerequisiteV1')?{roofPrimerPrerequisiteV1:input.roofPrimerPrerequisiteV1}:{}),
        ...(Object.hasOwn(input,'compositionSelectionV1')?{compositionSelectionV1:input.compositionSelectionV1}:{}),
      }),
      catalogId: revision.catalogId,
      parentRevisionId: revision.revisionId,
      organizationId: revision.organizationId ?? null,
      ...(quantityClearPreview ? { sourceRequestText: revision.sourceRequestText!, primaryMeasureParameterId: revision.primaryMeasureParameterId! } : requestIdentity),
      parameters,
      currencyCode: revision.currencyCode,
      rowOverrides,
      customRows,
      ...(releaseMigration ? { releaseMigration } : {}),
      ...(derivedQuantityClearV1 ? { derivedQuantityClearV1, priceSnapshotIds: revision.priceSnapshotIds } : {}),
      ...(Object.hasOwn(input,'roofPrimerPrerequisiteV1')?{roofPrimerPrerequisiteV1:input.roofPrimerPrerequisiteV1}:{}),
      ...(Object.hasOwn(input,'compositionSelectionV1')?{compositionSelectionV1:input.compositionSelectionV1}:{}),
    },
  });
  assertConsumerCanonicalChildRevision({ parent: revision, catalog, child: result.revision });
  if(Object.hasOwn(input,'compositionSelectionV1')) {
    const expected=parseCanonicalCompositionSelectionV1(input.compositionSelectionV1), actual=result.revision.compositionSelectionV1;
    if(expected === null ? actual != null : JSON.stringify(expected) !== JSON.stringify(actual))
      throw new CanonicalEstimateApiError('Backend не подтвердил сохранение исключений состава.',{code:'COMPOSITION_SELECTION_RESULT_MISMATCH',httpStatus:409});
  }
  if(Object.hasOwn(input,'roofPrimerPrerequisiteV1')){
    const expected=input.roofPrimerPrerequisiteV1,actual=result.revision.roofPrimerPrerequisiteV1;
    if(expected===null?actual!=null:!expected||!actual||actual.sourceRevisionId!==expected.sourceRevisionId
      ||actual.sourceChecksumSha256!==expected.sourceChecksumSha256||actual.phase!==expected.phase||actual.sectionLabelRu!==expected.sectionLabelRu.trim())
      throw new CanonicalEstimateApiError('Backend не подтвердил сохранение связи с огрунтовкой.',{code:'ROOF_PRIMER_LINK_RESULT_MISMATCH',httpStatus:409});
  }
  if (result.revision.status !== "ready" || result.rows.length !== result.revision.rowCount) {
    throw new CanonicalEstimateApiError("Изменения не сохранены: не подтверждён полный состав новой версии.", { code: "REVISION_ROW_PARITY_MISMATCH", httpStatus: 409 });
  }
  const estimate = adaptCanonicalRevisionToStructuredEstimate({
    catalog,
    revision: result.revision,
    rows: result.rows,
    inputText: input.problemText,
  });
  const mapping = mapAiEstimateToForemanDraft({
    estimate,
    context: {
      objectName: "Заявка на ремонт",
      levelName: "",
      systemName: "",
      zoneName: "",
      sourceScreen: "foreman_materials",
    },
    estimateRevisionId: result.revision.revisionId,
    estimateReleaseId: result.revision.releaseId,
  });
  const parity = verifyForemanAiEstimatePayloadParity(mapping);
  if (!parity.ok) {
    throw new CanonicalEstimateApiError("Изменения не сохранены: нарушено соответствие строк backend.", {
      code: "CANONICAL_RECALC_PARITY_FAILED",
      httpStatus: 409,
    });
  }
  return {
    mapping,
    ...(recoveredRevision ? { recovered: true } : {}),
    ...(quantityClearPreview ? { quantityPolicyTransition: true } : {}),
    session: buildConsumerCanonicalParameterSession({
      catalog,
      revision: result.revision,
      parent: revision,
      draftId: input.draftId,
    }),
  };
}

export async function recalculateAndPersistConsumerCanonicalEstimate(input: {
  revisionId: string;
  draftId: string;
  problemText: string;
  patches: ConsumerRepairDraftRevisionParamBatchPatch[];
  rowOverrides?: Record<string, CanonicalEstimateRowOverride>;
  roofPrimerPrerequisiteV1?: import('../../lib/estimate/backendPlatform/canonicalRoofPrimerPrerequisiteV1').RoofPrimerPrerequisiteCommandV1|null;
  compositionSelectionV1?: import('../../lib/estimate/backendPlatform/canonicalEstimateCompositionSelectionV1').CanonicalEstimateCompositionSelectionV1|null;
  persist: (
    mapping: ForemanAiEstimateDraftMapping,
    problemText: string,
    draftId: string,
  ) => Promise<ConsumerRepairDraftBundle | null | undefined>;
  recalculate?: typeof recalculateConsumerCanonicalEstimate;
} & ConsumerCanonicalRecalculationConsent): Promise<{ session: CanonicalParameterSession; bundle: ConsumerRepairDraftBundle; recovered?: boolean; quantityPolicyTransition?: boolean }> {
  const recalculate = input.recalculate ?? recalculateConsumerCanonicalEstimate;
  const result = await recalculate({
    revisionId: input.revisionId,
    draftId: input.draftId,
    problemText: input.problemText,
    patches: input.patches,
    rowOverrides: input.rowOverrides,
    ...(Object.hasOwn(input,'roofPrimerPrerequisiteV1')?{roofPrimerPrerequisiteV1:input.roofPrimerPrerequisiteV1}:{}),
    ...(Object.hasOwn(input,'compositionSelectionV1')?{compositionSelectionV1:input.compositionSelectionV1}:{}),
    confirmReleaseMigration: input.confirmReleaseMigration,
    assertMutationSource: input.assertMutationSource,
  });
  input.assertMutationSource?.();
  const bundle = await input.persist(result.mapping, input.problemText, input.draftId);
  if (!bundle) throw new Error("CANONICAL_CONSUMER_CHILD_DRAFT_PERSIST_FAILED");
  return { session: result.session, bundle, ...(result.recovered ? { recovered: true } : {}), ...(result.quantityPolicyTransition ? { quantityPolicyTransition: true } : {}) };
}

export async function recalculateConsumerCanonicalCatalogSelection(input: {
  revisionId: string;
  problemText: string;
  rowId: string;
  catalogItem: CatalogItemPickerItem;
} & ConsumerCanonicalRecalculationConsent): Promise<ForemanAiEstimateDraftMapping> {
  const revision = await getCanonicalEstimateRevision(input.revisionId);
  const [{ catalog, releaseMigration }, rows] = await Promise.all([
    resolveConsumerCanonicalRecalculationCatalog({ ...input, revision, hasNewRowAmendments: true }),
    getAllCanonicalEstimateRevisionRows({ revisionId: revision.revisionId }),
  ]);
  const sourceRow = rows.find((row) => row.rowId === input.rowId);
  if (!sourceRow) {
    throw new CanonicalEstimateApiError("Товар не выбран: строка отсутствует в выбранной версии.", {
      code: "ROW_REVISION_IDENTITY_MISMATCH",
      httpStatus: 409,
    });
  }
  const selectedUnit = input.catalogItem.unit?.trim().toLocaleLowerCase("ru-RU");
  const sourceUnit = sourceRow.unitId.trim().toLocaleLowerCase("ru-RU");
  if (selectedUnit && selectedUnit !== sourceUnit) {
    throw new CanonicalEstimateApiError("Товар не выбран: единица товара не совпадает с единицей строки.", {
      code: "CATALOG_ITEM_UNIT_MISMATCH",
      httpStatus: 409,
    });
  }
  const unitPrice = input.catalogItem.unitPrice == null ? null : Number(input.catalogItem.unitPrice);
  if (unitPrice != null && (!Number.isFinite(unitPrice) || unitPrice < 0)) {
    throw new CanonicalEstimateApiError("Товар не выбран: цена товара некорректна.", {
      code: "CATALOG_ITEM_PRICE_INVALID",
      httpStatus: 400,
    });
  }
  const rowOverrides = {
    ...revision.amendmentContract.rowOverrides,
    [input.rowId]: {
      ...(revision.amendmentContract.rowOverrides[input.rowId] ?? {}),
      ...(unitPrice == null ? {} : { unitPrice }),
      ...(Object.hasOwn(revision.amendmentContract.rowOverrides[input.rowId]??{},'machineHourPriceCoverageV1')?{machineHourPriceCoverageV1:null}:{}),
      provenance: {
        kind: "manual" as const,
        reason: `market_catalog:${input.catalogItem.catalogItemId}:${input.catalogItem.sourceId}`.slice(0, 500),
      },
    },
  };
  const parameterValidation = validateCanonicalEstimateParameterInputs({
    schema: catalog.parameterSchema,
    rawInputs: consumerCanonicalInheritedRecalculationInputs(revision, catalog),
  });
  if (blockingCanonicalParameterIssues(catalog, parameterValidation.issues).length > 0) {
    throw new CanonicalEstimateApiError("Товар не выбран: параметры родительской версии не прошли проверку.", {
      code: "PARENT_PARAMETER_CONTRACT_INVALID",
      httpStatus: 409,
    });
  }
  input.assertMutationSource?.();
  const result = await recalculateCanonicalEstimateAndLoad({
    consumerIntent: true,
    request: {
      idempotencyKey: `consumer-line-catalog-${estimateDeterministicHash({
        parent: revision.revisionId,
        rowId: input.rowId,
        catalogItemId: input.catalogItem.catalogItemId,
        sourceId: input.catalogItem.sourceId,
        unitPrice,
        releaseMigration,
      })}`,
      catalogId: revision.catalogId,
      parentRevisionId: revision.revisionId,
      organizationId: revision.organizationId ?? null,
      ...requestIdentityForRecalculation({
        revision,
        catalog,
        problemText: input.problemText,
      }),
      parameters: (releaseMigration ? consumerCanonicalExplicitMigrationParameters(catalog, parameterValidation.parameters, consumerCanonicalInheritedRecalculationInputs(revision, catalog)) : consumerCanonicalExplicitAutomaticParameters(catalog, parameterValidation.parameters, consumerCanonicalInheritedRecalculationInputs(revision, catalog))) as Record<string, CanonicalEstimateParameterInputValue>,
      currencyCode: revision.currencyCode,
      rowOverrides,
      customRows: revision.amendmentContract.customRows,
      ...(releaseMigration ? { releaseMigration } : {}),
    },
  });
  assertConsumerCanonicalChildRevision({ parent: revision, catalog, child: result.revision });
  const estimate = adaptCanonicalRevisionToStructuredEstimate({
    catalog,
    revision: result.revision,
    rows: result.rows,
    inputText: input.problemText,
  });
  const mapping = mapAiEstimateToForemanDraft({
    estimate,
    context: {
      objectName: "Заявка на ремонт",
      levelName: "",
      systemName: "",
      zoneName: "",
      sourceScreen: "foreman_materials",
    },
    estimateRevisionId: result.revision.revisionId,
    estimateReleaseId: result.revision.releaseId,
  });
  const parity = verifyForemanAiEstimatePayloadParity(mapping);
  if (!parity.ok || mapping.payload.rows.length !== result.revision.rowCount) {
    throw new CanonicalEstimateApiError("Товар не выбран: нарушено соответствие строк результата.", {
      code: "CANONICAL_CATALOG_SELECTION_PARITY_FAILED",
      httpStatus: 409,
    });
  }
  return mapping;
}

export async function recalculateConsumerCanonicalCatalogAddition(input: {
  revisionId: string;
  problemText: string;
  catalogItem: CatalogItemPickerItem;
} & ConsumerCanonicalRecalculationConsent): Promise<{ mapping: ForemanAiEstimateDraftMapping; rowId: string }> {
  const revision = await getCanonicalEstimateRevision(input.revisionId);
  const { catalog, releaseMigration } = await resolveConsumerCanonicalRecalculationCatalog({ ...input, revision, hasNewRowAmendments: true });
  const titleRu = input.catalogItem.name.trim();
  const unitId = input.catalogItem.unit.trim();
  if (!titleRu || !unitId) {
    throw new CanonicalEstimateApiError(
      "\u041f\u043e\u0437\u0438\u0446\u0438\u044f \u043d\u0435 \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d\u0430: \u0432 \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0435 \u043d\u0435\u0442 \u043d\u0430\u0437\u0432\u0430\u043d\u0438\u044f \u0438\u043b\u0438 \u0435\u0434\u0438\u043d\u0438\u0446\u044b \u0438\u0437\u043c\u0435\u0440\u0435\u043d\u0438\u044f.",
      { code: "CATALOG_ITEM_CONTRACT_INVALID", httpStatus: 400 },
    );
  }
  const unitPrice = input.catalogItem.unitPrice == null
    ? null
    : Number(input.catalogItem.unitPrice);
  if (unitPrice != null && (!Number.isFinite(unitPrice) || unitPrice < 0)) {
    throw new CanonicalEstimateApiError(
      "\u041f\u043e\u0437\u0438\u0446\u0438\u044f \u043d\u0435 \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d\u0430: \u0446\u0435\u043d\u0430 \u0442\u043e\u0432\u0430\u0440\u0430 \u043d\u0435\u043a\u043e\u0440\u0440\u0435\u043a\u0442\u043d\u0430.",
      { code: "CATALOG_ITEM_PRICE_INVALID", httpStatus: 400 },
    );
  }
  const parameterValidation = validateCanonicalEstimateParameterInputs({
    schema: catalog.parameterSchema,
    rawInputs: consumerCanonicalInheritedRecalculationInputs(revision, catalog),
  });
  if (blockingCanonicalParameterIssues(catalog, parameterValidation.issues).length > 0) {
    throw new CanonicalEstimateApiError(
      "\u041f\u043e\u0437\u0438\u0446\u0438\u044f \u043d\u0435 \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d\u0430: \u043f\u0430\u0440\u0430\u043c\u0435\u0442\u0440\u044b \u0440\u043e\u0434\u0438\u0442\u0435\u043b\u044c\u0441\u043a\u043e\u0439 \u0432\u0435\u0440\u0441\u0438\u0438 \u043d\u0435 \u043f\u0440\u043e\u0448\u043b\u0438 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0443.",
      { code: "PARENT_PARAMETER_CONTRACT_INVALID", httpStatus: 409 },
    );
  }
  const classification = canonicalCatalogCustomRowClassification(input.catalogItem);
  const clientRowId = `catalog-${estimateDeterministicHash({
    parentRevisionId: revision.revisionId,
    catalogItemId: input.catalogItem.catalogItemId,
    sourceId: input.catalogItem.sourceId,
    ordinal: revision.amendmentContract.customRows.length,
  }).slice(0, 40)}`;
  const customRow: CanonicalEstimateCustomRow = {
    clientRowId,
    section: classification.section,
    category: classification.category,
    titleRu,
    unitId,
    quantity: null,
    unitPrice,
    includedInEstimate: true,
    includedInProcurement: classification.includedInProcurement,
    provenance: {
      kind: "manual",
      reason: `catalog_add:${input.catalogItem.catalogItemId}:${input.catalogItem.sourceId}`.slice(0, 500),
    },
  };
  input.assertMutationSource?.();
  const result = await recalculateCanonicalEstimateAndLoad({
    consumerIntent: true,
    request: {
      idempotencyKey: `consumer-catalog-add-${estimateDeterministicHash({
        parentRevisionId: revision.revisionId,
        clientRowId,
        releaseMigration,
      })}`,
      catalogId: revision.catalogId,
      parentRevisionId: revision.revisionId,
      organizationId: revision.organizationId ?? null,
      ...requestIdentityForRecalculation({ revision, catalog, problemText: input.problemText }),
      parameters: (releaseMigration ? consumerCanonicalExplicitMigrationParameters(catalog, parameterValidation.parameters, consumerCanonicalInheritedRecalculationInputs(revision, catalog)) : consumerCanonicalExplicitAutomaticParameters(catalog, parameterValidation.parameters, consumerCanonicalInheritedRecalculationInputs(revision, catalog))) as Record<string, CanonicalEstimateParameterInputValue>,
      currencyCode: revision.currencyCode,
      rowOverrides: revision.amendmentContract.rowOverrides,
      customRows: [...revision.amendmentContract.customRows, customRow],
      ...(releaseMigration ? { releaseMigration } : {}),
    },
  });
  assertConsumerCanonicalChildRevision({ parent: revision, catalog, child: result.revision });
  const rowId = `manual:${clientRowId}`;
  const preliminaryRow = result.revision.preliminaryNeeds?.find((need) =>
    need.rowId === rowId && need.titleRu === titleRu
  );
  if (
    result.revision.parentRevisionId !== revision.revisionId
    || !preliminaryRow
    || preliminaryRow.quantity != null
    || result.rows.length !== result.revision.rowCount
  ) {
    throw new CanonicalEstimateApiError(
      "\u041f\u043e\u0437\u0438\u0446\u0438\u044f \u043d\u0435 \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d\u0430: backend \u043d\u0435 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u043b \u0434\u043e\u0447\u0435\u0440\u043d\u044e\u044e \u0432\u0435\u0440\u0441\u0438\u044e \u0438 \u043d\u043e\u0432\u0443\u044e \u0441\u0442\u0440\u043e\u043a\u0443.",
      { code: "CANONICAL_CUSTOM_ROW_PARITY_FAILED", httpStatus: 409 },
    );
  }
  const estimate = adaptCanonicalRevisionToStructuredEstimate({
    catalog,
    revision: result.revision,
    rows: result.rows,
    inputText: input.problemText,
  });
  const mapping = mapAiEstimateToForemanDraft({
    estimate,
    context: {
      objectName: "\u0417\u0430\u044f\u0432\u043a\u0430 \u043d\u0430 \u0440\u0435\u043c\u043e\u043d\u0442",
      levelName: "",
      systemName: "",
      zoneName: "",
      sourceScreen: "foreman_materials",
    },
    estimateRevisionId: result.revision.revisionId,
    estimateReleaseId: result.revision.releaseId,
  });
  const parity = verifyForemanAiEstimatePayloadParity(mapping);
  if (!parity.ok || mapping.payload.rows.length !== result.revision.rowCount) {
    throw new CanonicalEstimateApiError(
      "\u041f\u043e\u0437\u0438\u0446\u0438\u044f \u043d\u0435 \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d\u0430: \u043d\u0430\u0440\u0443\u0448\u0435\u043d\u043e \u0441\u043e\u043e\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0438\u0435 \u0441\u0442\u0440\u043e\u043a \u0434\u043e\u0447\u0435\u0440\u043d\u0435\u0439 backend-\u0432\u0435\u0440\u0441\u0438\u0438.",
      { code: "CANONICAL_CUSTOM_ROW_PROJECTION_PARITY_FAILED", httpStatus: 409 },
    );
  }
  return { mapping, rowId };
}
import {parseCanonicalCompositionSelectionV1} from '../../lib/estimate/backendPlatform/canonicalEstimateCompositionSelectionV1';
