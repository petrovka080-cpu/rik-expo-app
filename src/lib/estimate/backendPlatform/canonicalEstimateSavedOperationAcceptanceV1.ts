import {canonicalScopeRequirementDecisionV1} from './canonicalScopeRequirementV1';
import {
  auditCanonicalEstimateOperationResourcesV1, canonicalLegacyResourceKindV1,
  canonicalLegacyResourceNameV1, resolveCanonicalLegacyOperationDisplayV1,
  type CanonicalEstimateOperationResourceAcceptanceV1,
} from './canonicalEstimateOperationComposition';
import {canonicalPublicResourceDisplayPresentationV1,canonicalPublicResourceKindFromCategoryV1,
  parseCanonicalPublicResourcePresentationV1,canonicalPublicSavedResourceRowKindV1} from './canonicalPublicResourcePresentationV1';

type Storage = Readonly<Record<string, unknown>>;
const record = (value: unknown): Storage => value != null && typeof value === 'object' && !Array.isArray(value)
  ? value as Storage : {};

/** Projection only: ALL saved rows plus preliminary needs, before pagination,
 * ownership filtering or cache lookup. Never imports a current definition. */
export function canonicalEstimateSavedOperationAcceptanceV1(input: {
  revision: Storage; resources: readonly Storage[];
  /** Only this revision's saved definition map; absence stays unverified. */
  savedIndependentComposition?: unknown;
}): CanonicalEstimateOperationResourceAcceptanceV1 {
  const parameters = record(input.revision.input_parameters);
  const originals = input.resources.map(row => ({rowId: String(row.row_id ?? ''),
    operation: record(record(row.calculation_trace).resourceGraph).operationCompositionV1}));
  const context = {revisionId: String(input.revision.id ?? ''), releaseId: String(input.revision.release_id ?? ''),
    checksumSha256: String(input.revision.checksum_sha256 ?? ''), savedResources: originals};
  const display = resolveCanonicalLegacyOperationDisplayV1(originals, context);
  return auditCanonicalEstimateOperationResourcesV1({resources: input.resources.flatMap((row, index) => {
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
    return [{rowId, sourceNameRu, nameRu: manualTitleOverride ? String(row.title_ru ?? '')
        : legacyName ?? presentation?.nameRu ?? String(row.title_ru ?? ''),
      resourceKind: canonicalLegacyResourceKindV1(rowId, context) ?? presentation?.resourceKind
        ?? canonicalPublicResourceKindFromCategoryV1(row.category),
      operation: display[index].operation, manualTitleOverride,
      publicNameVerified: manualTitleOverride || legacyName != null || presentation != null,
      quantityKnown: row.quantity != null}];
  }), independentComposition: input.savedIndependentComposition, requireIndependentComposition: false});
}

/** Reads expose diagnostics; artifact issuance asserts the same common result. */
export function assertCanonicalEstimateSavedArtifactStructureV1(acceptance: CanonicalEstimateOperationResourceAcceptanceV1): void {
  if (!acceptance.pdfAllowed) throw Object.assign(new Error('saved operation/resource structure invalid'), {
    code: 'ARTIFACT_OPERATION_RESOURCE_STRUCTURE_INVALID', httpStatus: 409, operationResourceAcceptanceV1: acceptance});
}
