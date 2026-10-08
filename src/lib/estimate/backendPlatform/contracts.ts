import { canonicalEstimateOperationReference } from "./canonicalEstimateOperationComposition";
import { parseCanonicalPublicResourcePresentationV1 } from './canonicalPublicResourcePresentationV1';
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
  commandIntentV1?: { contractVersion: 'canonical-user-command-intent:v1'; key: string };
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

export function canonicalEstimateEffectivePriceSnapshotIds(input: {
  requested?: readonly string[] | null;
  compatibleDefaults?: readonly string[] | null;
}): string[] {
  const requested = (input.requested ?? [])
    .map((value) => String(value).trim())
    .filter(Boolean);
  if (requested.length > 0) return requested;
  return [...new Set((input.compatibleDefaults ?? [])
    .map((value) => String(value).trim())
    .filter(Boolean))].slice(0, 64);
}

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
  /** Null is an explicit return of a manual custom row to its unresolved quantity state. */
  quantity?: string | number | null;
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
  /** Null means the user selected the row but has not supplied an honest quantity yet. */
  quantity?: string | number | null;
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
  /** Exact tenant of the immutable revision; reused for every child command. */
  organizationId?: string | null;
  releaseId: string;
  catalogId: string;
  revisionNumber: number;
  status: "ready" | "failed" | "archived";
  currencyCode: string;
  /** Immutable price evidence selected for this compile; empty means no compatible source existed. */
  priceSnapshotIds?: string[];
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
  /** Definition-owned needs that are visible in a preliminary BOQ but are not payable rows. */
  preliminaryNeeds?: CanonicalEstimatePreliminaryNeedView[];
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
  /** Current external admission annotation; the saved revision is unchanged. */
  contentWithdrawalReasonRu?: string | null;
  createdAt: string;
};

export type CanonicalCommercialCostCoverageDecisionView = {
  contractVersion: 'canonical-commercial-cost-coverage/v1';
  scopeId: string;
  scopeRu: string;
  ownerRowId: string;
  ownerTitleRu: string;
  priceScope: 'LABOR_ONLY' | 'LABOR_AND_LISTED_RESOURCES';
  supplyParty: 'RATE_PROVIDER' | null;
};
export type CanonicalCommercialRateCoverageView = {
  contractVersion: 'canonical-commercial-cost-coverage/v1';
  active: true;
  scopeId: string;
  scopeRu: string;
  priceScope: 'LABOR_ONLY' | 'LABOR_AND_LISTED_RESOURCES';
};

export type CanonicalEstimatePreliminaryNeedView = {
  purchaseRequirement?: Record<string, unknown>;
  rowId: string;
  ordinal: number;
  section: string;
  category: string;
  titleRu: string;
  unitId: string;
  quantity: string | null;
  unitPrice: string | null;
  needState: "QUANTITY_REQUIRED" | "CONDITION_REQUIRED";
  missingParameterIds: string[];
  selected: boolean;
  procurementEligible: boolean;
  formulaId: string;
  costTreatment?: string | null;
  commercialCostCoverageDecision?: CanonicalCommercialCostCoverageDecisionView;
  commercialRateCoverage?: CanonicalCommercialRateCoverageView;
  publicResourcePresentation?: import('./canonicalPublicResourcePresentationV1').CanonicalPublicResourcePresentationV1;
  manualTitleOverride?: boolean;
  manualQuantityOverride?: boolean;
  calculatedQuantityBeforeOverride?: string | null;
  operation?: import("./canonicalEstimateOperationComposition").CanonicalEstimateOperationReference | null;
  /** Legacy/full evidence carries traces. Compact v1 transports reference them explicitly. */
  calculationTrace?: Record<string, unknown>;
  normativeTrace?: unknown[];
  evidenceStatus?: "referenced";
  evidenceReference?: CanonicalEstimatePreliminaryNeedEvidenceReference;
  needSha256: string;
};

export type CanonicalEstimatePreliminaryNeedEvidenceReference = {
  contractVersion: "canonical-preliminary-need-evidence/v1";
  revisionId: string;
  releaseId: string;
  definitionVersionId: string | null;
  checksumSha256: string;
  rowId: string;
  needSha256: string;
};

export type CanonicalEstimatePreliminaryNeedEvidence = {
  reference: CanonicalEstimatePreliminaryNeedEvidenceReference;
  /** Original immutable snake_case hash basis, including both full traces. */
  rawNeed: Record<string, unknown>;
};

export function canonicalEstimatePreliminaryNeedsFromAmendmentContract(
  amendmentContract: unknown,
): CanonicalEstimatePreliminaryNeedView[] {
  if (!amendmentContract || typeof amendmentContract !== "object" || Array.isArray(amendmentContract)) return [];
  const parameterSources = (amendmentContract as Record<string, unknown>).parameterSources;
  if (!parameterSources || typeof parameterSources !== "object" || Array.isArray(parameterSources)) return [];
  const rawNeeds = (parameterSources as Record<string, unknown>).preliminaryNeeds;
  if (!Array.isArray(rawNeeds)) return [];
  return rawNeeds.flatMap((raw): CanonicalEstimatePreliminaryNeedView[] => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
    const need = raw as Record<string, unknown>;
    const state = String(need.need_state ?? "");
    const rowId = String(need.row_id ?? "").trim();
    const needSha256 = String(need.need_sha256 ?? "").trim();
    if (!rowId || !/^[0-9a-f]{64}$/u.test(needSha256)
      || (state !== "QUANTITY_REQUIRED" && state !== "CONDITION_REQUIRED")) return [];
    const graph = (need.calculation_trace as Record<string, unknown> | undefined)?.resourceGraph as Record<string, unknown> | undefined;
    const publicResourcePresentation = parseCanonicalPublicResourcePresentationV1(graph?.publicResourcePresentationV1);
    const decision = graph?.commercialCostCoverageDecisionV1 as Record<string, unknown> | undefined;
    const rate = graph?.commercialCostCoverageOwnerDecisionV1 as Record<string, unknown> | undefined;
    const coverageIdentityValid = (value: Record<string, unknown> | undefined) => value?.contractVersion === 'canonical-commercial-cost-coverage/v1'
      && typeof value.scopeId === 'string' && typeof value.scopeRu === 'string'
      && (value.priceScope === 'LABOR_ONLY' || value.priceScope === 'LABOR_AND_LISTED_RESOURCES');
    const commercialCostCoverageDecision: CanonicalCommercialCostCoverageDecisionView | undefined = coverageIdentityValid(decision)
      && typeof decision?.ownerRowId === 'string' && typeof decision?.ownerTitleRu === 'string'
      ? { contractVersion: 'canonical-commercial-cost-coverage/v1', scopeId: String(decision.scopeId), scopeRu: String(decision.scopeRu),
        ownerRowId: decision.ownerRowId, ownerTitleRu: decision.ownerTitleRu,
        priceScope: decision.priceScope as CanonicalCommercialCostCoverageDecisionView['priceScope'],
        supplyParty: decision.supplyParty === 'RATE_PROVIDER' ? 'RATE_PROVIDER' : null } : undefined;
    const commercialRateCoverage: CanonicalCommercialRateCoverageView | undefined = coverageIdentityValid(rate) && rate?.active === true
      ? { contractVersion: 'canonical-commercial-cost-coverage/v1', active: true, scopeId: String(rate.scopeId), scopeRu: String(rate.scopeRu),
        priceScope: rate.priceScope as CanonicalCommercialRateCoverageView['priceScope'] } : undefined;
    return [{
      rowId,
      ordinal: Number(need.ordinal),
      section: String(need.section ?? ""),
      category: String(need.category ?? ""),
      titleRu: String(need.title_ru ?? ""),
      unitId: String(need.unit_id ?? ""),
      quantity: need.quantity == null ? null : String(need.quantity),
      unitPrice: need.unit_price == null ? null : String(need.unit_price),
      needState: state,
      missingParameterIds: Array.isArray(need.missing_parameter_ids)
        ? need.missing_parameter_ids.filter((value): value is string => typeof value === "string" && value.length > 0)
        : [],
      selected: need.selected !== false,
      procurementEligible: need.procurement_eligible === true,
      formulaId: String(need.formula_id ?? ""),
      operation: canonicalEstimateOperationReference(((need.calculation_trace as Record<string, unknown> | undefined)?.resourceGraph as Record<string, unknown> | undefined)?.operationCompositionV1),
      costTreatment: need.calculation_trace && typeof need.calculation_trace === "object"
        ? String(((need.calculation_trace as Record<string, unknown>).resourceGraph as Record<string, unknown> | undefined)?.costTreatment ?? "") || null : null,
      ...(commercialCostCoverageDecision ? { commercialCostCoverageDecision } : {}),
      ...(commercialRateCoverage ? { commercialRateCoverage } : {}),
      ...(publicResourcePresentation ? { publicResourcePresentation } : {}),
      ...((need.calculation_trace as Record<string, unknown> | undefined)?.manualTitleOverride === true ? { manualTitleOverride: true } : {}),
      manualQuantityOverride: (need.calculation_trace as Record<string, unknown> | undefined)?.manualQuantityOverride === true,
      calculatedQuantityBeforeOverride: (need.calculation_trace as Record<string, unknown> | undefined)?.calculatedQuantityBeforeOverride == null
        ? null : String((need.calculation_trace as Record<string, unknown>).calculatedQuantityBeforeOverride),
      calculationTrace: need.calculation_trace && typeof need.calculation_trace === "object" && !Array.isArray(need.calculation_trace)
        ? need.calculation_trace as Record<string, unknown>
        : {},
      normativeTrace: Array.isArray(need.normative_trace) ? need.normative_trace : [],
      needSha256,
    }];
  });
}

export type CanonicalEstimateParameterValueSourceRole =
  | "USER_INPUT"
  | "USER_MEASURED"
  // Persisted S27.23 passports use these legacy wire values. They retain
  // their measured-fact/profile ownership, including the existing norm guards.
  | "USER_OR_PROJECT_MEASURED"
  | "VISIBLE_NORMATIVE_OR_REPLACEABLE_PROFILE"
  | "PROJECT_SPECIFIC_INPUT"
  | "CONDITIONAL_PROJECT_FACT"
  | "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE"
  | "PROJECT_DOCUMENTATION"
  | "ENGINEERING_DESIGN"
  | "SITE_SURVEY"
  | "MANDATORY_NORM_VALUE"
  | "NORM_REQUIRED_BUT_PROJECT_SELECTED"
  | "MANUFACTURER_CONFIRMED"
  | "SELECTED_EQUIPMENT_PASSPORT"
  | "SOURCE_BACKED_PRELIMINARY_PROFILE"
  | "VISIBLE_PRELIMINARY_SCENARIO"
  | "VISIBLE_BASELINE_ASSUMPTION"
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
  /** Immutable price evidence saved with this exact revision row. */
  priceSource?: CanonicalEstimateRevisionRowPriceSource;
};

export type CanonicalEstimateRevisionRowPriceSource = {
  kind: "AUTOMATIC_SNAPSHOT" | "MANUAL" | "UNPRICED" | "LEGACY_UNKNOWN";
  snapshotId: string | null;
  routeId: string | null;
  priceKey: string | null;
  unitId: string;
  unitPrice: string | null;
  currencyCode: string | null;
  snapshotCapturedAt: string | null;
  routeSourceKind: "supplier" | "catalog" | "manual" | "normative" | "fallback" | null;
  resolutionTrace: Record<string, unknown>;
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

export type CanonicalEstimateResourceSearchItem = {
  resourceId: string;
  definitionVersionId: string;
  definitionReleaseId: string;
  sourceCatalogId: string | null;
  rowId: string;
  titleRu: string;
  rowType: "material" | "labor" | "equipment" | "service" | "waste";
  unitId: string;
  semanticOwnerId: string;
  procurementEligible: boolean;
  matchType: "EXACT" | "PREFIX" | "SUBSTRING";
};

export type CanonicalEstimateResourceSearchPage = {
  apiVersion: typeof ESTIMATE_PLATFORM_API_VERSION;
  definitionReleaseId: string;
  searchIndexReleaseId: string;
  normalizedQuery: string;
  resourceIndexContractVersion: "canonical-resource-search.r568.v1";
  totalCount: number;
  shownCount: number;
  items: CanonicalEstimateResourceSearchItem[];
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
  /** Read-only source hashes; a matching price owner never authorizes new row edits. */
  manualPriceMigrationBindings?: Record<string,string>;
  /** Exact resource/application evidence for retaining stored manual exclusions. */
  manualExclusionMigrationBindings?: Record<string,string>;
  contentAdmission?: AdmissionDecision;
  parameterSchema: Array<{
    parameterId: string;
    ordinal: number;
    valueType: "decimal" | "integer" | "boolean" | "enum" | "text" | "array_object";
    unitId: string | null;
    titleRu: string;
    required: boolean;
    /** Allows an immutable draft revision while required user/site inputs remain visibly incomplete. */
    preliminaryCompilationAllowed?: boolean;
    defaultValue: unknown;
    constraints: Record<string, unknown>;
    semanticParameterKey?: string;
    visibilityRole?: CanonicalEstimateParameterVisibilityRole;
    descriptionRu?: string;
    requiredWhen?: string | Record<string, unknown>;
    visibleWhen?: string | Record<string, unknown>;
    allowedRangeOrOptions?: unknown;
    defaultPolicy?: string;
    valueSourceRole?: CanonicalEstimateParameterValueSourceRole;
    /** Classification of an automatically supplied runtime profile value. */
    runtimeProfileClassification?: string;
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
        || (row.quantity != null && !isNonNegativeNumber(row.quantity))
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
