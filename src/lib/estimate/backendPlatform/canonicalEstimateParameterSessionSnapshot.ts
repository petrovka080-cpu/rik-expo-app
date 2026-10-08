import {
  CanonicalEstimateApiError,
  ESTIMATE_PLATFORM_API_VERSION,
  type CanonicalEstimateCatalogItem,
  type CanonicalEstimatePreliminaryNeedView,
  type CanonicalEstimateRevisionView,
} from "./contracts";

export type CanonicalEstimateParameterSessionRevision = Pick<CanonicalEstimateRevisionView,
  "revisionId" | "parentRevisionId" | "releaseId" | "catalogId" | "definitionVersionId"
  | "definitionVersion" | "status" | "parameters" | "userInputSnapshot"
  | "acceptedBaselineSnapshot" | "assumptionSnapshot" | "parameterSchemaHash"
  | "compilerVersion" | "checksumSha256" | "createdAt" | "contentWithdrawalReasonRu"
> & {
  preliminaryNeeds?: Pick<CanonicalEstimatePreliminaryNeedView,
    "rowId" | "selected" | "missingParameterIds" | "quantity" | "needState">[];
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
      ...(revision.contentWithdrawalReasonRu == null ? {} : { contentWithdrawalReasonRu: revision.contentWithdrawalReasonRu }),
      preliminaryNeeds: revision.preliminaryNeeds?.map((need) => ({
        rowId: need.rowId, selected: need.selected, missingParameterIds: need.missingParameterIds,
        quantity: need.quantity, needState: need.needState,
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
