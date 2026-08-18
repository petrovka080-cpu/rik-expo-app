import type { ConsumerRepairDraftRevisionParamBatchPatch } from "../../lib/consumerRequests";
import {
  getCanonicalEstimateCatalogItem,
  getCanonicalEstimateRevision,
  getAllCanonicalEstimateRevisionRows,
  recalculateCanonicalEstimateAndLoad,
} from "../../lib/estimate/backendPlatform/canonicalEstimateClient";
import { adaptCanonicalRevisionToStructuredEstimate } from "../../lib/estimate/backendPlatform/canonicalEstimateForemanAdapter";
import { validateCanonicalEstimateParameterInputs } from "../../lib/estimate/backendPlatform/canonicalEstimateParameterValidation";
import {
  CanonicalEstimateApiError,
  type CanonicalEstimateCatalogItem,
  type CanonicalEstimateParameterInputValue,
  type CanonicalEstimateRevisionView,
} from "../../lib/estimate/backendPlatform/contracts";
import {
  CANONICAL_PARAMETER_CORE_SCHEMA_VERSION,
  type CanonicalParameter,
  type CanonicalParameterSession,
  type CanonicalParameterValue,
} from "../../lib/estimate/canonicalParameters";
import { estimateDeterministicHash } from "../../lib/estimate/estimateDeterministicHash";
import {
  aiEstimateRuLabelForParameter,
  hasHumanReadableAiEstimateParameterPassport,
} from "../../lib/estimate/aiEstimateRuParameterDictionary";
import {
  mapAiEstimateToForemanDraft,
  verifyForemanAiEstimatePayloadParity,
  type ForemanAiEstimateDraftMapping,
} from "../../lib/foremanAiEstimate";
import type { CatalogItemPickerItem } from "../../lib/catalog/catalogItemPickerTypes";

type EditableSchema = CanonicalEstimateCatalogItem["parameterSchema"][number];

const INTERNAL_PRESENTATION_PARAMETER = /(?:^|_)(?:compacted_volume|volume_m3|coverage_area|work_quantity|factor|coefficient|calculated|derived|consumption_total|mass_t)(?:_|$)/iu;

export function isConsumerMeaningfulCanonicalParameter(schema: EditableSchema): boolean {
  if (schema.visibilityRole === "INTERNAL_ONLY" || schema.visibilityRole === "USER_DERIVED_READONLY") return false;
  if (!hasHumanReadableAiEstimateParameterPassport(schema.parameterId, schema.titleRu)) return false;
  if (INTERNAL_PRESENTATION_PARAMETER.test(schema.parameterId)) return false;
  return Boolean(
    schema.required ||
    (schema.formulaConsumers?.length ?? 0) > 0 ||
    (schema.resourceBranchConsumers?.length ?? 0) > 0
  );
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
}): CanonicalParameter["source"] {
  if (input.value == null) return "MISSING";
  if (input.schema.visibilityRole === "USER_DERIVED_READONLY") return "CALCULATED";
  if (input.parentValue !== undefined) {
    return String(input.parentValue) === String(input.value) ? "PROJECT_SPECIFIC" : "USER_EXPLICIT";
  }
  // A root revision can contain a value accepted by the definition baseline or
  // extracted during initial compilation. Neither is a confirmation click in
  // this editor, so it must never be presented as user-confirmed provenance.
  return "ASSUMED";
}

function buildParameter(input: {
  schema: EditableSchema;
  revision: CanonicalEstimateRevisionView;
  parent: CanonicalEstimateRevisionView | null;
}): CanonicalParameter {
  const labelRu = aiEstimateRuLabelForParameter(
    input.schema.parameterId,
    input.schema.titleRu,
  );
  const value = scalarValue(input.schema, input.revision.parameters[input.schema.parameterId]);
  const source = parameterSource({
    schema: input.schema,
    value,
    parentValue: input.parent?.parameters[input.schema.parameterId],
  });
  const choices = allowedValues(input.schema);
  const numericValidation = normalizedCanonicalNumericValidation({
    minimum: input.schema.constraints.min,
    maximum: input.schema.constraints.max,
    integer: input.schema.valueType === "integer",
  });
  const normative = input.schema.normativeLinks?.[0];
  const guide = input.schema.guide;
  const requiredLevel = input.schema.required ? "CONTRACT_REQUIRED" as const : "OPTIONAL" as const;
  return {
    parameterId: input.schema.parameterId,
    label: labelRu,
    description: input.schema.descriptionRu || guide?.guideShortRu || labelRu,
    value,
    valueType: input.schema.valueType === "decimal" || input.schema.valueType === "integer"
      ? "number"
      : input.schema.valueType === "boolean" ? "boolean" : "string",
    unit: input.schema.unitId,
    requiredLevel,
    visibilityCondition: { kind: "ALWAYS" },
    validation: {
      ...numericValidation,
      ...(["text", "enum", "array_object"].includes(input.schema.valueType) && input.schema.required
        ? { nonEmpty: true }
        : {}),
    },
    allowedValues: choices.map((choice) => {
      const guideChoice = guide?.guideOptions?.find((candidate) => String(candidate.value) === String(choice));
      return { value: scalarValue(input.schema, choice) ?? String(choice), label: guideChoice?.ruleRu || String(choice) };
    }),
    source,
    state: value == null ? (input.schema.required ? "BLOCKING_REQUIRED" : "NOT_APPLICABLE") : source === "CALCULATED" ? "DERIVED" : source === "ASSUMED" ? "ASSUMED" : "PROVIDED",
    confidence: value == null ? 0 : source === "ASSUMED" ? 0.7 : 1,
    assumption: source === "ASSUMED" ? "Предварительно принято из утверждённого baseline этой работы." : null,
    affectsRows: input.schema.resourceBranchConsumers ?? [],
    affectsFormula: input.schema.formulaConsumers ?? [],
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
      ? "Подтверждено пользователем в предыдущей версии."
      : guide?.guideShortRu || null,
    valid: value != null || !input.schema.required,
    validationIssues: value == null && input.schema.required ? ["VALUE_REQUIRED"] : [],
  };
}

export function buildConsumerCanonicalParameterSession(input: {
  catalog: CanonicalEstimateCatalogItem;
  revision: CanonicalEstimateRevisionView;
  parent?: CanonicalEstimateRevisionView | null;
  draftId: string;
}): CanonicalParameterSession {
  const parameters = input.catalog.parameterSchema
    .filter(isConsumerMeaningfulCanonicalParameter)
    .map((schema) => buildParameter({ schema, revision: input.revision, parent: input.parent ?? null }));
  const blockingMissingParameterIds = parameters
    .filter((parameter) => parameter.requiredLevel === "BLOCKING_REQUIRED" && parameter.value == null)
    .map((parameter) => parameter.parameterId);
  const contractMissingParameterIds = parameters
    .filter((parameter) => parameter.requiredLevel === "CONTRACT_REQUIRED" && parameter.value == null)
    .map((parameter) => parameter.parameterId);
  const assumptionParameterIds = parameters
    .filter((parameter) => parameter.source === "ASSUMED")
    .map((parameter) => parameter.parameterId);
  const invalidParameterIds = parameters
    .filter((parameter) => !parameter.valid)
    .map((parameter) => parameter.parameterId);
  const status = invalidParameterIds.length > 0
    ? "INVALID" as const
    : blockingMissingParameterIds.length > 0
      ? "BLOCKING_REQUIRED" as const
      : contractMissingParameterIds.length > 0 || assumptionParameterIds.length > 0
        ? "PRELIMINARY_WITH_ASSUMPTIONS" as const
        : "COMPLETE" as const;
  const fingerprint = estimateDeterministicHash({
    revisionId: input.revision.revisionId,
    checksum: input.revision.checksumSha256,
    parameters: parameters.map((parameter) => ({ id: parameter.parameterId, value: parameter.value, source: parameter.source })),
  });
  return {
    coreSchemaVersion: CANONICAL_PARAMETER_CORE_SCHEMA_VERSION,
    sessionId: `backend-session:${input.revision.revisionId}`,
    draftId: input.draftId,
    revisionId: input.revision.revisionId,
    schemaId: input.revision.parameterSchemaHash || `backend-schema:${input.catalog.catalogId}`,
    schemaVersion: `definition:${input.catalog.definitionVersion}`,
    workPassportId: input.catalog.catalogId,
    canonicalWorkKey: input.catalog.workKey,
    calculationVersion: input.revision.compilerVersion,
    status,
    parameters,
    blockingMissingParameterIds,
    contractMissingParameterIds,
    assumptionParameterIds,
    invalidParameterIds,
    fingerprint,
    createdAt: input.revision.createdAt,
    updatedAt: input.revision.createdAt,
  };
}

export async function loadConsumerCanonicalParameterSession(input: {
  revisionId: string;
  draftId: string;
}): Promise<CanonicalParameterSession> {
  const revision = await getCanonicalEstimateRevision(input.revisionId);
  const [catalog, parent] = await Promise.all([
    getCanonicalEstimateCatalogItem(revision.catalogId),
    revision.parentRevisionId ? getCanonicalEstimateRevision(revision.parentRevisionId) : Promise.resolve(null),
  ]);
  if (catalog.releaseId !== revision.releaseId) {
    throw new CanonicalEstimateApiError("Параметры не открыты: версия каталога не совпадает со сметой.", {
      code: "REVISION_RELEASE_MISMATCH",
      httpStatus: 409,
    });
  }
  return buildConsumerCanonicalParameterSession({ catalog, revision, parent, draftId: input.draftId });
}

export async function recalculateConsumerCanonicalEstimate(input: {
  revisionId: string;
  draftId: string;
  problemText: string;
  patches: ConsumerRepairDraftRevisionParamBatchPatch[];
}): Promise<{ mapping: ForemanAiEstimateDraftMapping; session: CanonicalParameterSession }> {
  const revision = await getCanonicalEstimateRevision(input.revisionId);
  const catalog = await getCanonicalEstimateCatalogItem(revision.catalogId);
  if (catalog.releaseId !== revision.releaseId) {
    throw new CanonicalEstimateApiError("Пересчёт остановлен: версия каталога не совпадает с родительской сметой.", {
      code: "REVISION_RELEASE_MISMATCH",
      httpStatus: 409,
    });
  }
  const rawInputs: Record<string, unknown> = { ...revision.parameters };
  for (const patch of input.patches) rawInputs[patch.paramKey] = patch.rawValue;
  const validation = validateCanonicalEstimateParameterInputs({ schema: catalog.parameterSchema, rawInputs });
  if (!validation.ok) {
    throw new CanonicalEstimateApiError(
      `Параметры не сохранены: ${validation.issues.map((issue) => `${issue.parameterId}:${issue.code}`).join(", ")}.`,
      { code: "INVALID_PARAMETER_INPUT", httpStatus: 400 },
    );
  }
  const parameters = validation.parameters as Record<string, CanonicalEstimateParameterInputValue>;
  const result = await recalculateCanonicalEstimateAndLoad({
    request: {
      idempotencyKey: `consumer-inline-recalc-${estimateDeterministicHash({ parent: revision.revisionId, parameters })}`,
      catalogId: revision.catalogId,
      parentRevisionId: revision.revisionId,
      parameters,
      currencyCode: revision.currencyCode,
      rowOverrides: revision.amendmentContract.rowOverrides,
      customRows: revision.amendmentContract.customRows,
    },
  });
  if (result.revision.parentRevisionId !== revision.revisionId) {
    throw new CanonicalEstimateApiError("Пересчёт остановлен: backend вернул неверную дочернюю версию.", {
      code: "CHILD_REVISION_IDENTITY_MISMATCH",
      httpStatus: 409,
    });
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
    throw new CanonicalEstimateApiError("Дочерняя версия не сохранена: нарушено соответствие строк backend.", {
      code: "CANONICAL_RECALC_PARITY_FAILED",
      httpStatus: 409,
    });
  }
  return {
    mapping,
    session: buildConsumerCanonicalParameterSession({
      catalog,
      revision: result.revision,
      parent: revision,
      draftId: input.draftId,
    }),
  };
}

export async function recalculateConsumerCanonicalCatalogSelection(input: {
  revisionId: string;
  problemText: string;
  rowId: string;
  catalogItem: CatalogItemPickerItem;
}): Promise<ForemanAiEstimateDraftMapping> {
  const revision = await getCanonicalEstimateRevision(input.revisionId);
  const [catalog, rows] = await Promise.all([
    getCanonicalEstimateCatalogItem(revision.catalogId),
    getAllCanonicalEstimateRevisionRows({ revisionId: revision.revisionId }),
  ]);
  if (catalog.releaseId !== revision.releaseId) {
    throw new CanonicalEstimateApiError("Товар не выбран: версия каталога не совпадает со сметой.", {
      code: "REVISION_RELEASE_MISMATCH",
      httpStatus: 409,
    });
  }
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
      provenance: {
        kind: "manual" as const,
        reason: `market_catalog:${input.catalogItem.catalogItemId}:${input.catalogItem.sourceId}`.slice(0, 500),
      },
    },
  };
  const parameterValidation = validateCanonicalEstimateParameterInputs({
    schema: catalog.parameterSchema,
    rawInputs: revision.parameters,
  });
  if (!parameterValidation.ok) {
    throw new CanonicalEstimateApiError("Товар не выбран: параметры родительской версии не прошли проверку.", {
      code: "PARENT_PARAMETER_CONTRACT_INVALID",
      httpStatus: 409,
    });
  }
  const result = await recalculateCanonicalEstimateAndLoad({
    request: {
      idempotencyKey: `consumer-line-catalog-${estimateDeterministicHash({
        parent: revision.revisionId,
        rowId: input.rowId,
        catalogItemId: input.catalogItem.catalogItemId,
        sourceId: input.catalogItem.sourceId,
        unitPrice,
      })}`,
      catalogId: revision.catalogId,
      parentRevisionId: revision.revisionId,
      parameters: parameterValidation.parameters,
      currencyCode: revision.currencyCode,
      rowOverrides,
      customRows: revision.amendmentContract.customRows,
    },
  });
  if (result.revision.parentRevisionId !== revision.revisionId) {
    throw new CanonicalEstimateApiError("Товар не выбран: backend вернул неверную дочернюю версию.", {
      code: "CHILD_REVISION_IDENTITY_MISMATCH",
      httpStatus: 409,
    });
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
  if (!parity.ok || mapping.payload.rows.length !== result.revision.rowCount) {
    throw new CanonicalEstimateApiError("Товар не выбран: нарушено соответствие строк дочерней версии.", {
      code: "CANONICAL_CATALOG_SELECTION_PARITY_FAILED",
      httpStatus: 409,
    });
  }
  return mapping;
}
