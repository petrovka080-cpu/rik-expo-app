import {canonicalEstimateStableJson} from './canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText} from './canonicalEstimateSha256';
import {canonicalScopeRequirementDecisionV1} from './canonicalScopeRequirementV1';
import {
  auditCanonicalEstimateOperationResourcesV1, canonicalLegacyResourceKindV1,
  canonicalLegacyResourceNameV1, resolveCanonicalLegacyOperationDisplayV1,
  type CanonicalEstimateOperationResourceAcceptanceV1,
} from './canonicalEstimateOperationComposition';
import {canonicalPublicResourceDisplayPresentationV1,canonicalPublicResourceKindFromCategoryV1,canonicalPublicResourcePresentationKindV1,
  parseCanonicalPublicResourcePresentationV1,canonicalPublicSavedResourceRowKindV1} from './canonicalPublicResourcePresentationV1';

type Storage = Readonly<Record<string, unknown>>;
const record = (value: unknown): Storage => value != null && typeof value === 'object' && !Array.isArray(value)
  ? value as Storage : {};

export type CanonicalOperationCompositionEvidenceV1 = Readonly<{
  contractVersion: 'canonical-operation-composition-evidence/v1';
  releaseId: string; definitionVersionId: string; mapSha256: string;
  sourcePassportPayloadSha256: string; independentComposition: unknown;
}>;
const evidenceHash = (value: unknown) => canonicalEstimateSha256HexText(canonicalEstimateStableJson(value));
/** Server-owned constructor: caller must supply the exact pinned DB passport,
 * never request-body metadata or a current definition/factory. */
export function canonicalOperationCompositionEvidenceFromPassportV1(input: {
  releaseId: string; definitionVersionId: string; passport: Storage;
}): CanonicalOperationCompositionEvidenceV1 | undefined {
  const map = record(input.passport.decision).independentCompletenessMap;
  if (map == null) return undefined;
  if (String(input.passport.definition_version_id ?? '') !== input.definitionVersionId
      || !/^[0-9a-f]{64}$/u.test(String(input.passport.payload_sha256 ?? '')))
    throw new Error('OPERATION_COMPOSITION_PASSPORT_BINDING_INVALID');
  return {contractVersion:'canonical-operation-composition-evidence/v1', releaseId:input.releaseId,
    definitionVersionId:input.definitionVersionId, mapSha256:evidenceHash(map),
    sourcePassportPayloadSha256:String(input.passport.payload_sha256),
    independentComposition:JSON.parse(JSON.stringify(map))};
}
/** Immutable saved bytes are the authority on read. Hash checks detect corruption;
 * authority is provided by the server-only write path, not a caller's self-hash. */
export function canonicalSavedOperationCompositionEvidenceV1(revision: Storage): {
  independentComposition?: unknown; issue?: string;
} {
  const raw = record(record(revision.amendment_contract).parameterSources).operationCompositionEvidenceV1;
  if (raw === undefined) return {};
  const e = record(raw);
  try {
    if (e.contractVersion !== 'canonical-operation-composition-evidence/v1'
      || typeof revision.release_id !== 'string' || !revision.release_id
      || typeof revision.definition_version_id !== 'string' || !revision.definition_version_id
      || e.releaseId !== revision.release_id || e.definitionVersionId !== revision.definition_version_id
      || !/^[0-9a-f]{64}$/u.test(String(e.sourcePassportPayloadSha256 ?? ''))
      || e.independentComposition == null || e.mapSha256 !== evidenceHash(e.independentComposition))
      return {issue:'SAVED_OPERATION_COMPOSITION_EVIDENCE_INVALID'};
    return {independentComposition:e.independentComposition};
  } catch { return {issue:'SAVED_OPERATION_COMPOSITION_EVIDENCE_INVALID'}; }
}

/** Projection only: ALL saved rows plus preliminary needs, before pagination,
 * ownership filtering or cache lookup. Never imports a current definition. */
export function canonicalEstimateSavedOperationAcceptanceV1(input: {
  revision: Storage; resources: readonly Storage[];
  /** Only this revision's saved definition map; absence stays unverified. */
  savedIndependentComposition?: unknown;
}): CanonicalEstimateOperationResourceAcceptanceV1 {
  const evidence = canonicalSavedOperationCompositionEvidenceV1(input.revision);
  let evidenceIssue = evidence.issue;
  if (input.savedIndependentComposition !== undefined) {
    try {
      if (evidence.independentComposition === undefined
        || evidenceHash(input.savedIndependentComposition) !== evidenceHash(evidence.independentComposition))
        evidenceIssue = 'SAVED_OPERATION_COMPOSITION_EVIDENCE_CONFLICT';
    } catch { evidenceIssue = 'SAVED_OPERATION_COMPOSITION_EVIDENCE_CONFLICT'; }
  }
  const parameters = record(input.revision.input_parameters);
  const originals = input.resources.map(row => ({rowId: String(row.row_id ?? ''),
    operation: record(record(row.calculation_trace).resourceGraph).operationCompositionV1}));
  const context = {revisionId: String(input.revision.id ?? ''), releaseId: String(input.revision.release_id ?? ''),
    checksumSha256: String(input.revision.checksum_sha256 ?? ''), savedResources: originals};
  const display = resolveCanonicalLegacyOperationDisplayV1(originals, context);
  // Read immutable compiler evidence before omitting documentary scope
  // rows from the physical composition. A numeric gap is not an object fact.
  const unresolvedConditionRowIds = input.resources.filter(row => {
    const trace = record(row.calculation_trace), graph = record(trace.resourceGraph);
    const scope = canonicalScopeRequirementDecisionV1(graph.scopeRequirementDecisionV1);
    return row.need_state === 'CONDITION_REQUIRED' || trace.needState === 'CONDITION_REQUIRED'
      || (Array.isArray(trace.unresolvedConditionParameterIds) && trace.unresolvedConditionParameterIds.length > 0)
      || (scope != null && scope.rowId === row.row_id && scope.status === 'OBJECT_FACT_REQUIRED');
  }).map(row => String(row.row_id ?? ''));
  const acceptance = auditCanonicalEstimateOperationResourcesV1({unresolvedConditionRowIds,
    resources: input.resources.flatMap((row, index) => {
    // The complete immutable input above remains the legacy guard authority.
    // Only authenticated scope decisions and the same public-row classifier as
    // PDF identify nonphysical checks/counters. Never filter by financial flags.
    const sourceGraph=record(record(row.calculation_trace).resourceGraph);
    const scope=canonicalScopeRequirementDecisionV1(sourceGraph.scopeRequirementDecisionV1);
    if(scope?.rowId===row.row_id || canonicalPublicSavedResourceRowKindV1(row)!=='RESOURCE')return [];
    const trace = record(row.calculation_trace), graph = record(trace.resourceGraph);
    const rowId = originals[index].rowId, manualTitleOverride = trace.manualTitleOverride === true;
    const sourceNameRu = manualTitleOverride
      ? parseCanonicalPublicResourcePresentationV1(graph.publicResourcePresentationV1)?.sourceTitleRu
      : String(row.title_ru ?? '');
    const presentation = canonicalPublicResourceDisplayPresentationV1({rowId,
      titleRu: String(row.title_ru ?? ''), descriptor: graph.publicResourcePresentationV1,
      manualTitleOverride, graph, parameters, compactPreliminaryNeed: row.ownership_status === 'PRELIMINARY_NEED'});
    const legacyName = canonicalLegacyResourceNameV1(rowId, context, manualTitleOverride);
    return [{rowId, unitId:typeof row.unit_id==='string'?row.unit_id:null, sourceNameRu, nameRu: manualTitleOverride ? String(row.title_ru ?? '')
        : legacyName ?? presentation?.nameRu ?? String(row.title_ru ?? ''),
      resourceKind: canonicalLegacyResourceKindV1(rowId, context) ?? presentation?.resourceKind
        ?? canonicalPublicResourcePresentationKindV1({titleRu:String(row.title_ru ?? ''),
          descriptor:graph.publicResourcePresentationV1,manualTitleOverride})
        ?? canonicalPublicResourceKindFromCategoryV1(row.category),
      operation: display[index].operation, manualTitleOverride,
      publicNameVerified: manualTitleOverride || legacyName != null || presentation != null,
      quantityKnown: row.quantity != null}];
  }), independentComposition: evidence.independentComposition,
    requireIndependentComposition: evidence.independentComposition !== undefined});
  return evidenceIssue ? {...acceptance, status:'STRUCTURE_INVALID', pdfAllowed:false,
    definitionAdmissionAllowed:false, completeClaimAllowed:false,
    issues:[...acceptance.issues,{code:evidenceIssue}]} : acceptance;
}

/** Reads expose diagnostics; artifact issuance asserts the same common result. */
export function assertCanonicalEstimateSavedArtifactStructureV1(acceptance: CanonicalEstimateOperationResourceAcceptanceV1): void {
  if (!acceptance.pdfAllowed) {
    const unverified = acceptance.status === 'COMPOSITION_UNVERIFIED';
    const conditionRequired = acceptance.issues.some(issue => issue.code === 'RESOURCE_CONDITION_UNRESOLVED');
    throw Object.assign(new Error(conditionRequired
      ? 'Не подтверждены обязательные условия выполнения работы. PDF пока недоступен.'
      : unverified
      ? 'Состав подработ не проверен. PDF пока недоступен.'
      : 'В составе подработ обнаружены ошибки. PDF пока недоступен.'), {
      code: unverified ? 'ARTIFACT_OPERATION_COMPOSITION_UNVERIFIED' : 'ARTIFACT_OPERATION_RESOURCE_STRUCTURE_INVALID',
      httpStatus:409,operationResourceAcceptanceV1:acceptance});
  }
}
