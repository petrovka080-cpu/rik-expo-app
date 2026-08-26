import type { AdmissionDecision } from "./estimateAdmissionR3";

export const ESTIMATE_PLATFORM_API_VERSION = "2026-08-14.r2" as const;

export type EstimateJobStatus =
  | "queued"
  | "running"
  | "retry_wait"
  | "succeeded"
  | "failed"
  | "cancelled";

export type EstimateArtifactKind = "pdf" | "professional_pdf" | "procurement" | "xlsx" | "archive";

export type CanonicalEstimateCompositeItem = {
  itemId: string;
  position: number;
  version: number;
  values: Record<string, string | number | boolean>;
};

export type CanonicalEstimateParameterInputValue =
  | string
  | number
  | boolean
  | CanonicalEstimateCompositeItem[];

export type CanonicalEstimateCreateRequest = {
  idempotencyKey: string;
  catalogId: string;
  organizationId?: string | null;
  /** Exact user-authored request. Required by the R6 consumer compile path. */
  sourceRequestText?: string;
  /** Canonical parameter that owns the request's primary displayed measure. */
  primaryMeasureParameterId?: string;
  parameters: Record<string, CanonicalEstimateParameterInputValue>;
  currencyCode: string;
  priceSnapshotIds?: string[];
};

export type CanonicalEstimateRecalculateRequest = CanonicalEstimateCreateRequest & {
  parentRevisionId: string;
  releaseMigration?: {
    contractVersion: "canonical_revision_release_migration.r2";
    acknowledged: true;
    fromReleaseId: string;
    toReleaseId: string;
  };
  rowOverrides?: Record<string, CanonicalEstimateRowOverride>;
  customRows?: CanonicalEstimateCustomRow[];
};

export type CanonicalEstimateManualProvenance = {
  kind: "manual";
  reason?: string | null;
};

export type CanonicalEstimateRowOverride = {
  titleRu?: string;
  quantity?: string | number;
  unitPrice?: string | number | null;
  includedInEstimate?: boolean;
  includedInProcurement?: boolean;
  provenance: CanonicalEstimateManualProvenance;
};

export type CanonicalEstimateCustomRow = {
  clientRowId: string;
  section: string;
  category: string;
  titleRu: string;
  unitId: string;
  quantity: string | number;
  unitPrice?: string | number | null;
  includedInEstimate: boolean;
  includedInProcurement: boolean;
  provenance: CanonicalEstimateManualProvenance;
};

export type CanonicalEstimateJobAccepted = {
  apiVersion: typeof ESTIMATE_PLATFORM_API_VERSION;
  jobId: string;
  status: EstimateJobStatus;
  created: boolean;
  pollAfterMs: number;
};

export type CanonicalEstimateLegacyRow = {
  rowId: string;
  section: string;
  category: string;
  titleRu: string;
  unitId: string;
  quantity: string | number | null;
  unitPrice?: string | number | null;
  amount?: string | number | null;
  procurementEligible: boolean;
  calculationTrace?: Record<string, unknown>;
  normativeTrace?: unknown[];
  sourcePayload: Record<string, unknown>;
};

export type CanonicalEstimateLegacyRevisionRequest = {
  idempotencyKey: string;
  sourceEstimateId: string;
  sourceRevisionId: string;
  catalogId: string;
  organizationId?: string | null;
  parentCanonicalRevisionId?: string | null;
  currencyCode: string;
  parameters: Record<string, unknown>;
  totals: Record<string, unknown>;
  rows: CanonicalEstimateLegacyRow[];
};

export type CanonicalEstimateArtifactView = {
  apiVersion: typeof ESTIMATE_PLATFORM_API_VERSION;
  artifactId: string;
  revisionId: string;
  releaseId: string;
  kind: "pdf" | "professional_pdf" | "procurement";
  status: "queued" | "building" | "ready" | "failed" | "expired";
  contentType: string | null;
  byteSize: number | null;
  sha256: string | null;
  metadata: Record<string, unknown>;
  contentAdmission?: AdmissionDecision;
  errorCode: string | null;
  createdAt: string;
  updatedAt: string;
  readyAt: string | null;
  signedUrl: string | null;
  signedUrlExpiresAt: string | null;
};

export type CanonicalEstimatePhotoAttachmentStatus = "committed" | "deleted";

export type CanonicalEstimatePhotoUploadIntent = {
  apiVersion: typeof ESTIMATE_PLATFORM_API_VERSION;
  uploadId: string;
  attachmentId: string;
  status: "staged" | "committed" | "rejected" | "deleted";
  storageBucket: "private-media";
  storageObjectKey: string;
  uploadUrl: string | null;
  uploadToken: string | null;
  expiresAt: string;
  created: boolean;
};

export type CanonicalEstimatePhotoAttachmentView = {
  attachmentId: string;
  attachmentEventId: string;
  tenantId: string;
  ownerUserId: string;
  requestId: string;
  catalogId: string;
  rowId: string;
  parentRevisionId: string;
  childRevisionId: string | null;
  storageBucket: "private-media";
  storageObjectKey: string;
  contentSha256: string;
  mimeType: "image/jpeg" | "image/png";
  sizeBytes: number;
  status: CanonicalEstimatePhotoAttachmentStatus;
  createdAt: string;
  createdBy: string;
  signedUrl: string | null;
  signedUrlExpiresAt: string | null;
};

export type CanonicalEstimateJobView = {
  apiVersion: typeof ESTIMATE_PLATFORM_API_VERSION;
  jobId: string;
  operation: "compile" | "recalculate" | "pdf" | "professional_pdf" | "procurement" | "legacy_revision_migration";
  status: EstimateJobStatus;
  stage: string;
  progress: number;
  attempt: number;
  resultRevisionId: string | null;
  errorCode: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CanonicalEstimateRevisionView = {
  apiVersion: typeof ESTIMATE_PLATFORM_API_VERSION;
  revisionId: string;
  parentRevisionId: string | null;
  releaseId: string;
  catalogId: string;
  revisionNumber: number;
  status: "ready" | "failed" | "archived";
  currencyCode: string;
  parameters: Record<string, unknown>;
  /** Immutable R6 request identity. Null only for revisions created before R6. */
  sourceRequestText?: string | null;
  sourceRequestHash?: string | null;
  canonicalWorkTitleRu?: string | null;
  displayTitleRu?: string | null;
  primaryMeasureParameterId?: string | null;
  primaryMeasureValue?: string | null;
  primaryMeasureUnitId?: string | null;
  normalizedIntent?: Record<string, unknown> | null;
  definitionVersionId?: string | null;
  groupId?: string | null;
  searchReleaseId?: string | null;
  userInputSnapshot?: Record<string, unknown> | null;
  acceptedBaselineSnapshot?: Record<string, unknown> | null;
  assumptionSnapshot?: Record<string, unknown> | null;
  formulaGraphVersion?: string | null;
  revisionContractVersion?: string | null;
  amendmentContract: {
    rowOverrides: Record<string, CanonicalEstimateRowOverride>;
    customRows: CanonicalEstimateCustomRow[];
    releaseMigration: CanonicalEstimateRecalculateRequest["releaseMigration"] | null;
  };
  totals: Record<string, unknown>;
  rowCount: number;
  checksumSha256: string;
  compilerVersion: string;
  /** Immutable backend truth lineage. Legacy R1 revisions can omit these fields. */
  definitionVersion?: number | null;
  compilerOwner?: "backend" | null;
  parameterSchemaHash?: string | null;
  inputHash?: string | null;
  outputHash?: string | null;
  contentAdmission?: AdmissionDecision;
  legacyWarningRu?: string | null;
  createdAt: string;
};

export type CanonicalEstimateParameterValueSourceRole =
  | "USER_MEASURED"
  | "PROJECT_DOCUMENTATION"
  | "ENGINEERING_DESIGN"
  | "SITE_SURVEY"
  | "MANDATORY_NORM_VALUE"
  | "NORM_REQUIRED_BUT_PROJECT_SELECTED"
  | "MANUFACTURER_CONFIRMED"
  | "BACKEND_DERIVED"
  | "PRICE_INPUT";

export type CanonicalEstimateParameterVisibilityRole =
  | "USER_INPUT"
  | "USER_DERIVED_READONLY"
  | "INTERNAL_ONLY";

export type CanonicalEstimateParameterGuideKind =
  | "MANDATORY_NORM_VALUE"
  | "NORMATIVE_RANGE"
  | "PROJECT_DEFINED"
  | "MANUFACTURER_RANGE"
  | "MEASUREMENT_RULE"
  | "ENUM_DECISION_RULE"
  | "DERIVED_VALUE_RULE"
  | "PRACTICE_REFERENCE"
  | "NO_NUMERIC_NORM";

export type CanonicalEstimateParameterGuide = {
  guideKind: CanonicalEstimateParameterGuideKind;
  guideShortRu: string;
  guideMin?: string | number | null;
  guideMax?: string | number | null;
  guideTarget?: string | number | null;
  minInclusive?: boolean | null;
  maxInclusive?: boolean | null;
  guideOptions?: Array<{ value: string; ruleRu: string }>;
  canonicalUnit?: string | null;
  displayUnit?: string | null;
  guideBasis?: string | null;
  precision?: number | null;
  step?: string | number | null;
  guideCondition?: string | null;
  guideValidationPolicy: "MANDATORY_BLOCK" | "ADVISORY_REASON_REQUIRED" | "PROVENANCE_REQUIRED" | "INFORMATION_ONLY";
  sourceRole: CanonicalEstimateParameterValueSourceRole;
  sourceDocument?: string | null;
  sourceEditionStatus?: string | null;
  sourceLocator?: string | null;
  guideVersion: string;
  sourceSnapshotHash: string;
  applicability: string;
  exclusions?: string[];
  verifiedAt: string;
};

export type CanonicalEstimateCompositeSubfield = {
  subfieldId: string;
  labelRu: string;
  valueType: "decimal" | "integer" | "boolean" | "enum" | "text";
  unitId: string | null;
  required: boolean;
  constraints: Record<string, unknown>;
  guide: CanonicalEstimateParameterGuide;
  formulaConsumers: string[];
  resourceBranchConsumers: string[];
};

export type CanonicalEstimateCompositeItemSchema = {
  itemLabelRu: string;
  minimumItems?: number;
  maximumItems?: number;
  reorderable: boolean;
  subfields: CanonicalEstimateCompositeSubfield[];
};

export type CanonicalEstimateParameterNormativeLink = {
  sourceId: string;
  documentTitleRu: string;
  editionStatus: string;
  locator: string;
  applicabilityRu: string;
  verifiedAt: string;
  verifiedSource: string;
};

export type CanonicalEstimateRevisionRowView = {
  rowId: string;
  ordinal: number;
  section: string;
  category: string;
  titleRu: string;
  unitId: string;
  quantity: string | null;
  unitPrice: string | null;
  amount: string | null;
  currencyCode: string | null;
  procurementEligible: boolean;
  includedInEstimate: boolean;
  includedInProcurement: boolean;
  ownershipStatus:
    | "OWNED"
    | "OWNED_EXCLUDED"
    | "MANUAL_SERVER_OWNED"
    | "MIGRATED_UNOWNED_EXCLUDED_FROM_TOTAL";
  calculationTrace: Record<string, unknown>;
  normativeTrace: unknown[];
  rowSha256: string;
};

export type CanonicalEstimateRevisionHistoryPage = {
  apiVersion: typeof ESTIMATE_PLATFORM_API_VERSION;
  revisions: CanonicalEstimateRevisionView[];
  nextCursor: string | null;
};

export type CanonicalEstimateRevisionRowsPage = {
  apiVersion: typeof ESTIMATE_PLATFORM_API_VERSION;
  revisionId: string;
  contentAdmission?: AdmissionDecision;
  rows: CanonicalEstimateRevisionRowView[];
  nextCursor: string | null;
};

export type CanonicalEstimateSearchPublicationState =
  | "ADMITTED_BACKEND"
  | "PRELIMINARY_NOT_CANONICAL"
  | "RETIRED";

export type CanonicalEstimateSearchMatchType =
  | "T1_EXACT"
  | "T2_EXACT_ALIAS"
  | "T3_CANONICAL_PREFIX"
  | "T4_TOKEN_PREFIX"
  | "T5_NORMALIZED_SUBSTRING"
  | "T6_TYPO_TRANSLITERATION_SUGGESTION";

export type CanonicalEstimateSearchItem = {
  catalogId: string;
  definitionVersionId: string | null;
  definitionReleaseId: string | null;
  canonicalNameRu: string;
  groupId: string;
  groupNameRu: string;
  domainId: string;
  systemId: string;
  subsystemId: string;
  assemblyId: string;
  workFamilyId: string;
  elementType: string;
  operationKind: string;
  technologyVariant: string;
  primaryUom: string;
  publicationState: CanonicalEstimateSearchPublicationState;
  catalogOrigin: "GLOBAL" | "EXTERNAL_D" | "EXTERNAL_N";
  adjudicationClass: "EFFECTIVE_WORK" | "ALIAS" | "DUPLICATE" | "EXTERNAL_REFERENCE";
  estimateReady: boolean;
  contentAdmission?: AdmissionDecision | null;
  shortScopeRu: string;
  keyDistinguishingParameters: unknown[];
  requiredInputsCount: number;
  clarificationFields: unknown[];
  includedBoundaries: unknown[];
  excludedBoundaries: unknown[];
  replacementCatalogId: string | null;
  matchTier: 1 | 2 | 3 | 4 | 5 | 6;
  matchType: CanonicalEstimateSearchMatchType;
  matchedTerm: string;
  matchedField: string;
  rankingReasonRu: string;
  selectableMode: "PROFESSIONAL" | "PRELIMINARY" | "NONE";
  nonselectableReasonRu: string | null;
};

export type CanonicalEstimateSearchPage = {
  apiVersion: typeof ESTIMATE_PLATFORM_API_VERSION;
  searchIndexReleaseId: string;
  searchIndexSnapshotSha256: string;
  taxonomyVersion: string;
  groupRelationVersion: string;
  rankingContractVersion: string;
  resultSetSha256: string;
  rawQuery: string;
  normalizedQuery: string;
  searchText: string;
  searchMode: "ANY" | "ALL" | "PHRASE";
  searchTokens: string[];
  parsedQuantity: number | null;
  parsedUnit: string | null;
  filters: Record<string, string>;
  scope: "WORKS" | "REFERENCES";
  resultLevel: "LITERAL" | "FUZZY";
  literalTotalCount: number;
  inventoryLiteralTotalCount: number | null;
  globalLiteralTotalCount: number;
  externalLiteralTotalCount: number;
  groupTotalCount: number;
  fuzzyTotalCount: number;
  suggestionTotalCount: number;
  shownCount: number;
  items: CanonicalEstimateSearchItem[];
  nextCursor: string | null;
  durationMs: number;
};

export type CanonicalEstimateSearchGroupPage = {
  apiVersion: typeof ESTIMATE_PLATFORM_API_VERSION;
  searchIndexReleaseId: string;
  searchIndexSnapshotSha256: string;
  taxonomyVersion: string;
  groupRelationVersion: string;
  groupId: string;
  groupNameRu: string;
  totalCount: number;
  shownCount: number;
  items: Array<Pick<CanonicalEstimateSearchItem,
    "catalogId" | "canonicalNameRu" | "publicationState" | "catalogOrigin" | "operationKind" | "technologyVariant"
    | "estimateReady" | "contentAdmission">>;
  nextCursor: string | null;
};

export type CanonicalEstimateTypedRelation = {
  sourceCatalogId: string;
  targetCatalogId: string;
  targetCanonicalNameRu: string;
  relationshipType: string;
  direction: "OUTBOUND" | "INBOUND" | "BIDIRECTIONAL";
  sourceLocator: string;
  applicabilityPredicate: Record<string, unknown>;
  requiredWhen: Record<string, unknown>;
  mutuallyExclusiveWith: string[];
  explanationRu: string;
  relationSha256: string;
};

export type CanonicalEstimateDraftView = {
  draftId: string;
  status: "SEARCHING" | "DRAFT_INPUT_REQUIRED" | "READY_TO_COMPILE" | "COMPILED" | "ARCHIVED" | "DELETED";
  title: string;
  originalQuery: string;
  normalizedQuery: string;
  searchIndexReleaseId: string | null;
  taxonomyVersion: string | null;
  groupRelationVersion: string | null;
  searchResultSetHash: string | null;
  candidateSetHash: string | null;
  selectedResultHash: string | null;
  selectedCatalogIds: string[];
  selectedWorkOrder: string[];
  parameterSchemaVersions: Record<string, unknown>;
  typedInputs: Record<string, unknown>;
  unresolvedRequiredParameters: unknown[];
  conflicts: unknown[];
  latestRevisionId: string | null;
  optimisticVersion: number;
  lastDeviceId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CanonicalEstimateCatalogItem = {
  catalogId: string;
  releaseId: string;
  namespace: "global" | "external_reference";
  domain: string;
  workKey: string;
  titleRu: string;
  definitionVersion: number;
  applicability: Record<string, unknown>;
  professionalMetadata: Record<string, unknown>;
  contentAdmission?: AdmissionDecision;
  parameterSchema: Array<{
    parameterId: string;
    ordinal: number;
    valueType: "decimal" | "integer" | "boolean" | "enum" | "text" | "array_object";
    unitId: string | null;
    titleRu: string;
    required: boolean;
    defaultValue: unknown;
    constraints: Record<string, unknown>;
    semanticParameterKey?: string;
    visibilityRole?: CanonicalEstimateParameterVisibilityRole;
    descriptionRu?: string;
    requiredWhen?: string;
    visibleWhen?: string;
    allowedRangeOrOptions?: unknown;
    defaultPolicy?: string;
    valueSourceRole?: CanonicalEstimateParameterValueSourceRole;
    guide?: CanonicalEstimateParameterGuide;
    compositeItemSchema?: CanonicalEstimateCompositeItemSchema;
    sharedInputBindingPolicy?: Record<string, unknown>;
    derivedFrom?: string[];
    normativeLinks?: CanonicalEstimateParameterNormativeLink[];
    formulaConsumers?: string[];
    resourceBranchConsumers?: string[];
    validationRules?: string[];
    conflictsWith?: string[];
    provenance?: Record<string, unknown>;
  }>;
};

export class CanonicalEstimateApiError extends Error {
  readonly code: string;
  readonly httpStatus: number;
  readonly retryable: boolean;

  constructor(message: string, options: { code: string; httpStatus: number; retryable?: boolean }) {
    super(message);
    this.name = "CanonicalEstimateApiError";
    this.code = options.code;
    this.httpStatus = options.httpStatus;
    this.retryable = options.retryable ?? false;
  }
}

export function assertUuid(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new CanonicalEstimateApiError(`${field} must be a UUID`, {
      code: "INVALID_ARGUMENT",
      httpStatus: 400,
    });
  }
}

export function assertCreateRequest(value: unknown): asserts value is CanonicalEstimateCreateRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CanonicalEstimateApiError("request body must be an object", {
      code: "INVALID_ARGUMENT",
      httpStatus: 400,
    });
  }
  const request = value as Partial<CanonicalEstimateCreateRequest>;
  if (typeof request.idempotencyKey !== "string" || !request.idempotencyKey.trim() || request.idempotencyKey.length > 200) {
    throw new CanonicalEstimateApiError("idempotencyKey is required and must not exceed 200 characters", {
      code: "INVALID_ARGUMENT",
      httpStatus: 400,
    });
  }
  if (typeof request.catalogId !== "string" || !request.catalogId.trim() || request.catalogId.length > 240) {
    throw new CanonicalEstimateApiError("catalogId is required", {
      code: "INVALID_ARGUMENT",
      httpStatus: 400,
    });
  }
  if (request.sourceRequestText != null && (
    typeof request.sourceRequestText !== "string"
    || !request.sourceRequestText.trim()
    || request.sourceRequestText.trim().length > 4_000
  )) {
    throw new CanonicalEstimateApiError("sourceRequestText must contain the exact user request", {
      code: "INVALID_ARGUMENT",
      httpStatus: 400,
    });
  }
  if (request.primaryMeasureParameterId != null && (
    typeof request.primaryMeasureParameterId !== "string"
    || !/^[A-Za-z][A-Za-z0-9_.:-]{0,199}$/.test(request.primaryMeasureParameterId.trim())
  )) {
    throw new CanonicalEstimateApiError("primaryMeasureParameterId is invalid", {
      code: "INVALID_ARGUMENT",
      httpStatus: 400,
    });
  }
  if (!request.parameters || typeof request.parameters !== "object" || Array.isArray(request.parameters)) {
    throw new CanonicalEstimateApiError("parameters must be an object", {
      code: "INVALID_ARGUMENT",
      httpStatus: 400,
    });
  }
  if (typeof request.currencyCode !== "string" || !/^[A-Z]{3}$/.test(request.currencyCode)) {
    throw new CanonicalEstimateApiError("currencyCode must be an ISO-4217 code", {
      code: "INVALID_ARGUMENT",
      httpStatus: 400,
    });
  }
  if (request.organizationId != null) assertUuid(request.organizationId, "organizationId");
  if (request.priceSnapshotIds != null) {
    if (!Array.isArray(request.priceSnapshotIds) || request.priceSnapshotIds.length > 64) {
      throw new CanonicalEstimateApiError("priceSnapshotIds must be an array with no more than 64 entries", {
        code: "INVALID_ARGUMENT",
        httpStatus: 400,
      });
    }
    request.priceSnapshotIds.forEach((entry, index) => assertUuid(entry, `priceSnapshotIds[${index}]`));
  }
  validateRowAmendments(request as Partial<CanonicalEstimateRecalculateRequest>);
}

function isNonNegativeNumber(value: unknown): boolean {
  return (typeof value === "string" || typeof value === "number")
    && /^\+?\d+(?:\.\d+)?$/.test(String(value).trim())
    && Number.isFinite(Number(value));
}

function assertManualProvenance(value: unknown, field: string): void {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || (value as { kind?: unknown }).kind !== "manual") {
    throw new CanonicalEstimateApiError(`${field}.provenance must declare manual ownership`, {
      code: "INVALID_ARGUMENT",
      httpStatus: 400,
    });
  }
  const reason = (value as { reason?: unknown }).reason;
  if (reason != null && (typeof reason !== "string" || reason.trim().length > 500)) {
    throw new CanonicalEstimateApiError(`${field}.provenance.reason is invalid`, {
      code: "INVALID_ARGUMENT",
      httpStatus: 400,
    });
  }
}

function validateRowAmendments(request: Partial<CanonicalEstimateRecalculateRequest>): void {
  if (request.releaseMigration != null) {
    const migration = request.releaseMigration;
    if (!migration || typeof migration !== "object" || Array.isArray(migration)
      || Object.keys(migration).some((key) => !new Set(["contractVersion", "acknowledged", "fromReleaseId", "toReleaseId"]).has(key))
      || migration.contractVersion !== "canonical_revision_release_migration.r2"
      || migration.acknowledged !== true) {
      throw new CanonicalEstimateApiError("releaseMigration contract is invalid", { code: "INVALID_ARGUMENT", httpStatus: 400 });
    }
    assertUuid(migration.fromReleaseId, "releaseMigration.fromReleaseId");
    assertUuid(migration.toReleaseId, "releaseMigration.toReleaseId");
    if (migration.fromReleaseId === migration.toReleaseId) {
      throw new CanonicalEstimateApiError("releaseMigration must change the definition release", { code: "INVALID_ARGUMENT", httpStatus: 400 });
    }
  }
  if (request.rowOverrides != null) {
    if (!request.rowOverrides || typeof request.rowOverrides !== "object" || Array.isArray(request.rowOverrides)
      || Object.keys(request.rowOverrides).length > 2_000) {
      throw new CanonicalEstimateApiError("rowOverrides must be an object with no more than 2000 rows", {
        code: "INVALID_ARGUMENT",
        httpStatus: 400,
      });
    }
    for (const [rowId, raw] of Object.entries(request.rowOverrides)) {
      if (!rowId.trim() || rowId.length > 240 || !raw || typeof raw !== "object" || Array.isArray(raw)) {
        throw new CanonicalEstimateApiError("row override identity is invalid", { code: "INVALID_ARGUMENT", httpStatus: 400 });
      }
      const override = raw as CanonicalEstimateRowOverride;
      const allowed = new Set(["titleRu", "quantity", "unitPrice", "includedInEstimate", "includedInProcurement", "provenance"]);
      if (Object.keys(override).some((key) => !allowed.has(key))) {
        throw new CanonicalEstimateApiError(`rowOverrides.${rowId} contains an unsupported field`, { code: "INVALID_ARGUMENT", httpStatus: 400 });
      }
      if (override.titleRu != null && (typeof override.titleRu !== "string" || override.titleRu.trim().length < 1 || override.titleRu.trim().length > 2_000)) {
        throw new CanonicalEstimateApiError(`rowOverrides.${rowId}.titleRu is invalid`, { code: "INVALID_ARGUMENT", httpStatus: 400 });
      }
      if (override.quantity != null && !isNonNegativeNumber(override.quantity)) {
        throw new CanonicalEstimateApiError(`rowOverrides.${rowId}.quantity is invalid`, { code: "INVALID_ARGUMENT", httpStatus: 400 });
      }
      if (override.unitPrice != null && !isNonNegativeNumber(override.unitPrice)) {
        throw new CanonicalEstimateApiError(`rowOverrides.${rowId}.unitPrice is invalid`, { code: "INVALID_ARGUMENT", httpStatus: 400 });
      }
      if (override.includedInEstimate != null && typeof override.includedInEstimate !== "boolean") {
        throw new CanonicalEstimateApiError(`rowOverrides.${rowId}.includedInEstimate is invalid`, { code: "INVALID_ARGUMENT", httpStatus: 400 });
      }
      if (override.includedInProcurement != null && typeof override.includedInProcurement !== "boolean") {
        throw new CanonicalEstimateApiError(`rowOverrides.${rowId}.includedInProcurement is invalid`, { code: "INVALID_ARGUMENT", httpStatus: 400 });
      }
      assertManualProvenance(override.provenance, `rowOverrides.${rowId}`);
    }
  }
  if (request.customRows != null) {
    if (!Array.isArray(request.customRows) || request.customRows.length > 200) {
      throw new CanonicalEstimateApiError("customRows must contain no more than 200 rows", { code: "INVALID_ARGUMENT", httpStatus: 400 });
    }
    const ids = new Set<string>();
    request.customRows.forEach((row, index) => {
      if (!row || typeof row !== "object" || Array.isArray(row)) {
        throw new CanonicalEstimateApiError(`customRows.${index} is invalid`, { code: "INVALID_ARGUMENT", httpStatus: 400 });
      }
      const allowed = new Set(["clientRowId", "section", "category", "titleRu", "unitId", "quantity", "unitPrice", "includedInEstimate", "includedInProcurement", "provenance"]);
      if (Object.keys(row).some((key) => !allowed.has(key))
        || typeof row.clientRowId !== "string" || !/^[A-Za-z0-9._:-]{1,200}$/.test(row.clientRowId)
        || ids.has(row.clientRowId)
        || typeof row.section !== "string" || !row.section.trim() || row.section.trim().length > 240
        || typeof row.category !== "string" || !row.category.trim() || row.category.trim().length > 240
        || typeof row.titleRu !== "string" || !row.titleRu.trim() || row.titleRu.trim().length > 2_000
        || typeof row.unitId !== "string" || !row.unitId.trim() || row.unitId.trim().length > 120
        || !isNonNegativeNumber(row.quantity)
        || (row.unitPrice != null && !isNonNegativeNumber(row.unitPrice))
        || typeof row.includedInEstimate !== "boolean"
        || typeof row.includedInProcurement !== "boolean"
        || (row.includedInProcurement && !row.includedInEstimate)) {
        throw new CanonicalEstimateApiError(`customRows.${index} is invalid`, { code: "INVALID_ARGUMENT", httpStatus: 400 });
      }
      ids.add(row.clientRowId);
      assertManualProvenance(row.provenance, `customRows.${index}`);
    });
  }
}
