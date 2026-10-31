import type {CanonicalEstimateOperationResourceAcceptanceV1} from './canonicalEstimateOperationComposition';
import { assertCanonicalPurchaseSupplyRowV1 } from "./canonicalPurchaseSupplyReadinessV1";
import {readRoofStageRestorationV6} from './canonicalRoofScreed25MigrationV1';
import {readRoofStageRestorationV5} from './canonicalRoofHangingGuttersMigrationV1';
import {
  ESTIMATE_PLATFORM_API_VERSION,
  type CanonicalEstimateRevisionRowPriceSource,
  type CanonicalEstimateRevisionRowView,
  type CanonicalEstimateRevisionView,
} from "./contracts";
import type { AdmissionDecision } from "./estimateAdmissionR3";
import { projectCanonicalEstimatePreliminaryNeedTransport } from "./canonicalEstimatePreliminaryNeedTransport";
import {readRoofPrimerPrerequisiteDecisionV1} from './canonicalRoofPrimerPrerequisiteV1';
import {parseCanonicalCompositionSelectionV1} from './canonicalEstimateCompositionSelectionV1';
import {readRoofPreparationMigrationProofV1} from './canonicalRoofPreparationMigrationV1';
import {readRoofStageRestorationV1} from './canonicalRoofValleyMigrationV1';
import {readRoofStageRestorationV2} from './canonicalRoofScreedMigrationV1';
import {readRoofStageRestorationV3} from './canonicalRoofMetalTrimMigrationV1';
import {readRoofStageRestorationV4} from './canonicalRoofLowerLayersMigrationV1';

type StorageRecord = Record<string, unknown>;

export class CanonicalEstimateRevisionReadContractError extends Error {
  readonly code = "REVISION_READ_CONTRACT_INVALID";

  constructor(message: string) {
    super(message);
    this.name = "CanonicalEstimateRevisionReadContractError";
  }
}

function record(value: unknown): StorageRecord {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? value as StorageRecord
    : {};
}

function nullableText(value: unknown): string | null {
  return value == null ? null : String(value);
}

function requiredPriceSnapshotIds(row: StorageRecord): string[] {
  if (!Object.prototype.hasOwnProperty.call(row, "price_snapshot_ids")) {
    throw new CanonicalEstimateRevisionReadContractError(
      "full revision storage projection omitted price_snapshot_ids",
    );
  }
  if (!Array.isArray(row.price_snapshot_ids)
    || row.price_snapshot_ids.some((value) => typeof value !== "string" || value.length === 0)) {
    throw new CanonicalEstimateRevisionReadContractError(
      "full revision storage projection returned invalid price_snapshot_ids",
    );
  }
  return [...row.price_snapshot_ids] as string[];
}

export function canonicalEstimateRevisionDetailFromStorage(
  row: StorageRecord,
  environment: {
    issuancePurpose?: 'PRELIMINARY_REVIEW';
    contentAdmission?: AdmissionDecision;
    operationResourceAcceptanceV1?: CanonicalEstimateOperationResourceAcceptanceV1;
    manualPreliminaryReviewEligibilityV1?:import('./contracts').CanonicalManualPreliminaryReviewEligibilityV1;
    professionalPdfReviewEligibilityV1?:import('./contracts').CanonicalProfessionalPdfReviewEligibilityV1;
    legacyWarningRu?: string | null;
    principalOrganizationId?: string | null;
  } = {},
): CanonicalEstimateRevisionView {
  const eligibility=environment.manualPreliminaryReviewEligibilityV1;
  if(eligibility!==undefined&&(eligibility.contractVersion!=='canonical-manual-preliminary-review-eligibility/v1'
    ||typeof eligibility.eligible!=='boolean'||eligibility.status!==(eligibility.eligible?'ELIGIBLE':'BLOCKED')
    ||eligibility.revisionId!==String(row.id??'')||eligibility.releaseId!==String(row.release_id??'')
    ||eligibility.definitionVersionId!==String(row.definition_version_id??'')||eligibility.checksumSha256!==String(row.checksum_sha256??'')
    ||!Number.isSafeInteger(eligibility.unknownQuantityCount)||eligibility.unknownQuantityCount<0
    ||!/^[a-f0-9]{64}$/u.test(eligibility.auditSha256)||typeof eligibility.reasonRu!=='string'||!eligibility.reasonRu))
    throw new CanonicalEstimateRevisionReadContractError('server preliminary review eligibility identity is invalid');
  const pdfEligibility=environment.professionalPdfReviewEligibilityV1;
  if(pdfEligibility!==undefined&&(pdfEligibility.contractVersion!=='canonical-professional-pdf-review-eligibility/v1'
    ||typeof pdfEligibility.eligible!=='boolean'||pdfEligibility.status!==(pdfEligibility.eligible?'ELIGIBLE':'BLOCKED')
    ||pdfEligibility.revisionId!==String(row.id??'')||pdfEligibility.releaseId!==String(row.release_id??'')
    ||pdfEligibility.definitionVersionId!==String(row.definition_version_id??'')||pdfEligibility.checksumSha256!==String(row.checksum_sha256??'')
    ||!Number.isSafeInteger(pdfEligibility.unknownQuantityCount)||pdfEligibility.unknownQuantityCount<0
    ||!/^[a-f0-9]{64}$/u.test(pdfEligibility.auditSha256)||typeof pdfEligibility.reasonRu!=='string'||!pdfEligibility.reasonRu))
    throw new CanonicalEstimateRevisionReadContractError('server PDF review eligibility identity is invalid');
  const reportRead = environment.issuancePurpose === 'PRELIMINARY_REVIEW';
  // This header only selects the immutable report. It grants no editing,
  // restoration, migration, source admission or purchase authority.
  const needTransport = reportRead
    ? {amendmentContract: record(row.amendment_contract), preliminaryNeeds: undefined}
    : projectCanonicalEstimatePreliminaryNeedTransport(row);
  const readParameterSources = reportRead ? {} : record(record(row.amendment_contract).parameterSources);
  const rawPrerequisite=readParameterSources.roofPrimerPrerequisiteV1;
  const prerequisite=readRoofPrimerPrerequisiteDecisionV1(rawPrerequisite);
  const compositionSelectionV1=parseCanonicalCompositionSelectionV1(readParameterSources.compositionSelectionV1);
  const roofPreparationMigrationV1=readRoofPreparationMigrationProofV1(readParameterSources.roofPreparationMigrationV1);
  const rawRestoration=readParameterSources.roofStageRestorationV1;
  const roofStageRestorationV1=readRoofStageRestorationV1(rawRestoration);
  if(rawRestoration!=null&&(!roofStageRestorationV1||roofStageRestorationV1.definitionId!==row.definition_version_id||roofStageRestorationV1.catalogId!==row.catalog_id))throw new CanonicalEstimateRevisionReadContractError('stored stage restoration receipt is invalid');
  const rawRestorationV2=readParameterSources.roofStageRestorationV2;
  const roofStageRestorationV2=readRoofStageRestorationV2(rawRestorationV2);
  if(rawRestorationV2!=null&&(!roofStageRestorationV2||roofStageRestorationV2.definitionId!==row.definition_version_id||roofStageRestorationV2.catalogId!==row.catalog_id))throw new CanonicalEstimateRevisionReadContractError('stored screed stage restoration receipt is invalid');
  const rawRestorationV3=readParameterSources.roofStageRestorationV3;
  const roofStageRestorationV3=readRoofStageRestorationV3(rawRestorationV3);
  if(rawRestorationV3!=null&&(!roofStageRestorationV3||roofStageRestorationV3.definitionId!==row.definition_version_id||roofStageRestorationV3.catalogId!==row.catalog_id))throw new CanonicalEstimateRevisionReadContractError('stored metal trim stage restoration receipt is invalid');
  const rawRestorationV4=readParameterSources.roofStageRestorationV4;
  const roofStageRestorationV4=readRoofStageRestorationV4(rawRestorationV4);
  if(rawRestorationV4!=null&&(!roofStageRestorationV4||roofStageRestorationV4.definitionId!==row.definition_version_id||roofStageRestorationV4.catalogId!==row.catalog_id))throw new CanonicalEstimateRevisionReadContractError('stored lower layer restoration receipt is invalid');
  const rawRestorationV5=readParameterSources.roofStageRestorationV5;
  const roofStageRestorationV5=readRoofStageRestorationV5(rawRestorationV5);
  if(rawRestorationV5!=null&&(!roofStageRestorationV5||roofStageRestorationV5.definitionId!==row.definition_version_id||roofStageRestorationV5.catalogId!==row.catalog_id))throw new CanonicalEstimateRevisionReadContractError('stored gutter restoration receipt is invalid');
  const rawRestorationV6=readParameterSources.roofStageRestorationV6;
  const roofStageRestorationV6=readRoofStageRestorationV6(rawRestorationV6);
  if(rawRestorationV6!=null&&(!roofStageRestorationV6||roofStageRestorationV6.definitionId!==row.definition_version_id||roofStageRestorationV6.catalogId!==row.catalog_id))throw new CanonicalEstimateRevisionReadContractError('stored screed25 restoration receipt is invalid');
  if(rawPrerequisite!=null&&!prerequisite)throw new CanonicalEstimateRevisionReadContractError('stored preparation reference is invalid');
  return {
    apiVersion: ESTIMATE_PLATFORM_API_VERSION,
    revisionId: String(row.id ?? ""),
    parentRevisionId: nullableText(row.parent_revision_id),
    organizationId: Object.prototype.hasOwnProperty.call(environment, "principalOrganizationId")
      ? environment.principalOrganizationId ?? null
      : nullableText(row.organization_id),
    releaseId: String(row.release_id ?? ""),
    catalogId: String(row.catalog_id ?? ""),
    revisionNumber: Number(row.revision_number),
    status: String(row.status ?? "") as CanonicalEstimateRevisionView["status"],
    currencyCode: String(row.currency_code ?? ""),
    ...(reportRead ? {} : {priceSnapshotIds: requiredPriceSnapshotIds(row)}),
    parameters: record(row.input_parameters),
    ...(prerequisite?{roofPrimerPrerequisiteV1:prerequisite}:{}),
    ...(compositionSelectionV1?{compositionSelectionV1}:{}),
    ...(roofPreparationMigrationV1?{roofPreparationMigrationV1}:{}),
    ...(roofStageRestorationV1?{roofStageRestorationV1}:{}),
    ...(roofStageRestorationV2?{roofStageRestorationV2}:{}),
    ...(roofStageRestorationV3?{roofStageRestorationV3}:{}),
    ...(roofStageRestorationV4?{roofStageRestorationV4}:{}),
    ...(roofStageRestorationV5?{roofStageRestorationV5}:{}),
    ...(roofStageRestorationV6?{roofStageRestorationV6}:{}),
    sourceRequestText: nullableText(row.source_request_text),
    sourceRequestHash: nullableText(row.source_request_hash),
    canonicalWorkTitleRu: nullableText(row.canonical_work_title_ru),
    displayTitleRu: nullableText(row.display_title_ru),
    primaryMeasureParameterId: nullableText(row.primary_measure_parameter_id),
    primaryMeasureValue: nullableText(row.primary_measure_value),
    primaryMeasureUnitId: nullableText(row.primary_measure_unit_id),
    normalizedIntent: row.normalized_intent == null ? null : record(row.normalized_intent),
    definitionVersionId: nullableText(row.definition_version_id),
    groupId: nullableText(row.group_id),
    searchReleaseId: nullableText(row.search_release_id),
    userInputSnapshot: row.user_input_snapshot == null ? null : record(row.user_input_snapshot),
    acceptedBaselineSnapshot: row.accepted_baseline_snapshot == null
      ? null
      : record(row.accepted_baseline_snapshot),
    assumptionSnapshot: row.assumption_snapshot == null ? null : record(row.assumption_snapshot),
    formulaGraphVersion: nullableText(row.formula_graph_version),
    revisionContractVersion: nullableText(row.revision_contract_version),
    amendmentContract: needTransport.amendmentContract as CanonicalEstimateRevisionView["amendmentContract"],
    preliminaryNeeds: needTransport.preliminaryNeeds,
    totals: record(row.totals),
    rowCount: Number(row.row_count),
    checksumSha256: String(row.checksum_sha256 ?? ""),
    compilerVersion: String(row.compiler_version ?? ""),
    definitionVersion: row.definition_version == null ? null : Number(row.definition_version),
    compilerOwner: row.compiler_owner == null
      ? "backend"
      : String(row.compiler_owner) as CanonicalEstimateRevisionView["compilerOwner"],
    parameterSchemaHash: nullableText(row.parameter_schema_hash),
    inputHash: nullableText(row.input_hash),
    outputHash: nullableText(row.output_hash ?? row.checksum_sha256),
    ...(reportRead || environment.contentAdmission == null ? {} : { contentAdmission: environment.contentAdmission }),
    ...(environment.operationResourceAcceptanceV1 == null ? {} : { operationResourceAcceptanceV1: environment.operationResourceAcceptanceV1 }),
    ...(reportRead || eligibility===undefined?{}:{manualPreliminaryReviewEligibilityV1:eligibility}),
    ...(pdfEligibility===undefined?{}:{professionalPdfReviewEligibilityV1:pdfEligibility}),
    ...(environment.legacyWarningRu === undefined ? {} : { legacyWarningRu: environment.legacyWarningRu }),
    ...(row.definition_withdrawal_reason == null ? {} : {
      contentWithdrawalReasonRu: String(row.definition_withdrawal_reason),
    }),
    createdAt: String(row.created_at ?? ""),
  };
}

function priceSourceKind(
  row: StorageRecord,
  price: StorageRecord | null,
  trace: StorageRecord,
): CanonicalEstimateRevisionRowPriceSource["kind"] {
  if (price?.price_snapshot_id != null) return "AUTOMATIC_SNAPSHOT";
  const traceKind = String(trace.kind ?? "");
  if (traceKind === "manual_override" || traceKind === "manual_custom_row") return "MANUAL";
  if (trace.migrated === true || (price == null && row.unit_price != null)) return "LEGACY_UNKNOWN";
  if (price != null && price.unit_price != null) return "LEGACY_UNKNOWN";
  return "UNPRICED";
}

export function canonicalEstimateRevisionRowFromStorage(
  row: StorageRecord,
  price: StorageRecord | null,
  sourceEvidence: StorageRecord | null = null,
  amendmentContract: unknown = undefined,
): CanonicalEstimateRevisionRowView {
  assertCanonicalPurchaseSupplyRowV1(row, amendmentContract);
  const trace = record(price?.resolution_trace);
  const priceSource: CanonicalEstimateRevisionRowPriceSource = {
    kind: priceSourceKind(row, price, trace),
    snapshotId: nullableText(price?.price_snapshot_id),
    routeId: nullableText(price?.route_id),
    priceKey: typeof trace.priceKey === "string" && trace.priceKey.length > 0 ? trace.priceKey : null,
    unitId: String(row.unit_id ?? ""),
    unitPrice: nullableText(price?.unit_price ?? row.unit_price),
    currencyCode: nullableText(price?.currency_code ?? row.currency_code),
    snapshotCapturedAt: nullableText(sourceEvidence?.snapshot_captured_at),
    routeSourceKind: sourceEvidence?.route_source_kind == null
      ? null
      : String(sourceEvidence.route_source_kind) as CanonicalEstimateRevisionRowPriceSource["routeSourceKind"],
    resolutionTrace: trace,
  };
  return {
    rowId: String(row.row_id ?? ""),
    ordinal: Number(row.ordinal),
    section: String(row.section ?? ""),
    category: String(row.category ?? ""),
    titleRu: String(row.title_ru ?? ""),
    unitId: String(row.unit_id ?? ""),
    quantity: nullableText(row.quantity),
    unitPrice: nullableText(row.unit_price),
    amount: nullableText(row.amount),
    currencyCode: nullableText(row.currency_code),
    procurementEligible: row.procurement_eligible === true,
    includedInEstimate: row.included_in_estimate === true,
    includedInProcurement: row.included_in_procurement === true,
    ownershipStatus: String(row.ownership_status ?? "OWNED") as CanonicalEstimateRevisionRowView["ownershipStatus"],
    calculationTrace: record(row.calculation_trace),
    normativeTrace: Array.isArray(row.normative_trace) ? row.normative_trace : [],
    rowSha256: String(row.row_sha256 ?? ""),
    priceSource,
  };
}
