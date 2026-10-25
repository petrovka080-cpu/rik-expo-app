import type { ConsumerRepairDraftBundle } from './consumerRequestTypes';
import { consumerCanonicalMissingRequirements } from './consumerCanonicalParameterRequirements';
import { consumerEstimateManualPreliminaryItems, consumerEstimateOpenScopeGroups,
  consumerEstimateScopeDecision, consumerEstimateUnresolvedQuantityItems } from './consumerEstimateReadiness';
import { consumerRepairPendingCanonicalParameterCollection } from './consumerCanonicalParameterCollection';
import {canonicalPreliminaryNamingEvidenceReadRevisionIds} from './consumerCanonicalBackendRevisionProjection';

/** Human acknowledgment of an exact saved version, never admission of a catalog
 * norm or promotion of an unresolved resource into cost/procurement. */
export type ConsumerEstimateManualQuantityApproval = Readonly<{
  mode: 'MANUAL_QUANTITIES' | 'MANUAL_PRELIMINARY'; revisionId: string; releaseId: string; checksumSha256: string;
  rowIds: readonly string[]; sourceParameterIds: readonly string[];
  /** Explicit null quantities retained by this saved preliminary acknowledgment. */
  unresolvedQuantityRowIds?: readonly string[];
}>;

function consumerEstimateKnownManualQuantityApprovalCandidate(
  bundle: ConsumerRepairDraftBundle | null | undefined,
): ConsumerEstimateManualQuantityApproval | null {
  if (!bundle || consumerRepairPendingCanonicalParameterCollection(bundle)) return null;
  const backend = bundle.structuredEstimatePayload?.canonicalBackend ?? bundle.canonicalBackendApprovalEvidence;
  const state = bundle.estimateDraftRevisionState;
  const current = state?.revisions.find(revision => revision.revisionId === state.currentRevisionId);
  const session = bundle.canonicalParameterSession;
  if (!backend || backend.compilerOwner !== 'backend' || !/^[a-f0-9]{64}$/iu.test(backend.checksumSha256)
    || !current || current.revisionId !== backend.revisionId || state?.revisions.at(-1)?.revisionId !== backend.revisionId
    || current.status === 'blocking_required' || current.resolvedIdentity?.canonicalModelVersion !== backend.releaseId
    || !canonicalPreliminaryNamingEvidenceReadRevisionIds(bundle).includes(backend.revisionId)
    || !current.resolvedIdentity.sourceBindingVersions.some(source=>source.sourceId===backend.releaseId&&source.version===backend.checksumSha256)
    || backend.contentWithdrawalReasonRu
    // Exact revision sessions are transient editor projections. The repository
    // retains only precompile sessions; immutable missingInputs remains the
    // service-side authority when that transient projection is absent.
    || session && (session.draftId !== bundle.draft.id || session.revisionId !== backend.revisionId
      || session.contentWithdrawalReasonRu || ['BLOCKING_REQUIRED', 'INVALID'].includes(session.status)
      || session.blockingMissingParameterIds.length || session.invalidParameterIds.length)
    || bundle.items.length === 0 || bundle.items.some(item => item.sourceParameters?.canonicalBackendRevisionId !== backend.revisionId
      || item.sourceParameters?.canonicalBackendReleaseId !== backend.releaseId)
    || consumerEstimateOpenScopeGroups(bundle).length || consumerEstimateUnresolvedQuantityItems(bundle).length) return null;
  const needs = bundle.items.filter(item => item.sourceParameters?.canonicalPreliminaryNeed === true
    && consumerEstimateScopeDecision(item) == null);
  const manual = consumerEstimateManualPreliminaryItems(bundle);
  if (!needs.length || needs.length !== manual.length) return null;
  const ids = new Set<string>(), rowIds = new Set<string>();
  for (const item of needs) {
    const source = item.sourceParameters!;
    const rowId = source.rowCode;
    const requirements = consumerCanonicalMissingRequirements(item, bundle.canonicalParameterRequirementTables);
    if (typeof rowId !== 'string' || !rowId.trim() || rowIds.has(rowId) || !requirements.length
      || requirements.some(requirement => typeof requirement.parameterId !== 'string'
        || requirement.valueSourceRole !== 'UNRESOLVED_APPLICATION_NORM'
        || requirement.visibilityRole !== 'INTERNAL_ONLY' || requirement.unitId !== item.unit)) return null;
    rowIds.add(rowId);
    for (const requirement of requirements) ids.add(requirement.parameterId as string);
  }
  const savedNeeds = (backend.preliminaryNeeds ?? []).filter(need => need.needState !== 'CONDITION_REQUIRED');
  if (savedNeeds.length !== needs.length || savedNeeds.some(need => {
    const item = needs.find(row => row.sourceParameters?.rowCode === need.rowId);
    return !item || need.manualQuantityOverride !== true || need.quantity == null
      || Number(need.quantity) !== item.quantity || need.unitId !== item.unit
      || need.missingParameterIds.some(id => !ids.has(id));
  })) return null;
  // Only the source gaps of those very rows may remain. Object, safety,
  // packaging and unrelated contract requirements retain their normal gates.
  if (!current.missingInputs.length || current.missingInputs.some(input => input.requiredFor !== 'contract_ready'
    || input.blocksPreliminaryEstimate || !ids.has(input.key))
    || session?.contractMissingParameterIds.some(id => !ids.has(id))) return null;
  return { mode: 'MANUAL_QUANTITIES', revisionId: backend.revisionId, releaseId: backend.releaseId,
    checksumSha256: backend.checksumSha256, rowIds: [...rowIds].sort(), sourceParameterIds: [...ids].sort() };
}

/** The same revision-bound receipt can acknowledge an honest saved preliminary
 * version. Null quantities stay null and non-payable; only application-owned
 * norm gaps qualify. Object/safety/applicability/supply gates remain closed. */
function consumerEstimateManualPreliminaryApprovalCandidate(
  bundle: ConsumerRepairDraftBundle | null | undefined,
): ConsumerEstimateManualQuantityApproval | null {
  if (!bundle || consumerRepairPendingCanonicalParameterCollection(bundle)) return null;
  const backend = bundle.structuredEstimatePayload?.canonicalBackend ?? bundle.canonicalBackendApprovalEvidence;
  const state = bundle.estimateDraftRevisionState;
  const current = state?.revisions.find(revision => revision.revisionId === state.currentRevisionId);
  const session = bundle.canonicalParameterSession;
  if (!backend || backend.compilerOwner !== 'backend' || !/^[a-f0-9]{64}$/iu.test(backend.checksumSha256)
    || !current || current.revisionId !== backend.revisionId || state?.revisions.at(-1)?.revisionId !== backend.revisionId
    || current.status === 'blocking_required' || current.resolvedIdentity?.canonicalModelVersion !== backend.releaseId
    || !canonicalPreliminaryNamingEvidenceReadRevisionIds(bundle).includes(backend.revisionId)
    || !current.resolvedIdentity.sourceBindingVersions.some(source=>source.sourceId===backend.releaseId&&source.version===backend.checksumSha256)
    || backend.contentWithdrawalReasonRu
    // Exact revision sessions are transient editor projections. The repository
    // retains only precompile sessions; immutable missingInputs remains the
    // service-side authority when that transient projection is absent.
    || session && (session.draftId !== bundle.draft.id || session.revisionId !== backend.revisionId
      || session.contentWithdrawalReasonRu || ['BLOCKING_REQUIRED', 'INVALID'].includes(session.status)
      || session.blockingMissingParameterIds.length || session.invalidParameterIds.length)
    || bundle.items.length === 0 || bundle.items.some(item => item.sourceParameters?.canonicalBackendRevisionId !== backend.revisionId
      || item.sourceParameters?.canonicalBackendReleaseId !== backend.releaseId)
    || consumerEstimateOpenScopeGroups(bundle).length
    || bundle.items.some(item => {const blocks=item.sourceParameters?.canonicalPurchaseSupplyBlocksV1;return Array.isArray(blocks)&&blocks.length>0;})) return null;
  const needs = bundle.items.filter(item => item.sourceParameters?.canonicalPreliminaryNeed === true
    && consumerEstimateScopeDecision(item) == null);
  if (!needs.length || !needs.some(item => item.quantity == null)
    || needs.some(item => item.sourceParameters?.includedInEstimate !== false
      || item.sourceParameters?.includedInProcurement !== false || item.sourceParameters?.payable !== false)) return null;
  const ids = new Set<string>(), rowIds = new Set<string>();
  for (const item of needs) {
    const source = item.sourceParameters!;
    const rowId = source.rowCode;
    const requirements = consumerCanonicalMissingRequirements(item, bundle.canonicalParameterRequirementTables);
    if (typeof rowId !== 'string' || !rowId.trim() || rowIds.has(rowId) || !requirements.length
      || requirements.some(requirement => typeof requirement.parameterId !== 'string'
        || requirement.valueSourceRole !== 'UNRESOLVED_APPLICATION_NORM'
        || requirement.visibilityRole !== 'INTERNAL_ONLY'
        || !(requirement.unitId === item.unit || (requirement.unitId == null && item.unit === '')))) return null;
    rowIds.add(rowId);
    for (const requirement of requirements) ids.add(requirement.parameterId as string);
  }
  const savedNeeds = (backend.preliminaryNeeds ?? []).filter(need => need.needState !== 'CONDITION_REQUIRED');
  if (savedNeeds.length !== needs.length || savedNeeds.some(need => {
    const item = needs.find(row => row.sourceParameters?.rowCode === need.rowId);
    return !item || (need.quantity == null ? item.quantity != null
      : item.quantity == null || !Number.isFinite(item.quantity) || item.quantity < 0 || Number(need.quantity) !== item.quantity)
      || (need.manualQuantityOverride === true) !== (item.sourceParameters?.manualQuantityOverride === true)
      || !(need.unitId === item.unit || (need.unitId == null && item.unit === ''))
      || need.missingParameterIds.some(id => !ids.has(id));
  })) return null;
  // Only the source gaps of those very rows may remain. Object, safety,
  // packaging and unrelated contract requirements retain their normal gates.
  if (!current.missingInputs.length || current.missingInputs.some(input => input.requiredFor !== 'contract_ready'
    || input.blocksPreliminaryEstimate || !ids.has(input.key))
    || session?.contractMissingParameterIds.some(id => !ids.has(id))) return null;
  return { mode: 'MANUAL_PRELIMINARY', revisionId: backend.revisionId, releaseId: backend.releaseId,
    checksumSha256: backend.checksumSha256, rowIds: [...rowIds].sort(), sourceParameterIds: [...ids].sort(),
    unresolvedQuantityRowIds: needs.filter(item => item.quantity == null).map(item => String(item.sourceParameters!.rowCode)).sort() };
}

export function consumerEstimateManualQuantityApprovalCandidate(bundle: ConsumerRepairDraftBundle | null | undefined): ConsumerEstimateManualQuantityApproval | null {
  // Do not parse a blocked supply record while rendering an approval action.
  // Neither manual mode can acknowledge an unresolved supply discrepancy.
  if (bundle?.items.some(item => {
    const blocks = item.sourceParameters?.canonicalPurchaseSupplyBlocksV1;
    return Array.isArray(blocks) && blocks.length > 0;
  })) return null;
  return consumerEstimateKnownManualQuantityApprovalCandidate(bundle) ?? consumerEstimateManualPreliminaryApprovalCandidate(bundle);
}

function manualApprovalRecord(value: unknown): ConsumerEstimateManualQuantityApproval | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const validIds = (ids: unknown): ids is string[] => Array.isArray(ids) && ids.length > 0
    && ids.every(id => typeof id === 'string' && id.trim().length > 0) && new Set(ids).size === ids.length;
  if (!['MANUAL_QUANTITIES','MANUAL_PRELIMINARY'].includes(String(record.mode)) || typeof record.revisionId !== 'string' || !record.revisionId.trim()
    || typeof record.releaseId !== 'string' || !record.releaseId.trim()
    || typeof record.checksumSha256 !== 'string' || !/^[a-f0-9]{64}$/iu.test(record.checksumSha256)
    || !validIds(record.rowIds) || !validIds(record.sourceParameterIds)) return null;
  const unresolved = record.unresolvedQuantityRowIds;
  if (record.mode === 'MANUAL_PRELIMINARY' && (!validIds(unresolved)
    || unresolved.some(id => !(record.rowIds as string[]).includes(id)))) return null;
  return { mode: record.mode as ConsumerEstimateManualQuantityApproval['mode'], revisionId: record.revisionId, releaseId: record.releaseId,
    checksumSha256: record.checksumSha256, rowIds: [...record.rowIds], sourceParameterIds: [...record.sourceParameterIds],
    ...(record.mode === 'MANUAL_PRELIMINARY' ? {unresolvedQuantityRowIds: [...unresolved as string[]]} : {}) };
}

/** A retained acknowledgment describes this immutable approved version only.
 * Durable summaries intentionally have no structured payload, rows or events. */
export function consumerEstimateManualQuantityApprovalRecord(
  bundle: ConsumerRepairDraftBundle | null | undefined,
): ConsumerEstimateManualQuantityApproval | null {
  if (!bundle || !['consumer_approved', 'sent_to_marketplace', 'archived'].includes(bundle.draft.status)) return null;
  const backend = bundle.structuredEstimatePayload?.canonicalBackend;
  const state = bundle.estimateDraftRevisionState;
  const current = state?.revisions.find(revision => revision.revisionId === state.currentRevisionId);
  const summary = bundle.durableHistorySummary;
  const revisionId = backend?.revisionId ?? bundle.items[0]?.sourceParameters?.canonicalBackendRevisionId
    ?? current?.revisionId ?? summary?.sourceRevisionId;
  const releaseId = backend?.releaseId ?? bundle.items[0]?.sourceParameters?.canonicalBackendReleaseId
    ?? current?.resolvedIdentity?.canonicalModelVersion ?? summary?.sourceReleaseId;
  if (typeof revisionId !== 'string' || typeof releaseId !== 'string'
    || bundle.items.some(item => (item.sourceParameters?.canonicalBackendRevisionId != null
      || item.sourceParameters?.canonicalBackendReleaseId != null)
      && (item.sourceParameters?.canonicalBackendRevisionId !== revisionId
        || item.sourceParameters?.canonicalBackendReleaseId !== releaseId))
    || state && (!current || current.revisionId !== revisionId
      || current.resolvedIdentity?.canonicalModelVersion !== releaseId)) return null;
  const projectionChecksum = current?.resolvedIdentity?.sourceBindingVersions.find(source => source.sourceId === releaseId)?.version;
  const checksum = backend?.checksumSha256 ?? projectionChecksum ?? summary?.canonicalRevisionChecksumSha256;
  if (backend && backend.compilerOwner !== 'backend'
    || backend && projectionChecksum && projectionChecksum !== backend.checksumSha256) return null;
  const records = bundle.events.filter(event => event.eventType === 'consumer_approved_canonical_backend_pdf')
    .map(event => event.payload.manualQuantityApproval).reverse();
  records.push(summary?.manualQuantityApproval);
  for (const value of records) {
    const record = manualApprovalRecord(value);
    if (record && record.revisionId === revisionId && record.releaseId === releaseId
      && (!checksum || record.checksumSha256 === checksum)) return record;
  }
  return null;
}

export function consumerEstimateHasConfirmedManualQuantities(bundle: ConsumerRepairDraftBundle | null | undefined): boolean {
  return consumerEstimateManualQuantityApprovalRecord(bundle) != null;
}

export function consumerEstimateManualQuantityApprovalMatches(
  bundle: ConsumerRepairDraftBundle | null | undefined,
  acknowledgment: ConsumerEstimateManualQuantityApproval | null | undefined,
): boolean {
  const candidate = consumerEstimateManualQuantityApprovalCandidate(bundle);
  return Boolean(candidate && acknowledgment?.mode === candidate.mode
    && acknowledgment.revisionId === candidate.revisionId && acknowledgment.releaseId === candidate.releaseId
    && acknowledgment.checksumSha256 === candidate.checksumSha256
    && JSON.stringify(acknowledgment.rowIds) === JSON.stringify(candidate.rowIds)
    && JSON.stringify(acknowledgment.sourceParameterIds) === JSON.stringify(candidate.sourceParameterIds)
    && JSON.stringify(acknowledgment.unresolvedQuantityRowIds ?? []) === JSON.stringify(candidate.unresolvedQuantityRowIds ?? []));
}

/** Mode-aware wording never claims all quantities are entered for a null snapshot. */
export function consumerEstimateManualApprovalStatusRu(bundle: ConsumerRepairDraftBundle | null | undefined): string | null {
 const record=consumerEstimateManualQuantityApprovalRecord(bundle);
 return record?.mode==='MANUAL_PRELIMINARY' ? 'Подтверждена вручную как предварительная'
  : record ? 'Подтверждена с ручными количествами' : null;
}
