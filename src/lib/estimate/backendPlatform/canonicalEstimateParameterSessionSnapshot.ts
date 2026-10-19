import {roofScreed25StandaloneInactiveParameterIdsV1} from './canonicalRoofScreed25StandaloneV1';
import {roofScreed25InactiveParameterIdsV1} from './canonicalRoofScreed25MigrationV1';
import {roofGuttersInactiveParameterIdsV1} from './canonicalRoofHangingGuttersMigrationV1';
import {
  CanonicalEstimateApiError,
  ESTIMATE_PLATFORM_API_VERSION,
  type CanonicalEstimateCatalogItem,
  type CanonicalEstimatePreliminaryNeedView,
  type CanonicalEstimateRevisionView,
} from "./contracts";
import { canonicalOrderedSpecificationParameterIds } from './canonicalOrderedSpecificationBindings';
import {roofLowerLayersInactiveParameterIdsV1} from './canonicalRoofLowerLayersMigrationV1';

export type CanonicalEstimateParameterSessionRevision = Pick<CanonicalEstimateRevisionView,
  "revisionId" | "parentRevisionId" | "releaseId" | "catalogId" | "definitionVersionId"
  | "definitionVersion" | "status" | "parameters" | "userInputSnapshot"
  | "acceptedBaselineSnapshot" | "assumptionSnapshot" | "parameterSchemaHash"
  | "compilerVersion" | "checksumSha256" | "createdAt" | "contentWithdrawalReasonRu" | "compositionSelectionV1" | "roofStageRestorationV4" | "roofStageRestorationV5" | "roofStageRestorationV6"
> & {
  /** Verified finite companion exclusions, projected without the large receipt. */
  excludedScopeParameterIdsV1?: string[];
  orderedSpecificationParameterIds?: string[];
  /** Present on the full-revision fallback only; compact transport projects IDs instead. */
  amendmentContract?: Pick<NonNullable<CanonicalEstimateRevisionView['amendmentContract']>, 'rowOverrides'>;
  preliminaryNeeds?: Pick<CanonicalEstimatePreliminaryNeedView,
    "rowId" | "selected" | "missingParameterIds" | "quantity" | "needState" | "orderedSpecificationParameterIds" | "scopeRequirementDecision">[];
};

export type CanonicalEstimateParameterSessionParent = Pick<CanonicalEstimateRevisionView,
  "revisionId" | "releaseId" | "catalogId" | "parameters">;

export type CanonicalEstimateParameterSessionSnapshot = {
  apiVersion: typeof ESTIMATE_PLATFORM_API_VERSION;
  /** Exact definition selected by the immutable revision's release/catalog binding. */
  definitionVersionId: string;
  revision: CanonicalEstimateParameterSessionRevision;
  parent: CanonicalEstimateParameterSessionParent | null;
  catalog: CanonicalEstimateCatalogItem;
};

export function assertCanonicalEstimateParameterSessionSnapshotIdentity(
  snapshot: CanonicalEstimateParameterSessionSnapshot,
  requestedRevisionId: string,
): void {
  const { revision, parent, catalog } = snapshot;
  if (revision.revisionId !== requestedRevisionId
    || catalog.catalogId !== revision.catalogId || catalog.releaseId !== revision.releaseId
    || !snapshot.definitionVersionId?.trim()
    || (revision.definitionVersionId != null && revision.definitionVersionId !== snapshot.definitionVersionId)
    || (revision.definitionVersion != null && revision.definitionVersion !== catalog.definitionVersion)
    || (revision.parentRevisionId == null ? parent != null : parent?.revisionId !== revision.parentRevisionId)
    || (parent != null && parent.catalogId !== revision.catalogId)) {
    throw new CanonicalEstimateApiError("Параметры не открыты: исходная версия сметы или каталога не совпадает.", {
      code: "PARAMETER_SESSION_IDENTITY_MISMATCH", httpStatus: 409,
    });
  }
}

/** Project before transport serialization; full revisions/traces remain in their own read contracts. */
export function projectCanonicalEstimateParameterSessionSnapshot(input: {
  requestedRevisionId: string;
  definitionVersionId: string;
  revision: CanonicalEstimateRevisionView;
  parent: CanonicalEstimateRevisionView | null;
  catalog: CanonicalEstimateCatalogItem;
}): CanonicalEstimateParameterSessionSnapshot {
  const { revision, parent } = input;
  const standaloneInactive=roofScreed25StandaloneInactiveParameterIdsV1({catalogId:input.catalog.catalogId,
    definitionVersion:input.catalog.definitionVersion,metadata:input.catalog.professionalMetadata,selection:revision.compositionSelectionV1});
  const companionInactive=revision.roofStageRestorationV6?roofScreed25InactiveParameterIdsV1({receipt:revision.roofStageRestorationV6,definitionId:revision.definitionVersionId,catalogId:revision.catalogId,selection:revision.compositionSelectionV1}):revision.roofStageRestorationV5?roofGuttersInactiveParameterIdsV1({receipt:revision.roofStageRestorationV5,definitionId:revision.definitionVersionId,catalogId:revision.catalogId,selection:revision.compositionSelectionV1}):roofLowerLayersInactiveParameterIdsV1({receipt:revision.roofStageRestorationV4,definitionId:revision.definitionVersionId,catalogId:revision.catalogId,selection:revision.compositionSelectionV1});
  const excludedScopeParameterIdsV1=[...new Set([...standaloneInactive,...companionInactive])];
  const snapshot: CanonicalEstimateParameterSessionSnapshot = {
    apiVersion: ESTIMATE_PLATFORM_API_VERSION,
    definitionVersionId: input.definitionVersionId,
    revision: {
      revisionId: revision.revisionId, parentRevisionId: revision.parentRevisionId,
      releaseId: revision.releaseId, catalogId: revision.catalogId,
      definitionVersionId: revision.definitionVersionId, definitionVersion: revision.definitionVersion,
      status: revision.status, parameters: revision.parameters,
      userInputSnapshot: revision.userInputSnapshot,
      acceptedBaselineSnapshot: revision.acceptedBaselineSnapshot, assumptionSnapshot: revision.assumptionSnapshot,
      parameterSchemaHash: revision.parameterSchemaHash, compilerVersion: revision.compilerVersion,
      checksumSha256: revision.checksumSha256, createdAt: revision.createdAt,
      ...(excludedScopeParameterIdsV1.length?{excludedScopeParameterIdsV1}:{}),
      orderedSpecificationParameterIds: canonicalOrderedSpecificationParameterIds(
        input.catalog.orderedSpecificationBindings, revision.amendmentContract?.rowOverrides, revision.parameters),
      ...(revision.contentWithdrawalReasonRu == null ? {} : { contentWithdrawalReasonRu: revision.contentWithdrawalReasonRu }),
      preliminaryNeeds: revision.preliminaryNeeds?.map((need) => ({
        rowId: need.rowId, selected: need.selected, missingParameterIds: need.missingParameterIds,
        quantity: need.quantity, needState: need.needState,
        ...(need.scopeRequirementDecision ? {scopeRequirementDecision:need.scopeRequirementDecision} : {}),
        ...(need.orderedSpecificationParameterIds?.length ? { orderedSpecificationParameterIds: need.orderedSpecificationParameterIds } : {}),
      })),
    },
    parent: parent == null ? null : {
      revisionId: parent.revisionId, releaseId: parent.releaseId,
      catalogId: parent.catalogId, parameters: parent.parameters,
    },
    catalog: input.catalog,
  };
  assertCanonicalEstimateParameterSessionSnapshotIdentity(snapshot, input.requestedRevisionId);
  return snapshot;
}
